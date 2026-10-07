import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'readline';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Confirmación manual
const rl = createInterface({ input: process.stdin, output: process.stdout });

console.log('⚠️  VAS A BORRAR:');
console.log('   - TODOS los episodios');
console.log('   - TODAS las temporadas');
console.log('   - Los animes SE CONSERVAN');
console.log('');

const respuesta = await new Promise(resolve =>
  rl.question('Escribe "CONFIRMAR" para continuar: ', resolve)
);
rl.close();

if (respuesta !== 'CONFIRMAR') {
  console.log('❌ Cancelado');
  process.exit(0);
}

console.log('\n🗑️  Borrando episodios...');
const { error: err1, count: c1 } = await sb
  .from('episodios')
  .delete({ count: 'exact' })
  .not('id', 'is', null);
if (err1) console.error('❌', err1.message);
else console.log(`✅ ${c1 || '?'} episodios eliminados`);

console.log('\n🗑️  Borrando temporadas...');
const { error: err2, count: c2 } = await sb
  .from('temporadas')
  .delete({ count: 'exact' })
  .not('id', 'is', null);
if (err2) console.error('❌', err2.message);
else console.log(`✅ ${c2 || '?'} temporadas eliminadas`);

console.log('\n✅ Wipe completado');
