# Guía de Estructura de Supabase y GitHub Actions - TENKO

Esta guía explica en detalle cómo está estructurada la base de datos de **TENKO** en Supabase, cómo aplicar el esquema en 1 minuto, cómo poblar el catálogo de más de 250 títulos y cómo funcionan los nuevos **GitHub Actions**.

---

## 1. Estructura de Tablas en Supabase

El archivo SQL completo se encuentra listo en `supabase/schema.sql`.

### 📊 Tablas Principales

| Tabla | Propósito | Campos Clave |
|---|---|---|
| `animes` | Catálogo de series y películas | `id` (AniList o slug), `titulo`, `sinopsis`, `portada_url`, `banner_url`, `generos`, `estado_emision`, `total_episodios`, `fecha_estreno` |
| `temporadas` | Temporadas de cada serie | `id`, `anime_id` (FK animes), `nombre`, `numero`, `descripcion` |
| `episodios` | Lista de capítulos y streaming | `id`, `anime_id` (FK), `temporada_id` (FK), `numero`, `titulo`, `url_stream`, `duracion`, `thumbnail_url` |
| `progreso_episodios` | **Barra de progreso visual** y segundos vistos en BD | `user_id`, `anime_id`, `episodio_id`, `tiempo_visto`, `duracion_total`, `porcentaje`, `completado` |
| `watchlist` | **Mi Lista** de seguimiento | `user_id`, `anime_id`, `estado` (*viendo*, *por_ver*, *visto*, *favorito*), `ultimo_episodio` |
| `comentarios` | Reseñas y opiniones comunitarias | `anime_id`, `episodio_id`, `user_id`, `user_name`, `contenido`, `calificacion` (1-5), `likes`, `es_spoiler` |
| `peticiones` | Solicitudes y votos comunitarios | `titulo`, `url`, `user_id`, `user_name`, `estado` (*pendiente*, *en_revision*, *completada*), `votos` |
| `profiles` / `perfiles` | Perfiles de usuario y administradores | `id`, `user_id`, `name`, `handle`, `bio`, `avatar_url`, `banner_url`, `is_admin` |
| `valoraciones` | Calificación global por usuario | `anime_id`, `user_id`, `puntuacion` |

---

## 2. Cómo Configurar Supabase en 1 Minuto

1. Entra a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. En la barra lateral izquierda, haz clic en **SQL Editor** (icono de terminal).
3. Haz clic en **New query**.
4. Copia el contenido de `supabase/schema.sql` y pégalo en el editor.
5. Haz clic en **Run** (botón verde).
   > Esto creará todas las tablas con sus índices, triggers automáticos para `updated_at` y **Row Level Security (RLS)** configurado con lectura pública para que nunca aparezca el catálogo vacío.

---

## 3. Población del Catálogo (Seed de 250+ Animes)

Tienes **dos opciones** automáticas para cargar los más de 250 animes y sus episodios en tu base de datos de Supabase:

### Opción A: Desde GitHub Actions (Sin tocar la terminal)
1. Ve a tu repositorio en GitHub (`Reyes2505/tenko-anime`).
2. Haz clic en la pestaña **Actions**.
3. Selecciona **"Seed Supabase Catalog & Database"** en el panel izquierdo.
4. Haz clic en **"Run workflow"** -> **"Run workflow"**.
5. El flujo insertará automáticamente todos los animes y episodios en tu base de datos de Supabase.

### Opción B: Desde tu máquina local
Con tus credenciales en `.env.local`:
```bash
npm run seed:supabase
```

---

## 4. GitHub Actions Implementados

Hemos configurado y verificado los flujos de GitHub Actions en `.github/workflows/`:

1. **`ci.yml` (TENKO CI - Build & Lint Check)**:
   - Se ejecuta automáticamente en cada `push` y `pull_request` a `main`/`master`.
   - Ejecuta `npm ci`, `npm run lint` y `npm run build` para garantizar que no se introduzcan errores de compilación antes del despliegue en Vercel.

2. **`seed-supabase.yml` (Seed Supabase Catalog)**:
   - Ejecuta la sincronización masiva del archivo `animes_emision_anilist.json` hacia las tablas `animes`, `temporadas`, `episodios`, `comentarios` y `peticiones`.

3. **`sync-anilist.yml` & `airing-sync-*.yml`**:
   - Flujos periódicos para mantener sincronizados los estrenos de la temporada con AniList y servidores de streaming.

---

## 5. Variables de Entorno Requeridas

Asegúrate de agregar estas variables en **Vercel** (`Settings` -> `Environment Variables`) y en los **Secrets de GitHub** (`Settings` -> `Secrets and variables` -> `Actions`):

| Variable | Descripción | Dónde se usa |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase (`https://xxx.supabase.co`) | Vercel y Frontend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima pública de Supabase | Vercel y Frontend |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave secreta con permisos de administración (opcional para seeds masivos) | GitHub Secrets / Scripts |

---

## 6. Sistema de Respaldo Híbrido (Garantía Anti-Catálogo Vacío)

Para evitar que el catálogo vuelva a quedar vacío si Supabase está offline, recién creado o sin tablas migradas:
- La página de inicio (`/`), el buscador (`/buscar`) y el calendario (`/calendario`) cuentan con un **resguardo automático** a través de `@/lib/catalog-fallback`.
- Si la consulta a Supabase retorna `0` filas o un error, TENKO carga instantáneamente los **250+ animes locales**, manteniendo la web 100% funcional y visible.
- Cuando abras cualquier anime del **Calendario**, ahora navega **directamente dentro de TENKO** a `/anime/[id]` (nunca redirige a AniList externo).
