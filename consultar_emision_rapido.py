#!/usr/bin/env python3
"""
Consulta RÁPIDA de animes en emisión.
Solo consulta Supabase (sin scraping adicional).
"""

import os
from datetime import datetime
from supabase import create_client

SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def main():
    print("=" * 80)
    print("🔍 ANIMES EN EMISIÓN - SANTUARIO ANIME")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print()
    
    # Consulta directa a Supabase
    response = supabase.table('animes').select(
        'id, titulo, estado_emision, fecha_estreno, generos, '
        'temporadas(id, nombre, episodios(id, numero, titulo_episodio, fecha_emision))'
    ).eq('estado_emision', 'emitido').order('titulo').execute()
    
    animes = response.data or []
    
    print(f"📊 Total animes en emisión: {len(animes)}")
    print()
    print("=" * 80)
    
    for i, anime in enumerate(animes, 1):
        titulo = anime.get('titulo', '')
        fecha_estreno = anime.get('fecha_estreno', 'N/A') or 'N/A'
        generos = ', '.join(anime.get('generos', []) or [])
        
        temporadas = anime.get('temporadas', [])
        total_eps = sum(len(t.get('episodios', [])) for t in temporadas)
        
        print(f"\n[{i}] 🎬 {titulo}")
        print(f"    📅 Estreno: {fecha_estreno}")
        print(f"    🎭 Géneros: {generos[:70]}")
        print(f"    📺 Episodios: {total_eps}")
        
        # Mostrar últimos episodios
        if temporadas:
            episodios = temporadas[0].get('episodios', [])
            if episodios:
                ordenados = sorted(episodios, key=lambda e: e.get('numero', 0), reverse=True)
                print(f"    📺 Últimos episodios:")
                for ep in ordenados[:3]:
                    num = ep.get('numero', '?')
                    titulo_ep = ep.get('titulo_episodio') or f'Episodio {num}'
                    fecha = ep.get('fecha_emision') or 'Sin fecha'
                    print(f"       └─ EP {num:02d}: {titulo_ep[:45]} ({fecha})")
    
    print()
    print("=" * 80)
    print("📊 RESUMEN")
    print("=" * 80)
    print(f"📺 Animes en emisión: {len(animes)}")
    
    # Calcular estadísticas
    total_episodios = 0
    sin_datos = 0
    
    for anime in animes:
        for temp in anime.get('temporadas', []):
            for ep in temp.get('episodios', []):
                total_episodios += 1
                if not ep.get('titulo_episodio') or not ep.get('fecha_emision'):
                    sin_datos += 1
    
    print(f"📥 Total episodios: {total_episodios}")
    print(f"⚠️ Sin datos (título/fecha): {sin_datos}")
    print(f"✅ Con datos: {total_episodios - sin_datos}")
    print()


if __name__ == '__main__':
    main()
