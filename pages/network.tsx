import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { iconButtonStyle, compactButtonStyle } from '../src/utils/touchTargets';
import { useTouchFeedback, getPressedStyle } from '../src/hooks/useTouchFeedback';

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

type Session = {
  key: string;
  mentorWallet: string;
  learnerWallet: string;
  skill: string;
  spaceId: string;
  createdAt: string;
  sessionDate: string;
  status: 'pending' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  duration?: number;
  notes?: string;
  feedbackKey?: string;
  txHash?: string;
  mentorConfirmed?: boolean;
  learnerConfirmed?: boolean;
  // Jitsi video meeting fields
  videoProvider?: 'jitsi' | 'none' | 'custom';
  videoRoomName?: string;
  videoJoinUrl?: string;
  videoJwtToken?: string;
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

// Dark Mode Toggle Button Component with Touch Feedback
function DarkModeToggleButton({ darkMode, setDarkMode, theme }: { darkMode: boolean; setDarkMode: (value: boolean) => void; theme: any }) {
  const { pressed, handlers } = useTouchFeedback();
  const baseStyle: React.CSSProperties = {
    ...iconButtonStyle,
    fontSize: '18px',
    fontWeight: '500',
    backgroundColor: darkMode ? '#4a4a4a' : '#f0f0f0',
    color: darkMode ? '#ffffff' : '#495057',
    border: '1px solid ' + theme.border,
    borderRadius: '6px',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    transition: 'all 0.1s ease',
  };

  const pressedStyle: Partial<React.CSSProperties> = {
    backgroundColor: darkMode ? '#5a5a5a' : '#e0e0e0',
  };

  return (
    <button
      onClick={() => setDarkMode(!darkMode)}
      {...handlers}
      style={getPressedStyle(baseStyle, pressed, pressedStyle)}
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {darkMode ? '☀️' : '🌙'}
    </button>
  );
}

// Zoom Button Component with Touch Feedback
function ZoomButton({ onClick, label, title, theme }: { onClick: () => void; label: string; title: string; theme: any }) {
  const { pressed, handlers } = useTouchFeedback();
  const baseStyle: React.CSSProperties = {
    ...iconButtonStyle,
    fontSize: '18px',
    fontWeight: '600',
    backgroundColor: theme.hoverBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '4px',
    color: theme.text,
    cursor: 'pointer',
    transition: 'all 0.1s ease',
  };

  return (
    <button
      onClick={onClick}
      {...handlers}
      style={getPressedStyle(baseStyle, pressed)}
      title={title}
    >
      {label}
    </button>
  );
}

// Reset Button Component with Touch Feedback
function ResetButton({ onClick, theme }: { onClick: () => void; theme: any }) {
  const { pressed, handlers } = useTouchFeedback();
  const baseStyle: React.CSSProperties = {
    ...compactButtonStyle,
    fontSize: '12px',
    backgroundColor: theme.hoverBg,
    border: `1px solid ${theme.border}`,
    borderRadius: '4px',
    color: theme.text,
    cursor: 'pointer',
    marginTop: '4px',
    transition: 'all 0.1s ease',
  };

  return (
    <button
      onClick={onClick}
      {...handlers}
      style={getPressedStyle(baseStyle, pressed)}
      title="Reset view"
    >
      Reset
    </button>
  );
}

export default function Network() {
  const router = useRouter();
  const [asks, setAsks] = useState<Ask[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
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
  const [minNpsFilter, setMinNpsFilter] = useState<string>('');
  const [ttlFilter, setTtlFilter] = useState<string>(''); // 'active' | 'expiring' | 'all'
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [userWallet, setUserWallet] = useState<string>('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [requestMeetingModal, setRequestMeetingModal] = useState<{ open: boolean; profile: any | null }>({ open: false, profile: null });
  const [submittingMeeting, setSubmittingMeeting] = useState(false);
  // Initialize dark mode - use false for SSR, update in useEffect to avoid hydration mismatch
  const [darkMode, setDarkMode] = useState(false);
  
  // Set dark mode from localStorage after mount to avoid hydration mismatch
  const clampZoom = (value: number) => Math.max(0.5, Math.min(2, value));
  const getTouchDistance = (touch1: Touch | React.Touch, touch2: Touch | React.Touch) =>
    Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved === 'true') {
        setDarkMode(true);
      }
    }
  }, []);
  const [showFilters, setShowFilters] = useState(false);
  const [showProfiles, setShowProfiles] = useState(false);
  const [showMeetings, setShowMeetings] = useState(false);
  const [showAsks, setShowAsks] = useState(false);
  const [showOffers, setShowOffers] = useState(false);
  const [viewMode, setViewMode] = useState<'matches' | 'skills' | 'wallets' | 'all'>('all');
  const [focusedNode, setFocusedNode] = useState<string | null>(null);
  const [, setNow] = useState(Date.now());
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [panning, setPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [clickedNodeId, setClickedNodeId] = useState<string | null>(null);
  const [pinchStartDistance, setPinchStartDistance] = useState<number | null>(null);
  const [pinchStartZoom, setPinchStartZoom] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateViewport = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768);
      }
    };
    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    // Get connected wallet from localStorage (same as /me page)
    const connectedWallet = localStorage.getItem('connectedWallet');
    const walletToFetch = connectedWallet || undefined;
    
    // Build API URL with wallet query param if available
    const apiUrl = walletToFetch ? `/api/me?wallet=${encodeURIComponent(walletToFetch)}` : '/api/me';
    
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        if (data.profile?.skills) {
          setUserSkills(data.profile.skills.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean));
        }
        if (data.wallet) {
          setUserWallet(data.wallet);
        }
        if (data.profile) {
          setUserProfile(data.profile);
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
    minNps?: string;
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
      let allSessions = data.sessions || [];
      
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
      
      if (filters?.minNps) {
        const minNps = parseFloat(filters.minNps);
        if (!isNaN(minNps)) {
          filteredProfiles = filteredProfiles.filter((profile: any) => {
            const npsScore = profile.npsScore || 0;
            return npsScore >= minNps;
          });
          // Filter asks/offers to only show those from matching profiles
          const matchingWallets = new Set(filteredProfiles.map((p: any) => p.wallet.toLowerCase()));
          filteredAsks = filteredAsks.filter((ask: Ask) => matchingWallets.has(ask.wallet.toLowerCase()));
          filteredOffers = filteredOffers.filter((offer: Offer) => matchingWallets.has(offer.wallet.toLowerCase()));
        }
      }
      
      setAsks(filteredAsks);
      setOffers(filteredOffers);
      setProfiles(filteredProfiles);
      setSessions(allSessions);
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

  // Set body background to match theme and persist dark mode
  useEffect(() => {
    document.body.style.backgroundColor = darkMode ? '#1a1a1a' : '#f8f9fa';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    // Persist dark mode preference
    localStorage.setItem('darkMode', darkMode.toString());
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
      minNps: minNpsFilter || undefined,
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

  // Track if we've centered the view initially
  const [hasCenteredView, setHasCenteredView] = useState(false);

  // Initialize node positions if not set and center view on nodes
  useEffect(() => {
    if (displayedNodes.length > 0) {
      const initialPositions: Record<string, { x: number; y: number }> = {};
      let hasNewNodes = false;
      displayedNodes.forEach(node => {
        if (!nodePositions[node.id]) {
          initialPositions[node.id] = { x: node.x, y: node.y };
          hasNewNodes = true;
        }
      });
      if (hasNewNodes) {
        setNodePositions(prev => ({ ...prev, ...initialPositions }));
      }
      
      // Center view on nodes when first loaded (only once)
      if (!hasCenteredView && displayedNodes.length > 0) {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          const container = document.querySelector('[data-container]') as HTMLElement;
          if (container) {
            const allPositions = { ...nodePositions, ...initialPositions };
            const positions = displayedNodes.map(n => allPositions[n.id] || { x: n.x, y: n.y });
            
            if (positions.length > 0) {
              // Calculate bounding box of all nodes
              const minX = Math.min(...positions.map(p => p.x));
              const maxX = Math.max(...positions.map(p => p.x));
              const minY = Math.min(...positions.map(p => p.y));
              const maxY = Math.max(...positions.map(p => p.y));
              
              // Calculate center of nodes
              const centerX = (minX + maxX) / 2;
              const centerY = (minY + maxY) / 2;
              
              // Get actual container dimensions
              const containerRect = container.getBoundingClientRect();
              const containerWidth = containerRect.width;
              const containerHeight = containerRect.height;
              
              // Center the view on the nodes
              // We want the center of nodes to be at the center of the container
              setPanOffset({
                x: containerWidth / 2 - centerX,
                y: containerHeight / 2 - centerY
              });
              setHasCenteredView(true);
            }
          }
        }, 100);
      }
    }
  }, [displayedNodes.map(n => n.id).join(','), hasCenteredView, nodePositions]);

  // Get current position for a node
  const getNodePosition = (nodeId: string, defaultX: number, defaultY: number) => {
    if (nodePositions[nodeId]) {
      return nodePositions[nodeId];
    }
    return { x: defaultX, y: defaultY };
  };

  const updateDragFromPoint = (clientX: number, clientY: number, currentTarget?: HTMLElement | null) => {
    if (panning && panStart) {
      setPanOffset({
        x: clientX - panStart.x,
        y: clientY - panStart.y
      });
      return;
    }

    if (dragStartPos && clickedNodeId && !draggingNode) {
      const dx = clientX - dragStartPos.x;
      const dy = clientY - dragStartPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 5) {
        const container = currentTarget?.closest('[data-container]') as HTMLElement
          || document.querySelector('[data-container]') as HTMLElement;
        if (container && clickedNodeId) {
          const clickedNode = displayedNodes.find(node => node.id === clickedNodeId);
          if (clickedNode) {
            const nodePos = getNodePosition(clickedNode.id, clickedNode.x, clickedNode.y);
            const containerRect = container.getBoundingClientRect();

            const mouseX = dragStartPos.x - containerRect.left;
            const mouseY = dragStartPos.y - containerRect.top;
            const nodeCenterX = nodePos.x * zoom + panOffset.x;
            const nodeCenterY = nodePos.y * zoom + panOffset.y;

            setDragOffset({
              x: mouseX - nodeCenterX,
              y: mouseY - nodeCenterY,
            });
            setDraggingNode(clickedNodeId);
          }
        }
      }
    }

    if (!draggingNode || !dragOffset) return;

    const container = currentTarget?.closest('[data-container]') as HTMLElement
      || document.querySelector('[data-container]') as HTMLElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const mouseX = clientX - containerRect.left;
    const mouseY = clientY - containerRect.top;
    const newX = (mouseX - dragOffset.x - panOffset.x) / zoom;
    const newY = (mouseY - dragOffset.y - panOffset.y) / zoom;

    setNodePositions(prev => ({
      ...prev,
      [draggingNode]: { x: newX, y: newY },
    }));
  };

  // Handle pan start (on container background)
  const handlePanStart = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
      e.preventDefault();
      setPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  // Handle pan move
  const handlePanMove = (e: React.MouseEvent) => {
    if (panning && panStart) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  // Handle pan end
  const handlePanEnd = () => {
    setPanning(false);
    setPanStart(null);
  };

  // Handle drag start - only set up for potential drag, don't start dragging yet
  const handleDragStart = (e: React.MouseEvent, nodeId: string, currentX: number, currentY: number) => {
    e.stopPropagation(); // Prevent panning when clicking on nodes
    // Store the initial mouse position and node ID to detect if it's a drag or click
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setClickedNodeId(nodeId);
  };

  // Handle drag - check if mouse moved enough to start dragging
  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    updateDragFromPoint(e.clientX, e.clientY, e.currentTarget);
  };

  // Handle drag end
  const handleDragEnd = () => {
    if (panning) {
      handlePanEnd();
    } else {
      // If we were dragging, end the drag
      if (draggingNode) {
        setDraggingNode(null);
        setDragOffset(null);
      }
      // Always clear drag start position and clicked node
      setDragStartPos(null);
      setClickedNodeId(null);
    }
    setPinchStartDistance(null);
  };

  // Handle zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = clampZoom(zoom * delta);
    setZoom(newZoom);
  };

  const handleNodeTouchStart = (e: React.TouchEvent, nodeId: string) => {
    if (e.touches.length === 1) {
      e.stopPropagation();
      const touch = e.touches[0];
      setDragStartPos({ x: touch.clientX, y: touch.clientY });
      setClickedNodeId(nodeId);
    }
  };

  const handleTouchStartContainer = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      setPinchStartDistance(getTouchDistance(e.touches[0], e.touches[1]));
      setPinchStartZoom(zoom);
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
        setPanning(true);
        setPanStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
      }
    }
  };

  const handleTouchMoveContainer = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistance) {
      const distance = getTouchDistance(e.touches[0], e.touches[1]);
      const scale = distance / pinchStartDistance;
      setZoom(clampZoom(pinchStartZoom * scale));
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      updateDragFromPoint(touch.clientX, touch.clientY, e.currentTarget);
    }
  };

  const handleTouchEndContainer = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 0) {
      handleDragEnd();
      setPinchStartDistance(null);
    } else if (e.touches.length === 1) {
      setPinchStartDistance(null);
      setPinchStartZoom(zoom);
    }
  };

  // Add global mouse event listeners for dragging and panning
  useEffect(() => {
    if (draggingNode || panning || (dragStartPos && clickedNodeId)) {
      const handleMouseMove = (e: MouseEvent) => {
        if (panning && panStart) {
          setPanOffset({
            x: e.clientX - panStart.x,
            y: e.clientY - panStart.y
          });
          return;
        }
        
        // Check if we should start dragging (mouse moved enough)
        if (dragStartPos && clickedNodeId && !draggingNode) {
          const dx = e.clientX - dragStartPos.x;
          const dy = e.clientY - dragStartPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 5) {
            const container = document.querySelector('[data-container]') as HTMLElement;
            if (container && clickedNodeId) {
              const clickedNode = displayedNodes.find(node => node.id === clickedNodeId);
              if (clickedNode) {
                const nodePos = getNodePosition(clickedNode.id, clickedNode.x, clickedNode.y);
                const containerRect = container.getBoundingClientRect();
                
                // Calculate the offset from mouse to node center at drag start
                const mouseX = dragStartPos.x - containerRect.left;
                const mouseY = dragStartPos.y - containerRect.top;
                const nodeCenterX = nodePos.x * zoom + panOffset.x;
                const nodeCenterY = nodePos.y * zoom + panOffset.y;
                
                setDragOffset({ 
                  x: mouseX - nodeCenterX, 
                  y: mouseY - nodeCenterY 
                });
                setDraggingNode(clickedNodeId);
              }
            }
          }
        }
        
        if (draggingNode && dragOffset) {
          const container = document.querySelector('[data-container]') as HTMLElement;
          if (!container) return;
          
          const containerRect = container.getBoundingClientRect();
          const mouseX = e.clientX - containerRect.left;
          const mouseY = e.clientY - containerRect.top;
          const newX = (mouseX - dragOffset.x - panOffset.x) / zoom;
          const newY = (mouseY - dragOffset.y - panOffset.y) / zoom;
          
          setNodePositions(prev => ({
            ...prev,
            [draggingNode]: { x: newX, y: newY }
          }));
        }
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
  }, [draggingNode, dragOffset, dragStartPos, clickedNodeId, panning, panStart, panOffset, zoom, displayedNodes]);

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
    bg: darkMode ? '#0a0a0a' : '#f5f9f5',
    cardBg: darkMode ? 'rgba(26, 26, 26, 0.85)' : 'rgba(255, 255, 255, 0.9)',
    text: darkMode ? '#e0e0e0' : '#212529',
    textSecondary: darkMode ? '#b0b0b0' : '#6c757d',
    textTertiary: darkMode ? '#888888' : '#868e96',
    border: darkMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.15)',
    borderLight: darkMode ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.08)',
    inputBg: darkMode ? 'rgba(35, 35, 35, 0.8)' : 'rgba(255, 255, 255, 0.95)',
    inputBorder: darkMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)',
    hoverBg: darkMode ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)',
    shadow: darkMode 
      ? '0 4px 16px rgba(0, 0, 0, 0.4), 0 0 20px rgba(76, 175, 80, 0.1)' 
      : '0 4px 16px rgba(0, 0, 0, 0.08), 0 0 10px rgba(76, 175, 80, 0.05)',
    shadowHover: darkMode 
      ? '0 6px 24px rgba(0, 0, 0, 0.5), 0 0 30px rgba(76, 175, 80, 0.15)' 
      : '0 6px 24px rgba(0, 0, 0, 0.12), 0 0 15px rgba(76, 175, 80, 0.08)',
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

  // Bioluminescent forest background pattern
  const forestPattern = `data:image/svg+xml,${encodeURIComponent(`
    <svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow1" cx="50%" cy="50%">
          <stop offset="0%" stop-color="rgba(76, 175, 80, 0.3)" stop-opacity="1"/>
          <stop offset="100%" stop-color="rgba(76, 175, 80, 0)" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="glow2" cx="50%" cy="50%">
          <stop offset="0%" stop-color="rgba(139, 195, 74, 0.25)" stop-opacity="1"/>
          <stop offset="100%" stop-color="rgba(139, 195, 74, 0)" stop-opacity="0"/>
        </radialGradient>
        <pattern id="forest" x="0" y="0" width="300" height="300" patternUnits="userSpaceOnUse">
          <circle cx="80" cy="80" r="6" fill="url(#glow1)"/>
          <circle cx="220" cy="60" r="5" fill="url(#glow2)"/>
          <circle cx="150" cy="150" r="8" fill="url(#glow1)"/>
          <circle cx="50" cy="200" r="5" fill="url(#glow2)"/>
          <path d="M 80,80 Q 120,100 150,150" stroke="rgba(76, 175, 80, 0.12)" stroke-width="1" fill="none"/>
          <path d="M 220,60 Q 200,120 150,150" stroke="rgba(139, 195, 74, 0.1)" stroke-width="1" fill="none"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#forest)"/>
    </svg>
  `)}`;

  return (
    <main style={{ 
      minHeight: '100vh',
      backgroundColor: theme.bg,
      backgroundImage: `url("${forestPattern}")`,
      backgroundSize: darkMode ? '600px 600px' : '400px 400px',
      backgroundPosition: 'center',
      backgroundRepeat: 'repeat',
      transition: 'background-color 0.3s ease',
      width: '100%',
      margin: 0,
      padding: 0,
      position: 'relative',
    }}>
      {/* Subtle glowing overlay for dark mode */}
      {darkMode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 30%, rgba(76, 175, 80, 0.06) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(139, 195, 74, 0.04) 0%, transparent 50%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />
      )}
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
            fontSize: 'clamp(28px, 5vw, 36px)',
            fontWeight: '600',
            color: theme.text,
            letterSpacing: '-0.02em',
            transition: 'color 0.3s ease',
            textShadow: darkMode 
              ? '0 0 20px rgba(76, 175, 80, 0.2), 0 0 40px rgba(76, 175, 80, 0.1)' 
              : 'none',
          }}>
            🌲 Network Forest
          </h1>
          <p style={{ 
            margin: '8px 0 0 0',
            fontSize: '16px',
            color: theme.textSecondary,
            transition: 'color 0.3s ease',
            fontStyle: 'italic',
          }}>
            Arkiv-powered mentorship network visualization • Let knowledge and network light our way in the dark forest 🌱
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <DarkModeToggleButton darkMode={darkMode} setDarkMode={setDarkMode} theme={theme} />
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

      {/* Filters - Collapsible */}
      <section style={{ 
        marginBottom: '24px', 
        border: `1px solid ${theme.border}`, 
        borderRadius: '12px', 
        backgroundColor: theme.cardBg,
        boxShadow: theme.shadow,
        transition: 'all 0.3s ease',
        overflow: 'hidden'
      }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            width: '100%',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = theme.hoverBg;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🔍</span>
            <h3 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: '600', 
              color: theme.text 
            }}>
              Filters
            </h3>
          </div>
          <span style={{ 
            fontSize: '20px',
            transform: showFilters ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }}>
            ▼
          </span>
        </button>
        {showFilters && (
          <div style={{ padding: '0 20px 20px 20px' }}>
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
            
            <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Min NPS Score (0-10)</span>
              <input
                type="number"
                value={minNpsFilter}
                onChange={(e) => setMinNpsFilter(e.target.value)}
                placeholder="e.g. 7"
                min="0"
                max="10"
                step="1"
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
                setMinNpsFilter('');
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
          </div>
        )}
      </section>

      {/* Main Content: Web Visualization + Analytics Sidebar */}
      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? '16px' : '24px', 
        position: 'relative', 
        marginBottom: isMobile ? '24px' : '32px' 
      }}>
        {/* Web Visualization */}
        <div style={{ flex: 1, position: 'relative', width: '100%' }}>
          <div style={{ 
            border: `1px solid ${darkMode ? 'rgba(76, 175, 80, 0.3)' : 'rgba(76, 175, 80, 0.2)'}`, 
            borderRadius: '12px', 
            backgroundColor: darkMode ? '#0a0a0a' : '#1a1a1a',
            padding: isMobile ? '16px' : '24px',
            minHeight: isMobile ? '480px' : '640px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: darkMode ? '0 0 30px rgba(76, 175, 80, 0.2), inset 0 0 60px rgba(76, 175, 80, 0.05)' : '0 0 20px rgba(76, 175, 80, 0.15)',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ 
              marginBottom: isMobile ? '12px' : '16px',
              paddingBottom: isMobile ? '12px' : '16px',
              borderBottom: `1px solid ${darkMode ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.15)'}`,
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              justifyContent: isMobile ? 'flex-start' : 'space-between',
              alignItems: isMobile ? 'flex-start' : 'center',
              gap: isMobile ? '12px' : '0'
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
                  Drag background to pan • Scroll to zoom • Drag nodes to explore • Click to focus • Blue: same skill • Purple: same wallet • Green: matches
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
                      ...compactButtonStyle,
                      fontSize: '13px',
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
              height={isMobile ? 480 : 600} 
              style={{ 
                position: 'absolute', 
                top: isMobile ? '72px' : '80px', 
                left: isMobile ? '16px' : '24px', 
                pointerEvents: 'none',
                zIndex: 0
              }}
            >
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              {/* Draw Arkiv-based connections */}
              {filteredConnections.map((conn, idx) => {
                let strokeColor = 'rgba(0, 102, 204, 0.15)';
                let strokeWidth = 1.5;
                let strokeDasharray = 'none';
                let opacity = 1;
                
                if (conn.type === 'match') {
                  // Potential mentorship matches (ask + offer) - use score for opacity/thickness
                  const score = conn.score || 0;
                  opacity = Math.max(0.3, score); // Opacity based on score
                  strokeWidth = 1.5 + (score * 2); // Thickness based on score (1.5-3.5px)
                  strokeColor = `rgba(76, 175, 80, ${Math.min(0.8, opacity + 0.2)})`;
                  strokeDasharray = score > 0.7 ? 'none' : '5,5'; // Solid for high scores, dashed for low
                } else if (conn.type === 'wallet') {
                  // Same wallet (same contributor) - green
                  strokeColor = 'rgba(76, 175, 80, 0.3)';
                  strokeWidth = 1.5;
                  strokeDasharray = '3,3';
                } else {
                  // Same skill - green
                  strokeColor = 'rgba(76, 175, 80, 0.4)';
                  strokeWidth = 1.5;
                  strokeDasharray = '5,5';
                }
                
                // Dim edges not connected to focused node
                if (focusedNode && conn.from !== focusedNode && conn.to !== focusedNode) {
                  opacity = 0.1;
                }
                
                // Apply pan and zoom to connection coordinates
                const fromX = conn.fromPos.x * zoom + panOffset.x;
                const fromY = conn.fromPos.y * zoom + panOffset.y;
                const toX = conn.toPos.x * zoom + panOffset.x;
                const toY = conn.toPos.y * zoom + panOffset.y;
                
                return (
                  <line
                    key={`${conn.from}-${conn.to}-${idx}`}
                    x1={fromX}
                    y1={fromY}
                    x2={toX}
                    y2={toY}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeDasharray={strokeDasharray}
                    opacity={opacity}
                    filter={conn.type === 'match' ? 'url(#glow)' : 'none'}
                  />
                );
              })}
            </svg>
            
            {/* Zoom Controls */}
            <div style={{
              position: 'absolute',
              top: isMobile ? '78px' : '90px',
              right: isMobile ? '12px' : '24px',
              zIndex: 100,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              backgroundColor: theme.cardBg,
              padding: '8px',
              borderRadius: '8px',
              border: `1px solid ${theme.border}`,
              boxShadow: theme.shadow
            }}>
              <ZoomButton
                onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
                label="+"
                title="Zoom in"
                theme={theme}
              />
              <div style={{
                padding: '4px 8px',
                fontSize: '12px',
                textAlign: 'center',
                color: theme.textSecondary
              }}>
                {Math.round(zoom * 100)}%
              </div>
              <ZoomButton
                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                label="−"
                title="Zoom out"
                theme={theme}
              />
              <ResetButton
                onClick={() => {
                  setPanOffset({ x: 0, y: 0 });
                  setZoom(1);
                }}
                theme={theme}
              />
            </div>

            {/* Render nodes */}
            <div 
              data-container
              style={{ 
                position: 'relative', 
                width: '100%', 
                height: isMobile ? '480px' : '600px', 
                marginTop: isMobile ? '12px' : '16px',
                cursor: panning ? 'grabbing' : (draggingNode ? 'grabbing' : 'grab'),
                overflow: 'hidden',
                touchAction: 'none'
              }}
              onMouseDown={(e) => {
                // Start panning if clicking on container background
                if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'svg') {
                  handlePanStart(e);
                } else {
                  // Only clear focus if clicking directly on container (not on a node)
                  if (e.target === e.currentTarget) {
                    setFocusedNode(null);
                  }
                }
              }}
              onMouseMove={handleDrag}
              onMouseUp={handleDragEnd}
              onWheel={handleWheel}
              onTouchStart={handleTouchStartContainer}
              onTouchMove={handleTouchMoveContainer}
              onTouchEnd={handleTouchEndContainer}
            >
              {displayedNodes.slice(0, 50).map((node) => {
                const nodePos = getNodePosition(node.id, node.x, node.y);
                const isDragging = draggingNode === node.id;
                const nodeOpacity = getNodeOpacity(node.id);
                const isFocused = focusedNode === node.id;
                
                // Apply pan and zoom transforms
                const transformedX = nodePos.x * zoom + panOffset.x;
                const transformedY = nodePos.y * zoom + panOffset.y;
                
                return (
                  <div
                    key={node.id}
                    style={{
                      position: 'absolute',
                      left: `${transformedX}px`,
                      top: `${transformedY}px`,
                      transform: `translate(-50%, -50%) scale(${zoom})`,
                      width: isMobile ? '96px' : '120px',
                      height: isMobile ? '96px' : '120px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: node.type === 'ask' 
                        ? 'radial-gradient(circle, rgba(239, 83, 80, 0.3) 0%, rgba(186, 28, 28, 0.2) 100%)'
                        : 'radial-gradient(circle, rgba(76, 175, 80, 0.4) 0%, rgba(46, 125, 50, 0.3) 100%)',
                      border: `3px solid ${isFocused ? 'rgba(76, 175, 80, 1)' : (node.type === 'ask' ? 'rgba(239, 83, 80, 0.6)' : 'rgba(76, 175, 80, 0.8)')}`,
                      borderRadius: '50%',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      boxShadow: isFocused 
                        ? '0 0 30px rgba(76, 175, 80, 0.8), 0 0 60px rgba(76, 175, 80, 0.4), inset 0 0 20px rgba(76, 175, 80, 0.2)'
                        : isDragging 
                          ? '0 0 25px rgba(76, 175, 80, 0.6), 0 0 50px rgba(76, 175, 80, 0.3)'
                          : '0 0 15px rgba(76, 175, 80, 0.5), 0 0 30px rgba(76, 175, 80, 0.2), inset 0 0 15px rgba(76, 175, 80, 0.1)',
                      fontSize: '12px',
                      transition: isDragging ? 'none' : 'all 0.3s ease',
                      zIndex: isFocused ? 50 : (isDragging ? 100 : 1),
                      userSelect: 'none',
                      opacity: nodeOpacity,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      // Only focus if we didn't drag (dragStartPos will be null if it was just a click)
                      if (!draggingNode && dragStartPos) {
                        // Check if mouse moved - if not, it's a click
                        const dx = e.clientX - (dragStartPos?.x || 0);
                        const dy = e.clientY - (dragStartPos?.y || 0);
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        if (distance < 5) {
                          setFocusedNode(focusedNode === node.id ? null : node.id);
                        }
                      } else if (!draggingNode) {
                        setFocusedNode(focusedNode === node.id ? null : node.id);
                      }
                    }}
                    onMouseDown={(e) => {
                      if (e.button === 0) {
                        // Left click - prepare for potential drag
                        handleDragStart(e, node.id, nodePos.x, nodePos.y);
                      }
                    }}
                    onTouchStart={(e) => handleNodeTouchStart(e, node.id)}
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
                    fontSize: '20px',
                    marginBottom: '4px',
                    filter: 'drop-shadow(0 0 4px rgba(76, 175, 80, 0.8))'
                  }}>
                    🌱
                  </div>
                  <div style={{ 
                    fontWeight: '600', 
                    marginBottom: '4px', 
                    color: '#ffffff',
                    fontSize: '13px',
                    textAlign: 'center',
                    textShadow: '0 0 8px rgba(76, 175, 80, 0.8)'
                  }}>
                    {node.skill || (node.type === 'ask' ? 'Ask' : 'Offer')}
                  </div>
                  <div style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '10px',
                    marginTop: '2px',
                    textAlign: 'center',
                    fontFamily: 'monospace'
                  }}>
                    {shortenWallet(node.wallet)}
                  </div>
                  <div style={{
                    color: 'rgba(76, 175, 80, 0.9)',
                    fontSize: '10px',
                    marginTop: '4px',
                    textAlign: 'center',
                    fontWeight: '500',
                    textShadow: '0 0 4px rgba(76, 175, 80, 0.6)'
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
            width: isMobile ? '100%' : '320px', 
            padding: isMobile ? '16px' : '24px', 
            border: `1px solid ${theme.border}`, 
            borderRadius: '12px',
            backgroundColor: theme.cardBg,
            maxHeight: isMobile ? '100%' : '640px',
            overflowY: isMobile ? 'visible' : 'auto',
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

      {/* Profile Matches Section - Collapsible */}
      {profiles.length > 0 && (
        <section style={{ 
          marginBottom: '24px', 
          border: `1px solid ${theme.border}`, 
          borderRadius: '12px',
          backgroundColor: theme.cardBg,
          boxShadow: theme.shadow,
          transition: 'all 0.3s ease',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => setShowProfiles(!showProfiles)}
            style={{
              width: '100%',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.hoverBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>👤</span>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ 
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  color: theme.text,
                  transition: 'color 0.3s ease'
                }}>
                  Profile Matches
                </h2>
                <p style={{ 
                  margin: '4px 0 0 0',
                  fontSize: '12px',
                  color: theme.textSecondary,
                  transition: 'color 0.3s ease'
                }}>
                  Skills, reputation, and availability
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#0066cc',
                backgroundColor: darkMode ? '#1a3a5a' : '#e7f3ff',
                padding: '6px 12px',
                borderRadius: '20px',
                minWidth: '40px',
                textAlign: 'center'
              }}>
                {(() => {
                  // Count unique wallets
                  const uniqueWallets = new Set(profiles.map(p => p.wallet?.toLowerCase()).filter(Boolean));
                  return uniqueWallets.size;
                })()}
              </span>
              <span style={{ 
                fontSize: '20px',
                transform: showProfiles ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }}>
                ▼
              </span>
            </div>
          </button>
          {showProfiles && (
            <div style={{ padding: '0 20px 20px 20px' }}>
              <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {(() => {
              // Deduplicate profiles by wallet address, keeping only the most recent one
              const profileMap = new Map<string, any>();
              profiles.forEach((profile) => {
                const wallet = profile.wallet?.toLowerCase() || '';
                if (!wallet) return;
                
                const existing = profileMap.get(wallet);
                if (!existing) {
                  profileMap.set(wallet, profile);
                } else {
                  // Keep the one with the most recent createdAt
                  const existingTime = existing.createdAt ? new Date(existing.createdAt).getTime() : 0;
                  const currentTime = profile.createdAt ? new Date(profile.createdAt).getTime() : 0;
                  if (currentTime > existingTime) {
                    profileMap.set(wallet, profile);
                  }
                }
              });
              
              const uniqueProfiles = Array.from(profileMap.values());
              
              return uniqueProfiles.map((profile) => {
                const isMe = userWallet && profile.wallet?.toLowerCase() === userWallet.toLowerCase();
                
                // Compute match score based on skill overlap with user (only if not "me")
                const profileSkills = profile.skillsArray || (profile.skills ? profile.skills.split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean) : []);
                const skillOverlap = !isMe && userSkills.length > 0 
                  ? profileSkills.filter((ps: string) => userSkills.some((us: string) => ps.includes(us) || us.includes(ps))).length
                  : 0;
                const matchScore = !isMe && userSkills.length > 0 
                  ? Math.min(100, (skillOverlap / Math.max(userSkills.length, profileSkills.length)) * 100)
                  : 0;
              
              return (
                <div 
                  key={profile.key} 
                  style={{ 
                    padding: '20px', 
                    border: `1px solid ${theme.borderLight}`, 
                    borderRadius: '8px', 
                    backgroundColor: theme.hoverBg,
                    transition: 'all 0.2s ease',
                    borderLeft: `4px solid ${isMe ? '#0066cc' : matchScore > 50 ? '#4caf50' : matchScore > 25 ? '#ffa500' : theme.border}`
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
                    borderBottom: `1px solid ${theme.borderLight}`
                  }}>
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '8px'
                    }}>
                      <strong style={{ 
                        color: theme.text,
                        fontSize: '16px',
                        fontWeight: '600'
                      }}>
                        👤 {profile.displayName || 'Unknown'}
                      </strong>
                      {isMe ? (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: '#0066cc',
                          backgroundColor: darkMode ? '#1a3a5a' : '#e7f3ff',
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}>
                          me
                        </span>
                      ) : matchScore > 0 && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: '600',
                          color: matchScore > 50 ? '#4caf50' : matchScore > 25 ? '#ffa500' : theme.textSecondary,
                          backgroundColor: matchScore > 50 ? (darkMode ? '#1a3a1a' : '#e8f5e9') : matchScore > 25 ? (darkMode ? '#3a2a1a' : '#fff3e0') : theme.hoverBg,
                          padding: '4px 8px',
                          borderRadius: '4px'
                        }}>
                          {Math.round(matchScore)}% match
                        </span>
                      )}
                    </div>
                    {profile.username && (
                      <div style={{ 
                        fontSize: '13px', 
                        color: theme.textSecondary,
                        marginBottom: '4px'
                      }}>
                        @{profile.username}
                      </div>
                    )}
                    <div style={{ 
                      fontSize: '12px', 
                      color: theme.textTertiary,
                      fontFamily: 'monospace'
                    }}>
                      {shortenWallet(profile.wallet)}
                    </div>
                  </div>
                  
                  {profile.bioShort && (
                    <div style={{ 
                      marginBottom: '12px', 
                      color: theme.text,
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>
                      {profile.bioShort}
                    </div>
                  )}
                  
                  {profileSkills.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ 
                        fontSize: '12px', 
                        color: theme.textSecondary,
                        marginBottom: '6px',
                        fontWeight: '500'
                      }}>
                        Skills:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {profileSkills.slice(0, 5).map((skill: string, idx: number) => {
                          const isMatch = userSkills.some((us: string) => skill.toLowerCase().includes(us) || us.includes(skill.toLowerCase()));
                          return (
                            <span
                              key={idx}
                              style={{
                                fontSize: '11px',
                                padding: '4px 8px',
                                backgroundColor: isMatch ? (darkMode ? '#1a3a1a' : '#e8f5e9') : theme.cardBg,
                                color: isMatch ? '#4caf50' : theme.text,
                                borderRadius: '4px',
                                border: `1px solid ${isMatch ? '#4caf50' : theme.borderLight}`,
                                fontWeight: isMatch ? '600' : 'normal'
                              }}
                            >
                              {skill}
                            </span>
                          );
                        })}
                        {profileSkills.length > 5 && (
                          <span style={{
                            fontSize: '11px',
                            color: theme.textSecondary
                          }}>
                            +{profileSkills.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ 
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    marginBottom: '12px',
                    fontSize: '12px',
                    color: theme.textSecondary
                  }}>
                    {profile.seniority && (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: theme.cardBg,
                        borderRadius: '4px',
                        border: `1px solid ${theme.borderLight}`
                      }}>
                        {profile.seniority}
                      </span>
                    )}
                    {profile.reputationScore !== undefined && (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: theme.cardBg,
                        borderRadius: '4px',
                        border: `1px solid ${theme.borderLight}`
                      }}>
                        Rep: {profile.reputationScore}
                      </span>
                    )}
                    {profile.sessionsCompleted !== undefined && (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: theme.cardBg,
                        borderRadius: '4px',
                        border: `1px solid ${theme.borderLight}`
                      }}>
                        {profile.sessionsCompleted} sessions
                      </span>
                    )}
                    {profile.avgRating !== undefined && profile.avgRating > 0 && (
                      <span style={{
                        padding: '4px 8px',
                        backgroundColor: theme.cardBg,
                        borderRadius: '4px',
                        border: `1px solid ${theme.borderLight}`
                      }}>
                        ⭐ {profile.avgRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                  
                  {profile.mentorRoles && profile.mentorRoles.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ 
                        fontSize: '11px', 
                        color: theme.textSecondary,
                        marginBottom: '4px'
                      }}>
                        Mentor Roles:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {profile.mentorRoles.slice(0, 3).map((role: string, idx: number) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '10px',
                              padding: '3px 6px',
                              backgroundColor: darkMode ? '#2a3a2a' : '#e8f5e9',
                              color: '#4caf50',
                              borderRadius: '3px'
                            }}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {profile.learnerRoles && profile.learnerRoles.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ 
                        fontSize: '11px', 
                        color: theme.textSecondary,
                        marginBottom: '4px'
                      }}>
                        Learner Roles:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {profile.learnerRoles.slice(0, 3).map((role: string, idx: number) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '10px',
                              padding: '3px 6px',
                              backgroundColor: darkMode ? '#2a2a3a' : '#e3f2fd',
                              color: '#2196f3',
                              borderRadius: '3px'
                            }}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${theme.borderLight}`, display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {userWallet && userWallet.toLowerCase() !== profile.wallet.toLowerCase() && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRequestMeetingModal({ open: true, profile });
                        }}
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: '500',
                          backgroundColor: '#0066cc',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          flex: 1,
                          minWidth: '120px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#0052a3';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#0066cc';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        📅 Request Meeting
                      </button>
                    )}
                    {profile.txHash && (
                      <a
                        href={`https://explorer.mendoza.hoodi.arkiv.network/tx/${profile.txHash}`}
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
                          padding: '8px 12px',
                          backgroundColor: darkMode ? '#1a3a5a' : '#e7f3ff',
                          borderRadius: '6px',
                          border: `1px solid ${darkMode ? '#2a5a7a' : '#b3d9ff'}`,
                          transition: 'all 0.2s ease'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(profile.txHash!);
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
                    )}
                  </div>
                </div>
              );
              });
            })()}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Request Meeting Modal */}
      {requestMeetingModal.open && requestMeetingModal.profile && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: isMobile ? '0' : '20px'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setRequestMeetingModal({ open: false, profile: null });
            }
          }}
        >
          <div
            style={{
              backgroundColor: theme.cardBg,
              borderRadius: isMobile ? '20px 20px 0 0' : '12px',
              padding: isMobile ? '24px 20px' : '32px',
              maxWidth: isMobile ? '100%' : '500px',
              width: '100%',
              maxHeight: isMobile ? '90vh' : '80vh',
              overflowY: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              border: `1px solid ${theme.border}`,
              // Swipe down indicator for mobile
              ...(isMobile && {
                borderTop: '4px solid rgba(76, 175, 80, 0.3)',
              })
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: isMobile ? '20px' : '24px' }}>
              <h2 style={{
                margin: 0,
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: '600',
                color: theme.text,
                marginBottom: '8px'
              }}>
                Request Meeting
              </h2>
              <p style={{
                margin: 0,
                fontSize: isMobile ? '13px' : '14px',
                color: theme.textSecondary
              }}>
                Schedule a mentorship session with {requestMeetingModal.profile.displayName || shortenWallet(requestMeetingModal.profile.wallet)}
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!userWallet) {
                  alert('Please connect your wallet first');
                  return;
                }

                const formData = new FormData(e.currentTarget);
                const date = formData.get('date') as string;
                const time = formData.get('time') as string;
                const skill = formData.get('skill') as string;
                const duration = formData.get('duration') as string;
                const notes = formData.get('notes') as string;

                if (!date || !time || !skill) {
                  alert('Please fill in date, time, and skill');
                  return;
                }

                // Combine date and time into ISO string
                const sessionDate = new Date(`${date}T${time}`).toISOString();

                // Determine mentor/learner: if target has mentor roles, they're mentor; if user has mentor roles, they're mentor; otherwise default to target as mentor
                const targetHasMentorRoles = requestMeetingModal.profile.mentorRoles && requestMeetingModal.profile.mentorRoles.length > 0;
                const userHasMentorRoles = userProfile?.mentorRoles && userProfile.mentorRoles.length > 0;
                
                let mentorWallet: string;
                let learnerWallet: string;
                
                // Normalize wallet addresses for comparison
                const targetWallet = requestMeetingModal.profile.wallet?.toLowerCase() || '';
                const normalizedUserWallet = userWallet?.toLowerCase() || '';
                
                // Validate that user and target are different wallets
                if (targetWallet === normalizedUserWallet) {
                  alert('Cannot request a meeting with yourself. Please select a different profile.');
                  return;
                }
                
                if (targetHasMentorRoles && !userHasMentorRoles) {
                  // Target is mentor, user is learner
                  mentorWallet = targetWallet;
                  learnerWallet = normalizedUserWallet;
                } else if (userHasMentorRoles && !targetHasMentorRoles) {
                  // User is mentor, target is learner
                  mentorWallet = normalizedUserWallet;
                  learnerWallet = targetWallet;
                } else {
                  // Default: target is mentor (they're being requested)
                  mentorWallet = targetWallet;
                  learnerWallet = normalizedUserWallet;
                }

                setSubmittingMeeting(true);
                try {
                  const res = await fetch('/api/me', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      action: 'createSession',
                      wallet: userWallet,
                      mentorWallet,
                      learnerWallet,
                      skill,
                      sessionDate,
                      duration: duration || '60',
                      notes: notes || '',
                    }),
                  });

                  const data = await res.json();
                  if (!res.ok) {
                    throw new Error(data.error || 'Failed to create session');
                  }

                  alert(`Meeting requested successfully! Transaction: ${data.txHash ? shortenHash(data.txHash) : 'pending'}`);
                  setRequestMeetingModal({ open: false, profile: null });
                  
                  // Refresh network data to show new session
                  fetchNetwork();
                } catch (err: any) {
                  console.error('Error creating session:', err);
                  alert(`Error: ${err.message || 'Failed to request meeting'}`);
                } finally {
                  setSubmittingMeeting(false);
                }
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Skill *</span>
                  <input
                    type="text"
                    name="skill"
                    required
                    defaultValue={requestMeetingModal.profile.skillsArray?.[0] || requestMeetingModal.profile.skills?.split(',')[0] || ''}
                    placeholder="e.g. solidity, react, design"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${theme.inputBorder}`,
                      backgroundColor: theme.inputBg,
                      color: theme.text,
                      fontSize: '16px', // Prevents iOS zoom
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                    onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '12px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Date *</span>
                    <input
                      type="date"
                      name="date"
                      required
                      min={new Date().toISOString().split('T')[0]}
                      style={{
                        padding: '10px 12px',
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
                    <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Time *</span>
                    <input
                      type="time"
                      name="time"
                      required
                      style={{
                        padding: '10px 12px',
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

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Duration (minutes)</span>
                  <input
                    type="number"
                    name="duration"
                    defaultValue="60"
                    min="15"
                    max="240"
                    step="15"
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${theme.inputBorder}`,
                      backgroundColor: theme.inputBg,
                      color: theme.text,
                      fontSize: '16px', // Prevents iOS zoom
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                    onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '500', color: theme.textSecondary }}>Notes (optional)</span>
                  <textarea
                    name="notes"
                    rows={4}
                    placeholder="Any additional details about the session..."
                    style={{
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${theme.inputBorder}`,
                      backgroundColor: theme.inputBg,
                      color: theme.text,
                      fontSize: '16px', // Prevents iOS zoom
                      fontFamily: 'inherit',
                      resize: 'vertical',
                      transition: 'all 0.2s',
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
                    onBlur={(e) => e.currentTarget.style.borderColor = theme.inputBorder}
                  />
                </label>

                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setRequestMeetingModal({ open: false, profile: null })}
                    disabled={submittingMeeting}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: theme.hoverBg,
                      color: theme.text,
                      border: `1px solid ${theme.border}`,
                      borderRadius: '6px',
                      cursor: submittingMeeting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: submittingMeeting ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!submittingMeeting) {
                        e.currentTarget.style.backgroundColor = darkMode ? '#404040' : '#e0e0e0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!submittingMeeting) {
                        e.currentTarget.style.backgroundColor = theme.hoverBg;
                      }
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingMeeting}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: submittingMeeting ? '#999' : '#0066cc',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: submittingMeeting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: submittingMeeting ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!submittingMeeting) {
                        e.currentTarget.style.backgroundColor = '#0052a3';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!submittingMeeting) {
                        e.currentTarget.style.backgroundColor = '#0066cc';
                      }
                    }}
                  >
                    {submittingMeeting ? 'Requesting...' : 'Request Meeting'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upcoming Meetings Section */}
      {(() => {
        // Filter sessions to show only upcoming ones (pending, scheduled, or in-progress, with sessionDate in the future)
        // Also show cancelled sessions so users can see what was rejected
        const now = Date.now();
        const upcomingSessions = sessions.filter((session) => {
          if (session.status === 'completed') return false;
          // Show cancelled sessions if they're recent (within last 7 days) so users can see rejections
          if (session.status === 'cancelled') {
            if (!session.sessionDate) return false;
            const sessionTime = new Date(session.sessionDate).getTime();
            const daysSinceCancelled = (now - sessionTime) / (1000 * 60 * 60 * 24);
            return daysSinceCancelled <= 7; // Show cancelled sessions from last 7 days
          }
          if (!session.sessionDate) return false;
          const sessionTime = new Date(session.sessionDate).getTime();
          return sessionTime >= now;
        }).sort((a, b) => {
          // Sort by status (in-progress first, then pending, then cancelled, then scheduled), then by sessionDate (earliest first)
          const statusOrder: Record<string, number> = { 'in-progress': 0, 'pending': 1, 'cancelled': 2, 'scheduled': 3 };
          const aOrder = statusOrder[a.status] ?? 4;
          const bOrder = statusOrder[b.status] ?? 4;
          if (aOrder !== bOrder) return aOrder - bOrder;
          const aTime = new Date(a.sessionDate).getTime();
          const bTime = new Date(b.sessionDate).getTime();
          return aTime - bTime;
        });

        if (upcomingSessions.length === 0) return null;

        return (
          <section style={{ 
            marginBottom: '24px', 
            border: `1px solid ${theme.border}`, 
            borderRadius: '12px',
            backgroundColor: theme.cardBg,
            boxShadow: theme.shadow,
            transition: 'all 0.3s ease',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => setShowMeetings(!showMeetings)}
              style={{
                width: '100%',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.hoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>📅</span>
                <div style={{ textAlign: 'left' }}>
                  <h2 style={{ 
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '600',
                    color: theme.text,
                    transition: 'color 0.3s ease'
                  }}>
                    Upcoming Meetings
                  </h2>
                  <p style={{ 
                    margin: '4px 0 0 0',
                    fontSize: '12px',
                    color: theme.textSecondary,
                    transition: 'color 0.3s ease'
                  }}>
                    Scheduled and in-progress sessions
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#0066cc',
                  backgroundColor: darkMode ? '#1a3a5a' : '#e7f3ff',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  minWidth: '40px',
                  textAlign: 'center'
                }}>
                  {upcomingSessions.length}
                </span>
                <span style={{ 
                  fontSize: '20px',
                  transform: showMeetings ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease'
                }}>
                  ▼
                </span>
              </div>
            </button>
            {showMeetings && (
              <div style={{ padding: '0 20px 20px 20px' }}>
                <div style={{ display: 'grid', gap: '16px' }}>
              {upcomingSessions.map((session) => {
                const sessionTime = new Date(session.sessionDate);
                const isToday = sessionTime.toDateString() === new Date().toDateString();
                const isInProgress = session.status === 'in-progress';
                const isPending = session.status === 'pending';
                const isCancelled = session.status === 'cancelled';
                const timeUntil = sessionTime.getTime() - Date.now();
                const hoursUntil = Math.floor(timeUntil / (1000 * 60 * 60));
                const minutesUntil = Math.floor((timeUntil % (1000 * 60 * 60)) / (1000 * 60));
                
                // Find profile info for mentor and learner
                const mentorProfile = profiles.find(p => p.wallet.toLowerCase() === session.mentorWallet.toLowerCase());
                const learnerProfile = profiles.find(p => p.wallet.toLowerCase() === session.learnerWallet.toLowerCase());
                
                // Check if current user can confirm/reject
                const isMentor = userWallet.toLowerCase() === session.mentorWallet.toLowerCase();
                const isLearner = userWallet.toLowerCase() === session.learnerWallet.toLowerCase();
                const canConfirm = isPending && (isMentor || isLearner);
                const userConfirmed = isMentor ? session.mentorConfirmed : (isLearner ? session.learnerConfirmed : false);
                const otherConfirmed = isMentor ? session.learnerConfirmed : (isLearner ? session.mentorConfirmed : false);

                return (
                  <div 
                    key={session.key} 
                    style={{ 
                      padding: '20px', 
                      border: `1px solid ${theme.borderLight}`, 
                      borderRadius: '8px', 
                      backgroundColor: isInProgress ? (darkMode ? '#2a3a2a' : '#e8f5e9') : isPending ? (darkMode ? '#3a2a1a' : '#fff3e0') : isCancelled ? (darkMode ? '#3a2a2a' : '#ffebee') : theme.hoverBg,
                      transition: 'all 0.2s ease',
                      borderLeft: `4px solid ${isInProgress ? '#4caf50' : isPending ? '#ffa500' : isCancelled ? '#ef5350' : isToday ? '#ffa500' : '#0066cc'}`
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
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '12px',
                      paddingBottom: '12px',
                      borderBottom: `1px solid ${theme.borderLight}`
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px'
                        }}>
                          <strong style={{ 
                            color: theme.text,
                            fontSize: '16px',
                            fontWeight: '600'
                          }}>
                            📅 {session.skill || 'Session'}
                          </strong>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: isInProgress ? '#4caf50' : isPending ? '#ffa500' : isCancelled ? '#ef5350' : isToday ? '#ffa500' : theme.textSecondary,
                            backgroundColor: isInProgress ? (darkMode ? '#1a3a1a' : '#e8f5e9') : isPending ? (darkMode ? '#3a2a1a' : '#fff3e0') : isCancelled ? (darkMode ? '#4a2a2a' : '#ffebee') : isToday ? (darkMode ? '#3a2a1a' : '#fff3e0') : theme.hoverBg,
                            padding: '4px 8px',
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>
                            {isInProgress ? '🔴 In Progress' : isPending ? '⏳ Pending' : isCancelled ? '❌ Cancelled' : session.status}
                          </span>
                          {isPending && (
                            <span style={{
                              fontSize: '10px',
                              color: theme.textTertiary,
                              marginLeft: '8px'
                            }}>
                              {userConfirmed ? '✓ You confirmed' : otherConfirmed ? '⏳ Waiting for you' : '⏳ Awaiting confirmation'}
                            </span>
                          )}
                          {isCancelled && (
                            <span style={{
                              fontSize: '10px',
                              color: '#ef5350',
                              marginLeft: '8px'
                            }}>
                              This session was rejected
                            </span>
                          )}
                        </div>
                        <div style={{ 
                          fontSize: '18px',
                          fontWeight: '600',
                          color: theme.text,
                          marginBottom: '4px'
                        }}>
                          {sessionTime.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div style={{ 
                          fontSize: '16px',
                          color: theme.textSecondary,
                          marginBottom: '8px'
                        }}>
                          {sessionTime.toLocaleTimeString('en-US', { 
                            hour: 'numeric', 
                            minute: '2-digit',
                            hour12: true 
                          })}
                          {session.duration && (
                            <span style={{ marginLeft: '8px', fontSize: '14px' }}>
                              • {session.duration} min
                            </span>
                          )}
                        </div>
                        {timeUntil > 0 && !isInProgress && (
                          <div style={{ 
                            fontSize: '13px',
                            color: isToday ? '#ffa500' : theme.textTertiary,
                            fontWeight: isToday ? '600' : 'normal'
                          }}>
                            {hoursUntil > 0 ? `${hoursUntil}h ${minutesUntil}m` : `${minutesUntil}m`} until start
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ 
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '16px',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <div style={{ 
                          fontSize: '12px',
                          color: theme.textSecondary,
                          marginBottom: '4px',
                          fontWeight: '500'
                        }}>
                          Mentor:
                        </div>
                        <div style={{ 
                          fontSize: '14px',
                          color: theme.text,
                          fontWeight: '500'
                        }}>
                          {mentorProfile?.displayName || shortenWallet(session.mentorWallet)}
                        </div>
                        {mentorProfile?.username && (
                          <div style={{ 
                            fontSize: '12px',
                            color: theme.textTertiary
                          }}>
                            @{mentorProfile.username}
                          </div>
                        )}
                        <div style={{ 
                          fontSize: '11px',
                          color: theme.textTertiary,
                          fontFamily: 'monospace',
                          marginTop: '2px'
                        }}>
                          {shortenWallet(session.mentorWallet)}
                        </div>
                      </div>
                      <div>
                        <div style={{ 
                          fontSize: '12px',
                          color: theme.textSecondary,
                          marginBottom: '4px',
                          fontWeight: '500'
                        }}>
                          Learner:
                        </div>
                        <div style={{ 
                          fontSize: '14px',
                          color: theme.text,
                          fontWeight: '500'
                        }}>
                          {learnerProfile?.displayName || shortenWallet(session.learnerWallet)}
                        </div>
                        {learnerProfile?.username && (
                          <div style={{ 
                            fontSize: '12px',
                            color: theme.textTertiary
                          }}>
                            @{learnerProfile.username}
                          </div>
                        )}
                        <div style={{ 
                          fontSize: '11px',
                          color: theme.textTertiary,
                          fontFamily: 'monospace',
                          marginTop: '2px'
                        }}>
                          {shortenWallet(session.learnerWallet)}
                        </div>
                      </div>
                    </div>

                    {session.notes && (
                      <div style={{ 
                        marginBottom: '12px',
                        padding: '12px',
                        backgroundColor: theme.cardBg,
                        borderRadius: '6px',
                        border: `1px solid ${theme.borderLight}`
                      }}>
                        <div style={{ 
                          fontSize: '12px',
                          color: theme.textSecondary,
                          marginBottom: '4px',
                          fontWeight: '500'
                        }}>
                          Notes:
                        </div>
                        <div style={{ 
                          fontSize: '14px',
                          color: theme.text,
                          lineHeight: '1.5'
                        }}>
                          {session.notes}
                        </div>
                      </div>
                    )}

                    {canConfirm && !userConfirmed && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${theme.borderLight}`, display: 'flex', gap: '8px' }}>
                        <button
                          onClick={async () => {
                            if (!userWallet) {
                              alert('Please connect your wallet first');
                              return;
                            }
                            try {
                              const res = await fetch('/api/me', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'confirmSession',
                                  wallet: userWallet,
                                  sessionKey: session.key,
                                  mentorWallet: session.mentorWallet,
                                  learnerWallet: session.learnerWallet,
                                  spaceId: session.spaceId,
                                }),
                              });
                              const data = await res.json();
                              if (!res.ok) {
                                throw new Error(data.error || 'Failed to confirm session');
                              }
                              alert('Session confirmed!');
                              fetchNetwork();
                            } catch (err: any) {
                              console.error('Error confirming session:', err);
                              alert(`Error: ${err.message || 'Failed to confirm session'}`);
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            backgroundColor: '#4caf50',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#45a049';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#4caf50';
                          }}
                        >
                          ✓ Confirm
                        </button>
                        <button
                          onClick={async () => {
                            if (!userWallet) {
                              alert('Please connect your wallet first');
                              return;
                            }
                            if (!confirm('Are you sure you want to reject this meeting request?')) {
                              return;
                            }
                            try {
                              const res = await fetch('/api/me', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'rejectSession',
                                  wallet: userWallet,
                                  sessionKey: session.key,
                                  mentorWallet: session.mentorWallet,
                                  learnerWallet: session.learnerWallet,
                                  spaceId: session.spaceId,
                                }),
                              });
                              const data = await res.json();
                              if (!res.ok) {
                                throw new Error(data.error || 'Failed to reject session');
                              }
                              alert('Session rejected');
                              fetchNetwork();
                            } catch (err: any) {
                              console.error('Error rejecting session:', err);
                              alert(`Error: ${err.message || 'Failed to reject session'}`);
                            }
                          }}
                          style={{
                            flex: 1,
                            padding: '10px 16px',
                            fontSize: '14px',
                            fontWeight: '500',
                            backgroundColor: theme.hoverBg,
                            color: theme.text,
                            border: `1px solid ${theme.border}`,
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = darkMode ? '#404040' : '#e0e0e0';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = theme.hoverBg;
                          }}
                        >
                          ✗ Reject
                        </button>
                      </div>
                    )}

                    {/* Jitsi Join Button - Show when session is scheduled and has Jitsi link */}
                    {session.status === 'scheduled' && session.videoProvider === 'jitsi' && session.videoJoinUrl && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${theme.borderLight}` }}>
                        <a
                          href={session.videoJoinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            backgroundColor: '#4caf50',
                            color: '#ffffff',
                            textDecoration: 'none',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(76, 175, 80, 0.3)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#45a049';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px rgba(76, 175, 80, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = '#4caf50';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 4px rgba(76, 175, 80, 0.3)';
                          }}
                        >
                          🎥 Join Video Call
                        </a>
                      </div>
                    )}

                    {session.txHash && (
                      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${theme.borderLight}` }}>
                        <a
                          href={`https://explorer.mendoza.hoodi.arkiv.network/tx/${session.txHash}`}
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
                            copyToClipboard(session.txHash!);
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
                );
              })}
                </div>
              </div>
            )}
          </section>
        );
      })()}

      {/* Detailed Lists Below - Collapsible */}
      <div style={{ marginTop: '24px' }}>
        {displayedAsks.length > 0 && (
          <section style={{ 
            marginBottom: '24px', 
            border: `1px solid ${theme.border}`, 
            borderRadius: '12px',
            backgroundColor: theme.cardBg,
            boxShadow: theme.shadow,
            transition: 'all 0.3s ease',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => setShowAsks(!showAsks)}
              style={{
                width: '100%',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.hoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>❓</span>
                <h2 style={{ 
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  color: theme.text,
                  transition: 'color 0.3s ease'
                }}>
                  Open Asks
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#ef5350',
                  backgroundColor: darkMode ? '#4a2525' : '#ffebee',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  minWidth: '40px',
                  textAlign: 'center'
                }}>
                  {displayedAsks.length}
                </span>
                <span style={{ 
                  fontSize: '20px',
                  transform: showAsks ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease'
                }}>
                  ▼
                </span>
              </div>
            </button>
            {showAsks && (
              <div style={{ padding: '0 20px 20px 20px' }}>
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
              </div>
            )}
          </section>
        )}

        {displayedOffers.length > 0 && (
          <section style={{ 
            marginBottom: '24px', 
            border: `1px solid ${theme.border}`, 
            borderRadius: '12px',
            backgroundColor: theme.cardBg,
            boxShadow: theme.shadow,
            transition: 'all 0.3s ease',
            overflow: 'hidden'
          }}>
            <button
              onClick={() => setShowOffers(!showOffers)}
              style={{
                width: '100%',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.hoverBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '28px' }}>💎</span>
                <h2 style={{ 
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: '600',
                  color: theme.text,
                  transition: 'color 0.3s ease'
                }}>
                  Active Offers
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#4caf50',
                  backgroundColor: darkMode ? '#1a3a1a' : '#e8f5e9',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  minWidth: '40px',
                  textAlign: 'center'
                }}>
                  {displayedOffers.length}
                </span>
                <span style={{ 
                  fontSize: '20px',
                  transform: showOffers ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.3s ease'
                }}>
                  ▼
                </span>
              </div>
            </button>
            {showOffers && (
              <div style={{ padding: '0 20px 20px 20px' }}>
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
              </div>
            )}
          </section>
        )}
      </div>
      </div>
    </main>
  );
}
