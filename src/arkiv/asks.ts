import { eq } from "@arkiv-network/sdk/query"
import { getPublicClient, getWalletClientFromPrivateKey } from "./client"

export type Ask = {
  key: string;
  wallet: string;
  skill: string;
  spaceId: string;
  createdAt: string;
  status: string;
  message: string;
  txHash?: string;
}

export async function createAsk({
  wallet,
  skill,
  message,
  privateKey,
}: {
  wallet: string;
  skill: string;
  message: string;
  privateKey: `0x${string}`;
}): Promise<{ key: string; txHash: string }> {
  const walletClient = getWalletClientFromPrivateKey(privateKey);
  const enc = new TextEncoder();
  const spaceId = 'local-dev';
  const status = 'open';
  const createdAt = new Date().toISOString();

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
    expiresIn: 3600, // 1 hour
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
  
  const result = await queryBuilder
    .withAttributes(true)
    .withPayload(true)
    .limit(100)
    .fetch();

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
    return {
      key: entity.key,
      wallet: attrs.wallet || '',
      skill: attrs.skill || '',
      spaceId: attrs.spaceId || 'local-dev',
      createdAt: attrs.createdAt || '',
      status: attrs.status || 'open',
      message: payload.message || '',
      txHash: payload.txHash,
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
  const result = await query
    .where(eq('type', 'ask'))
    .where(eq('wallet', wallet))
    .withAttributes(true)
    .withPayload(true)
    .limit(100)
    .fetch();

  return result.entities.map((entity: any) => {
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
      wallet: attrs.wallet || '',
      skill: attrs.skill || '',
      spaceId: attrs.spaceId || 'local-dev',
      createdAt: attrs.createdAt || '',
      status: attrs.status || 'open',
      message: payload.message || '',
      txHash: payload.txHash,
    };
  });
}

