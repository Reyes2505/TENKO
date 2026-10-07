import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('=== 1. Columnas legacy en animes ===');
const { data: sample } = await sb.from('animes').select('*').limit(1).maybeSingle();
console.log('Columnas:', Object.keys(sample || {}).join(', '));

console.log('\n=== 2. Animes con jk_slug ===');
const { count: conJkSlug } = await sb
  .from('animes')
  .select('*', { count: 'exact', head: true })
  .not('jk_slug', 'is', null);
console.log('Con jk_slug:', conJkSlug);

console.log('\n=== 3. Episodios con URL de JK Anime ===');
const { count: conUrlJK } = await sb
  .from('episodios')
  .select('*', { count: 'exact', head: true })
  .ilike('url_stream', '%jkanime%');
console.log('Con url jkanime:', conUrlJK);

console.log('\n=== 4. Total de episodios ===');
const { count: totalEp } = await sb
  .from('episodios')
  .select('*', { count: 'exact', head: true });
console.log('Total episodios:', totalEp);

console.log('\n=== 5. Episodios con HLS de AnimeAV1 (zilla-networks) ===');
const { count: conZilla } = await sb
  .from('episodios')
  .select('*', { count: 'exact', head: true })
  .ilike('url_stream', '%zilla-networks%');
console.log('Con zilla-networks (AnimeAV1):', conZilla);

console.log('\n=== 6. Animes con animeav1_slug ===');
const { count: conAv1Slug } = await sb
  .from('animes')
  .select('*', { count: 'exact', head: true })
  .not('animeav1_slug', 'is', null);
console.log('Con animeav1_slug:', conAv1Slug);

console.log('\n=== 7. Ejemplos de url_stream ===');
const { data: samples } = await sb
  .from('episodios')
  .select('id, numero, url_stream, fuente')
  .not('url_stream', 'is', null)
  .limit(10);
samples?.forEach(s => {
  console.log(`- EP ${s.numero}: ${s.url_stream?.substring(0, 80)}... [fuente: ${s.fuente || 'null'}]`);
});
