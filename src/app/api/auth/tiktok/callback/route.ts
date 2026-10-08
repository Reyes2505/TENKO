import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=tiktok_canceled', request.url));
  }

  try {
    return NextResponse.redirect(new URL('/shorts?tiktok_linked=true', request.url));
  } catch (error) {
    console.error("Error en callback de TikTok:", error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
