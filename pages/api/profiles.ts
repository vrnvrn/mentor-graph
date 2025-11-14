import { eq } from "@arkiv-network/sdk/query"
import { getPublicClient, getWalletClient } from "../../src/arkiv/client"

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const publicClient = getPublicClient();
      const query = publicClient.buildQuery();
      const result = await query
        .where(eq('type', 'user_profile'))
        .withAttributes(true)
        .withPayload(true)
        .limit(100)
        .fetch();

      const profiles = result.entities.map((entity: any) => {
        let payload: any = {};
        try {
          if (entity.payload) {
            const decoded = entity.payload instanceof Uint8Array
              ? new TextDecoder().decode(entity.payload)
              : typeof entity.payload === 'string'
              ? entity.payload
              : JSON.stringify(entity.payload);
            payload = JSON.parse(decoded);
          }
        } catch (e) {
          console.error('Error decoding payload:', e);
        }

        const attrs = entity.attributes || {};
        return {
          key: entity.key,
          displayName: attrs.displayName || payload.displayName || '',
          skills: attrs.skills || payload.skills || '',
          timezone: attrs.timezone || payload.timezone || '',
        };
      });

      res.json(profiles);
    } else if (req.method === 'POST') {
      const { displayName, skills, timezone } = req.body;
      
      if (!displayName) {
        return res.status(400).json({ error: 'displayName is required' });
      }

      const walletClient = getWalletClient();
      const enc = new TextEncoder();

      const { entityKey } = await walletClient.createEntity({
        payload: enc.encode(JSON.stringify({
          displayName,
          skills: skills || '',
          timezone: timezone || '',
        })),
        contentType: 'application/json',
        attributes: [
          { key: 'type', value: 'user_profile' },
          { key: 'wallet', value: walletClient.account.address },
          { key: 'displayName', value: displayName },
          { key: 'skills', value: skills || '' },
          { key: 'timezone', value: timezone || '' },
        ],
        expiresIn: 31536000, // 1 year
      });

      res.json({ key: entityKey });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

