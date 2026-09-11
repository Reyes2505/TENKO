#!/usr/bin/env python3
"""
Bot Ectosimbionte v10 - Smart Discovery & Targeted Repair Engine
- Auditoría inteligente: Solo repara animes en emisión o aquellos seleccionados por muestreo de integridad.
- Descubrimiento aleatorio/exploratorio: Escanea páginas del directorio de forma estocástica para sincronizar todo el catálogo.
- Inserciones y actualizaciones optimizadas por lotes (Batch Chunks).
- Manejo robusto de reintentos con Exponential Backoff y Jitter.
"""

import os
import sys
import re
import time
import json
import random
import logging
from typing import List, Dict, Optional, Any, Set
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] [%(filename)s:%(lineno)d] - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

class EctosimbionteBot:
    def __init__(self) -> None:
        self.config: Dict[str, str] = self._load_config()
        
        # CORREGIDO: Usar SERVICE_ROLE_KEY para escritura
        supabase_key = (
            self.config.get('SUPABASE_SERVICE_ROLE_KEY', '') or
            self.config.get('SUPABASE_ANON_KEY', '') or
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'
        )
        
        self.supabase: Client = create_client(
            self.config.get('SUPABASE_URL', 'https://uftfbidzobftjbonziql.supabase.co'),
            supabase_key
        )
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        })
        
        self.base_url: str = "https://jkanime.net"
        self.max_retries: int = 3
        self.base_delay: float = 0.5
        self.cache_file: str = '.bot_cache.json'
        
        self.stats: Dict[str, Any] = {
            'animes_nuevos': 0,
            'episodios_nuevos': 0,
            'urls_actualizadas': 0,
            'animes_omitidos': 0,
            'errores': 0,
            'tiempo_inicio': datetime.now()
        }

    def _load_config(self) -> Dict[str, str]:
        config = {
            'SUPABASE_URL': os.environ.get('SUPABASE_URL', 'https://uftfbidzobftjbonziql.supabase.co'),
            'SUPABASE_SERVICE_ROLE_KEY': os.environ.get('SUPABASE_SERVICE_ROLE_KEY', ''),
            'SUPABASE_ANON_KEY': os.environ.get('SUPABASE_ANON_KEY', ''),
        }
        
        # Si no hay key en env, usar la hardcodeada
        if not config['SUPABASE_SERVICE_ROLE_KEY']:
            config['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'
        
        if os.path.exists('.env.local'):
            try:
                with open('.env.local', 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if '=' in line and not line.startswith('#'):
                            k, v = line.split('=', 1)
                            config[k.strip()] = v.strip()
            except Exception as e:
                logger.warning(f"No se pudo cargar .env.local: {e}")
        return config

    def _load_cache(self) -> Dict[str, Any]:
        default = {'animes_procesados': {}, 'popularidad': {}, 'ultima_ejecucion': None}
        if os.path.exists(self.cache_file):
            try:
                with open(self.cache_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for k, v in default.items():
                        if k not in data:
                            data[k] = v
                    return data
            except Exception as e:
                logger.error(f"Error cargando caché: {e}")
        return default

    def _save_cache(self, cache: Dict[str, Any]) -> None:
        try:
            with open(self.cache_file, 'w', encoding='utf-8') as f:
                json.dump(cache, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error guardando caché: {e}")

    def _request_with_retry(self, method: str, url: str, **kwargs: Any) -> Optional[requests.Response]:
        for attempt in range(self.max_retries):
            try:
                response = self.session.request(method, url, timeout=15, **kwargs)
                if response.status_code == 200:
                    return response
                elif response.status_code == 429:
                    wait = (attempt + 1) * 5 + random.uniform(1, 3)
                    logger.warning(f"Rate limited (429) en {url}. Esperando {wait:.1f}s")
                    time.sleep(wait)
                elif response.status_code == 404:
                    return None
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                logger.warning(f"Error de red en {url}: {e}")
            except Exception as e:
                logger.error(f"Error inesperado en request: {e}")
            
            if attempt < self.max_retries - 1:
                sleep_time = (2 ** attempt) + random.uniform(0.2, 0.8)
                time.sleep(sleep_time)
        return None

    def obtener_animes_directorio(self, paginas: List[int]) -> List[Dict[str, Any]]:
        """Obtiene animes de páginas específicas del directorio (soporta exploración estocástica)."""
        animes_dict = {}
        for pagina in paginas:
            response = self._request_with_retry('GET', f"{self.base_url}/directorio?p={pagina}")
            if response:
                match = re.search(r'var animes = (\{.*?\});', response.text, re.DOTALL)
                if match:
                    try:
                        data = json.loads(match.group(1))
                        for anime in data.get('data', []):
                            jk_id = anime.get('id', 0)
                            if jk_id:
                                animes_dict[jk_id] = {
                                    'id_jk': jk_id,
                                    'titulo': anime.get('title', ''),
                                    'sinopsis': anime.get('synopsis', ''),
                                    'portada_url': anime.get('image', '').replace('\\/', '/'),
                                    'slug': anime.get('slug', ''),
                                    'estado': anime.get('status', ''),
                                }
                    except json.JSONDecodeError as e:
                        logger.error(f"Error decodificando JSON de directorio en página {pagina}: {e}")
            time.sleep(random.uniform(0.3, 0.7))
        return list(animes_dict.values())

    def obtener_animes_existentes(self) -> Dict[str, Dict[str, Any]]:
        """Mapeo robusto de animes existentes en Supabase con conteo y conjunto de episodios."""
        try:
            response = self.supabase.table('animes').select(
                'id, titulo, temporadas(id, episodios(numero, url_stream))'
            ).execute()
            
            resultado = {}
            data = response.data
            if not data or not isinstance(data, list):
                return resultado
                
            for item in data:
                titulo = item.get('titulo')
                anime_id = item.get('id')
                if not titulo or not anime_id:
                    continue
                
                eps_count = 0
                episodios_existentes = set()
                temporadas = item.get('temporadas', [])
                if isinstance(temporadas, list):
                    for temp in temporadas:
                        for ep in temp.get('episodios', []):
                            eps_count += 1
                            if 'numero' in ep:
                                episodios_existentes.add(ep['numero'])
                
                resultado[titulo] = {
                    'id': anime_id,
                    'total_episodios': eps_count,
                    'episodios_set': episodios_existentes
                }
            return resultado
        except Exception as e:
            logger.error(f"Error consultando animes existentes en Supabase: {e}")
            return {}

    def _get_episodios(self, jk_id: int, csrf: str) -> List[int]:
        episodios = []
        pagina = 1
        while pagina <= 25:
            r = self._request_with_retry(
                'POST',
                f"{self.base_url}/ajax/episodes/{jk_id}/{pagina}",
                data={'_token': csrf}
            )
            if not r:
                break
            try:
                data = r.json()
                items = data.get('data', [])
                if not items:
                    break
                for ep in items:
                    num = ep.get('number', 0)
                    if num > 0:
                        episodios.append(num)
                
                total = data.get('total', 0)
                if pagina * 16 >= total:
                    break
                pagina += 1
            except Exception:
                break
            time.sleep(self.base_delay)
        return sorted(set(episodios))

    def sincronizar_anime(self, anime_info: Dict[str, Any], existentes_map: Dict[str, Any], cache: Dict[str, Any]) -> None:
        titulo = anime_info.get('titulo', '')
        slug = anime_info.get('slug', '')
        if not titulo or not slug:
            return

        try:
            response = self._request_with_retry('GET', f"{self.base_url}/{slug}/")
            if not response:
                return
            
            soup = BeautifulSoup(response.content, 'html.parser')
            meta = soup.find('meta', {'name': 'csrf-token'})
            csrf = meta.get('content', '') if meta else ''
            
            match = re.search(r'ajax/episodes/(\d+)/', response.text)
            if not match:
                return
            jk_id = int(match.group(1))
            
            episodios_web = self._get_episodios(jk_id, csrf)
            if not episodios_web:
                return

            info_bd = existentes_map.get(titulo)
            anime_id = None
            temporada_id = None

            if info_bd:
                anime_id = info_bd['id']
                eps_en_bd = info_bd['episodios_set']
                # Smart Check: Detectar si faltan capítulos en BD respecto a la web
                episodios_faltantes = [ep for ep in episodios_web if ep not in eps_en_bd]
                
                # Si está completo y el anime ya finalizó, omitir procesamiento innecesario
                if not episodios_faltantes and anime_info.get('estado') == 'finished':
                    self.stats['animes_omitidos'] += 1
                    return
            
            # Insertar anime si no existe
            if not anime_id:
                res = self.supabase.table('animes').insert({
                    'titulo': titulo,
                    'sinopsis': anime_info.get('sinopsis', ''),
                    'portada_url': anime_info.get('portada_url', ''),
                    'banner_url': anime_info.get('portada_url', ''),
                    'estado_emision': 'emitido' if anime_info.get('estado') == 'currently' else 'terminado'
                }).execute()
                if res.data:
                    anime_id = res.data[0]['id']
                    self.stats['animes_nuevos'] += 1
                    logger.info(f"✨ Nuevo anime registrado: {titulo} ({len(episodios_web)} eps)")
                else:
                    return
            
            # Obtener o crear Temporada 1
            temps = self.supabase.table('temporadas').select('id').eq('anime_id', anime_id).limit(1).execute()
            if temps.data:
                temporada_id = temps.data[0]['id']
            else:
                temp_res = self.supabase.table('temporadas').insert({
                    'anime_id': anime_id,
                    'nombre': 'Temporada 1',
                    'orden': 1,
                    'anio_lanzamiento': datetime.now().year
                }).execute()
                if temp_res.data:
                    temporada_id = temp_res.data[0]['id']
                else:
                    return

            # Mapear episodios actuales en base de datos
            eps_res = self.supabase.table('episodios').select('id, numero, url_stream').eq('temporada_id', temporada_id).execute()
            db_eps_map = {ep['numero']: {'id': ep['id'], 'url_stream': ep.get('url_stream', '')} for ep in (eps_res.data or [])}

            nuevos_batch = []
            for ep_num in episodios_web:
                url_pagina = f"{self.base_url}/{slug}/{ep_num}/"
                if ep_num in db_eps_map:
                    # Self-healing de URL si está vacía u obsoleta
                    if not db_eps_map[ep_num]['url_stream'] or db_eps_map[ep_num]['url_stream'] != url_pagina:
                        self.supabase.table('episodios').update({'url_stream': url_pagina}).eq('id', db_eps_map[ep_num]['id']).execute()
                        self.stats['urls_actualizadas'] += 1
                else:
                    nuevos_batch.append({
                        'temporada_id': temporada_id,
                        'numero': ep_num,
                        'titulo': f'Episodio {ep_num}',
                        'url_stream': url_pagina,
                        'visto': False
                    })
                    self.stats['episodios_nuevos'] += 1

            # Inserción optimizada por lotes (Batch Chunks de 50)
            if nuevos_batch:
                chunk_size = 50
                for i in range(0, len(nuevos_batch), chunk_size):
                    chunk = nuevos_batch[i:i + chunk_size]
                    self.supabase.table('episodios').insert(chunk).execute()
                logger.info(f"📥 Insertados {len(nuevos_batch)} nuevos episodios para: {titulo}")

        except Exception as e:
            self.stats['errores'] += 1
            logger.error(f"Error sincronizando anime '{titulo}': {e}")

    def run(self) -> None:
        logger.info("==================================================")
        logger.info("🤖 Bot Ectosimbionte v10 - Smart Sync Engine Iniciado")
        logger.info(f"📅 Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("==================================================")

        cache = self._load_cache()
        existentes = self.obtener_animes_existentes()
        logger.info(f"📊 Registros actuales en Supabase: {len(existentes)} animes")

        # 1. DESCUBRIMIENTO ESTOCÁSTICO (Resuelve el desfase de inventario)
        paginas_fijas = [1, 2, 3]
        paginas_aleatorias = random.sample(range(4, 18), 3)
        paginas_a_escanear = paginas_fijas + paginas_aleatorias
        
        logger.info(f"🔍 Escaneando páginas del directorio (Fijas + Estocásticas: {paginas_a_escanear})...")
        directorio_animes = self.obtener_animes_directorio(paginas_a_escanear)
        logger.info(f"🌐 Total de títulos recolectados del directorio en este ciclo: {len(directorio_animes)}")

        # 2. SEPARACIÓN INTELIGENTE: Nuevos vs Registrados
        animes_nuevos = [a for a in directorio_animes if a['titulo'] not in existentes]
        animes_en_bd = [a for a in directorio_animes if a['titulo'] in existentes]

        logger.info(f"✨ Encontrados {len(animes_nuevos)} títulos completamente nuevos para incorporar.")

        # Sincronizar descubrimientos nuevos primero
        for anime in animes_nuevos:
            self.sincronizar_anime(anime, existentes, cache)
            time.sleep(random.uniform(0.4, 0.8))

        # 3. SMART REPAIR (Auditoría selectiva)
        # Priorizar estrictamente animes en emisión y auditar aleatoriamente un subconjunto de finalizados
        en_emision = [a for a in animes_en_bd if a.get('estado') == 'currently']
        finalizados = [a for a in animes_en_bd if a.get('estado') != 'currently']
        
        auditoria_finalizados = random.sample(finalizados, min(len(finalizados), 15)) if finalizados else []
        lote_revision = en_emision + auditoria_finalizados
        
        logger.info(f"🎯 Ejecutando Smart Repair en {len(lote_revision)} animes (En emisión: {len(en_emision)} + Auditoría aleatoria: {len(auditoria_finalizados)})...")

        for anime in lote_revision:
            self.sincronizar_anime(anime, existentes, cache)
            time.sleep(random.uniform(0.3, 0.6))

        cache['ultima_ejecucion'] = datetime.now().isoformat()
        self._save_cache(cache)

        duracion = (datetime.now() - self.stats['tiempo_inicio']).total_seconds()
        logger.info("==================================================")
        logger.info("📊 ESTADÍSTICAS FINALES - ECTOSIMBIONTE V10")
        logger.info("==================================================")
        logger.info(f"  ✨ Animes nuevos descubiertos: {self.stats['animes_nuevos']}")
        logger.info(f"  📥 Episodios nuevos insertados: {self.stats['episodios_nuevos']}")
        logger.info(f"  🔧 URLs reparadas/actualizadas: {self.stats['urls_actualizadas']}")
        logger.info(f"  ⏭️ Animes omitidos (sin cambios): {self.stats['animes_omitidos']}")
        logger.info(f"  ❌ Errores registrados: {self.stats['errores']}")
        logger.info(f"  ⏱️ Tiempo total de ejecución: {duracion:.1f}s")
        logger.info("==================================================")

if __name__ == "__main__":
    bot = EctosimbionteBot()
    bot.run()
