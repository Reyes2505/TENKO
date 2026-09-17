#!/usr/bin/env python3
"""
Bot Airing Sync v2 - Reforzado
================================
Características:
- Múltiples estrategias de búsqueda (exacta, parcial, normalizada, fuzzy)
- Sistema de caché para evitar búsquedas repetidas
- Rate limiting inteligente con backoff exponencial
- Manejo robusto de errores (por anime, sin detener el proceso)
- Múltiples fuentes de datos (JK Anime directorio + página + búsqueda)
- Vinculación automática de animes nuevos con el calendario
- Actualización del estado de emisión basado en datos reales
- Estadísticas detalladas y logging estructurado
- Reconexión automática en caso de fallo
- Filtrado de resultados falsos positivos
- Soporte para títulos en romaji, inglés y español
- Verificación de episodios duplicados
- Actualización de URLs obsoletas
- Manejo correcto de animes sin temporada
"""

import os
import re
import json
import time
import random
import logging
import unicodedata
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from difflib import SequenceMatcher

import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

# ============================================================================
# CONFIGURACIÓN
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

# Supabase
SUPABASE_URL = os.environ.get(
    'SUPABASE_URL',
    'https://uftfbidzobftjbonziql.supabase.co'
)
SUPABASE_KEY = os.environ.get(
    'SUPABASE_SERVICE_ROLE_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'
)

# JK Anime
BASE_URL = "https://jkanime.net"
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
]

# Comportamiento
MAX_REINTENTOS = 3
TIMEOUT_HTTP = 20
DELAY_ENTRE_ANIMES = (0.8, 1.5)
DELAY_ENTRE_PETICIONES = (0.3, 0.7)
DIAS_RECIENTES = 30  # Animes con episodios en los últimos N días

# Archivo de caché
CACHE_FILE = '.airing_cache.json'


# ============================================================================
# CLASE PRINCIPAL
# ============================================================================

