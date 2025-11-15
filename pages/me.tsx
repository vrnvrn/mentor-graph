import React, { useEffect, useState } from 'react';

type Profile = {
  key: string;
  wallet: string;
  displayName: string;
  skills: string;
  timezone: string;
  spaceId: string;
  createdAt?: string;
};

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

type MeData = {
  wallet: string;
  profile: Profile | null;
  asks: Ask[];
  offers: Offer[];
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

export default function Me() {
  const [data, setData] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [, setNow] = useState(Date.now());

  const fetchMe = async () => {
    try {
      const res = await fetch('/api/me');
      if (!res.ok) {
        const errorData = await res.json();
        console.error('Error fetching /api/me:', res.status, errorData);
        setError(`Failed to load data: ${errorData.error || res.statusText}`);
        return;
      }
      const meData = await res.json();
      console.log('Fetched /api/me:', meData);
      setData(meData);
      setError(null);
    } catch (err) {
      console.error('Error fetching /api/me:', err);
      setError('Network error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting('profile');
    setError(null);
    const formData = new FormData(e.target as HTMLFormElement);
    const displayName = formData.get('displayName') as string;
    const skills = formData.get('skills') as string;
    const timezone = formData.get('timezone') as string;

    const payload = {
      action: 'createProfile',
      displayName,
      skills,
      timezone,
    };
    console.log('Creating profile:', payload);

    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        console.log('Profile created:', result);
        fetchMe();
      } else {
        const errorData = await res.json();
        console.error('Error creating profile:', res.status, errorData);
        setError(`Failed to create profile: ${errorData.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Error creating profile:', err);
      setError('Network error creating profile');
    } finally {
      setSubmitting(null);
    }
  };

  const handleCreateAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting('ask');
    setError(null);
    const formData = new FormData(e.target as HTMLFormElement);
    const skill = formData.get('skill') as string;
    const message = formData.get('message') as string;

    const payload = {
      action: 'createAsk',
      skill,
      message,
    };
    console.log('Creating ask:', payload);

    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        console.log('Ask created:', result);
        (e.target as HTMLFormElement).reset();
        fetchMe();
      } else {
        const errorData = await res.json();
        console.error('Error creating ask:', res.status, errorData);
        setError(`Failed to create ask: ${errorData.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Error creating ask:', err);
      setError('Network error creating ask');
    } finally {
      setSubmitting(null);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting('offer');
    setError(null);
    const formData = new FormData(e.target as HTMLFormElement);
    const skill = formData.get('skill') as string;
    const message = formData.get('message') as string;
    const availabilityWindow = formData.get('availabilityWindow') as string;

    const payload = {
      action: 'createOffer',
      skill,
      message,
      availabilityWindow,
    };
    console.log('Creating offer:', payload);

    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        console.log('Offer created:', result);
        (e.target as HTMLFormElement).reset();
        fetchMe();
      } else {
        const errorData = await res.json();
        console.error('Error creating offer:', res.status, errorData);
        setError(`Failed to create offer: ${errorData.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Error creating offer:', err);
      setError('Network error creating offer');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return <main style={{ padding: '20px' }}>Loading...</main>;
  }

  if (!data) {
    return <main style={{ padding: '20px' }}>Error loading data</main>;
  }

  return (
    <main style={{ padding: '20px' }}>
      <h1>My Dashboard</h1>

      {error && (
        <div style={{ marginBottom: '20px', padding: '10px', background: '#ffebee', border: '1px solid #f44336', color: '#c62828' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2>Wallet & Profile</h2>
        <div style={{ marginBottom: '10px' }}>
          <strong>Wallet:</strong> {data.wallet}
        </div>

        {data.profile ? (
          <div>
            <div><strong>Display Name:</strong> {data.profile.displayName}</div>
            <div><strong>Skills:</strong> {data.profile.skills}</div>
            <div><strong>Timezone:</strong> {data.profile.timezone}</div>
            <div><strong>Space ID:</strong> {data.profile.spaceId}</div>
            {data.profile.createdAt && (
              <div><strong>Created:</strong> {data.profile.createdAt}</div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreateProfile}>
            <div style={{ marginBottom: '10px' }}>
              <label>
                Display Name:
                <input type="text" name="displayName" required style={{ marginLeft: '10px' }} />
              </label>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>
                Skills:
                <input type="text" name="skills" style={{ marginLeft: '10px' }} />
              </label>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label>
                Timezone:
                <input type="text" name="timezone" style={{ marginLeft: '10px' }} />
              </label>
            </div>
            <button type="submit" disabled={submitting === 'profile'}>
              {submitting === 'profile' ? 'Creating...' : 'Create Profile'}
            </button>
          </form>
        )}
      </section>

      <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2>My Asks</h2>
        <form onSubmit={handleCreateAsk} style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5' }}>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Skill:
              <input type="text" name="skill" required style={{ marginLeft: '10px' }} />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Message:
              <input type="text" name="message" required style={{ marginLeft: '10px' }} />
            </label>
          </div>
          <button type="submit" disabled={submitting === 'ask'}>
            {submitting === 'ask' ? 'Creating...' : 'Create Ask'}
          </button>
        </form>

        <div>
          <h3>Existing Asks ({data.asks.length})</h3>
          {data.asks.length === 0 ? (
            <div>No asks yet</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {data.asks.map((ask) => (
                <li key={ask.key} style={{ margin: '10px 0', padding: '10px', border: '1px solid #ddd' }}>
                  <div><strong>Skill:</strong> {ask.skill || 'N/A'}</div>
                  <div><strong>Message:</strong> {ask.message}</div>
                  <div><strong>Status:</strong> {ask.status}</div>
                  {ask.createdAt && (
                    <>
                      <div><strong>Created:</strong> {ask.createdAt}</div>
                      <div style={{ marginTop: '5px', color: '#666' }}>
                        {formatTimeRemaining(ask.createdAt, ask.ttlSeconds)}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section style={{ marginBottom: '40px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2>My Offers</h2>
        <form onSubmit={handleCreateOffer} style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5' }}>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Skill:
              <input type="text" name="skill" required style={{ marginLeft: '10px' }} />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Message:
              <input type="text" name="message" required style={{ marginLeft: '10px' }} />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label>
              Availability Window:
              <input type="text" name="availabilityWindow" required style={{ marginLeft: '10px' }} />
            </label>
          </div>
          <button type="submit" disabled={submitting === 'offer'}>
            {submitting === 'offer' ? 'Creating...' : 'Create Offer'}
          </button>
        </form>

        <div>
          <h3>Existing Offers ({data.offers.length})</h3>
          {data.offers.length === 0 ? (
            <div>No offers yet</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {data.offers.map((offer) => (
                <li key={offer.key} style={{ margin: '10px 0', padding: '10px', border: '1px solid #ddd' }}>
                  <div><strong>Skill:</strong> {offer.skill || 'N/A'}</div>
                  <div><strong>Message:</strong> {offer.message}</div>
                  <div><strong>Availability:</strong> {offer.availabilityWindow}</div>
                  <div><strong>Status:</strong> {offer.status}</div>
                  {offer.createdAt && (
                    <>
                      <div><strong>Created:</strong> {offer.createdAt}</div>
                      <div style={{ marginTop: '5px', color: '#666' }}>
                        {formatTimeRemaining(offer.createdAt, offer.ttlSeconds)}
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

