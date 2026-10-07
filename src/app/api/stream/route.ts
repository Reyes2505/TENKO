import { NextRequest, NextResponse } from 'next/server';
import { obtenerEpisodio } from '@/lib/animeav1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Resuelve la URL del stream para un episodio dado.
 *
 * Query params:
 * - url: URL completa de AnimeAV1 (ej: https://animeav1.com/ver/slug-1)
 *   O bien:
 * - slug: slug del anime
 * - episode: número de episodio
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get('url');
  const slugParam = searchParams.get('slug');
  const episodeParam = searchParams.get('episode');

  try {
    let slug: string | null = slugParam;
    let episodeNumber: number | null = episodeParam ? parseInt(episodeParam, 10) : null;

    // Si viene una URL completa de AnimeAV1, extraer slug y número
    if (url && !slug) {
      const match = url.match(/animeav1\.com\/ver\/([^/]+)(?:\/(\d+))?/);
      if (match) {
        slug = match[1];
        if (match[2]) episodeNumber = parseInt(match[2], 10);
      }
    }

    if (!slug || !episodeNumber) {
      return NextResponse.json(
        { success: false, error: 'Faltan parámetros: slug y episode' },
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

    // Priorizar embeds en orden: UPNShare > Pixeldrain > resto
    const priorities = ['upnshare', 'pixeldrain'];
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
    });
  } catch (err: any) {
    console.error('[Stream API] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Error interno' },
      { status: 500 }
    );
  }
}
