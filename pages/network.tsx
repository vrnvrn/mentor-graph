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
  const [loading, setLoading] = useState(true);
  const [skillFilter, setSkillFilter] = useState('');
  const [currentFilterSkill, setCurrentFilterSkill] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'asks' | 'offers'>('all');
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [userWallet, setUserWallet] = useState<string>('');
  const [showAnalytics, setShowAnalytics] = useState(true);
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

  const fetchNetwork = async (skill?: string) => {
    try {
      const url = skill ? `/api/network?skill=${encodeURIComponent(skill)}` : '/api/network';
      const res = await fetch(url);
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Error fetching /api/network:', res.status, errorData);
        return;
      }
      const data = await res.json();
      setAsks(data.asks || []);
      setOffers(data.offers || []);
      setCurrentFilterSkill(skill || '');
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
    fetchNetwork(skillFilter || undefined);
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

  // Compute Arkiv-based connections
  const computeConnections = () => {
    const connections: Array<{
      from: string;
      to: string;
      type: 'skill' | 'wallet' | 'match';
      fromPos: { x: number; y: number };
      toPos: { x: number; y: number };
    }> = [];

    displayedNodes.forEach((node) => {
      const nodePos = getNodePosition(node.id, node.x, node.y);
      
      // Skill-based connections (same skill) - always show
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

      // Wallet-based connections (same wallet - entities from same contributor) - always show
      displayedNodes.forEach((target) => {
        if (target.id === node.id) return;
        if (node.wallet === target.wallet && node.wallet !== userWallet) {
          const targetPos = getNodePosition(target.id, target.x, target.y);
          connections.push({
            from: node.id,
            to: target.id,
            type: 'wallet',
            fromPos: nodePos,
            toPos: targetPos,
          });
        }
      });

      // Match connections (ask + offer with same skill - potential mentorship matches) - always show
      if (node.type === 'ask') {
        displayedNodes.forEach((target) => {
          if (target.type === 'offer' && 
              node.skill.toLowerCase() === target.skill.toLowerCase() &&
              node.wallet !== target.wallet) {
            const targetPos = getNodePosition(target.id, target.x, target.y);
            connections.push({
              from: node.id,
              to: target.id,
              type: 'match',
              fromPos: nodePos,
              toPos: targetPos,
            });
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

  const connections = computeConnections();

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

  if (loading) {
    return (
      <main style={{ 
        padding: '40px 20px', 
        minHeight: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ textAlign: 'center', color: '#6c757d', fontSize: '16px' }}>Loading network data...</div>
      </main>
    );
  }

  return (
    <main style={{ 
      padding: '32px 24px', 
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px',
        paddingBottom: '24px',
        borderBottom: '2px solid #e9ecef'
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            fontSize: '32px',
            fontWeight: '700',
            color: '#212529',
            letterSpacing: '-0.5px'
          }}>
            Network Analytics
          </h1>
          <p style={{ 
            margin: '8px 0 0 0',
            fontSize: '14px',
            color: '#6c757d'
          }}>
            Arkiv-powered mentorship network visualization
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: showAnalytics ? '#0066cc' : '#ffffff',
              color: showAnalytics ? '#ffffff' : '#495057',
              border: '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!showAnalytics) {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#adb5bd';
              }
            }}
            onMouseLeave={(e) => {
              if (!showAnalytics) {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.borderColor = '#dee2e6';
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
        border: '1px solid #dee2e6', 
        borderRadius: '8px', 
        backgroundColor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
      }}>
        <form onSubmit={handleApplyFilter} style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>Skill:</span>
            <input
              type="text"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              placeholder="e.g. solidity"
              style={{ 
                padding: '8px 12px', 
                borderRadius: '6px', 
                border: '1px solid #ced4da',
                fontSize: '14px',
                width: '180px',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#ced4da'}
            />
          </label>
          <button 
            type="submit" 
            style={{ 
              padding: '8px 20px', 
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
            Apply
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>Type:</span>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'asks' | 'offers')}
              style={{ 
                padding: '8px 12px', 
                borderRadius: '6px', 
                border: '1px solid #ced4da',
                fontSize: '14px',
                backgroundColor: '#ffffff',
                cursor: 'pointer',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#0066cc'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#ced4da'}
            >
              <option value="all">All</option>
              <option value="asks">Asks</option>
              <option value="offers">Offers</option>
            </select>
          </label>
        </form>
      </section>

      {/* Main Content: Web Visualization + Analytics Sidebar */}
      <div style={{ display: 'flex', gap: '24px', position: 'relative', marginBottom: '32px' }}>
        {/* Web Visualization */}
        <div style={{ flex: 1, position: 'relative' }}>
          <div style={{ 
            border: '1px solid #dee2e6', 
            borderRadius: '12px', 
            backgroundColor: '#ffffff',
            padding: '24px',
            minHeight: '640px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ 
              marginBottom: '16px',
              paddingBottom: '16px',
              borderBottom: '1px solid #e9ecef'
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: '20px',
                fontWeight: '600',
                color: '#212529'
              }}>
                Network Web
              </h2>
              <p style={{ 
                margin: '4px 0 0 0',
                fontSize: '13px',
                color: '#6c757d'
              }}>
                Drag nodes to explore • Blue: same skill • Purple: same wallet • Green dashed: potential matches
              </p>
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
              {connections.map((conn, idx) => {
                let strokeColor = 'rgba(0, 102, 204, 0.15)';
                let strokeWidth = 1.5;
                let strokeDasharray = 'none';
                
                if (conn.type === 'match') {
                  // Potential mentorship matches (ask + offer)
                  strokeColor = 'rgba(76, 175, 80, 0.4)';
                  strokeWidth = 2.5;
                  strokeDasharray = '5,5';
                } else if (conn.type === 'wallet') {
                  // Same wallet (same contributor)
                  strokeColor = 'rgba(156, 39, 176, 0.25)';
                  strokeWidth = 2;
                } else {
                  // Same skill
                  strokeColor = 'rgba(0, 102, 204, 0.2)';
                  strokeWidth = 1.5;
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
              onMouseMove={handleDrag}
              onMouseUp={handleDragEnd}
            >
              {displayedNodes.slice(0, 50).map((node) => {
                const nodePos = getNodePosition(node.id, node.x, node.y);
                const isDragging = draggingNode === node.id;
                
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
                      backgroundColor: node.type === 'ask' ? '#fff5f5' : '#f0f9f4',
                      border: `2px solid ${node.type === 'ask' ? '#ef5350' : '#4caf50'}`,
                      borderRadius: '10px',
                      cursor: isDragging ? 'grabbing' : 'grab',
                      boxShadow: isDragging 
                        ? '0 8px 24px rgba(0,0,0,0.25)' 
                        : '0 2px 8px rgba(0,0,0,0.12)',
                      fontSize: '12px',
                      transition: isDragging ? 'none' : 'box-shadow 0.2s ease',
                      zIndex: isDragging ? 100 : 1,
                      userSelect: 'none',
                    }}
                    onMouseDown={(e) => {
                      handleDragStart(e, node.id, nodePos.x, nodePos.y);
                    }}
                    onMouseEnter={(e) => {
                      if (!isDragging) {
                        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.08)';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
                        e.currentTarget.style.zIndex = '10';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDragging) {
                        e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
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
                    color: '#212529',
                    fontSize: '13px'
                  }}>
                    {node.skill || 'Unknown'}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#6c757d', 
                    marginBottom: '4px'
                  }}>
                    {shortenWallet(node.wallet)}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    color: '#868e96', 
                    marginTop: '6px',
                    paddingTop: '6px',
                    borderTop: '1px solid #e9ecef'
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
            border: '1px solid #dee2e6', 
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            maxHeight: '640px',
            overflowY: 'auto',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            <h2 style={{ 
              marginTop: 0, 
              marginBottom: '24px',
              fontSize: '20px',
              fontWeight: '600',
              color: '#212529'
            }}>
              Analytics
            </h2>
            
            {/* Summary Cards */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ 
                padding: '20px', 
                border: '1px solid #e9ecef', 
                borderRadius: '8px', 
                marginBottom: '12px',
                backgroundColor: '#f8f9fa',
                transition: 'all 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f3f5';
                e.currentTarget.style.borderColor = '#dee2e6';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#e9ecef';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#0066cc', marginBottom: '6px' }}>
                  {totalAsks}
                </div>
                <div style={{ color: '#6c757d', fontSize: '13px', fontWeight: '500' }}>Open Asks</div>
              </div>
              <div style={{ 
                padding: '20px', 
                border: '1px solid #e9ecef', 
                borderRadius: '8px', 
                marginBottom: '12px',
                backgroundColor: '#f8f9fa',
                transition: 'all 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f3f5';
                e.currentTarget.style.borderColor = '#dee2e6';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#e9ecef';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#0066cc', marginBottom: '6px' }}>
                  {totalOffers}
                </div>
                <div style={{ color: '#6c757d', fontSize: '13px', fontWeight: '500' }}>Active Offers</div>
              </div>
              <div style={{ 
                padding: '20px', 
                border: '1px solid #e9ecef', 
                borderRadius: '8px',
                backgroundColor: '#f8f9fa',
                transition: 'all 0.2s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f1f3f5';
                e.currentTarget.style.borderColor = '#dee2e6';
                e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#e9ecef';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#0066cc', marginBottom: '6px' }}>
                  {uniqueWallets}
                </div>
                <div style={{ color: '#6c757d', fontSize: '13px', fontWeight: '500' }}>Contributors</div>
              </div>
            </div>

            {/* Skill Counts */}
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                marginBottom: '16px',
                fontWeight: '600',
                color: '#212529'
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
                        backgroundColor: '#f8f9fa', 
                        borderRadius: '6px',
                        border: '1px solid #e9ecef',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f3f5';
                        e.currentTarget.style.borderColor = '#dee2e6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.borderColor = '#e9ecef';
                      }}
                    >
                      <div style={{ fontWeight: '500', marginBottom: '4px', color: '#212529' }}>{skill}</div>
                      <div style={{ color: '#6c757d', fontSize: '12px' }}>
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
            border: '1px solid #dee2e6', 
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ 
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #e9ecef'
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: '22px',
                fontWeight: '600',
                color: '#212529'
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
                    border: '1px solid #e9ecef', 
                    borderRadius: '8px', 
                    backgroundColor: '#fff5f5',
                    transition: 'all 0.2s ease',
                    borderLeft: '4px solid #ef5350'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = '#dee2e6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#e9ecef';
                  }}
                >
                  <div style={{ 
                    marginBottom: '12px', 
                    paddingBottom: '12px', 
                    borderBottom: '1px solid #ffe0e0'
                  }}>
                    <strong style={{ 
                      color: '#d32f2f',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      🔴 Ask — {ask.skill || 'Unknown'}
                    </strong>
                  </div>
                  <div style={{ 
                    marginBottom: '8px', 
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    <strong style={{ color: '#6c757d' }}>Wallet:</strong> {shortenWallet(ask.wallet)}
                  </div>
                  <div style={{ 
                    marginBottom: '8px', 
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    <strong style={{ color: '#6c757d' }}>Message:</strong> {ask.message || 'N/A'}
                  </div>
                  <div style={{ 
                    marginBottom: '12px', 
                    fontSize: '13px', 
                    color: '#868e96',
                    padding: '6px 10px',
                    backgroundColor: '#ffffff',
                    borderRadius: '4px',
                    display: 'inline-block'
                  }}>
                    {formatTimeRemaining(ask.createdAt, ask.ttlSeconds)}
                  </div>
                  {ask.txHash && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #ffe0e0' }}>
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
                          backgroundColor: '#e7f3ff',
                          borderRadius: '6px',
                          border: '1px solid #b3d9ff',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(ask.txHash!);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#d0e7ff';
                          e.currentTarget.style.borderColor = '#80c7ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#e7f3ff';
                          e.currentTarget.style.borderColor = '#b3d9ff';
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
            border: '1px solid #dee2e6', 
            borderRadius: '12px',
            backgroundColor: '#ffffff',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{ 
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #e9ecef'
            }}>
              <h2 style={{ 
                margin: 0,
                fontSize: '22px',
                fontWeight: '600',
                color: '#212529'
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
                    border: '1px solid #e9ecef', 
                    borderRadius: '8px', 
                    backgroundColor: '#f0f9f4',
                    transition: 'all 0.2s ease',
                    borderLeft: '4px solid #4caf50'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.borderColor = '#dee2e6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.borderColor = '#e9ecef';
                  }}
                >
                  <div style={{ 
                    marginBottom: '12px', 
                    paddingBottom: '12px', 
                    borderBottom: '1px solid #d4edda'
                  }}>
                    <strong style={{ 
                      color: '#2e7d32',
                      fontSize: '16px',
                      fontWeight: '600'
                    }}>
                      🟢 Offer — {offer.skill || 'Unknown'}
                    </strong>
                  </div>
                  <div style={{ 
                    marginBottom: '8px', 
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    <strong style={{ color: '#6c757d' }}>Wallet:</strong> {shortenWallet(offer.wallet)}
                  </div>
                  <div style={{ 
                    marginBottom: '8px', 
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    <strong style={{ color: '#6c757d' }}>Message:</strong> {offer.message || 'N/A'}
                  </div>
                  <div style={{ 
                    marginBottom: '8px', 
                    color: '#495057',
                    fontSize: '14px'
                  }}>
                    <strong style={{ color: '#6c757d' }}>Availability:</strong> {offer.availabilityWindow || 'N/A'}
                  </div>
                  <div style={{ 
                    marginBottom: '12px', 
                    fontSize: '13px', 
                    color: '#868e96',
                    padding: '6px 10px',
                    backgroundColor: '#ffffff',
                    borderRadius: '4px',
                    display: 'inline-block'
                  }}>
                    {formatTimeRemaining(offer.createdAt, offer.ttlSeconds)}
                  </div>
                  {offer.txHash && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #d4edda' }}>
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
                          backgroundColor: '#e7f3ff',
                          borderRadius: '6px',
                          border: '1px solid #b3d9ff',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(offer.txHash!);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#d0e7ff';
                          e.currentTarget.style.borderColor = '#80c7ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#e7f3ff';
                          e.currentTarget.style.borderColor = '#b3d9ff';
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
    </main>
  );
}
