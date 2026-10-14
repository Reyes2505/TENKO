# 🏗️ Estructura de Base de Datos y Blindaje en Supabase

Este documento detalla la arquitectura de datos de **TENKO Anime**, diseñada para producción, previniendo duplicados, desincronizaciones y episodios fantasma.

---

## 📐 Diagrama Relacional

```
public.animes (1 fila por título)
  ├── anilist_id (UNIQUE: clave externa universal)
  ├── mal_id (UNIQUE: clave de respaldo)
  ├── estado_emision ('emitido', 'en_espera', 'suspendido', 'terminado')
  ├── episodios_esperados (según AniList)
  ├── episodios_encontrados (según scraper)
  │
  ├── public.temporadas (1 fila por temporada)
  │     └── anime_id (FK → animes.id)
  │
  ├── public.episodios (1 fila por episodio REAL emitido)
  │     ├── anime_id (FK → animes.id)
  │     ├── temporada_id (FK → temporadas.id)
  │     ├── numero (INTEGER: 1, 2, 3...)
  │     ├── url_stream (fuente principal)
  │     ├── servidores (JSONB: lista de mirrors [HD 1080p, Espejo 720p, etc.])
  │     └── CONSTRAINT uq_episodio_anime_num UNIQUE (anime_id, numero)
  │
  ├── public.scraping_logs (Auditoría de ejecuciones del bot)
  │     ├── anime_id, anilist_id, fuente ('jkanime', 'tmdb', etc.)
  │     ├── episodios_esperados vs episodios_encontrados
  │     └── estado ('exitoso', 'revision_manual', 'error')
  │
  └── Tablas de Usuario:
        ├── public.progreso_episodios (user_id, anime_id, episodio_id, porcentaje)
        ├── public.watchlist (user_id, anime_id, estado: viendo/por_ver/visto/favorito)
        ├── public.comentarios (anime_id, user_id, contenido, calificacion)
        └── public.valoraciones (anime_id, user_id, puntuacion)
```

---

## 🛡️ Las 7 Reglas de Blindaje Implementadas

| Regla | Implementación en BD | Beneficio |
|---|---|---|
| **1. IDs externos universales** | `anilist_id INTEGER UNIQUE` en `animes` | Se elimina el 100% de ambigüedad por títulos en romaji, inglés o español. |
| **2. Unicidad estricta por episodio** | `CONSTRAINT uq_episodio_anime_num UNIQUE (anime_id, numero)` | Imposible insertar episodios duplicados aunque el cron corra 100 veces. |
| **3. Idempotencia con UPSERT** | `ON CONFLICT (anime_id, numero) DO UPDATE` | Actualiza URLs y servidores sin duplicar filas. |
| **4. Transacciones atómicas** | Transacción `BEGIN ... COMMIT` por anime en el scraper | Si falla a la mitad, no quedan temporadas ni episodios corruptos. |
| **5. Registro de scraping (Logs)** | Tabla `scraping_logs` con fuente, fecha y estado | Permite monitorear el scraper desde el panel de Supabase. |
| **6. Normalización antes de guardar** | Episodios siempre `>= 1`; especiales van marcados como `tipo = 'especial'`; no crear episodios que no se han emitido | No hay desfases ni episodios fantasma. |
| **7. Validación contra AniList** | Si el anime está en `en_espera` (NOT_YET_RELEASED), 0 episodios. Si `encontrados > esperados`, marcar `necesita_revision` | Control de calidad automático. |

---

## 🚀 Cómo aplicar en tu panel de Supabase

1. Abre tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. Ve a la pestaña **SQL Editor** en la barra lateral izquierda.
3. Abre el archivo `supabase/schema.sql` de este repositorio.
4. Pega todo el contenido en el editor y presiona **RUN**.
5. Las tablas, constraints, índices y políticas RLS públicas quedarán configuradas al 100%.
