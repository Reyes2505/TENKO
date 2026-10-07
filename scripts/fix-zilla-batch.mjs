import { createClient } from '@supabase/supabase-js';
import { getEpisode } from 'animeav1-api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixZillaBatch(limit = 500) {
  console.log(`🔍 Buscando hasta ${limit} episodios con servidor Zilla...`);

  const { data: episodios, error } = await supabase
    .from('episodios')
    .select(`
      id,
      numero,
      url_stream,
      temporadas!inner (
        animes!inner (
          animeav1_slug
        )
      )
    `)
    .like('url_stream', '%zilla-networks%')
    .limit(limit);

  if (error) {
    console.error('❌ Error al consultar episodios:', error.message);
    return;
  }

  console.log(`📦 Encontrados ${episodios.length} episodios por corregir.`);
  let convertidos = 0;

  for (const ep of episodios) {
    const slug = ep.temporadas?.animes?.animeav1_slug;
    if (!slug) continue;

    try {
      const epDetalle = await getEpisode(slug, ep.numero);
      const embedsSub = epDetalle?.embeds?.SUB || [];
      const embedsDub = epDetalle?.embeds?.DUB || [];

      const mirror = embedsSub.find(e => e.server === 'UPNShare') ||
                     embedsDub.find(e => e.server === 'UPNShare') ||
                     embedsSub.find(e => e.server === 'Voe') ||
                     embedsSub.find(e => e.server === 'Byse');

      if (mirror?.url) {
        await supabase
          .from('episodios')
          .update({ url_stream: mirror.url, fuente: 'animeav1' })
          .eq('id', ep.id);

        convertidos++;
        console.log(`✅ [${convertidos}/${episodios.length}] Ep ${ep.numero} (${slug}) → ${mirror.server}`);
      } else {
        console.warn(`⚠️ Sin mirror compatible para Ep ${ep.numero} (${slug})`);
      }
    } catch (err) {
      console.error(`❌ Error procesando Ep ${ep.numero} (${slug}):`, err.message);
    }
  }

  console.log(`🎉 Proceso completado: ${convertidos} episodios migrados a UPNShare/Voe.`);
}

fixZillaBatch(process.argv[2] ? parseInt(process.argv[2]) : 500);
