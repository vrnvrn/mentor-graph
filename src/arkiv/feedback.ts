import { eq } from "@arkiv-network/sdk/query"
import { getPublicClient, getWalletClientFromPrivateKey } from "./client"

export type Feedback = {
  key: string;
  sessionKey: string; // Reference to the session this feedback is for
  fromWallet: string; // Who is giving the feedback
  toWallet: string; // Who the feedback is about
  role: 'mentor' | 'learner'; // Role of the person giving feedback
  spaceId: string;
  createdAt: string;
  rating?: number; // 1-5 rating
  npsScore?: number; // Net Promoter Score (-100 to 100)
  text?: string; // Written feedback
  skills?: string[]; // Skills that were relevant to this session
  wouldRecommend?: boolean; // Would recommend this mentor/learner
  txHash?: string;
}

export async function createFeedback({
  sessionKey,
  fromWallet,
  toWallet,
  role,
  rating,
  npsScore,
  text,
  skills,
  wouldRecommend,
  privateKey,
}: {
  sessionKey: string;
  fromWallet: string;
  toWallet: string;
  role: 'mentor' | 'learner';
  rating?: number; // 1-5
  npsScore?: number; // -100 to 100
  text?: string;
  skills?: string[];
  wouldRecommend?: boolean;
  privateKey: `0x${string}`;
}): Promise<{ key: string; txHash: string }> {
  const walletClient = getWalletClientFromPrivateKey(privateKey);
  const enc = new TextEncoder();
  const spaceId = 'local-dev';
  const createdAt = new Date().toISOString();

  const payload = {
    rating: rating || undefined,
    npsScore: npsScore || undefined,
    text: text || '',
    skills: skills || [],
    wouldRecommend: wouldRecommend || undefined,
  };

  const { entityKey, txHash } = await walletClient.createEntity({
    payload: enc.encode(JSON.stringify(payload)),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: 'feedback' },
      { key: 'sessionKey', value: sessionKey },
      { key: 'fromWallet', value: fromWallet },
      { key: 'toWallet', value: toWallet },
      { key: 'role', value: role },
      { key: 'spaceId', value: spaceId },
      { key: 'createdAt', value: createdAt },
    ],
    expiresIn: 31536000, // 1 year (feedback is long-lived)
  });

  // Store txHash in a separate entity for verifiability
  await walletClient.createEntity({
    payload: enc.encode(JSON.stringify({
      txHash,
    })),
    contentType: 'application/json',
    attributes: [
      { key: 'type', value: 'feedback_txhash' },
      { key: 'feedbackKey', value: entityKey },
      { key: 'sessionKey', value: sessionKey },
      { key: 'fromWallet', value: fromWallet },
      { key: 'toWallet', value: toWallet },
      { key: 'spaceId', value: spaceId },
    ],
    expiresIn: 31536000,
  });

  return { key: entityKey, txHash };
}

export async function listFeedback(params?: { 
  sessionKey?: string;
  fromWallet?: string; 
  toWallet?: string; 
  role?: 'mentor' | 'learner';
  spaceId?: string;
}): Promise<Feedback[]> {
  const publicClient = getPublicClient();
  const query = publicClient.buildQuery();
  let queryBuilder = query.where(eq('type', 'feedback'));
  
  if (params?.spaceId) {
    queryBuilder = queryBuilder.where(eq('spaceId', params.spaceId));
  }
  if (params?.sessionKey) {
    queryBuilder = queryBuilder.where(eq('sessionKey', params.sessionKey));
  }
  if (params?.fromWallet) {
    queryBuilder = queryBuilder.where(eq('fromWallet', params.fromWallet));
  }
  if (params?.toWallet) {
    queryBuilder = queryBuilder.where(eq('toWallet', params.toWallet));
  }
  if (params?.role) {
    queryBuilder = queryBuilder.where(eq('role', params.role));
  }
  
  const [result, txHashResult] = await Promise.all([
    queryBuilder
      .withAttributes(true)
      .withPayload(true)
      .limit(100)
      .fetch(),
    publicClient.buildQuery()
      .where(eq('type', 'feedback_txhash'))
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
    const feedbackKey = getAttr('feedbackKey');
    if (feedbackKey) {
      try {
        const payload = entity.payload instanceof Uint8Array
          ? new TextDecoder().decode(entity.payload)
          : typeof entity.payload === 'string'
          ? entity.payload
          : JSON.stringify(entity.payload);
        const decoded = JSON.parse(payload);
        if (decoded.txHash) {
          txHashMap[feedbackKey] = decoded.txHash;
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
      sessionKey: getAttr('sessionKey') || '',
      fromWallet: getAttr('fromWallet') || '',
      toWallet: getAttr('toWallet') || '',
      role: (getAttr('role') || 'learner') as Feedback['role'],
      spaceId: getAttr('spaceId') || 'local-dev',
      createdAt: getAttr('createdAt') || '',
      rating: payload.rating || undefined,
      npsScore: payload.npsScore || undefined,
      text: payload.text || undefined,
      skills: payload.skills || undefined,
      wouldRecommend: payload.wouldRecommend || undefined,
      txHash: txHashMap[entity.key],
    };
  });
}

export async function listFeedbackForWallet(wallet: string): Promise<Feedback[]> {
  // Get feedback where wallet is either giving or receiving feedback
  const [given, received] = await Promise.all([
    listFeedback({ fromWallet: wallet }),
    listFeedback({ toWallet: wallet }),
  ]);

  // Combine and deduplicate by key
  const feedbackMap = new Map<string, Feedback>();
  [...given, ...received].forEach(feedback => {
    feedbackMap.set(feedback.key, feedback);
  });

  return Array.from(feedbackMap.values());
}

export async function listFeedbackForSession(sessionKey: string): Promise<Feedback[]> {
  return listFeedback({ sessionKey });
}

export async function getFeedbackByKey(key: string): Promise<Feedback | null> {
  const publicClient = getPublicClient();
  const query = publicClient.buildQuery();
  const result = await query
    .where(eq('type', 'feedback'))
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
    .where(eq('type', 'feedback_txhash'))
    .where(eq('feedbackKey', entity.key))
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
    sessionKey: getAttr('sessionKey') || '',
    fromWallet: getAttr('fromWallet') || '',
    toWallet: getAttr('toWallet') || '',
    role: (getAttr('role') || 'learner') as Feedback['role'],
    spaceId: getAttr('spaceId') || 'local-dev',
    createdAt: getAttr('createdAt') || '',
    rating: payload.rating || undefined,
    npsScore: payload.npsScore || undefined,
    text: payload.text || undefined,
    skills: payload.skills || undefined,
    wouldRecommend: payload.wouldRecommend || undefined,
    txHash,
  };
}

