import React, { useEffect, useState } from 'react';

export default function Profiles() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [displayName, setDisplayName] = useState('');
  const [skills, setSkills] = useState('');
  const [timezone, setTimezone] = useState('');
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  const fetchProfiles = async () => {
    try {
      const res = await fetch('/api/profiles');
      const data = await res.json();
      setProfiles(data || []);
    } catch (err) {
      console.error('Error fetching profiles:', err);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName, skills, timezone }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastTxHash(data.txHash || null);
        setDisplayName('');
        setSkills('');
        setTimezone('');
        fetchProfiles();
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
        <button type="submit">Create Profile</button>
      </form>

      {lastTxHash && (
        <div style={{ margin: '10px 0', padding: '10px', background: '#e8f5e9', border: '1px solid #4caf50' }}>
          <strong>Last Transaction Hash:</strong> {lastTxHash}
        </div>
      )}

      <h2>Profile List</h2>
      <ul>
        {profiles.map((profile: any) => (
          <li key={profile.key}>
            <strong>{profile.displayName || 'N/A'}</strong> - {profile.skills || 'N/A'} - {profile.timezone || 'N/A'}
            <div style={{ fontSize: '12px', color: '#666' }}>Key: {profile.key}</div>
          </li>
        ))}
      </ul>
    </main>
  );
}

