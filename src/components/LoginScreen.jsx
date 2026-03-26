import { useState } from 'react';
import { initiateAuth } from '../utils/auth.js';

export default function LoginScreen() {
  const [clientId, setClientId] = useState(localStorage.getItem('pq_client_id_draft') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  const handleLogin = async () => {
    if (!clientId.trim()) {
      setError('ENTER CLIENT ID FIRST!');
      return;
    }
    setLoading(true);
    setError('');
    localStorage.setItem('pq_client_id_draft', clientId.trim());
    try {
      await initiateAuth(clientId.trim());
    } catch (e) {
      setError('AUTH FAILED: ' + e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '24px',
      position: 'relative', zIndex: 1,
    }}>
      {/* Title card */}
      <div style={{
        textAlign: 'center', marginBottom: 48,
        animation: 'float 3s ease-in-out infinite',
      }}>
        <div style={{
          fontSize: '10px', letterSpacing: 4,
          color: 'var(--purple-bright)',
          marginBottom: 8,
          textShadow: '0 0 20px var(--purple-bright)',
        }}>
          ✦ PRESS START ✦
        </div>
        <div style={{
          fontSize: '28px', lineHeight: '1.4',
          color: 'var(--pink-bright)',
          textShadow: '4px 4px 0 var(--purple-dark), 0 0 20px var(--pink-bright)',
          letterSpacing: 2,
        }}>
          PODCAST
        </div>
        <div style={{
          fontSize: '28px', lineHeight: '1.4',
          color: 'var(--purple-bright)',
          textShadow: '4px 4px 0 #220044, 0 0 20px var(--purple-bright)',
          letterSpacing: 2,
        }}>
          QUEST
        </div>
        <div style={{
          fontSize: '8px', marginTop: 8,
          color: 'var(--text-dim)', letterSpacing: 3,
        }}>
          🎮 EPISODE TRACKER 🎮
        </div>
      </div>

      {/* Login box */}
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--bg-card)',
        padding: '32px',
        boxShadow: `
          0 0 0 2px var(--border-pink),
          0 0 0 6px var(--bg-dark),
          0 0 0 8px var(--border-purple),
          0 0 40px rgba(255,105,180,0.2)
        `,
      }}>
        <div style={{ fontSize: '10px', color: 'var(--pink-bright)', marginBottom: 24, letterSpacing: 2 }}>
          ▶ CONNECT SPOTIFY
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: '7px', color: 'var(--text-dim)', display: 'block', marginBottom: 8 }}>
            SPOTIFY CLIENT ID
          </label>
          <input
            className="input-pixel"
            type="text"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="paste your client id here..."
            spellCheck={false}
          />
        </div>

        {error && (
          <div style={{
            fontSize: '7px', color: 'var(--red-accent)',
            marginBottom: 16, padding: '8px',
            background: 'rgba(255,68,68,0.1)',
            border: '1px solid var(--red-accent)',
            animation: 'blink 0.5s step-end 3',
          }}>
            ⚠ {error}
          </div>
        )}

        <button
          className="btn-pixel"
          onClick={handleLogin}
          disabled={loading}
          style={{ width: '100%', fontSize: '10px', padding: '16px' }}
        >
          {loading ? (
            <span className="blink">CONNECTING...</span>
          ) : (
            '▶ START GAME'
          )}
        </button>

        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <button
            onClick={() => setShowHelp(!showHelp)}
            style={{
              background: 'none', border: 'none',
              color: 'var(--purple-bright)', cursor: 'pointer',
              fontFamily: 'Press Start 2P', fontSize: '7px',
              textDecoration: 'underline',
            }}
          >
            {showHelp ? '▲ HIDE SETUP' : '▼ HOW TO SET UP'}
          </button>
        </div>

        {showHelp && (
          <div style={{
            marginTop: 16, padding: '16px',
            background: 'rgba(0,0,0,0.3)',
            fontSize: '7px', lineHeight: '2.2',
            color: 'var(--text-dim)',
            boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.4)',
            animation: 'fade-in-up 0.2s ease',
          }}>
            <div style={{ color: 'var(--cyan-accent)', marginBottom: 8 }}>SETUP GUIDE:</div>
            <ol style={{ paddingLeft: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <li>Go to <span style={{ color: 'var(--pink-bright)' }}>developer.spotify.com/dashboard</span></li>
              <li>Create a new app</li>
              <li>Add redirect URI: <span style={{ color: 'var(--pink-bright)', wordBreak: 'break-all' }}>{window.location.origin + window.location.pathname}</span></li>
              <li>Copy your Client ID above</li>
              <li>Hit START GAME!</li>
            </ol>
            <div style={{ marginTop: 12, color: 'var(--yellow-accent)', fontSize: '6px' }}>
              ★ NO SERVER NEEDED — RUNS 100% IN BROWSER
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 32, fontSize: '6px',
        color: 'var(--text-dim)', textAlign: 'center',
        lineHeight: 2,
      }}>
        <div>INSERT COIN TO CONTINUE</div>
        <div className="blink" style={{ marginTop: 4 }}>█</div>
      </div>
    </div>
  );
}
