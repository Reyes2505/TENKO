#!/usr/bin/env python3
"""
Descarga TODAS las páginas del directorio de JK Anime.
Guarda un archivo local con todos los animes.
"""

import json
import time
import re
import requests
from datetime import datetime

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
})

print("=" * 70)
print("📥 DESCARGANDO DIRECTORIO COMPLETO DE JK ANIME")
print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 70)
print()

todos_animes = {}
pagina = 1
max_paginas = 200  # Por si acaso

while pagina <= max_paginas:
    try:
        r = session.get(f'https://jkanime.net/directorio?p={pagina}', timeout=20)
        
        if r.status_code != 200:
            print(f'⚠️ Página {pagina}: Status {r.status_code}')
            break
        
        match = re.search(r'var animes = (\{.*?\});', r.text, re.DOTALL)
        if not match:
            print(f'⚠️ Página {pagina}: Sin JSON')
            break
        
        data = json.loads(match.group(1))
        animes = data.get('data', [])
        
        if not animes:
            print(f'✅ Fin del directorio en página {pagina}')
            break
        
        nuevos = 0
        for a in animes:
            slug = a.get('slug')
            if slug and slug not in todos_animes:
                todos_animes[slug] = {
                    'id': a.get('id'),
                    'titulo': a.get('title'),
                    'slug': slug,
                    'estado': a.get('status'),
                    'tipo': a.get('type'),
                    'imagen': a.get('image'),
                }
                nuevos += 1
        
        if pagina % 10 == 0 or nuevos == 0:
            print(f'📄 Página {pagina}: +{nuevos} (total: {len(todos_animes)})')
        
        pagina += 1
        time.sleep(0.3)  # Pausa entre peticiones
        
    except KeyboardInterrupt:
        print('\n⏹️ Interrumpido')
        break
    except Exception as e:
        print(f'❌ Error en página {pagina}: {e}')
        break

# Guardar
with open('directorio_jk.json', 'w', encoding='utf-8') as f:
    json.dump(todos_animes, f, indent=2, ensure_ascii=False)

print()
print("=" * 70)
print(f"✅ Total: {len(todos_animes)} animes")
print(f"✅ Guardado en: directorio_jk.json")
print("=" * 70)
