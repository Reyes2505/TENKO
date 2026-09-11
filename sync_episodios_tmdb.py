#!/usr/bin/env python3
"""
Sincroniza nombres, fechas y descripciones de episodios desde TMDB.
Diseñado para GitHub Actions 24/7.

CARACTERÍSTICAS:
- Cache de animes no encontrados (reintenta cada 7 días)
- No hay bucle infinito
- Filtro por año con fallback
- Solo guarda nombres REALES (no "Episodio X")
- Fallback de idioma: es-ES → es-MX → en-US
"""

import os
import re
import time
import json
import requests
from datetime import datetime
from supabase import create_client
from typing import Optional, Dict, List

# ========== CONFIGURACIÓN ==========
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://uftfbidzobftjbonziql.supabase.co')
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

TMDB_API_KEY = '78094a5cc8cc496bfb9f2f9913473563'

MODO_COMPLETO = os.environ.get('MODO_COMPLETO', 'false').lower() == 'true'
LIMITE_ANIMES = int(os.environ.get('LIMITE_ANIMES', '10'))
DIAS_REINTENTO = int(os.environ.get('DIAS_REINTENTO', '7'))
CACHE_FILE = '.tmdb_cache.json'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
TMDB_URL = "https://api.themoviedb.org/3"


# ========== CACHE ==========
def cargar_cache() -> Dict:
    """Carga el cache de animes no encontrados."""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if 'no_encontrados' not in data:
                    data['no_encontrados'] = {}
                return data
        except:
            pass
    return {'no_encontrados': {}, 'ultima_actualizacion': None}


def guardar_cache(cache: Dict):
    """Guarda el cache."""
    try:
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f'⚠️ Error guardando cache: {e}')


def debe_reintentar(titulo: str, cache: Dict) -> bool:
    """Verifica si debe reintentar buscar un anime."""
    if titulo not in cache.get('no_encontrados', {}):
        return True
    
    info = cache['no_encontrados'][titulo]
    if isinstance(info, dict):
        ultima = info.get('timestamp', 0)
        intentos = info.get('intentos', 1)
    else:
        ultima = info
        intentos = 1
    
    if intentos >= 5:
        dias = (datetime.now().timestamp() - ultima) / 86400
        return dias > 30
    
    dias = (datetime.now().timestamp() - ultima) / 86400
    return dias > DIAS_REINTENTO


def marcar_no_encontrado(titulo: str, cache: Dict):
    """Marca un anime como no encontrado."""
    if 'no_encontrados' not in cache:
        cache['no_encontrados'] = {}
    
    info_actual = cache['no_encontrados'].get(titulo, {})
    if isinstance(info_actual, dict):
        intentos = info_actual.get('intentos', 0) + 1
    else:
        intentos = 2
    
    cache['no_encontrados'][titulo] = {
        'timestamp': datetime.now().timestamp(),
        'intentos': intentos,
    }


# ========== UTILIDADES ==========
def limpiar_titulo(titulo: str) -> str:
    """Limpia el título para mejorar la búsqueda en TMDB."""
    titulo = titulo.strip()
    titulo = re.sub(r'\s*\(\d{4}\)\s*$', '', titulo)
    titulo = re.sub(r'\s+\d+(st|nd|rd|th)\s+Season\s*$', '', titulo, flags=re.IGNORECASE)
    titulo = re.sub(r'\s+Season\s+\d+\s*$', '', titulo, flags=re.IGNORECASE)
    titulo = re.sub(r'\s+Part\s+\d+\s*$', '', titulo, flags=re.IGNORECASE)
    titulo = re.sub(r'\s+(II|III|IV|V|VI|VII|VIII|IX|X)\s*$', '', titulo)
    return titulo.strip()


def normalizar(texto: str) -> str:
    """Normaliza texto para comparación."""
    if not texto:
        return ''
    texto = texto.lower()
    texto = re.sub(r'[^a-z0-9\s]', '', texto)
    texto = re.sub(r'\s+', ' ', texto)
    return texto.strip()


