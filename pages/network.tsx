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

type ActivityItem = {
  type: 'ask' | 'offer';
  key: string;
  wallet: string;
  skill: string;
  createdAt: string;
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
    return `⏰ ${hours}h ${minutes}m remaining`;
  } else if (minutes > 0) {
    return `⏰ ${minutes}m remaining`;
  } else {
    return `⏰ <1m remaining`;
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
  const [, setNow] = useState(Date.now());

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

  // Recent activity feed
  const recentActivity: ActivityItem[] = [
    ...asks.map(a => ({ type: 'ask' as const, key: a.key, wallet: a.wallet, skill: a.skill, createdAt: a.createdAt })),
    ...offers.map(o => ({ type: 'offer' as const, key: o.key, wallet: o.wallet, skill: o.skill, createdAt: o.createdAt })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Filter lists by type
  const displayedAsks = typeFilter === 'all' || typeFilter === 'asks' ? asks : [];
  const displayedOffers = typeFilter === 'all' || typeFilter === 'offers' ? offers : [];

  if (loading) {
    return <main style={{ padding: '20px' }}>Loading...</main>;
  }

  return (
    <main style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0 }}>Network Analytics</h1>
        <button
          onClick={() => router.push('/me')}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            fontWeight: '600',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
            transition: 'background-color 0.2s, transform 0.1s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#555';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#666';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ← My Dashboard
        </button>
      </div>

      {/* Header + Filters */}
      <section style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
        <form onSubmit={handleApplyFilter} style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <strong>Skill:</strong>
            <input
              type="text"
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              placeholder="e.g. solidity"
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </label>
          <button type="submit" style={{ padding: '6px 16px', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Apply
          </button>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '20px' }}>
            <strong>Type:</strong>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'asks' | 'offers')}
              style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
            >
              <option value="all">All</option>
              <option value="asks">Asks</option>
              <option value="offers">Offers</option>
            </select>
          </label>
        </form>
      </section>

      {/* Summary Cards */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0066cc', marginBottom: '8px' }}>
            {totalAsks}
          </div>
          <div style={{ color: '#666' }}>Total Open Asks</div>
        </div>
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0066cc', marginBottom: '8px' }}>
            {totalOffers}
          </div>
          <div style={{ color: '#666' }}>Total Active Offers</div>
        </div>
        <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#0066cc', marginBottom: '8px' }}>
            {uniqueWallets}
          </div>
          <div style={{ color: '#666' }}>Unique Contributors</div>
        </div>
      </section>

      {/* Skill Counts Table */}
      <section style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2 style={{ marginBottom: '15px' }}>Skill Counts</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>Skill</th>
              <th style={{ padding: '10px' }}>#Asks</th>
              <th style={{ padding: '10px' }}>#Offers</th>
              <th style={{ padding: '10px' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(skillCounts)
              .sort((a, b) => (b[1].asks + b[1].offers) - (a[1].asks + a[1].offers))
              .map(([skill, counts]) => (
                <tr key={skill} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px', fontWeight: '500' }}>{skill}</td>
                  <td style={{ padding: '10px' }}>{counts.asks}</td>
                  <td style={{ padding: '10px' }}>{counts.offers}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{counts.asks + counts.offers}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </section>

      {/* Recent Activity Feed */}
      <section style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2 style={{ marginBottom: '15px' }}>Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <div style={{ color: '#666' }}>No recent activity</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {recentActivity.map((item) => (
              <li key={item.key} style={{ margin: '8px 0', padding: '12px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#f9f9f9' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 'bold', color: item.type === 'ask' ? '#d32f2f' : '#2e7d32' }}>
                    {item.type === 'ask' ? '🔴 Ask' : '🟢 Offer'}
                  </span>
                  <span style={{ color: '#666' }}>{item.skill || 'Unknown'}</span>
                  <span style={{ color: '#999', fontSize: '14px' }}>{shortenWallet(item.wallet)}</span>
                  <span style={{ color: '#999', fontSize: '14px', marginLeft: 'auto' }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Improved Lists */}
      {displayedAsks.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <h2 style={{ marginBottom: '15px' }}>Open Asks ({displayedAsks.length})</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {displayedAsks.map((ask) => (
              <li key={ask.key} style={{ margin: '12px 0', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
                <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
                  <strong style={{ color: '#d32f2f' }}>🔴 Ask — {ask.skill || 'Unknown'}</strong>
                </div>
                <div style={{ marginBottom: '6px', color: '#666' }}>
                  <strong>Wallet:</strong> {shortenWallet(ask.wallet)}
                </div>
                <div style={{ marginBottom: '6px', color: '#666' }}>
                  <strong>Message:</strong> {ask.message || 'N/A'}
                </div>
                <div style={{ marginBottom: '8px', fontSize: '14px', color: '#999' }}>
                  {formatTimeRemaining(ask.createdAt, ask.ttlSeconds)}
                </div>
                {ask.txHash && (
                  <div style={{ marginTop: '8px', fontSize: '12px' }}>
                    <strong>Tx:</strong>{' '}
                    <a
                      href={`https://explorer.mendoza.hoodi.arkiv.network/tx/${ask.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px', textDecoration: 'none', color: '#0066cc' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(ask.txHash!);
                      }}
                      title="Click to open in explorer (copies hash to clipboard)">
                      {shortenHash(ask.txHash)}
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {displayedOffers.length > 0 && (
        <section style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
          <h2 style={{ marginBottom: '15px' }}>Active Offers ({displayedOffers.length})</h2>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {displayedOffers.map((offer) => (
              <li key={offer.key} style={{ margin: '12px 0', padding: '15px', border: '1px solid #ddd', borderRadius: '4px', backgroundColor: '#fff' }}>
                <div style={{ marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid #eee' }}>
                  <strong style={{ color: '#2e7d32' }}>🟢 Offer — {offer.skill || 'Unknown'}</strong>
                </div>
                <div style={{ marginBottom: '6px', color: '#666' }}>
                  <strong>Wallet:</strong> {shortenWallet(offer.wallet)}
                </div>
                <div style={{ marginBottom: '6px', color: '#666' }}>
                  <strong>Message:</strong> {offer.message || 'N/A'}
                </div>
                <div style={{ marginBottom: '6px', color: '#666' }}>
                  <strong>Availability:</strong> {offer.availabilityWindow || 'N/A'}
                </div>
                <div style={{ marginBottom: '8px', fontSize: '14px', color: '#999' }}>
                  {formatTimeRemaining(offer.createdAt, offer.ttlSeconds)}
                </div>
                {offer.txHash && (
                  <div style={{ marginTop: '8px', fontSize: '12px' }}>
                    <strong>Tx:</strong>{' '}
                    <a
                      href={`https://explorer.mendoza.hoodi.arkiv.network/tx/${offer.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px', textDecoration: 'none', color: '#0066cc' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(offer.txHash!);
                      }}
                      title="Click to open in explorer (copies hash to clipboard)">
                      {shortenHash(offer.txHash)}
                    </a>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
