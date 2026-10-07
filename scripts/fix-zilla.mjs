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

  for (const ep of eps) {
    try {
      const epDetalle = await getEpisode(anime.animeav1_slug, ep.numero);
      const embedsSub = epDetalle?.embeds?.SUB || [];
      const embedsDub = epDetalle?.embeds?.DUB || [];

      // Buscar UPNShare
      const upn = embedsSub.find(e => e.server === 'UPNShare')
               || embedsDub.find(e => e.server === 'UPNShare');

      if (!upn) {
        console.log(`  ⚠️  EP ${ep.numero}: sin UPNShare`);
        continue;
      }

      const { error } = await sb
        .from('episodios')
        .update({ url_stream: upn.url, fuente: 'animeav1' })
        .eq('id', ep.id);

      if (error) {
        console.log(`  ❌ EP ${ep.numero}: ${error.message}`);
        errores++;
      } else {
        actualizados++;
      }

      await new Promise(r => setTimeout(r, 500));
    } catch (err) {
      console.log(`  ❌ EP ${ep.numero}: ${err.message}`);
      errores++;
    }
  }
}

console.log('\n═══════════════════════════════════════');
console.log('📊 RESUMEN');
console.log('═══════════════════════════════════════');
console.log(`✅ Actualizados: ${actualizados}`);
console.log(`❌ Errores: ${errores}`);
