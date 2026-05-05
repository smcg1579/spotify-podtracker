import { getPodcastStatus } from '../utils/podcastStatus';

export default function StatusBadge({ latestEpisodeDate }) {
  const status = getPodcastStatus(latestEpisodeDate);

  const styles = {
    active:   { background: '#1ed760', color: '#000' },
    inactive: { background: '#535353', color: '#fff' },
    unknown:  { background: '#333',    color: '#aaa' },
  };

  const labels = {
    active:   '● Active',
    inactive: '○ Inactive',
    unknown:  '? Unknown',
  };

  return (
    <span style={{
      ...styles[status],
      fontSize: '0.7rem',
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: '999px',
      letterSpacing: '0.05em',
      textTransform: 'uppercase',
    }}>
      {labels[status]}
    </span>
  );
}
