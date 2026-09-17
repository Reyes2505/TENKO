#!/usr/bin/env python3
"""
Bot Airing Sync - Solo procesa animes que emiten HOY.
Usa la tabla calendario_emision de Supabase.
"""

import os
import re
import json
import time
import random
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
import requests
from bs4 import BeautifulSoup
from supabase import create_client

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)


class AiringBot:
    def __init__(self):
        self.supabase = create_client(
            'https://uftfbidzobftjbonziql.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'
        )
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        })
        
        self.base_url = "https://jkanime.net"
        self.stats = {'procesados': 0, 'nuevos': 0, 'sin_cambios': 0, 'errores': 0}

    def obtener_animes_hoy(self) -> List[Dict]:
        """Obtiene animes que emiten HOY desde el calendario."""
        hoy = datetime.now().weekday()
        
        logger.info(f"📅 Consultando calendario para {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][hoy]}")
        
        response = self.supabase.table('calendario_emision').select(
            'anilist_id, titulo, dia_semana, hora_emision, proximo_episodio, anime_id, en_bd, portada_url'
        ).eq('dia_semana', hoy).eq('activo', True).execute()
        
        return response.data or []

    def buscar_slug_jk(self, titulo: str) -> Optional[str]:
        """Busca el slug en JK Anime."""
        try:
            response = self.session.get(
                f"{self.base_url}/directorio",
                params={'q': titulo},
                timeout=15
            )
            
            if response.status_code != 200:
                return None
            
            match = re.search(r'var animes = (\{.*?\});', response.text, re.DOTALL)
            if not match:
                return None
            
            data = json.loads(match.group(1))
            titulo_lower = titulo.lower().strip()
            
            # Coincidencia exacta
            for anime in data.get('data', []):
                if anime.get('title', '').lower().strip() == titulo_lower:
                    return anime.get('slug', '')
            
            # Coincidencia parcial
            for anime in data.get('data', []):
                jk_titulo = anime.get('title', '').lower().strip()
                if titulo_lower in jk_titulo or jk_titulo in titulo_lower:
                    return anime.get('slug', '')
            
            return None
        except Exception as e:
            logger.error(f"Error buscando slug: {e}")
            return None

    def obtener_episodios_jk(self, slug: str) -> List[int]:
        """Obtiene episodios de JK Anime."""
        try:
            response = self.session.get(f"{self.base_url}/{slug}/", timeout=15)
            if response.status_code != 200:
                return []
            
            soup = BeautifulSoup(response.content, 'html.parser')
            meta = soup.find('meta', {'name': 'csrf-token'})
            csrf = meta.get('content', '') if meta else ''
            
            match = re.search(r'ajax/episodes/(\d+)/', response.text)
            if not match:
                return []
            
            jk_id = int(match.group(1))
            episodios = []
            pagina = 1
            
            while pagina <= 25:
                r = self.session.post(
                    f"{self.base_url}/ajax/episodes/{jk_id}/{pagina}",
                    data={'_token': csrf},
                    timeout=15
                )
                
                if r.status_code != 200:
                    break
                
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
                time.sleep(0.3)
            
            return sorted(set(episodios))
        except Exception as e:
            logger.error(f"Error obteniendo episodios: {e}")
            return []

    def sincronizar_anime(self, anime: Dict) -> Dict[str, int]:
        """Sincroniza un anime del calendario."""
        titulo = anime.get('titulo', '')
        anime_id = anime.get('anime_id')
        en_bd = anime.get('en_bd', False)
        
        logger.info(f"🎬 {titulo}")
        
        # Buscar slug en JK Anime
        slug = self.buscar_slug_jk(titulo)
        if not slug:
            logger.info(f"  ⏭️ No encontrado en JK Anime")
            return {'nuevos': 0, 'sin_cambios': 1}
        
        # Obtener episodios
        episodios_web = self.obtener_episodios_jk(slug)
        if not episodios_web:
            logger.info(f"  ⏭️ Sin episodios")
            return {'nuevos': 0, 'sin_cambios': 1}
        
        # Si no está en BD, insertarlo
        if not en_bd or not anime_id:
            logger.info(f"  ➕ Anime no está en BD, insertando...")
            
            result = self.supabase.table('animes').insert({
                'titulo': titulo,
                'estado_emision': 'emitido',
                'portada_url': anime.get('portada_url', ''),
            }).execute()
            
            if result.data:
                anime_id = result.data[0]['id']
                
                # Actualizar calendario
                self.supabase.table('calendario_emision').update({
                    'anime_id': anime_id,
                    'en_bd': True,
                }).eq('anilist_id', anime['anilist_id']).execute()
                
                logger.info(f"  ✅ Anime insertado: {anime_id}")
            else:
                return {'nuevos': 0, 'sin_cambios': 1}
        
        # Obtener/crear temporada
        temps = self.supabase.table('temporadas').select('id').eq('anime_id', anime_id).limit(1).execute()
        
        if not temps.data:
            temp_res = self.supabase.table('temporadas').insert({
                'anime_id': anime_id,
                'nombre': 'Temporada 1',
                'orden': 1,
            }).execute()
            
            if not temp_res.data:
                return {'nuevos': 0, 'sin_cambios': 1}
            
            temporada_id = temp_res.data[0]['id']
        else:
            temporada_id = temps.data[0]['id']
        
        # Episodios en BD
        eps_res = self.supabase.table('episodios').select('numero').eq('temporada_id', temporada_id).execute()
        eps_bd = {ep['numero'] for ep in (eps_res.data or [])}
        
        # Detectar nuevos
        nuevos = [ep for ep in episodios_web if ep not in eps_bd]
        
        if not nuevos:
            logger.info(f"  ⏭️ Sin cambios")
            return {'nuevos': 0, 'sin_cambios': 1}
        
        # Insertar
        insertados = 0
        for ep_num in nuevos:
            try:
                self.supabase.table('episodios').insert({
                    'temporada_id': temporada_id,
                    'numero': ep_num,
                    'titulo': f'Episodio {ep_num}',
                    'url_stream': f"{self.base_url}/{slug}/{ep_num}/",
                    'visto': False,
                }).execute()
                insertados += 1
            except Exception as e:
                logger.error(f"  ⚠️ Error insertando EP {ep_num}: {e}")
        
        logger.info(f"  ✅ +{insertados} episodios nuevos")
        return {'nuevos': insertados, 'sin_cambios': 0}

    def run(self):
        logger.info("=" * 60)
        logger.info("🤖 Bot Airing Sync - Animes de HOY")
        logger.info(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 60)
        
        animes = self.obtener_animes_hoy()
        logger.info(f"📺 Animes que emiten HOY: {len(animes)}")
        logger.info("")
        
        if not animes:
            logger.info("⚠️ No hay animes en emisión hoy")
            return
        
        for i, anime in enumerate(animes, 1):
            logger.info(f"[{i}/{len(animes)}]")
            
            resultado = self.sincronizar_anime(anime)
            
            self.stats['procesados'] += 1
            self.stats['nuevos'] += resultado['nuevos']
            self.stats['sin_cambios'] += resultado['sin_cambios']
            
            logger.info("")
            time.sleep(random.uniform(0.5, 1.0))
        
        logger.info("=" * 60)
        logger.info("📊 ESTADÍSTICAS FINALES")
        logger.info("=" * 60)
        logger.info(f"  📺 Procesados: {self.stats['procesados']}")
        logger.info(f"  📥 Nuevos: {self.stats['nuevos']}")
        logger.info(f"  ⏭️ Sin cambios: {self.stats['sin_cambios']}")
        logger.info("=" * 60)


if __name__ == "__main__":
    bot = AiringBot()
    bot.run()