def similitud(titulo1: str, titulo2: str) -> float:
    """Calcula similitud entre dos títulos (0-1)."""
    t1 = normalizar(titulo1)
    t2 = normalizar(titulo2)
    
    if not t1 or not t2:
        return 0
    
    palabras1 = set(t1.split())
    palabras2 = set(t2.split())
    
    if not palabras1 or not palabras2:
        return 0
    
    interseccion = palabras1 & palabras2
    union = palabras1 | palabras2
    
    return len(interseccion) / len(union)


def es_nombre_generico(nombre: str, numero: int) -> bool:
    """Verifica si un nombre es genérico (Episodio X)."""
    if not nombre:
        return True
    
    nombre_limpio = nombre.strip()
    
    # Patrones genéricos
    patrones = [
        rf'^Episodio\s+{numero}$',
        rf'^Episode\s+{numero}$',
        rf'^Ep\.?\s*{numero}$',
        rf'^Cap[íi]tulo\s+{numero}$',
        rf'^{numero}$',
    ]
    
    for patron in patrones:
        if re.match(patron, nombre_limpio, re.IGNORECASE):
            return True
    
    # Si el nombre es muy corto, probablemente no es un nombre real
    if len(nombre_limpio) < 3:
        return True
    
    return False


# ========== BÚSQUEDA EN TMDB ==========
def _buscar_con_params(titulo_busqueda: str, anio: str, titulo_original: str) -> Optional[Dict]:
    """Realiza la búsqueda con parámetros específicos."""
    try:
        params = {
            'api_key': TMDB_API_KEY,
            'query': titulo_busqueda,
            'language': 'es-ES',
        }
        
        if anio:
            params['first_air_date_year'] = anio
        
        response = requests.get(
            f'{TMDB_URL}/search/tv',
            params=params,
            timeout=15
        )
        
        if response.status_code != 200:
            return None
        
        data = response.json()
        results = data.get('results', [])
        
        if not results:
            return None
        
        mejor_resultado = None
        mejor_similitud = 0
        
        for result in results:
            nombres = [
                result.get('name', ''),
                result.get('original_name', ''),
            ]
            
            for nombre in nombres:
                sim_original = similitud(titulo_original, nombre)
                sim_busqueda = similitud(titulo_busqueda, nombre)
                sim = max(sim_original, sim_busqueda)
                
                if sim > mejor_similitud:
                    mejor_similitud = sim
                    mejor_resultado = result
        
        if mejor_resultado and mejor_similitud >= 0.5:
            return mejor_resultado
        
        return None
        
    except Exception as e:
        print(f'  ⚠️ Error: {e}')
        return None


def buscar_anime_tmdb(titulo: str, anio: str = None) -> Optional[Dict]:
    """Busca un anime en TMDB con filtro de año y verificación de título."""
    titulos_a_probar = [titulo]
    
    if re.search(r'\s+(II|III|IV|V|VI|VII|VIII|IX|X)\s*$', titulo):
        titulos_a_probar.append(limpiar_titulo(titulo))
    
    titulo_limpio = limpiar_titulo(titulo)
    if titulo_limpio not in titulos_a_probar:
        titulos_a_probar.append(titulo_limpio)
    
    for titulo_busqueda in titulos_a_probar:
        if not titulo_busqueda:
            continue
        
        if anio:
            resultado = _buscar_con_params(titulo_busqueda, anio, titulo)
            if resultado:
                return resultado
        
        resultado = _buscar_con_params(titulo_busqueda, None, titulo)
        if resultado:
            return resultado
    
    return None


