import requests

# Jikan API - MyAnimeList
for titulo in ["Sword Art Online II", "Mushoku Tensei", "Bleach"]:
    print(f"\n=== {titulo} ===")
    r = requests.get(
        f'https://api.jikan.moe/v4/anime',
        params={'q': titulo, 'limit': 1},
        timeout=15
    )
    print(f"Status: {r.status_code}")
    if r.status_code == 200:
        data = r.json()
        animes = data.get('data', [])
        if animes:
            anime = animes[0]
            print(f"  ✅ {anime['title']}")
            print(f"  Episodios: {anime.get('episodes', '?')}")
            print(f"  ID: {anime['mal_id']}")
    else:
        print(f"  Error: {r.text[:200]}")