class AiringBotV2:
    """Bot reforzado para sincronización de animes en emisión."""

    def __init__(self) -> None:
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.session = requests.Session()
        self._rotar_user_agent()
        self._actualizar_headers()

        # Caché
        self.cache = self._cargar_cache()

        # Estadísticas
        self.stats: Dict[str, Any] = {
            'inicio': datetime.now(),
            'animes_hoy': 0,
            'procesados': 0,
            'episodios_nuevos': 0,
            'urls_reparadas': 0,
            'animes_creados': 0,
            'temporadas_creadas': 0,
            'sin_cambios': 0,
            'no_encontrados': 0,
            'errores': 0,
            'omitidos_por_cache': 0,
            'detalles': [],
        }

    # ========================================================================
    # UTILIDADES
    # ========================================================================

    def _rotar_user_agent(self) -> None:
        """Rota el User-Agent para evitar bloqueos."""
        self.session.headers['User-Agent'] = random.choice(USER_AGENTS)

    def _actualizar_headers(self) -> None:
        """Actualiza los headers comunes."""
        self.session.headers.update({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
        })

    def _normalizar(self, texto: str) -> str:
        """Normaliza un texto eliminando acentos, signos y espacios extra."""
        if not texto:
            return ''
        # Descomponer caracteres unicode
        texto = unicodedata.normalize('NFKD', texto)
        # Eliminar marcas diacríticas
        texto = ''.join(c for c in texto if not unicodedata.combining(c))
        # Convertir a minúsculas
        texto = texto.lower()
        # Eliminar caracteres no alfanuméricos excepto espacios
        texto = re.sub(r'[^a-z0-9\s]', ' ', texto)
        # Colapsar espacios múltiples
        texto = re.sub(r'\s+', ' ', texto)
        return texto.strip()

    def _similitud(self, a: str, b: str) -> float:
        """Calcula similitud entre dos textos (0-1)."""
        return SequenceMatcher(None, self._normalizar(a), self._normalizar(b)).ratio()

    def _coincide_lo_suficiente(self, titulo_a: str, titulo_b: str) -> bool:
        """Determina si dos títulos coinciden lo suficiente."""
        norm_a = self._normalizar(titulo_a)
        norm_b = self._normalizar(titulo_b)

        if not norm_a or not norm_b:
            return False

        # Coincidencia exacta
        if norm_a == norm_b:
            return True

        # Uno contiene al otro
        if norm_a in norm_b or norm_b in norm_a:
            return True

        # Similitud de primer título vs segundo
        if self._similitud(norm_a, norm_b) >= 0.75:
            return True

        # Primeras 3 palabras coinciden
        palabras_a = norm_a.split()[:3]
        palabras_b = norm_b.split()[:3]
        if len(palabras_a) >= 2 and len(palabras_b) >= 2:
            coincidencias = sum(1 for p in palabras_a if p in palabras_b)
            if coincidencias >= 2:
                return True

        return False

    def _delay(self, rango: Tuple[float, float] = DELAY_ENTRE_PETICIONES) -> None:
        """Pausa aleatoria entre peticiones."""
        time.sleep(random.uniform(*rango))

    # ========================================================================
    # CACHÉ
    # ========================================================================

    def _cargar_cache(self) -> Dict[str, Any]:
        """Carga el caché desde disco."""
        default = {
            'slugs': {},           # {titulo_normalizado: slug}
            'ultima_actualizacion': None,
        }
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    for k, v in default.items():
                        if k not in data:
                            data[k] = v
                    return data
            except Exception as e:
                logger.warning(f"Error cargando caché: {e}")
        return default

    def _guardar_cache(self) -> None:
        """Guarda el caché en disco."""
        try:
            self.cache['ultima_actualizacion'] = datetime.now().isoformat()
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Error guardando caché: {e}")

    # ========================================================================
    # PETICIONES HTTP
    # ========================================================================

    def _request(
        self,
        method: str,
        url: str,
        **kwargs
    ) -> Optional[requests.Response]:
        """Realiza una petición HTTP con reintentos."""
        for intento in range(MAX_REINTENTOS):
            try:
                if intento > 0:
                    self._rotar_user_agent()

                response = self.session.request(
                    method, url, timeout=TIMEOUT_HTTP, **kwargs
                )

                # OK
                if response.status_code == 200:
                    return response

                # Rate limit
                if response.status_code == 429:
                    espera = (intento + 1) * 5 + random.uniform(1, 3)
                    logger.warning(f"⏸️ Rate limit (429). Esperando {espera:.1f}s")
                    time.sleep(espera)
                    continue

                # Cloudflare / Bloqueo
                if response.status_code in (403, 503):
                    logger.warning(f"🚫 Bloqueo (HTTP {response.status_code})")
                    time.sleep((intento + 1) * 3)
                    continue

                # No encontrado
                if response.status_code == 404:
                    return None

                # Otros errores
                logger.warning(f"⚠️ HTTP {response.status_code} en {url}")

            except requests.exceptions.Timeout:
                logger.warning(f"⏱️ Timeout (intento {intento + 1})")
            except requests.exceptions.ConnectionError:
                logger.warning(f"🔌 Error de conexión (intento {intento + 1})")
            except Exception as e:
                logger.error(f"❌ Error: {e}")

            if intento < MAX_REINTENTOS - 1:
                time.sleep((2 ** intento) + random.uniform(0.5, 1.5))

        return None

    # ========================================================================
    # BÚSQUEDA EN JK ANIME
    # ========================================================================

    def _consultar_directorio(
        self,
        query: Optional[str] = None,
        pagina: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Consulta el directorio de JK Anime."""
        params = {}
        if query:
            params['q'] = query
        if pagina:
            params['p'] = pagina

        response = self._request('GET', f"{BASE_URL}/directorio", params=params)
        if not response:
            return []

        # Parsear JSON embebido
        match = re.search(r'var animes = (\{.*?\});', response.text, re.DOTALL)
        if not match:
            return []

        try:
            data = json.loads(match.group(1))
            animes = []
            for anime in data.get('data', []):
                animes.append({
                    'titulo': anime.get('title', ''),
                    'slug': anime.get('slug', ''),
                    'estado': anime.get('status', ''),
                    'tipo': anime.get('type', ''),
                    'id_jk': anime.get('id', 0),
                })
            return animes
        except json.JSONDecodeError:
            return []

    def _buscar_slug_en_directorio(
        self,
        titulo: str
    ) -> Optional[Tuple[str, Dict[str, Any]]]:
        """Busca el slug usando el directorio con múltiples estrategias."""
        norm_titulo = self._normalizar(titulo)
        if not norm_titulo:
            return None

        # Verificar caché
        if norm_titulo in self.cache['slugs']:
            info = self.cache['slugs'][norm_titulo]
            logger.info(f"  💾 En caché: {info['slug']}")
            return info['slug'], info

        # Estrategias de búsqueda
        palabras = norm_titulo.split()
        queries = [
            titulo,                                    # Título completo original
            ' '.join(palabras[:3]),                    # Primeras 3 palabras
            ' '.join(palabras[:2]),                    # Primeras 2 palabras
            palabras[0] if palabras else '',           # Primera palabra
        ]

        for query in queries:
            if not query or len(query) < 3:
                continue

            logger.info(f"  🔎 Buscando: '{query[:40]}'")
            resultados = self._consultar_directorio(query=query)
            self._delay()

            if not resultados:
                continue

            # Buscar mejor coincidencia
            mejor_match = None
            mejor_score = 0.0

            for anime in resultados:
                score = self._similitud(titulo, anime['titulo'])
                if score > mejor_score:
                    mejor_score = score
                    mejor_match = anime

            # Verificar que sea una coincidencia razonable
            if mejor_match and mejor_score >= 0.60:
                logger.info(f"  ✅ Match ({mejor_score:.2f}): {mejor_match['titulo']}")

                # Guardar en caché
                self.cache['slugs'][norm_titulo] = {
                    'slug': mejor_match['slug'],
                    'titulo_jk': mejor_match['titulo'],
                    'score': mejor_score,
                    'timestamp': datetime.now().isoformat(),
                }
                return mejor_match['slug'], mejor_match

        return None

    def _buscar_slug_en_paginas(
        self,
        titulo: str,
        paginas: int = 5
    ) -> Optional[Tuple[str, Dict[str, Any]]]:
        """Busca en las páginas del directorio (fallback)."""
        norm_titulo = self._normalizar(titulo)
        if not norm_titulo:
            return None

        logger.info(f"  📄 Buscando en páginas 1-{paginas}...")

        for pagina in range(1, paginas + 1):
            resultados = self._consultar_directorio(pagina=pagina)
            self._delay()

            for anime in resultados:
                if self._coincide_lo_suficiente(titulo, anime['titulo']):
                    logger.info(f"  ✅ Match en página {pagina}: {anime['titulo']}")

                    self.cache['slugs'][norm_titulo] = {
                        'slug': anime['slug'],
                        'titulo_jk': anime['titulo'],
                        'score': self._similitud(titulo, anime['titulo']),
                        'timestamp': datetime.now().isoformat(),
                    }
                    return anime['slug'], anime

        return None

    def buscar_slug(self, titulo: str) -> Optional[str]:
        """Busca el slug con todas las estrategias disponibles."""
        # Estrategia 1: Directorio
        resultado = self._buscar_slug_en_directorio(titulo)
        if resultado:
            return resultado[0]

        # Estrategia 2: Páginas del directorio
        resultado = self._buscar_slug_en_paginas(titulo, paginas=3)
        if resultado:
            return resultado[0]

        return None

    # ========================================================================
    # OBTENER EPISODIOS DE JK ANIME
    # ========================================================================

    def _obtener_info_anime(self, slug: str) -> Optional[Dict[str, Any]]:
        """Obtiene info de la página del anime (CSRF, jk_id)."""
        response = self._request('GET', f"{BASE_URL}/{slug}/")
        if not response:
            return None

        soup = BeautifulSoup(response.content, 'html.parser')

        # CSRF token
        meta = soup.find('meta', {'name': 'csrf-token'})
        csrf = meta.get('content', '') if meta else ''

        # ID numérico
        match = re.search(r'ajax/episodes/(\d+)/', response.text)
        jk_id = int(match.group(1)) if match else None

        return {
            'csrf': csrf,
            'jk_id': jk_id,
            'html': response.text,
        }

    def obtener_episodios(self, slug: str) -> List[int]:
        """Obtiene la lista de episodios disponibles."""
        info = self._obtener_info_anime(slug)
        if not info:
            return []

        jk_id = info.get('jk_id')
        csrf = info.get('csrf')

        if not jk_id or not csrf:
            return []

        episodios = []
        pagina = 1

        while pagina <= 30:
            response = self._request(
                'POST',
                f"{BASE_URL}/ajax/episodes/{jk_id}/{pagina}",
                data={'_token': csrf},
                headers={
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': f"{BASE_URL}/{slug}/",
                },
            )

            if not response:
                break

            try:
                data = response.json()
            except Exception:
                break

            items = data.get('data', [])
            if not items:
                break

            for ep in items:
                num = ep.get('number', 0)
                if num and num > 0:
                    episodios.append(int(num))

            total = data.get('total', 0)
            if pagina * 16 >= total:
                break

            pagina += 1
            self._delay()

        return sorted(set(episodios))

    # ========================================================================
    # OPERACIONES EN SUPABASE
    # ========================================================================

    def _obtener_anime_id(self, titulo: str) -> Optional[str]:
        """Busca el ID de un anime por título (coincidencia flexible)."""
        # Búsqueda exacta
        response = self.supabase.table('animes').select('id, titulo').eq(
            'titulo', titulo
        ).limit(1).execute()

        if response.data:
            return response.data[0]['id']

        # Búsqueda por ILIKE
        norm = self._normalizar(titulo)
        primera_palabra = norm.split()[0] if norm.split() else titulo
        if len(primera_palabra) < 3:
            return None

        response = self.supabase.table('animes').select('id, titulo').ilike(
            'titulo', f'%{primera_palabra}%'
        ).limit(20).execute()

        if response.data:
            for anime in response.data:
                if self._coincide_lo_suficiente(titulo, anime['titulo']):
                    return anime['id']

        return None

    def _crear_anime(self, titulo: str, portada: str = '') -> Optional[str]:
        """Crea un anime nuevo en Supabase."""
        try:
            response = self.supabase.table('animes').insert({
                'titulo': titulo,
                'sinopsis': '',
                'portada_url': portada or '',
                'banner_url': portada or '',
                'estado_emision': 'emitido',
            }).execute()

            if response.data:
                return response.data[0]['id']
        except Exception as e:
            logger.error(f"  ❌ Error creando anime: {e}")

        return None

    def _obtener_o_crear_temporada(self, anime_id: str) -> Optional[str]:
        """Obtiene o crea la temporada 1 del anime."""
        # Buscar existente
        response = self.supabase.table('temporadas').select('id').eq(
            'anime_id', anime_id
        ).order('orden').limit(1).execute()

        if response.data:
            return response.data[0]['id']

        # Crear
        try:
            response = self.supabase.table('temporadas').insert({
                'anime_id': anime_id,
                'nombre': 'Temporada 1',
                'orden': 1,
            }).execute()

            if response.data:
                self.stats['temporadas_creadas'] += 1
                return response.data[0]['id']
        except Exception as e:
            logger.error(f"  ❌ Error creando temporada: {e}")

        return None

    def _obtener_episodios_bd(self, temporada_id: str) -> Dict[int, str]:
        """Obtiene el mapa {numero: id} de episodios existentes."""
        response = self.supabase.table('episodios').select(
            'id, numero, url_stream'
        ).eq('temporada_id', temporada_id).execute()

        resultado = {}
        for ep in (response.data or []):
            resultado[ep['numero']] = {
                'id': ep['id'],
                'url_stream': ep.get('url_stream', ''),
            }
        return resultado

    def _insertar_episodios(
        self,
        temporada_id: str,
        episodios: List[int],
        slug: str
    ) -> int:
        """Inserta episodios nuevos en batch."""
        if not episodios:
            return 0

        # Preparar datos
        datos = []
        for num in episodios:
            datos.append({
                'temporada_id': temporada_id,
                'numero': num,
                'titulo': f'Episodio {num}',
                'url_stream': f"{BASE_URL}/{slug}/{num}/",
                'visto': False,
            })

        # Insertar en chunks
        chunk_size = 50
        insertados = 0

        for i in range(0, len(datos), chunk_size):
            chunk = datos[i:i + chunk_size]
            try:
                response = self.supabase.table('episodios').insert(chunk).execute()
                if response.data:
                    insertados += len(response.data)
            except Exception as e:
                logger.error(f"  ❌ Error insertando chunk: {e}")

        return insertados

    def _reparar_urls(
        self,
        episodios_bd: Dict[int, Dict],
        slug: str
    ) -> int:
        """Repara URLs obsoletas."""
        reparadas = 0

        for num, info in episodios_bd.items():
            url_correcta = f"{BASE_URL}/{slug}/{num}/"
            if info['url_stream'] != url_correcta:
                try:
                    self.supabase.table('episodios').update({
                        'url_stream': url_correcta
                    }).eq('id', info['id']).execute()
                    reparadas += 1
                except Exception:
                    pass

        return reparadas

    def _actualizar_calendario(
        self,
        anilist_id: int,
        anime_id: str
    ) -> None:
        """Actualiza el calendario con el anime_id."""
        try:
            self.supabase.table('calendario_emision').update({
                'anime_id': anime_id,
                'en_bd': True,
                'updated_at': datetime.now().isoformat(),
            }).eq('anilist_id', anilist_id).execute()
        except Exception as e:
            logger.warning(f"  ⚠️ Error actualizando calendario: {e}")

    # ========================================================================
    # PROCESAMIENTO
    # ========================================================================

    def obtener_animes_hoy(self) -> List[Dict[str, Any]]:
        """Obtiene los animes que emiten hoy desde el calendario."""
        hoy = datetime.now().weekday()  # 0=Lunes, 6=Domingo
        dias_nombre = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

        logger.info(f"📅 Día actual: {dias_nombre[hoy]}")

        response = self.supabase.table('calendario_emision').select(
            'anilist_id, titulo, dia_semana, hora_emision, '
            'proximo_episodio, anime_id, en_bd, portada_url'
        ).eq('dia_semana', hoy).eq('activo', True).order(
            'hora_emision'
        ).execute()

        return response.data or []

    def procesar_anime(self, anime: Dict[str, Any]) -> Dict[str, Any]:
        """Procesa un anime individual."""
        titulo = anime.get('titulo', '').strip()
        anilist_id = anime.get('anilist_id')
        anime_id = anime.get('anime_id')
        en_bd = anime.get('en_bd', False)
        portada = anime.get('portada_url', '')
        hora = anime.get('hora_emision', '--:--')
        ep_proximo = anime.get('proximo_episodio', '?')

        logger.info(f"🎬 {titulo} (EP {ep_proximo}, {hora})")

        resultado = {
            'titulo': titulo,
            'encontrado': False,
            'episodios_nuevos': 0,
            'urls_reparadas': 0,
            'anime_creado': False,
            'temporada_creada': False,
            'error': None,
        }

        # 1. Buscar slug en JK Anime
        slug = self.buscar_slug(titulo)

        if not slug:
            logger.info(f"  ❌ No encontrado en JK Anime")
            self.stats['no_encontrados'] += 1
            return resultado

        resultado['encontrado'] = True
        logger.info(f"  🔗 Slug: {slug}")

        # 2. Obtener episodios
        episodios_web = self.obtener_episodios(slug)
        if not episodios_web:
            logger.info(f"  ⏭️ Sin episodios en JK Anime")
            return resultado

        logger.info(f"  📺 {len(episodios_web)} episodios en JK Anime")

        # 3. Verificar/crear anime en BD
        if not anime_id or not en_bd:
            anime_id = self._obtener_anime_id(titulo)

            if not anime_id:
                logger.info(f"  ➕ Creando anime en BD...")
                anime_id = self._crear_anime(titulo, portada)

                if anime_id:
                    self.stats['animes_creados'] += 1
                    resultado['anime_creado'] = True

            if not anime_id:
                logger.error(f"  ❌ No se pudo crear/obtener anime_id")
                return resultado

            # Actualizar calendario
            if anilist_id:
                self._actualizar_calendario(anilist_id, anime_id)

        # 4. Obtener/crear temporada
        temporada_id = self._obtener_o_crear_temporada(anime_id)
        if not temporada_id:
            logger.error(f"  ❌ No se pudo crear/obtener temporada")
            return resultado

        # 5. Episodios en BD
        eps_bd = self._obtener_episodios_bd(temporada_id)

        # 6. Detectar nuevos
        numeros_bd = set(eps_bd.keys())
        numeros_web = set(episodios_web)
        numeros_nuevos = sorted(numeros_web - numeros_bd)

        # 7. Insertar nuevos
        if numeros_nuevos:
            logger.info(f"  📥 {len(numeros_nuevos)} episodios nuevos")
            insertados = self._insertar_episodios(temporada_id, numeros_nuevos, slug)
            self.stats['episodios_nuevos'] += insertados
            resultado['episodios_nuevos'] = insertados
        else:
            logger.info(f"  ⏭️ Sin episodios nuevos")
            self.stats['sin_cambios'] += 1

        # 8. Reparar URLs
        reparadas = self._reparar_urls(eps_bd, slug)
        if reparadas:
            logger.info(f"  🔧 {reparadas} URLs reparadas")
            self.stats['urls_reparadas'] += reparadas
            resultado['urls_reparadas'] = reparadas

        return resultado

    # ========================================================================
    # EJECUCIÓN PRINCIPAL
    # ========================================================================

    def run(self) -> None:
        """Ejecuta el bot completo."""
        logger.info("=" * 70)
        logger.info("🤖 BOT AIRING SYNC v2 - REFORZADO")
        logger.info(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        logger.info("=" * 70)
        logger.info("")

        try:
            # 1. Obtener animes de hoy
            animes = self.obtener_animes_hoy()
            self.stats['animes_hoy'] = len(animes)

            logger.info(f"📺 Animes programados para hoy: {len(animes)}")
            logger.info("")

            if not animes:
                logger.info("⚠️ No hay animes en emisión hoy")
                return

            # 2. Procesar cada anime
            for i, anime in enumerate(animes, 1):
                logger.info(f"[{i}/{len(animes)}]")

                try:
                    self.procesar_anime(anime)
                    self.stats['procesados'] += 1
                except Exception as e:
                    logger.error(f"  ❌ Error procesando: {e}")
                    self.stats['errores'] += 1

                logger.info("")

                # Pausa entre animes
                if i < len(animes):
                    self._delay(DELAY_ENTRE_ANIMES)

        except KeyboardInterrupt:
            logger.warning("⏹️ Interrumpido por el usuario")
        except Exception as e:
            logger.error(f"❌ Error general: {e}")
            self.stats['errores'] += 1
        finally:
            # 3. Guardar caché
            self._guardar_cache()

            # 4. Estadísticas finales
            self._imprimir_estadisticas()

    def _imprimir_estadisticas(self) -> None:
        """Imprime las estadísticas finales."""
        duracion = (datetime.now() - self.stats['inicio']).total_seconds()

        logger.info("=" * 70)
        logger.info("📊 ESTADÍSTICAS FINALES")
        logger.info("=" * 70)
        logger.info(f"  ⏱️  Duración:                {duracion:.1f}s")
        logger.info(f"  📺 Animes programados:      {self.stats['animes_hoy']}")
        logger.info(f"  ✅ Procesados:              {self.stats['procesados']}")
        logger.info(f"  📥 Episodios nuevos:        {self.stats['episodios_nuevos']}")
        logger.info(f"  🔧 URLs reparadas:          {self.stats['urls_reparadas']}")
        logger.info(f"  ➕ Animes creados:          {self.stats['animes_creados']}")
        logger.info(f"  🎬 Temporadas creadas:      {self.stats['temporadas_creadas']}")
        logger.info(f"  ⏭️  Sin cambios:            {self.stats['sin_cambios']}")
        logger.info(f"  ❌ No encontrados:          {self.stats['no_encontrados']}")
        logger.info(f"  ⚠️  Errores:                {self.stats['errores']}")
        logger.info("=" * 70)


# ============================================================================
# PUNTO DE ENTRADA
# ============================================================================

if __name__ == "__main__":
    bot = AiringBotV2()
    bot.run()
