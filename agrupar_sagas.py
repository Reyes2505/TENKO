#!/usr/bin/env python3
"""
Agrupa animes por saga.
- Detecta títulos que pertenecen a la misma saga
- Marca uno como principal
- Vincula los demás con anime_padre_id
"""

import re
import unicodedata
from difflib import SequenceMatcher
from typing import List, Dict, Optional, Tuple
from supabase import create_client

SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxNjE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def extraer_saga(titulo: str) -> Tuple[str, Optional[str]]:
    """
    Extrae el nombre base de la saga y el sufijo de temporada.
    
    'Mushoku Tensei III: Isekai Ittara Honki Dasu' 
    → ('Mushoku Tensei: Isekai Ittara Honki Dasu', 'III')
    
    'Sword Art Online II'
    → ('Sword Art Online', 'II')
    
    'Re:Zero kara Hajimeru Isekai Seikatsu 4th Season'
    → ('Re:Zero kara Hajimeru Isekai Seikatsu', '4th Season')
    """
    if not titulo:
        return titulo, None
    
    t = titulo.strip()
    sufijo = None
    
    # Patrones de temporada/parte (orden importa)
    patrones = [
        (r'\s+(\d+(?:st|nd|rd|th)\s+Season)\s*$', 1),      # 4th Season
        (r'\s+(Season\s+\d+)\s*$', 1),                       # Season 2
        (r'\s+(Part\s+\d+)\s*$', 1),                         # Part 1
        (r'\s+(Final Season)\s*$', 1),                       # Final Season
        (r'\s+(?:(\d+)(?:nd|rd|th)?\s+Season)\s*$', 1),     # 2nd Season
        (r'\s+(X{0,3}(?:IX|IV|V?I{0,3}))\s*$', 1),          # II, III, IV, V...
        (r'\s+(\d+)\s*$', 1),                                # Number alone
    ]
    
    for patron, grupo in patrones:
        match = re.search(patron, t, re.IGNORECASE)
        if match:
            sufijo = match.group(grupo)
            saga = t[:match.start()].strip()
            # Si la saga está vacía, usar título completo
            if not saga:
                saga = t
                sufijo = None
            return saga, sufijo
    
    return t, None


def normalizar(titulo: str) -> str:
    """Normaliza un título."""
    if not titulo:
        return ''
    t = titulo.lower()
    t = unicodedata.normalize('NFKD', t)
    t = ''.join(c for c in t if not unicodedata.combining(c))
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    return re.sub(r'\s+', ' ', t).strip()


def main():
    print("=" * 70)
    print("🎬 AGRUPADOR DE SAGAS")
    print("=" * 70)
    print()
    
    # 1. Obtener todos los animes
    print("📊 Cargando animes...")
    response = supabase.table('animes').select(
        'id, titulo, saga_titulo, anime_padre_id, '
        'temporadas(id, episodios(id))'
    ).execute()
    
    animes = response.data or []
    print(f"   Total: {len(animes)}")
    print()
    
    # 2. Calcular total de episodios por anime
    for anime in animes:
        anime['total_eps'] = sum(
            len(t.get('episodios', [])) 
            for t in anime.get('temporadas', [])
        )
    
    # 3. Agrupar por saga
    print("🔍 Detectando sagas...")
    sagas = {}  # {saga_norm: [animes]}
    
    for anime in animes:
        saga, sufijo = extraer_saga(anime['titulo'])
        saga_norm = normalizar(saga)
        
        if saga_norm not in sagas:
            sagas[saga_norm] = {
                'saga_titulo': saga,
                'saga_norm': saga_norm,
                'animes': [],
            }
        sagas[saga_norm]['animes'].append({
            **anime,
            'sufijo': sufijo,
        })
    
    print(f"   Sagas detectadas: {len(sagas)}")
    print()
    
    # 4. Analizar cada saga
    print("=" * 70)
    print("📊 ANÁLISIS DE SAGAS")
    print("=" * 70)
    print()
    
    a_actualizar = []
    sagas_multiples = []
    
    for saga_norm, info in sagas.items():
        animes_saga = info['animes']
        
        if len(animes_saga) > 1:
            sagas_multiples.append(info)
    
    print(f"🎯 Sagas con múltiples animes: {len(sagas_multiples)}")
    print()
    
    # Mostrar ejemplos
    for info in sagas_multiples[:15]:
        print(f"🎬 {info['saga_titulo']}")
        for anime in info['animes']:
            marcador = f" [{anime['sufijo']}]" if anime['sufijo'] else ""
            print(f"   • {anime['titulo'][:60]}{marcador} ({anime['total_eps']} eps)")
        print()
    
    # 5. Confirmar
    if not sagas_multiples:
        print("✅ No hay sagas con múltiples animes")
        return
    
    respuesta = input(f"¿Agrupar {len(sagas_multiples)} sagas? (s/n): ")
    if respuesta.lower() != 's':
        print("❌ Cancelado")
        return
    
    # 6. Agrupar
    print()
    print("🔗 Agrupando sagas...")
    print()
    
    for info in sagas_multiples:
        animes_saga = info['animes']
        saga_titulo = info['saga_titulo']
        saga_norm = info['saga_norm']
        
        # Elegir principal: el que tenga más episodios
        principal = max(animes_saga, key=lambda a: a['total_eps'])
        
        # Actualizar principal
        try:
            supabase.table('animes').update({
                'saga_titulo': saga_titulo,
                'saga_normalizada': saga_norm,
                'es_saga_principal': True,
                'anime_padre_id': None,
            }).eq('id', principal['id']).execute()
            
            print(f"✅ Principal: {principal['titulo'][:60]} ({principal['total_eps']} eps)")
        except Exception as e:
            print(f"⚠️ Error con principal: {e}")
            continue
        
        # Actualizar los demás
        for anime in animes_saga:
            if anime['id'] == principal['id']:
                continue
            
            try:
                supabase.table('animes').update({
                    'saga_titulo': saga_titulo,
                    'saga_normalizada': saga_norm,
                    'es_saga_principal': False,
                    'anime_padre_id': principal['id'],
                }).eq('id', anime['id']).execute()
                
                print(f"   └─ Vinculado: {anime['titulo'][:60]}")
            except Exception as e:
                print(f"   ⚠️ Error: {e}")
        
        print()
    
    print("=" * 70)
    print("✅ AGRUPACIÓN COMPLETADA")
    print("=" * 70)


if __name__ == '__main__':
    main()
