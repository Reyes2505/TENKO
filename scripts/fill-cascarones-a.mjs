import { createClient } from '@supabase/supabase-js';
import { getAnime, getEpisode } from 'animeav1-api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fillCascaronesA() {
  console.log('🔍 Buscando animes con slug pero sin episodios...');

  const { data: animes, error } = await supabase
    .from('animes')
    .select('id, titulo, animeav1_slug')
    .not('animeav1_slug', 'is', null);

  if (error) {
    console.error('❌ Error al obtener animes:', error.message);
    return;
  }

  let procesados = 0;

  for (const anime of animes) {
    let { data: temp } = await supabase
      .from('temporadas')
      .select('id')
      .eq('anime_id', anime.id)
      .maybeSingle();

    if (temp) {
      const { count } = await supabase
        .from('episodios')
        .select('id', { count: 'exact', head: true })
        .eq('temporada_id', temp.id);

      if (count && count > 0) continue;
    }

    console.log(`🚀 Procesando cascarón: ${anime.titulo} (${anime.animeav1_slug})`);

    try {
      const animeData = await getAnime(anime.animeav1_slug);
      if (!animeData?.episodes?.length) continue;

      if (!temp) {
        const { data: newTemp, error: tempErr } = await supabase
          .from('temporadas')
          .insert({ anime_id: anime.id, nombre: 'Temporada 1', orden: 1 })
          .select()
          .single();
        
        if (tempErr) {
          console.error(`❌ Error creando temporada para ${anime.titulo}:`, tempErr.message);
          continue;
        }
        temp = newTemp;
      }

      for (const ep of animeData.episodes) {
        let streamUrl = null;
        try {
          const epDetalle = await getEpisode(anime.animeav1_slug, ep.number);
          const embedsSub = epDetalle?.embeds?.SUB || [];
          const embedsDub = epDetalle?.embeds?.DUB || [];

          const mirror = embedsSub.find(e => e.server === 'UPNShare') ||
                         embedsDub.find(e => e.server === 'UPNShare') ||
                         embedsSub.find(e => e.server === 'Voe') ||
                         embedsSub.find(e => e.server === 'HLS');
          if (mirror) streamUrl = mirror.url;
        } catch (e) {
          // Si falla la obtención del stream directo, se creará el registro y resolve-stream lo reparará al vuelo
        }

        await supabase.from('episodios').upsert({
          temporada_id: temp.id,
          numero: ep.number,
          titulo_episodio: `Episodio ${ep.number}`,
          url_stream: streamUrl,
          fuente: 'animeav1'
        }, { onConflict: 'temporada_id,numero' });
      }

      procesados++;
      console.log(`✅ Episodios insertados para: ${anime.titulo}`);
    } catch (err) {
      console.error(`❌ Error con ${anime.animeav1_slug}:`, err.message);
    }
  }

  console.log(`✨ Total cascarones Tipo A completados: ${procesados}`);
}

fillCascaronesA();
