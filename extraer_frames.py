#!/usr/bin/env python3
"""
Extrae frames de videos M3U8 y los sube a Supabase Storage.
Versión corregida con mejor manejo de timeouts.
"""

import os
import subprocess
import tempfile
import requests
import re
from supabase import create_client
from typing import Optional
import time
import signal

# Configuración
SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

BUCKET_NAME = 'thumbnails'

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
}


def obtener_m3u8_desde_pagina(page_url: str) -> Optional[str]:
    """Obtiene la URL M3U8 desde la página de JK Anime."""
    try:
        page_res = requests.get(page_url, headers=HEADERS, timeout=15)
        if page_res.status_code != 200:
            return None
        
        html = page_res.text
        iframe_match = re.search(r'src="(https://jkanime\.net/jkplayer/um\?e=[^"]+)"', html)
        
        if not iframe_match:
            return None
        
        iframe_url = iframe_match.group(1)
        iframe_res = requests.get(iframe_url, headers=HEADERS, timeout=15)
        
        if iframe_res.status_code != 200:
            return None
        
        iframe_html = iframe_res.text
        m3u8_match = re.search(r'(https?://[^\s"\']+\.m3u8[^\s"\']*)', iframe_html)
        
        if m3u8_match:
            return m3u8_match.group(1)
        
        return None
    except Exception:
        return None


def extraer_frame_con_timeout(m3u8_url: str, timestamp: int, output_path: str, timeout_segundos: int = 15) -> bool:
    """Extrae un frame con timeout estricto."""
    try:
        cmd = [
            'timeout', str(timeout_segundos), 'ffmpeg',
            '-y',
            '-ss', str(timestamp),
            '-i', m3u8_url,
            '-frames:v', '1',
            '-q:v', '2',
            '-loglevel', 'error',
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, timeout=timeout_segundos + 5)
        
        return result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 1000
    except subprocess.TimeoutExpired:
        return False
    except Exception:
        return False


def subir_a_supabase(file_path: str, episode_id: str) -> Optional[str]:
    """Sube un frame a Supabase Storage."""
    try:
        file_name = f'{episode_id}.jpg'
        
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Verificar que el archivo no esté vacío
        if len(file_data) < 1000:
            return None
        
        # Intentar subir
        try:
            supabase.storage.from_(BUCKET_NAME).upload(
                file_name,
                file_data,
                {'content-type': 'image/jpeg', 'x-upsert': 'true'}
            )
        except Exception:
            # Si falla, intentar con update
            try:
                supabase.storage.from_(BUCKET_NAME).update(
                    file_name,
                    file_data,
                    {'content-type': 'image/jpeg'}
                )
            except Exception:
                pass
        
        # Obtener URL pública
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)
        return public_url
    except Exception as e:
        print(f'    ⚠️ Error subiendo: {e}')
        return None


def procesar_episodio(ep):
    """Procesa un episodio."""
    ep_id = ep.get('id')
    numero = ep.get('numero', '?')
    page_url = ep.get('url_stream', '')
    
    if not ep_id or not page_url:
        return None
    
    print(f'🎬 EP {numero} - Obteniendo stream...')
    
    m3u8_url = obtener_m3u8_desde_pagina(page_url)
    
    if not m3u8_url:
        print(f'  ❌ No se pudo obtener M3U8')
        return None
    
    with tempfile.TemporaryDirectory() as tmpdir:
        # Intentar diferentes timestamps
        timestamps = [60, 120, 300, 600]
        
        frame_path = None
        for ts in timestamps:
            output_path = os.path.join(tmpdir, f'frame_{ts}.jpg')
            print(f'  📸 Frame en {ts}s...')
            
            if extraer_frame_con_timeout(m3u8_url, ts, output_path):
                frame_path = output_path
                print(f'  ✅ Frame extraído en {ts}s')
                break
        
        if not frame_path:
            print(f'  ❌ No se pudieron extraer frames')
            return None
        
        print(f'  ☁️ Subiendo...')
        thumbnail_url = subir_a_supabase(frame_path, ep_id)
        
        if not thumbnail_url:
            print(f'  ❌ No se pudo subir')
            return None
        
        # Actualizar BD
        try:
            supabase.table('episodios').update({'thumbnail_url': thumbnail_url}).eq('id', ep_id).execute()
            print(f'  ✅ Thumbnail guardado')
            return thumbnail_url
        except Exception as e:
            print(f'  ⚠️ Error actualizando BD: {e}')
            return None


def main():
    """Función principal."""
    print('🏯 TENKO - Extractor de Frames')
    print('=' * 60)
    print('')
    
    # Obtener episodios sin thumbnail
    result = supabase.table('episodios').select('id, numero, url_stream').is_('thumbnail_url', 'null').limit(10).execute()
    episodios = result.data or []
    
    print(f'📋 Episodios sin thumbnail: {len(episodios)}')
    print('')
    
    if not episodios:
        print('✅ Todos los episodios tienen thumbnail')
        return
    
    exitosos = 0
    fallidos = 0
    
    for ep in episodios:
        resultado = procesar_episodio(ep)
        
        if resultado:
            exitosos += 1
        else:
            fallidos += 1
        
        print('')
        time.sleep(3)
    
    print('=' * 60)
    print(f'✅ Exitosos: {exitosos}')
    print(f'❌ Fallidos: {fallidos}')


if __name__ == '__main__':
    main()
