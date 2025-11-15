import { getProfileByWallet, createUserProfile, updateUserProfile } from "../../src/arkiv/profiles"
import { listAsksForWallet, createAsk } from "../../src/arkiv/asks"
import { listOffersForWallet, createOffer } from "../../src/arkiv/offers"
import { listSessionsForWallet } from "../../src/arkiv/sessions"
import { listFeedbackForWallet } from "../../src/arkiv/feedback"
import { CURRENT_WALLET, ARKIV_PRIVATE_KEY } from "../../src/config"

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const [profile, asks, offers, sessions, feedback] = await Promise.all([
        getProfileByWallet(CURRENT_WALLET),
        listAsksForWallet(CURRENT_WALLET),
        listOffersForWallet(CURRENT_WALLET),
        listSessionsForWallet(CURRENT_WALLET),
        listFeedbackForWallet(CURRENT_WALLET),
      ]);

      res.json({
        wallet: CURRENT_WALLET,
        profile,
        asks,
        offers,
        sessions,
        feedback,
      });
    } else if (req.method === 'POST') {
      const { action } = req.body;

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
          wallet: CURRENT_WALLET,
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
          privateKey: ARKIV_PRIVATE_KEY,
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
          wallet: CURRENT_WALLET,
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
          privateKey: ARKIV_PRIVATE_KEY,
        });
        res.json({ ok: true });
      } else if (action === 'createAsk') {
        const { skill, message, expiresIn } = req.body;
        if (!skill || !message) {
          return res.status(400).json({ ok: false, error: 'skill and message are required' });
        }
        const { key, txHash } = await createAsk({
          wallet: CURRENT_WALLET,
          skill,
          message,
          privateKey: ARKIV_PRIVATE_KEY,
          expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
        });
        res.json({ ok: true, key, txHash });
      } else if (action === 'createOffer') {
        const { skill, message, availabilityWindow, expiresIn } = req.body;
        if (!skill || !message || !availabilityWindow) {
          return res.status(400).json({ ok: false, error: 'skill, message, and availabilityWindow are required' });
        }
        const { key, txHash } = await createOffer({
          wallet: CURRENT_WALLET,
          skill,
          message,
          availabilityWindow,
          privateKey: ARKIV_PRIVATE_KEY,
          expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
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

