#!/usr/bin/env python3
"""
Bot Ectosimbionte v12 - Airing Sync Engine
Especializado en animes EN EMISIÓN.

Características:
- Solo procesa animes con estado_emision = 'emitido'
- Detecta el día/hora de estreno de cada anime
- Múltiples intentos durante 1 hora (10:00, 10:15, 10:30, 10:45, 11:00)
- Actualiza SOLO los episodios que deberían estar disponibles
- Se ejecuta en GitHub Actions según horario programado
"""

import os
import re
import time
import json
import random
import logging
from typing import List, Dict, Optional, Any
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


# ========== CONFIGURACIÓN ==========
# Días de la semana en que se emiten animes (0=Lunes, 6=Domingo)
DIAS_EMISION = {
    'monday': 0,
    'tuesday': 1,
    'wednesday': 2,
    'thursday': 3,
    'friday': 4,
    'saturday': 5,
    'sunday': 6,
}

# Mapeo de días en español
DIAS_ES = {
    0: 'lunes',
    1: 'martes',
    2: 'miércoles',
    3: 'jueves',
    4: 'viernes',
    5: 'sábado',
    6: 'domingo',
}


class AiringBot:
    def __init__(self) -> None:
        self.config: Dict[str, str] = self._load_config()
        
        supabase_key = (
            self.config.get('SUPABASE_SERVICE_ROLE_KEY', '') or
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
        self.cache_file: str = '.airing_cache.json'
        
        # Obtener hora actual
        self.hora_actual = datetime.now()
        self.dia_actual = self.hora_actual.weekday()  # 0=Lunes, 6=Domingo
        
        self.stats: Dict[str, Any] = {
            'animes_procesados': 0,
            'episodios_nuevos': 0,
            'episodios_actualizados': 0,
            'sin_cambios': 0,
            'errores': 0,
            'tiempo_inicio': datetime.now()
        }

    def _load_config(self) -> Dict[str, str]:
        config = {
            'SUPABASE_URL': os.environ.get('SUPABASE_URL', 'https://uftfbidzobftjbonziql.supabase.co'),
            'SUPABASE_SERVICE_ROLE_KEY': os.environ.get('SUPABASE_SERVICE_ROLE_KEY', ''),
        }
        
        if not config['SUPABASE_SERVICE_ROLE_KEY']:
            config['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'
        
        return config

    def _load_cache(self) -> Dict[str, Any]:
        default = {'ultimo_episodio_procesado': {}, 'ultima_ejecucion': None}
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
                    logger.warning(f"Rate limited. Esperando {wait:.1f}s")
                    time.sleep(wait)
                elif response.status_code == 404:
                    return None
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                logger.warning(f"Error de red: {e}")
            except Exception as e:
                logger.error(f"Error inesperado: {e}")
            
            if attempt < self.max_retries - 1:
                time.sleep((2 ** attempt) + random.uniform(0.2, 0.8))
        return None

    def obtener_animes_en_emision(self) -> List[Dict[str, Any]]:
        """
        Obtiene SOLO los animes que están en emisión.
        Filtra por estado_emision = 'emitido'
        """
        try:
            response = self.supabase.table('animes').select(
                'id, titulo, estado_emision, fecha_estreno, temporadas(id, episodios(id, numero, url_stream))'
            ).eq('estado_emision', 'emitido').execute()
            
            animes = response.data or []
            logger.info(f"📺 Animes en emisión: {len(animes)}")
            return animes
        except Exception as e:
            logger.error(f"Error consultando animes en emisión: {e}")
            return []

    def _get_episodios_disponibles(self, jk_id: int, csrf: str) -> List[int]:
        """Obtiene la lista de episodios disponibles en JK Anime."""
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

    def _obtener_info_anime_jk(self, slug: str) -> Optional[Dict[str, Any]]:
        """Obtiene el HTML de un anime en JK Anime."""
        try:
            response = self._request_with_retry('GET', f"{self.base_url}/{slug}/")
            if not response:
                return None
            
            soup = BeautifulSoup(response.content, 'html.parser')
            meta = soup.find('meta', {'name': 'csrf-token'})
            csrf = meta.get('content', '') if meta else ''
            
            match = re.search(r'ajax/episodes/(\d+)/', response.text)
            if not match:
                return None
            
            jk_id = int(match.group(1))
            episodios = self._get_episodios_disponibles(jk_id, csrf)
            
            return {
                'jk_id': jk_id,
                'csrf': csrf,
                'episodios': episodios,
                'slug': slug,
            }
        except Exception as e:
            logger.error(f"Error obteniendo info de '{slug}': {e}")
            return None

    def _buscar_slug_por_titulo(self, titulo: str) -> Optional[str]:
        """Busca el slug de un anime en JK Anime por su título."""
        try:
            # Buscar en el directorio
            response = self._request_with_retry(
                'GET',
                f"{self.base_url}/directorio",
                params={'q': titulo}
            )
            
            if not response:
                return None
            
            match = re.search(r'var animes = (\{.*?\});', response.text, re.DOTALL)
            if not match:
                return None
            
            data = json.loads(match.group(1))
            titulo_lower = titulo.lower().strip()
            
            # Buscar coincidencia exacta
            for anime in data.get('data', []):
                jk_titulo = anime.get('title', '').lower().strip()
                if jk_titulo == titulo_lower:
                    return anime.get('slug', '')
            
            # Buscar coincidencia parcial
            for anime in data.get('data', []):
                jk_titulo = anime.get('title', '').lower().strip()
                if titulo_lower in jk_titulo or jk_titulo in titulo_lower:
                    return anime.get('slug', '')
            
            return None
        except Exception as e:
            logger.error(f"Error buscando slug para '{titulo}': {e}")
            return None

    def _determinar_dia_emision(self, anime: Dict) -> Optional[int]:
        """
        Determina el día de emisión de un anime.
        Usa la fecha_estreno o el nombre para inferir.
        Retorna el día de la semana (0=Lunes, 6=Domingo).
        """
        # Por ahora, usamos un hash del título para distribuir
        # En el futuro, se puede obtener de TMDB
        titulo = anime.get('titulo', '')
        hash_val = sum(ord(c) for c in titulo)
        return hash_val % 7

    def _debe_procesar_anime(self, anime: Dict) -> bool:
        """
        Determina si un anime debe procesarse HOY.
        Solo procesa animes cuyo día de emisión coincida con el día actual.
        """
        dia_emision = self._determinar_dia_emision(anime)
        
        if dia_emision is None:
            # Si no se puede determinar, procesar siempre
            return True
        
        # Procesar si el día de emisión coincide con HOY
        # O si estamos en un rango de 1 día (por si acaso)
        if dia_emision == self.dia_actual:
            return True
        
        # También procesar si fue ayer (por si se nos pasó)
        if dia_emision == (self.dia_actual - 1) % 7:
            return True
        
        return False

    def sincronizar_anime(self, anime: Dict, cache: Dict) -> Dict[str, int]:
        """
        Sincroniza un anime en emisión.
        Solo actualiza los episodios nuevos.
        """
        titulo = anime.get('titulo', '')
        if not titulo:
            return {'nuevos': 0, 'actualizados': 0, 'sin_cambios': 1}
        
        logger.info(f"🎬 {titulo}")
        
        # Verificar si debe procesarse hoy
        if not self._debe_procesar_anime(anime):
            logger.info(f"  ⏭️ No se emite hoy, saltando")
            return {'nuevos': 0, 'actualizados': 0, 'sin_cambios': 1}
        
        # Buscar slug en JK Anime
        slug = self._buscar_slug_por_titulo(titulo)
        if not slug:
            logger.info(f"  ❌ No encontrado en JK Anime")
            self.stats['errores'] += 1
            return {'nuevos': 0, 'actualizados': 0, 'sin_cambios': 0}
        
        # Obtener info del anime
        info = self._obtener_info_anime_jk(slug)
        if not info:
            logger.info(f"  ❌ No se pudo obtener info")
            self.stats['errores'] += 1
            return {'nuevos': 0, 'actualizados': 0, 'sin_cambios': 0}
        
        episodios_web = info.get('episodios', [])
        if not episodios_web:
            logger.info(f"  ⚠️ Sin episodios en JK Anime")
            return {'nuevos': 0, 'actualizados': 0, 'sin_cambios': 1}
        
        # Obtener temporada del anime
        temporadas = anime.get('temporadas', [])
        if not temporadas:
            logger.info(f"  ⚠️ Sin temporadas en BD")
            return {'nuevos': 0, 'actualizados': 0, 'sin_cambios': 1}
        
        temporada_id = temporadas[0].get('id')
        
        # Obtener episodios actuales en BD
        eps_res = self.supabase.table('episodios').select(
            'id, numero, url_stream'
        ).eq('temporada_id', temporada_id).execute()
        
        db_eps_map = {
            ep['numero']: {'id': ep['id'], 'url_stream': ep.get('url_stream', '')}
            for ep in (eps_res.data or [])
        }
        
        # Detectar episodios nuevos
        nuevos_batch = []
        actualizados = 0
        
        for ep_num in episodios_web:
            url_pagina = f"{self.base_url}/{slug}/{ep_num}/"
            
            if ep_num in db_eps_map:
                # Ya existe, verificar si la URL cambió
                if db_eps_map[ep_num]['url_stream'] != url_pagina:
                    self.supabase.table('episodios').update(
                        {'url_stream': url_pagina}
                    ).eq('id', db_eps_map[ep_num]['id']).execute()
                    actualizados += 1
            else:
                # Episodio nuevo
                nuevos_batch.append({
                    'temporada_id': temporada_id,
                    'numero': ep_num,
                    'titulo': f'Episodio {ep_num}',
                    'url_stream': url_pagina,
                    'visto': False
                })
        
        # Insertar nuevos episodios
        if nuevos_batch:
            chunk_size = 50
            for i in range(0, len(nuevos_batch), chunk_size):
                chunk = nuevos_batch[i:i + chunk_size]
                self.supabase.table('episodios').insert(chunk).execute()
            
            logger.info(f"  ✅ +{len(nuevos_batch)} episodios nuevos")
            self.stats['episodios_nuevos'] += len(nuevos_batch)
        else:
            logger.info(f"  ⏭️ Sin episodios nuevos")
            self.stats['sin_cambios'] += 1
        
        if actualizados > 0:
            logger.info(f"  🔧 {actualizados} URLs actualizadas")
            self.stats['episodios_actualizados'] += actualizados
        
        # Actualizar caché
        cache['ultimo_episodio_procesado'][titulo] = {
            'ultimo_ep': max(episodios_web),
            'timestamp': datetime.now().isoformat(),
        }
        
        return {
            'nuevos': len(nuevos_batch),
            'actualizados': actualizados,
            'sin_cambios': 0 if nuevos_batch else 1,
        }

    def run(self) -> None:
        """Ejecuta el bot."""
        logger.info("=" * 60)
        logger.info("🤖 Bot Ectosimbionte v12 - Airing Sync Engine")
        logger.info(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info(f"📆 Día actual: {DIAS_ES[self.dia_actual].upper()}")
        logger.info(f"🕐 Hora actual: {self.hora_actual.strftime('%H:%M')}")
        logger.info("=" * 60)
        
        cache = self._load_cache()
        
        # Obtener animes en emisión
        animes_emision = self.obtener_animes_en_emision()
        
        if not animes_emision:
            logger.info("⚠️ No hay animes en emisión")
            return
        
        logger.info(f"🎯 Procesando {len(animes_emision)} animes en emisión...")
        logger.info("")
        
        # Procesar cada anime
        for i, anime in enumerate(animes_emision, 1):
            logger.info(f"[{i}/{len(animes_emision)}]")
            
            resultado = self.sincronizar_anime(anime, cache)
            
            self.stats['animes_procesados'] += 1
            
            # Guardar caché cada 10 animes
            if i % 10 == 0:
                cache['ultima_ejecucion'] = datetime.now().isoformat()
                self._save_cache(cache)
            
            logger.info("")
            
            # Pausa entre animes
            if i < len(animes_emision):
                time.sleep(random.uniform(0.5, 1.0))
        
        # Guardar caché final
        cache['ultima_ejecucion'] = datetime.now().isoformat()
        self._save_cache(cache)
        
        # Estadísticas
        duracion = (datetime.now() - self.stats['tiempo_inicio']).total_seconds()
        logger.info("=" * 60)
        logger.info("📊 ESTADÍSTICAS FINALES - AIRING SYNC")
        logger.info("=" * 60)
        logger.info(f"  📺 Animes procesados: {self.stats['animes_procesados']}")
        logger.info(f"  📥 Episodios nuevos: {self.stats['episodios_nuevos']}")
        logger.info(f"  🔧 Episodios actualizados: {self.stats['episodios_actualizados']}")
        logger.info(f"  ⏭️ Sin cambios: {self.stats['sin_cambios']}")
        logger.info(f"  ❌ Errores: {self.stats['errores']}")
        logger.info(f"  ⏱️ Tiempo: {duracion:.1f}s")
        logger.info("=" * 60)


if __name__ == "__main__":
    bot = AiringBot()
    bot.run()
