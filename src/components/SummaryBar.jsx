import { formatDuration } from '../utils/spotify.js';

export default function SummaryBar({ podcastData }) {
  const valid = podcastData.filter(d => !d.error);
  const totalShows = valid.length;
  const totalUnplayed = valid.reduce((s, d) => s + d.unplayedCount, 0);
  const totalMs = valid.reduce((s, d) => s + d.totalRemainingMs, 0);
  const totalEps = valid.reduce((s, d) => s + d.totalEpisodes, 0);
  const totalPlayed = valid.reduce((s, d) => s + d.playedCount, 0);
  const overallPct = totalEps > 0 ? Math.round((totalPlayed / totalEps) * 100) : 0;

  return (
    <div style={{
      background: 'var(--bg-card)',
      padding: '20px 24px',
      marginBottom: 24,
      boxShadow: `
        0 0 0 2px var(--pink-bright),
        0 0 0 5px var(--bg-dark),
        0 0 0 7px var(--purple-mid),
        0 0 30px rgba(255,105,180,0.15)
      `,
    }}>
      <div style={{
        fontSize: '8px', color: 'var(--pink-bright)',
        marginBottom: 16, letterSpacing: 3,
        textShadow: '0 0 8px var(--pink-bright)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>★ QUEST STATS ★</span>
        <span style={{ fontSize: '6px', color: 'var(--text-dim)' }}>{totalShows} SHOWS</span>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 12, marginBottom: 16,
      }}>
        <BigStat label="EPISODES LEFT" value={totalUnplayed} color="var(--red-accent)" icon="🎯" />
        <BigStat label="TIME REMAINING" value={formatDuration(totalMs)} color="var(--cyan-accent)" icon="⏰" />
        <BigStat label="COMPLETED" value={`${overallPct}%`} color="var(--green-accent)" icon="✅" />
      </div>

      {/* Overall progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: '6px', color: 'var(--text-dim)' }}>OVERALL PROGRESS</span>
          <span style={{ fontSize: '6px', color: 'var(--purple-bright)' }}>{totalPlayed}/{totalEps}</span>
        </div>
        <div style={{
          height: 12,
          background: 'var(--bg-mid)',
          boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.5)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${overallPct}%`,
            transition: 'width 1s steps(20)',
            background: `repeating-linear-gradient(
              90deg,
              var(--pink-bright) 0px, var(--pink-bright) 10px,
              var(--purple-bright) 10px, var(--purple-bright) 20px
            )`,
          }} />
        </div>
      </div>
    </div>
  );
}

function BigStat({ label, value, color, icon }) {
  return (
    <div style={{
      textAlign: 'center', padding: '12px 8px',
      background: 'rgba(0,0,0,0.3)',
      boxShadow: 'inset 2px 2px 0 rgba(0,0,0,0.4)',
    }}>
      <div style={{ fontSize: '16px', marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: '10px', color, marginBottom: 4, lineHeight: 1.4 }}>{value}</div>
      <div style={{ fontSize: '5px', color: 'var(--text-dim)', letterSpacing: 1 }}>{label}</div>
    </div>
  );
}
