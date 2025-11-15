import { CURRENT_WALLET } from "../../src/config";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return the example wallet address (from ARKIV_PRIVATE_KEY)
  // This allows users to log in without MetaMask for demo purposes
  if (!CURRENT_WALLET) {
    return res.status(503).json({ error: 'Example wallet not available' });
  }

  res.json({
    address: CURRENT_WALLET,
  });
}

