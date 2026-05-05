export function getPodcastStatus(latestEpisodeDate, thresholdDays = 90) {
  if (!latestEpisodeDate) return 'unknown';

  const latest = new Date(latestEpisodeDate);
  const now = new Date();
  const diffDays = (now - latest) / (1000 * 60 * 60 * 24);

  return diffDays <= thresholdDays ? 'active' : 'inactive';
}
