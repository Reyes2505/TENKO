import { createClient } from '@supabase/supabase-js';
import { search } from 'animeav1-api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function matchCascaronesB() {
  const { data: cascaronesB, error } = await supabase
    .from('animes')
    .select('id, titulo')
    .is('animeav1_slug', null);

  if (error) {
    console.error('❌ Error obteniendo cascarones B:', error.message);
    return;
  }

  console.log(`🔍 Analizando ${cascaronesB.length} animes sin slug...`);
  let encontrados = 0;
  let huerfanos = 0;

  for (const anime of cascaronesB) {
    try {
      const resultados = await search(anime.titulo);
      
      if (resultados && resultados.length > 0) {
        const mejorCoincidencia = resultados[0];
        
        await supabase
          .from('animes')
          .update({ animeav1_slug: mejorCoincidencia.slug })
          .eq('id', anime.id);

        encontrados++;
        console.log(`✅ Slug asignado: "${anime.titulo}" → ${mejorCoincidencia.slug}`);
      } else {
        huerfanos++;
        console.warn(`🔴 Cascarón Tipo C (Huérfano): "${anime.titulo}"`);
      }
    } catch (err) {
      console.error(`❌ Error buscando "${anime.titulo}":`, err.message);
    }
  }

  console.log(`\n📊 Resultados:
  - Slugs recuperados (Tipo B → Tipo A): ${encontrados}
  - Animes huérfanos confirmados (Tipo C): ${huerfanos}`);
}

matchCascaronesB();
