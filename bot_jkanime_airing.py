#!/usr/bin/env python3
"""
Bot Airing Sync v7 - Automatizado + Match Preciso + Filtro Anti-Hentai + Refrescar
====================================================================================
Sistema completo de sincronización con 4 modos automáticos.

MODOS DE EJECUCIÓN (variable MODO):
  - hoy:        Procesa solo los animes que emiten HOY (cada 30 min)
  - pendientes: Reintenta animes NO ENCONTRADOS de los últimos 7 días (cada 6h)
  - todos:      Procesa TODOS los animes activos (cada 24h)
  - refrescar:  Recorre animes en emisión con ultima_sincronizacion vieja (cada 12h)

MEJORAS v7:
- ✅ MODO=refrescar: barre animes con estado=EN_EMISION y última sync > 24h
- ✅ Guarda jk_slug en animes (evita re-buscar en refrescos)
- ✅ Actualiza ultima_sincronizacion tras cada anime
- ✅ Flags es_nuevo / es_en_emision / fecha_agregado / fecha_ultimo_episodio
- ✅ Compatible con schema v7 (columnas nuevas ya migradas)

MEJORAS v6 (heredadas):
- ✅ Filtro anti-hentai por géneros ANTES de crear/actualizar cualquier anime
- ✅ Extracción de géneros desde la ficha de JK Anime
- ✅ Contador `hentai_ignorados` en estadísticas
- ✅ Cacheo de detección para no repetir peticiones

MEJORAS v5 (heredadas):
- ✅ Match más estricto (UMBRAL 0.70)
- ✅ Verificación de palabras clave obligatoria
- ✅ Anti-spin-offs reforzado
- ✅ Estadísticas detalladas por modo
"""

import os
import re
import json
import time
import random
import logging
import unicodedata
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional, Tuple
from urllib.parse import quote
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

# Modo de ejecución
MODO = os.environ.get('MODO', 'hoy').lower()  # hoy | pendientes | todos | refrescar
DIAS_PENDIENTES = int(os.environ.get('DIAS_PENDIENTES', '7'))
LIMITE_ANIMES = int(os.environ.get('LIMITE_ANIMES', '50'))
HORAS_REFRESCAR = int(os.environ.get('HORAS_REFRESCAR', '24'))  # ⬅️ NUEVO v7

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
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
]

# Comportamiento
MAX_REINTENTOS = 3
TIMEOUT_HTTP = 20
DELAY_ENTRE_ANIMES = (0.8, 1.5)
DELAY_ENTRE_PETICIONES = (0.3, 0.7)
UMBRAL_DUPLICADO = 0.90
UMBRAL_BUSQUEDA = 0.70

# Palabras clave de spin-offs
PALABRAS_SPINOFF = {
    'special', 'specials', 'especial', 'especiales',
    'ova', 'ovas', 'ona', 'onas',
    'movie', 'movies', 'pelicula', 'peliculas',
    'recap', 'recaps', 'resumen',
    'zero', 'tea', 'time',
    'picture', 'drama', 'cd',
    'pilot', 'prologue', 'epilogue',
    'gaiden', 'side',
    'mini', 'short',
    'kanketsu',
    'spin', 'off',
}

# Palabras comunes que NO cuentan como claves (stopwords)
STOPWORDS = {
    'the', 'of', 'and', 'no', 'ni', 'wa', 'ga', 'wo', 'to', 'de', 'la', 'el',
    'los', 'las', 'un', 'una', 'y', 'en', 'a', 'para', 'por', 'con', 'sin',
    'del', 'al', 'es', 'son', 'se', 'su', 'que',
}

# Etiquetas que marcan contenido para adultos (hentai real)
ETIQUETAS_HENTAI = {
    'hentai', 'hentai.',
    'adulto', 'adultos',
    'ecchi+',
    'porno', 'pornografia', 'pornografía',
    'xxx', '18+',
}

# ⬅️ NUEVO v7: estados que activan MODO=refrescar
ESTADOS_EN_EMISION = ['EN_EMISION']

# Caché
CACHE_FILE = '.airing_cache.json'


# ============================================================================
# HELPERS DE FECHA
# ============================================================================

def _now_utc() -> datetime:
    """Fecha/hora UTC actual (aware)."""
    return datetime.now(timezone.utc)


def _iso_now() -> str:
    return _now_utc().isoformat()


