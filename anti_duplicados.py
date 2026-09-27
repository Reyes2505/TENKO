#!/usr/bin/env python3
"""
Sistema inteligente anti-duplicados.
- Detecta animes duplicados por similitud de título
- Verifica cuál tiene más contenido (episodios)
- Elimina los vacíos o sin episodios
- Reasigna temporadas del eliminado al principal
"""

import re
import unicodedata
from difflib import SequenceMatcher
from typing import List, Dict, Tuple, Optional
from supabase import create_client

SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxNjE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

UMBRAL_SIMILITUD = 0.90


def normalizar(titulo: str) -> str:
    if not titulo:
        return ''
    t = titulo.lower()
    t = unicodedata.normalize('NFKD', t)
    t = ''.join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r'\(\d{4}\)', '', t)
    t = re.sub(r'\d+(st|nd|rd|th)\s+season', '', t)
    t = re.sub(r'season\s+\d+', '', t)
    t = re.sub(r'\s+(ii|iii|iv|v|vi|vii|viii|ix|x)$', '', t)
    t = re.sub(r'\s+part\s+\d+', '', t)
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()


def similitud(a: str, b: str) -> float:
    return SequenceMatcher(None, normalizar(a), normalizar(b)).ratio()


def analizar_duplicados(animes: List[Dict]) -> List[List[Dict]]:
    """Agrupa animes duplicados."""
    grupos = []
    procesados = set()
    
    for i, a in enumerate(animes):
        if i in procesados:
            continue
        
        grupo = [a]
        procesados.add(i)
        
        for j, b in enumerate(animes):
            if j <= i or j in procesados:
                continue
            
            # Comparar
            norm_a = normalizar(a['titulo'])
            norm_b = normalizar(b['titulo'])
            
            es_duplicado = False
            
            # Coincidencia exacta
            if norm_a == norm_b:
                es_duplicado = True
            
            # Uno contiene al otro
            elif norm_a in norm_b or norm_b in norm_a:
                es_duplicado = True
            
            # Similitud alta
            elif similitud(a['titulo'], b['titulo']) >= UMBRAL_SIMILITUD:
                es_duplicado = True
            
            if es_duplicado:
                grupo.append(b)
                procesados.add(j)
        
        if len(grupo) > 1:
            grupos.append(grupo)
    
    return grupos


def elegir_ganador(grupo: List[Dict]) -> Dict:
    """
    Elige el anime que se conserva.
    Criterios (en orden):
    1. Mayor cantidad de episodios
    2. Más reciente (created_at)
    3. Menor slug
    """
    return max(grupo, key=lambda a: (
        a['total_eps'],
        a.get('created_at', '') or '',
    ))


def eliminar_anime(anime_id: str) -> bool:
    """Elimina un anime con sus temporadas y episodios."""
    try:
        # Obtener temporadas
        temps = supabase.table('temporadas').select('id').eq('anime_id', anime_id).execute()
        
        for temp in (temps.data or []):
            # Eliminar episodios
            supabase.table('episodios').delete().eq('temporada_id', temp['id']).execute()
        
        # Eliminar temporadas
        supabase.table('temporadas').delete().eq('anime_id', anime_id).execute()
        
        # Eliminar anime
        supabase.table('animes').delete().eq('id', anime_id).execute()
        
        return True
    except Exception as e:
        print(f"   ⚠️ Error eliminando: {e}")
        return False


def reasignar_temporadas(anime_origen: str, anime_destino: str) -> int:
    """
    Mueve las temporadas del anime origen al destino.
    Útil si el duplicado tiene contenido que el principal no tiene.
    """
    try:
        # Obtener temporadas del origen
        temps = supabase.table('temporadas').select('id, nombre, orden').eq(
            'anime_id', anime_origen
        ).execute()
        
        if not temps.data:
            return 0
        
        # Obtener el orden máximo del destino
        dest_temps = supabase.table('temporadas').select('orden').eq(
            'anime_id', anime_destino
        ).execute()
        
        max_orden = max((t.get('orden', 0) for t in (dest_temps.data or [])), default=0)
        
        # Reasignar
        reasignadas = 0
        for temp in temps.data:
            max_orden += 1
            try:
                supabase.table('temporadas').update({
                    'anime_id': anime_destino,
                    'orden': max_orden,
                }).eq('id', temp['id']).execute()
                reasignadas += 1
            except Exception as e:
                print(f"      ⚠️ Error reasignando temporada: {e}")
        
        return reasignadas
    except Exception as e:
        print(f"   ⚠️ Error: {e}")
        return 0


