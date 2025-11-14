import { createUserProfile, listUserProfiles } from "../../src/arkiv/profiles"

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const skill = req.query.skill as string | undefined;
      const profiles = await listUserProfiles(skill);
      res.json(profiles);
    } else if (req.method === 'POST') {
      const { displayName, skills, timezone, spaceId } = req.body;
      
      if (!displayName) {
        return res.status(400).json({ error: 'displayName is required' });
      }

      const { key, txHash } = await createUserProfile(
        displayName,
        skills || '',
        timezone || '',
        spaceId || 'local-dev'
      );

      res.json({ key, txHash });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

