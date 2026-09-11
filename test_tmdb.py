import requests

API_KEY = '78094a5cc8cc496bfb9f2f9913473563'

# Buscar anime
r = requests.get(
    'https://api.themoviedb.org/3/search/tv',
    params={'api_key': API_KEY, 'query': 'Sword Art Online', 'language': 'es-ES'},
    timeout=15
)

print(f"Status: {r.status_code}")
print(f"Response: {r.text[:500]}")

if r.status_code == 200:
    data = r.json()
    results = data.get('results', [])
    if results:
        anime = results[0]
        print(f"\n✅ {anime['name']}")
        print(f"   ID: {anime['id']}")
        
        # Obtener episodios
        r2 = requests.get(
            f'https://api.themoviedb.org/3/tv/{anime["id"]}/season/1',
            params={'api_key': API_KEY, 'language': 'es-ES'},
            timeout=15
        )
        
        if r2.status_code == 200:
            season = r2.json()
            episodes = season.get('episodes', [])
            print(f"\n📺 Episodios ({len(episodes)}):")
            for ep in episodes[:5]:
                print(f"   EP {ep['episode_number']}: {ep['name']}")
                print(f"      Fecha: {ep.get('air_date', 'N/A')}")
