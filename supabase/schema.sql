-- ==============================================================================
-- TENKO ANIME - ESQUEMA COMPLETO DE BASE DE DATOS PARA SUPABASE
-- ==============================================================================
-- Copia y pega este script completo en el "SQL Editor" de tu panel de Supabase
-- para crear todas las tablas, tipos, índices, políticas de seguridad (RLS)
-- y triggers necesarios para el funcionamiento de TENKO.
-- ==============================================================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- TABLA: animes
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.animes (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    titulo_ingles TEXT,
    titulo_nativo TEXT,
    sinopsis TEXT,
    portada_url TEXT,
    banner_url TEXT,
    generos TEXT[] DEFAULT '{}',
    estado_emision TEXT DEFAULT 'emitido', -- 'emitido', 'en_espera', 'suspendido', 'terminado'
    total_episodios INTEGER,
    duracion INTEGER DEFAULT 24,
    puntuacion NUMERIC(4, 1) DEFAULT 80,
    fecha_estreno TEXT,
    anio INTEGER,
    temporada TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- TABLA: temporadas
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.temporadas (
    id TEXT PRIMARY KEY,
    anime_id TEXT NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL DEFAULT 'Temporada 1',
    numero INTEGER NOT NULL DEFAULT 1,
    descripcion TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- TABLA: episodios
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.episodios (
    id TEXT PRIMARY KEY,
    anime_id TEXT NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
    temporada_id TEXT REFERENCES public.temporadas(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    titulo_episodio TEXT,
    url_stream TEXT NOT NULL,
    tipo_stream TEXT DEFAULT 'online',
    duracion TEXT DEFAULT '24m',
    thumbnail_url TEXT,
    fecha_emision TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- TABLA: progreso_episodios (Barra de progreso visual y tiempo visto en BD)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.progreso_episodios (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    anime_id TEXT NOT NULL,
    episodio_id TEXT NOT NULL,
    numero_episodio INTEGER DEFAULT 1,
    tiempo_visto NUMERIC DEFAULT 0,
    duracion_total NUMERIC DEFAULT 1440,
    porcentaje NUMERIC DEFAULT 0,
    completado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_user_episodio UNIQUE (user_id, episodio_id)
);

-- ==============================================================================
-- TABLA: watchlist (Mi Lista: viendo, por ver, visto, favorito)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.watchlist (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    user_id TEXT NOT NULL,
    anime_id TEXT NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
    estado TEXT NOT NULL DEFAULT 'viendo', -- 'viendo', 'visto', 'por_ver', 'favorito'
    ultimo_episodio INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_user_anime_watchlist UNIQUE (user_id, anime_id)
);

-- ==============================================================================
-- TABLA: comentarios (Reseñas, opiniones y valoraciones comunitarias)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comentarios (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    anime_id TEXT NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
    episodio_id TEXT REFERENCES public.episodios(id) ON DELETE SET NULL,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    user_avatar TEXT,
    contenido TEXT NOT NULL,
    calificacion INTEGER DEFAULT 5,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    es_spoiler BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- TABLA: peticiones (Solicitudes y votaciones comunitarias)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.peticiones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    titulo TEXT NOT NULL,
    url TEXT,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'en_revision', 'completada', 'rechazada'
    votos INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- TABLA: valoraciones
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.valoraciones (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    anime_id TEXT NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    puntuacion NUMERIC(3, 1) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_user_anime_valoracion UNIQUE (user_id, anime_id)
);

-- ==============================================================================
-- TABLA: profiles / perfiles
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE,
    name TEXT,
    handle TEXT,
    bio TEXT,
    avatar_url TEXT,
    banner_url TEXT,
    audio_source TEXT DEFAULT 'none',
    is_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.perfiles (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    is_admin BOOLEAN DEFAULT false,
    username TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- ÍNDICES PARA ALTO RENDIMIENTO
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_animes_fecha_estreno ON public.animes(fecha_estreno DESC);
CREATE INDEX IF NOT EXISTS idx_animes_estado ON public.animes(estado_emision);
CREATE INDEX IF NOT EXISTS idx_episodios_anime ON public.episodios(anime_id, numero);
CREATE INDEX IF NOT EXISTS idx_progreso_user_anime ON public.progreso_episodios(user_id, anime_id);
CREATE INDEX IF NOT EXISTS idx_progreso_episodio ON public.progreso_episodios(episodio_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist(user_id, estado);
CREATE INDEX IF NOT EXISTS idx_comentarios_anime ON public.comentarios(anime_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_peticiones_votos ON public.peticiones(votos DESC);

-- ==============================================================================
-- TRIGGER PARA ACTUALIZAR updated_at AUTOMÁTICAMENTE
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_animes_updated_at ON public.animes;
CREATE TRIGGER trigger_animes_updated_at BEFORE UPDATE ON public.animes
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_episodios_updated_at ON public.episodios;
CREATE TRIGGER trigger_episodios_updated_at BEFORE UPDATE ON public.episodios
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_progreso_updated_at ON public.progreso_episodios;
CREATE TRIGGER trigger_progreso_updated_at BEFORE UPDATE ON public.progreso_episodios
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_watchlist_updated_at ON public.watchlist;
CREATE TRIGGER trigger_watchlist_updated_at BEFORE UPDATE ON public.watchlist
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- SEGURIDAD: ROW LEVEL SECURITY (RLS) Y POLÍTICAS PERMISIVAS
-- ==============================================================================
-- Permite lectura pública de catálogo y episodios sin restricciones,
-- evitando que consultas devuelvan un catálogo vacío cuando RLS está activo.

ALTER TABLE public.animes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.temporadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episodios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progreso_episodios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peticiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valoraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura pública (SELECT para todos)
CREATE POLICY "Public Read animes" ON public.animes FOR SELECT USING (true);
CREATE POLICY "Public Read temporadas" ON public.temporadas FOR SELECT USING (true);
CREATE POLICY "Public Read episodios" ON public.episodios FOR SELECT USING (true);
CREATE POLICY "Public Read comentarios" ON public.comentarios FOR SELECT USING (true);
CREATE POLICY "Public Read peticiones" ON public.peticiones FOR SELECT USING (true);
CREATE POLICY "Public Read valoraciones" ON public.valoraciones FOR SELECT USING (true);
CREATE POLICY "Public Read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public Read perfiles" ON public.perfiles FOR SELECT USING (true);

-- Políticas de escritura permisivas para interacción de usuario y progreso
CREATE POLICY "Allow All progreso_episodios" ON public.progreso_episodios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All watchlist" ON public.watchlist FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All comentarios" ON public.comentarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All peticiones" ON public.peticiones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All valoraciones" ON public.valoraciones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow All perfiles" ON public.perfiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Admin animes" ON public.animes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Admin episodios" ON public.episodios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow Admin temporadas" ON public.temporadas FOR ALL USING (true) WITH CHECK (true);
