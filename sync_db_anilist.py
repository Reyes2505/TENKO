import os
import time
import re
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv('.env.local')

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("[x] Error: No se encontraron credenciales de Supabase en .env.local")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

ANILIST_API_URL = "https://graphql.anilist.co"

ANILIST_QUERY = """
query SyncAnimeInfo($search: String) {
  Media(search: $search, type: ANIME) {
    id
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
    }
    bannerImage
    description(asHtml: false)
    status
  }
}
"""

def clean_html(raw_html: str) -> str:
    if not raw_html:
        return ""
    return re.sub(r'<[^>]+>', '', raw_html).strip()

def clean_title(title: str) -> str:
    title = re.sub(r'\s*[\(\[\{].*?[\)\]\}]', '', title)
    title = re.sub(r'(?i)\b(latino|castellano|sub|ova|tv|bd|uncensored)\b', '', title)
    return title.strip()

def detect_db_status_enum():
    """Consulta la DB para identificar la sintaxis exacta del ENUM 'estado'."""
    try:
        res = supabase.table("animes").select("estado").not_.is_("estado", "null").limit(20).execute()
        statuses = set(row["estado"] for row in (res.data or []) if row.get("estado"))
        if statuses:
            print(f"[+] Formatos de 'estado' detectados en DB: {statuses}")
            return statuses
    except Exception as e:
        print(f"[!] No se pudieron inspeccionar estados existentes: {e}")
    return set()

def build_status_map(detected_statuses):
    """Construye el mapa de estados según lo aceptado por la base de datos."""
    # Verificar variantes de 'En emision' / 'En emisión'
    emision_val = "En emisión"
    if "En emision" in detected_statuses:
        emision_val = "En emision"
    elif "emision" in detected_statuses:
        emision_val = "emision"
    elif "En Emisión" in detected_statuses:
        emision_val = "En Emisión"

    proximamente_val = "Próximamente"
    if "Proximamente" in detected_statuses:
        proximamente_val = "Proximamente"
    elif "proximamente" in detected_statuses:
        proximamente_val = "proximamente"

    finalizado_val = "Finalizado"
    if "finalizado" in detected_statuses:
        finalizado_val = "finalizado"

    return {
        "RELEASING": emision_val,
        "FINISHED": finalizado_val,
        "NOT_YET_RELEASED": proximamente_val,
        "CANCELLED": "Cancelado",
        "HIATUS": "En pausa"
    }

def fetch_anilist_data(title: str):
    search_term = clean_title(title)
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    try:
        response = requests.post(
            ANILIST_API_URL,
            json={"query": ANILIST_QUERY, "variables": {"search": search_term}},
            headers=headers,
            timeout=10
        )
        if response.status_code == 200:
            return response.json().get("data", {}).get("Media")
        elif response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 60))
            print(f"[!] Rate limit alcanzado. Esperando {retry_after}s...")
            time.sleep(retry_after)
            return fetch_anilist_data(title)
    except Exception as e:
        print(f"[x] Error en petición para '{title}': {e}")
    return None

def sync_catalog():
    print("[*] Detectando esquema de la base de datos...")
    detected_statuses = detect_db_status_enum()
    status_map = build_status_map(detected_statuses)

    print("[*] Obteniendo lista de animes desde Supabase...")
    res = supabase.table("animes").select("id, titulo").execute()
    animes = res.data or []

    print(f"[+] Total de animes a procesar: {len(animes)}")

    actualizados = 0
    con_estado = 0

    for anime in animes:
        anime_id = anime["id"]
        titulo = anime["titulo"]
        
        print(f"[*] Procesando: '{titulo}'...")
        media = fetch_anilist_data(titulo)

        if not media:
            print(f"[-] No se encontró en AniList: '{titulo}'.")
            continue

        cover_image = media.get("coverImage", {})
        poster_url = cover_image.get("extraLarge") or cover_image.get("large")
        banner_url = media.get("bannerImage") or poster_url
        raw_status = media.get("status")
        mapped_status = status_map.get(raw_status, raw_status)

        payload = {
            "portada_url": poster_url,
            "banner_url": banner_url,
            "sinopsis": clean_html(media.get("description")),
            "estado": mapped_status
        }

        update_data = {k: v for k, v in payload.items() if v is not None}

        # Intento 1: Actualizar todos los datos incluyendo el estado
        try:
            supabase.table("animes").update(update_data).eq("id", anime_id).execute()
            print(f"[✓] Actualizado completo (con estado '{mapped_status}'): {titulo}")
            actualizados += 1
            con_estado += 1
        except Exception as e:
            # Intento 2: Si el estado específico falla, probar con variante sin tilde
            if "estado" in update_data and mapped_status == "En emisión":
                update_data["estado"] = "En emision"
                try:
                    supabase.table("animes").update(update_data).eq("id", anime_id).execute()
                    print(f"[✓] Actualizado completo (con estado 'En emision'): {titulo}")
                    actualizados += 1
                    con_estado += 1
                    continue
                except Exception:
                    pass

            # Fallback final: actualizar sin alterar el estado
            update_data.pop("estado", None)
            try:
                supabase.table("animes").update(update_data).eq("id", anime_id).execute()
                print(f"[✓] Actualizado (sin cambiar estado): {titulo}")
                actualizados += 1
            except Exception as e2:
                print(f"[x] Error crítico en '{titulo}': {e2}")

        time.sleep(0.6)

    print(f"\n[🎉] Proceso completado.")
    print(f"Total actualizados: {actualizados}/{len(animes)}")
    print(f"Con estado sincronizado: {con_estado}/{actualizados}")

if __name__ == "__main__":
    sync_catalog()
