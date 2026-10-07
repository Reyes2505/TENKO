/**
 * Scrapea episodios (con HLS) de animes priorizando:
 * 1. En emisión (estado_emision = 'emitido' o 'en_espera')
 * 2. Fecha de estreno más reciente
 * 3. Sin episodios aún
 *
 * Uso: node --env-file=.env.local scripts/scrape-episodes.mjs [--limit N]
 */

import { createClient } from '@supabase/supabase-js';
import { getAnime, getEpisode } from 'animeav1-api';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 100;

const DELAY_MS = 1200;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function mapearEstado(statusText) {
  switch ((statusText || '').toLowerCase()) {
    case 'airing':   return 'emitido';
    case 'finished': return 'terminado';
    case 'upcoming': return 'en_espera';
    default:         return 'desconocido';
  }
}

async function getAnimesPendientes(limit) {
  // PRIORIDAD 1: En emisión
  const { data: emision } = await sb
    .from('animes')
    .select('id, titulo, animeav1_slug, estado_emision, fecha_estreno, updated_at')
    .not('animeav1_slug', 'is', null)
    .in('estado_emision', ['emitido', 'en_espera'])
    .order('fecha_estreno', { ascending: false, nullsFirst: false })
    .limit(limit);

  const pendientes = [...(emision || [])];

  // PRIORIDAD 2: Resto
  if (pendientes.length < limit) {
    const faltan = limit - pendientes.length;
    const { data: resto } = await sb
      .from('animes')
      .select('id, titulo, animeav1_slug, estado_emision, fecha_estreno, updated_at')
      .not('animeav1_slug', 'is', null)
      .not('estado_emision', 'in', '("emitido","en_espera")')
      .order('fecha_estreno', { ascending: false, nullsFirst: false })
      .limit(faltan);

    pendientes.push(...(resto || []));
  }

  return pendientes;
}

async function animeYaTieneEpisodios(animeId) {
  const { data: temps } = await sb
    .from('temporadas')
    .select('id')
    .eq('anime_id', animeId);

  if (!temps || temps.length === 0) return false;

  const tempIds = temps.map(t => t.id);

  const { count } = await sb
    .from('episodios')
    .select('*', { count: 'exact', head: true })
    .in('temporada_id', tempIds)
    .eq('fuente', 'animeav1');

  return (count || 0) > 0;
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('📺 TENKO Episodes Scraper — AnimeAV1');
  console.log('═══════════════════════════════════════');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
  console.log('Service key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  console.log('Limit:', LIMIT);
  console.log('═══════════════════════════════════════\n');

  console.log('📥 Cargando animes candidatos (priorizando emisión)...');
  const candidatos = await getAnimesPendientes(LIMIT * 3);
  console.log(`   ${candidatos.length} candidatos iniciales\n`);

  console.log('🔍 Verificando cuáles ya tienen episodios...');
  const pendientes = [];
  for (const anime of candidatos) {
    const tieneEps = await animeYaTieneEpisodios(anime.id);
    if (!tieneEps) {
      pendientes.push(anime);
      if (pendientes.length >= LIMIT) break;
    }
  }

  console.log(`   ${pendientes.length} animes a procesar\n`);
  console.log('═══════════════════════════════════════');

  const enEmision = pendientes.filter(a => ['emitido', 'en_espera'].includes(a.estado_emision));
  console.log(`\n📊 Distribución:`);
  console.log(`   🔴 En emisión: ${enEmision.length}`);
  console.log(`   🟡 Otros: ${pendientes.length - enEmision.length}`);
  console.log('');

  let animesOK = 0;
  let animesFail = 0;
  let totalEpisodios = 0;

  for (const anime of pendientes) {
    const prioridad = ['emitido', 'en_espera'].includes(anime.estado_emision) ? '🔴' : '🟡';
    console.log(`\n${prioridad} [${anime.titulo}] (${anime.estado_emision || 'desconocido'})`);

    try {
      const av1Anime = await getAnime(anime.animeav1_slug);
      if (!av1Anime || !av1Anime.episodes || av1Anime.episodes.length === 0) {
        console.log('  ⚠️  Sin episodios en AnimeAV1');
        animesFail++;
        continue;
      }

      await sb.from('animes').update({
        generos: av1Anime.genres?.map(g => g.name) || [],
        sinopsis: av1Anime.synopsis || undefined,
        estado_emision: mapearEstado(av1Anime.statusText),
        fecha_estreno: av1Anime.startDate || undefined,
        es_nuevo: false,
      }).eq('id', anime.id);

      let { data: temp } = await sb
        .from('temporadas')
        .select('id')
        .eq('anime_id', anime.id)
        .eq('nombre', 'Temporada 1')
        .maybeSingle();

      if (!temp) {
        const { data: nueva } = await sb
          .from('temporadas')
          .insert({ anime_id: anime.id, nombre: 'Temporada 1', orden: 1 })
          .select('id')
          .single();
        temp = nueva;
      }

      if (!temp) {
        console.log('  ❌ No se pudo crear temporada');
        animesFail++;
        continue;
      }

      let nuevosEp = 0;
      for (const ep of av1Anime.episodes) {
        const { data: existente } = await sb
          .from('episodios')
          .select('id')
          .eq('temporada_id', temp.id)
          .eq('numero', ep.number)
          .maybeSingle();

        if (existente) continue;

        let epDetalle = null;
        let hlsUrl = null;

        try {
          epDetalle = await getEpisode(anime.animeav1_slug, ep.number);
          hlsUrl = epDetalle?.embeds?.SUB?.find(e => e.server === 'HLS')?.url
                || epDetalle?.embeds?.DUB?.find(e => e.server === 'HLS')?.url
                || epDetalle?.embeds?.SUB?.[0]?.url;
          await sleep(DELAY_MS);
        } catch (err) {
          console.log(`  ⚠️  Error ep ${ep.number}: ${err.message}`);
          continue;
        }

        if (!hlsUrl) continue;

        await sb.from('episodios').insert({
          temporada_id: temp.id,
          numero: ep.number,
          titulo: epDetalle?.title || `Episodio ${ep.number}`,
          url_stream: hlsUrl,
          tipo_stream: 'online',
          fuente: 'animeav1',
        });

        nuevosEp++;
      }

      console.log(`  ✅ ${nuevosEp}/${av1Anime.episodes.length} episodios guardados`);
      totalEpisodios += nuevosEp;
      animesOK++;

    } catch (err) {
      console.log(`  ❌ Error: ${err.message}`);
      animesFail++;
    }

    await sleep(DELAY_MS);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📊 RESUMEN');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Animes OK: ${animesOK}`);
  console.log(`❌ Animes fallidos: ${animesFail}`);
  console.log(`📺 Episodios totales: ${totalEpisodios}`);
  console.log('═══════════════════════════════════════');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
