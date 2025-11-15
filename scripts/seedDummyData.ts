import 'dotenv/config';
import { createUserProfile } from '../src/arkiv/profiles';
import { createAsk } from '../src/arkiv/asks';
import { createOffer } from '../src/arkiv/offers';
import { createSession } from '../src/arkiv/sessions';
import { createFeedback } from '../src/arkiv/feedback';
import { createTrustEdge } from '../src/arkiv/trustEdges';
import { CURRENT_WALLET, ARKIV_PRIVATE_KEY } from '../src/config';

// Generate dummy wallet addresses (for testing)
const generateWallet = (index: number) => `0x${'0'.repeat(40 - index.toString().length)}${index}`;

// Delay function to avoid rate limiting
// Arkiv rate limit: 50 requests per second (RPS)
// Using 100ms delay = 10 requests/second (well under limit)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function with exponential backoff for rate limit errors
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  initialDelay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isRateLimit = error?.cause?.status === 429 || error?.message?.includes('rate limit');
      
      if (isRateLimit && i < maxRetries - 1) {
        const delayMs = initialDelay * Math.pow(2, i); // Exponential backoff: 1s, 2s, 4s, 8s, 16s
        console.log(`⏳ Rate limit hit, waiting ${delayMs}ms before retry ${i + 1}/${maxRetries}...`);
        await delay(delayMs);
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

async function seedDummyData() {
  console.log('🌱 Seeding dummy data for MentorGraph...');
  
  if (!CURRENT_WALLET || !ARKIV_PRIVATE_KEY) {
    console.error('❌ ARKIV_PRIVATE_KEY is not available. Please set it in your .env file.');
    process.exit(1);
  }
  
  const wallet = CURRENT_WALLET; // TypeScript narrowing
  const privateKey = ARKIV_PRIVATE_KEY; // TypeScript narrowing
  console.log(`Using wallet: ${wallet}`);

  try {
    // 1. Create a comprehensive user profile
    console.log('\n📝 Creating user profile...');
    // No delay needed before first operation
    const profileResult = await retryWithBackoff(() => createUserProfile({
      wallet,
      displayName: 'Alex Mentor',
      username: 'alex_mentor',
      profileImage: 'https://i.pravatar.cc/150?img=12',
      bioShort: 'Experienced blockchain developer and mentor',
      bioLong: 'I have 5+ years of experience in blockchain development, specializing in Solidity, Rust, and smart contract security. I love helping developers grow and learn.',
      skills: 'solidity,rust,smart-contracts,security,web3',
      skillsArray: ['solidity', 'rust', 'smart-contracts', 'security', 'web3'],
      timezone: 'UTC-5',
      languages: ['en', 'es'],
      contactLinks: {
        twitter: '@alex_mentor',
        github: 'alex-mentor',
        telegram: '@alex_mentor',
        discord: 'alex_mentor#1234',
      },
      seniority: 'expert',
      domainsOfInterest: ['blockchain', 'cryptography', 'zk'],
      mentorRoles: ['technical mentor', 'code review', 'architecture'],
      learnerRoles: ['design patterns', 'scaling'],
      privateKey,
    }));
    console.log(`✅ Profile created: ${profileResult.key}`);

    // 2. Create multiple asks
    console.log('\n❓ Creating asks...');
    const asks = [
      { skill: 'solidity', message: 'Need help with gas optimization in my smart contract', expiresIn: 3600 },
      { skill: 'rust', message: 'Looking for code review on my Rust project', expiresIn: 7200 },
      { skill: 'frontend', message: 'Need help with React hooks and state management', expiresIn: 5400 },
      { skill: 'spanish', message: 'Looking for Spanish conversation practice', expiresIn: 10800 },
    ];

    for (const ask of asks) {
      await delay(100); // 100ms delay = 10 req/s (well under 50 RPS limit)
      const result = await retryWithBackoff(() => createAsk({
        wallet,
        skill: ask.skill,
        message: ask.message,
        privateKey,
        expiresIn: ask.expiresIn,
      }));
      console.log(`✅ Ask created: ${result.key} (${ask.skill})`);
    }

    // 3. Create multiple offers
    console.log('\n💼 Creating offers...');
    const offers = [
      { skill: 'solidity', message: 'Available for Solidity code reviews and debugging', availabilityWindow: 'Mon-Fri 9am-5pm EST', expiresIn: 14400 },
      { skill: 'rust', message: 'Offering Rust mentorship and pair programming sessions', availabilityWindow: 'Weekends 10am-2pm EST', expiresIn: 18000 },
      { skill: 'devrel', message: 'Happy to help with developer relations and community building', availabilityWindow: 'Flexible', expiresIn: 21600 },
      { skill: 'chinese', message: 'Native Chinese speaker available for language practice', availabilityWindow: 'Evenings 7-9pm EST', expiresIn: 10800 },
    ];

    for (const offer of offers) {
      await delay(100); // 100ms delay = 10 req/s (well under 50 RPS limit)
      const result = await retryWithBackoff(() => createOffer({
        wallet,
        skill: offer.skill,
        message: offer.message,
        availabilityWindow: offer.availabilityWindow,
        privateKey,
        expiresIn: offer.expiresIn,
      }));
      console.log(`✅ Offer created: ${result.key} (${offer.skill})`);
    }

    // 4. Create sessions (with other dummy wallets)
    console.log('\n🤝 Creating sessions...');
    const otherWallets = [generateWallet(1), generateWallet(2), generateWallet(3)];
    
    const sessions = [
      {
        mentorWallet: CURRENT_WALLET,
        learnerWallet: otherWallets[0],
        skill: 'solidity',
        sessionDate: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        duration: 60,
        notes: 'Great session on gas optimization techniques',
        privateKey,
      },
      {
        mentorWallet: CURRENT_WALLET,
        learnerWallet: otherWallets[1],
        skill: 'rust',
        sessionDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        duration: 90,
        notes: 'Code review session on async Rust patterns',
        privateKey,
      },
      {
        mentorWallet: otherWallets[2],
        learnerWallet: CURRENT_WALLET,
        skill: 'design',
        sessionDate: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        duration: 45,
        notes: 'UI/UX design patterns discussion',
        privateKey,
      },
    ];

    const sessionKeys: string[] = [];
    for (const session of sessions) {
      await delay(100); // 100ms delay = 10 req/s (well under 50 RPS limit)
      const result = await retryWithBackoff(() => createSession(session));
      sessionKeys.push(result.key);
      console.log(`✅ Session created: ${result.key}`);
    }

    // 5. Create feedback
    console.log('\n⭐ Creating feedback...');
    const feedbacks = [
      {
        sessionKey: sessionKeys[0],
        fromWallet: otherWallets[0],
        toWallet: CURRENT_WALLET,
        role: 'learner' as const,
        rating: 5,
        npsScore: 80,
        text: 'Alex was incredibly helpful with gas optimization. Explained everything clearly!',
        skills: ['solidity', 'optimization'],
        wouldRecommend: true,
        privateKey,
      },
      {
        sessionKey: sessionKeys[1],
        fromWallet: otherWallets[1],
        toWallet: CURRENT_WALLET,
        role: 'learner' as const,
        rating: 4,
        npsScore: 70,
        text: 'Good code review session, learned a lot about async patterns',
        skills: ['rust', 'async'],
        wouldRecommend: true,
        privateKey,
      },
      {
        sessionKey: sessionKeys[2],
        fromWallet: CURRENT_WALLET,
        toWallet: otherWallets[2],
        role: 'learner' as const,
        rating: 5,
        npsScore: 90,
        text: 'Excellent design mentorship, very insightful!',
        skills: ['design', 'ui'],
        wouldRecommend: true,
        privateKey,
      },
    ];

    for (const feedback of feedbacks) {
      await delay(100); // 100ms delay = 10 req/s (well under 50 RPS limit)
      const result = await retryWithBackoff(() => createFeedback(feedback));
      console.log(`✅ Feedback created: ${result.key}`);
    }

    // 6. Create trust edges
    console.log('\n🔗 Creating trust edges...');
    const trustEdges = [
      {
        fromWallet: otherWallets[0],
        toWallet: CURRENT_WALLET,
        strength: 85,
        context: 'Great mentorship session on Solidity',
        sessionKey: sessionKeys[0],
        privateKey,
      },
      {
        fromWallet: otherWallets[1],
        toWallet: CURRENT_WALLET,
        strength: 75,
        context: 'Helpful Rust code review',
        sessionKey: sessionKeys[1],
        privateKey,
      },
      {
        fromWallet: CURRENT_WALLET,
        toWallet: otherWallets[2],
        strength: 90,
        context: 'Excellent design mentorship',
        sessionKey: sessionKeys[2],
        privateKey,
      },
    ];

    for (const edge of trustEdges) {
      await delay(100); // 100ms delay = 10 req/s (well under 50 RPS limit)
      const result = await retryWithBackoff(() => createTrustEdge(edge));
      console.log(`✅ Trust edge created: ${result.key}`);
    }

    console.log('\n✨ Dummy data seeding complete!');
    console.log('\n📊 Summary:');
    console.log(`   - 1 Profile`);
    console.log(`   - ${asks.length} Asks`);
    console.log(`   - ${offers.length} Offers`);
    console.log(`   - ${sessions.length} Sessions`);
    console.log(`   - ${feedbacks.length} Feedback entries`);
    console.log(`   - ${trustEdges.length} Trust edges`);

  } catch (error: any) {
    console.error('❌ Error seeding dummy data:', error);
    process.exit(1);
  }
}

seedDummyData();

