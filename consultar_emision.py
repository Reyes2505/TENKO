#!/usr/bin/env python3
"""
Bot de Consulta - Animes en Emisión
Consulta todos los animes en emisión desde Supabase y JK Anime.
Muestra: título, fecha de emisión, estado, número de episodios.
"""

import os
import re
import json
import time
from datetime import datetime
from typing import List, Dict, Any, Optional
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

# ========== CONFIGURACIÓN ==========
SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

TMDB_API_KEY = '78094a5cc8cc496bfb9f2f9913473563'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
})


# ========== CONSULTA DESDE SUPABASE ==========
def consultar_supabase() -> List[Dict[str, Any]]:
    """Consulta animes en emisión desde Supabase."""
    print("📊 Consultando Supabase...")
    
    try:
        response = supabase.table('animes').select(
            'id, titulo, estado_emision, fecha_estreno, generos, sinopsis, '
            'temporadas(id, nombre, episodios(id, numero, titulo_episodio, fecha_emision, url_stream))'
        ).eq('estado_emision', 'emitido').execute()
        
        return response.data or []
    except Exception as e:
        print(f"❌ Error: {e}")
        return []


# ========== CONSULTA DESDE JK ANIME ==========
def consultar_jk_directorio() -> List[Dict[str, Any]]:
    """Consulta animes en emisión desde el directorio de JK Anime."""
    print("🌐 Consultando JK Anime...")
    
    animes_emision = []
    
    # Escanear varias páginas del directorio
    for pagina in range(1, 10):
        try:
            response = session.get(
                f"https://jkanime.net/directorio?p={pagina}",
                timeout=15
            )
            
            if response.status_code != 200:
                break
            
            # Buscar JSON embebido
            match = re.search(r'var animes = (\{.*?\});', response.text, re.DOTALL)
            
            if not match:
                continue
            
            data = json.loads(match.group(1))
            
            for anime in data.get('data', []):
                if anime.get('status') == 'currently':
                    animes_emision.append({
                        'titulo': anime.get('title', ''),
                        'slug': anime.get('slug', ''),
                        'sinopsis': anime.get('synopsis', ''),
                        'portada_url': anime.get('image', '').replace('\\/', '/'),
                        'estado': anime.get('status', ''),
                        'tipo': anime.get('type', ''),
                    })
            
            time.sleep(0.5)
        except Exception as e:
            print(f"⚠️ Error en página {pagina}: {e}")
            break
    
    return animes_emision


# ========== CONSULTA DESDE TMDB ==========
def consultar_tmdb(titulo: str) -> Optional[Dict[str, Any]]:
    """Consulta info de un anime en TMDB."""
    try:
        # Buscar anime
        r = session.get(
            'https://api.themoviedb.org/3/search/tv',
            params={
                'api_key': TMDB_API_KEY,
                'query': titulo,
                'language': 'es-ES',
            },
            timeout=15
        )
        
        if r.status_code != 200:
            return None
        
        results = r.json().get('results', [])
        if not results:
            return None
        
        tmdb_id = results[0]['id']
        
        # Obtener detalles
        r2 = session.get(
            f'https://api.themoviedb.org/3/tv/{tmdb_id}',
            params={'api_key': TMDB_API_KEY, 'language': 'es-ES'},
            timeout=15
        )
        
        if r2.status_code != 200:
            return None
        
        data = r2.json()
        
        # Obtener último episodio
        r3 = session.get(
            f'https://api.themoviedb.org/3/tv/{tmdb_id}/season/1',
            params={'api_key': TMDB_API_KEY, 'language': 'es-ES'},
            timeout=15
        )
        
        ultimo_ep = None
        total_eps = 0
        proximo_ep = None
        
        if r3.status_code == 200:
            episodes = r3.json().get('episodes', [])
            total_eps = len(episodes)
            
            # Último episodio emitido
            for ep in reversed(episodes):
                if ep.get('air_date') and ep['air_date'] <= datetime.now().strftime('%Y-%m-%d'):
                    ultimo_ep = ep
                    break
            
            # Próximo episodio
            for ep in episodes:
                if ep.get('air_date') and ep['air_date'] > datetime.now().strftime('%Y-%m-%d'):
                    proximo_ep = ep
                    break
        
        return {
            'tmdb_id': tmdb_id,
            'nombre': data.get('name', ''),
            'nombre_original': data.get('original_name', ''),
            'estado': data.get('status', ''),
            'total_episodios': data.get('number_of_episodes', total_eps),
            'temporadas': data.get('number_of_seasons', 1),
            'primera_emision': data.get('first_air_date', ''),
            'ultima_emision': data.get('last_air_date', ''),
            'proximo_episodio': proximo_ep,
            'ultimo_episodio': ultimo_ep,
            'popularidad': data.get('popularity', 0),
            'votos': data.get('vote_average', 0),
            'generos': [g['name'] for g in data.get('genres', [])],
            'sinopsis': data.get('overview', ''),
        }
    except Exception as e:
        print(f"⚠️ Error TMDB: {e}")
        return None


