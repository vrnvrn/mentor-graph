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

function shortenHash(hash: string): string {
  if (!hash || hash.length < 10) return hash;
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

export default function Me() {
  const [data, setData] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [, setNow] = useState(Date.now());
  const [txHashMap, setTxHashMap] = useState<Record<string, string>>({});
  const [editingProfile, setEditingProfile] = useState(false);

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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting('profile');
    setError(null);
    const formData = new FormData(e.target as HTMLFormElement);
    const displayName = formData.get('displayName') as string;
    const skills = formData.get('skills') as string;
    const timezone = formData.get('timezone') as string;

    const payload = {
      action: 'updateProfile',
      displayName,
      skills,
      timezone,
    };
    console.log('Updating profile:', payload);

    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const result = await res.json();
        console.log('Profile updated:', result);
        setEditingProfile(false);
        fetchMe();
      } else {
        const errorData = await res.json();
        console.error('Error updating profile:', res.status, errorData);
        setError(`Failed to update profile: ${errorData.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Network error updating profile');
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
    const expiresInValue = formData.get('expiresIn') as string;
    const expiresInUnit = formData.get('expiresInUnit') as string;

    let expiresIn: number | undefined;
    if (expiresInValue) {
      const value = parseFloat(expiresInValue);
      const multiplier = expiresInUnit === 'minutes' ? 60 : expiresInUnit === 'hours' ? 3600 : expiresInUnit === 'days' ? 86400 : 1;
      expiresIn = Math.floor(value * multiplier);
    }

    const payload = {
      action: 'createAsk',
      skill,
      message,
      expiresIn: expiresIn || undefined,
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
        if (result.key && result.txHash) {
          setTxHashMap(prev => ({ ...prev, [result.key]: result.txHash }));
        }
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
    const expiresInValue = formData.get('expiresIn') as string;
    const expiresInUnit = formData.get('expiresInUnit') as string;

    let expiresIn: number | undefined;
    if (expiresInValue) {
      const value = parseFloat(expiresInValue);
      const multiplier = expiresInUnit === 'minutes' ? 60 : expiresInUnit === 'hours' ? 3600 : expiresInUnit === 'days' ? 86400 : 1;
      expiresIn = Math.floor(value * multiplier);
    }

    const payload = {
      action: 'createOffer',
      skill,
      message,
      availabilityWindow,
      expiresIn: expiresIn || undefined,
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
        if (result.key && result.txHash) {
          setTxHashMap(prev => ({ ...prev, [result.key]: result.txHash }));
        }
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
            {!editingProfile ? (
              <>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Display Name:</strong> {data.profile.displayName}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Skills:</strong> {data.profile.skills}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Timezone:</strong> {data.profile.timezone}
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <strong>Space ID:</strong> {data.profile.spaceId}
                </div>
                {data.profile.createdAt && (
                  <div style={{ marginBottom: '10px' }}>
                    <strong>Created:</strong> {data.profile.createdAt}
                  </div>
                )}
                <button
                  onClick={() => setEditingProfile(true)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    backgroundColor: '#666',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginTop: '10px',
                  }}
                >
                  Edit Profile
                </button>
              </>
            ) : (
              <form onSubmit={handleUpdateProfile}>
                <div style={{ marginBottom: '10px' }}>
                  <label>
                    Display Name:
                    <input
                      type="text"
                      name="displayName"
                      defaultValue={data.profile.displayName}
                      required
                      style={{ marginLeft: '10px' }}
                    />
                  </label>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>
                    Skills:
                    <input
                      type="text"
                      name="skills"
                      defaultValue={data.profile.skills}
                      style={{ marginLeft: '10px' }}
                    />
                  </label>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label>
                    Timezone:
                    <input
                      type="text"
                      name="timezone"
                      defaultValue={data.profile.timezone}
                      style={{ marginLeft: '10px' }}
                    />
                  </label>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <button
                    type="submit"
                    disabled={submitting === 'profile'}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: submitting === 'profile' ? '#ccc' : '#0066cc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: submitting === 'profile' ? 'not-allowed' : 'pointer',
                      marginRight: '10px',
                    }}
                  >
                    {submitting === 'profile' ? 'Updating...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    disabled={submitting === 'profile'}
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      backgroundColor: '#999',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: submitting === 'profile' ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
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
          <div style={{ marginBottom: '10px' }}>
            <label>
              Expiration (default: 1 hour):
              <input type="number" name="expiresIn" min="0.1" step="0.1" placeholder="1" style={{ marginLeft: '10px', width: '80px' }} />
              <select name="expiresInUnit" defaultValue="hours" style={{ marginLeft: '5px' }}>
                <option value="seconds">seconds</option>
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
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
                  {(ask.txHash || txHashMap[ask.key]) && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                      <strong>Tx:</strong>{' '}
                      <a
                        href={`https://explorer.mendoza.hoodi.arkiv.network/tx/${ask.txHash || txHashMap[ask.key]!}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px', textDecoration: 'none', color: '#0066cc' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(ask.txHash || txHashMap[ask.key]!);
                        }}
                        title="Click to open in explorer (copies hash to clipboard)">
                        {shortenHash(ask.txHash || txHashMap[ask.key]!)}
                      </a>
                    </div>
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
          <div style={{ marginBottom: '10px' }}>
            <label>
              Expiration (default: 2 hours):
              <input type="number" name="expiresIn" min="0.1" step="0.1" placeholder="2" style={{ marginLeft: '10px', width: '80px' }} />
              <select name="expiresInUnit" defaultValue="hours" style={{ marginLeft: '5px' }}>
                <option value="seconds">seconds</option>
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
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
                  {(offer.txHash || txHashMap[offer.key]) && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                      <strong>Tx:</strong>{' '}
                      <a
                        href={`https://explorer.mendoza.hoodi.arkiv.network/tx/${offer.txHash || txHashMap[offer.key]!}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px', textDecoration: 'none', color: '#0066cc' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(offer.txHash || txHashMap[offer.key]!);
                        }}
                        title="Click to open in explorer (copies hash to clipboard)">
                        {shortenHash(offer.txHash || txHashMap[offer.key]!)}
                      </a>
                    </div>
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

