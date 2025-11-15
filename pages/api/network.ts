import { listAsks } from "../../src/arkiv/asks"
import { listOffers } from "../../src/arkiv/offers"

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const skill = req.query.skill as string | undefined;
    const spaceId = req.query.spaceId as string | undefined;

    const params = skill || spaceId ? { skill, spaceId } : undefined;

    const [asks, offers] = await Promise.all([
      listAsks(params),
      listOffers(params),
    ]);

    res.json({
      asks,
      offers,
    });
  } catch (error: any) {
    console.error('API error:', error);
    res.status(500).json({ ok: false, error: error.message || 'Internal server error' });
  }
}

