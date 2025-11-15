import { eq } from "@arkiv-network/sdk/query"
import { getPublicClient, getWalletClientFromPrivateKey } from "./client"

export type Session = {
  key: string;
  mentorWallet: string;
  learnerWallet: string;
  skill: string;
  spaceId: string;
  createdAt: string;
  sessionDate: string; // ISO timestamp when session is/was scheduled
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  duration?: number; // Duration in minutes
  notes?: string;
  feedbackKey?: string; // Reference to feedback entity
  txHash?: string;
}

export async function createSession({
  mentorWallet,
  learnerWallet,
  skill,
  sessionDate,
  duration,
  notes,
  privateKey,
}: {
  mentorWallet: string;
  learnerWallet: string;
  skill: string;
  sessionDate: string; // ISO timestamp
  duration?: number;
  notes?: string;
  privateKey: `0x${string}`;
}): Promise<{ key: string; txHash: string }> {
  const walletClient = getWalletClientFromPrivateKey(privateKey);
  const enc = new TextEncoder();
  const spaceId = 'local-dev';
  const status = 'scheduled';
  const createdAt = new Date().toISOString();

  const payload = {
    sessionDate,
    duration: duration || 60, // Default 60 minutes
    notes: notes || '',
  };

  const { entityKey, txHash } = await walletClient.createEntity({
    payload: enc.encode(JSON.stringify(payload)),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: 'session' },
      { key: 'mentorWallet', value: mentorWallet },
      { key: 'learnerWallet', value: learnerWallet },
      { key: 'skill', value: skill },
      { key: 'spaceId', value: spaceId },
      { key: 'createdAt', value: createdAt },
      { key: 'sessionDate', value: sessionDate },
      { key: 'status', value: status },
    ],
    expiresIn: 31536000, // 1 year (sessions are long-lived)
  });

  // Store txHash in a separate entity for verifiability
  await walletClient.createEntity({
    payload: enc.encode(JSON.stringify({
      txHash,
    })),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: 'session_txhash' },
      { key: 'sessionKey', value: entityKey },
      { key: 'mentorWallet', value: mentorWallet },
      { key: 'learnerWallet', value: learnerWallet },
      { key: 'spaceId', value: spaceId },
    ],
    expiresIn: 31536000,
  });

  return { key: entityKey, txHash };
}

export async function listSessions(params?: { 
  mentorWallet?: string; 
  learnerWallet?: string; 
  skill?: string; 
  status?: string;
  spaceId?: string;
}): Promise<Session[]> {
  const publicClient = getPublicClient();
  const query = publicClient.buildQuery();
  let queryBuilder = query.where(eq('type', 'session'));
  
  if (params?.spaceId) {
    queryBuilder = queryBuilder.where(eq('spaceId', params.spaceId));
  }
  if (params?.mentorWallet) {
    queryBuilder = queryBuilder.where(eq('mentorWallet', params.mentorWallet));
  }
  if (params?.learnerWallet) {
    queryBuilder = queryBuilder.where(eq('learnerWallet', params.learnerWallet));
  }
  if (params?.skill) {
    queryBuilder = queryBuilder.where(eq('skill', params.skill));
  }
  if (params?.status) {
    queryBuilder = queryBuilder.where(eq('status', params.status));
  }
  
  const [result, txHashResult] = await Promise.all([
    queryBuilder
      .withAttributes(true)
      .withPayload(true)
      .limit(100)
      .fetch(),
    publicClient.buildQuery()
      .where(eq('type', 'session_txhash'))
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
    const sessionKey = getAttr('sessionKey');
    if (sessionKey) {
      try {
        const payload = entity.payload instanceof Uint8Array
          ? new TextDecoder().decode(entity.payload)
          : typeof entity.payload === 'string'
          ? entity.payload
          : JSON.stringify(entity.payload);
        const decoded = JSON.parse(payload);
        if (decoded.txHash) {
          txHashMap[sessionKey] = decoded.txHash;
        }
      } catch (e) {
        console.error('Error decoding txHash payload:', e);
      }
    }
  });

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
    const getAttr = (key: string) => {
      if (Array.isArray(attrs)) {
        const attr = attrs.find((a: any) => a.key === key);
        return attr?.value || '';
      }
      return attrs[key] || '';
    };

    return {
      key: entity.key,
      mentorWallet: getAttr('mentorWallet') || '',
      learnerWallet: getAttr('learnerWallet') || '',
      skill: getAttr('skill') || '',
      spaceId: getAttr('spaceId') || 'local-dev',
      createdAt: getAttr('createdAt') || '',
      sessionDate: getAttr('sessionDate') || payload.sessionDate || '',
      status: (getAttr('status') || payload.status || 'scheduled') as Session['status'],
      duration: payload.duration || undefined,
      notes: payload.notes || undefined,
      feedbackKey: payload.feedbackKey || undefined,
      txHash: txHashMap[entity.key],
    };
  });
}

export async function listSessionsForWallet(wallet: string): Promise<Session[]> {
  // Get sessions where wallet is either mentor or learner
  const [asMentor, asLearner] = await Promise.all([
    listSessions({ mentorWallet: wallet }),
    listSessions({ learnerWallet: wallet }),
  ]);

  // Combine and deduplicate by key
  const sessionMap = new Map<string, Session>();
  [...asMentor, ...asLearner].forEach(session => {
    sessionMap.set(session.key, session);
  });

  return Array.from(sessionMap.values());
}

export async function getSessionByKey(key: string): Promise<Session | null> {
  const publicClient = getPublicClient();
  const query = publicClient.buildQuery();
  const result = await query
    .where(eq('type', 'session'))
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
    .where(eq('type', 'session_txhash'))
    .where(eq('sessionKey', entity.key))
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

  return {
    key: entity.key,
    mentorWallet: getAttr('mentorWallet') || '',
    learnerWallet: getAttr('learnerWallet') || '',
    skill: getAttr('skill') || '',
    spaceId: getAttr('spaceId') || 'local-dev',
    createdAt: getAttr('createdAt') || '',
    sessionDate: getAttr('sessionDate') || payload.sessionDate || '',
    status: (getAttr('status') || payload.status || 'scheduled') as Session['status'],
    duration: payload.duration || undefined,
    notes: payload.notes || undefined,
    feedbackKey: payload.feedbackKey || undefined,
    txHash,
  };
}

