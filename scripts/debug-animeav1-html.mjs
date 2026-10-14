const SLUG = 'love-live-hasunosora-jogakuin-school-idol-club';
const EP = 1;

const urls = [
  `https://animeav1.com/ver/${SLUG}/${EP}`,
  `https://animeav1.com/ver/${SLUG}`,
  `https://animeav1.com/anime/${SLUG}`,
  `https://animeav1.com/media/${SLUG}`,
];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

for (const url of urls) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`URL: ${url}`);
  console.log('='.repeat(80));

  try {
    const res = await fetch(url, { headers: HEADERS });
    console.log(`Status: ${res.status}`);
    console.log(`Final URL: ${res.url}`);
    console.log(`Content-Type: ${res.headers.get('content-type')}`);

    if (!res.ok) {
      console.log('❌ No OK, saltando HTML');
      continue;
    }

    const html = await res.text();
    console.log(`HTML length: ${html.length} chars`);
    console.log(`\n--- Primeros 1500 chars ---\n${html.slice(0, 1500)}`);

    // Buscar patrones útiles
    console.log('\n--- Patrones encontrados ---');

    // 1. iframes
    const iframes = html.match(/<iframe[^>]+src=["']([^"']+)/gi);
    console.log(`iframes: ${iframes ? iframes.length : 0}`);
    if (iframes) iframes.slice(0, 5).forEach(f => console.log(`  ${f.slice(0, 150)}`));

    // 2. server names (UPNShare, Voe, etc.)
    const servers = html.match(/(UPNShare|Voe|Filemoon|mp4upload|Streamtape|Doodstream)/gi);
    console.log(`Servidores mencionados: ${servers ? [...new Set(servers)].join(', ') : 'ninguno'}`);

    // 3. URLs de embed
    const embedUrls = html.match(/https?:\/\/[^"'\s]+(?:upnshare|voe\.sx|filemoon|mp4upload|streamtape|dood)[^"'\s]*/gi);
    console.log(`URLs de embed: ${embedUrls ? embedUrls.length : 0}`);
    if (embedUrls) embedUrls.slice(0, 5).forEach(u => console.log(`  ${u}`));

    // 4. __NEXT_DATA__ o similar
    const nextData = html.match(/<script id="__NEXT_DATA__"[^>]*>([^<]+)/);
    if (nextData) {
      console.log(`\n__NEXT_DATA__ encontrado, ${nextData[1].length} chars`);
      try {
        const data = JSON.parse(nextData[1]);
        console.log('Keys:', Object.keys(data.props?.pageProps || {}).slice(0, 15));
      } catch (e) {
        console.log('No parseable como JSON');
      }
    }

    // 5. Scripts con datos embebidos
    const scripts = html.match(/<script[^>]*>[\s\S]{100,}?<\/script>/gi);
    console.log(`\nScripts con contenido: ${scripts ? scripts.length : 0}`);

  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
}
