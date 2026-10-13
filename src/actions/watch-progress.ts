// src/actions/watch-progress.ts
import { supabase } from '@/lib/supabase';
import { ProgresoEpisodio } from '@/types/database';
import {
  recordEpisodeWatchTimeInDB,
  fetchWatchProgressForAnime,
  formatDurationSeconds,
} from '@/lib/watch-progress';

export interface WatchProgressInput {
  animeId: string;
  episodeId: string;
  episodeNumber: number;
  currentTime: number;
  duration: number;
}

/**
 * Guarda o actualiza el progreso de visualización de un episodio en la base de datos
 */
export async function saveWatchProgressAction(input: WatchProgressInput) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'usr_tenko_tester_001';

    const res = await recordEpisodeWatchTimeInDB({
      animeId: input.animeId,
      episodeId: input.episodeId,
      episodeNumber: input.episodeNumber,
      currentTime: input.currentTime,
      duration: input.duration,
      userId,
    });

    return {
      success: true,
      data: res,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error guardando progreso de reproducción',
    };
  }
}

/**
 * Obtiene el mapa de progreso de episodios para un anime específico
 */
export async function getAnimeWatchProgressAction(animeId: string, episodeIds?: string[]) {
  try {
    const map = await fetchWatchProgressForAnime(animeId, episodeIds || []);
    return {
      success: true,
      data: map,
    };
  } catch (err: any) {
    return {
      success: false,
      data: {} as Record<string, ProgresoEpisodio>,
      error: err?.message || 'Error obteniendo progreso',
    };
  }
}

/**
 * Marca un episodio como 100% completado
 */
export async function markEpisodeCompletedAction(
  animeId: string,
  episodeId: string,
  episodeNumber: number,
  durationSeconds: number = 1440
) {
  return saveWatchProgressAction({
    animeId,
    episodeId,
    episodeNumber,
    currentTime: durationSeconds,
    duration: durationSeconds,
  });
}
