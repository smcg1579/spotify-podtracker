// ─────────────────────────────────────────────────────────────────
// Mock Spotify data — same shape as the real API responses.
// Used when USE_MOCK_DATA = true in devConfig.js
// ─────────────────────────────────────────────────────────────────

// Deterministic pseudo-random from a seed string
function seededRand(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) | 0;
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) | 0;
    return ((h >>> 0) / 0xffffffff);
  };
}

function makeImage(seed, size) {
  const colors = ['7c3aed', 'db2777', '7e22ce', 'be185d', '6d28d9', 'a21caf'];
  const rng = seededRand(seed + size);
  const color = colors[Math.floor(rng() * colors.length)];
  return {
    url: `https://placehold.co/${size}x${size}/${color}/ffffff?text=🎙`,
    width: size,
    height: size,
  };
}

function makeShow(id, name, publisher, episodeCount, avgDurationMins, restrictedCount = 0) {
  return {
    id,
    name,
    publisher,
    description: `Mock show: ${name}`,
    uri: `spotify:show:${id}`,
    href: `https://api.spotify.com/v1/shows/${id}`,
    type: 'show',
    images: [makeImage(id, 640), makeImage(id, 300), makeImage(id, 64)],
    _mock: { episodeCount, avgDurationMins, restrictedCount },
  };
}

// Generate a list of episode objects for a show, in Spotify's shape.
// playedFraction: 0–1, how many episodes are fully played
// partialFraction: 0–1 of the remaining unplayed, how many are in-progress
export function generateEpisodes(show) {
  const { episodeCount, avgDurationMins, restrictedCount } = show._mock;
  const rng = seededRand(show.id);

  const playedFraction  = 0.3 + rng() * 0.5;   // 30–80% played per show
  const partialFraction = 0.1 + rng() * 0.3;    // 10–40% of remainder in-progress

  const episodes = [];

  for (let i = 0; i < episodeCount; i++) {
    const epSeed = `${show.id}_ep_${i}`;
    const epRng  = seededRand(epSeed);

    // Duration: avgDuration ± 40%
    const spread    = avgDurationMins * 0.4;
    const durationMs = Math.floor(
      (avgDurationMins * 60 * 1000) + (epRng() - 0.5) * 2 * spread * 60 * 1000
    );

    const isRestricted = i < restrictedCount;

    // Work out play state
    const slot = epRng();
    let resumePoint;
    if (slot < playedFraction) {
      resumePoint = { fully_played: true, resume_position_ms: durationMs };
    } else if (slot < playedFraction + partialFraction) {
      const pos = Math.floor(epRng() * durationMs * 0.9);
      resumePoint = { fully_played: false, resume_position_ms: pos };
    } else {
      resumePoint = { fully_played: false, resume_position_ms: 0 };
    }

    // Release date (episodes going back ~episodeCount weeks)
    const releaseDate = new Date(
      Date.now() - (episodeCount - i) * 7 * 24 * 60 * 60 * 1000
    ).toISOString().split('T')[0];

    episodes.push({
      id: `${show.id}_ep_${i}`,
      uri: `spotify:episode:${show.id}_ep_${i}`,
      href: `https://api.spotify.com/v1/episodes/${show.id}_ep_${i}`,
      name: `Episode ${episodeCount - i}: ${EPISODE_TITLES[i % EPISODE_TITLES.length]}`,
      description: 'A mock episode description.',
      html_description: '<p>A mock episode description.</p>',
      duration_ms: durationMs,
      release_date: releaseDate,
      explicit: false,
      is_playable: !isRestricted,
      language: 'en',
      type: 'episode',
      external_urls: { spotify: `https://open.spotify.com/episode/${show.id}_ep_${i}` },
      images: show.images,
      resume_point: resumePoint,
      ...(isRestricted ? { restrictions: { reason: 'payment_required' } } : {}),
    });
  }

  return episodes;
}

const EPISODE_TITLES = [
  'The Beginning', 'Dark Waters', 'What Lies Beneath', 'Shadows & Light',
  'Lost in Time', 'The Return', 'Forgotten Voices', 'Into the Unknown',
  'Strange Encounters', 'The Final Chapter', 'Whispers in the Dark',
  'Ancient Mysteries', 'The Hidden Truth', 'Echoes of the Past',
  'A New Dawn', 'The Reckoning', 'Crossroads', 'The Last Stand',
  'Revelations', 'The Long Road Home',
];

// ─────────────────────────────────────────────────────────────────
// The mock show catalogue
// makeShow(id, name, publisher, episodeCount, avgDurationMins, restrictedEpisodesAtStart)
// ─────────────────────────────────────────────────────────────────
export const MOCK_SHOWS = [
  makeShow('lore',          'Lore',                         'Aaron Mahnke',          500, 30,  0),
  makeShow('serial',        'Serial',                       'This American Life',     45, 55,  0),
  makeShow('sysk',          'Stuff You Should Know',        'iHeartPodcasts',        300, 50,  0),
  makeShow('thedaily',      'The Daily',                    'The New York Times',    200, 25,  0),
  makeShow('myfavmurder',   'My Favorite Murder',           'Exactly Right Media',   150, 75,  0),
  makeShow('radiolab',      'Radiolab',                     'WNYC Studios',           80, 55,  0),
  makeShow('crimejunkie',   'Crime Junkie',                 'audiochuck',            250, 30,  5),
  makeShow('hiddenbrain',   'Hidden Brain',                 'Shankar Vedantam',      120, 50,  3),
  makeShow('conan',         'Conan O\'Brien Needs a Friend','Team Coco',             180, 65,  8),
  makeShow('freakonomics',  'Freakonomics Radio',           'Freakonomics Radio',    140, 45,  0),
  makeShow('ologies',       'Ologies with Alie Ward',       'Alie Ward',             200, 80,  0),
  makeShow('99pi',          '99% Invisible',                'Roman Mars',            500, 35,  0),
];
