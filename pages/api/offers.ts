import { createOffer, listOffers } from "../../src/arkiv/offers"

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const offers = await listOffers();
      res.json(offers);
    } else if (req.method === 'POST') {
      const { wallet, skill, message, availabilityWindow } = req.body;
      
      if (!wallet || !skill || !message || !availabilityWindow) {
        return res.status(400).json({ error: 'wallet, skill, message, and availabilityWindow are required' });
      }

      const { key, txHash } = await createOffer({
        wallet,
        skill,
        message,
        availabilityWindow,
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

