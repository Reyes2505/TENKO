import { createClient } from '@supabase/supabase-js';
const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test: agregar columnas via RPC (requiere permisos)
// Si no funciona, hay que hacerlo en el SQL Editor de Supabase

const { error: err1 } = await sb.rpc('exec_sql', {
  sql: `ALTER TABLE animes ADD COLUMN IF NOT EXISTS animeav1_slug TEXT;`
});

if (err1) {
  console.log('⚠️  No se pudo crear la columna vía RPC. Hazlo manualmente en Supabase → SQL Editor:');
  console.log(`
ALTER TABLE animes ADD COLUMN IF NOT EXISTS animeav1_slug TEXT;
CREATE INDEX IF NOT EXISTS idx_animes_animeav1_slug ON animes(animeav1_slug);
ALTER TABLE episodios ADD COLUMN IF NOT EXISTS fuente TEXT DEFAULT 'jkanime';
  `);
} else {
  console.log('✅ Columnas añadidas');
}
