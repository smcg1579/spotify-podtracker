import { useState, useEffect, useCallback } from 'react';
import { getValidToken, exchangeToken, logout } from './utils/auth.js';
import { fetchAllShows, fetchAllPodcastData, refreshSingleShow, RateLimitError, getRateLimitExpiry, clearRateLimit, isRateLimited } from './utils/spotify.js';
import { clearCache, getCacheAge } from './utils/cache.js';
import { USE_MOCK_DATA } from './utils/devConfig.js';
import LoginScreen from './components/LoginScreen.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';
import PodcastCard from './components/PodcastCard.jsx';
import SummaryBar from './components/SummaryBar.jsx';

const SORT_OPTIONS = ['NAME', 'MOST EPS LEFT', 'LEAST EPS LEFT', 'MOST TIME LEFT', 'LEAST TIME LEFT', 'MOST PLAYED', 'LEAST PLAYED'];

export default function App() {
  const [authState, setAuthState] = useState('checking'); // checking | logged_out | logged_in
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [podcastData, setPodcastData] = useState([]);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('MOST LEFT');
  const [search, setSearch] = useState('');
  const [lastRefresh, setLastRefresh] = useState(null);
  const [includeRestricted, setIncludeRestricted] = useState(false);
  const [rateLimitExpiry, setRateLimitExpiry] = useState(() => getRateLimitExpiry());
  const [refreshingShowId, setRefreshingShowId] = useState(null);

  // Countdown ticker — updates every second while rate limited
  useEffect(() => {
    if (!rateLimitExpiry) return;
    if (Date.now() >= rateLimitExpiry) {
      setRateLimitExpiry(null);
      clearRateLimit();
      return;
    }
    const interval = setInterval(() => {
      if (Date.now() >= rateLimitExpiry) {
        setRateLimitExpiry(null);
        clearRateLimit();
        clearInterval(interval);
      } else {
        // Force re-render to update countdown display
        setRateLimitExpiry(exp => exp);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitExpiry]);

  // Handle OAuth callback
  useEffect(() => {
    if (USE_MOCK_DATA) {
      setAuthState('logged_in');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const storedState = sessionStorage.getItem('pkce_state');

    if (code && state === storedState) {
      // Clear URL params
      window.history.replaceState({}, '', window.location.pathname);
      const clientId = sessionStorage.getItem('spotify_client_id') || localStorage.getItem('spotify_client_id');
      exchangeToken(code, clientId)
        .then(() => setAuthState('logged_in'))
        .catch(e => {
          setError('Auth callback failed: ' + e.message);
          setAuthState('logged_out');
        });
    } else {
      getValidToken().then(token => {
        setAuthState(token ? 'logged_in' : 'logged_out');
      });
    }
  }, []);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (isRateLimited()) {
      setRateLimitExpiry(getRateLimitExpiry());
      return;
    }
    setLoading(true);
    setError('');
    setProgress({ phase: 'shows' });

    try {
      if (forceRefresh) clearCache();

      const shows = await fetchAllShows(setProgress);
      const data = await fetchAllPodcastData(shows, setProgress);
      setPodcastData(data);
      setLastRefresh(new Date());
    } catch (e) {
      if (e instanceof RateLimitError) {
        setRateLimitExpiry(e.expiryTs);
      } else {
        setError('FETCH FAILED: ' + e.message);
      }
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, []);

  // Auto-load when authenticated
  useEffect(() => {
    if (authState === 'logged_in' && podcastData.length === 0) {
      loadData();
    }
  }, [authState]);

  const handleLogout = () => {
    if (USE_MOCK_DATA) {
      clearCache();
      setPodcastData([]);
      return; // stay logged in — no real auth to clear
    }
    logout();
    clearCache();
    setPodcastData([]);
    setAuthState('logged_out');
  };

  const handleRefreshShow = useCallback(async (show) => {
    if (refreshingShowId || isRateLimited()) return;
    setRefreshingShowId(show.id);
    // Yield to the browser so the overlay renders before work starts
    await new Promise(r => setTimeout(r, 0));
    try {
      const updated = await refreshSingleShow(show);
      setPodcastData(prev => prev.map(d => d.show.id === show.id ? updated : d));
    } catch (e) {
      if (e instanceof RateLimitError) {
        setRateLimitExpiry(e.expiryTs);
      } else {
        console.error('Failed to refresh show:', e);
      }
    } finally {
      setRefreshingShowId(null);
    }
  }, [refreshingShowId]);

  // Merge restricted stats into base stats based on toggle
  function mergeStats(d) {
    if (!d || d.error) return d;
    if (!includeRestricted) return d;
    return {
      ...d,
      totalEpisodes: d.totalEpisodes + d.restrictedTotal,
      unplayedCount: d.unplayedCount + d.restrictedUnplayed,
      playedCount: d.playedCount + d.restrictedPlayed,
      totalRemainingMs: d.totalRemainingMs + d.restrictedRemainingMs,
    };
  }

  // Sorted & filtered
  const displayData = [...podcastData]
    .filter(d => !search || d.show.name.toLowerCase().includes(search.toLowerCase()))
    .map(mergeStats)
    .sort((a, b) => {
      if (a.error) return 1;
      if (b.error) return -1;
      switch (sortBy) {
        case 'NAME': return a.show.name.localeCompare(b.show.name);
        case 'MOST EPS LEFT': return b.unplayedCount - a.unplayedCount;
        case 'LEAST EPS LEFT': return a.unplayedCount - b.unplayedCount;
        case 'MOST TIME LEFT': return b.totalRemainingMs - a.totalRemainingMs;
        case 'LEAST TIME LEFT': return a.totalRemainingMs - b.totalRemainingMs;
        case 'MOST PLAYED': return b.playedCount - a.playedCount;
        case 'LEAST PLAYED': return a.playedCount - b.playedCount;
        default: return 0;
      }
    });

  if (authState === 'checking') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ fontSize: '32px', animation: 'pixel-spin 0.8s steps(4) infinite' }}>✦</div>
        <div style={{ fontSize: '8px', color: 'var(--text-dim)', animation: 'blink 1s step-end infinite' }}>
          LOADING...
        </div>
      </div>
    );
  }

  if (authState === 'logged_out') {
    return <LoginScreen />;
  }

  // Rate limit screen
  if (rateLimitExpiry && Date.now() < rateLimitExpiry) {
    const secsLeft = Math.ceil((rateLimitExpiry - Date.now()) / 1000);
    const hrs = Math.floor(secsLeft / 3600);
    const mins = Math.floor((secsLeft % 3600) / 60);
    const secs = secsLeft % 60;
    const formatted = hrs > 0
      ? `${hrs}h ${String(mins).padStart(2,'0')}m ${String(secs).padStart(2,'0')}s`
      : mins > 0
        ? `${mins}m ${String(secs).padStart(2,'0')}s`
        : `${secs}s`;

    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', padding: '24px',
        textAlign: 'center', position: 'relative', zIndex: 1, gap: 24,
      }}>
        <div style={{ fontSize: '48px', animation: 'float 2s ease-in-out infinite' }}>🚫</div>
        <div style={{
          fontSize: '14px', color: 'var(--red-accent)',
          textShadow: '3px 3px 0 #660000',
          letterSpacing: 2,
        }}>
          RATE LIMITED!
        </div>
        <div style={{
          background: 'var(--bg-card)', padding: '32px',
          boxShadow: '0 0 0 2px var(--red-accent), 0 0 0 6px var(--bg-dark), 0 0 0 8px #660000',
          maxWidth: 400, width: '100%',
        }}>
          <div style={{ fontSize: '7px', color: 'var(--text-dim)', marginBottom: 16, lineHeight: 2 }}>
            SPOTIFY HAS BLOCKED REQUESTS.<br />PLEASE WAIT BEFORE TRYING AGAIN.
          </div>
          <div style={{
            fontSize: '20px', color: 'var(--yellow-accent)',
            textShadow: '2px 2px 0 #664400',
            marginBottom: 20, letterSpacing: 3,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatted}
          </div>
          <div style={{
            height: 12, background: 'var(--bg-mid)',
            boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.5)',
            overflow: 'hidden', marginBottom: 20,
          }}>
            <div style={{
              height: '100%',
              width: `${100 - Math.min(100, (secsLeft / (Math.ceil((rateLimitExpiry - (rateLimitExpiry - secsLeft * 1000)) / 1000))) * 100)}%`,
              background: 'repeating-linear-gradient(90deg, var(--red-accent) 0px, var(--red-accent) 10px, #cc0000 10px, #cc0000 20px)',
              transition: 'width 1s linear',
            }} />
          </div>
          <div style={{ fontSize: '6px', color: 'var(--text-dim)', lineHeight: 2 }}>
            THIS LIMIT WAS SET BY SPOTIFY DUE TO TOO MANY REQUESTS IN A SHORT PERIOD.
            THE TIMER IS SAVED — REFRESHING THIS PAGE WON'T RESET IT.
          </div>
        </div>
        <button
          className="btn-pixel"
          onClick={handleLogout}
          style={{ fontSize: '7px', padding: '8px 12px', background: 'var(--purple-dark)' }}
        >
          ⏏ LOGOUT
        </button>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: 1200, margin: '0 auto',
      padding: '24px 16px',
      position: 'relative', zIndex: 1,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{
            fontSize: '18px',
            color: 'var(--pink-bright)',
            textShadow: '3px 3px 0 var(--purple-dark), 0 0 20px var(--pink-bright)',
            letterSpacing: 2, lineHeight: 1.3,
          }}>
            PODCAST
            <span style={{ color: 'var(--purple-bright)', display: 'block' }}>QUEST</span>
          </h1>
          {lastRefresh && (
            <div style={{ fontSize: '6px', color: 'var(--text-dim)', marginTop: 6 }}>
              LAST SYNC: {lastRefresh.toLocaleTimeString()}
            </div>
          )}
          {USE_MOCK_DATA && (
            <div style={{
              marginTop: 6, fontSize: '6px', letterSpacing: 1,
              color: 'var(--yellow-accent)',
              padding: '2px 6px',
              background: 'rgba(255,255,0,0.08)',
              border: '1px solid rgba(255,255,0,0.4)',
              display: 'inline-block',
            }}>
              ⚠ MOCK MODE
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn-pixel btn-pixel-pink"
            onClick={() => loadData(true)}
            disabled={loading}
            style={{ fontSize: '7px', padding: '8px 12px' }}
          >
            {loading ? <span className="blink">⏳ SYNC</span> : '↺ REFRESH'}
          </button>
          <button
            className="btn-pixel"
            onClick={handleLogout}
            style={{ fontSize: '7px', padding: '8px 12px', background: 'var(--purple-dark)' }}
          >
            ⏏ LOGOUT
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          fontSize: '7px', color: 'var(--red-accent)',
          padding: '12px', marginBottom: 16,
          background: 'rgba(255,68,68,0.1)',
          border: '2px solid var(--red-accent)',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Loading */}
      {loading && <LoadingScreen progress={progress} />}

      {/* Data */}
      {!loading && podcastData.length > 0 && (
        <>
          <SummaryBar podcastData={podcastData.map(mergeStats)} />

          {/* Controls */}
          <div style={{
            display: 'flex', gap: 12, marginBottom: 20,
            flexWrap: 'wrap', alignItems: 'center',
          }}>
            <input
              className="input-pixel"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="SEARCH SHOWS..."
              style={{ flex: '1', minWidth: 180, maxWidth: 280 }}
            />
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {SORT_OPTIONS.map(opt => (
                <button
                  key={opt}
                  className="btn-pixel"
                  onClick={() => setSortBy(opt)}
                  style={{
                    fontSize: '6px', padding: '7px 10px',
                    background: sortBy === opt ? 'var(--pink-dim)' : 'var(--purple-dark)',
                    boxShadow: sortBy === opt
                      ? 'inset -3px -3px 0 #882244, inset 3px 3px 0 rgba(255,255,255,0.2)'
                      : 'inset -3px -3px 0 #110022, inset 3px 3px 0 rgba(255,255,255,0.1)',
                  }}
                >
                  {sortBy === opt ? '▶ ' : ''}{opt}
                </button>
              ))}
            </div>

            {/* Restricted episodes toggle */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', userSelect: 'none',
              padding: '7px 10px',
              background: includeRestricted ? 'rgba(255,105,180,0.15)' : 'var(--bg-mid)',
              boxShadow: includeRestricted
                ? '0 0 0 2px var(--pink-bright)'
                : '0 0 0 2px var(--purple-dim)',
              transition: 'all 0.1s',
            }}>
              {/* Pixel checkbox */}
              <div style={{
                width: 16, height: 16, flexShrink: 0,
                background: includeRestricted ? 'var(--pink-bright)' : 'var(--bg-dark)',
                boxShadow: includeRestricted
                  ? 'inset -2px -2px 0 var(--pink-dim), inset 2px 2px 0 rgba(255,255,255,0.3)'
                  : 'inset 2px 2px 0 rgba(0,0,0,0.5), 0 0 0 2px var(--purple-dim)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', lineHeight: 1,
              }}>
                {includeRestricted ? '✓' : ''}
              </div>
              <input
                type="checkbox"
                checked={includeRestricted}
                onChange={e => setIncludeRestricted(e.target.checked)}
                style={{ display: 'none' }}
              />
              <span style={{
                fontSize: '6px',
                color: includeRestricted ? 'var(--pink-light)' : 'var(--text-dim)',
                letterSpacing: 1,
              }}>
                INCLUDE 🔒 EPISODES
              </span>
            </label>
          </div>

          {/* Results count */}
          <div style={{ fontSize: '6px', color: 'var(--text-dim)', marginBottom: 16 }}>
            SHOWING {displayData.length} OF {podcastData.length} SHOWS
          </div>

          {/* Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {displayData.map((data, i) => (
              <PodcastCard
                key={data.show.id}
                data={data}
                index={i}
                onRefresh={handleRefreshShow}
                isRefreshing={refreshingShowId === data.show.id}
              />
            ))}
          </div>

          {displayData.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '48px',
              fontSize: '8px', color: 'var(--text-dim)',
            }}>
              <div style={{ fontSize: '32px', marginBottom: 16 }}>🔍</div>
              NO RESULTS FOUND
            </div>
          )}
        </>
      )}

      {/* Footer decoration */}
      <div style={{
        marginTop: 48, textAlign: 'center',
        fontSize: '6px', color: 'var(--purple-dim)',
        letterSpacing: 2,
      }}>
        ✦ PODCAST QUEST v1.0 ✦
        <br />
        <span className="blink" style={{ marginTop: 4, display: 'inline-block' }}>
          INSERT COIN TO CONTINUE
        </span>
      </div>
    </div>
  );
}
