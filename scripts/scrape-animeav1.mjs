/**
 * Scraper AnimeAV1 → Supabase
 *
 * Uso:
 *   node --env-file=.env.local scripts/scrape-animeav1.mjs [--limit 10] [--search "Frieren"]
 *
 * Opciones:
 *   --limit N     Scrape solo N animes (útil para probar)
 *   --search X    Scrape solo animes que coincidan con X
 *   --only-new    Scrape solo animes sin animeav1_slug
 */

import { createClient } from '@supabase/supabase-js';
import { searchAnime, getAnime, getEpisode } from 'animeav1-api';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Parsear argumentos
const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const searchIdx = args.indexOf('--search');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;
const SEARCH = searchIdx >= 0 ? args[searchIdx + 1] : null;
const ONLY_NEW = args.includes('--only-new');

const DELAY_MS = 1500; // Sé respetuoso con AnimeAV1

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function normalizarTitulo(t) {
  return (t || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapearEstado(statusText) {
  switch ((statusText || '').toLowerCase()) {
    case 'airing':   return 'emitido';
    case 'finished': return 'terminado';
    case 'upcoming': return 'en_espera';
    default:         return 'desconocido';
  }
}

async function buscarSlugEnAV1(titulo) {
  try {
    const results = await searchAnime(titulo);
    if (!results || results.length === 0) return null;

    // Match exacto primero
    const tituloNorm = normalizarTitulo(titulo);
    const exact = results.find(r => normalizarTitulo(r.title) === tituloNorm);
    if (exact) return exact.slug;

    // Match por inclusión (primeras 2 palabras)
    const primeras = tituloNorm.split(' ').slice(0, 2).join(' ');
    const parcial = results.find(r =>
      normalizarTitulo(r.title).includes(primeras)
    );
    return parcial?.slug || results[0]?.slug || null;
  } catch (err) {
    console.error(`  ❌ Error buscando "${titulo}":`, err.message);
    return null;
  }
}

async function scrapeAnime(anime) {
  console.log(`\n🎬 [${anime.titulo}]`);

  // 1. Buscar slug en AnimeAV1
  const slug = await buscarSlugEnAV1(anime.titulo);
  if (!slug) {
    console.log(`  ⚠️  No se encontró en AnimeAV1`);
    return { ok: false, reason: 'no-match' };
  }
  console.log(`  ✅ Slug: ${slug}`);
  await sleep(DELAY_MS);

  // 2. Obtener detalles del anime
  const av1Anime = await getAnime(slug);
  if (!av1Anime || !av1Anime.episodes) {
    console.log(`  ⚠️  Sin episodios en AnimeAV1`);
    return { ok: false, reason: 'no-episodes' };
  }
  console.log(`  📺 ${av1Anime.episodes.length} episodios detectados`);
  await sleep(DELAY_MS);

  // 3. Actualizar metadatos del anime
  const { error: errUpd } = await sb
    .from('animes')
    .update({
      animeav1_slug: slug,
      portada_url: av1Anime.poster || anime.portada_url,
      banner_url: av1Anime.backdrop || anime.banner_url,
      sinopsis: av1Anime.synopsis || anime.sinopsis,
      generos: av1Anime.genres?.map(g => g.name) || anime.generos,
      estado_emision: mapearEstado(av1Anime.statusText),
      fecha_estreno: av1Anime.startDate || anime.fecha_estreno,
    })
    .eq('id', anime.id);

  if (errUpd) {
    console.log(`  ❌ Error actualizando anime:`, errUpd.message);
    return { ok: false, reason: 'db-update' };
  }
  console.log(`  ✅ Metadatos actualizados`);

  // 4. Asegurar que existe una temporada
  let { data: temp } = await sb
    .from('temporadas')
    .select('id')
    .eq('anime_id', anime.id)
    .eq('nombre', 'Temporada 1')
    .maybeSingle();

  if (!temp) {
    const { data: nuevaTemp } = await sb
      .from('temporadas')
      .insert({ anime_id: anime.id, nombre: 'Temporada 1', orden: 1 })
      .select('id')
      .single();
    temp = nuevaTemp;
  }

  if (!temp) {
    console.log(`  ❌ No se pudo crear temporada`);
    return { ok: false, reason: 'temp-create' };
  }

  // 5. Insertar episodios con HLS directo
  let nuevosEp = 0;
  let errores = 0;

  for (const ep of av1Anime.episodes) {
    try {
      // Ver si ya existe
      const { data: existente } = await sb
        .from('episodios')
        .select('id, url_stream, fuente')
        .eq('temporada_id', temp.id)
        .eq('numero', ep.number)
        .maybeSingle();

      const yaEsAnimeAV1 = existente?.url_stream?.includes('zilla-networks')
                        || existente?.fuente === 'animeav1';

      if (existente && yaEsAnimeAV1) continue;

      // Obtener el HLS directo
      const epDetalle = await getEpisode(slug, ep.number);
      const hlsUrl = epDetalle?.embeds?.SUB?.find(e => e.server === 'HLS')?.url
                  || epDetalle?.embeds?.DUB?.find(e => e.server === 'HLS')?.url
                  || epDetalle?.embeds?.SUB?.[0]?.url
                  || null;

      if (!hlsUrl) {
        errores++;
        continue;
      }

      if (existente) {
        await sb.from('episodios').update({
          url_stream: hlsUrl,          titulo: epDetalle?.title || `Episodio ${ep.number}`,
        }).eq('id', existente.id);
      } else {
        await sb.from('episodios').insert({
          temporada_id: temp.id,
          numero: ep.number,
          titulo: epDetalle?.title || `Episodio ${ep.number}`,
          url_stream: hlsUrl,        });
      }

      nuevosEp++;

      if (nuevosEp % 5 === 0) {
        console.log(`  ... ${nuevosEp}/${av1Anime.episodes.length} episodios`);
      }

      await sleep(DELAY_MS);
    } catch (err) {
      console.log(`  ⚠️  Error en episodio ${ep.number}: ${err.message}`);
      errores++;
    }
  }

  console.log(`  ✅ ${nuevosEp} nuevos, ${errores} errores`);
  return { ok: true, nuevosEp };
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('🚀 TENKO Scraper — AnimeAV1 → Supabase');
  console.log('═══════════════════════════════════════');
  console.log('Node:', process.version);
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
  console.log('Service key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  console.log('CI mode:', process.env.CI === 'true' ? '✅' : 'local');
  const _key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const _url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  console.log('DEBUG: key len =', _key.length);
  console.log('DEBUG: key prefix =', JSON.stringify(_key.substring(0, 12)));
  console.log('DEBUG: key suffix =', JSON.stringify(_key.substring(_key.length - 12)));
  console.log('DEBUG: url =', JSON.stringify(_url));
  console.log('DEBUG: key has newline =', _key.includes('\n'));
  console.log('DEBUG: key has space =', _key.includes(' '));
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('🚀 Scraper AnimeAV1 → Supabase');
  console.log(`   Limit: ${LIMIT === Infinity ? '∞' : LIMIT}`);
  console.log(`   Search: ${SEARCH || 'todos'}`);
  console.log(`   Only new: ${ONLY_NEW}`);

  // 1. Obtener animes de la DB
  let query = sb.from('animes').select('id, titulo, portada_url, banner_url, sinopsis, generos, estado_emision, fecha_estreno, animeav1_slug');

  if (SEARCH) {
    query = query.ilike('titulo', `%${SEARCH}%`);
  }
  if (ONLY_NEW) {
    query = query.is('animeav1_slug', null);
  }

  const { data: animes, error } = await query.limit(LIMIT === Infinity ? 10000 : LIMIT);

  if (error) {
    console.error('❌ Error leyendo animes:', error.message);
    process.exit(1);
  }

  console.log(`\n📚 ${animes.length} animes a procesar\n`);
  console.log('═══════════════════════════════════════');

  let ok = 0, fail = 0, totalEp = 0;

  for (const anime of animes) {
    const res = await scrapeAnime(anime);
    if (res.ok) {
      ok++;
      totalEp += res.nuevosEp || 0;
    } else {
      fail++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📊 RESUMEN');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Animes OK: ${ok}`);
  console.log(`❌ Animes fallidos: ${fail}`);
  console.log(`📺 Episodios nuevos totales: ${totalEp}`);
}

main().catch(console.error);
