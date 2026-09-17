#!/usr/bin/env python3
"""
Test de búsqueda en JK Anime.
Prueba diferentes métodos para encontrar animes.
"""

import re
import json
import requests
from bs4 import BeautifulSoup

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
})

# Títulos a probar (de tu calendario)
TITULOS = [
    'Super no Ura de Yani Suu Futari',
    'Yani Neko',
    'Tsuihou Sareta Tensei Juukishi wa Game Chishiki de Musou Suru',
    'One Piece',
    'BLEACH: Sennen Kessen-hen - Kashin-tan',
]


def probar_directorio(titulo: str):
    """Prueba buscar en el directorio."""
    print(f"\n🔍 Buscando: {titulo}")
    
    # Método 1: Búsqueda por parámetro q
    try:
        r = session.get(
            'https://jkanime.net/directorio',
            params={'q': titulo},
            timeout=15
        )
        
        print(f"  Método 1 (directorio?q=): HTTP {r.status_code}")
        
        if r.status_code == 200:
            match = re.search(r'var animes = (\{.*?\});', r.text, re.DOTALL)
            if match:
                data = json.loads(match.group(1))
                animes = data.get('data', [])
                print(f"    ✅ {len(animes)} resultados")
                for anime in animes[:3]:
                    print(f"       • {anime.get('title')} → {anime.get('slug')}")
            else:
                print(f"    ⚠️ No se encontró JSON de animes")
                # Buscar si hay algún error
                if 'No se encontraron' in r.text or 'no results' in r.text.lower():
                    print(f"    ⚠️ La página dice: no hay resultados")
    except Exception as e:
        print(f"    ❌ Error: {e}")
    
    # Método 2: Búsqueda por primera palabra
    primera_palabra = titulo.split()[0]
    try:
        r = session.get(
            'https://jkanime.net/directorio',
            params={'q': primera_palabra},
            timeout=15
        )
        
        print(f"  Método 2 (directorio?q={primera_palabra}): HTTP {r.status_code}")
        
        if r.status_code == 200:
            match = re.search(r'var animes = (\{.*?\});', r.text, re.DOTALL)
            if match:
                data = json.loads(match.group(1))
                animes = data.get('data', [])
                print(f"    ✅ {len(animes)} resultados")
                for anime in animes[:3]:
                    print(f"       • {anime.get('title')} → {anime.get('slug')}")
    except Exception as e:
        print(f"    ❌ Error: {e}")
    
    # Método 3: Buscar en el directorio completo (página 1)
    try:
        r = session.get('https://jkanime.net/directorio?p=1', timeout=15)
        
        print(f"  Método 3 (directorio p=1): HTTP {r.status_code}")
        
        if r.status_code == 200:
            match = re.search(r'var animes = (\{.*?\});', r.text, re.DOTALL)
            if match:
                data = json.loads(match.group(1))
                animes = data.get('data', [])
                print(f"    ✅ {len(animes)} animes en página 1")
                
                # Buscar coincidencia
                titulo_lower = titulo.lower()
                for anime in animes:
                    if titulo_lower in anime.get('title', '').lower():
                        print(f"       🎯 ENCONTRADO: {anime.get('title')} → {anime.get('slug')}")
    except Exception as e:
        print(f"    ❌ Error: {e}")


def main():
    print("=" * 80)
    print("🔍 TEST DE BÚSQUEDA EN JK ANIME")
    print("=" * 80)
    
    for titulo in TITULOS:
        probar_directorio(titulo)
        print()


if __name__ == '__main__':
    main()
