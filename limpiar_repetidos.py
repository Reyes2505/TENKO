#!/usr/bin/env python3
"""
Sistema inteligente de limpieza de animes repetidos.
=====================================================
- Identifica duplicados por similitud de título
- Verifica cuáles tienen contenido real
- Conserva el mejor candidato (más episodios)
- Elimina los vacíos o duplicados
- Genera reporte detallado antes de actuar
"""

import re
import json
import unicodedata
from datetime import datetime
from difflib import SequenceMatcher
from typing import List, Dict, Tuple, Optional
from supabase import create_client

# ========== CONFIGURACIÓN ==========
SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Umbral de similitud (0-1). Más alto = más estricto
UMBRAL_SIMILITUD = 0.90

# Si true, solo simula (no elimina nada)
DRY_RUN = False


# ========== NORMALIZACIÓN ==========
def normalizar(titulo: str) -> str:
    """
    Normaliza un título para comparación.
    'Mushoku Tensei II: Isekai Ittara Honki Dasu (2024)'
    → 'mushoku tensei isekai ittara honki dasu'
    """
    if not titulo:
        return ''
    
    t = titulo.lower()
    
    # Quitar acentos
    t = unicodedata.normalize('NFKD', t)
    t = ''.join(c for c in t if not unicodedata.combining(c))
    
    # Quitar años entre paréntesis
    t = re.sub(r'\(\d{4}\)', '', t)
    
    # Quitar sufijos de temporada
    t = re.sub(r'\d+(st|nd|rd|th)\s+season', '', t)
    t = re.sub(r'season\s+\d+', '', t)
    t = re.sub(r'part\s+\d+', '', t)
    t = re.sub(r'\s+(ii|iii|iv|v|vi|vii|viii|ix|x)\b', ' ', t)
    t = re.sub(r'\s+(second|third|fourth|fifth|final)\s+season', ' ', t)
    
    # Quitar signos y colapsar espacios
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    t = re.sub(r'\s+', ' ', t)
    
    return t.strip()


def similitud(a: str, b: str) -> float:
    """Similitud entre dos títulos (0-1)."""
    return SequenceMatcher(None, normalizar(a), normalizar(b)).ratio()


# ========== ANÁLISIS ==========
def cargar_animes() -> List[Dict]:
    """Carga todos los animes con info de episodios."""
    print("📊 Cargando animes de la BD...")
    
    response = supabase.table('animes').select(
        'id, titulo, portada_url, banner_url, sinopsis, estado_emision, '
        'fecha_estreno, created_at, saga_titulo, '
        'temporadas(id, nombre, episodios(id))'
    ).execute()
    
    animes = response.data or []
    
    # Calcular total de episodios
    for anime in animes:
        anime['total_eps'] = sum(
            len(t.get('episodios', []))
            for t in anime.get('temporadas', [])
        )
        anime['total_temps'] = len(anime.get('temporadas', []))
    
    print(f"✅ {len(animes)} animes cargados")
    return animes


def agrupar_duplicados(animes: List[Dict]) -> List[List[Dict]]:
    """
    Agrupa animes que probablemente son duplicados.
    Retorna lista de grupos.
    """
    print("🔍 Detectando duplicados...")
    
    grupos = []
    procesados = set()
    
    for i, a in enumerate(animes):
        if i in procesados:
            continue
        
        grupo = [a]
        procesados.add(i)
        
        norm_a = normalizar(a['titulo'])
        
        for j, b in enumerate(animes):
            if j <= i or j in procesados:
                continue
            
            norm_b = normalizar(b['titulo'])
            
            # Coincidencia exacta
            if norm_a == norm_b:
                grupo.append(b)
                procesados.add(j)
                continue
            
            # Uno contiene al otro
            if (len(norm_a) > 5 and len(norm_b) > 5 and 
                (norm_a in norm_b or norm_b in norm_a)):
                grupo.append(b)
                procesados.add(j)
                continue
            
            # Similitud alta
            if similitud(a['titulo'], b['titulo']) >= UMBRAL_SIMILITUD:
                grupo.append(b)
                procesados.add(j)
        
        if len(grupo) > 1:
            grupos.append(grupo)
    
    print(f"✅ {len(grupos)} grupos duplicados detectados")
    return grupos


