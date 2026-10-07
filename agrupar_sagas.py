#!/usr/bin/env python3
"""
Agrupador de sagas.
- Detecta animes que pertenecen a la misma saga
- Asigna saga_titulo y saga_orden
- NO elimina nada, solo agrupa
"""

import re
import unicodedata
from typing import List, Dict, Tuple, Optional
from difflib import SequenceMatcher
from supabase import create_client

SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

DRY_RUN = True


def normalizar(titulo: str) -> str:
    if not titulo:
        return ''
    t = titulo.lower().strip()
    t = unicodedata.normalize('NFKD', t)
    t = ''.join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()


def extraer_sufijo_temporada(titulo: str) -> Tuple[str, str, int]:
    """
    Extrae:
    - base: título sin el sufijo de temporada
    - sufijo: el sufijo (II, III, Season 2, etc.)
    - orden: número de temporada estimado
    """
    if not titulo:
        return '', '', 1
    
    t = titulo.strip()
    
    # Patrón 1: "4th Season", "1st Season"
    match = re.search(r'\s+(\d+(?:st|nd|rd|th)\s+Season)\s*$', t, re.IGNORECASE)
    if match:
        sufijo = match.group(1)
        base = t[:match.start()].strip()
        num_match = re.search(r'(\d+)', sufijo)
        orden = int(num_match.group(1)) if num_match else 1
        return base, sufijo, orden
    
    # Patrón 2: "Season 2"
    match = re.search(r'\s+(Season\s+\d+)\s*$', t, re.IGNORECASE)
    if match:
        sufijo = match.group(1)
        base = t[:match.start()].strip()
        num_match = re.search(r'(\d+)', sufijo)
        orden = int(num_match.group(1)) if num_match else 1
        return base, sufijo, orden
    
    # Patrón 3: "Part 2"
    match = re.search(r'\s+(Part\s+\d+)\s*$', t, re.IGNORECASE)
    if match:
        sufijo = match.group(1)
        base = t[:match.start()].strip()
        num_match = re.search(r'(\d+)', sufijo)
        orden = int(num_match.group(1)) if num_match else 1
        return base, sufijo, orden
    
    # Patrón 4: "Final Season"
    match = re.search(r'\s+(Final Season)\s*$', t, re.IGNORECASE)
    if match:
        base = t[:match.start()].strip()
        return base, 'Final Season', 99
    
    # Patrón 5: "No. 170+1: More"
    match = re.search(r'\s+(No\.\s*\d+\+?\d*:?\s*.+)$', t, re.IGNORECASE)
    if match:
        sufijo = match.group(1)
        base = t[:match.start()].strip()
        return base, sufijo, 1
    
    # Patrón 6: Números romanos al final
    match = re.search(r'\s+([IVX]+)\s*$', t)
    if match:
        romano = match.group(1)
        base = t[:match.start()].strip()
        romanos = {'I': 1, 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8, 'IX': 9, 'X': 10}
        orden = romanos.get(romano, 1)
        return base, romano, orden
    
    # Patrón 7: Año entre paréntesis
    match = re.search(r'\s*\((\d{4})\)\s*$', t)
    if match:
        base = t[:match.start()].strip()
        return base, match.group(1), 1
    
    # Patrón 8: Número al final
    match = re.search(r'\s+(\d+)\s*$', t)
    if match:
        sufijo = match.group(1)
        base = t[:match.start()].strip()
        num = int(sufijo)
        if 1900 <= num <= 2100:
            return t, '', 1
        return base, sufijo, num
    
    return t, '', 1



def cargar_animes() -> List[Dict]:
    print("📊 Cargando animes...")
    response = supabase.table('animes').select(
        'id, titulo, saga_titulo, saga_orden, es_saga_principal, created_at'
    ).execute()
    
    animes = response.data or []
    print(f"✅ {len(animes)} animes")
    return animes


def agrupar_por_saga(animes: List[Dict]) -> Dict[str, List[Dict]]:
    """
    Agrupa animes por saga.
    Retorna {saga_base_normalizada: [animes]}
    """
    print("🔍 Agrupando por saga...")
    
    grupos = {}
    
    for anime in animes:
        titulo = anime['titulo']
        base, sufijo, orden = extraer_sufijo_temporada(titulo)
        
        # Clave de agrupación: título base normalizado
        clave = normalizar(base)
        
        if not clave:
            clave = normalizar(titulo)
        
        if clave not in grupos:
            grupos[clave] = []
        
        grupos[clave].append({
            'anime': anime,
            'base_original': base,
            'sufijo': sufijo,
            'orden': orden,
        })
    
    # Filtrar solo grupos con > 1 (sagas reales)
    sagas = {k: v for k, v in grupos.items() if len(v) > 1}
    
    print(f"✅ {len(sagas)} sagas detectadas (con múltiples animes)")
    return sagas


