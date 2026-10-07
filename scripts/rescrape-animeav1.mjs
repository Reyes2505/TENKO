/**
 * Re-puebla la DB con datos de AnimeAV1
 * Uso: node scripts/rescrape-animeav1.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { searchAnime, getAnime, getCatalog, getEpisode } from 'animeav1-api';
import 'dotenv/config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Necesitas service_role para escribir
);

const DELAY_MS = 1000; // 1 req/segundo, sé respetuoso

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function rePoblar() {
  console.log('🚀 Iniciando re-población desde AnimeAV1...');

  // 1. Traer catálogo completo (paginado)
  let page = 1;
  let total = Infinity;
  let procesados = 0;

  while (procesados < total) {
    console.log(`📦 Página ${page}...`);
    const { items, total: t } = await getCatalog({ page, order: 'latest_released' });
    total = t;

    if (!items || items.length === 0) break;

    for (const item of items) {
      try {
        // Buscar si ya existe en DB
        const { data: existente } = await supabase
          .from('animes')
          .select('id')
          .eq('titulo', item.title)
          .maybeSingle();

        let animeId = existente?.id;

        if (!animeId) {
          // Insertar anime
          const { data: nuevo, error } = await supabase
            .from('animes')
            .insert({
              titulo: item.title,
              portada_url: item.image || '',
              banner_url: item.backdrop || item.image || '',
              sinopsis: item.synopsis || '',
              generos: item.genres?.map(g => g.name) || [],
              estado_emision: mapearEstado(item.status),
              fecha_estreno: item.year ? `${item.year}-01-01` : null,
            })
            .select()
            .single();

          if (error) {
            console.error(`❌ Error insertando "${item.title}":`, error.message);
            continue;
          }
          animeId = nuevo.id;
          console.log(`✅ Anime nuevo: ${item.title}`);
        }

        // Obtener detalle con episodios
        const detalle = await getAnime(item.slug);
        if (!detalle?.episodes) continue;

        // Insertar temporada por defecto
        const { data: temp } = await supabase
          .from('temporadas')
          .upsert({
            anime_id: animeId,
            nombre: 'Temporada 1',
            orden: 1,
          }, { onConflict: 'anime_id,nombre' })
          .select()
          .single();

        // Insertar episodios
        for (const ep of detalle.episodes) {
          const { data: epExistente } = await supabase
            .from('episodios')
            .select('id')
            .eq('temporada_id', temp.id)
            .eq('numero', ep.number)
            .maybeSingle();

          if (epExistente) continue; // ya existe

          // Obtener el embed del episodio
          const epDetalle = await getEpisode(item.slug, ep.number);
          const urlStream = epDetalle?.embeds?.SUB?.[0]?.url
                        || epDetalle?.embeds?.DUB?.[0]?.url
                        || '';

          await supabase.from('episodios').insert({
            temporada_id: temp.id,
            numero: ep.number,
            titulo: `Episodio ${ep.number}`,
            url_stream: urlStream, // ⚠️ formato AnimeAV1
            tipo_stream: 'online',
          });
        }

        console.log(`   ✅ ${detalle.episodes.length} episodios sincronizados`);
        procesados++;
        await sleep(DELAY_MS);
      } catch (err) {
        console.error(`❌ Error con "${item.title}":`, err.message);
      }
    }

    page++;
    await sleep(DELAY_MS);
  }

  console.log(`🎉 Re-población completada. ${procesados} animes procesados.`);
}

function mapearEstado(statusText) {
  switch (statusText) {
    case 'Airing':   return 'emitido';
    case 'Finished': return 'terminado';
    case 'Upcoming': return 'en_espera';
    default:         return 'desconocido';
  }
}

rePoblar().catch(console.error);