def elegir_ganador(grupo: List[Dict]) -> Dict:
    """
    Elige el anime a conservar.
    Prioridad:
    1. Más episodios
    2. Más temporadas
    3. Con sinopsis
    4. Con saga_titulo
    5. Más antiguo (created_at)
    """
    return max(grupo, key=lambda a: (
        a['total_eps'],
        a['total_temps'],
        1 if a.get('sinopsis') else 0,
        1 if a.get('saga_titulo') else 0,
        -1 if not a.get('created_at') else 0,
    ))


# ========== ELIMINACIÓN ==========
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
        print(f"      ⚠️ Error: {e}")
        return False


def reasignar_contenido(origen_id: str, destino_id: str) -> int:
    """
    Mueve temporadas del anime origen al destino.
    Solo se usa si el perdedor tiene contenido único.
    """
    try:
        temps = supabase.table('temporadas').select('id, orden').eq(
            'anime_id', origen_id
        ).execute()
        
        if not temps.data:
            return 0
        
        # Orden máximo del destino
        dest = supabase.table('temporadas').select('orden').eq(
            'anime_id', destino_id
        ).execute()
        max_orden = max((t.get('orden', 0) for t in (dest.data or [])), default=0)
        
        reasignadas = 0
        for temp in temps.data:
            max_orden += 1
            try:
                supabase.table('temporadas').update({
                    'anime_id': destino_id,
                    'orden': max_orden,
                }).eq('id', temp['id']).execute()
                reasignadas += 1
            except:
                pass
        
        return reasignadas
    except:
        return 0


# ========== REPORTE ==========
def generar_reporte(grupos: List[List[Dict]]) -> Dict:
    """Genera un reporte de la limpieza."""
    reporte = {
        'timestamp': datetime.now().isoformat(),
        'total_grupos': len(grupos),
        'total_a_eliminar': 0,
        'total_con_contenido': 0,
        'total_vacios': 0,
        'grupos': [],
    }
    
    for grupo in grupos:
        ganador = elegir_ganador(grupo)
        perdedores = [a for a in grupo if a['id'] != ganador['id']]
        
        grupo_info = {
            'ganador': {
                'id': ganador['id'],
                'titulo': ganador['titulo'],
                'total_eps': ganador['total_eps'],
            },
            'perdedores': [],
        }
        
        for perdedor in perdedores:
            tiene_contenido = perdedor['total_eps'] > 0
            if tiene_contenido:
                reporte['total_con_contenido'] += 1
            else:
                reporte['total_vacios'] += 1
            
            reporte['total_a_eliminar'] += 1
            
            grupo_info['perdedores'].append({
                'id': perdedor['id'],
                'titulo': perdedor['titulo'],
                'total_eps': perdedor['total_eps'],
                'tiene_contenido': tiene_contenido,
                'accion': 'REASIGNAR + ELIMINAR' if tiene_contenido else 'ELIMINAR',
            })
        
        reporte['grupos'].append(grupo_info)
    
    return reporte


