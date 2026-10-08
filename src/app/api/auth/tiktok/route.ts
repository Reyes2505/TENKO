import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const mode = url.searchParams.get('mode') || 'login';

  let linkingUserId: string | null = null;

  if (mode === 'link') {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              /* noop */
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'must_be_logged_in', redirect: '/login' },
        { status: 401 }
      );
    }

    linkingUserId = user.id;
  }

  // ─── PKCE ─────────────────────────────────────────────────────────
  const array = new Uint8Array(32);
  globalThis.crypto.getRandomValues(array);
  const codeVerifier = base64UrlEncode(array);

  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await globalThis.crypto.subtle.digest('SHA-256', data);
  const codeChallenge = base64UrlEncode(hash);

  // ─── State plano ──────────────────────────────────────────────────
  const nonce = Math.random().toString(36).slice(2, 10);
  const statePlain = [mode, linkingUserId || 'anon', nonce].join('.');
  const stateEncoded = Buffer.from(statePlain).toString('base64url');

  // ─── Construir URL a mano (evita doble codificación) ─────────────
  const scopes = 'user.info.basic,user.info.profile';
  const authUrl =
    'https://www.tiktok.com/v2/auth/authorize/' +
    '?client_key=' + encodeURIComponent(clientKey) +
    '&scope=' + encodeURIComponent(scopes) +
    '&response_type=code' +
    '&redirect_uri=' + encodeURIComponent(redirectUri) +
    '&code_challenge=' + encodeURIComponent(codeChallenge) +
    '&code_challenge_method=S256' +
    '&state=' + encodeURIComponent(stateEncoded);

  // ─── Guardar cookies y devolver JSON ─────────────────────────────
  const response = NextResponse.json({ url: authUrl });
  response.cookies.set('tiktok_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });
  response.cookies.set('tiktok_state', statePlain, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
  });

  return response;
}
