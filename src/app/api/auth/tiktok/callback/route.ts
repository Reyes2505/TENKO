import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const TIKTOK_CLIENT_KEY = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY!;
const TIKTOK_CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET!;
const TIKTOK_REDIRECT_URI =
  process.env.NEXT_PUBLIC_TIKTOK_REDIRECT_URI ||
  'http://localhost:3000/api/auth/tiktok/callback';

function buildHandle(username: string | null | undefined): string {
  const clean = (username || '')
    .replace(/^@/, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toLowerCase();
  return `@${clean || `user${Math.random().toString(36).slice(2, 8)}`}`;
}

async function uniqueHandle(admin: any, baseHandle: string): Promise<string> {
  const base = baseHandle.replace(/^@/, '');
  let candidate = `@${base}`;
  let suffix = 1;
  while (suffix < 100) {
    const { data } = await admin
      .from('profiles')
      .select('id')
      .eq('handle', candidate)
      .maybeSingle();
    if (!data) return candidate;
    suffix += 1;
    candidate = `@${base}${suffix}`;
  }
  return `@${base}${Math.random().toString(36).slice(2, 6)}`;
}

async function getOrigin(): Promise<string> {
  const h = await headers();
  const forwardedHost = h.get('x-forwarded-host');
  const forwardedProto = h.get('x-forwarded-proto') || 'https';
  const host = h.get('host');

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  if (host && host !== 'localhost:3000') {
    return `${forwardedProto}://${host}`;
  }
  return 'http://localhost:3000';
}

export async function GET(request: Request) {
  const origin = await getOrigin();
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const stateEncoded = url.searchParams.get('state');
  const error = url.searchParams.get('error');

  // ─── 1. Decodificar el state ─────────────────────────────────────
  let mode = 'login';
  let linkingUserId: string | null = null;
  if (stateEncoded) {
    try {
      const decoded = Buffer.from(stateEncoded, 'base64url').toString('utf-8');
      const [m, uid] = decoded.split('.');
      mode = m || 'login';
      linkingUserId = uid && uid !== 'anon' ? uid : null;
    } catch {
      /* state corrupto */
    }
  }

  const isLinking = mode === 'link' && !!linkingUserId;

  // ─── 2. Errores de TikTok ────────────────────────────────────────
  if (error) {
    return NextResponse.redirect(`${origin}/perfil?error=tiktok_${error}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/perfil?error=tiktok_canceled`);
  }

  // ─── 3. Recuperar el code_verifier ───────────────────────────────
  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get('tiktok_code_verifier')?.value;

  if (!codeVerifier) {
    return NextResponse.redirect(`${origin}/perfil?error=tiktok_missing_verifier`);
  }

  try {
    // ─── 4. Token exchange ────────────────────────────────────────
    const tokenRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: TIKTOK_REDIRECT_URI,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      return NextResponse.redirect(
        `${origin}/perfil?error=tiktok_token_exchange&debug=${encodeURIComponent(errText.slice(0, 200))}`
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken: string = tokenData.access_token;

    if (!accessToken) {
      return NextResponse.redirect(`${origin}/perfil?error=tiktok_no_token`);
    }

    // ─── 5. User info (SIN username) ──────────────────────────────
    const userRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!userRes.ok) {
      const errText = await userRes.text();
      return NextResponse.redirect(
        `${origin}/perfil?error=tiktok_user_info&debug=${encodeURIComponent(errText.slice(0, 200))}`
      );
    }

    const userData = await userRes.json();
    const tiktokUser = userData?.data?.user;

    if (!tiktokUser?.open_id) {
      return NextResponse.redirect(`${origin}/perfil?error=tiktok_no_user`);
    }

    const openId: string = tiktokUser.open_id;
    const displayName: string | null = tiktokUser.display_name || null;
    const avatarUrl: string | null = tiktokUser.avatar_url || null;
    // username requiere scope user.info.profile, que no tenemos.
    // Usamos display_name para el handle.
    const username: string | null = displayName;

    // ─── 6. Cliente admin ─────────────────────────────────────────
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ─── 7. MODO VINCULAR ─────────────────────────────────────────
    if (isLinking && linkingUserId) {
      const { data: alreadyLinked } = await admin
        .from('profiles')
        .select('id')
        .eq('tiktok_open_id', openId)
        .maybeSingle();

      if (alreadyLinked && alreadyLinked.id !== linkingUserId) {
        return NextResponse.redirect(`${origin}/perfil?error=tiktok_already_linked`);
      }

      await admin
        .from('profiles')
        .update({
          tiktok_open_id: openId,
          tiktok_username: username,
          updated_at: new Date().toISOString(),
        })
        .eq('id', linkingUserId);

      const response = NextResponse.redirect(`${origin}/perfil?tiktok_linked=true`);
      response.cookies.delete('tiktok_code_verifier');
      response.cookies.delete('tiktok_state');
      return response;
    }

    // ─── 8. MODO LOGIN ────────────────────────────────────────────
    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id')
      .eq('tiktok_open_id', openId)
      .maybeSingle();

    let userId: string;

    if (existingProfile?.id) {
      userId = existingProfile.id;
      await admin
        .from('profiles')
        .update({
          name: displayName || undefined,
          avatar_url: avatarUrl || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } else {
      const fakeEmail = `tiktok_${openId}@tenko.local`;
      const randomPassword = Math.random().toString(36).slice(2) + Date.now();

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: fakeEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          provider: 'tiktok',
          tiktok_open_id: openId,
          display_name: displayName,
        },
      });

      if (createErr || !created?.user) {
        return NextResponse.redirect(`${origin}/perfil?error=tiktok_create_user`);
      }

      userId = created.user.id;
      const baseHandle = buildHandle(displayName);
      const handle = await uniqueHandle(admin, baseHandle);

      await admin.from('profiles').upsert({
        id: userId,
        name: displayName || 'Usuario TikTok',
        handle,
        avatar_url: avatarUrl,
        bio: 'Cuenta de TikTok',
        tiktok_open_id: openId,
        updated_at: new Date().toISOString(),
      });
    }

    // ─── 9. Sesión ────────────────────────────────────────────────
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: `tiktok_${openId}@tenko.local`,
      options: {
        redirectTo: `${origin}/api/auth/tiktok/session?user_id=${userId}`,
      },
    });

    if (linkErr || !linkData) {
      return NextResponse.redirect(`${origin}/perfil?error=tiktok_session`);
    }

    const response = NextResponse.redirect(linkData.properties.action_link);
    response.cookies.delete('tiktok_code_verifier');
    response.cookies.delete('tiktok_state');
    return response;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.redirect(
      `${origin}/perfil?error=server_error&debug=${encodeURIComponent(msg.slice(0, 200))}`
    );
  }
}