# ========== MAIN ==========
def main():
    print("=" * 70)
    print("🧹 LIMPIADOR INTELIGENTE DE ANIMES REPETIDOS")
    print("=" * 70)
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"⚙️  Umbral de similitud: {UMBRAL_SIMILITUD}")
    print(f"🔍 Modo: {'DRY RUN (sin cambios)' if DRY_RUN else 'REAL (eliminará)'}")
    print("=" * 70)
    print()
    
    # 1. Cargar animes
    animes = cargar_animes()
    if not animes:
        print("⚠️ No hay animes")
        return
    
    print()
    
    # 2. Detectar duplicados
    grupos = agrupar_duplicados(animes)
    
    if not grupos:
        print()
        print("✅ No hay animes duplicados")
        return
    
    print()
    
    # 3. Generar reporte
    reporte = generar_reporte(grupos)
    
    # 4. Mostrar resumen
    print("=" * 70)
    print("📊 RESUMEN DE ANÁLISIS")
    print("=" * 70)
    print(f"  🎯 Grupos duplicados: {reporte['total_grupos']}")
    print(f"  🗑️  Total a eliminar: {reporte['total_a_eliminar']}")
    print(f"  📦 Con contenido: {reporte['total_con_contenido']} (se reasignarán)")
    print(f"  💨 Vacíos: {reporte['total_vacios']} (se eliminarán)")
    print("=" * 70)
    print()
    
    # 5. Mostrar primeros grupos
    print("📋 PRIMEROS 10 GRUPOS:")
    print()
    
    for i, grupo_info in enumerate(reporte['grupos'][:10], 1):
        print(f"[{i}] ✅ CONSERVAR: {grupo_info['ganador']['titulo'][:55]}")
        print(f"    ({grupo_info['ganador']['total_eps']} eps)")
        
        for perdedor in grupo_info['perdedores']:
            icono = "📦" if perdedor['tiene_contenido'] else "💨"
            print(f"    {icono} ELIMINAR: {perdedor['titulo'][:55]}")
            print(f"       ({perdedor['total_eps']} eps) → {perdedor['accion']}")
        print()
    
    if len(reporte['grupos']) > 10:
        print(f"... y {len(reporte['grupos']) - 10} grupos más")
        print()
    
    # 6. Guardar reporte
    with open('reporte_limpieza.json', 'w', encoding='utf-8') as f:
        json.dump(reporte, f, indent=2, ensure_ascii=False)
    print(f"💾 Reporte guardado en: reporte_limpieza.json")
    print()
    
    # 7. Dry Run check
    if DRY_RUN:
        print("=" * 70)
        print("🔍 MODO DRY RUN - No se eliminó nada")
        print("=" * 70)
        print()
        print("Para ejecutar la limpieza real:")
        print("  1. Edita limpiar_repetidos.py")
        print("  2. Cambia DRY_RUN = False")
        print("  3. Ejecuta de nuevo")
        return
    
    # 8. Confirmar
    print("=" * 70)
    print("⚠️  CONFIRMACIÓN REQUERIDA")
    print("=" * 70)
    print()
    print(f"Se eliminarán {reporte['total_a_eliminar']} animes")
    print(f"Se reasignará contenido de {reporte['total_con_contenido']} animes")
    print()
    
    respuesta = input("¿Ejecutar limpieza? (si/no): ")
    if respuesta.lower() != 'si':
        print("❌ Cancelado")
        return
    
    # 9. Ejecutar limpieza
    print()
    print("=" * 70)
    print("🗑️  EJECUTANDO LIMPIEZA")
    print("=" * 70)
    print()
    
    eliminados = 0
    reasignadas = 0
    errores = 0
    
    for i, grupo_info in enumerate(reporte['grupos'], 1):
        ganador_id = grupo_info['ganador']['id']
        ganador_titulo = grupo_info['ganador']['titulo']
        
        print(f"[{i}/{len(reporte['grupos'])}] ✅ {ganador_titulo[:55]}")
        
        for perdedor in grupo_info['perdedores']:
            perdedor_id = perdedor['id']
            perdedor_titulo = perdedor['titulo']
            
            # Reasignar si tiene contenido
            if perdedor['tiene_contenido']:
                reasig = reasignar_contenido(perdedor_id, ganador_id)
                if reasig > 0:
                    reasignadas += reasig
                    print(f"    📦 {perdedor_titulo[:45]} → {reasig} temps reasignadas")
            
            # Eliminar
            if eliminar_anime(perdedor_id):
                eliminados += 1
                print(f"    🗑️  {perdedor_titulo[:45]} eliminado")
            else:
                errores += 1
                print(f"    ⚠️  Error con {perdedor_titulo[:45]}")
        
        print()
    
    # 10. Resumen final
    print("=" * 70)
    print("📊 RESUMEN FINAL")
    print("=" * 70)
    print(f"  ✅ Eliminados: {eliminados}")
    print(f"  📦 Temporadas reasignadas: {reasignadas}")
    print(f"  ⚠️  Errores: {errores}")
    print("=" * 70)


if __name__ == '__main__':
    main()
