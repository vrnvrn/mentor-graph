import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { connectWallet } from '../src/wallet';

export default function Home() {
  const router = useRouter();
  // Initialize dark mode - use false for SSR, update in useEffect to avoid hydration mismatch
  const [darkMode, setDarkMode] = useState(false);
  
  // Set dark mode from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('darkMode');
      if (saved === 'true') {
        setDarkMode(true);
      }
    }
  }, []);
  const [connecting, setConnecting] = useState(false);
  const [loadingExample, setLoadingExample] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      const address = await connectWallet();
      // Store wallet address in localStorage for session persistence
      localStorage.setItem('connectedWallet', address);
      // Redirect to dashboard
      router.push('/me');
    } catch (err: any) {
      console.error('Failed to connect wallet:', err);
      setError(err.message || 'Failed to connect wallet');
      setConnecting(false);
    }
  };

  const handleExampleWallet = async () => {
    try {
      setLoadingExample(true);
      setError(null);
      const res = await fetch('/api/wallet');
      if (!res.ok) {
        throw new Error('Failed to fetch example wallet');
      }
      const data = await res.json();
      if (!data.address) {
        throw new Error('No example wallet available');
      }
      // Store wallet address in localStorage for session persistence
      localStorage.setItem('connectedWallet', data.address);
      // Redirect to dashboard
      router.push('/me');
    } catch (err: any) {
      console.error('Failed to load example wallet:', err);
      setError(err.message || 'Failed to load example wallet');
      setLoadingExample(false);
    }
  };

  // Set body background to match theme and persist dark mode
  useEffect(() => {
    document.body.style.backgroundColor = darkMode ? '#1a1a1a' : '#ffffff';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    // Persist dark mode preference
    localStorage.setItem('darkMode', darkMode.toString());
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.margin = '';
      document.body.style.padding = '';
    };
  }, [darkMode]);

  // Bioluminescent forest pattern - organic, glowing nodes
  const forestPattern = `data:image/svg+xml,${encodeURIComponent(`
    <svg width="600" height="600" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="glow1" cx="50%" cy="50%">
          <stop offset="0%" stop-color="rgba(76, 175, 80, 0.4)" stop-opacity="1"/>
          <stop offset="100%" stop-color="rgba(76, 175, 80, 0)" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="glow2" cx="50%" cy="50%">
          <stop offset="0%" stop-color="rgba(139, 195, 74, 0.3)" stop-opacity="1"/>
          <stop offset="100%" stop-color="rgba(139, 195, 74, 0)" stop-opacity="0"/>
        </radialGradient>
        <pattern id="forest" x="0" y="0" width="300" height="300" patternUnits="userSpaceOnUse">
          <!-- Organic glowing nodes like bioluminescent flora -->
          <circle cx="80" cy="80" r="8" fill="url(#glow1)"/>
          <circle cx="220" cy="60" r="6" fill="url(#glow2)"/>
          <circle cx="150" cy="150" r="10" fill="url(#glow1)"/>
          <circle cx="50" cy="200" r="7" fill="url(#glow2)"/>
          <circle cx="250" cy="180" r="5" fill="url(#glow1)"/>
          <circle cx="100" cy="250" r="6" fill="url(#glow2)"/>
          <!-- Subtle connecting lines like mycelium -->
          <path d="M 80,80 Q 120,100 150,150" stroke="rgba(76, 175, 80, 0.15)" stroke-width="1.5" fill="none"/>
          <path d="M 220,60 Q 200,120 150,150" stroke="rgba(139, 195, 74, 0.12)" stroke-width="1.5" fill="none"/>
          <path d="M 150,150 Q 100,180 50,200" stroke="rgba(76, 175, 80, 0.1)" stroke-width="1" fill="none"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#forest)"/>
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
      backgroundColor: darkMode ? '#0a0a0a' : '#f5f9f5',
      backgroundImage: `url("${forestPattern}")`,
      backgroundSize: darkMode ? '600px 600px' : '400px 400px',
      backgroundPosition: 'center',
      backgroundRepeat: 'repeat',
      transition: 'background-color 0.3s ease',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 10,
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
      }}>
        <a
          href="https://github.com/understories/mentor-graph"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            backgroundColor: darkMode ? '#4a4a4a' : '#f0f0f0',
            color: darkMode ? '#ffffff' : '#495057',
            border: `1px solid ${darkMode ? '#404040' : '#dee2e6'}`,
            borderRadius: '6px',
            textDecoration: 'none',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = darkMode ? '#5a5a5a' : '#e0e0e0';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = darkMode ? '#4a4a4a' : '#f0f0f0';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          title="View on GitHub"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ display: 'block' }}
          >
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
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
      {/* Subtle glowing overlay for dark mode */}
      {darkMode && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 30% 20%, rgba(76, 175, 80, 0.08) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(139, 195, 74, 0.06) 0%, transparent 50%)',
          pointerEvents: 'none',
        }} />
      )}
      
      <div style={{
        position: 'relative',
        zIndex: 1,
        backgroundColor: darkMode ? 'rgba(26, 26, 26, 0.85)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(10px)',
        padding: 'clamp(40px, 8vw, 60px) clamp(24px, 5vw, 40px)',
        borderRadius: '20px',
        border: darkMode 
          ? '1px solid rgba(76, 175, 80, 0.2)' 
          : '1px solid rgba(76, 175, 80, 0.1)',
        boxShadow: darkMode 
          ? '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 40px rgba(76, 175, 80, 0.1), inset 0 0 20px rgba(76, 175, 80, 0.05)' 
          : '0 8px 32px rgba(0, 0, 0, 0.1), 0 0 20px rgba(76, 175, 80, 0.05)',
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
          textShadow: darkMode 
            ? '0 0 20px rgba(76, 175, 80, 0.3), 0 0 40px rgba(76, 175, 80, 0.1)' 
            : 'none',
          letterSpacing: '-0.02em',
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
          A real-time mentorship network where your data grows in the Arkiv garden and belongs to you.
        </h2>

        <p style={{
          fontSize: '18px',
          color: theme.textTertiary,
          marginBottom: '40px',
          lineHeight: '1.6',
          maxWidth: '600px',
          margin: '0 auto 40px',
          transition: 'color 0.3s ease',
          fontStyle: 'italic',
        }}>
          Let knowledge and network be lights to guide our way in the dark forest.
          <br /><br />
          Connect your wallet to begin.
        </p>

        {error && (
          <div style={{
            padding: '12px 20px',
            marginBottom: '20px',
            backgroundColor: darkMode ? '#4a1a1a' : '#ffe6e6',
            color: darkMode ? '#ff6b6b' : '#cc0000',
            borderRadius: '6px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={handleConnect}
            disabled={connecting || loadingExample}
            style={{
              padding: '16px 36px',
              fontSize: '20px',
              fontWeight: '500',
              background: (connecting || loadingExample) 
                ? '#888' 
                : darkMode
                  ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.9) 0%, rgba(46, 125, 50, 0.9) 100%)'
                  : 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
              color: 'white',
              border: darkMode && !(connecting || loadingExample)
                ? '1px solid rgba(76, 175, 80, 0.5)'
                : 'none',
              borderRadius: '12px',
              cursor: (connecting || loadingExample) ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s ease',
              opacity: (connecting || loadingExample) ? 0.7 : 1,
              width: '100%',
              maxWidth: '300px',
              boxShadow: (connecting || loadingExample) 
                ? 'none' 
                : darkMode
                  ? '0 4px 20px rgba(76, 175, 80, 0.3), 0 0 30px rgba(76, 175, 80, 0.1)'
                  : '0 4px 20px rgba(76, 175, 80, 0.2)',
            }}
            onMouseOver={(e) => {
              if (!connecting && !loadingExample) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = darkMode
                  ? '0 6px 24px rgba(76, 175, 80, 0.4), 0 0 40px rgba(76, 175, 80, 0.15)'
                  : '0 6px 24px rgba(76, 175, 80, 0.3)';
              }
            }}
            onMouseOut={(e) => {
              if (!connecting && !loadingExample) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = darkMode
                  ? '0 4px 20px rgba(76, 175, 80, 0.3), 0 0 30px rgba(76, 175, 80, 0.1)'
                  : '0 4px 20px rgba(76, 175, 80, 0.2)';
              }
            }}
          >
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
          
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            width: '100%', 
            maxWidth: '300px',
            marginTop: '8px'
          }}>
            <div style={{ 
              flex: 1, 
              height: '1px', 
              backgroundColor: darkMode ? '#444' : '#ddd' 
            }}></div>
            <span style={{ 
              color: theme.textSecondary, 
              fontSize: '14px' 
            }}>or</span>
            <div style={{ 
              flex: 1, 
              height: '1px', 
              backgroundColor: darkMode ? '#444' : '#ddd' 
            }}></div>
          </div>
          
          <button
            onClick={handleExampleWallet}
            disabled={connecting || loadingExample}
            style={{
              padding: '14px 32px',
              fontSize: '18px',
              fontWeight: '500',
              backgroundColor: (connecting || loadingExample) ? '#888' : (darkMode ? '#2a2a2a' : '#f0f0f0'),
              color: (connecting || loadingExample) ? '#aaa' : theme.text,
              border: `1px solid ${darkMode ? '#444' : '#ddd'}`,
              borderRadius: '6px',
              cursor: (connecting || loadingExample) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: (connecting || loadingExample) ? 0.7 : 1,
              width: '100%',
              maxWidth: '300px',
            }}
            onMouseOver={(e) => {
              if (!connecting && !loadingExample) {
                e.currentTarget.style.backgroundColor = darkMode ? '#3a3a3a' : '#e0e0e0';
              }
            }}
            onMouseOut={(e) => {
              if (!connecting && !loadingExample) {
                e.currentTarget.style.backgroundColor = darkMode ? '#2a2a2a' : '#f0f0f0';
              }
            }}
          >
            {loadingExample ? 'Loading...' : 'Log in with Example Wallet'}
          </button>
          <p style={{
            fontSize: '13px',
            color: theme.textTertiary,
            marginTop: '4px',
            textAlign: 'center',
            maxWidth: '300px',
          }}>
            Try the demo without MetaMask
          </p>
        </div>
      </div>
    </main>
  );
}
