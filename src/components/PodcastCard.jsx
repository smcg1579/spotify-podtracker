import { formatDuration } from '../utils/spotify.js';

const PIXEL_ICONS = ['🎙️','📻','🎧','📡','🔊','🎵'];

export default function PodcastCard({ data, index, style, onRefresh, isRefreshing }) {
  const { show, totalEpisodes, unplayedCount, playedCount, totalRemainingMs, restrictedTotal, fromCache, error } = data;
  const icon = PIXEL_ICONS[index % PIXEL_ICONS.length];
  const pct = totalEpisodes > 0 ? Math.round((playedCount / totalEpisodes) * 100) : 0;

  // HP bar color based on unplayed pct
  const barColor = pct > 66 ? '#00ff88' : pct > 33 ? '#ffff00' : '#ff4444';

  return (
    <div
      onClick={() => !isRefreshing && onRefresh && onRefresh(show)}
      style={{
        ...style,
        background: 'var(--bg-card)',
        padding: '16px',
        position: 'relative',
        boxShadow: `
          inset -3px -3px 0 rgba(0,0,0,0.4),
          inset 3px 3px 0 rgba(255,255,255,0.05),
          0 0 0 2px var(--border-purple),
          0 0 0 4px var(--bg-dark)
        `,
        animation: `fade-in-up 0.3s ease both`,
        animationDelay: `${index * 0.05}s`,
        transition: 'background 0.1s',
        cursor: isRefreshing ? 'wait' : 'pointer',
      }}
      onMouseEnter={e => { if (!isRefreshing) e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
    >
      {/* Refreshing overlay */}
      {isRefreshing && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          background: 'rgba(13,0,21,0.75)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 10,
        }}>
          <div style={{
            fontSize: '28px',
            animation: 'pixel-spin 0.6s steps(4) infinite',
            filter: 'drop-shadow(0 0 6px var(--pink-bright))',
          }}>✦</div>
          <div style={{
            fontSize: '6px', color: 'var(--pink-bright)',
            letterSpacing: 2, animation: 'blink 1s step-end infinite',
          }}>
            SYNCING...
          </div>
        </div>
      )}

      {/* Cache badge */}
      {fromCache && !isRefreshing && (
        <div style={{
          position: 'absolute', top: 8, right: 8,
          fontSize: '6px', color: 'var(--purple-bright)',
          padding: '2px 4px',
          background: 'rgba(153,51,204,0.2)',
          border: '1px solid var(--purple-bright)',
          letterSpacing: 1,
        }}>
          CACHED
        </div>
      )}

      {/* Show header */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
        {show.images?.[0]?.url ? (
          <img
            src={show.images[0].url}
            alt={show.name}
            style={{
              width: 48, height: 48,
              imageRendering: 'pixelated',
              boxShadow: '0 0 0 2px var(--pink-bright)',
              flexShrink: 0,
            }}
          />
        ) : (
          <div style={{
            width: 48, height: 48, background: 'var(--purple-dark)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', flexShrink: 0,
            boxShadow: '0 0 0 2px var(--pink-bright)',
          }}>{icon}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '8px', color: 'var(--pink-light)',
            lineHeight: '1.6',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            marginBottom: 4,
          }}>
            {show.name}
          </div>
          <div style={{ fontSize: '6px', color: 'var(--text-dim)' }}>
            {show.publisher}
          </div>
        </div>
      </div>

      {error ? (
        <div style={{ fontSize: '7px', color: 'var(--red-accent)', textAlign: 'center', padding: '8px 0' }}>
          ⚠ FETCH ERROR
        </div>
      ) : (
        <>
          {/* Progress bar (HP-style) */}
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '6px', color: 'var(--text-dim)' }}>PROGRESS</span>
              <span style={{ fontSize: '6px', color: barColor }}>{pct}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${pct}%`,
                  background: `repeating-linear-gradient(
                    90deg,
                    ${barColor} 0px,
                    ${barColor} 10px,
                    ${barColor}aa 10px,
                    ${barColor}aa 12px
                  )`,
                }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatBox label="PLAYED" value={playedCount} color="var(--green-accent)" />
            <StatBox label="LEFT" value={unplayedCount} color="var(--red-accent)" />
            <StatBox
              label="TIME LEFT"
              value={formatDuration(totalRemainingMs)}
              color="var(--cyan-accent)"
              colSpan={2}
            />
          </div>

          {/* Restricted episodes hint */}
          {restrictedTotal > 0 && (
            <div style={{
              marginTop: 8, padding: '5px 8px',
              background: 'rgba(255,255,0,0.06)',
              border: '1px solid rgba(255,255,0,0.25)',
              fontSize: '5px', color: 'rgba(255,255,0,0.7)',
              letterSpacing: 1, textAlign: 'center',
            }}>
              🔒 {restrictedTotal} SUBSCRIBER EPISODE{restrictedTotal !== 1 ? 'S' : ''} HIDDEN
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatBox({ label, value, color, colSpan }) {
  return (
    <div style={{
      background: 'rgba(0,0,0,0.3)',
      padding: '8px',
      textAlign: 'center',
      gridColumn: colSpan ? `span ${colSpan}` : undefined,
      boxShadow: `inset 2px 2px 0 rgba(0,0,0,0.4)`,
    }}>
      <div style={{ fontSize: '5px', color: 'var(--text-dim)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '9px', color }}>{value}</div>
    </div>
  );
}
