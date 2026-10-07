import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔄 Reseteando flags de animes...');

// Limpiar jk_slug y animeav1_slug para forzar re-scraping
const { error, count } = await sb
  .from('animes')
  .update({
    jk_slug: null,
    animeav1_slug: null,
    ultima_verificacion_jk: null,
    ultima_sincronizacion: null,
    fecha_ultimo_episodio: null,
  })
  .not('id', 'is', null);

if (error) {
  console.error('❌', error.message);
} else {
  console.log(`✅ ${count || 'todos los'} animes reseteados para re-scraping`);
}
