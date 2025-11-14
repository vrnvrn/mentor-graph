import { createAsk, listAsks } from "../../src/arkiv/asks"

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const asks = await listAsks();
      res.json(asks);
    } else if (req.method === 'POST') {
      const { wallet, skill, message } = req.body;
      
      if (!wallet || !skill || !message) {
        return res.status(400).json({ error: 'wallet, skill, and message are required' });
      }

      const { key, txHash } = await createAsk({
        wallet,
        skill,
        message,
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

