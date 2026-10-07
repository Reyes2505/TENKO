import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('=== Longitudes ===');
console.log('URL len:', url?.length);
console.log('Anon len:', anonKey?.length);
console.log('Service len:', serviceKey?.length);

console.log('\n=== Primeros 20 chars (sin exponer) ===');
console.log('Service:', serviceKey?.substring(0, 20));
console.log('Service últimos 20:', serviceKey?.substring(serviceKey.length - 20));

console.log('\n=== Decodificar payload del JWT ===');
try {
  const payload = JSON.parse(Buffer.from(serviceKey.split('.')[1], 'base64').toString());
  console.log(JSON.stringify(payload, null, 2));
} catch (e) {
  console.error('❌ No se puede decodificar:', e.message);
}

console.log('\n=== Test 1: con head:true (como el que funcionó) ===');
const sb1 = createClient(url, serviceKey);
const r1 = await sb1.from('animes').select('*', { count: 'exact', head: true });
console.log('count:', r1.count, '| error:', r1.error?.message || 'none');

console.log('\n=== Test 2: con head:false ===');
const r2 = await sb1.from('animes').select('*', { count: 'exact' }).limit(1);
console.log('count:', r2.count, '| error:', r2.error?.message || 'none');
console.log('data:', JSON.stringify(r2.data));

console.log('\n=== Test 3: con anon key ===');
const sb2 = createClient(url, anonKey);
const r3 = await sb2.from('animes').select('*', { count: 'exact' }).limit(1);
console.log('count:', r3.count, '| error:', r3.error?.message || 'none');
