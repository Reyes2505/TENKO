import time
import re
import requests
from typing import Optional, Dict, Any

ANILIST_API_URL = "https://graphql.anilist.co"

ANILIST_QUERY = """
query SyncAnimeInfo($search: String,$id: Int) {
  Media(search: $search, id:$id, type: ANIME) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
      color
    }
    bannerImage
    description(asHtml: false)
    status
    episodes
    genres
    season
    seasonYear
    averageScore
    nextAiringEpisode {
      airingAt
      episode
    }
  }
}
"""

def clean_html(raw_html: Optional[str]) -> str:
    if not raw_html:
        return ""
    return re.sub(r'<[^>]+>', '', raw_html).strip()

def fetch_from_anilist(title: Optional[str] = None, anilist_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    variables = {}
    if anilist_id:
        variables["id"] = anilist_id
    elif title:
        variables["search"] = title
    else:
        raise ValueError("Se debe proporcionar un título o ID de AniList")

    headers = {"Content-Type": "application/json", "Accept": "application/json"}

    for _ in range(3):
        response = requests.post(
            ANILIST_API_URL,
            json={"query": ANILIST_QUERY, "variables": variables},
            headers=headers,
            timeout=10
        )

        if response.status_code == 200:
            return response.json().get("data", {}).get("Media")
        elif response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 60))
            print(f"[!] Límite alcanzado. Esperando {retry_after}s...")
            time.sleep(retry_after)
        else:
            print(f"[x] Error HTTP {response.status_code}: {response.text}")
            break

    return None

def normalize_anime_data(media: Dict[str, Any]) -> Dict[str, Any]:
    titles = media.get("title", {})
    primary_title = titles.get("romaji") or titles.get("english") or titles.get("native")
    
    cover_image = media.get("coverImage", {})
    poster_url = cover_image.get("extraLarge") or cover_image.get("large")
    banner_url = media.get("bannerImage") or poster_url

    return {
        "anilist_id": media.get("id"),
        "mal_id": media.get("idMal"),
        "titulo": primary_title,
        "titulo_ingles": titles.get("english"),
        "titulo_japones": titles.get("native"),
        "sinopsis": clean_html(media.get("description")),
        "portada_url": poster_url,
        "banner_url": banner_url,
        "color_dominante": cover_image.get("color"),
        "estado": media.get("status"),
        "episodios": media.get("episodes"),
        "generos": media.get("genres", []),
        "temporada": f"{media.get('season')} {media.get('seasonYear')}" if media.get("season") else None,
        "puntuacion": media.get("averageScore"),
        "proximo_episodio": media.get("nextAiringEpisode"),
    }

def sync_anime(title_or_id: Any) -> Optional[Dict[str, Any]]:
    print(f"[*] Buscando datos en AniList para: '{title_or_id}'...")
    if isinstance(title_or_id, int) or (isinstance(title_or_id, str) and title_or_id.isdigit()):
        raw_data = fetch_from_anilist(anilist_id=int(title_or_id))
    else:
        raw_data = fetch_from_anilist(title=str(title_or_id))

    if not raw_data:
        print("[-] No se encontraron datos en AniList.")
        return None

    synced_data = normalize_anime_data(raw_data)
    print(f"[+] Sincronizado exitosamente: {synced_data['titulo']}")
    return synced_data

if __name__ == "__main__":
    resultado = sync_anime("Sousou no Frieren")
    if resultado:
        print("\n--- Resultado de Sincronización ---")
        print(f"Título: {resultado['titulo']}")
        print(f"Portada (HD): {resultado['portada_url']}")
        print(f"Banner: {resultado['banner_url']}")
        print(f"Color: {resultado['color_dominante']}")
