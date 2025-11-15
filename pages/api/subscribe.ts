import { subscribeToAsks, subscribeToOffers } from "../../src/arkiv/subscriptions"
import { Ask } from "../../src/arkiv/asks"
import { Offer } from "../../src/arkiv/offers"

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  let unsubscribeAsks: (() => void) | null = null;
  let unsubscribeOffers: (() => void) | null = null;

  const handleAsk = (ask: Ask) => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'ask', entity: ask })}\n\n`);
    } catch (error) {
      console.error('Error writing ask to SSE stream:', error);
    }
  };

  const handleOffer = (offer: Offer) => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'offer', entity: offer })}\n\n`);
    } catch (error) {
      console.error('Error writing offer to SSE stream:', error);
    }
  };

  unsubscribeAsks = subscribeToAsks(handleAsk);
  unsubscribeOffers = subscribeToOffers(handleOffer);

  req.on('close', () => {
    if (unsubscribeAsks) {
      unsubscribeAsks();
      unsubscribeAsks = null;
    }
    if (unsubscribeOffers) {
      unsubscribeOffers();
      unsubscribeOffers = null;
    }
    if (!res.headersSent) {
      res.end();
    }
  });
}

