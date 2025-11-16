import { getProfileByWallet, createUserProfile, updateUserProfile } from "../../src/arkiv/profiles"
import { listAsksForWallet, createAsk } from "../../src/arkiv/asks"
import { listOffersForWallet, createOffer } from "../../src/arkiv/offers"
import { listSessionsForWallet, createSession, confirmSession, rejectSession } from "../../src/arkiv/sessions"
import { listFeedbackForWallet } from "../../src/arkiv/feedback"
import { CURRENT_WALLET, getPrivateKey } from "../../src/config"

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      // Get wallet address from query param, fallback to CURRENT_WALLET for backward compatibility
      const wallet = (req.query.wallet as string) || CURRENT_WALLET || '';
      if (!wallet) {
        return res.status(400).json({ ok: false, error: 'No wallet address provided' });
      }
      
      const [profile, asks, offers, sessions, feedback] = await Promise.all([
        getProfileByWallet(wallet),
        listAsksForWallet(wallet),
        listOffersForWallet(wallet),
        listSessionsForWallet(wallet),
        listFeedbackForWallet(wallet),
      ]);

      // Compute reputation metadata from sessions and feedback
      const sessionsCompleted = sessions.filter(s => s.status === 'completed').length;
      const sessionsGiven = sessions.filter(s => s.mentorWallet.toLowerCase() === wallet.toLowerCase() && s.status === 'completed').length;
      const sessionsReceived = sessions.filter(s => s.learnerWallet.toLowerCase() === wallet.toLowerCase() && s.status === 'completed').length;
      
      const ratingsForWallet = feedback.filter(f => f.toWallet.toLowerCase() === wallet.toLowerCase() && f.rating).map(f => f.rating!);
      const avgRating = ratingsForWallet.length > 0 
        ? ratingsForWallet.reduce((sum, r) => sum + r, 0) / ratingsForWallet.length 
        : 0;
      
      const npsScores = feedback.filter(f => f.toWallet.toLowerCase() === wallet.toLowerCase() && f.npsScore !== undefined).map(f => f.npsScore!);
      const npsScore = npsScores.length > 0
        ? npsScores.reduce((sum, n) => sum + n, 0) / npsScores.length
        : 0;

      // Compute topSkillsUsage from sessions
      const skillCounts: Record<string, number> = {};
      sessions.filter(s => s.status === 'completed').forEach(s => {
        skillCounts[s.skill] = (skillCounts[s.skill] || 0) + 1;
      });
      const topSkillsUsage = Object.entries(skillCounts)
        .map(([skill, count]) => ({ skill, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Extract peerTestimonials from feedback
      const peerTestimonials = feedback
        .filter(f => f.toWallet.toLowerCase() === wallet.toLowerCase() && f.text)
        .map(f => ({
          text: f.text!,
          timestamp: f.createdAt,
          fromWallet: f.fromWallet,
        }));

      // Compute reputationScore (simple formula: sessions * avgRating * 10)
      const reputationScore = Math.round(sessionsCompleted * avgRating * 10);

      // Merge computed fields into profile if it exists
      const enrichedProfile = profile ? {
        ...profile,
        sessionsCompleted,
        sessionsGiven,
        sessionsReceived,
        avgRating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
        npsScore: Math.round(npsScore),
        topSkillsUsage,
        peerTestimonials,
        reputationScore,
        lastActiveTimestamp: new Date().toISOString(),
      } : null;

      res.json({
        wallet,
        profile: enrichedProfile,
        asks,
        offers,
        sessions,
        feedback,
      });
    } else if (req.method === 'POST') {
      const { action, wallet: requestWallet } = req.body;
      // Use wallet from request body, fallback to CURRENT_WALLET for backward compatibility
      const wallet = requestWallet || CURRENT_WALLET || '';
      if (!wallet) {
        return res.status(400).json({ ok: false, error: 'No wallet address provided' });
      }

      if (action === 'createProfile') {
        const { 
          displayName, 
          username,
          profileImage,
          bio,
          bioShort,
          bioLong,
          skills, 
          skillsArray,
          timezone,
          languages,
          contactLinks,
          seniority,
          domainsOfInterest,
          mentorRoles,
          learnerRoles,
        } = req.body;
        if (!displayName) {
          return res.status(400).json({ ok: false, error: 'displayName is required' });
        }
        await createUserProfile({
          wallet,
          displayName,
          username,
          profileImage,
          bio,
          bioShort,
          bioLong,
          skills: skills || '',
          skillsArray: skillsArray || (skills ? skills.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined),
          timezone: timezone || '',
          languages: languages || undefined,
          contactLinks: contactLinks || undefined,
          seniority: seniority || undefined,
          domainsOfInterest: domainsOfInterest || undefined,
          mentorRoles: mentorRoles || undefined,
          learnerRoles: learnerRoles || undefined,
          privateKey: getPrivateKey(),
        });
        res.json({ ok: true });
      } else if (action === 'updateProfile') {
        const { 
          displayName,
          username,
          profileImage,
          bio,
          bioShort,
          bioLong,
          skills, 
          skillsArray,
          timezone,
          languages,
          contactLinks,
          seniority,
          domainsOfInterest,
          mentorRoles,
          learnerRoles,
        } = req.body;
        if (!displayName) {
          return res.status(400).json({ ok: false, error: 'displayName is required' });
        }
        await updateUserProfile({
          wallet,
          displayName,
          username,
          profileImage,
          bio,
          bioShort,
          bioLong,
          skills: skills || '',
          skillsArray: skillsArray || (skills ? skills.split(',').map((s: string) => s.trim()).filter(Boolean) : undefined),
          timezone: timezone || '',
          languages: languages || undefined,
          contactLinks: contactLinks || undefined,
          seniority: seniority || undefined,
          domainsOfInterest: domainsOfInterest || undefined,
          mentorRoles: mentorRoles || undefined,
          learnerRoles: learnerRoles || undefined,
          privateKey: getPrivateKey(),
        });
        res.json({ ok: true });
      } else if (action === 'createAsk') {
        const { skill, message, expiresIn } = req.body;
        if (!skill || !message) {
          return res.status(400).json({ ok: false, error: 'skill and message are required' });
        }
        // Parse expiresIn: if provided, use it; otherwise undefined (will use default in createAsk)
        let parsedExpiresIn: number | undefined = undefined;
        if (expiresIn !== undefined && expiresIn !== null && expiresIn !== '') {
          const num = typeof expiresIn === 'number' ? expiresIn : Number(expiresIn);
          if (!isNaN(num) && num > 0 && isFinite(num)) {
            parsedExpiresIn = Math.floor(num);
          }
        }
        const { key, txHash } = await createAsk({
          wallet,
          skill,
          message,
          privateKey: getPrivateKey(),
          expiresIn: parsedExpiresIn,
        });
        res.json({ ok: true, key, txHash });
      } else if (action === 'createOffer') {
        const { skill, message, availabilityWindow, expiresIn } = req.body;
        if (!skill || !message || !availabilityWindow) {
          return res.status(400).json({ ok: false, error: 'skill, message, and availabilityWindow are required' });
        }
        // Parse expiresIn: if provided, use it; otherwise undefined (will use default in createOffer)
        let parsedExpiresIn: number | undefined = undefined;
        if (expiresIn !== undefined && expiresIn !== null && expiresIn !== '') {
          const num = typeof expiresIn === 'number' ? expiresIn : Number(expiresIn);
          if (!isNaN(num) && num > 0 && isFinite(num)) {
            parsedExpiresIn = Math.floor(num);
          }
        }
        const { key, txHash } = await createOffer({
          wallet,
          skill,
          message,
          availabilityWindow,
          privateKey: getPrivateKey(),
          expiresIn: parsedExpiresIn,
        });
        res.json({ ok: true, key, txHash });
      } else if (action === 'createSession') {
        const { mentorWallet, learnerWallet, skill, sessionDate, duration, notes } = req.body;
        if (!mentorWallet || !learnerWallet || !skill || !sessionDate) {
          return res.status(400).json({ ok: false, error: 'mentorWallet, learnerWallet, skill, and sessionDate are required' });
        }
        
        // Normalize wallet addresses to lowercase for consistency
        const normalizedMentorWallet = mentorWallet.toLowerCase();
        const normalizedLearnerWallet = learnerWallet.toLowerCase();
        
        // Validate that mentor and learner are different wallets
        if (normalizedMentorWallet === normalizedLearnerWallet) {
          return res.status(400).json({ ok: false, error: 'Mentor and learner must be different wallets' });
        }
        
        const { key, txHash } = await createSession({
          mentorWallet: normalizedMentorWallet,
          learnerWallet: normalizedLearnerWallet,
          skill,
          sessionDate,
          duration: duration ? parseInt(duration, 10) : undefined,
          notes: notes || undefined,
          privateKey: getPrivateKey(),
        });
        res.json({ ok: true, key, txHash });
      } else if (action === 'confirmSession') {
        const { sessionKey, mentorWallet, learnerWallet, spaceId } = req.body;
        if (!sessionKey) {
          return res.status(400).json({ ok: false, error: 'sessionKey is required' });
        }
        
        // Normalize wallet addresses
        const normalizedWallet = wallet.toLowerCase();
        const normalizedMentorWallet = mentorWallet ? mentorWallet.toLowerCase() : undefined;
        const normalizedLearnerWallet = learnerWallet ? learnerWallet.toLowerCase() : undefined;
        
        const { key, txHash } = await confirmSession({
          sessionKey,
          confirmedByWallet: normalizedWallet,
          privateKey: getPrivateKey(),
          mentorWallet: normalizedMentorWallet,
          learnerWallet: normalizedLearnerWallet,
          spaceId,
        });
        res.json({ ok: true, key, txHash });
      } else if (action === 'rejectSession') {
        const { sessionKey, mentorWallet, learnerWallet, spaceId } = req.body;
        if (!sessionKey) {
          return res.status(400).json({ ok: false, error: 'sessionKey is required' });
        }
        
        // Normalize wallet addresses
        const normalizedWallet = wallet.toLowerCase();
        const normalizedMentorWallet = mentorWallet ? mentorWallet.toLowerCase() : undefined;
        const normalizedLearnerWallet = learnerWallet ? learnerWallet.toLowerCase() : undefined;
        
        const { key, txHash } = await rejectSession({
          sessionKey,
          rejectedByWallet: normalizedWallet,
          privateKey: getPrivateKey(),
          mentorWallet: normalizedMentorWallet,
          learnerWallet: normalizedLearnerWallet,
          spaceId,
        });
        res.json({ ok: true, key, txHash });
      } else {
        return res.status(400).json({ ok: false, error: 'Invalid action' });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('API error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
}

