console.log('═══════════════════════════════════════');
console.log('getAnime("sousou-no-frieren-2nd-season")');
console.log('═══════════════════════════════════════');
try {
  const { getAnime } = await import('animeav1-api');
  const anime = await getAnime('sousou-no-frieren-2nd-season');
  console.log('Tipo:', typeof anime);
  console.log('Keys:', Object.keys(anime || {}));
  console.log('Episodios (primeros 3):', JSON.stringify(anime?.episodes?.slice(0, 3), null, 2));
  console.log('Géneros:', JSON.stringify(anime?.genres));
  console.log('Status:', anime?.statusText || anime?.status);
  console.log('Año:', anime?.year);
} catch (e) {
  console.error('❌', e.message);
}

console.log('\n═══════════════════════════════════════');
console.log('getEpisode("sousou-no-frieren-2nd-season", 1)');
console.log('═══════════════════════════════════════');
try {
  const { getEpisode } = await import('animeav1-api');
  const ep = await getEpisode('sousou-no-frieren-2nd-season', 1);
  console.log('Keys:', Object.keys(ep || {}));
  console.log('Embeds:', JSON.stringify(ep?.embeds, null, 2));
  console.log('Downloads:', JSON.stringify(ep?.downloads, null, 2));
} catch (e) {
  console.error('❌', e.message);
}
