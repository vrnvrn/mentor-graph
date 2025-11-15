import { createUserProfile, listUserProfilesForWallet } from "../../src/arkiv/profiles"
import { CURRENT_WALLET, getPrivateKey } from "../../src/config"

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const wallet = CURRENT_WALLET || '';
      if (!wallet) {
        return res.status(400).json({ error: 'No wallet configured' });
      }
      const profiles = await listUserProfilesForWallet(wallet);
      res.json(profiles);
    } else if (req.method === 'POST') {
      const { displayName, skills, timezone, wallet: requestWallet } = req.body;
      const wallet = requestWallet || CURRENT_WALLET || '';
      
      if (!wallet) {
        return res.status(400).json({ error: 'No wallet address provided' });
      }
      if (!displayName) {
        return res.status(400).json({ error: 'displayName is required' });
      }

      const { key, txHash } = await createUserProfile({
        wallet,
        displayName,
        skills: skills || '',
        timezone: timezone || '',
        privateKey: getPrivateKey(),
      });

      res.json({ key, txHash });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

