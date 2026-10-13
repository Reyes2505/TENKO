// src/actions/anime.ts
import { supabase } from '@/lib/supabase';
import { Anime, Valoracion } from '@/types/database';
import { getFallbackCatalog } from '@/lib/catalog-fallback';

export interface AnimeFilterOptions {
  genero?: string;
  estado?: string;
  orden?: 'reciente' | 'titulo' | 'popular';
  limite?: number;
}

/**
 * Busca y filtra animes en el catálogo con múltiples criterios
 */
export async function buscarAnimesAction(
  query: string = '',
  filters: AnimeFilterOptions = {}
): Promise<{ success: boolean; data: Anime[]; total: number; error?: string }> {
  try {
    let q = supabase.from('animes').select('*');

    if (query.trim()) {
      const term = `%${query.trim()}%`;
      q = q.or(`titulo.ilike.${term},sinopsis.ilike.${term}`);
    }

    if (filters.estado && filters.estado !== 'todos') {
      q = q.eq('estado_emision', filters.estado);
    }

    let results: Anime[] = [];
    const { data, error } = await q;

    if (!error && data && data.length > 0) {
      results = data as Anime[];
    } else {
      results = getFallbackCatalog();
    }

    // Filtrado en memoria por género si aplica
    if (filters.genero && filters.genero !== 'todos') {
      const genBuscado = filters.genero.toLowerCase();
      results = results.filter((a) =>
        a.generos?.some((g) => g.toLowerCase().includes(genBuscado))
      );
    }

    // Ordenamiento
    if (filters.orden === 'titulo') {
      results.sort((a, b) => a.titulo.localeCompare(b.titulo));
    } else if (filters.orden === 'reciente') {
      results.sort((a, b) =>
        (b.fecha_estreno || '').localeCompare(a.fecha_estreno || '')
      );
    }

    const total = results.length;
    if (filters.limite && filters.limite > 0) {
      results = results.slice(0, filters.limite);
    }

    return {
      success: true,
      data: results,
      total,
    };
  } catch (err: any) {
    return {
      success: false,
      data: [],
      total: 0,
      error: err?.message || 'Error en búsqueda',
    };
  }
}

/**
 * Califica un anime del 1 al 10 o 1 al 5
 */
export async function calificarAnimeAction(
  animeId: string,
  puntuacion: number
): Promise<{ success: boolean; puntuacion: number; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'usr_tenko_tester_001';

    const val: Valoracion = {
      id: `val_${userId}_${animeId}`,
      anime_id: animeId,
      user_id: userId,
      puntuacion,
      created_at: new Date().toISOString(),
    };

    await supabase.from('valoraciones').upsert(val);

    return {
      success: true,
      puntuacion,
    };
  } catch (err: any) {
    return {
      success: false,
      puntuacion: 0,
      error: err?.message || 'Error al calificar anime',
    };
  }
}

/**
 * Obtiene un anime por ID o slug con sus episodios
 */
export async function obtenerAnimeDetalleAction(animeId: string) {
  try {
    const { data: anime } = await supabase
      .from('animes')
      .select('*')
      .eq('id', animeId)
      .maybeSingle();

    if (!anime) {
      return { success: false, data: null, error: 'Anime no encontrado' };
    }

    const { data: episodios } = await supabase
      .from('episodios')
      .select('*')
      .eq('anime_id', anime.id)
      .order('numero', { ascending: true });

    return {
      success: true,
      data: {
        anime,
        episodios: episodios || [],
      },
    };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err?.message || 'Error al obtener anime',
    };
  }
}
