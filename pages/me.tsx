import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

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
  const router = useRouter();
  const [data, setData] = useState<MeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
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

  // Theme colors based on dark mode
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
    errorBg: darkMode ? '#3a1f1f' : '#ffebee',
    errorBorder: darkMode ? '#5a2f2f' : '#f44336',
    errorText: darkMode ? '#ff6b6b' : '#c62828',
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
        <div style={{ color: theme.textSecondary }}>Loading...</div>
      </main>
    );
  }

  if (!data) {
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
        <div style={{ color: theme.errorText }}>Error loading data</div>
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
        maxWidth: '1400px',
        margin: '0 auto',
        padding: 'clamp(16px, 4vw, 32px)',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '30px' 
        }}>
        <h1 style={{ 
          margin: 0,
          color: theme.text,
          transition: 'color 0.3s ease'
        }}>
          My Dashboard
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '500',
              backgroundColor: darkMode ? '#4a4a4a' : '#f0f0f0',
              color: darkMode ? '#ffffff' : '#495057',
              border: `1px solid ${theme.border}`,
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
            onClick={() => router.push('/network')}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
              transition: 'background-color 0.2s, transform 0.1s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#0052a3';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#0066cc';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Enter Network →
          </button>
        </div>
      </div>

      {error && (
        <div style={{ 
          marginBottom: '20px', 
          padding: '10px', 
          background: theme.errorBg, 
          border: `1px solid ${theme.errorBorder}`, 
          color: theme.errorText,
          borderRadius: '6px',
          transition: 'all 0.3s ease'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <section style={{ 
        marginBottom: '40px', 
        padding: '20px', 
        border: `1px solid ${theme.border}`, 
        borderRadius: '8px',
        backgroundColor: theme.cardBg,
        boxShadow: theme.shadow,
        transition: 'all 0.3s ease'
      }}>
        <h2 style={{ 
          color: theme.text,
          marginTop: 0,
          transition: 'color 0.3s ease'
        }}>
          Wallet & Profile
        </h2>
        <div style={{ marginBottom: '10px', color: theme.text }}>
          <strong style={{ color: theme.textSecondary }}>Wallet:</strong> {data.wallet}
        </div>

        {data.profile ? (
          <div>
            {!editingProfile ? (
              <>
                <div style={{ marginBottom: '10px', color: theme.text }}>
                  <strong style={{ color: theme.textSecondary }}>Display Name:</strong> {data.profile.displayName}
                </div>
                <div style={{ marginBottom: '10px', color: theme.text }}>
                  <strong style={{ color: theme.textSecondary }}>Skills:</strong> {data.profile.skills}
                </div>
                <div style={{ marginBottom: '10px', color: theme.text }}>
                  <strong style={{ color: theme.textSecondary }}>Timezone:</strong> {data.profile.timezone}
                </div>
                <div style={{ marginBottom: '10px', color: theme.text }}>
                  <strong style={{ color: theme.textSecondary }}>Space ID:</strong> {data.profile.spaceId}
                </div>
                {data.profile.createdAt && (
                  <div style={{ marginBottom: '10px', color: theme.text }}>
                    <strong style={{ color: theme.textSecondary }}>Created:</strong> {data.profile.createdAt}
                  </div>
                )}
                <button
                  onClick={() => setEditingProfile(true)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    marginTop: '10px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#5a6268';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#6c757d';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Edit Profile
                </button>
              </>
            ) : (
              <form onSubmit={handleUpdateProfile}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ color: theme.text }}>
                    Display Name:
                    <input
                      type="text"
                      name="displayName"
                      defaultValue={data.profile.displayName}
                      required
                      style={{ 
                        marginLeft: '10px',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                      }}
                    />
                  </label>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ color: theme.text }}>
                    Skills:
                    <input
                      type="text"
                      name="skills"
                      defaultValue={data.profile.skills}
                      style={{ 
                        marginLeft: '10px',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                      }}
                    />
                  </label>
                </div>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ color: theme.text }}>
                    Timezone:
                    <input
                      type="text"
                      name="timezone"
                      defaultValue={data.profile.timezone}
                      style={{ 
                        marginLeft: '10px',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                      }}
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
                      borderRadius: '6px',
                      cursor: submitting === 'profile' ? 'not-allowed' : 'pointer',
                      marginRight: '10px',
                      transition: 'all 0.2s ease',
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
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: submitting === 'profile' ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
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
              <label style={{ color: theme.text }}>
                Display Name:
                <input 
                  type="text" 
                  name="displayName" 
                  required 
                  style={{ 
                    marginLeft: '10px',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                  }} 
                />
              </label>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ color: theme.text }}>
                Skills:
                <input 
                  type="text" 
                  name="skills" 
                  style={{ 
                    marginLeft: '10px',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                  }} 
                />
              </label>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={{ color: theme.text }}>
                Timezone:
                <input 
                  type="text" 
                  name="timezone" 
                  style={{ 
                    marginLeft: '10px',
                    padding: '6px 10px',
                    borderRadius: '4px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                  }} 
                />
              </label>
            </div>
            <button 
              type="submit" 
              disabled={submitting === 'profile'}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                backgroundColor: submitting === 'profile' ? '#ccc' : '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: submitting === 'profile' ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {submitting === 'profile' ? 'Creating...' : 'Create Profile'}
            </button>
          </form>
        )}
      </section>

      <section style={{ 
        marginBottom: '40px', 
        padding: '20px', 
        border: `1px solid ${theme.border}`, 
        borderRadius: '8px',
        backgroundColor: theme.cardBg,
        boxShadow: theme.shadow,
        transition: 'all 0.3s ease'
      }}>
        <h2 style={{ 
          color: theme.text,
          marginTop: 0,
          transition: 'color 0.3s ease'
        }}>
          My Asks ({data.asks.length})
        </h2>
        <form onSubmit={handleCreateAsk} style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          background: theme.hoverBg,
          borderRadius: '6px',
          border: `1px solid ${theme.borderLight}`
        }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ color: theme.text }}>
              Skill:
              <input 
                type="text" 
                name="skill" 
                required 
                style={{ 
                  marginLeft: '10px',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                }} 
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ color: theme.text }}>
              Message:
              <input 
                type="text" 
                name="message" 
                required 
                style={{ 
                  marginLeft: '10px',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                }} 
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ color: theme.text }}>
              Expiration (default: 1 hour):
              <input 
                type="number" 
                name="expiresIn" 
                min="0.1" 
                step="0.1" 
                placeholder="1" 
                style={{ 
                  marginLeft: '10px', 
                  width: '80px',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                }} 
              />
              <select 
                name="expiresInUnit" 
                defaultValue="hours" 
                style={{ 
                  marginLeft: '5px',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                }}
              >
                <option value="seconds">seconds</option>
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </label>
          </div>
          <button 
            type="submit" 
            disabled={submitting === 'ask'}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: submitting === 'ask' ? '#ccc' : '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: submitting === 'ask' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {submitting === 'ask' ? 'Creating...' : 'Create Ask'}
          </button>
        </form>

        <div>
          {data.asks.length === 0 ? (
            <div style={{ color: theme.textSecondary }}>No asks yet</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {data.asks.map((ask) => (
                <li 
                  key={ask.key} 
                  style={{ 
                    margin: '10px 0', 
                    padding: '15px', 
                    border: `1px solid ${theme.borderLight}`,
                    borderRadius: '6px',
                    backgroundColor: darkMode ? '#3a2525' : '#fff5f5',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = theme.shadow;
                    e.currentTarget.style.borderColor = theme.border;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = theme.borderLight;
                  }}
                >
                  <div style={{ color: theme.text, marginBottom: '6px' }}>
                    <strong style={{ color: theme.textSecondary }}>Skill:</strong> {ask.skill || 'N/A'}
                  </div>
                  <div style={{ color: theme.text, marginBottom: '6px' }}>
                    <strong style={{ color: theme.textSecondary }}>Message:</strong> {ask.message}
                  </div>
                  <div style={{ color: theme.text, marginBottom: '6px' }}>
                    <strong style={{ color: theme.textSecondary }}>Status:</strong> {ask.status}
                  </div>
                  {ask.createdAt && (
                    <>
                      <div style={{ color: theme.text, marginBottom: '6px' }}>
                        <strong style={{ color: theme.textSecondary }}>Created:</strong> {ask.createdAt}
                      </div>
                      <div style={{ marginTop: '8px', padding: '6px 10px', color: theme.textTertiary, backgroundColor: theme.cardBg, borderRadius: '4px', display: 'inline-block' }}>
                        {formatTimeRemaining(ask.createdAt, ask.ttlSeconds)}
                      </div>
                    </>
                  )}
                  {(ask.txHash || txHashMap[ask.key]) && (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: theme.textSecondary }}>
                      <strong>Tx:</strong>{' '}
                      <a
                        href={`https://explorer.mendoza.hoodi.arkiv.network/tx/${ask.txHash || txHashMap[ask.key]!}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          background: darkMode ? '#1a3a5a' : '#e7f3ff', 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          textDecoration: 'none', 
                          color: '#0066cc',
                          transition: 'all 0.2s ease',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(ask.txHash || txHashMap[ask.key]!);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#2a5a7a' : '#d0e7ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#1a3a5a' : '#e7f3ff';
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

      <section style={{ 
        marginBottom: '40px', 
        padding: '20px', 
        border: `1px solid ${theme.border}`, 
        borderRadius: '8px',
        backgroundColor: theme.cardBg,
        boxShadow: theme.shadow,
        transition: 'all 0.3s ease'
      }}>
        <h2 style={{ 
          color: theme.text,
          marginTop: 0,
          transition: 'color 0.3s ease'
        }}>
          My Offers ({data.offers.length})
        </h2>
        <form onSubmit={handleCreateOffer} style={{ 
          marginBottom: '20px', 
          padding: '15px', 
          background: theme.hoverBg,
          borderRadius: '6px',
          border: `1px solid ${theme.borderLight}`
        }}>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ color: theme.text }}>
              Skill:
              <input 
                type="text" 
                name="skill" 
                required 
                style={{ 
                  marginLeft: '10px',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                }} 
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ color: theme.text }}>
              Message:
              <input 
                type="text" 
                name="message" 
                required 
                style={{ 
                  marginLeft: '10px',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                }} 
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ color: theme.text }}>
              Availability Window:
              <input 
                type="text" 
                name="availabilityWindow" 
                required 
                style={{ 
                  marginLeft: '10px',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                }} 
              />
            </label>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ color: theme.text }}>
              Expiration (default: 2 hours):
              <input 
                type="number" 
                name="expiresIn" 
                min="0.1" 
                step="0.1" 
                placeholder="2" 
                style={{ 
                  marginLeft: '10px', 
                  width: '80px',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                }} 
              />
              <select 
                name="expiresInUnit" 
                defaultValue="hours" 
                style={{ 
                  marginLeft: '5px',
                  padding: '6px 10px',
                  borderRadius: '4px',
                  border: `1px solid ${theme.inputBorder}`,
                  backgroundColor: theme.inputBg,
                  color: theme.text,
                }}
              >
                <option value="seconds">seconds</option>
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </label>
          </div>
          <button 
            type="submit" 
            disabled={submitting === 'offer'}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              backgroundColor: submitting === 'offer' ? '#ccc' : '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: submitting === 'offer' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {submitting === 'offer' ? 'Creating...' : 'Create Offer'}
          </button>
        </form>

        <div>
          {data.offers.length === 0 ? (
            <div style={{ color: theme.textSecondary }}>No offers yet</div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {data.offers.map((offer) => (
                <li 
                  key={offer.key} 
                  style={{ 
                    margin: '10px 0', 
                    padding: '15px', 
                    border: `1px solid ${theme.borderLight}`,
                    borderRadius: '6px',
                    backgroundColor: darkMode ? '#253a25' : '#f0f9f4',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = theme.shadow;
                    e.currentTarget.style.borderColor = theme.border;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = theme.borderLight;
                  }}
                >
                  <div style={{ color: theme.text, marginBottom: '6px' }}>
                    <strong style={{ color: theme.textSecondary }}>Skill:</strong> {offer.skill || 'N/A'}
                  </div>
                  <div style={{ color: theme.text, marginBottom: '6px' }}>
                    <strong style={{ color: theme.textSecondary }}>Message:</strong> {offer.message}
                  </div>
                  <div style={{ color: theme.text, marginBottom: '6px' }}>
                    <strong style={{ color: theme.textSecondary }}>Availability:</strong> {offer.availabilityWindow}
                  </div>
                  <div style={{ color: theme.text, marginBottom: '6px' }}>
                    <strong style={{ color: theme.textSecondary }}>Status:</strong> {offer.status}
                  </div>
                  {offer.createdAt && (
                    <>
                      <div style={{ color: theme.text, marginBottom: '6px' }}>
                        <strong style={{ color: theme.textSecondary }}>Created:</strong> {offer.createdAt}
                      </div>
                      <div style={{ marginTop: '8px', padding: '6px 10px', color: theme.textTertiary, backgroundColor: theme.cardBg, borderRadius: '4px', display: 'inline-block' }}>
                        {formatTimeRemaining(offer.createdAt, offer.ttlSeconds)}
                      </div>
                    </>
                  )}
                  {(offer.txHash || txHashMap[offer.key]) && (
                    <div style={{ marginTop: '12px', fontSize: '12px', color: theme.textSecondary }}>
                      <strong>Tx:</strong>{' '}
                      <a
                        href={`https://explorer.mendoza.hoodi.arkiv.network/tx/${offer.txHash || txHashMap[offer.key]!}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ 
                          background: darkMode ? '#1a3a5a' : '#e7f3ff', 
                          padding: '4px 8px', 
                          borderRadius: '4px', 
                          textDecoration: 'none', 
                          color: '#0066cc',
                          transition: 'all 0.2s ease',
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(offer.txHash || txHashMap[offer.key]!);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#2a5a7a' : '#d0e7ff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = darkMode ? '#1a3a5a' : '#e7f3ff';
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
      </div>
    </main>
  );
}

