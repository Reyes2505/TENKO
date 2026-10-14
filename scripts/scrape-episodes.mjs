/**
 * Scraper de episodios — AnimeAV1 (SvelteKit direct scrape)
 *
 * Reemplaza el uso de `animeav1-api` (que está roto) con scraping directo
 * del bloque `data: [...]` que SvelteKit embebe en el HTML.
 *
 * Uso: node --env-file=.env.local scripts/scrape-episodes.mjs [--limit N]
 */

import { createClient } from '@supabase/supabase-js';
import vm from 'node:vm';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 100;

const DELAY_MS = 700;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Referer': 'https://animeav1.com/',
};

// ══════════════════════════════════════════════════════════════════
// FETCH
// ══════════════════════════════════════════════════════════════════
async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
  return await res.text();
}

// ══════════════════════════════════════════════════════════════════
// EXTRAER BLOQUE SVELTEKIT `data: [...]`
// ══════════════════════════════════════════════════════════════════
function extractSvelteData(html) {
  const idx = html.indexOf('data: [');
  if (idx < 0) return null;

  const start = html.indexOf('[', idx);
  if (start < 0) return null;

  // Encontrar el cierre balanceado
  let depth = 0;
  let end = -1;
  let inString = false;
  let stringChar = '';
  let escaped = false;

  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\') { escaped = true; continue; }
    if (inString) {
      if (c === stringChar) inString = false;
      continue;
    }
    if (c === '"' || c === "'") { inString = true; stringChar = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end < 0) return null;

  const jsArray = html.slice(start, end + 1);

  try {
    const sandbox = {};
    vm.createContext(sandbox);
    return vm.runInContext('(' + jsArray + ')', sandbox);
  } catch (err) {
    console.error('   ⚠️  No se pudo parsear el bloque SvelteKit:', err.message);
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// EXTRAER INFO DEL ANIME (página /media/{slug})
// ══════════════════════════════════════════════════════════════════
function extractAnimeInfo(dataArr) {
  if (!Array.isArray(dataArr)) return null;
  for (const item of dataArr) {
    if (item?.data?.media?.id) {
      return {
        mediaId: item.data.media.id,
        title: item.data.media.title,
        episodes: item.data.media.episodes || [],
        status: item.data.media.status, // 0=terminado, 1=emisión, 2=próximo
        episodesCount: item.data.media.episodesCount,
      };
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════
// EXTRAER INFO DEL EPISODIO (página /media/{slug}/{num})
// ══════════════════════════════════════════════════════════════════
function extractEpisodeInfo(dataArr) {
  if (!Array.isArray(dataArr)) return null;
  for (const item of dataArr) {
    if (item?.data?.episode?.id && item?.data?.embeds) {
      return {
        mediaId: item.data.media.id,
        episodeId: item.data.episode.id,
        number: item.data.episode.number,
        title: item.data.episode.title,
        embeds: item.data.embeds,
      };
    }
  }
  return null;
}

// ══════════════════════════════════════════════════════════════════
// PRIORIZAR EMBEDS (SUB > DUB, servidor confiable > resto)
// ══════════════════════════════════════════════════════════════════
const SERVER_PRIORITY = [
  'Voe',
  'Byse',
  'MP4Upload',
  'Filemoon',
  'Streamwish',
  'Vidhide',
  'HLS',
  'UPNShare',
];

function pickBestEmbed(embeds) {
  if (!embeds || embeds.length === 0) return null;

  for (const serverName of SERVER_PRIORITY) {
    const found = embeds.find(e => e.server === serverName && e.url);
    if (found) return found;
  }
  return embeds[0] || null;
}

function resolveEmbeds(embedsObj) {
  const subs = embedsObj?.SUB || [];
  const dubs = embedsObj?.DUB || [];

  const bestSub = pickBestEmbed(subs);
  const bestDub = pickBestEmbed(dubs);

  // Preferir SUB; si no, DUB
  const chosen = bestSub || bestDub;
  return {
    chosen,
    hasSub: subs.length > 0,
    hasDub: dubs.length > 0,
    allServers: {
      SUB: subs.map(e => e.server),
      DUB: dubs.map(e => e.server),
    },
  };
}

// ══════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════
async function getAnimesPendientes(limit) {
  // Prioridad 1: en emisión
  const { data: emision } = await sb
    .from('animes')
    .select('id, titulo, animeav1_slug, estado_emision')
    .not('animeav1_slug', 'is', null)
    .in('estado_emision', ['emitido', 'en_espera'])
    .limit(limit);

  const pendientes = [...(emision || [])];

  if (pendientes.length < limit) {
    const faltan = limit - pendientes.length;
    const { data: resto } = await sb
      .from('animes')
      .select('id, titulo, animeav1_slug, estado_emision')
      .not('animeav1_slug', 'is', null)
      .not('estado_emision', 'in', '("emitido","en_espera")')
      .limit(faltan);
    pendientes.push(...(resto || []));
  }

  return pendientes;
}

async function animeYaTieneTodosLosEpisodios(animeId, av1EpisodeNumbers) {
  const { data: temps } = await sb
    .from('temporadas')
    .select('id')
    .eq('anime_id', animeId);

  if (!temps || temps.length === 0) return false;

  const tempIds = temps.map(t => t.id);

  const { data: eps } = await sb
    .from('episodios')
    .select('numero, url_stream')
    .in('temporada_id', tempIds);

  if (!eps) return false;

  const conUrl = new Set(
    eps.filter(e => e.url_stream).map(e => e.numero)
  );

  return av1EpisodeNumbers.every(n => conUrl.has(n));
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('📺 TENKO Scraper (SvelteKit direct)');
  console.log('═══════════════════════════════════════');
  console.log('Limit:', LIMIT);
  console.log('═══════════════════════════════════════\n');

  const animes = await getAnimesPendientes(LIMIT);
  console.log(`📥 ${animes.length} animes candidatos\n`);

  let animesOK = 0;
  let animesFail = 0;
  let totalEps = 0;

  for (const anime of animes) {
    const prioridad = ['emitido', 'en_espera'].includes(anime.estado_emision) ? '🔴' : '🟡';
    console.log(`\n${prioridad} [${anime.titulo}] (${anime.estado_emision || '?'})`);

    try {
      // 1. Página del anime → lista de episodios + mediaId
      const animeHtml = await fetchHtml(`https://animeav1.com/media/${anime.animeav1_slug}`);
      const animeData = extractSvelteData(animeHtml);
      const animeInfo = extractAnimeInfo(animeData);

      if (!animeInfo || !animeInfo.episodes?.length) {
        console.log('  ⚠️  Sin episodios en la página del anime');
        animesFail++;
        await sleep(DELAY_MS);
        continue;
      }

      const epNumbers = animeInfo.episodes.map(e => e.number);
      console.log(`  📋 ${epNumbers.length} episodios, mediaId=${animeInfo.mediaId}`);

      // 2. Verificar si ya tiene todos
      const yaTieneTodos = await animeYaTieneTodosLosEpisodios(anime.id, epNumbers);
      if (yaTieneTodos) {
        console.log(`  ⏭️  Ya tiene todos los episodios, saltando`);
        await sleep(DELAY_MS);
        continue;
      }

      // 3. Obtener/crear temporada
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
        console.log('  ❌ No se pudo crear la temporada');
        animesFail++;
        continue;
      }

      // 4. Para cada episodio: scrape página del episodio
      let nuevos = 0;
      for (const epInfo of animeInfo.episodes) {
        const epNum = epInfo.number;

        // Verificar si ya existe con url_stream
        const { data: existente } = await sb
          .from('episodios')
          .select('id, url_stream')
          .eq('temporada_id', temp.id)
          .eq('numero', epNum)
          .maybeSingle();

        if (existente?.url_stream) continue;

        try {
          const epHtml = await fetchHtml(`https://animeav1.com/media/${anime.animeav1_slug}/${epNum}`);
          const epData = extractSvelteData(epHtml);
          const epDetails = extractEpisodeInfo(epData);

          if (!epDetails?.embeds) {
            console.log(`    ⚠️  Ep ${epNum}: sin embeds`);
            await sleep(DELAY_MS);
            continue;
          }

          const { chosen } = resolveEmbeds(epDetails.embeds);

          if (!chosen?.url) {
            console.log(`    ⚠️  Ep ${epNum}: sin mirror válido`);
            await sleep(DELAY_MS);
            continue;
          }

          // Thumbnail: cdn.animeav1.com/screenshots/{mediaId}/{epNum}.jpg
          const thumbnail = `https://cdn.animeav1.com/screenshots/${animeInfo.mediaId}/${epNum}.jpg`;

          const payload = {
            temporada_id: temp.id,
            numero: epNum,
            titulo: epDetails.title || `Episodio ${epNum}`,
            titulo_episodio: epDetails.title || `Episodio ${epNum}`,
            thumbnail_url: thumbnail,
            url_stream: chosen.url,
            fuente: 'animeav1',
          };

          if (existente) {
            await sb.from('episodios').update(payload).eq('id', existente.id);
          } else {
            await sb.from('episodios').insert(payload);
          }

          console.log(`    ✅ Ep ${epNum} (${chosen.server})`);
          nuevos++;
          await sleep(DELAY_MS);
        } catch (err) {
          console.log(`    ❌ Ep ${epNum}: ${err.message}`);
          await sleep(DELAY_MS);
        }
      }

      console.log(`  🎉 ${nuevos} episodios nuevos`);
      totalEps += nuevos;
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
  console.log(`📺 Episodios nuevos: ${totalEps}`);
  console.log('═══════════════════════════════════════');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
