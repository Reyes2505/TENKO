import { NextRequest, NextResponse } from 'next/server';
import { getEpisode } from 'animeav1-api';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // ✅ Crear el cliente DENTRO del handler
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { episodioId } = await req.json();

    if (!episodioId) {
      return NextResponse.json({ error: 'Falta episodioId' }, { status: 400 });
    }

    // 1. Obtener el episodio
    const { data: ep } = await sb
      .from('episodios')
      .select('id, numero, url_stream, temporada_id')
      .eq('id', episodioId)
      .maybeSingle();

    if (!ep) {
      return NextResponse.json({ error: 'Episodio no encontrado' }, { status: 404 });
    }

    // 2. Si ya es embed → devolver
    if (
      ep.url_stream?.includes('uns.bio') ||
      ep.url_stream?.includes('voe.sx') ||
      ep.url_stream?.includes('byselapuix') ||
      ep.url_stream?.includes('mp4upload')
    ) {
      return NextResponse.json({ success: true, streamUrl: ep.url_stream, cached: true });
    }

    // 3. Buscar slug
    const { data: temp } = await sb
      .from('temporadas')
      .select('anime_id')
      .eq('id', ep.temporada_id)
      .maybeSingle();

    if (!temp) {
      return NextResponse.json({ error: 'Temporada no encontrada' }, { status: 404 });
    }

    const { data: anime } = await sb
      .from('animes')
      .select('animeav1_slug')
      .eq('id', temp.anime_id)
      .maybeSingle();

    if (!anime?.animeav1_slug) {
      return NextResponse.json({ error: 'Slug no encontrado' }, { status: 404 });
    }

    // 4. Resolver en AnimeAV1
    const epDetalle = await getEpisode(anime.animeav1_slug, ep.numero);
    const embedsSub = epDetalle?.embeds?.SUB || [];
    const embedsDub = epDetalle?.embeds?.DUB || [];

    let streamUrl = null;

    // UPNShare primero
    const upn = embedsSub.find(e => e.server === 'UPNShare')
             || embedsDub.find(e => e.server === 'UPNShare');
    if (upn) streamUrl = upn.url;

    // Voe como fallback
    if (!streamUrl) {
      const voe = embedsSub.find(e => e.server === 'Voe')
               || embedsDub.find(e => e.server === 'Voe');
      if (voe) streamUrl = voe.url;
    }

    if (!streamUrl) {
      return NextResponse.json({ error: 'Sin UPNShare/Voe' }, { status: 404 });
    }

    // 5. Guardar en DB
    await sb
      .from('episodios')
      .update({ url_stream: streamUrl, fuente: 'animeav1' })
      .eq('id', ep.id);

    return NextResponse.json({ success: true, streamUrl, cached: false });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
