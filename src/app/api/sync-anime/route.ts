import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const nombre = request.nextUrl.searchParams.get('nombre');
  
  if (!nombre) {
    return NextResponse.json({ success: false, error: 'Nombre requerido' });
  }

  try {

    // Extraer slug de URL o nombre
    let slug = '';
    if (nombre.includes('jkanime.net')) {
      const urlMatch = nombre.match(/jkanime\.net\/([a-z0-9-]+)\/?/);
      slug = urlMatch ? urlMatch[1] : '';
    } else {
      slug = nombre.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
    }

    // 1. Obtener página del anime
    const animeResponse = await fetch(`https://jkanime.net/${slug}/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    if (!animeResponse.ok) {
      return NextResponse.json({ success: false, error: 'No se encontró en JK Anime' });
    }

    const html = await animeResponse.text();

    // 2. Extraer CSRF e ID
    const csrfMatch = html.match(/name="csrf-token" content="([^"]+)"/);
    const csrf = csrfMatch ? csrfMatch[1] : '';

    const idMatch = html.match(/ajax\/episodes\/(\d+)\//);
    const jkId = idMatch ? parseInt(idMatch[1]) : 0;

    // 3. Extraer metadata
    const tituloMatch = html.match(/<h3>([^<]+)<\/h3>/);
    const tituloReal = tituloMatch ? tituloMatch[1].trim() : slug;
    const tituloFinal = tituloReal !== 'Buscado recientemente:' ? tituloReal : slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const sinopsisMatch = html.match(/<p class="scroll">([^<]+)<\/p>/);
    const sinopsis = sinopsisMatch ? sinopsisMatch[1].trim() : '';

    const portadaMatch = html.match(/<div class="anime_pic"[^>]*>.*?<img[^>]*src="([^"]+)"/s);
    const portada = portadaMatch ? portadaMatch[1] : '';

    // 4. Crear o actualizar anime
    const { data: existente } = await supabase
      .from('animes')
      .select('id')
      .ilike('titulo', `%${tituloFinal.slice(0, 20)}%`)
      .limit(1);

    let animeId: string;

    if (existente && existente.length > 0) {
      animeId = existente[0].id;
      await supabase.from('animes').update({
        titulo: tituloFinal, sinopsis, portada_url: portada, banner_url: portada
      }).eq('id', animeId);
    } else {
      const { data: animeCreado, error } = await supabase
        .from('animes')
        .insert({ titulo: tituloFinal, sinopsis, portada_url: portada, banner_url: portada })
        .select().single();
      if (error) throw error;
      animeId = animeCreado.id;
    }

    // 5. Crear temporada
    const temps = await supabase.from('temporadas').select('id').eq('anime_id', animeId).limit(1);
    let temporadaId: string;

    if (temps.data && temps.data.length > 0) {
      temporadaId = temps.data[0].id;
    } else {
      const { data: tempCreada, error: tempError } = await supabase
        .from('temporadas')
        .insert({ anime_id: animeId, nombre: 'Temporada 1', orden: 1, anio_lanzamiento: 2026 })
        .select().single();
      if (tempError) throw tempError;
      temporadaId = tempCreada.id;
    }

    // 6. Obtener episodios
    const episodios: number[] = [];
    if (jkId > 0 && csrf) {
      let pagina = 1;
      while (pagina <= 10) {
        const epResponse = await fetch(
          `https://jkanime.net/ajax/episodes/${jkId}/${pagina}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0'
            },
            body: `_token=${encodeURIComponent(csrf)}`
          }
        );

        if (!epResponse.ok) break;

        const epData = await epResponse.json();
        if (!epData || !epData.data || epData.data.length === 0) break;

        for (const ep of epData.data) {
          const num = ep.number || 0;
          if (num > 0) episodios.push(num);
        }

        const total = epData.total || 0;
        if (pagina * 16 >= total) break;
        pagina++;
      }
    }

    // 7. Guardar episodios con URLs
    let guardados = 0;
    for (const epNum of episodios) {
      const existingEp = await supabase
        .from('episodios')
        .select('id')
        .eq('temporada_id', temporadaId)
        .eq('numero', epNum);

      if (existingEp.data && existingEp.data.length > 0) continue;

      const epUrl = `https://jkanime.net/${slug}/${epNum}/`;
      const epResponse = await fetch(epUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (epResponse.ok) {
        const epHtml = await epResponse.text();
        const urlMatch = epHtml.match(/https?:\/\/jkanime\.net\/jkplayer\/um\?e=[^\s"']+/);
        
        if (urlMatch) {
          await supabase.from('episodios').insert({
            temporada_id: temporadaId,
            numero: epNum,
            titulo: `Episodio ${epNum}`,
            url_stream: urlMatch[0],
            visto: false
          });
          guardados++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      animeId,
      titulo: tituloFinal,
      portada,
      sinopsis,
      episodios: guardados,
      totalEpisodios: episodios.length
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
