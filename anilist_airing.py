#!/usr/bin/env python3
"""
Consulta AniList para obtener animes en emisión.
Guarda el calendario en Supabase.
"""

import os
import re
import time
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import requests
from supabase import create_client

# ========== CONFIGURACIÓN ==========
SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ========== QUERY DE ANILIST ==========
AIRING_QUERY = """
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo {
      total
      currentPage
      lastPage
      hasNextPage
    }
    media(status: RELEASING, type: ANIME, sort: POPULARITY_DESC) {
      id
      title {
        romaji
        english
        native
      }
      description
      coverImage {
        large
        medium
      }
      bannerImage
      episodes
      duration
      status
      season
      seasonYear
      startDate {
        year
        month
        day
      }
      nextAiringEpisode {
        airingAt
        timeUntilAiring
        episode
      }
      genres
      averageScore
      popularity
      studios {
        nodes {
          name
        }
      }
    }
  }
}
"""


def consultar_anilist(pagina: int = 1, por_pagina: int = 50) -> Optional[Dict]:
    """Consulta AniList para obtener animes en emisión."""
    try:
        response = requests.post(
            'https://graphql.anilist.co',
            json={
                'query': AIRING_QUERY,
                'variables': {
                    'page': pagina,
                    'perPage': por_pagina,
                }
            },
            timeout=30
        )
        
        if response.status_code != 200:
            print(f'  ⚠️ Status: {response.status_code}')
            return None
        
        data = response.json()
        
        if 'errors' in data:
            print(f'  ⚠️ Errores: {data["errors"]}')
            return None
        
        return data.get('data', {}).get('Page', {})
    except Exception as e:
        print(f'  ❌ Error: {e}')
        return None


def convertir_timestamp(timestamp: int) -> Optional[str]:
    """Convierte timestamp a fecha YYYY-MM-DD."""
    if not timestamp:
        return None
    try:
        return datetime.fromtimestamp(timestamp).strftime('%Y-%m-%d')
    except:
        return None


def convertir_horario(timestamp: int) -> Dict[str, Any]:
    """Convierte timestamp a día y hora."""
    if not timestamp:
        return {'dia': None, 'hora': None, 'dia_num': None}
    try:
        dt = datetime.fromtimestamp(timestamp)
        return {
            'dia': dt.weekday(),  # 0=Lunes, 6=Domingo
            'hora': dt.strftime('%H:%M:%S'),
            'fecha': dt.strftime('%Y-%m-%d'),
        }
    except:
        return {'dia': None, 'hora': None, 'dia_num': None}


def procesar_anime(anime: Dict) -> Dict[str, Any]:
    """Procesa un anime de AniList."""
    titulos = anime.get('title', {})
    titulo = titulos.get('romaji') or titulos.get('english') or titulos.get('native', '')
    
    # Fecha de estreno
    start_date = anime.get('startDate', {})
    fecha_estreno = None
    if start_date and start_date.get('year'):
        year = start_date['year']
        month = start_date.get('month') or 1
        day = start_date.get('day') or 1
        fecha_estreno = f'{year}-{month:02d}-{day:02d}'
    
    # Próximo episodio
    next_ep = anime.get('nextAiringEpisode')
    proximo_episodio = None
    horario = {'dia': None, 'hora': None, 'dia_num': None, 'fecha': None}
    
    if next_ep:
        proximo_episodio = next_ep.get('episode')
        horario = convertir_horario(next_ep.get('airingAt'))
    
    # Estudios
    studios = anime.get('studios', {}).get('nodes', [])
    estudio = studios[0]['name'] if studios else ''
    
    return {
        'anilist_id': anime.get('id'),
        'titulo': titulo,
        'titulo_ingles': titulos.get('english', ''),
        'titulo_nativo': titulos.get('native', ''),
        'sinopsis': anime.get('description', '')[:1000] if anime.get('description') else '',
        'portada_url': anime.get('coverImage', {}).get('large', ''),
        'banner_url': anime.get('bannerImage', ''),
        'total_episodios': anime.get('episodes'),
        'duracion': anime.get('duration'),
        'estado': anime.get('status'),
        'temporada': anime.get('season'),
        'anio': anime.get('seasonYear'),
        'fecha_estreno': fecha_estreno,
        'proximo_episodio': proximo_episodio,
        'dia_emision': horario.get('dia'),
        'hora_emision': horario.get('hora'),
        'proxima_fecha': horario.get('fecha'),
        'generos': anime.get('genres', []),
        'puntuacion': anime.get('averageScore'),
        'popularidad': anime.get('popularity'),
        'estudio': estudio,
    }


