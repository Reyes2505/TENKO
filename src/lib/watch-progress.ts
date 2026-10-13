// src/lib/watch-progress.ts
// Gestión unificada de progreso de visualización de episodios en base de datos Supabase

import { supabase } from '@/lib/supabase';
import { ProgresoEpisodio } from '@/types/database';
import { saveWatchProgress, getWatchProgressMap } from '@/lib/storage';

const DEFAULT_USER_ID = 'usr_tenko_tester_001';

/**
 * Guarda el tiempo de reproducción actual en la base de datos (tabla progreso_episodios)
 */
export async function recordEpisodeWatchTimeInDB({
  animeId,
  episodeId,
  episodeNumber,
  currentTime,
  duration,
  userId = DEFAULT_USER_ID,
}: {
  animeId?: string;
  episodeId: string;
  episodeNumber: number;
  currentTime: number;
  duration: number;
  userId?: string;
}): Promise<ProgresoEpisodio | null> {
  if (!episodeId || isNaN(currentTime) || currentTime < 0) return null;

  const durTotal = duration && duration > 0 ? Math.floor(duration) : 1440;
  const tiempoVisto = Math.floor(currentTime);
  const porcentaje = Math.min(100, Math.round((tiempoVisto / durTotal) * 100));
  const completado = porcentaje >= 90;

  const record: ProgresoEpisodio = {
    id: `${userId}_${episodeId}`,
    user_id: userId,
    anime_id: animeId || '',
    episodio_id: episodeId,
    numero_episodio: episodeNumber,
    tiempo_visto: tiempoVisto,
    duracion_total: durTotal,
    porcentaje,
    completado,
    updated_at: new Date().toISOString(),
  };

  try {
    // 1. Guardar en Base de Datos Supabase
    await supabase.from('progreso_episodios').upsert(record);

    // 2. Sincronizar en localStorage para redundancia y compatibilidad
    saveWatchProgress(episodeId, episodeNumber, tiempoVisto, durTotal);

    // 3. Disparar evento para que otras pestañas o componentes reaccionen
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('tenko-watch-progress-update', {
          detail: record,
        })
      );
    }

    return record;
  } catch (err) {
    console.warn('[TENKO] Error guardando progreso en BD:', err);
    saveWatchProgress(episodeId, episodeNumber, tiempoVisto, durTotal);
    return record;
  }
}

/**
 * Recupera el progreso de visualización de todos los episodios de un anime registrado en la BD
 */
export async function fetchWatchProgressForAnime(
  animeId: string,
  episodeIds: string[] = []
): Promise<Record<string, ProgresoEpisodio>> {
  const resultMap: Record<string, ProgresoEpisodio> = {};

  try {
    // 1. Consultar base de datos por anime_id
    const { data: dbData } = await supabase
      .from('progreso_episodios')
      .select('*')
      .eq('anime_id', animeId);

    if (Array.isArray(dbData) && dbData.length > 0) {
      dbData.forEach((item: ProgresoEpisodio) => {
        if (item.episodio_id) resultMap[item.episodio_id] = item;
        if (item.numero_episodio) resultMap[`ep_num_${item.numero_episodio}`] = item;
      });
    }

    // 2. Si no hubo resultados o faltan episodios, buscar por IDs de episodio en BD
    if (episodeIds.length > 0) {
      const missingIds = episodeIds.filter((id) => !resultMap[id]);
      if (missingIds.length > 0) {
        const { data: byIdsData } = await supabase
          .from('progreso_episodios')
          .select('*')
          .in('episodio_id', missingIds);

        if (Array.isArray(byIdsData)) {
          byIdsData.forEach((item: ProgresoEpisodio) => {
            if (item.episodio_id) resultMap[item.episodio_id] = item;
            if (item.numero_episodio) resultMap[`ep_num_${item.numero_episodio}`] = item;
          });
        }
      }
    }
  } catch (err) {
    console.warn('[TENKO] Error leyendo progreso de la base de datos:', err);
  }

  // 3. Complementar con almacenamiento local por si hay cambios pendientes
  if (typeof window !== 'undefined') {
    try {
      const localMap = getWatchProgressMap();
      episodeIds.forEach((epId) => {
        const local = localMap[epId];
        if (local && (!resultMap[epId] || local.currentTime > (resultMap[epId]?.tiempo_visto || 0))) {
          const dur = local.duration || 1440;
          const pct = Math.min(100, Math.round((local.currentTime / dur) * 100));
          resultMap[epId] = {
            id: `${DEFAULT_USER_ID}_${epId}`,
            user_id: DEFAULT_USER_ID,
            anime_id: animeId,
            episodio_id: epId,
            numero_episodio: local.episodeNumber,
            tiempo_visto: local.currentTime,
            duracion_total: dur,
            porcentaje: pct,
            completado: pct >= 90,
            updated_at: new Date(local.lastWatchedAt).toISOString(),
          };
        }
      });
    } catch {}
  }

  return resultMap;
}

/**
 * Formatea segundos en mm:ss o hh:mm:ss
 */
export function formatDurationSeconds(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
