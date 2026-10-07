import { NextRequest, NextResponse } from 'next/server';
import { obtenerEpisodio } from '@/lib/animeav1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resuelve la URL del stream para un episodio.
 *
 * 3 modos:
 * 1. url = .m3u8 directo (Zilla) → passthrough
 * 2. url = página de AnimeAV1 → extraer slug + número y resolver
 * 3. slug + episode → resolver desde AnimeAV1
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const slugParam = searchParams.get('slug');
  const episodeParam = searchParams.get('episode');

  try {
    // ═══════════════════════════════════════════════════════════════
    // ✅ MODO 1: URL .m3u8 directa → passthrough inmediato
    // ═══════════════════════════════════════════════════════════════
    if (url) {
      const lower = url.toLowerCase();

      // Si es un .m3u8 directo o viene de Zilla Networks
      if (lower.includes('.m3u8') || lower.includes('zilla-networks')) {
        return NextResponse.json({
          success: true,
          streamUrl: url,
          source: 'direct-hls',
        });
      }

      // Si es un embed de un servidor conocido (UPNShare, Voe, etc.)
      // Lo devolvemos como iframe URL
      const embedHosts = ['voe.sx', 'upnshare', 'byselapuix', 'mp4upload'];
      if (embedHosts.some(h => lower.includes(h))) {
        return NextResponse.json({
          success: true,
          streamUrl: url,
          source: 'embed',
        });
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ MODO 2: URL de página AnimeAV1 → extraer slug + número
    // ═══════════════════════════════════════════════════════════════
    let slug: string | null = slugParam;
    let episodeNumber: number | null = episodeParam ? parseInt(episodeParam, 10) : null;

    if (url && !slug) {
      const match = url.match(/animeav1\.com\/ver\/([^/]+)(?:\/(\d+))?/);
      if (match) {
        slug = match[1];
        if (match[2]) episodeNumber = parseInt(match[2], 10);
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // ✅ MODO 3: Resolver desde AnimeAV1 (scraping)
    // ═══════════════════════════════════════════════════════════════
    if (!slug || !episodeNumber) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros: url válida, o slug + episode' },
        { status: 400 }
      );
    }

    const episodio = await obtenerEpisodio(slug, episodeNumber);

    if (!episodio || !episodio.embeds.length) {
      return NextResponse.json(
        { success: false, error: 'No se encontraron mirrors para este episodio' },
        { status: 404 }
      );
    }

    // Priorizar HLS > UPNShare > Pixeldrain > resto
    const priorities = ['hls', 'upnshare', 'pixeldrain'];
    const sorted = [...episodio.embeds].sort((a, b) => {
      const pa = priorities.findIndex(p => a.server.toLowerCase().includes(p));
      const pb = priorities.findIndex(p => b.server.toLowerCase().includes(p));
      return (pa === -1 ? 999 : pa) - (pb === -1 ? 999 : pb);
    });

    return NextResponse.json({
      success: true,
      streamUrl: sorted[0].url,
      mirrors: sorted,
      episodeId: episodio.id,
      episodeNumber: episodio.number,
      source: 'animeav1-resolved',
    });
  } catch (err: any) {
    console.error('[Stream API] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error interno' },
      { status: 500 }
    );
  }
}
