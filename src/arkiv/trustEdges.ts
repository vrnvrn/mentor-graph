import { eq } from "@arkiv-network/sdk/query"
import { getPublicClient, getWalletClientFromPrivateKey } from "./client"

export type TrustEdge = {
  key: string;
  fromWallet: string; // Who is establishing trust
  toWallet: string; // Who is being trusted
  strength: number; // 0-100, trust strength
  spaceId: string;
  createdAt: string;
  context?: string; // Optional context about why trust was established
  sessionKey?: string; // Optional reference to session that led to trust
  txHash?: string;
}

export async function createTrustEdge({
  fromWallet,
  toWallet,
  strength,
  context,
  sessionKey,
  privateKey,
}: {
  fromWallet: string;
  toWallet: string;
  strength: number; // 0-100
  context?: string;
  sessionKey?: string;
  privateKey: `0x${string}`;
}): Promise<{ key: string; txHash: string }> {
  const walletClient = getWalletClientFromPrivateKey(privateKey);
  const enc = new TextEncoder();
  const spaceId = 'local-dev';
  const createdAt = new Date().toISOString();

  // Clamp strength to 0-100
  const clampedStrength = Math.max(0, Math.min(100, strength));

  const payload = {
    strength: clampedStrength,
    context: context || '',
    sessionKey: sessionKey || undefined,
  };

  const { entityKey, txHash } = await walletClient.createEntity({
    payload: enc.encode(JSON.stringify(payload)),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: 'trust_edge' },
      { key: 'fromWallet', value: fromWallet },
      { key: 'toWallet', value: toWallet },
      { key: 'spaceId', value: spaceId },
      { key: 'createdAt', value: createdAt },
      { key: 'strength', value: clampedStrength.toString() },
    ],
    expiresIn: 31536000, // 1 year (trust edges are long-lived)
  });

  // Store txHash in a separate entity for verifiability
  await walletClient.createEntity({
    payload: enc.encode(JSON.stringify({
      txHash,
    })),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: 'trust_edge_txhash' },
      { key: 'trustEdgeKey', value: entityKey },
      { key: 'fromWallet', value: fromWallet },
      { key: 'toWallet', value: toWallet },
      { key: 'spaceId', value: spaceId },
    ],
    expiresIn: 31536000,
  });

  return { key: entityKey, txHash };
}

export async function listTrustEdges(params?: { 
  fromWallet?: string; 
  toWallet?: string; 
  spaceId?: string;
  minStrength?: number;
}): Promise<TrustEdge[]> {
  const publicClient = getPublicClient();
  const query = publicClient.buildQuery();
  let queryBuilder = query.where(eq('type', 'trust_edge'));
  
  if (params?.spaceId) {
    queryBuilder = queryBuilder.where(eq('spaceId', params.spaceId));
  }
  if (params?.fromWallet) {
    queryBuilder = queryBuilder.where(eq('fromWallet', params.fromWallet));
  }
  if (params?.toWallet) {
    queryBuilder = queryBuilder.where(eq('toWallet', params.toWallet));
  }
  
  const [result, txHashResult] = await Promise.all([
    queryBuilder
      .withAttributes(true)
      .withPayload(true)
      .limit(100)
      .fetch(),
    publicClient.buildQuery()
      .where(eq('type', 'trust_edge_txhash'))
      .withAttributes(true)
      .withPayload(true)
      .limit(100)
      .fetch(),
  ]);

  // Build txHash map
  const txHashMap: Record<string, string> = {};
  txHashResult.entities.forEach((entity: any) => {
    const attrs = entity.attributes || {};
    const getAttr = (key: string) => {
      if (Array.isArray(attrs)) {
        const attr = attrs.find((a: any) => a.key === key);
        return attr?.value || '';
      }
      return attrs[key] || '';
    };
    const trustEdgeKey = getAttr('trustEdgeKey');
    if (trustEdgeKey) {
      try {
        const payload = entity.payload instanceof Uint8Array
          ? new TextDecoder().decode(entity.payload)
          : typeof entity.payload === 'string'
          ? entity.payload
          : JSON.stringify(entity.payload);
        const decoded = JSON.parse(payload);
        if (decoded.txHash) {
          txHashMap[trustEdgeKey] = decoded.txHash;
        }
      } catch (e) {
        console.error('Error decoding txHash payload:', e);
      }
    }
  });

  return result.entities
    .map((entity: any) => {
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

      const strength = payload.strength !== undefined 
        ? payload.strength 
        : (getAttr('strength') ? parseInt(getAttr('strength'), 10) : 0);

      return {
        key: entity.key,
        fromWallet: getAttr('fromWallet') || '',
        toWallet: getAttr('toWallet') || '',
        strength,
        spaceId: getAttr('spaceId') || 'local-dev',
        createdAt: getAttr('createdAt') || '',
        context: payload.context || undefined,
        sessionKey: payload.sessionKey || undefined,
        txHash: txHashMap[entity.key],
      };
    })
    .filter((edge: TrustEdge) => {
      // Filter by minStrength if provided
      if (params?.minStrength !== undefined) {
        return edge.strength >= params.minStrength;
      }
      return true;
    });
}

export async function listTrustEdgesForWallet(wallet: string): Promise<TrustEdge[]> {
  // Get trust edges where wallet is either giving or receiving trust
  const [given, received] = await Promise.all([
    listTrustEdges({ fromWallet: wallet }),
    listTrustEdges({ toWallet: wallet }),
  ]);

  // Combine and deduplicate by key
  const edgeMap = new Map<string, TrustEdge>();
  [...given, ...received].forEach(edge => {
    edgeMap.set(edge.key, edge);
  });

  return Array.from(edgeMap.values());
}

export async function getTrustEdgeByKey(key: string): Promise<TrustEdge | null> {
  const publicClient = getPublicClient();
  const query = publicClient.buildQuery();
  const result = await query
    .where(eq('type', 'trust_edge'))
    .where(eq('key', key))
    .withAttributes(true)
    .withPayload(true)
    .limit(1)
    .fetch();

  if (result.entities.length === 0) return null;

  const entity = result.entities[0];
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

  // Get txHash
  const txHashResult = await publicClient.buildQuery()
    .where(eq('type', 'trust_edge_txhash'))
    .where(eq('trustEdgeKey', entity.key))
    .withAttributes(true)
    .withPayload(true)
    .limit(1)
    .fetch();

  let txHash: string | undefined;
  if (txHashResult.entities.length > 0) {
    try {
      const txHashEntity = txHashResult.entities[0];
      const txHashPayload = txHashEntity.payload instanceof Uint8Array
        ? new TextDecoder().decode(txHashEntity.payload)
        : typeof txHashEntity.payload === 'string'
        ? txHashEntity.payload
        : JSON.stringify(txHashEntity.payload);
      const decoded = JSON.parse(txHashPayload);
      txHash = decoded.txHash;
    } catch (e) {
      console.error('Error decoding txHash:', e);
    }
  }

  const strength = payload.strength !== undefined 
    ? payload.strength 
    : (getAttr('strength') ? parseInt(getAttr('strength'), 10) : 0);

  return {
    key: entity.key,
    fromWallet: getAttr('fromWallet') || '',
    toWallet: getAttr('toWallet') || '',
    strength,
    spaceId: getAttr('spaceId') || 'local-dev',
    createdAt: getAttr('createdAt') || '',
    context: payload.context || undefined,
    sessionKey: payload.sessionKey || undefined,
    txHash,
  };
}

