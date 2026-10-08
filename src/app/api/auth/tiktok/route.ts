import { NextResponse } from 'next/server';

function base64UrlEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function GET() {
  const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
  const redirectUri =
    process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI ||
    'http://localhost:3000/api/auth/tiktok/callback';

  if (!clientKey) {
    return NextResponse.json(
      { error: 'Falta configurar NEXT_PUBLIC_TIKTOK_CLIENT_KEY en .env.local' },
      { status: 500 }
    );
  }

  // 1. Generar verifier aleatorio con Web Crypto nativo
  const array = new Uint8Array(32);
  globalThis.crypto.getRandomValues(array);
  const codeVerifier = base64UrlEncode(array.buffer);

  // 2. Generar challenge SHA-256 usando crypto.subtle (Universal)
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', data);
  const codeChallenge = base64UrlEncode(hash);

  const scopes = 'user.info.basic,video.list';
  const state = Math.random().toString(36).substring(2);

  const tiktokAuthUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
  tiktokAuthUrl.searchParams.set('client_key', clientKey);
  tiktokAuthUrl.searchParams.set('scope', scopes);
  tiktokAuthUrl.searchParams.set('response_type', 'code');
  tiktokAuthUrl.searchParams.set('redirect_uri', redirectUri);
  tiktokAuthUrl.searchParams.set('state', state);
  tiktokAuthUrl.searchParams.set('code_challenge', codeChallenge);
  tiktokAuthUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(tiktokAuthUrl.toString());
  response.cookies.set('tiktok_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });

  return response;
}
