import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_HOST = 'player.zilla-networks.com';
const PROXY_PREFIX = '/api/proxy-video?url=';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (parsed.hostname !== ALLOWED_HOST) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://player.zilla-networks.com/',
        'Origin': 'https://player.zilla-networks.com',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: res.status });
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';

    // Si es un m3u8 (playlist), reescribir las URLs de los segmentos
    if (url.endsWith('.m3u8') || contentType.includes('mpegurl')) {
      let text = await res.text();

      // Reescribir URLs absolutas
      text = text.replace(
        /(https?:\/\/player\.zilla-networks\.com\/[^\s"']+)/g,
        (m) => `${PROXY_PREFIX}${encodeURIComponent(m)}`
      );

      // Reescribir URLs relativas (líneas que no empiezan con #)
      text = text.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('http')) {
          // Es una ruta relativa al m3u8 original
          const absolute = new URL(trimmed, url).toString();
          return `${PROXY_PREFIX}${encodeURIComponent(absolute)}`;
        }
        return line;
      }).join('\n');

      return new NextResponse(text, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=300',
        },
      });
    }

    // Para segmentos (.ts, .html, .jpg) → passthrough binario
    const body = res.body;
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