# ========== CONSULTA DESDE JK ANIME (por anime) ==========
def consultar_jk_anime(slug: str) -> Optional[Dict[str, Any]]:
    """Consulta info detallada de un anime en JK Anime."""
    try:
        response = session.get(
            f"https://jkanime.net/{slug}/",
            timeout=15
        )
        
        if response.status_code != 200:
            return None
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Título
        h1 = soup.find('h1')
        titulo = h1.get_text(strip=True) if h1 else ''
        
        # CSRF token
        meta = soup.find('meta', {'name': 'csrf-token'})
        csrf = meta.get('content', '') if meta else ''
        
        # jk_id
        match = re.search(r'ajax/episodes/(\d+)/', response.text)
        jk_id = int(match.group(1)) if match else None
        
        # Obtener episodios
        episodios = []
        if jk_id and csrf:
            pagina = 1
            while pagina <= 10:
                r = session.post(
                    f"https://jkanime.net/ajax/episodes/{jk_id}/{pagina}",
                    data={'_token': csrf},
                    timeout=15
                )
                
                if r.status_code != 200:
                    break
                
                data = r.json()
                items = data.get('data', [])
                
                if not items:
                    break
                
                for ep in items:
                    episodios.append({
                        'numero': ep.get('number', 0),
                        'titulo': ep.get('title', ''),
                        'fecha': ep.get('date', ''),
                    })
                
                total = data.get('total', 0)
                if pagina * 16 >= total:
                    break
                pagina += 1
                time.sleep(0.3)
        
        # Estado
        estado_elem = soup.find('span', class_='anime__details__episodes')
        
        return {
            'slug': slug,
            'titulo': titulo,
            'jk_id': jk_id,
            'csrf': csrf,
            'total_episodios': len(episodios),
            'episodios': episodios,
            'ultimo_episodio': max([e['numero'] for e in episodios]) if episodios else 0,
        }
    except Exception as e:
        print(f"⚠️ Error JK Anime: {e}")
        return None


