#!/usr/bin/env python3
"""
AniList Airing Sync v2 - Anti-Duplicados
==========================================
- Normalización agresiva de títulos
- Verificación de duplicados ANTES de insertar
- Actualiza existentes, nunca duplica
- Maneja correctamente sagas vs temporadas
"""

import os
import re
import time
import json
import unicodedata
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from difflib import SequenceMatcher
import requests
from supabase import create_client

# ========== CONFIGURACIÓN ==========
SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

MIN_POPULARIDAD = 100
MIN_EPISODIOS = 1
MAX_PAGINAS = 3
BATCH_SIZE = 50
UMBRAL_DUPLICADO = 0.90  # 90% de similitud = duplicado


# ========== NORMALIZACIÓN ==========
def normalizar_titulo(titulo: str) -> str:
    """
    Normalización agresiva para detectar duplicados.
    'ONE PIECE (2024)' → 'one piece'
    'Re:Zero kara Hajimeru Isekai Seikatsu 4th Season' → 're zero kara hajimeru isekai seikatsu'
    """
    if not titulo:
        return ''
    
    t = titulo.lower().strip()
    
    # Quitar acentos
    t = unicodedata.normalize('NFKD', t)
    t = ''.join(c for c in t if not unicodedata.combining(c))
    
    # Quitar años
    t = re.sub(r'\(\d{4}\)', '', t)
    
    # Quitar sufijos de temporada
    t = re.sub(r'\d+(st|nd|rd|th)\s+season', '', t)
    t = re.sub(r'season\s+\d+', '', t)
    t = re.sub(r'part\s+\d+', '', t)
    t = re.sub(r'\s+(ii|iii|iv|v|vi|vii|viii|ix|x)\s*$', '', t)
    t = re.sub(r'\s+(second|third|fourth|fifth|final)\s+season', '', t)
    
    # Quitar signos
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    t = re.sub(r'\s+', ' ', t)
    
    return t.strip()


def similitud(a: str, b: str) -> float:
    """Similitud entre dos títulos (0-1)."""
    return SequenceMatcher(None, a, b).ratio()


# ========== ANILIST ==========
AIRING_QUERY = """
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage }
    media(status: RELEASING, type: ANIME, sort: POPULARITY_DESC) {
      id
      title { romaji english native }
      description
      coverImage { large }
      bannerImage
      episodes
      duration
      status
      startDate { year month day }
      nextAiringEpisode { airingAt timeUntilAiring episode }
      genres
      averageScore
      popularity
      studios { nodes { name } }
    }
  }
}
"""


def consultar_anilist(pagina: int, por_pagina: int = 50) -> Optional[Dict]:
    """Consulta AniList."""
    try:
        response = requests.post(
            'https://graphql.anilist.co',
            json={
                'query': AIRING_QUERY,
                'variables': {'page': pagina, 'perPage': por_pagina}
            },
            timeout=30
        )
        if response.status_code != 200:
            return None
        data = response.json()
        if 'errors' in data:
            return None
        return data.get('data', {}).get('Page', {})
    except Exception as e:
        print(f'  ❌ Error: {e}')
        return None


def convertir_horario(timestamp: int) -> Dict[str, Any]:
    """Convierte timestamp a día y hora."""
    if not timestamp:
        return {'dia': None, 'hora': None, 'fecha': None}
    try:
        dt = datetime.fromtimestamp(timestamp)
        return {
            'dia': dt.weekday(),
            'hora': dt.strftime('%H:%M:%S'),
            'fecha': dt.strftime('%Y-%m-%d'),
        }
    except:
        return {'dia': None, 'hora': None, 'fecha': None}


