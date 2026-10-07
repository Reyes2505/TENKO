#!/usr/bin/env python3
"""
Sistema completo de organización de animes:
1. Elimina duplicados EXACTOS (mismo título)
2. Agrupa sagas reales (con sufijos DIFERENTES)
"""

import re
import json
import unicodedata
from datetime import datetime
from typing import List, Dict, Tuple
from difflib import SequenceMatcher
from supabase import create_client

SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

DRY_RUN = False
UMBRAL_DUPLICADO = 0.95  # Solo elimina si son >95% idénticos


def normalizar(titulo: str) -> str:
    """Normalización simple."""
    if not titulo:
        return ''
    t = titulo.lower().strip()
    t = unicodedata.normalize('NFKD', t)
    t = ''.join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()


def extraer_sufijo(titulo: str) -> Tuple[str, str, int]:
    """
    Separa: base, sufijo, orden.
    'Sword Art Online II' → ('Sword Art Online', 'II', 2)
    'One Piece' → ('One Piece', '', 1)
    """
    if not titulo:
        return '', '', 1
    
    t = titulo.strip()
    
    # "4th Season"
    m = re.search(r'\s+(\d+(?:st|nd|rd|th)\s+Season)\s*$', t, re.IGNORECASE)
    if m:
        num = re.search(r'(\d+)', m.group(1))
        return t[:m.start()].strip(), m.group(1), int(num.group(1)) if num else 1
    
    # "Season 2"
    m = re.search(r'\s+(Season\s+\d+)\s*$', t, re.IGNORECASE)
    if m:
        num = re.search(r'(\d+)', m.group(1))
        return t[:m.start()].strip(), m.group(1), int(num.group(1)) if num else 1
    
    # "Part 2"
    m = re.search(r'\s+(Part\s+\d+)\s*$', t, re.IGNORECASE)
    if m:
        num = re.search(r'(\d+)', m.group(1))
        return t[:m.start()].strip(), m.group(1), int(num.group(1)) if num else 1
    
    # "Final Season"
    m = re.search(r'\s+(Final Season)\s*$', t, re.IGNORECASE)
    if m:
        return t[:m.start()].strip(), 'Final Season', 99
    
    # Romanos: II, III, IV...
    m = re.search(r'\s+([IVX]+)\s*$', t)
    if m:
        romanos = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10}
        return t[:m.start()].strip(), m.group(1), romanos.get(m.group(1), 1)
    
    # Año
    m = re.search(r'\s*\((\d{4})\)\s*$', t)
    if m:
        return t[:m.start()].strip(), m.group(1), 1
    
    return t, '', 1


def cargar_animes() -> List[Dict]:
    print("📊 Cargando animes...")
    response = supabase.table('animes').select(
        'id, titulo, portada_url, sinopsis, created_at, saga_titulo, '
        'temporadas(id, episodios(id))'
    ).execute()
    
    animes = response.data or []
    for a in animes:
        a['total_eps'] = sum(len(t.get('episodios', [])) for t in a.get('temporadas', []))
    print(f"✅ {len(animes)} animes")
    return animes


