import React, { useEffect, useState } from 'react';

type Ask = {
  key: string;
  wallet: string;
  skill: string;
  spaceId: string;
  createdAt: string;
  status: string;
  message: string;
  ttlSeconds: number;
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
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `⏰ ${hours}h ${minutes}m remaining`;
  } else if (minutes > 0) {
    return `⏰ ${minutes}m ${seconds}s remaining`;
  } else {
    return `⏰ ${seconds}s remaining`;
  }
}

export default function Network() {
  const [asks, setAsks] = useState<Ask[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [skillFilter, setSkillFilter] = useState('');
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

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchNetwork(skillFilter || undefined);
  };

  const shortenWallet = (wallet: string) => {
    if (!wallet || wallet.length < 10) return wallet;
    return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  };

  if (loading) {
    return <main style={{ padding: '20px' }}>Loading...</main>;
  }

  return (
    <main style={{ padding: '20px' }}>
      <h1>Network View</h1>

      <form onSubmit={handleApplyFilter} style={{ marginBottom: '30px', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <label>
          Filter by skill:
          <input
            type="text"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            placeholder="e.g. solidity"
            style={{ marginLeft: '10px', padding: '5px', marginRight: '10px' }}
          />
        </label>
        <button type="submit">Apply</button>
      </form>

      <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2>Open Asks ({asks.length})</h2>
        {asks.length === 0 ? (
          <div>No open asks found</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {asks.map((ask) => (
              <li key={ask.key} style={{ margin: '10px 0', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Wallet:</strong> {shortenWallet(ask.wallet) || 'N/A'}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Skill:</strong> {ask.skill || 'N/A'}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Message:</strong> {ask.message || 'N/A'}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Status:</strong> {ask.status || 'N/A'}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Space ID:</strong> {ask.spaceId || 'N/A'}
                </div>
                {ask.createdAt && (
                  <div style={{ marginTop: '8px', padding: '5px', background: '#f0f0f0', borderRadius: '3px', color: '#666' }}>
                    {formatTimeRemaining(ask.createdAt, ask.ttlSeconds)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2>Active Offers ({offers.length})</h2>
        {offers.length === 0 ? (
          <div>No active offers found</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {offers.map((offer) => (
              <li key={offer.key} style={{ margin: '10px 0', padding: '15px', border: '1px solid #ddd', borderRadius: '4px' }}>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Wallet:</strong> {shortenWallet(offer.wallet) || 'N/A'}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Skill:</strong> {offer.skill || 'N/A'}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Message:</strong> {offer.message || 'N/A'}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Availability:</strong> {offer.availabilityWindow || 'N/A'}
                </div>
                <div style={{ marginBottom: '4px' }}>
                  <strong>Status:</strong> {offer.status || 'N/A'}
                </div>
                {offer.createdAt && (
                  <div style={{ marginTop: '8px', padding: '5px', background: '#f0f0f0', borderRadius: '3px', color: '#666' }}>
                    {formatTimeRemaining(offer.createdAt, offer.ttlSeconds)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

