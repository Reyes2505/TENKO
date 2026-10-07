import { createClient } from '@supabase/supabase-js';
import { getEpisode } from 'animeav1-api';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. ¿Existe el anime en DB?
const { data: anime } = await sb
  .from('animes')
  .select('id, titulo, animeav1_slug')
  .ilike('titulo', '%Frieren 2nd%')
  .maybeSingle();

console.log('1. Anime en DB:', anime);

if (!anime) { process.exit(0); }

// 2. ¿Tiene temporadas?
const { data: temps } = await sb
  .from('temporadas')
  .select('id, nombre')
  .eq('anime_id', anime.id);
console.log('\n2. Temporadas:', temps);

// 3. ¿Tiene episodios?
if (temps?.length) {
  const { count } = await sb
    .from('episodios')
    .select('*', { count: 'exact', head: true })
    .eq('temporada_id', temps[0].id);
  console.log('\n3. Episodios en temp[0]:', count);
}

// 4. ¿getEpisode devuelve HLS?
const ep = await getEpisode('sousou-no-frieren-2nd-season', 1);
const hls = ep?.embeds?.SUB?.find(e => e.server === 'HLS')?.url
        || ep?.embeds?.DUB?.find(e => e.server === 'HLS')?.url;
console.log('\n4. getEpisode(1):');
console.log('   Keys:', Object.keys(ep || {}));
console.log('   Embeds.SUB servers:', ep?.embeds?.SUB?.map(e => e.server));
console.log('   HLS URL:', hls);