def procesar_anime(anime: Dict) -> Optional[Dict[str, Any]]:
    """Procesa un anime de AniList."""
    titulos = anime.get('title', {})
    titulo = titulos.get('romaji') or titulos.get('english') or titulos.get('native', '')
    
    if not titulo:
        return None
    
    popularidad = anime.get('popularity', 0) or 0
    if popularidad < MIN_POPULARIDAD:
        return None
    
    next_ep = anime.get('nextAiringEpisode')
    if not next_ep:
        return None
    
    proximo_episodio = next_ep.get('episode')
    if not proximo_episodio or proximo_episodio < MIN_EPISODIOS:
        return None
    
    start_date = anime.get('startDate', {})
    fecha_estreno = None
    if start_date and start_date.get('year'):
        year = start_date['year']
        month = start_date.get('month') or 1
        day = start_date.get('day') or 1
        fecha_estreno = f'{year}-{month:02d}-{day:02d}'
    
    horario = convertir_horario(next_ep.get('airingAt'))
    
    studios = anime.get('studios', {}).get('nodes', [])
    estudio = studios[0]['name'] if studios else ''
    
    return {
        'anilist_id': anime.get('id'),
        'titulo': titulo,
        'titulo_normalizado': normalizar_titulo(titulo),
        'titulo_ingles': titulos.get('english', ''),
        'titulo_nativo': titulos.get('native', ''),
        'sinopsis': (anime.get('description', '') or '')[:1000],
        'portada_url': anime.get('coverImage', {}).get('large', ''),
        'banner_url': anime.get('bannerImage', ''),
        'total_episodios': anime.get('episodes'),
        'estado': anime.get('status'),
        'fecha_estreno': fecha_estreno,
        'proximo_episodio': proximo_episodio,
        'dia_emision': horario.get('dia'),
        'hora_emision': horario.get('hora'),
        'proxima_fecha': horario.get('fecha'),
        'generos': anime.get('genres', []),
        'popularidad': popularidad,
    }


# ========== VERIFICACIÓN DE DUPLICADOS ==========
def cargar_animes_existentes() -> List[Dict]:
    """Carga todos los animes de la BD."""
    print("  📊 Cargando animes existentes...")
    
    todos = []
    offset = 0
    limit = 1000
    
    while True:
        response = supabase.table('animes').select('id, titulo').range(offset, offset + limit - 1).execute()
        data = response.data or []
        if not data:
            break
        todos = todos + data
        offset += limit
        if len(data) < limit:
            break
    
    # Agregar títulos normalizados
    for a in todos:
        a['titulo_normalizado'] = normalizar_titulo(a['titulo'])
    
    print(f"  ✅ {len(todos)} animes en BD")
    return todos


def es_duplicado(titulo_nuevo: str, titulo_norm_nuevo: str, existentes: List[Dict]) -> Optional[str]:
    """
    Verifica si un anime ya existe en la BD.
    Retorna el ID del existente o None.
    """
    for existente in existentes:
        norm_existente = existente['titulo_normalizado']
        
        # Coincidencia exacta normalizada
        if norm_existente == titulo_norm_nuevo:
            return existente['id']
        
        # Uno contiene al otro
        if len(norm_existente) > 5 and len(titulo_norm_nuevo) > 5:
            if norm_existente in titulo_norm_nuevo or titulo_norm_nuevo in norm_existente:
                return existente['id']
        
        # Similitud alta
        if similitud(norm_existente, titulo_norm_nuevo) >= UMBRAL_DUPLICADO:
            return existente['id']
    
    return None


