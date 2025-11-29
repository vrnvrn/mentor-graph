import { eq } from "@arkiv-network/sdk/query"
import { getPublicClient, getWalletClientFromPrivateKey } from "./client"

export const ASK_TTL_SECONDS = 3600;

export type Ask = {
  key: string;
  wallet: string;
  skill: string;
  spaceId: string;
  createdAt: string;
  status: string;
  message: string;
  ttlSeconds: number;
  txHash?: string;
}

export async function createAsk({
  wallet,
  skill,
  message,
  privateKey,
  expiresIn,
}: {
  wallet: string;
  skill: string;
  message: string;
  privateKey: `0x${string}`;
  expiresIn?: number;
}): Promise<{ key: string; txHash: string }> {
  const walletClient = getWalletClientFromPrivateKey(privateKey);
  const enc = new TextEncoder();
  const spaceId = 'local-dev';
  const status = 'open';
  const createdAt = new Date().toISOString();
  // Use expiresIn if provided and valid, otherwise use default
  const ttl = (expiresIn !== undefined && expiresIn !== null && typeof expiresIn === 'number' && expiresIn > 0) ? expiresIn : ASK_TTL_SECONDS;

  const { entityKey, txHash } = await walletClient.createEntity({
    payload: enc.encode(JSON.stringify({
      message,
    })),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: 'ask' },
      { key: 'wallet', value: wallet },
      { key: 'skill', value: skill },
      { key: 'spaceId', value: spaceId },
      { key: 'createdAt', value: createdAt },
      { key: 'status', value: status },
    ],
    expiresIn: ttl,
  });

  await walletClient.createEntity({
    payload: enc.encode(JSON.stringify({
      txHash,
    })),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: 'ask_txhash' },
      { key: 'askKey', value: entityKey },
      { key: 'wallet', value: wallet },
      { key: 'spaceId', value: spaceId },
    ],
    expiresIn: ttl,
  });

  return { key: entityKey, txHash };
}

export async function listAsks(params?: { skill?: string; spaceId?: string }): Promise<Ask[]> {
  const publicClient = getPublicClient();
  const query = publicClient.buildQuery();
  let queryBuilder = query.where(eq('type', 'ask')).where(eq('status', 'open'));
  
  if (params?.spaceId) {
    queryBuilder = queryBuilder.where(eq('spaceId', params.spaceId));
  }
  
  const [result, txHashResult] = await Promise.all([
    queryBuilder.withAttributes(true).withPayload(true).limit(100).fetch(),
    publicClient.buildQuery()
      .where(eq('type', 'ask_txhash'))
      .withAttributes(true)
      .withPayload(true)
      .limit(100)
      .fetch(),
  ]);

  const txHashMap: Record<string, string> = {};
  txHashResult.entities.forEach((entity: any) => {
    const attrs = entity.attributes || {};
    const getAttr = (key: string): string => {
      if (Array.isArray(attrs)) {
        const attr = attrs.find((a: any) => a.key === key);
        return String(attr?.value || '');
      }
      return String(attrs[key] || '');
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
  });

  let asks = result.entities.map((entity: any) => {
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
  });

  if (params?.skill) {
    const skillLower = params.skill.toLowerCase();
    asks = asks.filter(ask => ask.skill.toLowerCase().includes(skillLower));
  }

  return asks;
}

export async function listAsksForWallet(wallet: string): Promise<Ask[]> {
  const publicClient = getPublicClient();
  const query = publicClient.buildQuery();
  
  // Use Promise.allSettled to handle timeouts gracefully
  const [result, txHashResult] = await Promise.allSettled([
    query
      .where(eq('type', 'ask'))
      .where(eq('wallet', wallet))
      .withAttributes(true)
      .withPayload(true)
      .limit(100)
      .fetch(),
    publicClient.buildQuery()
      .where(eq('type', 'ask_txhash'))
      .where(eq('wallet', wallet))
      .withAttributes(true)
      .withPayload(true)
      .limit(100)
      .fetch(),
  ]);

  // Handle failures gracefully
  const askResult = result.status === 'fulfilled' ? result.value : { entities: [] };
  const txHashResultValue = txHashResult.status === 'fulfilled' ? txHashResult.value : { entities: [] };
  
  if (result.status === 'rejected') {
    console.error('Error fetching asks for wallet:', result.reason);
  }
  if (txHashResult.status === 'rejected') {
    console.error('Error fetching ask_txhash for wallet:', txHashResult.reason);
  }

  const txHashMap: Record<string, string> = {};
  txHashResult.entities.forEach((entity: any) => {
    const attrs = entity.attributes || {};
    const getAttr = (key: string): string => {
      if (Array.isArray(attrs)) {
        const attr = attrs.find((a: any) => a.key === key);
        return String(attr?.value || '');
      }
      return String(attrs[key] || '');
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
  });

  return askResult.entities.map((entity: any) => {
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
  });
}

