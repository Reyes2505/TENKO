// src/actions/watchlist.ts
import { supabase } from '@/lib/supabase';
import { WatchlistItem, WatchlistStatus, Anime } from '@/types/database';
import { saveTracking, getTracking, TrackingData } from '@/lib/tracking';

export interface WatchlistActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Obtiene el estado actual del anime en la lista del usuario (viendo, visto, por_ver, favorito, o null si no está)
 */
export async function getAnimeWatchlistStatusAction(animeId: string): Promise<WatchlistStatus | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'usr_tenko_tester_001';

    // 1. Intentar consultar en Supabase
    const { data } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .maybeSingle();

    if (data && data.estado) {
      return data.estado as WatchlistStatus;
    }

    // 2. Respaldo con tracking local
    const localTracking = getTracking();
    if (localTracking[animeId]?.estado) {
      return localTracking[animeId].estado as WatchlistStatus;
    }

    return null;
  } catch (err: any) {
    console.error('Error fetching anime watchlist status:', err);
    return null;
  }
}

/**
 * Agrega o actualiza el estado de un anime en la lista personal del usuario
 */
export async function addToWatchlistAction(
  animeId: string,
  estado: WatchlistStatus = 'viendo',
  ultimoEpisodio: number = 1
): Promise<WatchlistActionResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'usr_tenko_tester_001';

    const item: Partial<WatchlistItem> = {
      id: `${userId}_${animeId}`,
      user_id: userId,
      anime_id: animeId,
      estado,
      ultimo_episodio: ultimoEpisodio,
      updated_at: new Date().toISOString(),
    };

    // 1. Guardar en Supabase / Mock store
    await supabase.from('watchlist').upsert(item);

    // 2. Sincronizar con el tracking local para persistencia offline
    const local = getTracking();
    local[animeId] = {
      animeId,
      estado: estado === 'favorito' ? 'viendo' : estado,
      ultimoEpisodio,
      progreso: estado === 'visto' ? 100 : 50,
      actualizadoEn: Date.now(),
    };
    saveTracking(local);

    return {
      success: true,
      data: { estado, animeId },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error al actualizar lista',
    };
  }
}

/**
 * Elimina un anime de la lista del usuario
 */
export async function removeFromWatchlistAction(animeId: string): Promise<WatchlistActionResult> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'usr_tenko_tester_001';

    await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('anime_id', animeId);

    // Limpiar tracking local
    const local = getTracking();
    if (local[animeId]) {
      delete local[animeId];
      saveTracking(local);
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error al remover de la lista',
    };
  }
}

/**
 * Obtiene toda la lista de seguimiento del usuario con datos hidratados del anime
 */
export async function getWatchlistAction(): Promise<{
  success: boolean;
  data: WatchlistItem[];
  error?: string;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'usr_tenko_tester_001';

    const { data: items } = await supabase
      .from('watchlist')
      .select('*')
      .eq('user_id', userId);

    const { data: allAnimes } = await supabase.from('animes').select('*');
    const animesMap = new Map((allAnimes || []).map((a: Anime) => [a.id, a]));

    const result: WatchlistItem[] = (items || []).map((item: any) => ({
      ...item,
      anime: animesMap.get(item.anime_id),
    }));

    return {
      success: true,
      data: result,
    };
  } catch (err: any) {
    return {
      success: false,
      data: [],
      error: err?.message || 'Error al cargar watchlist',
    };
  }
}
