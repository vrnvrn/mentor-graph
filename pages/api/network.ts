import { listAsks } from "../../src/arkiv/asks"
import { listOffers } from "../../src/arkiv/offers"
import { listUserProfiles } from "../../src/arkiv/profiles"

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const skill = req.query.skill as string | undefined;
    const spaceId = req.query.spaceId as string | undefined;
    const seniority = req.query.seniority as string | undefined;

    const askOfferParams = skill || spaceId ? { skill, spaceId } : undefined;
    const profileParams = skill || seniority || spaceId ? { skill, seniority, spaceId } : undefined;

    const [asks, offers, profiles] = await Promise.all([
      listAsks(askOfferParams),
      listOffers(askOfferParams),
      listUserProfiles(profileParams),
    ]);

    // Apply client-side filters that can't be done via Arkiv queries
    let filteredProfiles = profiles;
    
    // Note: mentorRoles, learnerRoles, reputationScore, session counts, and community filters
    // are applied client-side since they require payload inspection
    // The API returns all profiles matching the basic Arkiv-queryable filters

    res.json({
      asks,
      offers,
      profiles: filteredProfiles,
    });
  } catch (error: any) {
    console.error('API error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
}

