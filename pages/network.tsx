import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type Ask = {
  key: string;
  wallet: string;
  skill: string;
  spaceId: string;
  createdAt: string;
  status: string;
  message: string;
  ttlSeconds: number;
  txHash?: string;
};

type Offer = {
  key: string;
  wallet: string;
  skill: string;
  spaceId: string;
  createdAt: string;
  status: string;
  message: string;
  availabilityWindow: string;
  ttlSeconds: number;
  txHash?: string;
};

type WebNode = {
  id: string;
  type: 'ask' | 'offer';
  skill: string;
  wallet: string;
  message: string;
  createdAt: string;
  ttlSeconds: number;
  spaceId: string;
  txHash?: string;
  x: number;
  y: number;
  relevance: number;
};

function formatTimeRemaining(createdAt: string, ttlSeconds: number): string {
  const created = new Date(createdAt).getTime();
  const expires = created + (ttlSeconds * 1000);
  const now = Date.now();
  const remaining = expires - now;

  if (remaining <= 0) {
    return '⏰ Expired';
  }

  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `⏰ ${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `⏰ ${minutes}m`;
  } else {
    return `⏰ <1m`;
  }
}

function shortenHash(hash: string): string {
  if (!hash || hash.length < 10) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function shortenWallet(wallet: string): string {
  if (!wallet || wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

export default function Network() {
  const router = useRouter();
  const [asks, setAsks] = useState<Ask[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillFilter, setSkillFilter] = useState('');
  const [currentFilterSkill, setCurrentFilterSkill] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'asks' | 'offers'>('all');
  const [nameSearchFilter, setNameSearchFilter] = useState<string>('');
  const [seniorityFilter, setSeniorityFilter] = useState<string>('');
  const [mentorRoleFilter, setMentorRoleFilter] = useState<string>('');
  const [learnerRoleFilter, setLearnerRoleFilter] = useState<string>('');
  const [minReputationFilter, setMinReputationFilter] = useState<string>('');
  const [minSessionsFilter, setMinSessionsFilter] = useState<string>('');
  const [minRatingFilter, setMinRatingFilter] = useState<string>('');
  const [maxRatingFilter, setMaxRatingFilter] = useState<string>('');
  const [ttlFilter, setTtlFilter] = useState<string>(''); // 'active' | 'expiring' | 'all'
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [userWallet, setUserWallet] = useState<string>('');
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [viewMode, setViewMode] = useState<'matches' | 'skills' | 'wallets' | 'all'>('all');
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [, setNow] = useState(Date.now());
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.json())
      .then(data => {
        if (data.profile?.skills) {
          setUserSkills(data.profile.skills.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean));
        }
        if (data.wallet) {
          setUserWallet(data.wallet);
        }
      })
      .catch(err => console.error('Error fetching user profile:', err));
  }, []);

  const fetchNetwork = async (filters?: {
    skill?: string;
    seniority?: string;
    nameSearch?: string;
    mentorRole?: string;
    learnerRole?: string;
    minReputation?: string;
    minSessions?: string;
    minRating?: string;
    maxRating?: string;
    ttl?: string;
  }) => {
    try {
      const params = new URLSearchParams();
      if (filters?.skill) params.append('skill', filters.skill);
      if (filters?.seniority) params.append('seniority', filters.seniority);
      
      const url = params.toString() ? `/api/network?${params.toString()}` : '/api/network';
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Error fetching /api/network:', res.status, errorData);
        return;
      }
      const data = await res.json();
      
      // Apply client-side filters
      let filteredAsks = data.asks || [];
      let filteredOffers = data.offers || [];
      let filteredProfiles = data.profiles || [];
      
      // TTL filter for asks/offers
      if (filters?.ttl === 'active') {
        const now = Date.now();
        filteredAsks = filteredAsks.filter((ask: Ask) => {
          const created = new Date(ask.createdAt).getTime();
          const expires = created + (ask.ttlSeconds * 1000);
          return expires > now;
        });
        filteredOffers = filteredOffers.filter((offer: Offer) => {
          const created = new Date(offer.createdAt).getTime();
          const expires = created + (offer.ttlSeconds * 1000);
          return expires > now;
        });
      } else if (filters?.ttl === 'expiring') {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        filteredAsks = filteredAsks.filter((ask: Ask) => {
          const created = new Date(ask.createdAt).getTime();
          const expires = created + (ask.ttlSeconds * 1000);
          const remaining = expires - now;
          return remaining > 0 && remaining < oneHour;
        });
        filteredOffers = filteredOffers.filter((offer: Offer) => {
          const created = new Date(offer.createdAt).getTime();
          const expires = created + (offer.ttlSeconds * 1000);
          const remaining = expires - now;
          return remaining > 0 && remaining < oneHour;
        });
      }
      
      // Profile filters (client-side)
      if (filters?.nameSearch) {
        const searchLower = filters.nameSearch.toLowerCase();
        filteredProfiles = filteredProfiles.filter((profile: any) => {
          const displayName = (profile.displayName || '').toLowerCase();
          const username = (profile.username || '').toLowerCase();
          return displayName.includes(searchLower) || username.includes(searchLower);
        });
        // Filter asks/offers to only show those from matching profiles
        const matchingWallets = new Set(filteredProfiles.map((p: any) => p.wallet.toLowerCase()));
        filteredAsks = filteredAsks.filter((ask: Ask) => matchingWallets.has(ask.wallet.toLowerCase()));
        filteredOffers = filteredOffers.filter((offer: Offer) => matchingWallets.has(offer.wallet.toLowerCase()));
      }
      
      if (filters?.mentorRole) {
        filteredProfiles = filteredProfiles.filter((profile: any) => {
          const mentorRoles = profile.mentorRoles || [];
          return mentorRoles.some((role: string) => 
            role.toLowerCase().includes(filters.mentorRole!.toLowerCase())
          );
        });
      }
      
      if (filters?.learnerRole) {
        filteredProfiles = filteredProfiles.filter((profile: any) => {
          const learnerRoles = profile.learnerRoles || [];
          return learnerRoles.some((role: string) => 
            role.toLowerCase().includes(filters.learnerRole!.toLowerCase())
          );
        });
      }
      
      if (filters?.minReputation) {
        const minRep = parseFloat(filters.minReputation);
        if (!isNaN(minRep)) {
          filteredProfiles = filteredProfiles.filter((profile: any) => {
            const repScore = profile.reputationScore || 0;
            return repScore >= minRep;
          });
        }
      }
      
      if (filters?.minSessions) {
        const minSess = parseInt(filters.minSessions, 10);
        if (!isNaN(minSess)) {
          filteredProfiles = filteredProfiles.filter((profile: any) => {
            const sessions = profile.sessionsCompleted || 0;
            return sessions >= minSess;
          });
        }
      }
      
      if (filters?.minRating || filters?.maxRating) {
        const minRating = filters.minRating ? parseFloat(filters.minRating) : 0;
        const maxRating = filters.maxRating ? parseFloat(filters.maxRating) : 5;
        filteredProfiles = filteredProfiles.filter((profile: any) => {
          const avgRating = profile.avgRating || 0;
          return avgRating >= minRating && avgRating <= maxRating;
        });
        // Filter asks/offers to only show those from matching profiles
        const matchingWallets = new Set(filteredProfiles.map((p: any) => p.wallet.toLowerCase()));
        filteredAsks = filteredAsks.filter((ask: Ask) => matchingWallets.has(ask.wallet.toLowerCase()));
        filteredOffers = filteredOffers.filter((offer: Offer) => matchingWallets.has(offer.wallet.toLowerCase()));
      }
      
      setAsks(filteredAsks);
      setOffers(filteredOffers);
      setProfiles(filteredProfiles);
      setCurrentFilterSkill(filters?.skill || '');
    } catch (err) {
      console.error('Error fetching /api/network:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNetwork();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set body background to match theme
  useEffect(() => {
    document.body.style.backgroundColor = darkMode ? '#1a1a1a' : '#f8f9fa';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
    };
  }, [darkMode]);

  useEffect(() => {
    console.log('[Network] Setting up SSE connection...');
    const source = new EventSource('/api/subscribe');

    source.onopen = () => {
      console.log('[Network] SSE connection opened');
    };

    source.onmessage = (event) => {
      console.log('[Network] SSE message received:', event.data);
      const { type, entity } = JSON.parse(event.data);

      if (type === 'ask') {
        setAsks((prev) => {
          if (currentFilterSkill) {
            const skillLower = currentFilterSkill.toLowerCase();
            const entitySkill = (entity.skill || '').toLowerCase();
            if (!entitySkill.includes(skillLower)) {
              return prev;
            }
          }
          return [entity, ...prev];
        });
      }

      if (type === 'offer') {
        setOffers((prev) => {
          if (currentFilterSkill) {
            const skillLower = currentFilterSkill.toLowerCase();
            const entitySkill = (entity.skill || '').toLowerCase();
            if (!entitySkill.includes(skillLower)) {
              return prev;
            }
          }
          return [entity, ...prev];
        });
      }
    };

    source.onerror = (err) => {
      console.error('[Network] SSE error:', err);
      console.error('[Network] SSE readyState:', source.readyState);
    };

    return () => source.close();
  }, [currentFilterSkill]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNetwork({
      skill: skillFilter || undefined,
      seniority: seniorityFilter || undefined,
      nameSearch: nameSearchFilter || undefined,
      mentorRole: mentorRoleFilter || undefined,
      learnerRole: learnerRoleFilter || undefined,
      minReputation: minReputationFilter || undefined,
      minSessions: minSessionsFilter || undefined,
      minRating: minRatingFilter || undefined,
      maxRating: maxRatingFilter || undefined,
      ttl: ttlFilter || undefined,
    });
  };

  // Compute relevance score for a node
  const computeRelevance = (node: { skill: string; createdAt: string; wallet: string }): number => {
    let score = 0;
    const skillLower = (node.skill || '').toLowerCase();
    
    // Skill matching (high weight)
    if (userSkills.some(us => skillLower.includes(us) || us.includes(skillLower))) {
      score += 100;
    }
    
    // Recency (newer = higher score)
    const age = Date.now() - new Date(node.createdAt).getTime();
    const hoursOld = age / (1000 * 60 * 60);
    score += Math.max(0, 50 - hoursOld * 2);
    
    // Not from own wallet
    if (node.wallet !== userWallet) {
      score += 10;
    }
    
    return score;
  };

  // Create web nodes with positions
  const createWebNodes = (): WebNode[] => {
    const allNodes: WebNode[] = [
      ...asks.map(a => ({
        id: a.key,
        type: 'ask' as const,
        skill: a.skill,
        wallet: a.wallet,
        message: a.message,
        createdAt: a.createdAt,
        ttlSeconds: a.ttlSeconds,
        spaceId: a.spaceId,
        txHash: a.txHash,
        x: 0,
        y: 0,
        relevance: 0,
      })),
      ...offers.map(o => ({
        id: o.key,
        type: 'offer' as const,
        skill: o.skill,
        wallet: o.wallet,
        message: o.message,
        createdAt: o.createdAt,
        ttlSeconds: o.ttlSeconds,
        spaceId: o.spaceId,
        txHash: o.txHash,
        x: 0,
        y: 0,
        relevance: 0,
      })),
    ];

    // Compute relevance
    allNodes.forEach(node => {
      node.relevance = computeRelevance(node);
    });

    // Sort by relevance (most relevant first)
    allNodes.sort((a, b) => b.relevance - a.relevance);

    // Position nodes: most relevant at top, spread horizontally
    const width = 1200;
    const height = 600;
    const cols = Math.ceil(Math.sqrt(allNodes.length));
    const spacingX = width / (cols + 1);
    const spacingY = height / 3;

    allNodes.forEach((node, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      
      // Top rows for most relevant
      if (row === 0) {
        node.y = 50 + (row * spacingY);
        node.x = spacingX * (col + 1);
      } else if (row === 1) {
        node.y = 150 + (row * spacingY * 0.6);
        node.x = spacingX * (col + 1);
      } else {
        node.y = 250 + (row * spacingY * 0.4);
        node.x = spacingX * (col + 1);
      }
    });

    return allNodes;
  };

  const webNodes = createWebNodes();
  const displayedNodes = typeFilter === 'all' 
    ? webNodes 
    : webNodes.filter(n => typeFilter === 'asks' ? n.type === 'ask' : n.type === 'offer');

  // Initialize node positions if not set
  useEffect(() => {
    if (displayedNodes.length > 0) {
      const initialPositions: Record<string, { x: number; y: number }> = {};
      displayedNodes.forEach(node => {
        if (!nodePositions[node.id]) {
          initialPositions[node.id] = { x: node.x, y: node.y };
        }
      });
      if (Object.keys(initialPositions).length > 0) {
        setNodePositions(prev => ({ ...prev, ...initialPositions }));
      }
    }
  }, [displayedNodes.map(n => n.id).join(',')]);

  // Get current position for a node
  const getNodePosition = (nodeId: string, defaultX: number, defaultY: number) => {
    if (nodePositions[nodeId]) {
      return nodePositions[nodeId];
    }
    return { x: defaultX, y: defaultY };
  };

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, nodeId: string, currentX: number, currentY: number) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = (e.currentTarget.closest('[data-container]') as HTMLElement)?.getBoundingClientRect();
    if (!containerRect) return;
    
    const offsetX = e.clientX - containerRect.left - currentX;
    const offsetY = e.clientY - containerRect.top - currentY;
    
    setDraggingNode(nodeId);
    setDragOffset({ x: offsetX, y: offsetY });
  };

  // Handle drag
  const handleDrag = (e: React.MouseEvent) => {
    if (!draggingNode || !dragOffset) return;
    
    const container = (e.currentTarget as HTMLElement).closest('[data-container]') as HTMLElement;
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const newX = e.clientX - containerRect.left - dragOffset.x;
    const newY = e.clientY - containerRect.top - dragOffset.y;
    
    // Constrain to container bounds
    const constrainedX = Math.max(80, Math.min(containerRect.width - 80, newX));
    const constrainedY = Math.max(80, Math.min(600, newY));
    
    setNodePositions(prev => ({
      ...prev,
      [draggingNode]: { x: constrainedX, y: constrainedY }
    }));
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggingNode(null);
    setDragOffset(null);
  };

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (draggingNode) {
      const handleMouseMove = (e: MouseEvent) => {
        const container = document.querySelector('[data-container]') as HTMLElement;
        if (!container || !dragOffset) return;
        
        const containerRect = container.getBoundingClientRect();
        const newX = e.clientX - containerRect.left - dragOffset.x;
        const newY = e.clientY - containerRect.top - dragOffset.y;
        
        const constrainedX = Math.max(80, Math.min(containerRect.width - 80, newX));
        const constrainedY = Math.max(80, Math.min(600, newY));
        
        setNodePositions(prev => ({
          ...prev,
          [draggingNode]: { x: constrainedX, y: constrainedY }
        }));
      };

      const handleMouseUp = () => {
        handleDragEnd();
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggingNode, dragOffset]);

  // Compute match score between an ask and offer (from spec)
  const computeMatchScore = (ask: WebNode, offer: WebNode): number => {
    // Must be ask + offer, different wallets, same spaceId
    if (ask.type === offer.type || ask.wallet === offer.wallet) return 0;
    if (ask.spaceId !== offer.spaceId) return 0;

    let score = 0;

    // 1. Skill fit (up to 0.5)
    const askSkill = ask.skill.toLowerCase();
    const offerSkill = offer.skill.toLowerCase();
    if (askSkill === offerSkill) {
      score += 0.5;
    } else if (askSkill.includes(offerSkill) || offerSkill.includes(askSkill)) {
      score += 0.3; // Fuzzy match
    }

    // 2. Time fit (up to 0.3) - TTL overlap
    const now = Date.now();
    const askCreated = new Date(ask.createdAt).getTime();
    const offerCreated = new Date(offer.createdAt).getTime();
    const askExpires = askCreated + (ask.ttlSeconds * 1000);
    const offerExpires = offerCreated + (offer.ttlSeconds * 1000);
    const askMinutesLeft = Math.max(0, (askExpires - now) / (1000 * 60));
    const offerMinutesLeft = Math.max(0, (offerExpires - now) / (1000 * 60));
    const overlap = Math.min(askMinutesLeft, offerMinutesLeft);
    // Map overlap to 0-0.3 (up to 60 minutes = 0.3)
    score += Math.min(0.3, (overlap / 60) * 0.3);

    // 3. Recency (up to 0.2) - posted around same time
    const ageDiffMinutes = Math.abs(askCreated - offerCreated) / (1000 * 60);
    if (ageDiffMinutes < 30) {
      score += 0.2;
    } else if (ageDiffMinutes < 120) {
      score += 0.1;
    }

    return Math.min(1, score);
  };

  // Compute Arkiv-based connections
  const computeConnections = () => {
    const connections: Array<{
      from: string;
      to: string;
      type: 'skill' | 'wallet' | 'match';
      fromPos: { x: number; y: number };
      toPos: { x: number; y: number };
      score?: number; // Match score for match edges
    }> = [];

    displayedNodes.forEach((node) => {
      const nodePos = getNodePosition(node.id, node.x, node.y);
      
      // Skill-based connections (same skill)
      displayedNodes.forEach((target) => {
        if (target.id === node.id) return;
        if (node.skill.toLowerCase() === target.skill.toLowerCase()) {
          const targetPos = getNodePosition(target.id, target.x, target.y);
          connections.push({
            from: node.id,
            to: target.id,
            type: 'skill',
            fromPos: nodePos,
            toPos: targetPos,
          });
        }
      });

      // Wallet-based connections (same wallet - entities from same contributor)
      // DISABLED: All entities are from same wallet, so this creates too much clutter
      // displayedNodes.forEach((target) => {
      //   if (target.id === node.id) return;
      //   if (node.wallet === target.wallet) {
      //     const targetPos = getNodePosition(target.id, target.x, target.y);
      //     connections.push({
      //       from: node.id,
      //       to: target.id,
      //       type: 'wallet',
      //       fromPos: nodePos,
      //       toPos: targetPos,
      //     });
      //   }
      // });

      // Match connections (ask + offer with match scoring)
      if (node.type === 'ask') {
        displayedNodes.forEach((target) => {
          if (target.type === 'offer' && node.wallet !== target.wallet) {
            const matchScore = computeMatchScore(node, target);
            if (matchScore > 0.2) { // Only show matches with score > 0.2
              const targetPos = getNodePosition(target.id, target.x, target.y);
              connections.push({
                from: node.id,
                to: target.id,
                type: 'match',
                fromPos: nodePos,
                toPos: targetPos,
                score: matchScore,
              });
            }
          }
        });
      }
    });

    // Deduplicate connections
    const seen = new Set<string>();
    return connections.filter(conn => {
      const key = conn.from < conn.to ? `${conn.from}-${conn.to}` : `${conn.to}-${conn.from}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const allConnections = computeConnections();
  
  // Filter connections by view mode
  const connections = allConnections.filter(conn => {
    if (viewMode === 'all') return true;
    if (viewMode === 'matches') return conn.type === 'match';
    if (viewMode === 'skills') return conn.type === 'skill';
    if (viewMode === 'wallets') return conn.type === 'wallet';
    return true;
  });
  
  // Filter connections by focus mode
  const filteredConnections = focusedNode 
    ? connections.filter(conn => conn.from === focusedNode || conn.to === focusedNode)
    : connections;
  
  // Determine node opacity based on focus
  const getNodeOpacity = (nodeId: string): number => {
    if (!focusedNode) return 1;
    if (nodeId === focusedNode) return 1;
    const isNeighbor = filteredConnections.some(conn => 
      (conn.from === focusedNode && conn.to === nodeId) || 
      (conn.to === focusedNode && conn.from === nodeId)
    );
    return isNeighbor ? 0.7 : 0.3;
  };

  // Compute summary stats
  const totalAsks = asks.length;
  const totalOffers = offers.length;
  const uniqueWallets = new Set([...asks.map(a => a.wallet), ...offers.map(o => o.wallet)]).size;

  // Compute skill counts
  const skillCounts: Record<string, { asks: number; offers: number }> = {};
  asks.forEach(ask => {
    const skill = ask.skill || 'Unknown';
    if (!skillCounts[skill]) {
      skillCounts[skill] = { asks: 0, offers: 0 };
    }
    skillCounts[skill].asks++;
  });
  offers.forEach(offer => {
    const skill = offer.skill || 'Unknown';
    if (!skillCounts[skill]) {
      skillCounts[skill] = { asks: 0, offers: 0 };
    }
    skillCounts[skill].offers++;
  });

  // Filter lists by type
  const displayedAsks = typeFilter === 'all' || typeFilter === 'asks' ? asks : [];
  const displayedOffers = typeFilter === 'all' || typeFilter === 'offers' ? offers : [];

  // Theme colors based on dark mode (needed for loading state)
  const theme = {
    bg: darkMode ? '#1a1a1a' : '#f8f9fa',
    cardBg: darkMode ? '#2d2d2d' : '#ffffff',
    text: darkMode ? '#e0e0e0' : '#212529',
    textSecondary: darkMode ? '#b0b0b0' : '#6c757d',
    textTertiary: darkMode ? '#888888' : '#868e96',
    border: darkMode ? '#404040' : '#dee2e6',
    borderLight: darkMode ? '#353535' : '#e9ecef',
    inputBg: darkMode ? '#353535' : '#ffffff',
    inputBorder: darkMode ? '#505050' : '#ced4da',
    hoverBg: darkMode ? '#3a3a3a' : '#f1f3f5',
    shadow: darkMode ? '0 2px 8px rgba(0, 0, 0, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.08)',
    shadowHover: darkMode ? '0 4px 12px rgba(0, 0, 0, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.1)',
  };

  if (loading) {
    return (
      <main style={{ 
        minHeight: '100vh',
        backgroundColor: theme.bg,
        transition: 'background-color 0.3s ease',
        width: '100%',
        margin: 0,
        padding: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: theme.textSecondary, fontSize: '16px' }}>Loading network data...</div>
      </main>
    );
  }

  return (
    <main style={{ 
      minHeight: '100vh',
      backgroundColor: theme.bg,
      transition: 'background-color 0.3s ease',
      width: '100%',
      margin: 0,
      padding: 0,
    }}>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: 'clamp(16px, 4vw, 32px) clamp(16px, 3vw, 24px)',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '32px',
          paddingBottom: '24px',
          borderBottom: `2px solid ${theme.borderLight}`
        }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '32px',
            fontWeight: '700',
            color: theme.text,
            letterSpacing: '-0.5px',
            transition: 'color 0.3s ease'
          }}>
            Network Analytics
          </h1>
          <p style={{ 
            margin: '8px 0 0 0',
            fontSize: '14px',
            color: theme.textSecondary,
            transition: 'color 0.3s ease'
          }}>
            Arkiv-powered mentorship network visualization
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: darkMode ? '#4a4a4a' : '#f0f0f0',
              color: darkMode ? '#ffffff' : '#495057',
              border: '1px solid ' + theme.border,
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = darkMode ? '#5a5a5a' : '#e0e0e0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = darkMode ? '#4a4a4a' : '#f0f0f0';
            }}
            title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: showAnalytics ? '#0066cc' : theme.cardBg,
              color: showAnalytics ? '#ffffff' : theme.text,
              border: `1px solid ${theme.border}`,
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: theme.shadow,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!showAnalytics) {
                e.currentTarget.style.backgroundColor = theme.hoverBg;
                e.currentTarget.style.borderColor = darkMode ? '#505050' : '#adb5bd';
              }
            }}
            onMouseLeave={(e) => {
              if (!showAnalytics) {
                e.currentTarget.style.backgroundColor = theme.cardBg;
                e.currentTarget.style.borderColor = theme.border;
              }
            }}
          >
            {showAnalytics ? 'Hide' : 'Show'} Analytics
          </button>
          <button
            onClick={() => router.push('/me')}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: '#6c757d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#5a6268';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#6c757d';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }}
          >
            ← My Dashboard
          </button>
        </div>
      </div>

      {/* Filters */}
      <section style={{ 
        marginBottom: '24px', 
        padding: '20px', 
        border: `1px solid ${theme.border}`, 
        borderRadius: '8px', 
        backgroundColor: theme.cardBg,
        boxShadow: theme.shadow,
        transition: 'all 0.3s ease'
      }}>
        <h3 style={{ 
          marginTop: 0, 
          marginBottom: '16px', 
          fontSize: '16px', 
          fontWeight: '600', 
          color: theme.text 
        }}>
          Filters
        </h3>
        <form onSubmit={handleApplyFilter}>
          {/* Row 1: Basic Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Skill</span>
              <input
                type="text"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                placeholder="e.g. solidity"
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
              />
            </label>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Name / Username</span>
              <input
                type="text"
                value={nameSearchFilter}
                onChange={(e) => setNameSearchFilter(e.target.value)}
                placeholder="Search by name or username"
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
              />
            </label>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Seniority</span>
              <select
                value={seniorityFilter}
                onChange={(e) => setSeniorityFilter(e.target.value)}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: `1px solid ${theme.inputBorder}`,
                  fontSize: '14px',
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
              >
                <option value="">All</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
              </select>
            </label>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Type</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'all' | 'asks' | 'offers')}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: `1px solid ${theme.inputBorder}`,
                  fontSize: '14px',
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
              >
                <option value="all">All</option>
                <option value="asks">Asks</option>
                <option value="offers">Offers</option>
              </select>
            </label>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Availability (TTL)</span>
              <select
                value={ttlFilter}
                onChange={(e) => setTtlFilter(e.target.value)}
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: `1px solid ${theme.inputBorder}`,
                  fontSize: '14px',
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="expiring">Expiring Soon (&lt;1h)</option>
              </select>
            </label>
          </div>
          
          {/* Row 2: Role & Reputation Filters */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Mentor Role</span>
              <input
                type="text"
                value={mentorRoleFilter}
                onChange={(e) => setMentorRoleFilter(e.target.value)}
                placeholder="e.g. technical mentor"
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
              />
            </label>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Learner Role</span>
              <input
                type="text"
                value={learnerRoleFilter}
                onChange={(e) => setLearnerRoleFilter(e.target.value)}
                placeholder="e.g. product manager"
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
              />
            </label>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Min Reputation Score</span>
              <input
                type="number"
                value={minReputationFilter}
                onChange={(e) => setMinReputationFilter(e.target.value)}
                placeholder="e.g. 50"
                min="0"
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
              />
            </label>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Min Sessions</span>
              <input
                type="number"
                value={minSessionsFilter}
                onChange={(e) => setMinSessionsFilter(e.target.value)}
                placeholder="e.g. 5"
                min="0"
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
              />
            </label>
          </div>
          
          {/* Row 3: Rating Range Filter */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Min Rating (1-5)</span>
              <input
                type="number"
                value={minRatingFilter}
                onChange={(e) => setMinRatingFilter(e.target.value)}
                placeholder="e.g. 3.0"
                min="0"
                max="5"
                step="0.1"
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
              />
            </label>
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Max Rating (1-5)</span>
              <input
                type="number"
                value={maxRatingFilter}
                onChange={(e) => setMaxRatingFilter(e.target.value)}
                placeholder="e.g. 5.0"
                min="0"
                max="5"
                step="0.1"
                style={{ 
                  padding: '8px 12px', 
                  borderRadius: '6px', 
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
              />
            </label>
          </div>
          
          {/* Submit Button */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button 
              type="submit" 
              style={{ 
                padding: '10px 24px', 
                backgroundColor: '#0066cc', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                boxShadow: '0 1px 3px rgba(0, 102, 204, 0.3)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0052a3';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 102, 204, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0066cc';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 102, 204, 0.3)';
              }}
            >
              Apply Filters
            </button>
            <button 
              type="button"
              onClick={() => {
                setSkillFilter('');
                setNameSearchFilter('');
                setSeniorityFilter('');
                setMentorRoleFilter('');
                setLearnerRoleFilter('');
                setMinReputationFilter('');
                setMinSessionsFilter('');
                setMinRatingFilter('');
                setMaxRatingFilter('');
                setTtlFilter('');
                setTypeFilter('all');
                fetchNetwork();
              }}
              style={{ 
                padding: '10px 24px', 
                backgroundColor: theme.hoverBg, 
                color: theme.text, 
                border: `1px solid ${theme.border}`, 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = darkMode ? '#4a4a4a' : '#e0e0e0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.hoverBg;
              }}
            >
              Clear All
            </button>
          </div>
        </form>
      </section>

      {/* Main Content: Web Visualization + Analytics Sidebar */}
      <div style={{ display: 'flex', gap: '24px', position: 'relative', marginBottom: '32px' }}>
        {/* Web Visualization */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ 
            border: `1px solid ${theme.border}`, 
            borderRadius: '12px', 
            backgroundColor: theme.cardBg,
            padding: '24px',
            minHeight: '640px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: theme.shadow,
            transition: 'all 0.3s ease'
          }}>
            <div style={{ 
              marginBottom: '16px',
              paddingBottom: '16px',
              borderBottom: `1px solid ${theme.borderLight}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ 
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: '600',
                  color: theme.text,
                  transition: 'color 0.3s ease'
                }}>
                  Network Web
                </h2>
                <p style={{ 
                  margin: '4px 0 0 0',
                  fontSize: '13px',
                  color: theme.textSecondary,
                  transition: 'color 0.3s ease'
                }}>
                  Drag nodes to explore • Click to focus • Blue: same skill • Purple: same wallet • Green: matches
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['all', 'matches', 'skills', 'wallets'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => {
                      setViewMode(mode);
                      if (mode !== 'all') setFocusedNode(null);
                    }}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '500',
                      borderRadius: '6px',
                      border: `1px solid ${viewMode === mode ? '#0066cc' : theme.border}`,
                      backgroundColor: viewMode === mode ? '#0066cc' : theme.hoverBg,
                      color: viewMode === mode ? 'white' : theme.text,
                      cursor: 'pointer',
                      textTransform: 'capitalize',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      if (viewMode !== mode) {
                        e.currentTarget.style.backgroundColor = darkMode ? '#404040' : '#e9ecef';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (viewMode !== mode) {
                        e.currentTarget.style.backgroundColor = theme.hoverBg;
                      }
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <svg 
              width="100%" 
              height="600" 
              style={{ 
                position: 'absolute', 
                top: '80px', 
                left: '24px', 
                pointerEvents: 'none',
                zIndex: 0
              }}
            >
              {/* Draw Arkiv-based connections */}
              {filteredConnections.map((conn, idx) => {
                let strokeColor = 'rgba(0, 102, 204, 0.15)';
                let strokeWidth = 1.5;
                let strokeDasharray = 'none';
                let opacity = 1;
                
                if (conn.type === 'match') {
                  // Potential mentorship matches (ask + offer) - use score for opacity/thickness
                  const score = conn.score || 0;
                  opacity = Math.max(0.2, score); // Opacity based on score
                  strokeWidth = 1 + (score * 2); // Thickness based on score (1-3px)
                  strokeColor = `rgba(76, 175, 80, ${opacity})`;
                  strokeDasharray = score > 0.7 ? 'none' : '5,5'; // Solid for high scores, dashed for low
                } else if (conn.type === 'wallet') {
                  // Same wallet (same contributor) - purple
                  strokeColor = 'rgba(156, 39, 176, 0.25)';
                  strokeWidth = 2;
                } else {
                  // Same skill - blue
                  strokeColor = 'rgba(0, 102, 204, 0.2)';
                  strokeWidth = 1.5;
                }
                
                // Dim edges not connected to focused node
                if (focusedNode && conn.from !== focusedNode && conn.to !== focusedNode) {
                  opacity = 0.1;
                }
                
                return (
                  <line
                    key={`${conn.from}-${conn.to}-${idx}`}
                    x1={conn.fromPos.x}
                    y1={conn.fromPos.y}
                    x2={conn.toPos.x}
                    y2={conn.toPos.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    opacity={opacity}
                  />
                );
              })}
            </svg>
            
            {/* Render nodes */}
            <div 
              data-container
              style={{ 
                position: 'relative', 
                width: '100%', 
                height: '600px', 
                marginTop: '16px',
                cursor: draggingNode ? 'grabbing' : 'default'
              }}
              onMouseDown={(e) => {
                // Only clear focus if clicking directly on container (not on a node)
                if (e.target === e.currentTarget) {
                  setFocusedNode(null);
                }
              }}
              onMouseMove={handleDrag}
              onMouseUp={handleDragEnd}
            >
              {displayedNodes.slice(0, 50).map((node) => {
                const nodePos = getNodePosition(node.id, node.x, node.y);
                const isDragging = draggingNode === node.id;
                const nodeOpacity = getNodeOpacity(node.id);
                const isFocused = focusedNode === node.id;
                
                return (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      left: `${nodePos.x}px`,
                      top: `${nodePos.y}px`,
                      transform: 'translate(-50%, -50%)',
                      width: '160px',
                      padding: '12px',
                      backgroundColor: darkMode 
                        ? (node.type === 'ask' ? '#3a2525' : '#253a25')
                        : (node.type === 'ask' ? '#fff5f5' : '#f0f9f4'),
                      border: `2px solid ${isFocused ? '#0066cc' : (node.type === 'ask' ? '#ef5350' : '#4caf50')}`,
                      borderRadius: '10px',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      boxShadow: isFocused 
                        ? (darkMode ? '0 0 20px rgba(0, 102, 204, 0.6)' : '0 0 20px rgba(0, 102, 204, 0.4)')
                        : isDragging 
                          ? (darkMode ? '0 8px 24px rgba(0,0,0,0.6)' : '0 8px 24px rgba(0,0,0,0.25)')
                          : (darkMode ? '0 2px 8px rgba(0,0,0,0.4)' : '0 2px 8px rgba(0,0,0,0.12)'),
                      fontSize: '12px',
                      transition: isDragging ? 'none' : 'all 0.2s ease',
                      zIndex: isFocused ? 50 : (isDragging ? 100 : 1),
                      userSelect: 'none',
                      opacity: nodeOpacity,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedNode(focusedNode === node.id ? null : node.id);
                    }}
                    onMouseDown={(e) => {
                      // Only start drag on right mouse button or if not clicking
                      if (e.button === 0) {
                        // Left click - allow both drag and focus
                        handleDragStart(e, node.id, nodePos.x, nodePos.y);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (!isDragging) {
                        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.08)';
                        e.currentTarget.style.boxShadow = darkMode 
                          ? '0 4px 16px rgba(0,0,0,0.5)' 
                          : '0 4px 16px rgba(0,0,0,0.2)';
                        e.currentTarget.style.zIndex = '10';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDragging) {
                        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                        e.currentTarget.style.boxShadow = darkMode 
                          ? '0 2px 8px rgba(0,0,0,0.4)' 
                          : '0 2px 8px rgba(0,0,0,0.12)';
                        e.currentTarget.style.zIndex = '1';
                      }
                    }}
                  >
                  <div style={{ 
                    fontWeight: '600', 
                    marginBottom: '6px', 
                    color: node.type === 'ask' ? '#d32f2f' : '#2e7d32',
                    fontSize: '13px'
                  }}>
                    {node.type === 'ask' ? '🔴 Ask' : '🟢 Offer'}
                  </div>
                  <div style={{ 
                    marginBottom: '4px', 
                    fontWeight: '500',
                    color: theme.text,
                    fontSize: '13px'
                  }}>
                    {node.skill || 'Unknown'}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: theme.textSecondary, 
                    marginBottom: '4px'
                  }}>
                    {shortenWallet(node.wallet)}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: theme.textTertiary, 
                    marginTop: '6px',
                    paddingTop: '6px',
                    borderTop: `1px solid ${theme.borderLight}`
                  }}>
                    {formatTimeRemaining(node.createdAt, node.ttlSeconds)}
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Analytics Sidebar */}
        {showAnalytics && (
          <div style={{ 
            width: '320px', 
            padding: '24px', 
            border: `1px solid ${theme.border}`, 
            borderRadius: '12px',
            backgroundColor: theme.cardBg,
            maxHeight: '640px',
            overflowY: 'auto',
            boxShadow: theme.shadow,
            transition: 'all 0.3s ease'
          }}>
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: '24px',
              fontSize: '20px',
              fontWeight: '600',
              color: theme.text,
              transition: 'color 0.3s ease'
            }}>
              Analytics
            </h2>
            
            {/* Summary Cards */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ 
                padding: '20px', 
                border: `1px solid ${theme.borderLight}`, 
                borderRadius: '8px', 
                marginBottom: '12px',
                backgroundColor: theme.hoverBg,
                transition: 'all 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = darkMode ? '#404040' : '#e9ecef';
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.boxShadow = theme.shadow;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.hoverBg;
                e.currentTarget.style.borderColor = theme.borderLight;
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#0066cc', marginBottom: '6px' }}>
                  {totalAsks}
                </div>
                <div style={{ color: theme.textSecondary, fontSize: '13px', fontWeight: '500' }}>Open Asks</div>
              </div>
              <div style={{ 
                padding: '20px', 
                border: `1px solid ${theme.borderLight}`, 
                borderRadius: '8px', 
                marginBottom: '12px',
                backgroundColor: theme.hoverBg,
                transition: 'all 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = darkMode ? '#404040' : '#e9ecef';
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.boxShadow = theme.shadow;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.hoverBg;
                e.currentTarget.style.borderColor = theme.borderLight;
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#0066cc', marginBottom: '6px' }}>
                  {totalOffers}
                </div>
                <div style={{ color: theme.textSecondary, fontSize: '13px', fontWeight: '500' }}>Active Offers</div>
              </div>
              <div style={{ 
                padding: '20px', 
                border: `1px solid ${theme.borderLight}`, 
                borderRadius: '8px',
                backgroundColor: theme.hoverBg,
                transition: 'all 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = darkMode ? '#404040' : '#e9ecef';
                e.currentTarget.style.borderColor = theme.border;
                e.currentTarget.style.boxShadow = theme.shadow;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = theme.hoverBg;
                e.currentTarget.style.borderColor = theme.borderLight;
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#0066cc', marginBottom: '6px' }}>
                  {uniqueWallets}
                </div>
                <div style={{ color: theme.textSecondary, fontSize: '13px', fontWeight: '500' }}>Contributors</div>
              </div>
            </div>

            {/* Skill Supply vs Demand */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                marginBottom: '16px',
                fontWeight: '600',
                color: theme.text,
                transition: 'color 0.3s ease'
              }}>
                Skill Supply vs Demand
              </h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto', fontSize: '13px' }}>
                {Object.entries(skillCounts)
                  .sort((a, b) => {
                    // Sort by bottleneck severity (demand - supply), then by total activity
                    const aCounts = a[1];
                    const bCounts = b[1];
                    const aImbalance = aCounts.asks - aCounts.offers;
                    const bImbalance = bCounts.asks - bCounts.offers;
                    if (Math.abs(aImbalance) !== Math.abs(bImbalance)) {
                      return Math.abs(bImbalance) - Math.abs(aImbalance);
                    }
                    const aTotal = aCounts.asks + aCounts.offers;
                    const bTotal = bCounts.asks + bCounts.offers;
                    return bTotal - aTotal;
                  })
                  .map(([skill, counts]) => {
                    const total = counts.asks + counts.offers;
                    const demandRatio = total > 0 ? counts.asks / total : 0;
                    const supplyRatio = total > 0 ? counts.offers / total : 0;
                    const imbalance = counts.asks - counts.offers;
                    const isBottleneck = imbalance > 0;
                    const isSurplus = imbalance < 0;
                    
                    return (
                      <div 
                        key={skill} 
                        style={{ 
                          marginBottom: '12px', 
                          padding: '14px', 
                          backgroundColor: theme.hoverBg, 
                          borderRadius: '8px',
                          border: `1px solid ${isBottleneck ? '#ef5350' : isSurplus ? '#4caf50' : theme.borderLight}`,
                          borderLeft: `4px solid ${isBottleneck ? '#ef5350' : isSurplus ? '#4caf50' : theme.border}`,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#404040' : '#e9ecef';
                          e.currentTarget.style.borderColor = theme.border;
                          e.currentTarget.style.boxShadow = theme.shadow;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = theme.hoverBg;
                          e.currentTarget.style.borderColor = isBottleneck ? '#ef5350' : isSurplus ? '#4caf50' : theme.borderLight;
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: '8px'
                        }}>
                          <div style={{ fontWeight: '600', color: theme.text, fontSize: '14px' }}>
                            {skill}
                          </div>
                          {isBottleneck && (
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: '600',
                              color: '#ef5350',
                              backgroundColor: darkMode ? '#4a2525' : '#ffebee',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              ⚠️ Bottleneck
                            </span>
                          )}
                          {isSurplus && (
                            <span style={{ 
                              fontSize: '11px', 
                              fontWeight: '600',
                              color: '#4caf50',
                              backgroundColor: darkMode ? '#1a3a1a' : '#e8f5e9',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}>
                              ✓ Surplus
                            </span>
                          )}
                        </div>
                        
                        {/* Visual bars */}
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ 
                            display: 'flex', 
                            gap: '4px',
                            marginBottom: '4px',
                            fontSize: '11px',
                            color: theme.textSecondary
                          }}>
                            <span style={{ flex: 1 }}>Demand (Asks)</span>
                            <span style={{ flex: 1, textAlign: 'right' }}>Supply (Offers)</span>
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            height: '20px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            border: `1px solid ${theme.borderLight}`
                          }}>
                            <div style={{ 
                              flex: demandRatio || 0.01,
                              backgroundColor: '#ef5350',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: '600',
                              minWidth: counts.asks > 0 ? '20px' : '0'
                            }}>
                              {counts.asks > 0 && counts.asks}
                            </div>
                            <div style={{ 
                              flex: supplyRatio || 0.01,
                              backgroundColor: '#4caf50',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#ffffff',
                              fontSize: '10px',
                              fontWeight: '600',
                              minWidth: counts.offers > 0 ? '20px' : '0'
                            }}>
                              {counts.offers > 0 && counts.offers}
                            </div>
                          </div>
                        </div>
                        
                        {/* Summary */}
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          fontSize: '12px',
                          color: theme.textSecondary
                        }}>
                          <span>
                            {counts.asks} ask{counts.asks !== 1 ? 's' : ''}
                          </span>
                          <span>
                            {counts.offers} offer{counts.offers !== 1 ? 's' : ''}
                          </span>
                          <span style={{ 
                            fontWeight: '600',
                            color: isBottleneck ? '#ef5350' : isSurplus ? '#4caf50' : theme.textSecondary
                          }}>
                            {Math.abs(imbalance)} {isBottleneck ? 'more needed' : isSurplus ? 'available' : 'balanced'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            {/* Top Skills (simplified) */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                marginBottom: '16px',
                fontWeight: '600',
                color: theme.text,
                transition: 'color 0.3s ease'
              }}>
                Top Skills
              </h3>
              <div style={{ fontSize: '13px' }}>
                {Object.entries(skillCounts)
                  .sort((a, b) => (b[1].asks + b[1].offers) - (a[1].asks + a[1].offers))
                  .slice(0, 5)
                  .map(([skill, counts]) => (
                    <div 
                      key={skill} 
                      style={{ 
                        marginBottom: '10px', 
                        padding: '12px', 
                        backgroundColor: theme.hoverBg, 
                        borderRadius: '6px',
                        border: `1px solid ${theme.borderLight}`,
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = darkMode ? '#404040' : '#e9ecef';
                        e.currentTarget.style.borderColor = theme.border;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.hoverBg;
                        e.currentTarget.style.borderColor = theme.borderLight;
                      }}
                    >
                      <div style={{ fontWeight: '500', marginBottom: '4px', color: theme.text }}>{skill}</div>
                      <div style={{ color: theme.textSecondary, fontSize: '12px' }}>
                        {counts.asks} asks, {counts.offers} offers
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Lists Below */}
      <div style={{ marginTop: '32px' }}>
        {displayedAsks.length > 0 && (
          <section style={{ 
            marginBottom: '32px', 
            padding: '28px', 
            border: `1px solid ${theme.border}`, 
            borderRadius: '12px',
            backgroundColor: theme.cardBg,
            boxShadow: theme.shadow,
            transition: 'all 0.3s ease'
          }}>
            <div style={{ 
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: `2px solid ${theme.borderLight}`
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: '22px',
                fontWeight: '600',
                color: theme.text,
                transition: 'color 0.3s ease'
              }}>
                Open Asks ({displayedAsks.length})
              </h2>
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              {displayedAsks.map((ask) => (
                <div 
                  key={ask.key} 
                  style={{ 
                    padding: '20px', 
                    border: `1px solid ${theme.borderLight}`, 
                    borderRadius: '8px', 
                    backgroundColor: darkMode ? '#3a2525' : '#fff5f5',
                    transition: 'all 0.2s ease',
                    borderLeft: '4px solid #ef5350'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = theme.shadowHover;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = theme.border;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = theme.borderLight;
                  }}
                >
                  <div style={{ 
                    marginBottom: '12px', 
                    paddingBottom: '12px', 
                    borderBottom: darkMode ? '1px solid #4a2a2a' : '1px solid #ffe0e0'
                  }}>
                    <strong style={{ 
                      color: '#d32f2f',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      🔴 Ask. {ask.skill || 'Unknown'}
                    </strong>
                  </div>
                  <div style={{ 
                    marginBottom: '8px', 
                    color: theme.text,
                    fontSize: '14px'
                  }}>
                    <strong style={{ color: theme.textSecondary }}>Wallet:</strong> {shortenWallet(ask.wallet)}
                  </div>
                  <div style={{ 
                    marginBottom: '8px', 
                    color: theme.text,
                    fontSize: '14px'
                  }}>
                    <strong style={{ color: theme.textSecondary }}>Message:</strong> {ask.message || 'N/A'}
                  </div>
                  <div style={{ 
                    marginBottom: '12px', 
                    fontSize: '13px', 
                    color: theme.textTertiary,
                    padding: '6px 10px',
                    backgroundColor: theme.cardBg,
                    borderRadius: '4px',
                    display: 'inline-block'
                  }}>
                    {formatTimeRemaining(ask.createdAt, ask.ttlSeconds)}
                  </div>
                  {ask.txHash && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: darkMode ? '1px solid #4a2a2a' : '1px solid #ffe0e0' }}>
                      <a
                        href={`https://explorer.mendoza.hoodi.arkiv.network/tx/${ask.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          color: '#0066cc',
                          textDecoration: 'none',
                          fontWeight: '500',
                          padding: '6px 12px',
                          backgroundColor: darkMode ? '#1a3a5a' : '#e7f3ff',
                          borderRadius: '6px',
                          border: `1px solid ${darkMode ? '#2a5a7a' : '#b3d9ff'}`,
                          transition: 'all 0.2s ease'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(ask.txHash!);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#2a5a7a' : '#d0e7ff';
                          e.currentTarget.style.borderColor = darkMode ? '#3a7a9a' : '#80c7ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#1a3a5a' : '#e7f3ff';
                          e.currentTarget.style.borderColor = darkMode ? '#2a5a7a' : '#b3d9ff';
                        }}
                        title="Click to open in explorer (copies hash to clipboard)">
                        View on Arkiv Explorer ↗
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {displayedOffers.length > 0 && (
          <section style={{ 
            marginBottom: '32px', 
            padding: '28px', 
            border: `1px solid ${theme.border}`, 
            borderRadius: '12px',
            backgroundColor: theme.cardBg,
            boxShadow: theme.shadow,
            transition: 'all 0.3s ease'
          }}>
            <div style={{ 
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: `2px solid ${theme.borderLight}`
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: '22px',
                fontWeight: '600',
                color: theme.text,
                transition: 'color 0.3s ease'
              }}>
                Active Offers ({displayedOffers.length})
              </h2>
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              {displayedOffers.map((offer) => (
                <div 
                  key={offer.key} 
                  style={{ 
                    padding: '20px', 
                    border: `1px solid ${theme.borderLight}`, 
                    borderRadius: '8px', 
                    backgroundColor: darkMode ? '#253a25' : '#f0f9f4',
                    transition: 'all 0.2s ease',
                    borderLeft: '4px solid #4caf50'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = theme.shadowHover;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = theme.border;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = theme.borderLight;
                  }}
                >
                  <div style={{ 
                    marginBottom: '12px', 
                    paddingBottom: '12px', 
                    borderBottom: darkMode ? '1px solid #2a4a2a' : '1px solid #d4edda'
                  }}>
                    <strong style={{ 
                      color: '#2e7d32',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      🟢 Offer. {offer.skill || 'Unknown'}
                    </strong>
                  </div>
                  <div style={{ 
                    marginBottom: '8px', 
                    color: theme.text,
                    fontSize: '14px'
                  }}>
                    <strong style={{ color: theme.textSecondary }}>Wallet:</strong> {shortenWallet(offer.wallet)}
                  </div>
                  <div style={{ 
                    marginBottom: '8px', 
                    color: theme.text,
                    fontSize: '14px'
                  }}>
                    <strong style={{ color: theme.textSecondary }}>Message:</strong> {offer.message || 'N/A'}
                  </div>
                  <div style={{ 
                    marginBottom: '8px', 
                    color: theme.text,
                    fontSize: '14px'
                  }}>
                    <strong style={{ color: theme.textSecondary }}>Availability:</strong> {offer.availabilityWindow || 'N/A'}
                  </div>
                  <div style={{ 
                    marginBottom: '12px', 
                    fontSize: '13px', 
                    color: theme.textTertiary,
                    padding: '6px 10px',
                    backgroundColor: theme.cardBg,
                    borderRadius: '4px',
                    display: 'inline-block'
                  }}>
                    {formatTimeRemaining(offer.createdAt, offer.ttlSeconds)}
                  </div>
                  {offer.txHash && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: darkMode ? '1px solid #2a4a2a' : '1px solid #d4edda' }}>
                      <a
                        href={`https://explorer.mendoza.hoodi.arkiv.network/tx/${offer.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          color: '#0066cc',
                          textDecoration: 'none',
                          fontWeight: '500',
                          padding: '6px 12px',
                          backgroundColor: darkMode ? '#1a3a5a' : '#e7f3ff',
                          borderRadius: '6px',
                          border: `1px solid ${darkMode ? '#2a5a7a' : '#b3d9ff'}`,
                          transition: 'all 0.2s ease'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(offer.txHash!);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#2a5a7a' : '#d0e7ff';
                          e.currentTarget.style.borderColor = darkMode ? '#3a7a9a' : '#80c7ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#1a3a5a' : '#e7f3ff';
                          e.currentTarget.style.borderColor = darkMode ? '#2a5a7a' : '#b3d9ff';
                        }}
                        title="Click to open in explorer (copies hash to clipboard)">
                        View on Arkiv Explorer ↗
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      </div>
    </main>
  );
}
