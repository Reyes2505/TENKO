console.log('=== Test 1: Buscar "Frieren" ===');
try {
  const { searchAnime } = await import('animeav1-api');
  const results = await searchAnime('Frieren');
  console.log(JSON.stringify(results?.slice(0, 2), null, 2));
} catch (e) {
  console.error('❌ Error:', e.message);
}

console.log('\n=== Test 2: Catálogo página 1 ===');
try {
  const { getCatalog } = await import('animeav1-api');
  const catalog = await getCatalog({ page: 1 });
  console.log('Total items:', catalog?.items?.length || 0);
  console.log('Primer item:', JSON.stringify(catalog?.items?.[0], null, 2));
} catch (e) {
  console.error('❌ Error:', e.message);
}
