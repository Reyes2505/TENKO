/**
 * Convierte episodios con Zilla Networks a UPNShare o Voe.
 *
 * Uso:
 *   node --env-file=.env.local scripts/fix-zilla.mjs
 *   node --env-file=.env.local scripts/fix-zilla.mjs --limit 100
 */

import { getEpisode } from 'animeav1-api';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Argumentos ────────────────────────────────────────
const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : Infinity;

// ─── Constantes ────────────────────────────────────────
const DELAY_MS = 300;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Main ──────────────────────────────────────────────
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('🔧 TENKO Fix-Zilla — Convertir a UPNShare');
  console.log('═══════════════════════════════════════');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
  console.log('Service key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  console.log('Limit:', LIMIT === Infinity ? '∞' : LIMIT);
  console.log('CI mode:', process.env.CI === 'true' ? '✅' : 'local');
  console.log('═══════════════════════════════════════\n');

  // 1. Buscar episodios con Zilla
  console.log('📊 Buscando episodios con Zilla...\n');

  const { data: zillaEps, error } = await sb
    .from('episodios')
    .select('id, numero, temporada_id')
    .ilike('url_stream', '%zilla-networks%');

  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  const total = zillaEps?.length || 0;
  console.log(`Total con Zilla: ${total}\n`);

  if (total === 0) {
    console.log('✅ No hay episodios con Zilla. Nada que hacer.');
    return;
  }

  // 2. Agrupar por temporada
  const porTemporada = {};
  for (const ep of zillaEps) {
    if (!porTemporada[ep.temporada_id]) porTemporada[ep.temporada_id] = [];
    porTemporada[ep.temporada_id].push(ep);
  }

  console.log(`Temporadas afectadas: ${Object.keys(porTemporada).length}\n`);

  // 3. Contadores
  let actualizados = 0;
  let errores = 0;
  let sinUPN = 0;
  let procesados = 0;

  // 4. Procesar cada temporada
  for (const [tempId, eps] of Object.entries(porTemporada)) {
    // Cortar si llegamos al límite
    if (procesados >= LIMIT) {
      console.log(`\n⏹️  Límite alcanzado (${LIMIT} episodios)`);
      break;
    }

    const { data: temp } = await sb
      .from('temporadas')
      .select('anime_id')
      .eq('id', tempId)
      .maybeSingle();

    if (!temp) continue;

    const { data: anime } = await sb
      .from('animes')
      .select('animeav1_slug, titulo')
      .eq('id', temp.anime_id)
      .maybeSingle();

    if (!anime?.animeav1_slug) {
      console.log(`⚠️  Sin slug: ${tempId}`);
      continue;
    }

    console.log(`🎬 ${anime.titulo} (${eps.length} eps)`);

    for (const ep of eps) {
      // Cortar si llegamos al límite
      if (procesados >= LIMIT) break;
      procesados++;

      try {
        const epDetalle = await getEpisode(anime.animeav1_slug, ep.numero);
        const embedsSub = epDetalle?.embeds?.SUB || [];
        const embedsDub = epDetalle?.embeds?.DUB || [];

        let streamUrl = null;

        // Prioridad 1: UPNShare
        const upn = embedsSub.find(e => e.server === 'UPNShare')
                 || embedsDub.find(e => e.server === 'UPNShare');
        if (upn) streamUrl = upn.url;

        // Prioridad 2: Voe
        if (!streamUrl) {
          const voe = embedsSub.find(e => e.server === 'Voe')
                   || embedsDub.find(e => e.server === 'Voe');
          if (voe) streamUrl = voe.url;
        }

        if (!streamUrl) {
          sinUPN++;
          continue;
        }

        const { error: updateError } = await sb
          .from('episodios')
          .update({ url_stream: streamUrl, fuente: 'animeav1' })
          .eq('id', ep.id);

        if (updateError) {
          errores++;
        } else {
          actualizados++;
          if (actualizados % 20 === 0) {
            console.log(`  ✅ ${actualizados} actualizados...`);
          }
        }

        await sleep(DELAY_MS);
      } catch (err) {
        errores++;
      }
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📊 RESUMEN');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Actualizados: ${actualizados}`);
  console.log(`⚠️  Sin UPNShare/Voe: ${sinUPN}`);
  console.log(`❌ Errores: ${errores}`);
  console.log(`📊 Total procesados: ${procesados}`);
  console.log('═══════════════════════════════════════');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