def guardar_en_supabase(animes: List[Dict]) -> Dict[str, int]:
    """Guarda los animes y el calendario en Supabase."""
    stats = {'animes_nuevos': 0, 'animes_actualizados': 0, 'calendario': 0}
    
    for anime in animes:
        try:
            # Verificar si ya existe
            existing = supabase.table('animes').select('id').eq(
                'titulo', anime['titulo']
            ).execute()
            
            anime_id = None
            
            if existing.data:
                # Actualizar
                anime_id = existing.data[0]['id']
                supabase.table('animes').update({
                    'estado_emision': 'emitido',
                    'sinopsis': anime['sinopsis'],
                    'portada_url': anime['portada_url'],
                    'banner_url': anime['banner_url'],
                    'fecha_estreno': anime['fecha_estreno'],
                    'generos': anime['generos'],
                }).eq('id', anime_id).execute()
                stats['animes_actualizados'] += 1
            else:
                # Insertar nuevo
                result = supabase.table('animes').insert({
                    'titulo': anime['titulo'],
                    'sinopsis': anime['sinopsis'],
                    'portada_url': anime['portada_url'],
                    'banner_url': anime['banner_url'],
                    'estado_emision': 'emitido',
                    'fecha_estreno': anime['fecha_estreno'],
                    'generos': anime['generos'],
                }).execute()
                
                if result.data:
                    anime_id = result.data[0]['id']
                    stats['animes_nuevos'] += 1
            
            # Guardar en calendario
            if anime_id and anime.get('dia_emision') is not None:
                # Verificar si ya existe en calendario
                cal_existing = supabase.table('calendario_emision').select('id').eq(
                    'anime_id', anime_id
                ).execute()
                
                calendario_data = {
                    'anime_id': anime_id,
                    'titulo': anime['titulo'],
                    'dia_semana': anime['dia_emision'],
                    'hora_emision': anime['hora_emision'],
                    'anilist_id': anime['anilist_id'],
                    'proximo_episodio': anime['proximo_episodio'],
                    'proxima_fecha': anime['proxima_fecha'],
                    'activo': True,
                    'updated_at': datetime.now().isoformat(),
                }
                
                if cal_existing.data:
                    supabase.table('calendario_emision').update(
                        calendario_data
                    ).eq('id', cal_existing.data[0]['id']).execute()
                else:
                    supabase.table('calendario_emision').insert(
                        calendario_data
                    ).execute()
                
                stats['calendario'] += 1
        except Exception as e:
            print(f'  ⚠️ Error guardando {anime["titulo"]}: {e}')
    
    return stats


def main():
    print('=' * 80)
    print('🎯 ANILIST - Animes en Emisión')
    print(f'📅 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print('=' * 80)
    print()
    
    todos_animes = []
    pagina = 1
    
    while pagina <= 5:  # Máximo 5 páginas = 250 animes
        print(f'📄 Página {pagina}...')
        
        data = consultar_anilist(pagina, 50)
        
        if not data:
            break
        
        media = data.get('media', [])
        if not media:
            break
        
        for anime in media:
            procesado = procesar_anime(anime)
            todos_animes.append(procesado)
        
        print(f'  ✅ {len(media)} animes encontrados')
        
        page_info = data.get('pageInfo', {})
        if not page_info.get('hasNextPage'):
            break
        
        pagina += 1
        time.sleep(1)  # Rate limit
    
    print()
    print(f'📊 Total animes en emisión: {len(todos_animes)}')
    print()
    
    # Guardar en Supabase
    print('💾 Guardando en Supabase...')
    stats = guardar_en_supabase(todos_animes)
    print(f'✅ Animes nuevos: {stats["animes_nuevos"]}')
    print(f'✅ Animes actualizados: {stats["animes_actualizados"]}')
    print(f'✅ Entradas en calendario: {stats["calendario"]}')
    print()
    
    # Mostrar resumen por día
    print('=' * 80)
    print('📅 CALENDARIO DE EMISIÓN')
    print('=' * 80)
    
    dias = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO']
    por_dia = {i: [] for i in range(7)}
    
    for anime in todos_animes:
        dia = anime.get('dia_emision')
        if dia is not None:
            por_dia[dia].append(anime)
    
    for i, dia in enumerate(dias):
        animes_dia = por_dia[i]
        if animes_dia:
            print(f'\n📅 {dia} ({len(animes_dia)} animes):')
            for anime in sorted(animes_dia, key=lambda a: a.get('hora_emision') or '99:99'):
                hora = anime.get('hora_emision') or '--:--'
                ep = anime.get('proximo_episodio', '?')
                print(f'   {hora} - {anime["titulo"][:50]} (EP {ep})')
    
    # Guardar JSON
    with open('calendario_emision.json', 'w', encoding='utf-8') as f:
        json.dump(todos_animes, f, indent=2, ensure_ascii=False)
    
    print()
    print(f'💾 Datos guardados en: calendario_emision.json')
    print('=' * 80)


if __name__ == '__main__':
    main()
