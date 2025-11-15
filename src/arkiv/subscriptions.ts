import { createPublicClient, http } from "@arkiv-network/sdk"
import { mendoza } from "@arkiv-network/sdk/chains"
import { Ask, ASK_TTL_SECONDS } from "./asks"
import { Offer, OFFER_TTL_SECONDS } from "./offers"
import { getPublicClient } from "./client"

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
  const getAttr = (key: string): string => {
    if (Array.isArray(attrs)) {
      const attr = attrs.find((a: any) => a.key === key);
      return String(attr?.value || '');
    }
    return String(attrs[key] || '');
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
  const getAttr = (key: string): string => {
    if (Array.isArray(attrs)) {
      const attr = attrs.find((a: any) => a.key === key);
      return String(attr?.value || '');
    }
    return String(attrs[key] || '');
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
  const publicClient = getPublicClient();
  const txHashMap: Record<string, string> = {};

  let unsubscribeFn: (() => void) | null = null;

  console.log('[subscribeToAsks] Starting subscription...');
  publicClient.subscribeEntityEvents({
    onEntityCreated: async (event) => {
      try {
        const entity = await publicClient.getEntity(event.entityKey);
        if (!entity) return;

        const attrs = entity.attributes || {};
        const getAttr = (key: string) => {
          if (Array.isArray(attrs)) {
            const attr = attrs.find((a: any) => a.key === key);
            return attr?.value || '';
          }
          return attrs[key] || '';
        };

        const entityType = getAttr('type');
        const entityStatus = getAttr('status');

        if (entityType === 'ask' && entityStatus === 'open') {
          console.log('[subscribeToAsks] New ask detected:', entity.key);
          const ask = mapEntityToAsk(entity, txHashMap);
          onAsk(ask);
        }

        if (entityType === 'ask_txhash') {
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
        }
      } catch (error) {
        console.error('Error processing entity created event:', error);
      }
    },
    onError: (error) => {
      console.error('Error in subscribeToAsks:', error);
    },
  }).then((unsubscribe) => {
    console.log('[subscribeToAsks] Subscription established');
    unsubscribeFn = unsubscribe;
  }).catch((error) => {
    console.error('[subscribeToAsks] Error subscribing:', error);
  });

  return () => {
    if (unsubscribeFn) {
      unsubscribeFn();
    }
  };
}

export function subscribeToOffers(onOffer: (offer: Offer) => void): () => void {
  const publicClient = getPublicClient();
  const txHashMap: Record<string, string> = {};

  let unsubscribeFn: (() => void) | null = null;

  console.log('[subscribeToOffers] Starting subscription...');
  publicClient.subscribeEntityEvents({
    onEntityCreated: async (event) => {
      try {
        const entity = await publicClient.getEntity(event.entityKey);
        if (!entity) return;

        const attrs = entity.attributes || {};
        const getAttr = (key: string) => {
          if (Array.isArray(attrs)) {
            const attr = attrs.find((a: any) => a.key === key);
            return attr?.value || '';
          }
          return attrs[key] || '';
        };

        const entityType = getAttr('type');
        const entityStatus = getAttr('status');

        if (entityType === 'offer' && entityStatus === 'active') {
          console.log('[subscribeToOffers] New offer detected:', entity.key);
          const offer = mapEntityToOffer(entity, txHashMap);
          onOffer(offer);
        }

        if (entityType === 'offer_txhash') {
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
        }
      } catch (error) {
        console.error('Error processing entity created event:', error);
      }
    },
    onError: (error) => {
      console.error('Error in subscribeToOffers:', error);
    },
  }).then((unsubscribe) => {
    console.log('[subscribeToOffers] Subscription established');
    unsubscribeFn = unsubscribe;
  }).catch((error) => {
    console.error('[subscribeToOffers] Error subscribing:', error);
  });

  return () => {
    if (unsubscribeFn) {
      unsubscribeFn();
    }
  };
}

