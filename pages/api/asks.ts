import { createAsk, listAsksForWallet } from "../../src/arkiv/asks"
import { CURRENT_WALLET, getPrivateKey } from "../../src/config"

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const wallet = CURRENT_WALLET || '';
      if (!wallet) {
        return res.status(400).json({ error: 'No wallet configured' });
      }
      const asks = await listAsksForWallet(wallet);
      res.json(asks);
    } else if (req.method === 'POST') {
      const { skill, message, wallet: requestWallet } = req.body;
      const wallet = requestWallet || CURRENT_WALLET || '';
      
      if (!wallet) {
        return res.status(400).json({ error: 'No wallet address provided' });
      }
      if (!skill || !message) {
        return res.status(400).json({ error: 'skill and message are required' });
      }

      const { key, txHash } = await createAsk({
        wallet,
        skill,
        message,
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

