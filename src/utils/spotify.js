import { getValidToken } from './auth.js';
import { getCached, setCached, deleteCached, SHOW_EPISODES_TTL, SHOWS_LIST_TTL } from './cache.js';
import { USE_MOCK_DATA } from './devConfig.js';
import { MOCK_SHOWS, generateEpisodes } from './mockData.js';

// ─── Rate limit state (persisted to localStorage) ────────────────────────────

const RATE_LIMIT_KEY = 'pq_rate_limit_until';

export function getRateLimitExpiry() {
  const val = localStorage.getItem(RATE_LIMIT_KEY);
  return val ? parseInt(val) : null;
}

export function isRateLimited() {
  const expiry = getRateLimitExpiry();
  return expiry !== null && Date.now() < expiry;
}

function setRateLimit(retryAfterSeconds) {
  const expiry = Date.now() + retryAfterSeconds * 1000;
  localStorage.setItem(RATE_LIMIT_KEY, expiry.toString());
  return expiry;
}

export function clearRateLimit() {
  localStorage.removeItem(RATE_LIMIT_KEY);
}

export class RateLimitError extends Error {
  constructor(retryAfterSeconds, expiryTs) {
    super('RATE LIMITED');
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
    this.expiryTs = expiryTs;
  }
}

// ─── Direct Spotify fetcher ───────────────────────────────────────────────────

async function spotifyFetch(url, token) {
  if (isRateLimited()) {
    const expiry = getRateLimitExpiry();
    const secondsLeft = Math.ceil((expiry - Date.now()) / 1000);
    throw new RateLimitError(secondsLeft, expiry);
  }

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 429) {
    // Retry-After is blocked by CORS in the browser — fall back to 24 hours
    const headerVal = res.headers.get('Retry-After');
    const retryAfter = headerVal && parseInt(headerVal) > 0
      ? parseInt(headerVal)
      : 86400;
    const expiry = setRateLimit(retryAfter);
    throw new RateLimitError(retryAfter, expiry);
  }

  if (!res.ok) throw new Error(`Spotify API error: ${res.status}`);
  return res.json();
}

// ─── Stats helpers ────────────────────────────────────────────────────────────

function calcStats(eps) {
  const unplayed = eps.filter(ep => !ep.resume_point?.fully_played);
  const remainingMs = unplayed.reduce((sum, ep) => {
    const resumeMs = ep.resume_point?.resume_position_ms || 0;
    return sum + (ep.duration_ms - resumeMs);
  }, 0);
  return {
    total: eps.length,
    unplayed: unplayed.length,
    played: eps.length - unplayed.length,
    remainingMs,
  };
}

function buildShowResult(show, episodes, fromCache) {
  const validEpisodes = episodes.filter(ep => ep && ep.duration_ms > 0);
  const freeEpisodes = validEpisodes.filter(ep => !ep.restrictions);
  const restrictedEpisodes = validEpisodes.filter(ep => !!ep.restrictions);
  const freeStats = calcStats(freeEpisodes);
  const restrictedStats = calcStats(restrictedEpisodes);

  return {
    show,
    totalEpisodes: freeStats.total,
    unplayedCount: freeStats.unplayed,
    playedCount: freeStats.played,
    totalRemainingMs: freeStats.remainingMs,
    restrictedTotal: restrictedStats.total,
    restrictedUnplayed: restrictedStats.unplayed,
    restrictedPlayed: restrictedStats.played,
    restrictedRemainingMs: restrictedStats.remainingMs,
    fromCache,
  };
}

// ─── Episode fetching ─────────────────────────────────────────────────────────

async function fetchAllEpisodesForShow(showId, token, onProgress) {
  const cacheKey = `episodes_${showId}`;

  const cached = getCached(cacheKey);
  if (cached) return { episodes: cached, fromCache: true };

  if (USE_MOCK_DATA) {
    const show = MOCK_SHOWS.find(s => s.id === showId);
    if (!show) return { episodes: [], fromCache: false };
    await new Promise(r => setTimeout(r, 120));
    const episodes = generateEpisodes(show);
    if (onProgress) onProgress({ showId, loaded: episodes.length });
    setCached(cacheKey, episodes, SHOW_EPISODES_TTL);
    return { episodes, fromCache: false };
  }

  let episodes = [];
  let url = `https://api.spotify.com/v1/shows/${showId}/episodes?limit=50&market=US`;

  while (url) {
    const data = await spotifyFetch(url, token);
    episodes = episodes.concat(data.items);
    url = data.next;
    if (onProgress) onProgress({ showId, loaded: episodes.length });
  }

  setCached(cacheKey, episodes, SHOW_EPISODES_TTL);
  return { episodes, fromCache: false };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchAllShows(onProgress) {
  if (USE_MOCK_DATA) {
    if (onProgress) onProgress({ phase: 'shows', loaded: MOCK_SHOWS.length });
    return MOCK_SHOWS;
  }

  const cached = getCached('all_shows');
  if (cached) return cached;

  const token = await getValidToken();
  if (!token) throw new Error('Not authenticated');

  let shows = [];
  let url = 'https://api.spotify.com/v1/me/shows?limit=50';

  while (url) {
    const data = await spotifyFetch(url, token);
    shows = shows.concat(data.items.map(i => i.show));
    url = data.next;
    if (onProgress) onProgress({ phase: 'shows', loaded: shows.length });
  }

  setCached('all_shows', shows, SHOWS_LIST_TTL);
  return shows;
}

export async function fetchAllPodcastData(shows, onProgress) {
  const token = USE_MOCK_DATA ? null : await getValidToken();
  if (!USE_MOCK_DATA && !token) throw new Error('Not authenticated');

  const results = [];

  for (let i = 0; i < shows.length; i++) {
    const show = shows[i];
    if (onProgress) {
      onProgress({
        phase: 'episodes',
        showName: show.name,
        showIndex: i + 1,
        totalShows: shows.length,
      });
    }

    try {
      const { episodes, fromCache } = await fetchAllEpisodesForShow(
        show.id, token,
        p => onProgress && onProgress({ ...p, phase: 'episodes', showName: show.name, showIndex: i + 1, totalShows: shows.length })
      );
      results.push(buildShowResult(show, episodes, fromCache));
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      console.error(`Failed to fetch ${show.name}:`, err);
      results.push({ show, error: true });
    }
  }

  return results;
}

export async function refreshSingleShow(show) {
  deleteCached(`episodes_${show.id}`);

  if (USE_MOCK_DATA) {
    const showData = MOCK_SHOWS.find(s => s.id === show.id);
    if (!showData) return buildShowResult(show, [], false);
    await new Promise(r => setTimeout(r, 120));
    const episodes = generateEpisodes(showData);
    setCached(`episodes_${show.id}`, episodes, SHOW_EPISODES_TTL);
    return buildShowResult(show, episodes, false);
  }

  if (isRateLimited()) {
    const expiry = getRateLimitExpiry();
    throw new RateLimitError(Math.ceil((expiry - Date.now()) / 1000), expiry);
  }

  const token = await getValidToken();
  if (!token) throw new Error('Not authenticated');

  const { episodes } = await fetchAllEpisodesForShow(show.id, token);
  return buildShowResult(show, episodes, false);
}

// ─── Duration formatter ───────────────────────────────────────────────────────

export function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  if (hours < 24) return `${hours}h ${minutes}m`;

  const days = Math.floor(hours / 24);
  const remainHours = hours % 24;
  if (days < 7) return `${days}d ${remainHours}h`;

  const weeks = Math.floor(days / 7);
  const remainDays = days % 7;
  return `${weeks}w ${remainDays}d`;
}
