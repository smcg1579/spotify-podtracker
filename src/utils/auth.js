const SCOPES = [
  'user-library-read',
  'user-read-playback-position',
  'user-read-currently-playing',
].join(' ');

const REDIRECT_URI = window.location.origin + window.location.pathname;

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => chars[b % chars.length]).join('');
}

async function sha256(plain) {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
}

function base64urlencode(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export async function initiateAuth(clientId) {
  const verifier = generateRandomString(64);
  const challenge = base64urlencode(await sha256(verifier));
  const state = generateRandomString(16);

  sessionStorage.setItem('pkce_verifier', verifier);
  sessionStorage.setItem('pkce_state', state);
  sessionStorage.setItem('spotify_client_id', clientId);

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

export async function exchangeToken(code, clientId) {
  const verifier = sessionStorage.getItem('pkce_verifier');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    code_verifier: verifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) throw new Error('Token exchange failed');
  const data = await res.json();

  const expiry = Date.now() + data.expires_in * 1000;
  localStorage.setItem('spotify_access_token', data.access_token);
  localStorage.setItem('spotify_refresh_token', data.refresh_token);
  localStorage.setItem('spotify_token_expiry', expiry.toString());
  localStorage.setItem('spotify_client_id', clientId);

  sessionStorage.removeItem('pkce_verifier');
  sessionStorage.removeItem('pkce_state');
  return data.access_token;
}

export async function refreshToken() {
  const refreshTk = localStorage.getItem('spotify_refresh_token');
  const clientId = localStorage.getItem('spotify_client_id');
  if (!refreshTk || !clientId) throw new Error('No refresh token');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTk,
    client_id: clientId,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) throw new Error('Refresh failed');
  const data = await res.json();
  const expiry = Date.now() + data.expires_in * 1000;
  localStorage.setItem('spotify_access_token', data.access_token);
  localStorage.setItem('spotify_token_expiry', expiry.toString());
  if (data.refresh_token) {
    localStorage.setItem('spotify_refresh_token', data.refresh_token);
  }
  return data.access_token;
}

export async function getValidToken() {
  const expiry = parseInt(localStorage.getItem('spotify_token_expiry') || '0');
  const token = localStorage.getItem('spotify_access_token');
  if (!token) return null;
  if (Date.now() > expiry - 60000) {
    try { return await refreshToken(); } catch { return null; }
  }
  return token;
}

export function logout() {
  ['spotify_access_token', 'spotify_refresh_token', 'spotify_token_expiry', 'spotify_client_id']
    .forEach(k => localStorage.removeItem(k));
}
