/**
 * Cliente para AnimeAV1 vía paquete animeav1-api
 */

import {
  getAnime,
  searchAnime,
  getCatalog,
  getEpisode,
} from 'animeav1-api';

export interface AnimeAV1Search {
  title: string;
  slug: string;
  image: string;
}

export interface AnimeAV1Detail {
  title: string;
  slug: string;
  synopsis: string;
  poster: string;
  backdrop: string;
  episodes: { id: number; number: number }[];
  genres: { id: number; name: string }[];
  status: string;
  episodesCount: number;
}

export interface AnimeAV1Mirror {
  server: string;
  url: string;
  lang?: 'SUB' | 'DUB';
}

export interface AnimeAV1Episode {
  id: number;
  number: number;
  embeds: AnimeAV1Mirror[];
  downloads: AnimeAV1Mirror[];
}

/**
 * Aplana un objeto { SUB?: [...], DUB?: [...] } en un array plano
 */
function aplanarMirrors(
  input: any,
  langFallback: 'SUB' | 'DUB' = 'SUB'
): AnimeAV1Mirror[] {
  if (!input) return [];
  if (Array.isArray(input)) return input;

  const out: AnimeAV1Mirror[] = [];
  for (const lang of ['SUB', 'DUB'] as const) {
    const arr = input[lang];
    if (Array.isArray(arr)) {
      for (const item of arr) {
        out.push({
          server: item.server || item.name || 'Desconocido',
          url: item.url || item.link || '',
          lang,
        });
      }
    }
  }
  return out;
}

export async function buscarAnime(query: string): Promise<AnimeAV1Search[]> {
  try {
    const results = await searchAnime(query);
    return (results || []).map((r: any) => ({
      title: r.title,
      slug: r.slug,
      image: r.image || '',
    }));
  } catch (err) {
    console.error('[AnimeAV1] Error búsqueda:', err);
    return [];
  }
}

export async function obtenerAnime(slug: string): Promise<AnimeAV1Detail | null> {
  try {
    const anime = await getAnime(slug);
    if (!anime) return null;

    return {
      title: anime.title,
      slug,
      synopsis: anime.synopsis || '',
      poster: anime.poster || '',
      backdrop: anime.backdrop || anime.poster || '',
      episodes: anime.episodes || [],
      genres: anime.genres || [],
      status: anime.statusText || anime.status || 'Airing',
      episodesCount: anime.episodesCount || anime.episodes?.length || 0,
    };
  } catch (err) {
    console.error('[AnimeAV1] Error detalle:', err);
    return null;
  }
}

export async function obtenerEpisodio(
  slug: string,
  episodeNumber: number
): Promise<AnimeAV1Episode | null> {
  try {
    const ep = await getEpisode(slug, episodeNumber);
    if (!ep) return null;

    return {
      id: ep.id || episodeNumber,
      number: episodeNumber,
      embeds: aplanarMirrors(ep.embeds),
      downloads: aplanarMirrors(ep.downloads),
    };
  } catch (err) {
    console.error('[AnimeAV1] Error episodio:', err);
    return null;
  }
}

export async function obtenerCatalogo(opts: {
  page?: number;
  genre?: string;
  order?: 'score' | 'popular' | 'title' | 'latest_added' | 'latest_released';
} = {}) {
  try {
    const catalog = await getCatalog(opts);
    return {
      items: catalog.items || [],
      total: catalog.total || 0,
    };
  } catch (err) {
    console.error('[AnimeAV1] Error catálogo:', err);
    return { items: [], total: 0 };
  }
}
