import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 1. Listar todas las tablas accesibles
console.log('=== ¿Qué tablas existen? ===');
const { data: tablas, error: errTablas } = await sb
  .from('pg_tables')
  .select('tablename')
  .eq('schemaname', 'public');

if (errTablas) {
  console.error('❌ No puedo listar tablas:', errTablas.message);
} else {
  console.log('Tablas públicas:', tablas?.map(t => t.tablename).join(', ') || 'NINGUNA');
}

// 2. Probar cada tabla por separado con manejo de errores
for (const tabla of ['animes', 'temporadas', 'episodios']) {
  console.log(`\n=== Probando "${tabla}" ===`);
  const { data, count, error } = await sb
    .from(tabla)
    .select('*', { count: 'exact', head: false })
    .limit(1);

  if (error) {
    console.error(`❌ Error en "${tabla}":`, error.message, '| Código:', error.code);
  } else {
    console.log(`✅ "${tabla}" accesible. Registros: ${count}`);
    console.log('   Sample:', JSON.stringify(data?.[0], null, 2).substring(0, 300));
  }
}
