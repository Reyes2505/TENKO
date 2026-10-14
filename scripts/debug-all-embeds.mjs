import vm from 'node:vm';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html',
  'Accept-Language': 'es-ES,es;q=0.9',
  'Referer': 'https://animeav1.com/',
};

function extractSvelteData(html) {
  const idx = html.indexOf('data: [');
  if (idx < 0) return null;
  const start = html.indexOf('[', idx);
  let depth = 0, end = -1, inString = false, stringChar = '', escaped = false;
  for (let i = start; i < html.length; i++) {
    const c = html[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\') { escaped = true; continue; }
    if (inString) { if (c === stringChar) inString = false; continue; }
    if (c === '"' || c === "'") { inString = true; stringChar = c; continue; }
    if (c === '[') depth++;
    else if (c === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end < 0) return null;
  const sandbox = {};
  vm.createContext(sandbox);
  return vm.runInContext('(' + html.slice(start, end + 1) + ')', sandbox);
}

const SLUG = 'tokyo-ghoul';
const EP = 1;

console.log(`Fetching https://animeav1.com/media/${SLUG}/${EP}...`);
const res = await fetch(`https://animeav1.com/media/${SLUG}/${EP}`, { headers: HEADERS });
const html = await res.text();

const data = extractSvelteData(html);

for (const item of data) {
  if (item?.data?.embeds) {
    console.log('\n═══════════════════════════════════════════════════');
    console.log('📺 EMBEDS DEL EPISODIO');
    console.log('═══════════════════════════════════════════════════\n');
    console.log(JSON.stringify(item.data.embeds, null, 2));
  }
}
