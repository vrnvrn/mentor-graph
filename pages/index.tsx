import React from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  const handleConnect = () => {
    router.push('/me');
  };

  const networkPattern = `data:image/svg+xml,${encodeURIComponent(`
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="network" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
          <circle cx="50" cy="50" r="3" fill="rgba(0, 102, 204, 0.1)"/>
          <circle cx="150" cy="50" r="3" fill="rgba(0, 102, 204, 0.1)"/>
          <circle cx="50" cy="150" r="3" fill="rgba(0, 102, 204, 0.1)"/>
          <circle cx="150" cy="150" r="3" fill="rgba(0, 102, 204, 0.1)"/>
          <circle cx="100" cy="100" r="4" fill="rgba(0, 102, 204, 0.15)"/>
          <line x1="50" y1="50" x2="100" y2="100" stroke="rgba(0, 102, 204, 0.08)" stroke-width="1"/>
          <line x1="150" y1="50" x2="100" y2="100" stroke="rgba(0, 102, 204, 0.08)" stroke-width="1"/>
          <line x1="50" y1="150" x2="100" y2="100" stroke="rgba(0, 102, 204, 0.08)" stroke-width="1"/>
          <line x1="150" y1="150" x2="100" y2="100" stroke="rgba(0, 102, 204, 0.08)" stroke-width="1"/>
          <line x1="50" y1="50" x2="150" y2="50" stroke="rgba(0, 102, 204, 0.05)" stroke-width="1"/>
          <line x1="50" y1="50" x2="50" y2="150" stroke="rgba(0, 102, 204, 0.05)" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#network)"/>
    </svg>
  `)}`;

  return (
    <main style={{
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      maxWidth: '800px',
      margin: '0 auto',
      textAlign: 'center',
      position: 'relative',
      backgroundImage: `url("${networkPattern}")`,
      backgroundSize: '400px 400px',
      backgroundPosition: 'center',
      backgroundRepeat: 'repeat',
    }}>
      <div style={{
        position: 'relative',
        zIndex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '60px 40px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      }}>
        <h1 style={{
          fontSize: '64px',
          fontWeight: 'bold',
          marginBottom: '24px',
          color: '#333',
        }}>
          MentorGraph
        </h1>
        
        <h2 style={{
          fontSize: '26px',
          fontWeight: 'normal',
          color: '#666',
          marginBottom: '32px',
          lineHeight: '1.5',
        }}>
          A real-time mentorship network where your data lives on Arkiv and belongs to you.
        </h2>

        <p style={{
          fontSize: '18px',
          color: '#555',
          marginBottom: '40px',
          lineHeight: '1.6',
          maxWidth: '600px',
        }}>
          Connect your wallet to load your public mentorship profile and share your asks/offers with your network.
        </p>

        <button
          onClick={handleConnect}
          style={{
            padding: '16px 36px',
            fontSize: '20px',
            fontWeight: '500',
            backgroundColor: '#0066cc',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = '#0052a3';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = '#0066cc';
          }}
        >
          Connect Wallet
        </button>
      </div>
    </main>
  );
}