def fase1_eliminar_duplicados(animes: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
    """
    FASE 1: Elimina duplicados EXACTOS.
    Agrupa por título normalizado. Si hay varios con el mismo título, conserva 1.
    """
    print()
    print("=" * 70)
    print("🗑️  FASE 1: ELIMINAR DUPLICADOS EXACTOS")
    print("=" * 70)
    
    # Agrupar por título normalizado EXACTO
    por_titulo = {}
    for anime in animes:
        clave = normalizar(anime['titulo'])
        if clave not in por_titulo:
            por_titulo[clave] = []
        por_titulo[clave].append(anime)
    
    # Grupos con duplicados (>1)
    grupos_dup = {k: v for k, v in por_titulo.items() if len(v) > 1}
    
    print(f"🎯 Grupos duplicados: {len(grupos_dup)}")
    print(f"🗑️  Total a eliminar: {sum(len(g) - 1 for g in grupos_dup.values())}")
    print()
    
    # Mostrar primeros ejemplos
    for i, (clave, grupo) in enumerate(list(grupos_dup.items())[:10], 1):
        titulo = grupo[0]['titulo']
        print(f"[{i}] 🗑️  {titulo[:60]} ({len(grupo)} copias)")
        for a in grupo:
            print(f"      • {a['total_eps']} eps | {a['id'][:8]}...")
        print()
    
    a_eliminar = []
    a_conservar = []
    
    for clave, grupo in grupos_dup.items():
        # Conservar el que tenga más episodios
        ganador = max(grupo, key=lambda x: (x['total_eps'], x.get('created_at', '')))
        a_conservar.append(ganador)
        
        for a in grupo:
            if a['id'] != ganador['id']:
                a_eliminar.append(a)
    
    # Animes individuales (sin duplicados)
    for clave, grupo in por_titulo.items():
        if len(grupo) == 1:
            a_conservar.append(grupo[0])
    
    print(f"✅ A conservar: {len(a_conservar)}")
    print(f"🗑️  A eliminar: {len(a_eliminar)}")
    
    return a_conservar, a_eliminar


def fase2_agrupar_sagas(animes: List[Dict]) -> Dict[str, List[Dict]]:
    """
    FASE 2: Agrupa sagas REALES.
    Solo agrupa si los títulos tienen sufijos DIFERENTES.
    """
    print()
    print("=" * 70)
    print("📁 FASE 2: AGRUPAR SAGAS REALES")
    print("=" * 70)
    
    # Agrupar por título base (sin sufijo)
    por_base = {}
    for anime in animes:
        base, sufijo, orden = extraer_sufijo(anime['titulo'])
        base_norm = normalizar(base)
        
        if base_norm not in por_base:
            por_base[base_norm] = []
        
        por_base[base_norm].append({
            'anime': anime,
            'sufijo': sufijo,
            'orden': orden,
            'base': base,
        })
    
    # Filtrar sagas REALES:
    # - Más de 1 anime
    # - Al menos 2 sufijos DIFERENTES
    sagas = {}
    for clave, grupo in por_base.items():
        if len(grupo) < 2:
            continue
        
        # Verificar que hay sufijos diferentes
        sufijos = set(item['sufijo'] for item in grupo)
        
        # Si todos tienen el mismo sufijo, NO es una saga (son duplicados)
        if len(sufijos) < 2:
            continue
        
        sagas[clave] = grupo
    
    print(f"🎯 Sagas reales: {len(sagas)}")
    print()
    
    # Mostrar ejemplos
    for i, (clave, grupo) in enumerate(list(sagas.items())[:10], 1):
        base = grupo[0]['base']
        print(f"[{i}] 📁 {base[:60]}")
        for item in sorted(grupo, key=lambda x: x['orden']):
            suf = item['sufijo'] or '(T1)'
            print(f"      [{item['orden']}] {item['anime']['titulo'][:55]} ({item['anime']['total_eps']} eps)")
        print()
    
    return sagas


def eliminar_anime(anime_id: str) -> bool:
    """Elimina anime con contenido."""
    try:
        temps = supabase.table('temporadas').select('id').eq('anime_id', anime_id).execute()
        for t in (temps.data or []):
            supabase.table('episodios').delete().eq('temporada_id', t['id']).execute()
        supabase.table('temporadas').delete().eq('anime_id', anime_id).execute()
        supabase.table('animes').delete().eq('id', anime_id).execute()
        return True
    except Exception as e:
        print(f"      ⚠️ {e}")
        return False


def main():
    print("=" * 70)
    print("🧹 LIMPIAR Y AGRUPAR - Sistema en 2 fases")
    print("=" * 70)
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔍 Modo: {'DRY RUN' if DRY_RUN else 'REAL'}")
    print("=" * 70)
    
    animes = cargar_animes()
    if not animes:
        return
    
    # FASE 1: Eliminar duplicados
    a_conservar, a_eliminar = fase1_eliminar_duplicados(animes)
    
    # FASE 2: Agrupar sagas
    sagas = fase2_agrupar_sagas(a_conservar)
    
    # Resumen
    print()
    print("=" * 70)
    print("📊 RESUMEN FINAL")
    print("=" * 70)
    print(f"  🗑️  Duplicados a eliminar: {len(a_eliminar)}")
    print(f"  ✅ Animes únicos: {len(a_conservar)}")
    print(f"  📁 Sagas detectadas: {len(sagas)}")
    print(f"  📺 Animes en sagas: {sum(len(g) for g in sagas.values())}")
    print("=" * 70)
    
    # Guardar reporte
    reporte = {
        'timestamp': datetime.now().isoformat(),
        'duplicados_a_eliminar': len(a_eliminar),
        'sagas_detectadas': len(sagas),
        'eliminados': [
            {'id': a['id'], 'titulo': a['titulo'], 'eps': a['total_eps']}
            for a in a_eliminar
        ],
        'sagas': {
            clave: [
                {
                    'id': item['anime']['id'],
                    'titulo': item['anime']['titulo'],
                    'orden': item['orden'],
                    'sufijo': item['sufijo'],
                }
                for item in sorted(grupo, key=lambda x: x['orden'])
            ]
            for clave, grupo in sagas.items()
        },
    }
    
    with open('reporte_final.json', 'w', encoding='utf-8') as f:
        json.dump(reporte, f, indent=2, ensure_ascii=False)
    print(f"💾 Reporte: reporte_final.json")
    
    if DRY_RUN:
        print()
        print("=" * 70)
        print("🔍 DRY RUN - No se aplicaron cambios")
        print("=" * 70)
        print()
        print("Para ejecutar:")
        print("  sed -i 's/^DRY_RUN = True/DRY_RUN = False/' limpiar_y_agrupar.py")
        print("  python3 limpiar_y_agrupar.py")
        return
    
    print()
    print("¿Ejecutar todo? (si/no): ", end="")
    if input().strip().lower() != 'si':
        print("❌ Cancelado")
        return
    
    # EJECUTAR FASE 1
    print()
    print("🗑️  Eliminando duplicados...")
    eliminados = 0
    for anime in a_eliminar:
        if eliminar_anime(anime['id']):
            eliminados += 1
            if eliminados % 50 == 0:
                print(f"   Progreso: {eliminados}/{len(a_eliminar)}")
    print(f"✅ {eliminados} eliminados")
    
    # EJECUTAR FASE 2
    print()
    print("📁 Agrupando sagas...")
    actualizados = 0
    for clave, grupo in sagas.items():
        principal = min(grupo, key=lambda x: x['orden'])
        saga_titulo = principal['base']
        
        for item in grupo:
            try:
                supabase.table('animes').update({
                    'saga_titulo': saga_titulo,
                    'saga_normalizada': clave,
                    'saga_orden': item['orden'],
                    'es_saga_principal': item == principal,
                }).eq('id', item['anime']['id']).execute()
                actualizados += 1
            except Exception as e:
                print(f"   ⚠️ {e}")
    
    print(f"✅ {actualizados} animes agrupados")
    print()
    print("=" * 70)
    print("🎉 COMPLETADO")
    print("=" * 70)


if __name__ == '__main__':
    main()
