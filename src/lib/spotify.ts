const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-library-read',
].join(' ');

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || '';

export function isSpotifyConfigured() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

export function getSpotifyRedirectUri(origin?: string) {
  if (REDIRECT_URI) return REDIRECT_URI;
  if (!origin) throw new Error('Spotify redirect URI no disponible');
  return `${origin}/api/spotify/callback`;
}

export function buildSpotifyAuthorizeUrl(state: string, redirectUri: string) {
  const url = new URL(SPOTIFY_AUTH_URL);
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', SCOPES);
  url.searchParams.set('show_dialog', 'true');
  url.searchParams.set('state', state);
  return url.toString();
}

function getBasicAuthHeader() {
  const token = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  return `Basic ${token}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Spotify token exchange failed: ${res.status}`);
  }

  return res.json() as Promise<{
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
    refresh_token: string;
  }>;
}

export async function refreshSpotifyTokens(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const res = await fetch(SPOTIFY_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Spotify refresh failed: ${res.status}`);
  }

  return res.json() as Promise<{
    access_token: string;
    token_type: string;
    scope: string;
    expires_in: number;
    refresh_token?: string;
  }>;
}

import { cookies } from 'next/headers';

export type SpotifyCookieStore = Awaited<ReturnType<typeof cookies>>;

export async function fetchSpotifyApi(path: string, cookieStore: SpotifyCookieStore) {
  const tokenData = await getSpotifyTokensFromCookies(cookieStore);
  if (!tokenData.accessToken) {
    throw new Error('Spotify token no disponible');
  }

  const makeRequest = async (accessToken: string) =>
    fetch(`https://api.spotify.com/v1/${path}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

  let res = await makeRequest(tokenData.accessToken);
  if (res.status === 401 && tokenData.refreshToken) {
    const refreshResponse = await refreshSpotifyTokens(tokenData.refreshToken);
    cookieStore.set('spotify_access_token', refreshResponse.access_token, spotifyCookieOptions());
    if (refreshResponse.refresh_token) {
      cookieStore.set('spotify_refresh_token', refreshResponse.refresh_token, spotifyCookieOptions());
    }
    res = await makeRequest(refreshResponse.access_token);
  }

  return res;
}

export async function getSpotifyTokensFromCookies(cookieStore: SpotifyCookieStore) {
  const accessToken = cookieStore.get('spotify_access_token')?.value;
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;
  return { accessToken, refreshToken };
}

export function spotifyCookieOptions() {
  const secure = process.env.NODE_ENV === 'production';
  return {
    path: '/',
    sameSite: 'lax' as const,
    httpOnly: true as const,
    secure,
  };
}
