import { createPublicClient, ws } from "@arkiv-network/sdk"
import { mendoza } from "@arkiv-network/sdk/chains"
import { eq } from "@arkiv-network/sdk/query"
import { Ask, ASK_TTL_SECONDS } from "./asks"
import { Offer, OFFER_TTL_SECONDS } from "./offers"

function mapEntityToAsk(entity: any, txHashMap: Record<string, string> = {}): Ask {
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
  const getAttr = (key: string) => {
    if (Array.isArray(attrs)) {
      const attr = attrs.find((a: any) => a.key === key);
      return attr?.value || '';
    }
    return attrs[key] || '';
  };
  
  return {
    key: entity.key,
    wallet: getAttr('wallet') || payload.wallet || '',
    skill: getAttr('skill') || payload.skill || '',
    spaceId: getAttr('spaceId') || payload.spaceId || 'local-dev',
    createdAt: getAttr('createdAt') || payload.createdAt || '',
    status: getAttr('status') || payload.status || 'open',
    message: payload.message || '',
    ttlSeconds: ASK_TTL_SECONDS,
    txHash: txHashMap[entity.key] || getAttr('txHash') || payload.txHash || (entity as any).txHash || undefined,
  };
}

function mapEntityToOffer(entity: any, txHashMap: Record<string, string> = {}): Offer {
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
  const getAttr = (key: string) => {
    if (Array.isArray(attrs)) {
      const attr = attrs.find((a: any) => a.key === key);
      return attr?.value || '';
    }
    return attrs[key] || '';
  };
  
  return {
    key: entity.key,
    wallet: getAttr('wallet') || payload.wallet || '',
    skill: getAttr('skill') || payload.skill || '',
    spaceId: getAttr('spaceId') || payload.spaceId || 'local-dev',
    createdAt: getAttr('createdAt') || payload.createdAt || '',
    status: getAttr('status') || payload.status || 'active',
    message: payload.message || '',
    availabilityWindow: payload.availabilityWindow || '',
    ttlSeconds: OFFER_TTL_SECONDS,
    txHash: txHashMap[entity.key] || getAttr('txHash') || payload.txHash || (entity as any).txHash || undefined,
  };
}

export function subscribeToAsks(onAsk: (ask: Ask) => void): () => void {
  const wsUrl = process.env.ARKIV_WS_URL || process.env.NEXT_PUBLIC_ARKIV_WS_URL;
  if (!wsUrl) {
    console.error('ARKIV_WS_URL not configured');
    return () => {};
  }

  const publicClient = createPublicClient({
    chain: mendoza,
    transport: ws(wsUrl),
  });

  const txHashMap: Record<string, string> = {};

  const unsubscribe = publicClient.watchEntities({
    query: publicClient.buildQuery()
      .where(eq('type', 'ask'))
      .where(eq('status', 'open'))
      .withAttributes(true)
      .withPayload(true),
    onEntity: (entity: any) => {
      const ask = mapEntityToAsk(entity, txHashMap);
      onAsk(ask);
    },
  });

  const unsubscribeTxHash = publicClient.watchEntities({
    query: publicClient.buildQuery()
      .where(eq('type', 'ask_txhash'))
      .withAttributes(true)
      .withPayload(true),
    onEntity: (entity: any) => {
      const attrs = entity.attributes || {};
      const getAttr = (key: string) => {
        if (Array.isArray(attrs)) {
          const attr = attrs.find((a: any) => a.key === key);
          return attr?.value || '';
        }
        return attrs[key] || '';
      };
      const askKey = getAttr('askKey');
      if (askKey) {
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
          console.error('Error decoding txHash payload:', e);
        }
        if (payload.txHash) {
          txHashMap[askKey] = payload.txHash;
        }
      }
    },
  });

  return () => {
    unsubscribe();
    unsubscribeTxHash();
  };
}

export function subscribeToOffers(onOffer: (offer: Offer) => void): () => void {
  const wsUrl = process.env.ARKIV_WS_URL || process.env.NEXT_PUBLIC_ARKIV_WS_URL;
  if (!wsUrl) {
    console.error('ARKIV_WS_URL not configured');
    return () => {};
  }

  const publicClient = createPublicClient({
    chain: mendoza,
    transport: ws(wsUrl),
  });

  const txHashMap: Record<string, string> = {};

  const unsubscribe = publicClient.watchEntities({
    query: publicClient.buildQuery()
      .where(eq('type', 'offer'))
      .where(eq('status', 'active'))
      .withAttributes(true)
      .withPayload(true),
    onEntity: (entity: any) => {
      const offer = mapEntityToOffer(entity, txHashMap);
      onOffer(offer);
    },
  });

  const unsubscribeTxHash = publicClient.watchEntities({
    query: publicClient.buildQuery()
      .where(eq('type', 'offer_txhash'))
      .withAttributes(true)
      .withPayload(true),
    onEntity: (entity: any) => {
      const attrs = entity.attributes || {};
      const getAttr = (key: string) => {
        if (Array.isArray(attrs)) {
          const attr = attrs.find((a: any) => a.key === key);
          return attr?.value || '';
        }
        return attrs[key] || '';
      };
      const offerKey = getAttr('offerKey');
      if (offerKey) {
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
          console.error('Error decoding txHash payload:', e);
        }
        if (payload.txHash) {
          txHashMap[offerKey] = payload.txHash;
        }
      }
    },
  });

  return () => {
    unsubscribe();
    unsubscribeTxHash();
  };
}

