// src/lib/catalog-fallback.ts
// Versión corregida: consulta Supabase. Sin datos mock ni episodios falsos.

import { supabase } from '@/lib/supabase';
import { Anime, Episodio } from '@/types/database';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * El catálogo de fallback está desactivado. La home siempre consulta Supabase.
 */
export function getFallbackCatalog(): Anime[] {
  return [];
}

/**
 * Busca un anime en Supabase por UUID o por slug de AnimeAV1.
 * Si no existe, devuelve null (no inventa datos).
 */
export async function getAnimeWithFallback(id: string): Promise<{
  anime: Anime | null;
  episodios: Episodio[];
}> {
  if (!id) return { anime: null, episodios: [] };

  let anime: Anime | null = null;

  // 1. Buscar por UUID
  if (UUID_REGEX.test(id)) {
    const { data } = await supabase
      .from('animes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    anime = (data as Anime) || null;
  }

  // 2. Buscar por slug de AnimeAV1
  if (!anime) {
    const { data } = await supabase
      .from('animes')
      .select('*')
      .eq('animeav1_slug', id)
      .maybeSingle();
    anime = (data as Anime) || null;
  }

  if (!anime) return { anime: null, episodios: [] };

  // 3. Traer temporadas
  const { data: temporadas } = await supabase
    .from('temporadas')
    .select('id')
    .eq('anime_id', anime.id);

  const tempIds = (temporadas || []).map((t) => t.id);

  if (tempIds.length === 0) return { anime, episodios: [] };

  // 4. Traer episodios
  const { data: episodios } = await supabase
    .from('episodios')
    .select('*')
    .in('temporada_id', tempIds)
    .order('numero', { ascending: true });

  return {
    anime,
    episodios: (episodios || []) as Episodio[],
  };
}

/**
 * Resuelve un episodio por UUID desde Supabase.
 * Devuelve null si no existe (no genera episodios falsos).
 */
export async function getEpisodeWithFallback(episodeId: string): Promise<{
  episodio: Episodio | null;
  anime: Anime | null;
  mismaTemporada: Episodio[];
}> {
  if (!episodeId || !UUID_REGEX.test(episodeId)) {
    return { episodio: null, anime: null, mismaTemporada: [] };
  }

  const { data: ep } = await supabase
    .from('episodios')
    .select('*')
    .eq('id', episodeId)
    .maybeSingle();

  if (!ep) return { episodio: null, anime: null, mismaTemporada: [] };

  // Traer la temporada y el anime
  const { data: temp } = await supabase
    .from('temporadas')
    .select('id, anime_id')
    .eq('id', (ep as any).temporada_id)
    .maybeSingle();

  let anime: Anime | null = null;
  if (temp?.anime_id) {
    const { data: a } = await supabase
      .from('animes')
      .select('*')
      .eq('id', temp.anime_id)
      .maybeSingle();
    anime = (a as Anime) || null;
  }

  // Traer el resto de episodios de la misma temporada
  const { data: mismos } = await supabase
    .from('episodios')
    .select('*')
    .eq('temporada_id', (ep as any).temporada_id)
    .order('numero', { ascending: true });

  return {
    episodio: ep as Episodio,
    anime,
    mismaTemporada: (mismos || []) as Episodio[],
  };
}
