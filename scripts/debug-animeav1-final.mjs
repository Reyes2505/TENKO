const SLUG = 'tokyo-ghoul';
const EP = 1;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  'Referer': 'https://animeav1.com/',
};

async function fetchHtml(url) {
  const res = await fetch(url, { headers: HEADERS });
  return await res.text();
}

// ══════════════════════════════════════════════════════════════════
// 1. TODOS los iframes de la página del episodio
// ══════════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log('🔍 1. IFRAMES DEL EPISODIO');
console.log('═══════════════════════════════════════════════════════════════\n');

const epHtml = await fetchHtml(`https://animeav1.com/media/${SLUG}/${EP}`);

const allIframes = [...epHtml.matchAll(/<iframe[^>]*?src=["']([^"']+)["'][^>]*>/gi)];
console.log(`Total iframes: ${allIframes.length}\n`);
allIframes.forEach((m, i) => {
  console.log(`[${i + 1}] ${m[1]}`);
});

// ══════════════════════════════════════════════════════════════════
// 2. Todos los "data-" del HTML
// ══════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🔍 2. ATRIBUTOS data-* CON URLs');
console.log('═══════════════════════════════════════════════════════════════\n');

const dataAttrs = [...epHtml.matchAll(/data-[a-z-]+=["']([^"']*https?:\/\/[^"']+)["']/gi)];
dataAttrs.forEach((m, i) => {
  console.log(`[${i + 1}] ${m[0].slice(0, 200)}`);
});

// ══════════════════════════════════════════════════════════════════
// 3. TODAS las URLs de animeav1.com o cdn.animeav1.com
// ══════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🔍 3. URLs DE animeav1.com / cdn.animeav1.com');
console.log('═══════════════════════════════════════════════════════════════\n');

const avUrls = [...new Set([...epHtml.matchAll(/https?:\/\/(?:cdn\.)?animeav1\.com[^"'\s)]*/gi)].map(m => m[0]))];
avUrls.slice(0, 20).forEach((u, i) => console.log(`[${i + 1}] ${u}`));

// ══════════════════════════════════════════════════════════════════
// 4. Bloque COMPLETO del script de SvelteKit (data:)
// ══════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🔍 4. BLOQUE DE DATOS DE SVELTEKIT');
console.log('═══════════════════════════════════════════════════════════════\n');

const svelteKitMatch = epHtml.match(/__sveltekit_\w+\s*=\s*\{[\s\S]*?data:\s*\[[\s\S]*?\]\s*\}\s*\)\s*;/);
if (svelteKitMatch) {
  console.log(svelteKitMatch[0].slice(0, 5000));
} else {
  console.log('No se encontró el bloque SvelteKit con la regex simple.');

  // Buscar el inicio del bloque data:
  const dataIdx = epHtml.indexOf('data: [');
  if (dataIdx >= 0) {
    console.log('--- Bloque data: (primeros 3000 chars) ---');
    console.log(epHtml.slice(dataIdx, dataIdx + 3000));
  }
}

// ══════════════════════════════════════════════════════════════════
// 5. PÁGINA DEL ANIME (para thumbnails y lista de episodios)
// ══════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🔍 5. PÁGINA DEL ANIME /media/' + SLUG);
console.log('═══════════════════════════════════════════════════════════════\n');

const animeHtml = await fetchHtml(`https://animeav1.com/media/${SLUG}`);
console.log(`HTML length: ${animeHtml.length}`);

// Buscar thumbnails
const thumbs = [...new Set([...animeHtml.matchAll(/https?:\/\/cdn\.animeav1\.com\/[^"'\s)]+\.(?:jpg|jpeg|png|webp)/gi)].map(m => m[0]))];
console.log(`\nThumbnails encontrados: ${thumbs.length}`);
thumbs.slice(0, 10).forEach((t, i) => console.log(`[${i + 1}] ${t}`));

// Buscar referencias a "episodios" en el HTML
console.log('\n--- Buscando bloque de episodios ---');
const epSection = animeHtml.match(/<a[^>]*href=["']\/media\/[^"']+\/\d+["'][^>]*>/gi);
if (epSection) {
  console.log(`Enlaces a episodios: ${epSection.length}`);
  epSection.slice(0, 5).forEach(e => console.log(`  ${e.slice(0, 200)}`));
}

// ══════════════════════════════════════════════════════════════════
// 6. COMPARAR: SUB vs DUB (parámetro ?lang=)
// ══════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🔍 6. PROBANDO CON ?lang=SUB y ?lang=DUB');
console.log('═══════════════════════════════════════════════════════════════\n');

for (const lang of ['SUB', 'DUB', 'sub', 'dub']) {
  const url = `https://animeav1.com/media/${SLUG}/${EP}?lang=${lang}`;
  try {
    const html = await fetchHtml(url);
    const iframe = html.match(/<iframe[^>]*?src=["']([^"']+)["']/i);
    console.log(`[${lang}] iframe: ${iframe ? iframe[1] : 'ninguno'}`);
  } catch (err) {
    console.log(`[${lang}] Error: ${err.message}`);
  }
}
