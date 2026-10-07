#!/usr/bin/env python3
"""
Consulta AniList para obtener animes en emisión.
- Filtra solo los relevantes (con datos completos)
- Guarda en batch (mucho más rápido)
- Muestra progreso
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

# ========== CONFIGURACIÓN DE FILTRADO ==========
# Solo animes con:
MIN_POPULARIDAD = 100          # Mínimo de popularidad
MIN_EPISODIOS = 1              # Al menos 1 episodio emitido
MAX_PAGINAS = 3                # Máximo 3 páginas (150 animes)
BATCH_SIZE = 50                # Insertar en lotes de 50

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
    
    # Popularidad
    popularidad = anime.get('popularity', 0) or 0
    
    # Filtrar por popularidad
    if popularidad < MIN_POPULARIDAD:
        return None
    
    # Próximo episodio
    next_ep = anime.get('nextAiringEpisode')
    if not next_ep:
        return None
    
    proximo_episodio = next_ep.get('episode')
    if not proximo_episodio or proximo_episodio < MIN_EPISODIOS:
        return None
    
    # Fecha de estreno
    start_date = anime.get('startDate', {})
    fecha_estreno = None
    if start_date and start_date.get('year'):
        year = start_date['year']
        month = start_date.get('month') or 1
        day = start_date.get('day') or 1
        fecha_estreno = f'{year}-{month:02d}-{day:02d}'
    
    # Horario
    horario = convertir_horario(next_ep.get('airingAt'))
    
    # Estudios
    studios = anime.get('studios', {}).get('nodes', [])
    estudio = studios[0]['name'] if studios else ''
    
    return {
        'anilist_id': anime.get('id'),
        'titulo': titulo,
        'titulo_ingles': titulos.get('english', ''),
        'titulo_nativo': titulos.get('native', ''),
        'sinopsis': (anime.get('description', '') or '')[:1000],
        'portada_url': anime.get('coverImage', {}).get('large', ''),
        'banner_url': anime.get('bannerImage', ''),
        'total_episodios': anime.get('episodes'),
        'duracion': anime.get('duration'),
        'estado': anime.get('status'),
        'fecha_estreno': fecha_estreno,
        'proximo_episodio': proximo_episodio,
        'dia_emision': horario.get('dia'),
        'hora_emision': horario.get('hora'),
        'proxima_fecha': horario.get('fecha'),
        'generos': anime.get('genres', []),
        'puntuacion': anime.get('averageScore'),
        'popularidad': popularidad,
        'estudio': estudio,
    }


def guardar_en_supabase(animes: List[Dict]) -> Dict[str, int]:
    """Guarda los animes en batch (mucho más rápido)."""
    stats = {'animes_nuevos': 0, 'animes_actualizados': 0, 'calendario': 0, 'errores': 0}
    
    # 1. Obtener todos los animes existentes de una vez
    print("  📊 Obteniendo animes existentes...")
    existing_response = supabase.table('animes').select('id, titulo').execute()
    existing_map = {a['titulo']: a['id'] for a in (existing_response.data or [])}
    print(f"  ✅ {len(existing_map)} animes en BD")
    
    # 2. Separar nuevos y existentes
    nuevos = []
    actualizar = []
    
    for anime in animes:
        if anime['titulo'] in existing_map:
            anime['_id'] = existing_map[anime['titulo']]
            actualizar.append(anime)
        else:
            nuevos.append(anime)
    
    print(f"  📊 Nuevos: {len(nuevos)} | Existentes: {len(actualizar)}")
    
    # 3. Insertar nuevos en batch
    if nuevos:
        print(f"  💾 Insertando {len(nuevos)} animes nuevos...")
        
        for i in range(0, len(nuevos), BATCH_SIZE):
            batch = nuevos[i:i + BATCH_SIZE]
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
                    stats['animes_nuevos'] += len(result.data)
                    # Actualizar mapa
                    for a in result.data:
                        existing_map[a['titulo']] = a['id']
                print(f"    ✅ Lote {i//BATCH_SIZE + 1}: {len(batch)} insertados")
            except Exception as e:
                print(f"    ⚠️ Error en lote: {e}")
                stats['errores'] += len(batch)
    
    # 4. Actualizar existentes (en batch)
    if actualizar:
        print(f"  🔧 Actualizando {len(actualizar)} animes...")
        
        # Actualizar uno por uno (Supabase no tiene bulk update)
        for i, anime in enumerate(actualizar):
            if i % 20 == 0:
                print(f"    📊 Progreso: {i}/{len(actualizar)}")
            
            try:
                supabase.table('animes').update({
                    'estado_emision': 'emitido',
                    'sinopsis': anime['sinopsis'],
                    'portada_url': anime['portada_url'],
                    'banner_url': anime['banner_url'],
                    'fecha_estreno': anime['fecha_estreno'],
                    'generos': anime['generos'],
                }).eq('id', anime['_id']).execute()
                stats['animes_actualizados'] += 1
            except Exception as e:
                stats['errores'] += 1
    
    # 5. Guardar calendario en batch
    print(f"  📅 Guardando calendario...")
    
    calendario_batch = []
    for anime in animes:
        if anime['titulo'] in existing_map and anime.get('dia_emision') is not None:
            calendario_batch.append({
                'anime_id': existing_map[anime['titulo']],
                'titulo': anime['titulo'],
                'dia_semana': anime['dia_emision'],
                'hora_emision': anime['hora_emision'],
                'anilist_id': anime['anilist_id'],
                'proximo_episodio': anime['proximo_episodio'],
                'proxima_fecha': anime['proxima_fecha'],
                'activo': True,
            })
    
    if calendario_batch:
        # Eliminar calendario viejo
        try:
            supabase.table('calendario_emision').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
        except:
            pass
        
        # Insertar nuevo calendario en batch
        for i in range(0, len(calendario_batch), BATCH_SIZE):
            batch = calendario_batch[i:i + BATCH_SIZE]
            try:
                supabase.table('calendario_emision').insert(batch).execute()
                stats['calendario'] += len(batch)
                print(f"    ✅ Lote {i//BATCH_SIZE + 1}: {len(batch)} calendario")
            except Exception as e:
                print(f"    ⚠️ Error: {e}")
    
    return stats


def main():
    print('=' * 80)
    print('🎯 ANILIST - Animes en Emisión')
    print(f'📅 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'⚙️ Filtros: Popularidad >= {MIN_POPULARIDAD}, Episodios >= {MIN_EPISODIOS}')
    print(f'📄 Páginas: {MAX_PAGINAS} (máx {MAX_PAGINAS * 50} animes)')
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
        
        # Procesar y filtrar
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
        
        page_info = data.get('pageInfo', {})
        if not page_info.get('hasNextPage'):
            break
        
        pagina += 1
        time.sleep(1)
    
    print()
    print(f'📊 Total animes relevantes: {len(todos_animes)}')
    print()
    
    if not todos_animes:
        print('⚠️ No hay animes relevantes')
        return
    
    # Guardar
    print('💾 Guardando en Supabase...')
    stats = guardar_en_supabase(todos_animes)
    
    print()
    print('=' * 80)
    print('📊 RESULTADOS')
    print('=' * 80)
    print(f'✅ Animes nuevos: {stats["animes_nuevos"]}')
    print(f'✅ Animes actualizados: {stats["animes_actualizados"]}')
    print(f'✅ Entradas calendario: {stats["calendario"]}')
    print(f'❌ Errores: {stats["errores"]}')
    print()
    
    # Mostrar calendario por día
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
            for anime in sorted(animes_dia, key=lambda a: a.get('hora_emision') or '99:99')[:10]:
                hora = anime.get('hora_emision') or '--:--'
                ep = anime.get('proximo_episodio', '?')
                print(f'   {hora} - {anime["titulo"][:50]} (EP {ep})')
            if len(animes_dia) > 10:
                print(f'   ... y {len(animes_dia) - 10} más')
    
    # Guardar JSON
    with open('calendario_emision.json', 'w', encoding='utf-8') as f:
        json.dump(todos_animes, f, indent=2, ensure_ascii=False)
    
    print()
    print(f'💾 Datos guardados en: calendario_emision.json')
    print('=' * 80)


if __name__ == '__main__':
    main()
