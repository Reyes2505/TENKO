import requests

API_KEY = '78094a5cc8cc496bfb9f2f9913473563'

# Probar con animes conocidos
animes_test = [
    ('Sword Art Online', 45782),
    ('Mushoku Tensei', 94664),
    ('My Hero Academia', 65930),
]

for nombre, tmdb_id in animes_test:
    print(f"\n=== {nombre} (ID: {tmdb_id}) ===")
    
    # Probar español
    r = requests.get(
        f'https://api.themoviedb.org/3/tv/{tmdb_id}/season/1',
        params={'api_key': API_KEY, 'language': 'es-ES'},
        timeout=15
    )
    
    if r.status_code == 200:
        data = r.json()
        episodes = data.get('episodes', [])
        print(f"  ES - Episodios: {len(episodes)}")
        for ep in episodes[:3]:
            print(f"    EP {ep['episode_number']}: '{ep.get('name', 'SIN NOMBRE')}'")
    
    # Probar inglés
    r2 = requests.get(
        f'https://api.themoviedb.org/3/tv/{tmdb_id}/season/1',
        params={'api_key': API_KEY, 'language': 'en-US'},
        timeout=15
    )
    
    if r2.status_code == 200:
        data2 = r2.json()
        episodes2 = data2.get('episodes', [])
        print(f"  EN - Episodios: {len(episodes2)}")
        for ep in episodes2[:3]:
            print(f"    EP {ep['episode_number']}: '{ep.get('name', 'SIN NOMBRE')}'")
