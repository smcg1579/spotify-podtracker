import { getPodcastStatus } from '../utils/podcastStatus';

export default function StatusBadge({ latestEpisodeDate }) {
  const status = getPodcastStatus(latestEpisodeDate);
  if (status === 'active' || status === 'unknown') return null;

  return (
    <span style={{
      fontSize: '10px',
      color: 'rgba(255,255,255,0.3)',
      letterSpacing: '0.08em',
      textTransform: 'lowercase',
    }}>
      ○ inactive
    </span>
  );
}
