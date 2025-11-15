import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

type Profile = {
  key: string;
  wallet: string;
  // Core Identity
  displayName: string;
  username?: string;
  profileImage?: string;
  bio?: string;
  bioLong?: string;
  timezone: string;
  languages?: string[];
  contactLinks?: {
    twitter?: string;
    github?: string;
    telegram?: string;
    discord?: string;
  };
  // Skills / Roles
  skills: string;
  skillsArray?: string[];
  seniority?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  domainsOfInterest?: string[];
  mentorRoles?: string[];
  learnerRoles?: string[];
  // Reputation
  sessionsCompleted?: number;
  sessionsGiven?: number;
  sessionsReceived?: number;
  avgRating?: number;
  npsScore?: number;
  topSkillsUsage?: Array<{ skill: string; count: number }>;
  peerTestimonials?: Array<{ text: string; timestamp: string; fromWallet: string }>;
  trustEdges?: string[];
  // System
  lastActiveTimestamp?: string;
  communityAffiliations?: string[];
  reputationScore?: number;
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

function ArkivHelperText({ darkMode }: { darkMode: boolean }) {
  return (
    <div style={{
      marginTop: '6px',
      fontSize: '12px',
      color: darkMode ? '#b0b0b0' : '#6c757d',
      fontStyle: 'italic',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    }}>
      <span>⚠️</span>
      <span>Immutable data. Stored permanently on <a 
        href="https://explorer.mendoza.hoodi.arkiv.network" 
        target="_blank" 
        rel="noopener noreferrer"
        style={{ color: '#0066cc', textDecoration: 'underline' }}
      >Arkiv</a>. Edits only change what is displayed.</span>
    </div>
  );
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
  const [showArkivWarning, setShowArkivWarning] = useState(false);

  // Check if user has dismissed the warning before
  useEffect(() => {
    const hasSeenWarning = localStorage.getItem('arkiv-warning-dismissed');
    if (!hasSeenWarning) {
      setShowArkivWarning(true);
    }
  }, []);

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
    
    // Core Identity
    const displayName = formData.get('displayName') as string;
    const username = formData.get('username') as string;
    const profileImage = formData.get('profileImage') as string;
    const bio = formData.get('bio') as string;
    const bioLong = formData.get('bioLong') as string;
    const timezone = formData.get('timezone') as string;
    const languagesStr = formData.get('languages') as string;
    const languages = languagesStr ? languagesStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    
    // Contact Links
    const contactLinks = {
      twitter: formData.get('contactTwitter') as string || undefined,
      github: formData.get('contactGithub') as string || undefined,
      telegram: formData.get('contactTelegram') as string || undefined,
      discord: formData.get('contactDiscord') as string || undefined,
    };
    // Remove undefined values
    Object.keys(contactLinks).forEach(key => {
      if (!contactLinks[key as keyof typeof contactLinks]) {
        delete contactLinks[key as keyof typeof contactLinks];
      }
    });
    
    // Skills / Roles
    const skills = formData.get('skills') as string;
    const skillsArray = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const seniority = formData.get('seniority') as string || undefined;
    const domainsStr = formData.get('domainsOfInterest') as string;
    const domainsOfInterest = domainsStr ? domainsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const mentorRolesStr = formData.get('mentorRoles') as string;
    const mentorRoles = mentorRolesStr ? mentorRolesStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const learnerRolesStr = formData.get('learnerRoles') as string;
    const learnerRoles = learnerRolesStr ? learnerRolesStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;

    const payload = {
      action: 'createProfile',
      displayName,
      username: username || undefined,
      profileImage: profileImage || undefined,
      bio: bio || undefined,
      bioLong: bioLong || undefined,
      skills,
      skillsArray,
      timezone,
      languages,
      contactLinks: Object.keys(contactLinks).length > 0 ? contactLinks : undefined,
      seniority: seniority as 'beginner' | 'intermediate' | 'advanced' | 'expert' | undefined,
      domainsOfInterest,
      mentorRoles,
      learnerRoles,
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
    
    // Core Identity
    const displayName = formData.get('displayName') as string;
    const username = formData.get('username') as string;
    const profileImage = formData.get('profileImage') as string;
    const bio = formData.get('bio') as string;
    const bioLong = formData.get('bioLong') as string;
    const timezone = formData.get('timezone') as string;
    const languagesStr = formData.get('languages') as string;
    const languages = languagesStr ? languagesStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    
    // Contact Links
    const contactLinks = {
      twitter: formData.get('contactTwitter') as string || undefined,
      github: formData.get('contactGithub') as string || undefined,
      telegram: formData.get('contactTelegram') as string || undefined,
      discord: formData.get('contactDiscord') as string || undefined,
    };
    // Remove undefined values
    Object.keys(contactLinks).forEach(key => {
      if (!contactLinks[key as keyof typeof contactLinks]) {
        delete contactLinks[key as keyof typeof contactLinks];
      }
    });
    
    // Skills / Roles
    const skills = formData.get('skills') as string;
    const skillsArray = skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const seniority = formData.get('seniority') as string || undefined;
    const domainsStr = formData.get('domainsOfInterest') as string;
    const domainsOfInterest = domainsStr ? domainsStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const mentorRolesStr = formData.get('mentorRoles') as string;
    const mentorRoles = mentorRolesStr ? mentorRolesStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;
    const learnerRolesStr = formData.get('learnerRoles') as string;
    const learnerRoles = learnerRolesStr ? learnerRolesStr.split(',').map(s => s.trim()).filter(Boolean) : undefined;

    const payload = {
      action: 'updateProfile',
      displayName,
      username: username || undefined,
      profileImage: profileImage || undefined,
      bio: bio || undefined,
      bioLong: bioLong || undefined,
      skills,
      skillsArray,
      timezone,
      languages,
      contactLinks: Object.keys(contactLinks).length > 0 ? contactLinks : undefined,
      seniority: seniority as 'beginner' | 'intermediate' | 'advanced' | 'expert' | undefined,
      domainsOfInterest,
      mentorRoles,
      learnerRoles,
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

      {/* Arkiv Immutability Warning Modal */}
      {showArkivWarning && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}
        onClick={() => {
          localStorage.setItem('arkiv-warning-dismissed', 'true');
          setShowArkivWarning(false);
        }}
        >
          <div 
            style={{
              backgroundColor: theme.cardBg,
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              border: `2px solid ${theme.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '20px',
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: '700',
                color: theme.errorText,
              }}>
                ⚠️ Attention!
              </h2>
              <button
                onClick={() => {
                  localStorage.setItem('arkiv-warning-dismissed', 'true');
                  setShowArkivWarning(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: theme.textSecondary,
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.hoverBg;
                  e.currentTarget.style.color = theme.text;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = theme.textSecondary;
                }}
              >
                ×
              </button>
            </div>

            <div style={{
              color: theme.text,
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '24px',
            }}>
              <p style={{ marginBottom: '16px' }}>
                <strong>Everything entered on this site is stored on <a 
                  href="https://explorer.mendoza.hoodi.arkiv.network" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#0066cc',
                    textDecoration: 'underline',
                  }}
                >Arkiv</a> and is <strong style={{ color: theme.errorText }}>immutable</strong>.</strong>
              </p>
              
              <p style={{ marginBottom: '16px' }}>
                When you edit your profile, it only changes on the front-end. Each edit creates a new entity on Arkiv. Your previous data remains permanently stored on the blockchain.
              </p>
              
              <p style={{ 
                marginBottom: 0,
                padding: '12px',
                backgroundColor: theme.errorBg,
                borderRadius: '6px',
                border: `1px solid ${theme.errorBorder}`,
                color: theme.errorText,
                fontWeight: '500',
              }}>
                ⚠️ Please be careful with all information you share. Once stored on Arkiv, it cannot be deleted or modified.
              </p>
            </div>

            <button
              onClick={() => {
                localStorage.setItem('arkiv-warning-dismissed', 'true');
                setShowArkivWarning(false);
              }}
              style={{
                width: '100%',
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '600',
                backgroundColor: '#0066cc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#0052a3';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#0066cc';
              }}
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Persistent Arkiv Warning Banner */}
      <div style={{
        marginBottom: '24px',
        padding: '14px 18px',
        backgroundColor: darkMode ? '#2a1f1f' : '#fff3cd',
        border: `1px solid ${darkMode ? '#5a2f2f' : '#ffc107'}`,
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
        <div style={{ flex: 1, color: darkMode ? '#ff6b6b' : '#856404', fontSize: '14px', lineHeight: '1.5' }}>
          <strong>Data stored on Arkiv is immutable.</strong> All information you enter is permanently stored on the{' '}
          <a 
            href="https://explorer.mendoza.hoodi.arkiv.network" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: '#0066cc',
              textDecoration: 'underline',
            }}
          >
            Arkiv blockchain
          </a>
          {' '}and cannot be deleted or modified. Editing creates new entities. Previous data remains on-chain.
        </div>
      </div>

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
                {/* Core Identity */}
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${theme.borderLight}` }}>
                  <h3 style={{ color: theme.text, marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>Core Identity</h3>
                  <div style={{ marginBottom: '8px', color: theme.text }}>
                    <strong style={{ color: theme.textSecondary }}>Display Name:</strong> {data.profile.displayName}
                  </div>
                  {data.profile.username && (
                    <div style={{ marginBottom: '8px', color: theme.text }}>
                      <strong style={{ color: theme.textSecondary }}>Username:</strong> {data.profile.username}
                    </div>
                  )}
                  {data.profile.bio && (
                    <div style={{ marginBottom: '8px', color: theme.text }}>
                      <strong style={{ color: theme.textSecondary }}>Bio:</strong> {data.profile.bio}
                    </div>
                  )}
                  <div style={{ marginBottom: '8px', color: theme.text }}>
                    <strong style={{ color: theme.textSecondary }}>Timezone:</strong> {data.profile.timezone}
                  </div>
                  {data.profile.languages && data.profile.languages.length > 0 && (
                    <div style={{ marginBottom: '8px', color: theme.text }}>
                      <strong style={{ color: theme.textSecondary }}>Languages:</strong> {data.profile.languages.join(', ')}
                    </div>
                  )}
                  {data.profile.contactLinks && Object.keys(data.profile.contactLinks).length > 0 && (
                    <div style={{ marginBottom: '8px', color: theme.text }}>
                      <strong style={{ color: theme.textSecondary }}>Contact:</strong>{' '}
                      {data.profile.contactLinks.twitter && <span>Twitter: {data.profile.contactLinks.twitter} </span>}
                      {data.profile.contactLinks.github && <span>GitHub: {data.profile.contactLinks.github} </span>}
                      {data.profile.contactLinks.telegram && <span>Telegram: {data.profile.contactLinks.telegram} </span>}
                      {data.profile.contactLinks.discord && <span>Discord: {data.profile.contactLinks.discord}</span>}
                    </div>
                  )}
                </div>

                {/* Skills / Roles */}
                <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${theme.borderLight}` }}>
                  <h3 style={{ color: theme.text, marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>Skills & Roles</h3>
                  <div style={{ marginBottom: '8px', color: theme.text }}>
                    <strong style={{ color: theme.textSecondary }}>Skills:</strong> {data.profile.skills || (data.profile.skillsArray ? data.profile.skillsArray.join(', ') : 'None')}
                  </div>
                  {data.profile.seniority && (
                    <div style={{ marginBottom: '8px', color: theme.text }}>
                      <strong style={{ color: theme.textSecondary }}>Seniority:</strong> {data.profile.seniority}
                    </div>
                  )}
                  {data.profile.domainsOfInterest && data.profile.domainsOfInterest.length > 0 && (
                    <div style={{ marginBottom: '8px', color: theme.text }}>
                      <strong style={{ color: theme.textSecondary }}>Domains of Interest:</strong> {data.profile.domainsOfInterest.join(', ')}
                    </div>
                  )}
                  {data.profile.mentorRoles && data.profile.mentorRoles.length > 0 && (
                    <div style={{ marginBottom: '8px', color: theme.text }}>
                      <strong style={{ color: theme.textSecondary }}>Mentor Roles:</strong> {data.profile.mentorRoles.join(', ')}
                    </div>
                  )}
                  {data.profile.learnerRoles && data.profile.learnerRoles.length > 0 && (
                    <div style={{ marginBottom: '8px', color: theme.text }}>
                      <strong style={{ color: theme.textSecondary }}>Learner Roles:</strong> {data.profile.learnerRoles.join(', ')}
                    </div>
                  )}
                </div>

                {/* Reputation */}
                {(data.profile.sessionsCompleted || data.profile.avgRating || data.profile.reputationScore) && (
                  <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: `1px solid ${theme.borderLight}` }}>
                    <h3 style={{ color: theme.text, marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>Reputation</h3>
                    {data.profile.sessionsCompleted !== undefined && (
                      <div style={{ marginBottom: '8px', color: theme.text }}>
                        <strong style={{ color: theme.textSecondary }}>Sessions Completed:</strong> {data.profile.sessionsCompleted}
                      </div>
                    )}
                    {data.profile.sessionsGiven !== undefined && (
                      <div style={{ marginBottom: '8px', color: theme.text }}>
                        <strong style={{ color: theme.textSecondary }}>Sessions Given:</strong> {data.profile.sessionsGiven}
                      </div>
                    )}
                    {data.profile.avgRating !== undefined && data.profile.avgRating > 0 && (
                      <div style={{ marginBottom: '8px', color: theme.text }}>
                        <strong style={{ color: theme.textSecondary }}>Average Rating:</strong> {data.profile.avgRating.toFixed(1)}/5
                      </div>
                    )}
                    {data.profile.reputationScore !== undefined && (
                      <div style={{ marginBottom: '8px', color: theme.text }}>
                        <strong style={{ color: theme.textSecondary }}>Reputation Score:</strong> {data.profile.reputationScore}
                      </div>
                    )}
                  </div>
                )}

                {/* System Info */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ marginBottom: '8px', color: theme.text }}>
                    <strong style={{ color: theme.textSecondary }}>Space ID:</strong> {data.profile.spaceId}
                  </div>
                  {data.profile.createdAt && (
                    <div style={{ marginBottom: '8px', color: theme.text }}>
                      <strong style={{ color: theme.textSecondary }}>Created:</strong> {new Date(data.profile.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>

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
              <form onSubmit={handleUpdateProfile} style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
                {/* Core Identity Section */}
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: `1px solid ${theme.borderLight}` }}>
                  <h3 style={{ color: theme.text, marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>Core Identity</h3>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>
                      Display Name <span style={{ color: theme.errorText }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="displayName"
                      defaultValue={data.profile.displayName}
                      required
                      style={{ 
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        fontSize: '14px',
                      }}
                    />
                    <ArkivHelperText darkMode={darkMode} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Username</label>
                    <input
                      type="text"
                      name="username"
                      defaultValue={data.profile.username || ''}
                      placeholder="e.g. @alice"
                      style={{ 
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        fontSize: '14px',
                      }}
                    />
                    <ArkivHelperText darkMode={darkMode} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Profile Image URL</label>
                    <input
                      type="url"
                      name="profileImage"
                      defaultValue={data.profile.profileImage || ''}
                      placeholder="https://..."
                      style={{ 
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        fontSize: '14px',
                      }}
                    />
                    <ArkivHelperText darkMode={darkMode} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Short Bio</label>
                    <input
                      type="text"
                      name="bio"
                      defaultValue={data.profile.bio || ''}
                      placeholder="Brief description"
                      style={{ 
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        fontSize: '14px',
                      }}
                    />
                    <ArkivHelperText darkMode={darkMode} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Long Bio</label>
                    <textarea
                      name="bioLong"
                      defaultValue={data.profile.bioLong || ''}
                      placeholder="Detailed description"
                      rows={4}
                      style={{ 
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        fontSize: '14px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                    />
                    <ArkivHelperText darkMode={darkMode} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Timezone</label>
                    <input
                      type="text"
                      name="timezone"
                      defaultValue={data.profile.timezone}
                      placeholder="e.g. UTC-5, America/New_York"
                      style={{ 
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        fontSize: '14px',
                      }}
                    />
                    <ArkivHelperText darkMode={darkMode} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Languages (comma-separated)</label>
                    <input
                      type="text"
                      name="languages"
                      defaultValue={data.profile.languages ? data.profile.languages.join(', ') : ''}
                      placeholder="e.g. English, Spanish, French"
                      style={{ 
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        fontSize: '14px',
                      }}
                    />
                    <ArkivHelperText darkMode={darkMode} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: theme.text, display: 'block', marginBottom: '8px' }}>Contact Links</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <input
                        type="text"
                        name="contactTwitter"
                        defaultValue={data.profile.contactLinks?.twitter || ''}
                        placeholder="Twitter/X handle"
                        style={{ 
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${theme.inputBorder}`,
                          backgroundColor: theme.inputBg,
                          color: theme.text,
                          fontSize: '14px',
                        }}
                      />
                      <input
                        type="text"
                        name="contactGithub"
                        defaultValue={data.profile.contactLinks?.github || ''}
                        placeholder="GitHub username"
                        style={{ 
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${theme.inputBorder}`,
                          backgroundColor: theme.inputBg,
                          color: theme.text,
                          fontSize: '14px',
                        }}
                      />
                      <input
                        type="text"
                        name="contactTelegram"
                        defaultValue={data.profile.contactLinks?.telegram || ''}
                        placeholder="Telegram handle"
                        style={{ 
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${theme.inputBorder}`,
                          backgroundColor: theme.inputBg,
                          color: theme.text,
                          fontSize: '14px',
                        }}
                      />
                      <input
                        type="text"
                        name="contactDiscord"
                        defaultValue={data.profile.contactLinks?.discord || ''}
                        placeholder="Discord username"
                        style={{ 
                          padding: '8px 12px',
                          borderRadius: '6px',
                          border: `1px solid ${theme.inputBorder}`,
                          backgroundColor: theme.inputBg,
                          color: theme.text,
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <ArkivHelperText darkMode={darkMode} />
                  </div>
                </div>

                {/* Skills / Roles Section */}
                <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: `1px solid ${theme.borderLight}` }}>
                  <h3 style={{ color: theme.text, marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>Skills & Roles</h3>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Skills (comma-separated)</label>
                    <input
                      type="text"
                      name="skills"
                      defaultValue={data.profile.skills || (data.profile.skillsArray ? data.profile.skillsArray.join(', ') : '')}
                      placeholder="e.g. solidity, react, design"
                      style={{ 
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        fontSize: '14px',
                      }}
                    />
                    <ArkivHelperText darkMode={darkMode} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Seniority Level</label>
                    <select
                      name="seniority"
                      defaultValue={data.profile.seniority || ''}
                      style={{ 
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        fontSize: '14px',
                      }}
                    >
                      <option value="">Select...</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                      <option value="expert">Expert</option>
                    </select>
                    <ArkivHelperText darkMode={darkMode} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Domains of Interest (comma-separated)</label>
                    <input
                      type="text"
                      name="domainsOfInterest"
                      defaultValue={data.profile.domainsOfInterest ? data.profile.domainsOfInterest.join(', ') : ''}
                      placeholder="e.g. AI agents, infra, cryptography, zk, design"
                      style={{ 
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        fontSize: '14px',
                      }}
                    />
                    <ArkivHelperText darkMode={darkMode} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Mentor Roles (comma-separated)</label>
                    <input
                      type="text"
                      name="mentorRoles"
                      defaultValue={data.profile.mentorRoles ? data.profile.mentorRoles.join(', ') : ''}
                      placeholder="e.g. technical mentor, product mentor, founder coach"
                      style={{ 
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        fontSize: '14px',
                      }}
                    />
                    <ArkivHelperText darkMode={darkMode} />
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Learner Roles (comma-separated)</label>
                    <input
                      type="text"
                      name="learnerRoles"
                      defaultValue={data.profile.learnerRoles ? data.profile.learnerRoles.join(', ') : ''}
                      placeholder="What you want to learn"
                      style={{ 
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: `1px solid ${theme.inputBorder}`,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        fontSize: '14px',
                      }}
                    />
                    <ArkivHelperText darkMode={darkMode} />
                  </div>
                </div>

                <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                  <button
                    type="submit"
                    disabled={submitting === 'profile'}
                    style={{
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: submitting === 'profile' ? '#ccc' : '#0066cc',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: submitting === 'profile' ? 'not-allowed' : 'pointer',
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
                      padding: '10px 20px',
                      fontSize: '14px',
                      fontWeight: '500',
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
          <form onSubmit={handleCreateProfile} style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '10px' }}>
            <p style={{ color: theme.textSecondary, marginBottom: '20px', fontSize: '14px' }}>
              Create your profile to start participating in the mentorship network. All fields except Display Name are optional.
            </p>

            {/* Core Identity Section */}
            <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: `1px solid ${theme.borderLight}` }}>
              <h3 style={{ color: theme.text, marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>Core Identity</h3>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>
                  Display Name <span style={{ color: theme.errorText }}>*</span>
                </label>
                <input
                  type="text"
                  name="displayName"
                  required
                  style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: '14px',
                  }}
                />
                <ArkivHelperText darkMode={darkMode} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Username</label>
                <input
                  type="text"
                  name="username"
                  placeholder="e.g. @alice"
                  style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: '14px',
                  }}
                />
                <ArkivHelperText darkMode={darkMode} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Profile Image URL</label>
                <input
                  type="url"
                  name="profileImage"
                  placeholder="https://..."
                  style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: '14px',
                  }}
                />
                <ArkivHelperText darkMode={darkMode} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Short Bio</label>
                <input
                  type="text"
                  name="bio"
                  placeholder="Brief description"
                  style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: '14px',
                  }}
                />
                <ArkivHelperText darkMode={darkMode} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Timezone</label>
                <input
                  type="text"
                  name="timezone"
                  placeholder="e.g. UTC-5, America/New_York"
                  style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: '14px',
                  }}
                />
                <ArkivHelperText darkMode={darkMode} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Languages (comma-separated)</label>
                <input
                  type="text"
                  name="languages"
                  placeholder="e.g. English, Spanish, French"
                  style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: '14px',
                  }}
                />
                <ArkivHelperText darkMode={darkMode} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: theme.text, display: 'block', marginBottom: '8px' }}>Contact Links</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <input
                    type="text"
                    name="contactTwitter"
                    placeholder="Twitter/X handle"
                    style={{ 
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${theme.inputBorder}`,
                      backgroundColor: theme.inputBg,
                      color: theme.text,
                      fontSize: '14px',
                    }}
                  />
                  <input
                    type="text"
                    name="contactGithub"
                    placeholder="GitHub username"
                    style={{ 
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${theme.inputBorder}`,
                      backgroundColor: theme.inputBg,
                      color: theme.text,
                      fontSize: '14px',
                    }}
                  />
                  <input
                    type="text"
                    name="contactTelegram"
                    placeholder="Telegram handle"
                    style={{ 
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${theme.inputBorder}`,
                      backgroundColor: theme.inputBg,
                      color: theme.text,
                      fontSize: '14px',
                    }}
                  />
                  <input
                    type="text"
                    name="contactDiscord"
                    placeholder="Discord username"
                    style={{ 
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: `1px solid ${theme.inputBorder}`,
                      backgroundColor: theme.inputBg,
                      color: theme.text,
                      fontSize: '14px',
                    }}
                  />
                </div>
                <ArkivHelperText darkMode={darkMode} />
              </div>
            </div>

            {/* Skills / Roles Section */}
            <div style={{ marginBottom: '24px', paddingBottom: '20px', borderBottom: `1px solid ${theme.borderLight}` }}>
              <h3 style={{ color: theme.text, marginTop: 0, marginBottom: '16px', fontSize: '18px' }}>Skills & Roles</h3>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Skills (comma-separated)</label>
                <input
                  type="text"
                  name="skills"
                  placeholder="e.g. solidity, react, design"
                  style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: '14px',
                  }}
                />
                <ArkivHelperText darkMode={darkMode} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Seniority Level</label>
                <select
                  name="seniority"
                  style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: '14px',
                  }}
                >
                  <option value="">Select...</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="expert">Expert</option>
                </select>
                <ArkivHelperText darkMode={darkMode} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Domains of Interest (comma-separated)</label>
                <input
                  type="text"
                  name="domainsOfInterest"
                  placeholder="e.g. AI agents, infra, cryptography, zk, design"
                  style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: '14px',
                  }}
                />
                <ArkivHelperText darkMode={darkMode} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Mentor Roles (comma-separated)</label>
                <input
                  type="text"
                  name="mentorRoles"
                  placeholder="e.g. technical mentor, product mentor, founder coach"
                  style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: '14px',
                  }}
                />
                <ArkivHelperText darkMode={darkMode} />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>Learner Roles (comma-separated)</label>
                <input
                  type="text"
                  name="learnerRoles"
                  placeholder="What you want to learn"
                  style={{ 
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: `1px solid ${theme.inputBorder}`,
                    backgroundColor: theme.inputBg,
                    color: theme.text,
                    fontSize: '14px',
                  }}
                />
                <ArkivHelperText darkMode={darkMode} />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submitting === 'profile'}
              style={{
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '500',
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
            <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>
              Skill:
            </label>
            <input 
              type="text" 
              name="skill" 
              required 
              style={{ 
                width: '100%',
                padding: '6px 10px',
                borderRadius: '4px',
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.inputBg,
                color: theme.text,
              }} 
            />
            <ArkivHelperText darkMode={darkMode} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>
              Message:
            </label>
            <input 
              type="text" 
              name="message" 
              required 
              style={{ 
                width: '100%',
                padding: '6px 10px',
                borderRadius: '4px',
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.inputBg,
                color: theme.text,
              }} 
            />
            <ArkivHelperText darkMode={darkMode} />
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
            <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>
              Skill:
            </label>
            <input 
              type="text" 
              name="skill" 
              required 
              style={{ 
                width: '100%',
                padding: '6px 10px',
                borderRadius: '4px',
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.inputBg,
                color: theme.text,
              }} 
            />
            <ArkivHelperText darkMode={darkMode} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>
              Message:
            </label>
            <input 
              type="text" 
              name="message" 
              required 
              style={{ 
                width: '100%',
                padding: '6px 10px',
                borderRadius: '4px',
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.inputBg,
                color: theme.text,
              }} 
            />
            <ArkivHelperText darkMode={darkMode} />
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ color: theme.text, display: 'block', marginBottom: '4px' }}>
              Availability Window:
            </label>
            <input 
              type="text" 
              name="availabilityWindow" 
              required 
              style={{ 
                width: '100%',
                padding: '6px 10px',
                borderRadius: '4px',
                border: `1px solid ${theme.inputBorder}`,
                backgroundColor: theme.inputBg,
                color: theme.text,
              }} 
            />
            <ArkivHelperText darkMode={darkMode} />
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