# ============================================================================
# CLASE PRINCIPAL
# ============================================================================

class AiringBotV7:
    """Bot automatizado v7 con MODO=refrescar y flags de novedad."""

    def __init__(self) -> None:
        self.supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.session = requests.Session()
        self._rotar_user_agent()
        self._actualizar_headers()

        # Caché
        self.cache = self._cargar_cache()
        self._animes_cache: Optional[List[Dict]] = None

        # Caché de detección hentai por slug (evita repetir peticiones)
        self._hentai_cache: Dict[str, bool] = {}

        # Estadísticas
        self.stats: Dict[str, Any] = {
            'inicio': _now_utc(),
            'modo': MODO,
            'animes_a_procesar': 0,
            'procesados': 0,
            'episodios_nuevos': 0,
            'urls_reparadas': 0,
            'animes_creados': 0,
            'temporadas_creadas': 0,
            'duplicados_evitados': 0,
            'sin_cambios': 0,
            'no_encontrados': 0,
            'spinoffs_ignorados': 0,
            'hentai_ignorados': 0,
            'refrescados': 0,          # ⬅️ NUEVO v7
            'slugs_guardados': 0,      # ⬅️ NUEVO v7
            'errores': 0,
        }

    # ========================================================================
    # UTILIDADES
    # ========================================================================

    def _normalizar(self, texto: str) -> str:
        """Normalización agresiva de títulos."""
        if not texto:
            return ''

        t = texto.lower().strip()
        t = unicodedata.normalize('NFKD', t)
        t = ''.join(c for c in t if not unicodedata.combining(c))
        t = re.sub(r'\(\d{4}\)', '', t)
        t = re.sub(r'\d+(st|nd|rd|th)\s+season', '', t)
        t = re.sub(r'season\s+\d+', '', t)
        t = re.sub(r'part\s+\d+', '', t)
        t = re.sub(r'\s+(ii|iii|iv|v|vi|vii|viii|ix|x)\s*$', '', t)
        t = re.sub(r'\s+(second|third|fourth|fifth|final)\s+season', '', t)
        t = re.sub(r'[^a-z0-9\s]', ' ', t)
        t = re.sub(r'\s+', ' ', t)

        return t.strip()

    def _palabras_clave(self, titulo: str) -> set:
        """Extrae palabras clave (sin stopwords, > 3 letras)."""
        norm = self._normalizar(titulo)
        return {p for p in norm.split() if len(p) > 3 and p not in STOPWORDS}

    def _similitud(self, a: str, b: str) -> float:
        return SequenceMatcher(None, a, b).ratio()

    def _coincide(self, titulo_a: str, titulo_b: str, umbral: float = UMBRAL_DUPLICADO) -> bool:
        norm_a = self._normalizar(titulo_a)
        norm_b = self._normalizar(titulo_b)

        if not norm_a or not norm_b:
            return False

        if norm_a == norm_b:
            return True

        if len(norm_a) > 5 and len(norm_b) > 5:
            if norm_a in norm_b or norm_b in norm_a:
                return True

        if self._similitud(norm_a, norm_b) >= umbral:
            return True

        return False

    def _delay(self, rango: Tuple[float, float] = DELAY_ENTRE_PETICIONES) -> None:
        time.sleep(random.uniform(*rango))

    def _es_hentai(self, generos: List[str]) -> bool:
        """Detecta si un anime es hentai según sus géneros."""
        if not generos:
            return False
        generos_norm = {g.strip().lower() for g in generos if g}
        return bool(generos_norm & ETIQUETAS_HENTAI)

    # ========================================================================
    # CACHÉ
    # ========================================================================

    def _cargar_cache(self) -> Dict[str, Any]:
        default = {'slugs': {}, 'ultima_actualizacion': None}
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
        try:
            self.cache['ultima_actualizacion'] = _iso_now()
            with open(CACHE_FILE, 'w', encoding='utf-8') as f:
                json.dump(self.cache, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Error guardando caché: {e}")

    def _cargar_animes_cache(self) -> List[Dict]:
        """Carga TODOS los animes de la BD (id + titulo)."""
        if self._animes_cache is not None:
            return self._animes_cache

        logger.info("📊 Cargando caché de animes de la BD...")

        todos = []
        offset = 0
        limit = 1000

        while True:
            try:
                response = self.supabase.table('animes').select(
                    'id, titulo'
                ).range(offset, offset + limit - 1).execute()

                data = response.data or []
                if not data:
                    break

                todos.extend(data)
                offset += limit

                if len(data) < limit:
                    break
            except Exception as e:
                logger.error(f"Error cargando animes: {e}")
                break

        for a in todos:
            a['norm'] = self._normalizar(a['titulo'])

        self._animes_cache = todos
        logger.info(f"✅ {len(todos)} animes cacheados")

        return todos

    # ========================================================================
    # HTTP
    # ========================================================================

    def _rotar_user_agent(self) -> None:
        self.session.headers['User-Agent'] = random.choice(USER_AGENTS)

    def _actualizar_headers(self) -> None:
        self.session.headers.update({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            'DNT': '1',
            'Connection': 'keep-alive',
        })

    def _request(self, method: str, url: str, **kwargs) -> Optional[requests.Response]:
        for intento in range(MAX_REINTENTOS):
            try:
                if intento > 0:
                    self._rotar_user_agent()

                response = self.session.request(method, url, timeout=TIMEOUT_HTTP, **kwargs)

                if response.status_code == 200:
                    return response

                if response.status_code == 429:
                    espera = (intento + 1) * 5 + random.uniform(1, 3)
                    logger.warning(f"⏸️ Rate limit. Esperando {espera:.1f}s")
                    time.sleep(espera)
                    continue

                if response.status_code in (403, 503):
                    logger.warning(f"🚫 Bloqueo HTTP {response.status_code}")
                    time.sleep((intento + 1) * 3)
                    continue

                if response.status_code == 404:
                    return None

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

    def _buscar_en_jk(self, query: str) -> List[Dict[str, Any]]:
        """Busca animes usando /buscar/{query}."""
        query_encoded = quote(query)
        response = self._request('GET', f"{BASE_URL}/buscar/{query_encoded}")

        if not response:
            return []

        soup = BeautifulSoup(response.content, 'html.parser')
        resultados = []

        items = soup.find_all('div', class_='anime__item')

        for item in items:
            try:
                link = item.find('a', href=True)
                if not link:
                    continue

                href = link.get('href', '')
                match = re.search(r'jkanime\.net/([^/]+)/?$', href)
                if not match:
                    continue

                slug = match.group(1)
                titulo = link.get_text(strip=True)

                if not titulo:
                    text_div = item.find('div', class_='anime__item__text')
                    if text_div:
                        title_elem = text_div.find(['h3', 'h5', 'h6'])
                        if title_elem:
                            titulo = title_elem.get_text(strip=True)

                if not titulo:
                    titulo = slug.replace('-', ' ').title()

                img_div = item.find('div', class_='anime__item__pic')
                imagen = img_div.get('data-setbg', '') if img_div else ''

                estado = ''
                tipo = ''
                text_div = item.find('div', class_='anime__item__text')
                if text_div:
                    items_li = text_div.find_all('li')
                    if len(items_li) >= 1:
                        estado = items_li[0].get_text(strip=True)
                    if len(items_li) >= 2:
                        tipo = items_li[1].get_text(strip=True)

                resultados.append({
                    'titulo': titulo,
                    'slug': slug,
                    'imagen': imagen,
                    'estado': estado,
                    'tipo': tipo,
                })
            except Exception as e:
                logger.debug(f"Error parseando item: {e}")
                continue

        return resultados

    def _buscar_slug(self, titulo: str) -> Optional[Tuple[str, Dict]]:
        """Busca slug con lógica estricta anti-spin-offs y anti-falsos positivos."""
        norm = self._normalizar(titulo)
        if not norm:
            return None

        # Caché
        if norm in self.cache['slugs']:
            info = self.cache['slugs'][norm]
            logger.info(f"  💾 En caché: {info['slug']}")
            return info['slug'], info

        palabras_clave_query = self._palabras_clave(titulo)

        palabras = norm.split()
        queries = [
            titulo,
            ' '.join(palabras[:4]),
            ' '.join(palabras[:3]),
            ' '.join(palabras[:2]),
            palabras[0] if palabras else '',
        ]

        if ':' in titulo:
            queries.append(titulo.split(':')[0])
        if '-' in titulo:
            queries.append(titulo.replace('-', ' '))

        queries_unicas = []
        for q in queries:
            if q and q not in queries_unicas and len(q) >= 3:
                queries_unicas.append(q)

        candidatos_totales = []

        for query in queries_unicas:
            logger.info(f"  🔎 Buscando: '{query[:40]}'")
            resultados = self._buscar_en_jk(query)
            self._delay()

            for anime in resultados:
                anime['_query_origen'] = query
                candidatos_totales.append(anime)

        if not candidatos_totales:
            return None

        candidatos_puntuados = []

        for anime in candidatos_totales:
            titulo_anime = anime['titulo']
            slug_anime = anime['slug']
            norm_anime = self._normalizar(titulo_anime)
            norm_slug = self._normalizar(slug_anime.replace('-', ' '))

            palabras_query_set_norm = set(norm.split())
            palabras_match_set_norm = set(norm_anime.split())

            coincidencias_palabras = palabras_query_set_norm & palabras_match_set_norm
            cobertura = len(coincidencias_palabras) / len(palabras_query_set_norm) if palabras_query_set_norm else 0

            score = cobertura

            if norm_slug == norm:
                score = min(1.0, score + 0.20)
            elif norm in norm_slug:
                score = min(1.0, score + 0.10)

            palabras_extra = palabras_match_set_norm - palabras_query_set_norm
            spinoff_encontrado = palabras_extra & PALABRAS_SPINOFF

            if spinoff_encontrado:
                score -= 0.40

            if re.search(r'\(\d{4}\)', titulo_anime) and not re.search(r'\(\d{4}\)', titulo):
                score -= 0.05

            diferencia = len(palabras_match_set_norm) - len(palabras_query_set_norm)
            if diferencia > 5:
                score -= 0.10
            elif diferencia > 3:
                score -= 0.05

            palabras_clave_anime = self._palabras_clave(titulo_anime)
            coincidencias_clave = palabras_clave_query & palabras_clave_anime

            if len(palabras_clave_query) <= 2:
                min_coincidencias = 1
            else:
                min_coincidencias = 2

            tiene_palabras_clave = len(coincidencias_clave) >= min_coincidencias

            if not tiene_palabras_clave:
                score -= 0.50

            score = max(0.0, min(1.0, score))

            candidatos_puntuados.append({
                'anime': anime,
                'score': score,
                'spinoff': bool(spinoff_encontrado),
                'palabras_clave_comunes': len(coincidencias_clave),
                'tiene_palabras_clave': tiene_palabras_clave,
            })

        candidatos_puntuados.sort(key=lambda x: x['score'], reverse=True)

        candidatos_validos = [
            c for c in candidatos_puntuados
            if c['tiene_palabras_clave'] and not c['spinoff']
        ]

        if not candidatos_validos:
            if candidatos_puntuados:
                mejor_invalido = candidatos_puntuados[0]
                if mejor_invalido['spinoff']:
                    self.stats['spinoffs_ignorados'] += 1
                    logger.info(f"  🚫 Solo spin-offs encontrados: {mejor_invalido['anime']['titulo'][:50]}")
                else:
                    logger.info(f"  ⚠️ Sin palabras clave comunes con: {mejor_invalido['anime']['titulo'][:50]}")
            return None

        mejor = candidatos_validos[0]

        if mejor['score'] >= UMBRAL_BUSQUEDA:
            logger.info(f"  ✅ Match ({mejor['score']:.2f}, {mejor['palabras_clave_comunes']} claves): {mejor['anime']['titulo']}")

            self.cache['slugs'][norm] = {
                'slug': mejor['anime']['slug'],
                'titulo_jk': mejor['anime']['titulo'],
                'score': mejor['score'],
                'timestamp': _iso_now(),
            }
            return mejor['anime']['slug'], mejor['anime']

        logger.info(f"  ⚠️ Score bajo: {mejor['score']:.2f} < {UMBRAL_BUSQUEDA} ({mejor['anime']['titulo'][:50]})")
        return None

    def buscar_slug(self, titulo: str) -> Optional[str]:
        resultado = self._buscar_slug(titulo)
        if resultado:
            return resultado[0]
        return None

    # ========================================================================
    # EPISODIOS
    # ========================================================================

    def _obtener_info_anime(self, slug: str) -> Optional[Dict[str, Any]]:
        """Obtiene CSRF, jk_id y GÉNEROS del anime."""
        response = self._request('GET', f"{BASE_URL}/{slug}/")
        if not response:
            return None

        soup = BeautifulSoup(response.content, 'html.parser')
        meta = soup.find('meta', {'name': 'csrf-token'})
        csrf = meta.get('content', '') if meta else ''

        match = re.search(r'ajax/episodes/(\d+)/', response.text)
        jk_id = int(match.group(1)) if match else None

        generos: List[str] = []

        generos_label = soup.find(
            string=re.compile(r'G[eé]neros?:', re.IGNORECASE)
        )
        if generos_label:
            parent = generos_label.parent
            if parent:
                for link in parent.find_all('a'):
                    texto = link.get_text(strip=True)
                    if texto and texto not in generos:
                        generos.append(texto)

            if not generos:
                next_elem = generos_label.find_next_sibling()
                if next_elem:
                    for link in next_elem.find_all('a'):
                        texto = link.get_text(strip=True)
                        if texto and texto not in generos:
                            generos.append(texto)

        if not generos:
            for cont in soup.find_all(
                ['div', 'ul'],
                class_=re.compile(r'generos?', re.IGNORECASE)
            ):
                for link in cont.find_all('a'):
                    texto = link.get_text(strip=True)
                    if texto and texto not in generos:
                        generos.append(texto)

        return {
            'csrf': csrf,
            'jk_id': jk_id,
            'generos': generos,
        }

    def obtener_episodios(
        self,
        slug: str,
        info: Optional[Dict[str, Any]] = None
    ) -> List[int]:
        if info is None:
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
    # SUPABASE
    # ========================================================================

    def _obtener_anime_id(self, titulo: str) -> Optional[str]:
        animes = self._cargar_animes_cache()
        if not titulo:
            return None

        for anime in animes:
            if self._coincide(titulo, anime['titulo']):
                return anime['id']

        return None

    def _crear_anime(
        self,
        titulo: str,
        portada: str = '',
        episodios: List[int] = None,
        slug: str = '',
    ) -> Optional[str]:
        existente = self._obtener_anime_id(titulo)
        if existente:
            self.stats['duplicados_evitados'] += 1
            logger.info(f"  🔒 Anime ya existe: {titulo[:50]}")
            return existente

        if not episodios or len(episodios) == 0:
            logger.info(f"  ⏭️ Sin episodios, NO se crea")
            return None

        try:
            # ⬅️ NUEVO v7: flags de novedad y en_emision
            payload = {
                'titulo': titulo,
                'sinopsis': '',
                'portada_url': portada or '',
                'banner_url': portada or '',
                'estado': 'EN_EMISION',           # enum real
                'estado_emision': 'emitiendo',     # varchar legacy
                'es_nuevo': True,
                'es_en_emision': True,
                'fecha_agregado': _iso_now(),
                'fecha_ultimo_episodio': _iso_now(),
                'ultima_sincronizacion': _iso_now(),
            }
            if slug:
                payload['jk_slug'] = slug

            response = self.supabase.table('animes').insert(payload).execute()

            if response.data:
                nuevo = response.data[0]
                logger.info(f"  ✅ Anime creado: {nuevo['id'][:8]}...")

                if self._animes_cache is not None:
                    self._animes_cache.append({
                        'id': nuevo['id'],
                        'titulo': nuevo['titulo'],
                        'norm': self._normalizar(nuevo['titulo']),
                    })

                return nuevo['id']
        except Exception as e:
            logger.error(f"  ❌ Error creando anime: {e}")

        return None

    def _obtener_o_crear_temporada(self, anime_id: str) -> Optional[str]:
        response = self.supabase.table('temporadas').select('id').eq(
            'anime_id', anime_id
        ).order('orden').limit(1).execute()

        if response.data:
            return response.data[0]['id']

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

    def _obtener_episodios_bd(self, temporada_id: str) -> Dict[int, Dict]:
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
        if not episodios:
            return 0

        # ⬅️ NUEVO v7: es_nuevo=True + fecha_agregado
        datos = [{
            'temporada_id': temporada_id,
            'numero': num,
            'titulo': f'Episodio {num}',
            'url_stream': f"{BASE_URL}/{slug}/{num}/",
            'visto': False,
            'es_nuevo': True,
            'fecha_agregado': _iso_now(),
        } for num in episodios]

        insertados = 0
        chunk_size = 50

        for i in range(0, len(datos), chunk_size):
            chunk = datos[i:i + chunk_size]
            try:
                response = self.supabase.table('episodios').insert(chunk).execute()
                if response.data:
                    insertados += len(response.data)
            except Exception as e:
                logger.error(f"  ❌ Error insertando: {e}")

        return insertados

    def _reparar_urls(self, episodios_bd: Dict[int, Dict], slug: str) -> int:
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

    def _actualizar_calendario(self, anilist_id: int, anime_id: str) -> None:
        try:
            self.supabase.table('calendario_emision').update({
                'anime_id': anime_id,
                'en_bd': True,
            }).eq('anilist_id', anilist_id).execute()
        except Exception:
            pass

    # ⬅️ NUEVO v7: marca un anime como sincronizado + actualiza flags
    def _marcar_sincronizado(
        self,
        anime_id: str,
        hubo_nuevos: bool = False,
    ) -> None:
        if not anime_id:
            return
        try:
            payload: Dict[str, Any] = {
                'ultima_sincronizacion': _iso_now(),
                'es_en_emision': True,
            }
            if hubo_nuevos:
                payload['fecha_ultimo_episodio'] = _iso_now()
                payload['es_nuevo'] = True

            self.supabase.table('animes').update(payload).eq('id', anime_id).execute()
        except Exception as e:
            logger.debug(f"Error marcando sincronizado {anime_id[:8]}: {e}")

    # ⬅️ NUEVO v7: guarda jk_slug si no estaba
    def _guardar_slug(self, anime_id: str, slug: str) -> None:
        if not anime_id or not slug:
            return
        try:
            self.supabase.table('animes').update({
                'jk_slug': slug,
            }).eq('id', anime_id).execute()
            self.stats['slugs_guardados'] += 1
        except Exception:
            pass

    # ========================================================================
    # OBTENER ANIMES SEGÚN MODO
    # ========================================================================

    def obtener_animes_segun_modo(self) -> List[Dict[str, Any]]:
        """Obtiene animes según el modo configurado."""
        hoy = datetime.now().weekday()
        dias_nombre = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

        if MODO == 'hoy':
            logger.info(f"📅 MODO: HOY ({dias_nombre[hoy]})")
            response = self.supabase.table('calendario_emision').select(
                'anilist_id, titulo, dia_semana, hora_emision, '
                'proximo_episodio, anime_id, en_bd, portada_url'
            ).eq('dia_semana', hoy).eq('activo', True).order('hora_emision').execute()
            return response.data or []

        elif MODO == 'pendientes':
            logger.info(f"🔄 MODO: PENDIENTES (no encontrados en últimos {DIAS_PENDIENTES} días)")
            response = self.supabase.table('calendario_emision').select(
                'anilist_id, titulo, dia_semana, hora_emision, '
                'proximo_episodio, anime_id, en_bd, portada_url'
            ).eq('activo', True).eq('en_bd', False).limit(LIMITE_ANIMES).execute()
            return response.data or []

        elif MODO == 'todos':
            logger.info(f"🌍 MODO: TODOS (sin filtro de día)")
            response = self.supabase.table('calendario_emision').select(
                'anilist_id, titulo, dia_semana, hora_emision, '
                'proximo_episodio, anime_id, en_bd, portada_url'
            ).eq('activo', True).limit(LIMITE_ANIMES).execute()
            return response.data or []

        # ⬅️ NUEVO v7: MODO=refrescar
        elif MODO == 'refrescar':
            logger.info(f"🔄 MODO: REFRESCAR (animes EN_EMISION con última sync > {HORAS_REFRESCAR}h)")

            hace_n = (_now_utc() - timedelta(hours=HORAS_REFRESCAR)).isoformat()

            try:
                # Trae animes en emisión que:
                #   - nunca se han sincronizado, O
                #   - su última sync fue hace > HORAS_REFRESCAR
                # Ordena por más antiguos primero
                response = self.supabase.table('animes').select(
                    'id, titulo, jk_slug, ultima_sincronizacion, estado'
                ).in_('estado', ESTADOS_EN_EMISION).or_(
                    f'ultima_sincronizacion.is.null,ultima_sincronizacion.lt.{hace_n}'
                ).order(
                    'ultima_sincronizacion', desc=False, nullsfirst=True
                ).limit(LIMITE_ANIMES).execute()

                animes_bd = response.data or []

                # Convertir a formato compatible con procesar_anime
                animes = []
                for a in animes_bd:
                    animes.append({
                        'titulo': a['titulo'],
                        'anime_id': a['id'],
                        'en_bd': True,
                        'anilist_id': None,
                        'portada_url': '',
                        'hora_emision': '--:--',
                        'proximo_episodio': '?',
                        '_jk_slug': a.get('jk_slug'),  # pista para evitar búsqueda
                    })

                return animes
            except Exception as e:
                logger.error(f"❌ Error consultando animes para refrescar: {e}")
                return []

        else:
            logger.error(f"❌ MODO desconocido: {MODO}")
            return []

    # ========================================================================
    # PROCESAMIENTO
    # ========================================================================

    def procesar_anime(self, anime: Dict[str, Any]) -> Dict[str, Any]:
        titulo = anime.get('titulo', '').strip()
        anilist_id = anime.get('anilist_id')
        anime_id = anime.get('anime_id')
        en_bd = anime.get('en_bd', False)
        portada = anime.get('portada_url', '')
        hora = anime.get('hora_emision', '--:--')
        ep_proximo = anime.get('proximo_episodio', '?')
        slug_hint = anime.get('_jk_slug')  # ⬅️ NUEVO v7: slug guardado en BD

        logger.info(f"🎬 {titulo} (EP {ep_proximo}, {hora})")

        resultado = {
            'titulo': titulo,
            'encontrado': False,
            'episodios_nuevos': 0,
            'urls_reparadas': 0,
            'anime_creado': False,
        }

        # ⬅️ v7: si tenemos slug guardado, úsalo (evita búsqueda)
        if MODO == 'refrescar' and slug_hint:
            slug = slug_hint
            logger.info(f"  🔗 Slug (BD): {slug}")
            resultado['encontrado'] = True
        else:
            slug = self.buscar_slug(titulo)
            if not slug:
                logger.info(f"  ❌ No encontrado en JK Anime")
                self.stats['no_encontrados'] += 1
                return resultado

            resultado['encontrado'] = True
            logger.info(f"  🔗 Slug: {slug}")

        # Filtro anti-hentai
        info_anime: Optional[Dict[str, Any]] = None
        if slug in self._hentai_cache:
            es_hentai = self._hentai_cache[slug]
            if es_hentai:
                logger.info(f"  🚫 HENTAI (cache) → ignorando")
                self.stats['hentai_ignorados'] += 1
                return resultado
        else:
            info_anime = self._obtener_info_anime(slug)
            if info_anime:
                generos = info_anime.get('generos', [])
                es_hentai = self._es_hentai(generos)
                self._hentai_cache[slug] = es_hentai

                if es_hentai:
                    logger.info(f"  🚫 HENTAI detectado {generos} → ignorando")
                    self.stats['hentai_ignorados'] += 1
                    return resultado

                if generos:
                    logger.debug(f"  🏷️ Géneros: {generos}")

        episodios_web = self.obtener_episodios(slug, info=info_anime)
        if not episodios_web:
            logger.info(f"  ⏭️ Sin episodios")
            return resultado

        logger.info(f"  📺 {len(episodios_web)} episodios en JK Anime")

        # Crear/obtener anime
        if not anime_id or not en_bd:
            anime_id = self._obtener_anime_id(titulo)

            if not anime_id:
                logger.info(f"  ➕ Creando anime...")
                anime_id = self._crear_anime(titulo, portada, episodios_web, slug=slug)

                if anime_id:
                    self.stats['animes_creados'] += 1
                    resultado['anime_creado'] = True

            if not anime_id:
                logger.error(f"  ❌ No se pudo crear/obtener anime_id")
                return resultado

            if anilist_id:
                self._actualizar_calendario(anilist_id, anime_id)

        # ⬅️ v7: guarda slug si no lo tenía
        if anime_id and slug:
            self._guardar_slug(anime_id, slug)

        temporada_id = self._obtener_o_crear_temporada(anime_id)
        if not temporada_id:
            return resultado

        eps_bd = self._obtener_episodios_bd(temporada_id)

        numeros_bd = set(eps_bd.keys())
        numeros_web = set(episodios_web)
        numeros_nuevos = sorted(numeros_web - numeros_bd)

        hubo_nuevos = False

        if numeros_nuevos:
            logger.info(f"  📥 {len(numeros_nuevos)} episodios nuevos")
            insertados = self._insertar_episodios(temporada_id, numeros_nuevos, slug)
            self.stats['episodios_nuevos'] += insertados
            resultado['episodios_nuevos'] = insertados
            hubo_nuevos = insertados > 0
        else:
            logger.info(f"  ⏭️ Sin cambios")
            self.stats['sin_cambios'] += 1

        reparadas = self._reparar_urls(eps_bd, slug)
        if reparadas:
            logger.info(f"  🔧 {reparadas} URLs reparadas")
            self.stats['urls_reparadas'] += reparadas
            resultado['urls_reparadas'] = reparadas

        # ⬅️ v7: marcar sincronizado + flag nuevos
        self._marcar_sincronizado(anime_id, hubo_nuevos=hubo_nuevos)

        if MODO == 'refrescar':
            self.stats['refrescados'] += 1

        return resultado

    # ========================================================================
    # EJECUCIÓN
    # ========================================================================

    def run(self) -> None:
        logger.info("=" * 70)
        logger.info("🤖 BOT AIRING SYNC v7")
        logger.info(f"📅 {_now_utc().strftime('%Y-%m-%d %H:%M:%S')} UTC")
        logger.info(f"🎯 MODO: {MODO.upper()}")
        logger.info("=" * 70)
        logger.info("")

        try:
            self._cargar_animes_cache()
            logger.info("")

            animes = self.obtener_animes_segun_modo()
            self.stats['animes_a_procesar'] = len(animes)

            logger.info(f"📺 Animes a procesar: {len(animes)}")
            logger.info("")

            if not animes:
                logger.info("⚠️ No hay animes para procesar")
                return

            for i, anime in enumerate(animes, 1):
                logger.info(f"[{i}/{len(animes)}]")

                try:
                    self.procesar_anime(anime)
                    self.stats['procesados'] += 1
                except Exception as e:
                    logger.error(f"  ❌ Error: {e}")
                    self.stats['errores'] += 1

                logger.info("")

                if i < len(animes):
                    self._delay(DELAY_ENTRE_ANIMES)

        except KeyboardInterrupt:
            logger.warning("⏹️ Interrumpido")
        except Exception as e:
            logger.error(f"❌ Error general: {e}")
            self.stats['errores'] += 1
        finally:
            self._guardar_cache()
            self._imprimir_estadisticas()

    def _imprimir_estadisticas(self) -> None:
        duracion = (_now_utc() - self.stats['inicio']).total_seconds()

        logger.info("=" * 70)
        logger.info(f"📊 ESTADÍSTICAS FINALES - MODO {self.stats['modo'].upper()}")
        logger.info("=" * 70)
        logger.info(f"  ⏱️  Duración:                {duracion:.1f}s")
        logger.info(f"  📺 Animes a procesar:       {self.stats['animes_a_procesar']}")
        logger.info(f"  ✅ Procesados:              {self.stats['procesados']}")
        logger.info(f"  📥 Episodios nuevos:        {self.stats['episodios_nuevos']}")
        logger.info(f"  🔧 URLs reparadas:          {self.stats['urls_reparadas']}")
        logger.info(f"  ➕ Animes creados:          {self.stats['animes_creados']}")
        logger.info(f"  🔒 Duplicados evitados:     {self.stats['duplicados_evitados']}")
        logger.info(f"  🎬 Temporadas creadas:      {self.stats['temporadas_creadas']}")
        logger.info(f"  🔗 Slugs guardados:         {self.stats['slugs_guardados']}")     # ⬅️ NUEVO v7
        logger.info(f"  🔄 Refrescados:             {self.stats['refrescados']}")        # ⬅️ NUEVO v7
        logger.info(f"  ⏭️  Sin cambios:            {self.stats['sin_cambios']}")
        logger.info(f"  ❌ No encontrados:          {self.stats['no_encontrados']}")
        logger.info(f"  🚫 Spin-offs ignorados:     {self.stats['spinoffs_ignorados']}")
        logger.info(f"  🚫 Hentai ignorados:        {self.stats['hentai_ignorados']}")
        logger.info(f"  ⚠️  Errores:                {self.stats['errores']}")
        logger.info("=" * 70)


# ============================================================================
# PUNTO DE ENTRADA
# ============================================================================

if __name__ == "__main__":
    bot = AiringBotV7()
    bot.run()