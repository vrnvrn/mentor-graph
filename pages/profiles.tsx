import React, { useEffect, useState } from 'react';

export default function Profiles() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [skills, setSkills] = useState('');
  const [timezone, setTimezone] = useState('');
  const [spaceId, setSpaceId] = useState('local-dev');
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [skillFilter, setSkillFilter] = useState('');

  const fetchProfiles = async (skill?: string) => {
    try {
      const url = skill ? `/api/profiles?skill=${encodeURIComponent(skill)}` : '/api/profiles';
      const res = await fetch(url);
      const data = await res.json();
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  };

  useEffect(() => {
    fetchProfiles(skillFilter || undefined);
  }, [skillFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, skills, timezone, spaceId }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastTxHash(data.txHash || null);
        setDisplayName('');
        setSkills('');
        setTimezone('');
        setSpaceId('local-dev');
        fetchProfiles(skillFilter || undefined);
      }
    } catch (err) {
      console.error('Error creating profile:', err);
    }
  };

  return (
    <main style={{ padding: '20px' }}>
      <h1>Profiles</h1>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label>
            Display Name:
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </label>
        </div>
        <div>
          <label>
            Skills:
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Timezone:
            <input
              type="text"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            />
          </label>
        </div>
        <div>
          <label>
            Space ID:
            <input
              type="text"
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
            />
          </label>
        </div>
        <button type="submit">Create Profile</button>
      </form>

      {lastTxHash && (
        <div style={{ margin: '10px 0', padding: '10px', background: '#e8f5e9', border: '1px solid #4caf50' }}>
          <strong>Last Transaction Hash:</strong> {lastTxHash}
        </div>
      )}

      <div style={{ margin: '20px 0' }}>
        <label>
          Filter by skill:
          <input
            type="text"
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            placeholder="e.g. solidity"
            style={{ marginLeft: '10px', padding: '5px' }}
          />
        </label>
      </div>

      <h2>Profile List</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {profiles.map((profile: any) => (
          <li key={profile.key} style={{ margin: '15px 0', padding: '15px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ fontSize: '18px' }}>{profile.displayName || 'N/A'}</strong>
            </div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
              <strong>Skills:</strong> {profile.skills || 'N/A'}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
              <strong>Timezone:</strong> {profile.timezone || 'N/A'}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
              <strong>Space ID:</strong> {profile.spaceId || 'N/A'}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
              <strong>Wallet:</strong> {profile.wallet || 'N/A'}
            </div>
            <div style={{ fontSize: '14px', marginBottom: '4px' }}>
              <strong>Created:</strong> {profile.createdAt ? new Date(profile.createdAt).toLocaleString() : 'N/A'}
            </div>
            {profile.txHash && (
              <div style={{ fontSize: '12px', marginBottom: '4px', color: '#4caf50' }}>
                <strong>Tx Hash:</strong> {profile.txHash}
              </div>
            )}
            <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
              <strong>Entity Key:</strong> {profile.key}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

