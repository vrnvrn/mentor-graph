import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);

  const handleConnect = () => {
    router.push('/me');
  };

  // Set body background to match theme
  useEffect(() => {
    document.body.style.backgroundColor = darkMode ? '#1a1a1a' : '#ffffff';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
    };
  }, [darkMode]);

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

  const theme = {
    bg: darkMode ? '#1a1a1a' : '#ffffff',
    cardBg: darkMode ? 'rgba(45, 45, 45, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    text: darkMode ? '#e0e0e0' : '#333',
    textSecondary: darkMode ? '#b0b0b0' : '#666',
    textTertiary: darkMode ? '#888888' : '#555',
  };

  return (
    <main style={{
      minHeight: '100vh',
      width: '100%',
      margin: 0,
      padding: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      position: 'relative',
      backgroundColor: theme.bg,
      backgroundImage: darkMode ? 'none' : `url("${networkPattern}")`,
      backgroundSize: '400px 400px',
      backgroundPosition: 'center',
      backgroundRepeat: 'repeat',
      transition: 'background-color 0.3s ease',
    }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 10,
      }}>
        <button
          onClick={() => setDarkMode(!darkMode)}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: '500',
            backgroundColor: darkMode ? '#4a4a4a' : '#f0f0f0',
            color: darkMode ? '#ffffff' : '#495057',
            border: `1px solid ${darkMode ? '#404040' : '#dee2e6'}`,
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
      </div>
      <div style={{
        position: 'relative',
        zIndex: 1,
        backgroundColor: theme.cardBg,
        padding: 'clamp(40px, 8vw, 60px) clamp(24px, 5vw, 40px)',
        borderRadius: '12px',
        boxShadow: darkMode ? '0 4px 20px rgba(0, 0, 0, 0.5)' : '0 4px 20px rgba(0, 0, 0, 0.1)',
        maxWidth: '800px',
        width: '90%',
        margin: '0 auto',
        transition: 'all 0.3s ease',
      }}>
        <h1 style={{
          fontSize: '64px',
          fontWeight: 'bold',
          marginBottom: '24px',
          color: theme.text,
          transition: 'color 0.3s ease',
        }}>
          MentorGraph
        </h1>
        
        <h2 style={{
          fontSize: '26px',
          fontWeight: 'normal',
          color: theme.textSecondary,
          marginBottom: '32px',
          lineHeight: '1.5',
          transition: 'color 0.3s ease',
        }}>
          A real-time mentorship network where your data lives on Arkiv and belongs to you.
        </h2>

        <p style={{
          fontSize: '18px',
          color: theme.textTertiary,
          marginBottom: '40px',
          lineHeight: '1.6',
          maxWidth: '600px',
          margin: '0 auto 40px',
          transition: 'color 0.3s ease',
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
