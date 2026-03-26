export default function LoadingScreen({ progress }) {
  const { phase, showName, showIndex, totalShows, loaded } = progress || {};

  const pct = totalShows > 0 ? Math.round((showIndex / totalShows) * 100) : 0;

  const FRAMES = ['▓░░░░', '▓▓░░░', '▓▓▓░░', '▓▓▓▓░', '▓▓▓▓▓'];
  const frameIdx = Math.min(Math.floor(pct / 20), FRAMES.length - 1);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: 24, padding: '32px',
      textAlign: 'center',
    }}>
      {/* Spinner */}
      <div style={{
        fontSize: '48px',
        animation: 'pixel-spin 0.8s steps(4) infinite',
        display: 'inline-block',
        filter: 'drop-shadow(0 0 8px var(--pink-bright))',
      }}>
        ✦
      </div>

      <div style={{
        fontSize: '12px',
        color: 'var(--pink-bright)',
        textShadow: '0 0 10px var(--pink-bright)',
        letterSpacing: 2,
      }}>
        {phase === 'shows' ? 'LOADING SHOWS...' : 'FETCHING EPISODES...'}
      </div>

      {phase === 'episodes' && showName && (
        <>
          <div style={{
            fontSize: '7px',
            color: 'var(--text-dim)',
            maxWidth: 300,
            lineHeight: '1.8',
          }}>
            {showName}
          </div>

          <div style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '7px', color: 'var(--purple-bright)' }}>
                SHOW {showIndex}/{totalShows}
              </span>
              <span style={{ fontSize: '7px', color: 'var(--pink-bright)' }}>
                {pct}%
              </span>
            </div>

            {/* Pixelated progress bar */}
            <div style={{
              height: 20,
              background: 'var(--bg-mid)',
              boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.5), 0 0 0 2px var(--border-purple)',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                transition: 'width 0.3s steps(10)',
                background: `repeating-linear-gradient(
                  90deg,
                  var(--pink-bright) 0px, var(--pink-bright) 12px,
                  var(--purple-bright) 12px, var(--purple-bright) 24px
                )`,
              }} />
              {/* scanline on bar */}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.2) 3px, rgba(0,0,0,0.2) 4px)',
                pointerEvents: 'none',
              }} />
            </div>
          </div>
        </>
      )}

      <div style={{ fontSize: '7px', color: 'var(--text-dim)', animation: 'blink 1s step-end infinite' }}>
        {loaded !== undefined && phase === 'episodes' ? `${loaded} eps loaded` : 'PLEASE WAIT...'}
      </div>
    </div>
  );
}
