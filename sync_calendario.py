#!/usr/bin/env python3
"""
Sincroniza el calendario de AniList con Supabase.
- Consulta AniList
- Guarda en tabla calendario_emision
- Vincula con animes existentes
"""

import os
import re
import time
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
import requests
from supabase import create_client

SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

QUERY = """
query {
  Page(page: 1, perPage: 50) {
    media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
      id
      title { romaji english }
      coverImage { large }
      format
      nextAiringEpisode {
        episode
        airingAt
      }
    }
  }
}
"""


def normalizar_titulo(titulo: str) -> str:
    """Normaliza un título para comparación."""
    if not titulo:
        return ''
    t = titulo.lower()
    t = re.sub(r'[^a-z0-9\s]', '', t)
    t = re.sub(r'\s+', ' ', t)
    return t.strip()


def consultar_anilist() -> List[Dict]:
    """Consulta AniList."""
    try:
        response = requests.post(
            'https://graphql.anilist.co',
            json={'query': QUERY},
            timeout=30
        )
        
        if response.status_code != 200:
            print(f'  ⚠️ Status: {response.status_code}')
            return []
        
        data = response.json()
        media = data.get('data', {}).get('Page', {}).get('media', [])
        
        animes = []
        for anime in media:
            next_ep = anime.get('nextAiringEpisode')
            if not next_ep:
                continue
            
            fecha = datetime.fromtimestamp(next_ep['airingAt'])
            
            animes.append({
                'anilist_id': anime['id'],
                'titulo': anime['title'].get('romaji', ''),
                'titulo_ingles': anime['title'].get('english', ''),
                'titulo_normalizado': normalizar_titulo(anime['title'].get('romaji', '')),
                'portada_url': anime.get('coverImage', {}).get('large', ''),
                'dia_semana': fecha.weekday(),
                'hora_emision': fecha.strftime('%H:%M:%S'),
                'proximo_episodio': next_ep.get('episode'),
                'proxima_fecha': fecha.strftime('%Y-%m-%d'),
                'formato': anime.get('format', 'TV'),
            })
        
        return animes
    except Exception as e:
        print(f'  ❌ Error: {e}')
        return []


def vincular_con_bd(calendario: List[Dict]) -> List[Dict]:
    """Vincula los animes del calendario con los de la BD."""
    response = supabase.table('animes').select('id, titulo').execute()
    animes_bd = response.data or []
    
    bd_map = {}
    for anime in animes_bd:
        norm = normalizar_titulo(anime['titulo'])
        bd_map[norm] = anime['id']
    
    print(f"  📊 {len(animes_bd)} animes en BD")
    
    vinculados = 0
    for item in calendario:
        norm = item['titulo_normalizado']
        
        # Coincidencia exacta
        if norm in bd_map:
            item['anime_id'] = bd_map[norm]
            item['en_bd'] = True
            vinculados += 1
            continue
        
        # Coincidencia por primeras 2 palabras
        palabras = norm.split()[:2]
        if len(palabras) >= 2:
            for bd_norm, bd_id in bd_map.items():
                if all(p in bd_norm for p in palabras):
                    item['anime_id'] = bd_id
                    item['en_bd'] = True
                    vinculados += 1
                    break
    
    print(f"  ✅ {vinculados} animes vinculados")
    return calendario


def guardar_calendario(calendario: List[Dict]) -> int:
    """Guarda el calendario en Supabase (upsert)."""
    if not calendario:
        return 0
    
    guardados = 0
    errores = 0
    
    for item in calendario:
        try:
            existing = supabase.table('calendario_emision').select('id').eq(
                'anilist_id', item['anilist_id']
            ).execute()
            
            data = {
                'anilist_id': item['anilist_id'],
                'titulo': item['titulo'],
                'titulo_normalizado': item['titulo_normalizado'],
                'portada_url': item['portada_url'],
                'dia_semana': item['dia_semana'],
                'hora_emision': item['hora_emision'],
                'proximo_episodio': item['proximo_episodio'],
                'proxima_fecha': item['proxima_fecha'],
                'formato': item['formato'],
                'anime_id': item.get('anime_id'),
                'en_bd': item.get('en_bd', False),
                'activo': True,
                'updated_at': datetime.now().isoformat(),
            }
            
            if existing.data:
                supabase.table('calendario_emision').update(data).eq(
                    'anilist_id', item['anilist_id']
                ).execute()
            else:
                supabase.table('calendario_emision').insert(data).execute()
            
            guardados += 1
            
            if guardados % 20 == 0:
                print(f"    📊 Progreso: {guardados}/{len(calendario)}")
                
        except Exception as e:
            print(f"    ⚠️ Error con {item['titulo']}: {e}")
            errores += 1
    
    print(f"  ✅ {guardados} guardados, {errores} errores")
    return guardados


def main():
    print('=' * 80)
    print('📅 SYNC CALENDARIO - AniList → Supabase')
    print(f'📅 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print('=' * 80)
    print()
    
    # 1. Consultar AniList
    print('🌐 Consultando AniList...')
    animes = consultar_anilist()
    print(f'✅ {len(animes)} animes con próximo episodio')
    print()
    
    if not animes:
        print('⚠️ No hay datos')
        return
    
    # 2. Vincular con BD
    print('🔗 Vinculando con BD...')
    animes = vincular_con_bd(animes)
    print()
    
    # 3. Guardar en Supabase
    print('💾 Guardando en Supabase...')
    guardados = guardar_calendario(animes)
    print(f'✅ {guardados} entradas guardadas')
    print()
    
    # 4. Resumen
    print('=' * 80)
    print('📊 RESUMEN POR DÍA')
    print('=' * 80)
    
    dias = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO']
    por_dia = {i: [] for i in range(7)}
    
    for anime in animes:
        por_dia[anime['dia_semana']].append(anime)
    
    for i, dia in enumerate(dias):
        total = len(por_dia[i])
        en_bd = len([a for a in por_dia[i] if a.get('en_bd')])
        print(f'  {dia}: {total} animes ({en_bd} en BD)')
    
    print()


if __name__ == '__main__':
    main()
