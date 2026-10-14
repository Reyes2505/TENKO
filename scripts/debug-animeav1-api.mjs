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
  return { status: res.status, url: res.url, html: await res.text() };
}

// ══════════════════════════════════════════════════════════════════
// 1. HTML de la página del episodio
// ══════════════════════════════════════════════════════════════════
console.log('═══════════════════════════════════════════════════════════════');
console.log(`📄 PÁGINA DEL EPISODIO: /media/${SLUG}/${EP}`);
console.log('═══════════════════════════════════════════════════════════════\n');

const page = await fetchHtml(`https://animeav1.com/media/${SLUG}/${EP}`);
console.log(`Status: ${page.status}`);
console.log(`HTML length: ${page.html.length}\n`);

// Buscar TODOS los scripts
const scripts = page.html.match(/<script[^>]*>([\s\S]*?)<\/script>/gi) || [];
console.log(`📜 Scripts encontrados: ${scripts.length}\n`);

// Buscar JSON embebidos
console.log('🔍 Buscando datos de embeds/servers en el HTML...\n');

// Patrón 1: URLs de embed
const embedPatterns = [
  /https?:\/\/[^"'\s]+(?:upnshare|voe\.sx|filemoon|mp4upload|streamtape|dood|okru|streamwish|vidhide)[^"'\s]*/gi,
  /"url"\s*:\s*"(https?:\/\/[^"]+)"/gi,
  /"embed"\s*:\s*"(https?:\/\/[^"]+)"/gi,
  /"server"\s*:\s*"([^"]+)"/gi,
  /"src"\s*:\s*"(https?:\/\/[^"]+)"/gi,
];

for (const pattern of embedPatterns) {
  const matches = [...page.html.matchAll(pattern)];
  if (matches.length > 0) {
    console.log(`✅ ${pattern.source.slice(0, 50)}... → ${matches.length} matches`);
    matches.slice(0, 5).forEach(m => console.log(`   ${m[1] || m[0]}`));
  }
}

// Patrón 2: __NEXT_DATA__, __NUXT__, window.__INITIAL_STATE__, etc.
console.log('\n🔍 Buscando estado inicial de la app...\n');
const statePatterns = [
  /__NEXT_DATA__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/,
  /__NUXT__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/,
  /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/,
  /window\.__DATA__\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/,
];

for (const pattern of statePatterns) {
  const match = page.html.match(pattern);
  if (match) {
    console.log(`✅ Encontrado: ${pattern.source.slice(0, 40)}...`);
    console.log(`   Longitud: ${match[1].length} chars`);
    try {
      const data = JSON.parse(match[1]);
      console.log('   Keys principales:', Object.keys(data).slice(0, 15).join(', '));
    } catch (e) {
      console.log(`   No parseable: ${e.message}`);
    }
  }
}

// Patrón 3: Ver TODOS los <script> con URLs
console.log('\n🔍 Scripts con URLs potencialmente útiles:\n');
let count = 0;
for (const script of scripts) {
  if (script.includes('embed') || script.includes('server') || script.includes('mirror') || script.includes('player')) {
    count++;
    console.log(`--- Script ${count} (${script.length} chars) ---`);
    console.log(script.slice(0, 800));
    console.log('---\n');
    if (count >= 3) break;
  }
}

// ══════════════════════════════════════════════════════════════════
// 2. Probar posibles endpoints de API
// ══════════════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🔌 PROBANDO ENDPOINTS DE API');
console.log('═══════════════════════════════════════════════════════════════\n');

const apiEndpoints = [
  `https://animeav1.com/api/media/${SLUG}/${EP}`,
  `https://animeav1.com/api/media/${SLUG}/episode/${EP}`,
  `https://animeav1.com/api/episode/${SLUG}/${EP}`,
  `https://animeav1.com/api/media/${SLUG}`,
  `https://animeav1.com/api/anime/${SLUG}/${EP}`,
  `https://animeav1.com/_next/data/${SLUG}/${EP}.json`,
];

for (const url of apiEndpoints) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    const text = await res.text();
    console.log(`\n${url}`);
    console.log(`  Status: ${res.status}`);
    console.log(`  Content-Type: ${res.headers.get('content-type')}`);
    if (res.ok && text.length < 2000) {
      console.log(`  Body: ${text.slice(0, 500)}`);
    } else if (res.ok) {
      console.log(`  Body length: ${text.length} chars`);
      console.log(`  Preview: ${text.slice(0, 300)}`);
    }
  } catch (err) {
    console.log(`\n${url}`);
    console.log(`  Error: ${err.message}`);
  }
}