def elegir_principal(grupo: List[Dict]) -> Dict:
    """
    Elige el anime principal de la saga.
    Criterio: el que tiene el orden más bajo (temporada 1)
    """
    return min(grupo, key=lambda x: x['orden'])


def main():
    print("=" * 70)
    print("📁 AGRUPADOR DE SAGAS COMO CARPETAS")
    print("=" * 70)
    print(f"🔍 Modo: {'DRY RUN' if DRY_RUN else 'REAL'}")
    print("=" * 70)
    print()
    
    # 1. Cargar animes
    animes = cargar_animes()
    if not animes:
        return
    
    print()
    
    # 2. Agrupar
    sagas = agrupar_por_saga(animes)
    
    if not sagas:
        print("✅ No hay sagas que agrupar")
        return
    
    print()
    print("=" * 70)
    print("📊 SAGAS DETECTADAS")
    print("=" * 70)
    print()
    
    # 3. Mostrar análisis
    total_animes = sum(len(g) for g in sagas.values())
    
    # Mostrar solo las sagas más grandes
    sagas_ordenadas = sorted(sagas.items(), key=lambda x: -len(x[1]))
    
    for i, (clave, grupo) in enumerate(sagas_ordenadas[:20], 1):
        principal = elegir_principal(grupo)
        base_titulo = principal['base_original']
        
        print(f"[{i}] 📁 {base_titulo}")
        
        # Ordenar por orden
        grupo_ordenado = sorted(grupo, key=lambda x: x['orden'])
        
        for item in grupo_ordenado:
            anime = item['anime']
            sufijo = item['sufijo'] or '(T1)'
            orden = item['orden']
            
            marcador = "⭐" if item == principal else "  "
            print(f"    {marcador} [{orden}] {anime['titulo'][:55]}")
            print(f"         sufijo: {sufijo}")
        
        print()
    
    if len(sagas) > 20:
        print(f"... y {len(sagas) - 20} sagas más")
        print()
    
    # 4. Resumen
    print("=" * 70)
    print("📊 RESUMEN")
    print("=" * 70)
    print(f"  📁 Total sagas: {len(sagas)}")
    print(f"  📺 Total animes en sagas: {total_animes}")
    print(f"  📺 Animes individuales: {len(animes) - total_animes}")
    print("=" * 70)
    print()
    
    # 5. Guardar reporte
    import json
    reporte = {
        'total_sagas': len(sagas),
        'sagas': {
            clave: {
                'titulo': elegir_principal(grupo)['base_original'],
                'animes': [
                    {
                        'id': item['anime']['id'],
                        'titulo': item['anime']['titulo'],
                        'orden': item['orden'],
                        'sufijo': item['sufijo'],
                        'es_principal': item == elegir_principal(grupo),
                    }
                    for item in sorted(grupo, key=lambda x: x['orden'])
                ]
            }
            for clave, grupo in sagas.items()
        }
    }
    
    with open('reporte_sagas.json', 'w', encoding='utf-8') as f:
        json.dump(reporte, f, indent=2, ensure_ascii=False)
    print(f"💾 Reporte: reporte_sagas.json")
    print()
    
    if DRY_RUN:
        print("=" * 70)
        print("🔍 DRY RUN - No se actualizó nada")
        print("=" * 70)
        print()
        print("Para ejecutar:")
        print("  sed -i 's/^DRY_RUN = True/DRY_RUN = False/' agrupar_sagas.py")
        print("  python3 agrupar_sagas.py")
        return
    
    # 6. Ejecutar
    print("¿Ejecutar agrupación? (si/no): ", end="")
    if input().strip().lower() != 'si':
        print("❌ Cancelado")
        return
    
    print()
    print("📁 Agrupando sagas...")
    print()
    
    actualizados = 0
    
    for clave, grupo in sagas.items():
        principal = elegir_principal(grupo)
        saga_titulo = principal['base_original']
        
        for item in grupo:
            anime = item['anime']
            es_principal = (item == principal)
            
            try:
                supabase.table('animes').update({
                    'saga_titulo': saga_titulo,
                    'saga_normalizada': clave,
                    'saga_orden': item['orden'],
                    'es_saga_principal': es_principal,
                }).eq('id', anime['id']).execute()
                
                actualizados += 1
                
                if es_principal:
                    print(f"📁 {saga_titulo}")
                
                icono = "⭐" if es_principal else "  "
                print(f"  {icono} [{item['orden']}] {anime['titulo'][:55]}")
            except Exception as e:
                print(f"  ⚠️ Error con {anime['titulo']}: {e}")
        
        print()
    
    print("=" * 70)
    print(f"✅ {actualizados} animes agrupados")
    print(f"✅ {len(sagas)} sagas creadas")
    print("=" * 70)


if __name__ == '__main__':
    main()