# ========== GUARDADO ==========
def guardar_en_supabase(animes: List[Dict]) -> Dict[str, int]:
    """Guarda los animes con verificación anti-duplicados."""
    stats = {
        'nuevos': 0,
        'actualizados': 0,
        'duplicados_evitados': 0,
        'calendario': 0,
        'errores': 0,
    }
    
    # 1. Cargar existentes
    existentes = cargar_animes_existentes()
    
    # 2. Clasificar: nuevos vs existentes
    a_insertar = []
    a_actualizar = []
    
    for anime in animes:
        anime_id_existente = es_duplicado(
            anime['titulo'],
            anime['titulo_normalizado'],
            existentes
        )
        
        if anime_id_existente:
            anime['_id'] = anime_id_existente
            a_actualizar.append(anime)
            stats['duplicados_evitados'] += 1
            print(f"    🔒 Duplicado evitado: {anime['titulo'][:50]}")
        else:
            a_insertar.append(anime)
    
    print()
    print(f"  📊 Nuevos: {len(a_insertar)} | Existentes: {len(a_actualizar)}")
    print()
    
    # 3. Insertar nuevos (en batch)
    if a_insertar:
        print(f"  💾 Insertando {len(a_insertar)} animes nuevos...")
        
        for i in range(0, len(a_insertar), BATCH_SIZE):
            batch = a_insertar[i:i + BATCH_SIZE]
            batch_data = [{
                'titulo': a['titulo'],
                'sinopsis': a['sinopsis'],
                'portada_url': a['portada_url'],
                'banner_url': a['banner_url'],
                'estado_emision': 'emitido',
                'fecha_estreno': a['fecha_estreno'],
                'generos': a['generos'],
            } for a in batch]
            
            try:
                result = supabase.table('animes').insert(batch_data).execute()
                if result.data:
                    stats['nuevos'] += len(result.data)
                    # Actualizar lista de existentes
                    for inserted in result.data:
                        existentes.append({
                            'id': inserted['id'],
                            'titulo': inserted['titulo'],
                            'titulo_normalizado': normalizar_titulo(inserted['titulo']),
                        })
                print(f"    ✅ Lote {i//BATCH_SIZE + 1}: {len(batch)} insertados")
            except Exception as e:
                print(f"    ⚠️ Error: {e}")
                stats['errores'] += len(batch)
    
    # 4. Actualizar existentes
    if a_actualizar:
        print(f"  🔧 Actualizando {len(a_actualizar)} animes existentes...")
        
        for i, anime in enumerate(a_actualizar):
            if i % 20 == 0:
                print(f"    📊 Progreso: {i}/{len(a_actualizar)}")
            
            try:
                supabase.table('animes').update({
                    'estado_emision': 'emitido',
                    'portada_url': anime['portada_url'],
                    'banner_url': anime['banner_url'],
                }).eq('id', anime['_id']).execute()
                stats['actualizados'] += 1
            except Exception as e:
                stats['errores'] += 1
    
    # 5. Actualizar calendario (limpiar y recrear)
    print(f"  📅 Actualizando calendario...")
    
    try:
        supabase.table('calendario_emision').delete().neq(
            'id', '00000000-0000-0000-0000-000000000000'
        ).execute()
    except:
        pass
    
    calendario_batch = []
    for anime in animes:
        anime_id = anime.get('_id')
        if not anime_id and anime['titulo'] in {a['titulo']: a['id'] for a in existentes}:
            anime_id = {a['titulo']: a['id'] for a in existentes}[anime['titulo']]
        
        if anime_id and anime.get('dia_emision') is not None:
            calendario_batch.append({
                'anime_id': anime_id,
                'titulo': anime['titulo'],
                'dia_semana': anime['dia_emision'],
                'hora_emision': anime['hora_emision'],
                'anilist_id': anime['anilist_id'],
                'proximo_episodio': anime['proximo_episodio'],
                'proxima_fecha': anime['proxima_fecha'],
                'activo': True,
            })
    
    if calendario_batch:
        for i in range(0, len(calendario_batch), BATCH_SIZE):
            batch = calendario_batch[i:i + BATCH_SIZE]
            try:
                supabase.table('calendario_emision').insert(batch).execute()
                stats['calendario'] += len(batch)
            except Exception as e:
                print(f"    ⚠️ Error: {e}")
    
    return stats


# ========== MAIN ==========
def main():
    print('=' * 80)
    print('🎯 ANILIST v2 - Anti-Duplicados')
    print(f'📅 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'⚙️  Umbral duplicado: {UMBRAL_DUPLICADO}')
    print('=' * 80)
    print()
    
    todos_animes = []
    pagina = 1
    
    while pagina <= MAX_PAGINAS:
        print(f'📄 Página {pagina}/{MAX_PAGINAS}...')
        
        data = consultar_anilist(pagina, 50)
        if not data:
            break
        
        media = data.get('media', [])
        if not media:
            break
        
        procesados = 0
        filtrados = 0
        
        for anime in media:
            procesado = procesar_anime(anime)
            if procesado:
                todos_animes.append(procesado)
                procesados += 1
            else:
                filtrados += 1
        
        print(f'  ✅ {procesados} relevantes, {filtrados} filtrados')
        
        if not data.get('pageInfo', {}).get('hasNextPage'):
            break
        
        pagina += 1
        time.sleep(1)
    
    print()
    print(f'📊 Total animes relevantes: {len(todos_animes)}')
    print()
    
    if not todos_animes:
        print('⚠️ No hay animes relevantes')
        return
    
    print('💾 Guardando en Supabase...')
    stats = guardar_en_supabase(todos_animes)
    
    print()
    print('=' * 80)
    print('📊 RESULTADOS')
    print('=' * 80)
    print(f'✅ Nuevos insertados: {stats["nuevos"]}')
    print(f'✅ Actualizados: {stats["actualizados"]}')
    print(f'🔒 Duplicados evitados: {stats["duplicados_evitados"]}')
    print(f'📅 Calendario: {stats["calendario"]}')
    print(f'❌ Errores: {stats["errores"]}')
    print('=' * 80)


if __name__ == '__main__':
    main()