def obtener_episodios_tmdb(tmdb_id: int) -> Dict[int, Dict]:
    """Obtiene episodios de TMDB con fallback de idioma."""
    for idioma in ['es-ES', 'es-MX', 'en-US']:
        try:
            response = requests.get(
                f'{TMDB_URL}/tv/{tmdb_id}/season/1',
                params={
                    'api_key': TMDB_API_KEY,
                    'language': idioma,
                },
                timeout=15
            )
            
            if response.status_code != 200:
                continue
            
            data = response.json()
            episodes = data.get('episodes', [])
            
            if not episodes:
                continue
            
            # Verificar si al menos un episodio tiene nombre real
            tiene_nombres = False
            for ep in episodes:
                num = ep.get('episode_number', 0)
                name = ep.get('name', '')
                if name and not es_nombre_generico(name, num):
                    tiene_nombres = True
                    break
            
            if not tiene_nombres:
                continue
            
            print(f'  🌐 Idioma: {idioma}')
            
            episodios_map = {}
            for ep in episodes:
                num = ep.get('episode_number')
                if num:
                    name = ep.get('name', '')
                    # Ignorar nombres genéricos
                    if es_nombre_generico(name, num):
                        name = None
                    
                    episodios_map[num] = {
                        'titulo_episodio': name,
                        'fecha_emision': ep.get('air_date', '') or None,
                        'descripcion': (ep.get('overview', '') or '')[:500] or None,
                    }
            
            return episodios_map
            
        except Exception as e:
            print(f'  ⚠️ Error con idioma {idioma}: {e}')
            continue
    
    return {}


# ========== PROCESAMIENTO ==========
def necesita_actualizacion(ep: Dict) -> bool:
    """Determina si un episodio necesita actualización."""
    if MODO_COMPLETO:
        return True
    
    titulo_ep = (ep.get('titulo_episodio') or '').strip()
    fecha = ep.get('fecha_emision')
    desc = ep.get('descripcion')
    
    # Si no tiene título o es genérico, necesita actualización
    if not titulo_ep or es_nombre_generico(titulo_ep, ep.get('numero', 0)):
        return True
    
    if not fecha or not desc:
        return True
    
    return False


def anime_necesita_actualizacion(anime: Dict) -> bool:
    """Determina si un anime necesita actualización."""
    temporadas = anime.get('temporadas', [])
    for temp in temporadas:
        for ep in temp.get('episodios', []):
            if necesita_actualizacion(ep):
                return True
    return False


def procesar_anime(anime: Dict, cache: Dict) -> Dict[str, int]:
    """Procesa un anime y actualiza sus episodios."""
    titulo = anime.get('titulo', '')
    temporadas = anime.get('temporadas', [])
    fecha_estreno = anime.get('fecha_estreno', '')
    
    anio = None
    if fecha_estreno and len(str(fecha_estreno)) >= 4:
        anio = str(fecha_estreno)[:4]
    
    # Verificar cache
    if not debe_reintentar(titulo, cache):
        return {'actualizados': 0, 'errores': 0, 'saltados': 1, 'razon': 'cache'}
    
    total_eps = 0
    eps_sin_datos = 0
    
    for temp in temporadas:
        for ep in temp.get('episodios', []):
            total_eps += 1
            if necesita_actualizacion(ep):
                eps_sin_datos += 1
    
    if eps_sin_datos == 0:
        return {'actualizados': 0, 'errores': 0, 'saltados': 1, 'razon': 'completo'}
    
    print(f'🎬 {titulo} ({total_eps} eps, {eps_sin_datos} por actualizar)')
    if anio:
        print(f'  📅 Año: {anio}')
    
    tmdb_data = buscar_anime_tmdb(titulo, anio)
    
    if not tmdb_data:
        print(f'  ❌ No encontrado en TMDB')
        marcar_no_encontrado(titulo, cache)
        return {'actualizados': 0, 'errores': 1, 'saltados': 0, 'razon': 'no_tmdb'}
    
    print(f'  ✅ TMDB: {tmdb_data.get("name", "")} (ID: {tmdb_data["id"]})')
    
    episodios_tmdb = obtener_episodios_tmdb(tmdb_data['id'])
    
    if not episodios_tmdb:
        print(f'  ❌ Sin episodios con nombres reales en TMDB')
        marcar_no_encontrado(titulo, cache)
        return {'actualizados': 0, 'errores': 1, 'saltados': 0, 'razon': 'sin_nombres'}
    
    print(f'  📺 {len(episodios_tmdb)} episodios en TMDB')
    
    actualizados = 0
    errores = 0
    
    for temp in temporadas:
        for ep in temp.get('episodios', []):
            ep_id = ep.get('id')
            numero = ep.get('numero')
            
            if numero not in episodios_tmdb:
                continue
            
            if not necesita_actualizacion(ep):
                continue
            
            datos_tmdb = episodios_tmdb[numero]
            update_data = {}
            
            # Solo actualizar si el nombre es REAL
            if datos_tmdb.get('titulo_episodio'):
                update_data['titulo_episodio'] = datos_tmdb['titulo_episodio']
            
            if datos_tmdb.get('fecha_emision'):
                update_data['fecha_emision'] = datos_tmdb['fecha_emision']
            
            if datos_tmdb.get('descripcion'):
                update_data['descripcion'] = datos_tmdb['descripcion']
            
            if update_data:
                try:
                    supabase.table('episodios').update(update_data).eq('id', ep_id).execute()
                    actualizados += 1
                except Exception as e:
                    print(f'    ⚠️ Error EP {numero}: {e}')
                    errores += 1
    
    print(f'  ✅ {actualizados} actualizados')
    return {'actualizados': actualizados, 'errores': errores, 'saltados': 0, 'razon': 'ok'}