def main():
    print("=" * 70)
    print("🧹 SISTEMA ANTI-DUPLICADOS INTELIGENTE")
    print("=" * 70)
    print()
    
    # 1. Cargar todos los animes con info
    print("📊 Cargando animes...")
    response = supabase.table('animes').select(
        'id, titulo, created_at, saga_titulo, '
        'temporadas(id, episodios(id))'
    ).execute()
    
    animes = response.data or []
    
    for anime in animes:
        anime['total_eps'] = sum(
            len(t.get('episodios', []))
            for t in anime.get('temporadas', [])
        )
    
    print(f"   Total: {len(animes)}")
    print()
    
    # 2. Analizar duplicados
    print("🔍 Analizando duplicados...")
    grupos = analizar_duplicados(animes)
    
    print(f"   Grupos duplicados: {len(grupos)}")
    print()
    
    if not grupos:
        print("✅ No hay duplicados")
        return
    
    # 3. Mostrar análisis
    print("=" * 70)
    print("📋 ANÁLISIS DE DUPLICADOS")
    print("=" * 70)
    
    plan = []
    total_a_eliminar = 0
    total_a_reasignar = 0
    
    for grupo in grupos:
        ganador = elegir_ganador(grupo)
        perdedores = [a for a in grupo if a['id'] != ganador['id']]
        
        print(f"\n🎬 Grupo: {ganador['titulo'][:60]}")
        print(f"   ✅ GANADOR: {ganador['titulo'][:50]} ({ganador['total_eps']} eps)")
        
        for perdedor in perdedores:
            reasignar = perdedor['total_eps'] > 0
            accion = "REASIGNAR Y ELIMINAR" if reasignar else "ELIMINAR"
            
            print(f"   ❌ {accion}: {perdedor['titulo'][:50]} ({perdedor['total_eps']} eps)")
            
            plan.append({
                'ganador': ganador,
                'perdedor': perdedor,
                'reasignar': reasignar,
            })
            
            total_a_eliminar += 1
            if reasignar:
                total_a_reasignar += 1
    
    print()
    print("=" * 70)
    print(f"📊 PLAN: Eliminar {total_a_eliminar} duplicados")
    print(f"         Reasignar contenido de {total_a_reasignar} antes de eliminar")
    print("=" * 70)
    print()
    
    # 4. Confirmar
    respuesta = input("¿Ejecutar? (s/n): ")
    if respuesta.lower() != 's':
        print("❌ Cancelado")
        return
    
    print()
    print("🔧 Ejecutando plan...")
    print()
    
    # 5. Ejecutar
    eliminados = 0
    reasignadas = 0
    
    for item in plan:
        ganador = item['ganador']
        perdedor = item['perdedor']
        
        print(f"🎬 {ganador['titulo'][:50]}")
        print(f"   └─ Eliminando: {perdedor['titulo'][:50]}")
        
        # Reasignar contenido si es necesario
        if item['reasignar']:
            reasig = reasignar_temporadas(perdedor['id'], ganador['id'])
            if reasig > 0:
                reasignadas += reasig
                print(f"   └─ {reasig} temporadas reasignadas")
        
        # Eliminar
        if eliminar_anime(perdedor['id']):
            eliminados += 1
            print(f"   └─ ✅ Eliminado")
        else:
            print(f"   └─ ❌ Error eliminando")
        
        print()
    
    # 6. Resumen
    print("=" * 70)
    print("📊 RESUMEN FINAL")
    print("=" * 70)
    print(f"✅ Duplicados eliminados: {eliminados}")
    print(f"✅ Temporadas reasignadas: {reasignadas}")
    print("=" * 70)


if __name__ == '__main__':
    main()
