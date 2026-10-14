const TEST_ID = 'lrks1d'; // de tu tabla

async function testHead() {
  console.log('\n=== TEST 1: HEAD con redirect: manual ===');
  try {
    const res = await fetch(`https://animeav1.uns.bio/${TEST_ID}`, {
      method: 'HEAD',
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    console.log('Status:', res.status);
    console.log('Location:', res.headers.get('location'));
    console.log('URL final:', res.url);
  } catch (err) {
    console.log('Error:', err.message);
  }
}

async function testGet() {
  console.log('\n=== TEST 2: GET con redirect: follow ===');
  try {
    const res = await fetch(`https://animeav1.uns.bio/${TEST_ID}`, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    console.log('Status:', res.status);
    console.log('URL final:', res.url);
    const html = await res.text();
    console.log('HTML (primeros 500 chars):');
    console.log(html.slice(0, 500));
  } catch (err) {
    console.log('Error:', err.message);
  }
}

async function testGetWithHash() {
  console.log('\n=== TEST 3: GET con hash ===');
  try {
    const res = await fetch(`https://animeav1.uns.bio/#${TEST_ID}`, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    console.log('Status:', res.status);
    console.log('Location:', res.headers.get('location'));
    console.log('URL final:', res.url);
  } catch (err) {
    console.log('Error:', err.message);
  }
}

async function testApiEndpoint() {
  console.log('\n=== TEST 4: Posible endpoint API ===');
  const endpoints = [
    `https://animeav1.uns.bio/api/${TEST_ID}`,
    `https://animeav1.uns.bio/e/${TEST_ID}`,
    `https://animeav1.uns.bio/${TEST_ID}?json=1`,
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      console.log(`\n${url}`);
      console.log('  Status:', res.status);
      console.log('  URL final:', res.url);
    } catch (err) {
      console.log(`\n${url}`);
      console.log('  Error:', err.message);
    }
  }
}

await testHead();
await testGet();
await testGetWithHash();
await testApiEndpoint();