# ========== MAIN ==========
def main():
    print('=' * 60)
    print('📺 Santuario Anime - Sync Episodios TMDB')
    print(f'📅 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print(f'🎯 Límite: {LIMITE_ANIMES} animes')
    print(f'🔄 Modo completo: {"SÍ" if MODO_COMPLETO else "NO"}')
    print(f'⏱️ Reintento: {DIAS_REINTENTO} días')
    print('=' * 60)
    print('')
    
    cache = cargar_cache()
    print(f'📦 Cache: {len(cache.get("no_encontrados", {}))} animes no encontrados')
    print('')
    
    print('📊 Consultando TODOS los animes...')
    
    result = supabase.table('animes').select(
        'id, titulo, fecha_estreno, temporadas(id, episodios(id, numero, titulo_episodio, fecha_emision, descripcion))'
    ).execute()
    
    animes = result.data or []
    print(f'📚 Total animes en BD: {len(animes)}')
    
    animes_pendientes = []
    animes_en_cache = 0
    animes_completos = 0
    
    for anime in animes:
        titulo = anime.get('titulo', '')
        
        if not debe_reintentar(titulo, cache):
            animes_en_cache += 1
            continue
        
        if not anime_necesita_actualizacion(anime):
            animes_completos += 1
            continue
        
        animes_pendientes.append(anime)
    
    print(f'⏭️ En cache (saltados): {animes_en_cache}')
    print(f'✅ Completos: {animes_completos}')
    print(f'📋 Pendientes: {len(animes_pendientes)}')
    print('')
    
    if not animes_pendientes:
        print('✅ No hay animes pendientes para procesar')
        cache['ultima_actualizacion'] = datetime.now().isoformat()
        guardar_cache(cache)
        return
    
    animes_a_procesar = animes_pendientes[:LIMITE_ANIMES]
    
    total_actualizados = 0
    total_errores = 0
    total_saltados = 0
    
    print(f'🎯 Procesando {len(animes_a_procesar)} animes...')
    print('')
    
    for i, anime in enumerate(animes_a_procesar, 1):
        print(f'[{i}/{len(animes_a_procesar)}]')
        
        resultado = procesar_anime(anime, cache)
        total_actualizados += resultado['actualizados']
        total_errores += resultado['errores']
        total_saltados += resultado['saltados']
        
        print('')
        
        if i % 5 == 0:
            cache['ultima_actualizacion'] = datetime.now().isoformat()
            guardar_cache(cache)
        
        if i < len(animes_a_procesar):
            time.sleep(1)
    
    cache['ultima_actualizacion'] = datetime.now().isoformat()
    guardar_cache(cache)
    
    print('=' * 60)
    print('📊 RESUMEN')
    print('=' * 60)
    print(f'✅ Episodios actualizados: {total_actualizados}')
    print(f'❌ Errores: {total_errores}')
    print(f'⏭️ Saltados: {total_saltados}')
    print(f'📦 Cache total: {len(cache.get("no_encontrados", {}))} animes')
    print('=' * 60)


if __name__ == '__main__':
    main()
