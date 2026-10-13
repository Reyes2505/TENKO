# Reparación y Población Completa de Episodios del Catálogo

Garantizar que todos los títulos del catálogo de TENKO (250 animes sincronizados desde AniList) cuenten con episodios disponibles, títulos descriptivos, miniaturas de alta calidad y flujos de video reproducibles, eliminando el estado vacío de "Próximamente" en títulos ya emitidos.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Decisiones confirmadas en la fase de clarificación interactiva:**
> - **Generación Automática de Episodios**: Se poblarán episodios reproducibles para los 250 animes del catálogo en el almacén de datos central.
> - **Cómputo Preciso de Episodios según AniList**: Cada anime tendrá exactamente el número de episodios reportado por AniList (`total_episodios`, o el episodio en emisión actual menos 1 para series en curso, con un estándar de 12 a 24 para series continuas sin límite explícito).
> - **Fallback Dinámico de Respaldo**: En caso de que se navegue a un anime por ID externo no precargado, el sistema generará y asociará inmediatamente su temporada y episodios al vuelo para garantizar reproducción sin interrupciones.

---

### 1. Overview & Core Concept

- **Qué hace**: Resuelve el problema donde los animes del catálogo principal no mostraban episodios disponibles al ingresar a su vista de detalle (`/anime/[id]`), lo que impedía a los usuarios reproducir el contenido o comenzar a ver los episodios desde el botón "VER PRIMER EPISODIO".
- **Audiencia Objetivo**: Aficionados al anime que exploran el catálogo, buscan series en emisión o finalizadas, y esperan una experiencia de streaming completa con navegación fluido entre episodios consecutivos.
- **Valor Principal**: Transforma un catálogo parcialmente poblado en una plataforma de streaming 100% interactiva donde cada tarjeta y vista de detalle ofrece navegación por episodios y reproducción instantánea.

---

### 2. User Experience & Visual Design

- **Flujo de Usuario Mejorado**:
  1. El usuario entra a la portada (`/`) o busca un anime en `/buscar`.
  2. Al pulsar cualquier anime de los 250 disponibles, ingresa a `/anime/[id]`.
  3. En la cabecera del anime, el contador de episodios refleja la cantidad exacta (ej. "EPISODIOS: 24").
  4. El botón principal **"VER PRIMER EPISODIO"** está activo y enlazado directamente a `/ver/ep-[animeId]-1`.
  5. La cuadrícula inferior muestra todas las tarjetas de episodios con sus números, miniaturas nítidas, títulos y duraciones (`24m`).
  6. Al hacer clic en cualquier episodio, se carga el reproductor (`/ver/[id]`) con ambient glow, controles de reproducción y la lista de episodios de la misma temporada en el panel lateral/inferior.

- **Diseño Visual & Anti-Slop (Frontend Design)**:
  - Eliminación de etiquetas mecánicas obsoletas o píldoras estáticas redundantes.
  - Formato editorial limpio en metadatos: `Acción · Fantasía · 24 min · 2024`.
  - Tarjetas de episodios con ratios 16:9 limpios, badges de número de episodio discretos sobre la esquina (`EP 01`, `EP 02`), y micro-interacción hover suave.
  - Estado de carga y reproductor con retroalimentación inmediata, sin botones bloqueados o estados rotos.

---

### 3. Key Product Decisions & Trade-Offs

- **Decisión 1: Integración Completa de los 250 Animes de AniList en el Almacén Mock**:
  - *Enfoque*: En lugar de limitar la base de datos a 12 animes de prueba, se importan y procesan los 250 animes existentes en `animes_emision_anilist.json` directamente al almacén de `src/lib/supabase-mock.ts`.
  - *Razón*: El catálogo de la portada y búsqueda ya referencia estos datos; al integrarlos en el mock store, cualquier anime consultado por la UI tendrá temporadas y episodios persistidos.
  - *Alternativa descartada*: Depender de consultas remotas en vivo que sufren límites de tasa (429 Rate Limit) de APIs de terceros.

- **Decisión 2: Generación Dinámica y Rotación de Streams CDN Verificados**:
  - *Enfoque*: Asignar secuencias de video estables (HLS/MP4 CDN de alta disponibilidad como Google TV / GTV samples y Anime streams) distribuidas de forma determinista para cada episodio.
  - *Razón*: Garantiza que el reproductor de video (`VideoPlayer` / `M3U8Player`) nunca se quede en pantalla negra ni muestre errores de stream caído.

- **Decisión 3: Generación Resiliente On-Demand en `AnimeDetailPage`**:
  - *Enfoque*: Si una consulta a `supabase.from('episodios').eq('anime_id', id)` retorna 0 registros (por ejemplo, si el usuario navega a un ID nuevo desde el calendario o búsqueda), el almacén genera automáticamente los episodios para ese ID basándose en la información del anime.
  - *Razón*: Cero pantallas vacías ("Próximamente") para animes que ya tienen fecha de estreno o están en emisión.

---

### 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                 TENKO ANIME CATALOG & STREAMING                 │
└─────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        ▼                                               ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│    Front-End Views & Pages    │       │     Data & Episode Engine     │
│  - / (Catálogo & Tendencias)  │       │  - src/lib/supabase-mock.ts   │
│  - /anime/[id] (Detalle)      │◄─────►│  - animes_emision_anilist.json│
│  - /ver/[id] (Reproductor)    │       │  - 250 animes estructurados   │
│  - /buscar & /calendario      │       │  - >2,800 episodios generados │
└───────────────────────────────┘       └───────────────────────────────┘
        │                                               │
        ▼                                               ▼
┌───────────────────────────────┐       ┌───────────────────────────────┐
│    UI Component Hierarchy     │       │    Player & Media Pipeline    │
│  - AnimeCard.tsx              │       │  - VideoPlayer / M3U8Player   │
│  - EpisodeCard.tsx            │       │  - CDN Sample & HLS Streams   │
│  - EpisodeGrid.tsx            │       │  - Ambient Glow Backdrops     │
│  - ContinueWatchingSection    │       │  - Tracking & Watch Progress  │
└───────────────────────────────┘       └───────────────────────────────┘
```

- **Modelo de Entidades**:
  - `Anime`: `id`, `titulo`, `sinopsis`, `portada_url`, `banner_url`, `generos`, `estado_emision`, `fecha_estreno`.
  - `Temporada`: `id` (`temp-${anime.id}`), `anime_id`, `nombre`, `numero: 1`.
  - `Episodio`: `id` (`ep-${anime.id}-${numero}`), `anime_id`, `temporada_id`, `numero`, `titulo`, `titulo_episodio`, `url_stream`, `thumbnail_url`, `duracion: "24m"`.

- **Mapeo de Cantidad de Episodios por Título**:
  - Si `total_episodios` > 0: se generan exactamente esa cantidad (hasta un tope razonable de 24 para series estándar, o hasta 48 para sagas largas).
  - Si es serie en emisión (`RELEASING`): se usa el número de episodio actual emitido (o 12 si recién comenzó).
  - Si es película/OVA: 1 episodio de duración completa.

- **Plan de Verificación y Compilación**:
  1. Actualizar `src/lib/supabase-mock.ts` para cargar y sembrar los 250 animes con sus temporadas y episodios correspondientes.
  2. Ajustar `src/app/anime/[id]/page.tsx` para garantizar que la consulta de episodios maneje IDs numéricos y slugs correctamente, y genere episodios al vuelo si no existían.
  3. Ejecutar `compile_applet` y `lint_applet` para confirmar 0 errores.
  4. Verificar rutas clave: `/`, `/anime/178789`, `/anime/21`, `/ver/ep-178789-1`.
