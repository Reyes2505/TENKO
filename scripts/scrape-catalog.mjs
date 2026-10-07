/**
 * Scrapea el catálogo completo de AnimeAV1 e inserta animes nuevos en Supabase.
 *
 * Uso: node --env-file=.env.local scripts/scrape-catalog.mjs [--max-pages N]
 */

import { createClient } from '@supabase/supabase-js';
import { getCatalog } from 'animeav1-api';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const args = process.argv.slice(2);
const maxPagesIdx = args.indexOf('--max-pages');
const MAX_PAGES = maxPagesIdx >= 0 ? parseInt(args[maxPagesIdx + 1], 10) : 100;

const DELAY_MS = 800;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function normalizarTitulo(t) {
  return (t || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapearEstado(statusText) {
  switch ((statusText || '').toLowerCase()) {
    case 'airing':   return 'emitido';
    case 'finished': return 'terminado';
    case 'upcoming': return 'en_espera';
    default:         return 'desconocido';
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('📚 TENKO Catalog Scraper — AnimeAV1');
  console.log('═══════════════════════════════════════');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌');
  console.log('Service key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌');
  console.log('Max pages:', MAX_PAGES);
  console.log('═══════════════════════════════════════\n');

  // 1. Cargar todos los slugs existentes (para no duplicar)
  console.log('📥 Cargando slugs existentes en Supabase...');
  const { data: existentes } = await sb
    .from('animes')
    .select('animeav1_slug')
    .not('animeav1_slug', 'is', null);

  const slugsExistentes = new Set((existentes || []).map(a => a.animeav1_slug));
  console.log(`   ${slugsExistentes.size} animes ya tienen animeav1_slug\n`);

  let nuevos = 0;
  let existentesCount = 0;
  let page = 1;

  while (page <= MAX_PAGES) {
    console.log(`📄 Página ${page}...`);

    let catalog;
    try {
      catalog = await getCatalog({ page });
    } catch (err) {
      console.log(`  ⚠️  Error en página ${page}: ${err.message}`);
      break;
    }

    const items = catalog?.items || [];
    if (items.length === 0) {
      console.log(`  ℹ️  Sin más items. Fin del catálogo en página ${page}.`);
      break;
    }

    for (const item of items) {
      // ¿Ya lo tenemos?
      if (slugsExistentes.has(item.slug)) {
        existentesCount++;
        continue;
      }

      // Insertar nuevo anime
      const { error } = await sb.from('animes').insert({
        titulo: item.title,
        sinopsis: item.synopsis || '',
        portada_url: item.poster || '',
        banner_url: item.backdrop || item.poster || '',
        generos: [], // se llenan en el siguiente paso
        estado: 'EN_EMISION',
        estado_emision: 'desconocido',
        animeav1_slug: item.slug,
        es_nuevo: true,
      });

      if (error) {
        console.log(`  ❌ Error insertando "${item.title}": ${error.message}`);
      } else {
        nuevos++;
        slugsExistentes.add(item.slug);
        if (nuevos <= 5 || nuevos % 20 === 0) {
          console.log(`  ✅ Nuevo: ${item.title}`);
        }
      }

      await sleep(200);
    }

    console.log(`  Página ${page}: ${items.length} items (${existentesCount} ya existían, ${nuevos} nuevos acumulados)`);

    page++;
    await sleep(DELAY_MS);
  }

  console.log('\n═══════════════════════════════════════');
  console.log('📊 RESUMEN DEL CATÁLOGO');
  console.log('═══════════════════════════════════════');
  console.log(`✅ Animes nuevos insertados: ${nuevos}`);
  console.log(`ℹ️  Animes que ya existían: ${existentesCount}`);
  console.log(`📄 Páginas procesadas: ${page - 1}`);
  console.log('═══════════════════════════════════════');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
