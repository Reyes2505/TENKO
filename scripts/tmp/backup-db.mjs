import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'fs';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const dir = `backups/${timestamp}`;
mkdirSync(dir, { recursive: true });

console.log(`📦 Backup en ${dir}\n`);

for (const tabla of ['animes', 'temporadas', 'episodios']) {
  console.log(`⏳ Descargando ${tabla}...`);

  // Paginar (Supabase devuelve máximo 1000 filas por request)
  const PAGE_SIZE = 1000;
  let all = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await sb
      .from(tabla)
      .select('*')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error(`  ❌ Error en ${tabla}:`, error.message);
      break;
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      all = all.concat(data);
      offset += PAGE_SIZE;
      process.stdout.write(`  ${all.length} filas...\r`);
    }

    if (data && data.length < PAGE_SIZE) hasMore = false;
  }

  writeFileSync(`${dir}/${tabla}.json`, JSON.stringify(all, null, 2));
  console.log(`  ✅ ${tabla}: ${all.length} filas guardadas`);
}

console.log(`\n✅ Backup completo en ${dir}`);
