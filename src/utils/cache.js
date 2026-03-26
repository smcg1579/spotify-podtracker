const CACHE_VERSION = 'v2';
const SHOW_EPISODES_TTL = 60 * 60 * 1000; // 1 hour
const SHOWS_LIST_TTL = 30 * 60 * 1000;    // 30 minutes

function cacheKey(key) {
  return `pq_${CACHE_VERSION}_${key}`;
}

export function getCached(key) {
  try {
    const raw = localStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const { data, ts, ttl } = JSON.parse(raw);
    if (Date.now() - ts > ttl) {
      localStorage.removeItem(cacheKey(key));
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setCached(key, data, ttl = SHOW_EPISODES_TTL) {
  try {
    localStorage.setItem(cacheKey(key), JSON.stringify({ data, ts: Date.now(), ttl }));
  } catch {
    // storage full, skip
  }
}

export function clearCache() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('pq_'));
  keys.forEach(k => localStorage.removeItem(k));
}

export function deleteCached(key) {
  try {
    localStorage.removeItem(cacheKey(key));
  } catch {
    // ignore
  }
}

export function getCacheAge(key) {
  try {
    const raw = localStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts;
  } catch {
    return null;
  }
}

export { SHOW_EPISODES_TTL, SHOWS_LIST_TTL };
