#!/usr/bin/env python3
"""
Extrae frames de videos M3U8 y los sube a Supabase Storage.
Diseñado para ejecutarse en GitHub Actions.
"""

import os
import subprocess
import tempfile
import requests
import re
from supabase import create_client
from typing import Optional
import time
import sys

# ========== CONFIGURACIÓN ==========
SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'
BUCKET_NAME = 'thumbnails'
LIMITE_EPISODIOS = 5

# Headers para peticiones HTTP
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
}

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def obtener_m3u8(page_url: str) -> Optional[str]:
    """Obtiene la URL M3U8 desde una página de JK Anime."""
    try:
        page_res = requests.get(page_url, headers=HEADERS, timeout=15)
        if page_res.status_code != 200:
            return None
        
        iframe_match = re.search(r'src="(https://jkanime\.net/jkplayer/um\?e=[^"]+)"', page_res.text)
        if not iframe_match:
            iframe_match = re.search(r'src="(https://jkanime\.net/jkplayer/umv\?e=[^"]+)"', page_res.text)
        
        if not iframe_match:
            return None
        
        iframe_url = iframe_match.group(1)
        iframe_res = requests.get(iframe_url, headers=HEADERS, timeout=15)
        
        if iframe_res.status_code != 200:
            return None
        
        m3u8_match = re.search(r'(https?://[^\s"\']+\.m3u8[^\s"\']*)', iframe_res.text)
        return m3u8_match.group(1) if m3u8_match else None
        
    except Exception:
        return None


def extraer_frame(m3u8_url: str, timestamp: int, output_path: str) -> bool:
    """Extrae un frame del video M3U8 usando ffmpeg."""
    try:
        cmd = [
            'timeout', '15', 'ffmpeg',
            '-y',
            '-ss', str(timestamp),
            '-i', m3u8_url,
            '-frames:v', '1',
            '-q:v', '2',
            '-loglevel', 'error',
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, timeout=20)
        
        if result.returncode == 0 and os.path.exists(output_path):
            return os.path.getsize(output_path) > 1000
        
        return False
        
    except Exception:
        return False


def subir_thumbnail(file_path: str, episode_id: str) -> Optional[str]:
    """Sube un frame a Supabase Storage."""
    try:
        file_name = f'{episode_id}.jpg'
        
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        if len(file_data) < 1000:
            return None
        
        try:
            supabase.storage.from_(BUCKET_NAME).upload(
                file_name,
                file_data,
                {'content-type': 'image/jpeg', 'x-upsert': 'true'}
            )
        except Exception:
            try:
                supabase.storage.from_(BUCKET_NAME).update(
                    file_name,
                    file_data,
                    {'content-type': 'image/jpeg'}
                )
            except Exception:
                return None
        
        return supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)
        
    except Exception:
        return None


def verificar_bucket() -> bool:
    """Verifica que el bucket exista."""
    try:
        buckets = supabase.storage.list_buckets()
        bucket_exists = any(b.name == BUCKET_NAME for b in buckets)
        
        if bucket_exists:
            print(f'✅ Bucket "{BUCKET_NAME}" ya existe')
            return True
        
        try:
            supabase.storage.create_bucket(BUCKET_NAME, {'public': True})
            print(f'✅ Bucket "{BUCKET_NAME}" creado')
            return True
        except Exception as e:
            print(f'⚠️ No se pudo crear bucket: {e}')
            return False
            
    except Exception as e:
        print(f'⚠️ Error verificando bucket: {e}')
        return False


def procesar_episodio(ep: dict) -> bool:
    """Procesa un episodio completo."""
    ep_id = ep.get('id')
    numero = ep.get('numero', '?')
    page_url = ep.get('url_stream', '')
    
    if not ep_id or not page_url:
        return False
    
    print(f'🎬 EP {numero} - Obteniendo stream...')
    
    m3u8_url = obtener_m3u8(page_url)
    if not m3u8_url:
        print(f'  ❌ Sin M3U8')
        return False
    
    with tempfile.TemporaryDirectory() as tmpdir:
        frame_path = None
        timestamps = [60, 120, 300, 600]
        
        for ts in timestamps:
            output_path = os.path.join(tmpdir, f'frame_{ts}.jpg')
            print(f'  📸 Frame en {ts}s...')
            
            if extraer_frame(m3u8_url, ts, output_path):
                frame_path = output_path
                print(f'  ✅ Frame extraído')
                break
        
        if not frame_path:
            print(f'  ❌ Sin frames')
            return False
        
        print(f'  ☁️ Subiendo...')
        thumbnail_url = subir_thumbnail(frame_path, ep_id)
        
        if not thumbnail_url:
            print(f'  ❌ Error subiendo')
            return False
        
        try:
            supabase.table('episodios').update({'thumbnail_url': thumbnail_url}).eq('id', ep_id).execute()
            print(f'  ✅ Thumbnail guardado')
            return True
        except Exception as e:
            print(f'  ⚠️ Error BD: {e}')
            return False


def main():
    print('=' * 60)
    print('🏯 TENKO - Extractor de Thumbnails')
    print('=' * 60)
    print(f'📋 Límite: {LIMITE_EPISODIOS} episodios')
    print('')
    
    if not verificar_bucket():
        print('❌ No se pudo verificar el bucket')
        sys.exit(1)
    
    result = supabase.table('episodios').select('id, numero, url_stream').is_('thumbnail_url', 'null').limit(LIMITE_EPISODIOS).execute()
    episodios = result.data or []
    
    print(f'📊 Episodios sin thumbnail: {len(episodios)}')
    print('')
    
    if not episodios:
        print('✅ Todos tienen thumbnail')
        return
    
    exitosos = 0
    fallidos = 0
    
    for i, ep in enumerate(episodios, 1):
        print(f'[{i}/{len(episodios)}]')
        
        if procesar_episodio(ep):
            exitosos += 1
        else:
            fallidos += 1
        
        print('')
        if i < len(episodios):
            time.sleep(3)
    
    print('=' * 60)
    print(f'✅ Exitosos: {exitosos}')
    print(f'❌ Fallidos: {fallidos}')
    print('=' * 60)


if __name__ == '__main__':
    main()