# ========== FUNCIÓN PRINCIPAL ==========
def main():
    """Función principal de consulta."""
    print("=" * 80)
    print("🔍 CONSULTA DE ANIMES EN EMISIÓN - SANTUARIO ANIME")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print()
    
    # 1. Consultar Supabase
    animes_supabase = consultar_supabase()
    print(f"✅ Supabase: {len(animes_supabase)} animes en emisión")
    print()
    
    # 2. Consultar JK Anime
    animes_jk = consultar_jk_directorio()
    print(f"✅ JK Anime: {len(animes_jk)} animes en emisión")
    print()
    
    # 3. Combinar información
    print("=" * 80)
    print("📊 ANIMES EN EMISIÓN (Supabase)")
    print("=" * 80)
    print()
    
    for i, anime in enumerate(animes_supabase, 1):
        titulo = anime.get('titulo', '')
        fecha_estreno = anime.get('fecha_estreno', 'N/A')
        generos = ', '.join(anime.get('generos', []) or [])
        
        temporadas = anime.get('temporadas', [])
        total_eps = sum(len(t.get('episodios', [])) for t in temporadas)
        
        print(f"[{i}] 🎬 {titulo}")
        print(f"    📅 Estreno: {fecha_estreno}")
        print(f"    🎭 Géneros: {generos[:80]}")
        print(f"    📺 Episodios: {total_eps}")
        print(f"    🆔 ID: {anime.get('id', 'N/A')[:20]}...")
        
        # Mostrar últimos episodios
        if temporadas:
            episodios = temporadas[0].get('episodios', [])
            if episodios:
                ultimos = sorted(episodios, key=lambda e: e.get('numero', 0))[-3:]
                for ep in ultimos:
                    num = ep.get('numero', '?')
                    titulo_ep = ep.get('titulo_episodio', '') or f'Episodio {num}'
                    fecha = ep.get('fecha_emision', 'N/A')
                    print(f"      └─ EP {num:02d}: {titulo_ep[:40]} ({fecha})")
        
        print()
    
    # 4. Mostrar animes de JK Anime
    print("=" * 80)
    print("📊 ANIMES EN EMISIÓN (JK Anime)")
    print("=" * 80)
    print()
    
    for i, anime in enumerate(animes_jk[:30], 1):  # Mostrar primeros 30
        print(f"[{i}] 🎬 {anime.get('titulo', '')}")
        print(f"    🔗 Slug: {anime.get('slug', '')}")
        print(f"    🎭 Tipo: {anime.get('tipo', '')}")
        print()
    
    # 5. Resumen
    print("=" * 80)
    print("📊 RESUMEN")
    print("=" * 80)
    print(f"📺 Supabase: {len(animes_supabase)} animes")
    print(f"🌐 JK Anime: {len(animes_jk)} animes")
    
    # Comparar
    titulos_supabase = {a['titulo'] for a in animes_supabase}
    titulos_jk = {a['titulo'] for a in animes_jk}
    
    solo_supabase = titulos_supabase - titulos_jk
    solo_jk = titulos_jk - titulos_supabase
    en_ambos = titulos_supabase & titulos_jk
    
    print(f"✅ En ambos: {len(en_ambos)}")
    print(f"⚠️ Solo en Supabase: {len(solo_supabase)}")
    print(f"🆕 Solo en JK Anime: {len(solo_jk)}")
    
    if solo_jk:
        print()
        print("🆕 ANIMES NUEVOS EN JK ANIME (no están en Supabase):")
        for titulo in list(solo_jk)[:10]:
            print(f"   • {titulo}")
    
    print()
    print("=" * 80)


if __name__ == '__main__':
    main()

def consultar_tmdb_completo(titulo: str):
    """Consulta info completa de TMDB."""
    print(f"\n🔍 Consultando TMDB: {titulo}")
    
    info = consultar_tmdb(titulo)
    
    if not info:
        print(f"  ❌ No encontrado")
        return
    
    print(f"  ✅ Nombre: {info.get('nombre', '')}")
    print(f"  📅 Primera emisión: {info.get('primera_emision', '')}")
    print(f"  📅 Última emisión: {info.get('ultima_emision', '')}")
    print(f"  🎬 Estado: {info.get('estado', '')}")
    print(f"  📺 Total episodios: {info.get('total_episodios', 0)}")
    print(f"  📺 Temporadas: {info.get('temporadas', 1)}")
    print(f"  🎭 Géneros: {', '.join(info.get('generos', []))}")
    print(f"  ⭐ Votos: {info.get('votos', 0)}")
    print(f"  🔥 Popularidad: {info.get('popularidad', 0)}")
    
    if info.get('ultimo_episodio'):
        ep = info['ultimo_episodio']
        print(f"  📺 Último EP: {ep.get('episode_number')} - {ep.get('name')}")
        print(f"     📅 {ep.get('air_date')}")
    
    if info.get('proximo_episodio'):
        ep = info['proximo_episodio']
        print(f"  ⏭️ Próximo EP: {ep.get('episode_number')} - {ep.get('name')}")
        print(f"     📅 {ep.get('air_date')}")