import 'dotenv/config';
import { createAsk } from '../src/arkiv/asks';
import { createOffer } from '../src/arkiv/offers';
import { CURRENT_WALLET, ARKIV_PRIVATE_KEY } from '../src/config';

// Simple delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function seedSimple() {
  console.log('🌱 Seeding simple test data (asks & offers only)...');
  console.log(`Using wallet: ${CURRENT_WALLET}\n`);

  try {
    // Create some asks
    console.log('❓ Creating asks...');
    const asks = [
      { skill: 'solidity', message: 'Need help with gas optimization' },
      { skill: 'rust', message: 'Looking for code review on my Rust project' },
      { skill: 'frontend', message: 'Need help with React hooks' },
    ];

    for (const ask of asks) {
      await delay(200); // 200ms delay = 5 req/s (well under 50 RPS)
      try {
        const result = await createAsk({
          wallet: CURRENT_WALLET,
          skill: ask.skill,
          message: ask.message,
          privateKey: ARKIV_PRIVATE_KEY,
        });
        console.log(`✅ Ask: ${ask.skill}`);
      } catch (error: any) {
        console.log(`⚠️  Skipped ask (${ask.skill}): ${error.message}`);
      }
    }

    console.log('\n💼 Creating offers...');
    const offers = [
      { skill: 'solidity', message: 'Available for Solidity code reviews', availabilityWindow: 'Mon-Fri 9am-5pm EST' },
      { skill: 'rust', message: 'Offering Rust mentorship', availabilityWindow: 'Weekends 10am-2pm EST' },
      { skill: 'devrel', message: 'Happy to help with developer relations', availabilityWindow: 'Flexible' },
    ];

    for (const offer of offers) {
      await delay(200); // 200ms delay
      try {
        const result = await createOffer({
          wallet: CURRENT_WALLET,
          skill: offer.skill,
          message: offer.message,
          availabilityWindow: offer.availabilityWindow,
          privateKey: ARKIV_PRIVATE_KEY,
        });
        console.log(`✅ Offer: ${offer.skill}`);
      } catch (error: any) {
        console.log(`⚠️  Skipped offer (${offer.skill}): ${error.message}`);
      }
    }

    console.log('\n✨ Done! Check /network to see the analytics.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

seedSimple();

