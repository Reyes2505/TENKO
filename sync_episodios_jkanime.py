#!/usr/bin/env python3
"""
Sincroniza nombres y fechas de episodios desde JK Anime.
Diseñado para GitHub Actions 24/7.
"""

import os
import re
import time
import random
from datetime import datetime
from typing import Optional, Dict, List
import requests
from bs4 import BeautifulSoup
from supabase import create_client

# ========== CONFIGURACIÓN ==========
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://uftfbidzobftjbonziql.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A')

LIMITE_EPISODIOS = int(os.environ.get('LIMITE_EPISODIOS', '30'))

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
}


def extraer_datos_episodio(url: str) -> Optional[Dict[str, str]]:
    """
    Extrae datos de un episodio desde su página de JK Anime.
    Retorna: {titulo_episodio, fecha_emision, descripcion}
    """
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        
        if response.status_code != 200:
            return None
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        datos = {}
        
        # 1. Buscar nombre del episodio en el H1
        h1 = soup.find('h1')
        if h1:
            texto_h1 = h1.get_text(strip=True)
            # Formato: "Episodio 1  - Sword Art Online II"
            # o "Episodio 1 - El nombre del capítulo"
            match = re.search(r'Episodio\s+\d+\s*-\s*(.+)', texto_h1)
            if match:
                nombre = match.group(1).strip()
                # Si el nombre es igual al título del anime, no es un nombre de episodio
                if nombre and len(nombre) > 2:
                    datos['titulo_episodio'] = nombre
        
        # 2. Buscar en el meta description
        meta_desc = soup.find('meta', {'name': 'description'})
        if meta_desc:
            desc = meta_desc.get('content', '')
            if desc:
                # Limpiar la descripción
                datos['descripcion'] = desc[:500]
        
        # 3. Buscar fecha de emisión
        # JK Anime usa varios formatos, buscamos en el HTML
        texto_completo = soup.get_text()
        
        # Patrón: "Fecha de emisión: DD/MM/YYYY" o "Emitido: DD/MM/YYYY"
        fecha_match = re.search(
            r'(?:Fecha de emisión|Emitido|Estreno|Fecha):\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            texto_completo
        )
        if fecha_match:
            fecha_str = fecha_match.group(1)
            # Convertir a YYYY-MM-DD
            partes = re.split(r'[/-]', fecha_str)
            if len(partes) == 3:
                dia, mes, anio = partes
                if len(anio) == 2:
                    anio = '20' + anio
                datos['fecha_emision'] = f"{anio}-{mes.zfill(2)}-{dia.zfill(2)}"
        
        # 4. Buscar en la sección de información del episodio
        info_div = soup.find('div', class_='anime__details__episodes')
        if info_div:
            texto_info = info_div.get_text()
            fecha_match2 = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', texto_info)
            if fecha_match2 and 'fecha_emision' not in datos:
                fecha_str = fecha_match2.group(1)
                partes = re.split(r'[/-]', fecha_str)
                if len(partes) == 3:
                    dia, mes, anio = partes
                    if len(anio) == 2:
                        anio = '20' + anio
                    datos['fecha_emision'] = f"{anio}-{mes.zfill(2)}-{dia.zfill(2)}"
        
        # 5. Buscar en la página del anime (listado de episodios)
        # Buscar el enlace al anime y obtener la lista de episodios con fechas
        anime_link = soup.find('a', href=re.compile(r'^/[^/]+/$'))
        if anime_link:
            anime_url = f"https://jkanime.net{anime_link['href']}"
            try:
                anime_res = requests.get(anime_url, headers=HEADERS, timeout=15)
                if anime_res.status_code == 200:
                    anime_soup = BeautifulSoup(anime_res.text, 'html.parser')
                    
                    # Buscar lista de episodios con fechas
                    episodios_lista = anime_soup.find_all('div', class_='anime__episode__item')
                    for ep_item in episodios_lista:
                        texto_ep = ep_item.get_text()
                        # Buscar número y fecha
                        num_match = re.search(r'Episodio\s+(\d+)', texto_ep)
                        fecha_match3 = re.search(r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', texto_ep)
                        
                        if num_match and fecha_match3:
                            num = int(num_match.group(1))
                            # Si es el episodio que buscamos
                            if str(num) in url:
                                fecha_str = fecha_match3.group(1)
                                partes = re.split(r'[/-]', fecha_str)
                                if len(partes) == 3:
                                    dia, mes, anio = partes
                                    if len(anio) == 2:
                                        anio = '20' + anio
                                    datos['fecha_emision'] = f"{anio}-{mes.zfill(2)}-{dia.zfill(2)}"
                                    break
            except Exception:
                pass
        
        return datos if datos else None
        
    except Exception as e:
        print(f'    ⚠️ Error: {e}')
        return None


def procesar_episodio(ep: Dict) -> Dict[str, int]:
    """Procesa un episodio individual."""
    ep_id = ep.get('id')
    numero = ep.get('numero', '?')
    url = ep.get('url_stream', '')
    
    if not ep_id or not url:
        return {'actualizados': 0, 'errores': 1}
    
    print(f'  📺 EP {numero}...')
    
    datos = extraer_datos_episodio(url)
    
    if not datos:
        print(f'    ❌ Sin datos')
        return {'actualizados': 0, 'errores': 1}
    
    # Actualizar en BD
    try:
        supabase.table('episodios').update(datos).eq('id', ep_id).execute()
        print(f'    ✅ {datos.get("titulo_episodio", "Sin título")[:50]}')
        return {'actualizados': 1, 'errores': 0}
    except Exception as e:
        print(f'    ⚠️ Error BD: {e}')
        return {'actualizados': 0, 'errores': 1}


def main():
    print('=' * 60)
    print('📺 TENKO - Sync Episodios desde JK Anime')
    print(f'📅 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'🎯 Límite: {LIMITE_EPISODIOS} episodios')
    print('=' * 60)
    print('')
    
    # Obtener episodios sin título o sin fecha
    print('📊 Buscando episodios sin datos...')
    
    result = supabase.table('episodios').select(
        'id, numero, url_stream, titulo_episodio, fecha_emision'
    ).or_('titulo_episodio.is.null,fecha_emision.is.null').limit(LIMITE_EPISODIOS).execute()
    
    episodios = result.data or []
    
    print(f'📋 Episodios pendientes: {len(episodios)}')
    print('')
    
    if not episodios:
        print('✅ Todos los episodios están sincronizados')
        return
    
    total_actualizados = 0
    total_errores = 0
    
    for i, ep in enumerate(episodios, 1):
        print(f'[{i}/{len(episodios)}]')
        
        resultado = procesar_episodio(ep)
        total_actualizados += resultado['actualizados']
        total_errores += resultado['errores']
        
        # Pausa entre episodios (evitar rate limit)
        if i < len(episodios):
            time.sleep(random.uniform(1.5, 2.5))
    
    print('')
    print('=' * 60)
    print('📊 RESUMEN')
    print('=' * 60)
    print(f'✅ Episodios actualizados: {total_actualizados}')
    print(f'❌ Errores: {total_errores}')
    print('=' * 60)


if __name__ == '__main__':
    main()
