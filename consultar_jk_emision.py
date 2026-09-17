#!/usr/bin/env python3
"""
Consulta de animes en emisión desde JK Anime (directorio).
Solo 3 páginas del directorio para ser rápido.
"""

import re
import json
import time
from datetime import datetime
import requests

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
})


def consultar_jk(paginas=3):
    """Consulta animes en emisión desde JK Anime."""
    animes = []
    
    for pagina in range(1, paginas + 1):
        print(f"📄 Página {pagina}...")
        
        try:
            response = session.get(
                f"https://jkanime.net/directorio?p={pagina}",
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"  ⚠️ Status {response.status_code}")
                break
            
            match = re.search(r'var animes = (\{.*?\});', response.text, re.DOTALL)
            
            if not match:
                print(f"  ⚠️ No se encontró JSON")
                continue
            
            data = json.loads(match.group(1))
            
            for anime in data.get('data', []):
                if anime.get('status') == 'currently':
                    animes.append({
                        'titulo': anime.get('title', ''),
                        'slug': anime.get('slug', ''),
                        'tipo': anime.get('type', ''),
                        'estado': anime.get('status', ''),
                    })
            
            print(f"  ✅ {len(data.get('data', []))} animes encontrados")
            
        except Exception as e:
            print(f"  ❌ Error: {e}")
            break
    
    return animes


def main():
    print("=" * 80)
    print("🔍 ANIMES EN EMISIÓN - JK ANIME")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    print()
    
    animes = consultar_jk(3)
    
    print()
    print("=" * 80)
    print(f"📊 ANIMES EN EMISIÓN ({len(animes)})")
    print("=" * 80)
    print()
    
    for i, anime in enumerate(animes, 1):
        print(f"[{i}] 🎬 {anime['titulo']}")
        print(f"    🔗 {anime['slug']}")
        print(f"    🎭 Tipo: {anime['tipo']}")
        print()
    
    print("=" * 80)
    print(f"📊 Total: {len(animes)} animes en emisión")


if __name__ == '__main__':
    main()
