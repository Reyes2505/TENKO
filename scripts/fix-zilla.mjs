import { getEpisode } from 'animeav1-api';
import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. Obtener todos los episodios con Zilla
const { data: zillaEps } = await sb
  .from('episodios')
  .select('id, numero, temporada_id, url_stream')
  .ilike('url_stream', '%zilla-networks%');

console.log(`📊 ${zillaEps?.length || 0} episodios con Zilla a procesar\n`);

// 2. Agrupar por temporada → anime → slug
const porTemporada = {};
for (const ep of zillaEps || []) {
  if (!porTemporada[ep.temporada_id]) porTemporada[ep.temporada_id] = [];
  porTemporada[ep.temporada_id].push(ep);
}

console.log(`Temporadas afectadas: ${Object.keys(porTemporada).length}\n`);

let actualizados = 0;
let errores = 0;

for (const [tempId, eps] of Object.entries(porTemporada)) {
  // Obtener el anime y slug
  const { data: temp } = await sb
    .from('temporadas')
    .select('anime_id')
    .eq('id', tempId)
    .maybeSingle();

  if (!temp) continue;

  const { data: anime } = await sb
    .from('animes')
    .select('animeav1_slug')
    .eq('id', temp.anime_id)
    .maybeSingle();

  if (!anime?.animeav1_slug) {
    console.log(`⚠️  Sin slug para temporada ${tempId}`);
    continue;
  }

  console.log(`🎬 ${anime.animeav1_slug} (${eps.length} episodios)`);

  // ✅ Cortar si llegamos al límite
  if (procesados >= LIMIT) {
    console.log(`\n⏹️  Límite alcanzado (${LIMIT} episodios)`);
    break;
  }

  for (const ep of eps) {
    // ✅ Cortar si llegamos al límite
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

      const { error } = await sb
        .from('episodios')
        .update({ url_stream: streamUrl, fuente: 'animeav1' })
        .eq('id', ep.id);

      if (error) {
        errores++;
      } else {
        actualizados++;
        if (actualizados % 20 === 0) {
          console.log(`  ✅ ${actualizados} actualizados...`);
        }
      }

      await new Promise(r => setTimeout(r, DELAY_MS));
    } catch (err) {
      errores++;
    }
  }
}

console.log('\n═══════════════════════════════════════');
console.log('📊 RESUMEN');
console.log('═══════════════════════════════════════');
console.log(`✅ Actualizados: ${actualizados}`);
console.log(`❌ Errores: ${errores}`);
  console.log(`📊 Total procesados: ${procesados}`);
