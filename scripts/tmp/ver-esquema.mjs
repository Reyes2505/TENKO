import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const { data: anime } = await sb.from('animes').select('*').limit(1).maybeSingle();
console.log('=== ESTRUCTURA: animes ===');
console.log(JSON.stringify(anime, null, 2));

const { data: temp } = await sb.from('temporadas').select('*').limit(1).maybeSingle();
console.log('\n=== ESTRUCTURA: temporadas ===');
console.log(JSON.stringify(temp, null, 2));

const { data: ep } = await sb.from('episodios').select('*').limit(1).maybeSingle();
console.log('\n=== ESTRUCTURA: episodios ===');
console.log(JSON.stringify(ep, null, 2));

const { count: totalAnimes } = await sb.from('animes').select('*', { count: 'exact', head: true });
const { count: totalTemps } = await sb.from('temporadas').select('*', { count: 'exact', head: true });
const { count: totalEps } = await sb.from('episodios').select('*', { count: 'exact', head: true });

console.log('\n=== TOTALES ===');
console.log('Animes:', totalAnimes);
console.log('Temporadas:', totalTemps);
console.log('Episodios:', totalEps);
