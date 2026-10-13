// src/lib/catalog-fallback.ts
import anilistCatalog from '../../animes_emision_anilist.json';
import { Anime, Episodio } from '@/types/database';

function cleanText(text?: string | null): string {
  if (!text) return '';
  return text.replace(/<[^>]+>/g, '').trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const SAMPLE_STREAMS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
];

let cachedCatalog: Anime[] | null = null;

/**
 * Retorna la lista completa de los más de 250 animes incluidos en el catálogo local
 */
export function getFallbackCatalog(): Anime[] {
  if (cachedCatalog) return cachedCatalog;

  cachedCatalog = (anilistCatalog as any[]).map((item, index) => {
    const id = String(item.anilist_id || item.id || index + 1);
    const titulo = item.titulo || item.titulo_ingles || item.titulo_nativo || `Anime #${id}`;
    const portada = item.portada_url || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600';
    const banner = item.banner_url || portada;

    let estado: 'emitido' | 'en_espera' | 'suspendido' | 'terminado' | 'desconocido' = 'emitido';
    if (item.estado === 'FINISHED') estado = 'terminado';
    else if (item.estado === 'NOT_YET_RELEASED') estado = 'en_espera';
    else if (item.estado === 'CANCELLED') estado = 'suspendido';

    return {
      id,
      titulo,
      sinopsis: cleanText(item.sinopsis) || 'Sin descripción disponible para este anime.',
      portada_url: portada,
      banner_url: banner,
      generos: Array.isArray(item.generos) && item.generos.length > 0 ? item.generos : ['Anime'],
      estado_emision: estado,
      fecha_estreno: item.fecha_estreno || (item.anio ? `${item.anio}-01-01` : '2024-01-01'),
      created_at: new Date().toISOString(),
    };
  });

  return cachedCatalog;
}

/**
 * Genera episodios reproducibles para un anime dado
 */
export function generateEpisodesForAnime(
  anime: Anime & { duracion?: number; total_episodios?: number; proximo_episodio?: any },
  baseIndex = 0
): Episodio[] {
  let epCount = 12;

  if (typeof anime.total_episodios === 'number' && anime.total_episodios > 0) {
    epCount = Math.min(anime.total_episodios, 60);
  } else if (anime.proximo_episodio?.numero && anime.proximo_episodio.numero > 1) {
    epCount = Math.max(1, Math.min(50, anime.proximo_episodio.numero - 1));
  }

  const episodes: Episodio[] = [];
  const tempId = `temp-${anime.id}`;
  const banner = anime.banner_url || anime.portada_url || '';

  for (let num = 1; num <= epCount; num++) {
    const streamUrl = SAMPLE_STREAMS[(baseIndex * 3 + num) % SAMPLE_STREAMS.length];
    episodes.push({
      id: `ep-${anime.id}-${num}`,
      anime_id: String(anime.id),
      temporada_id: tempId,
      numero: num,
      titulo: `${anime.titulo} - Episodio ${num}`,
      titulo_episodio: `Capítulo ${num}`,
      url_stream: streamUrl,
      tipo_stream: 'online',
      duracion: '24m',
      thumbnail_url: banner,
      fecha_emision: anime.fecha_estreno || '2024-01-01',
      created_at: new Date().toISOString(),
    });
  }

  return episodes;
}

/**
 * Busca un anime por ID en el catálogo local o consulta directamente a la API de AniList si es un ID de calendario externo
 */
export async function getAnimeWithFallback(id: string): Promise<{
  anime: Anime | null;
  episodios: Episodio[];
}> {
  const catalog = getFallbackCatalog();
  const searchId = String(id).trim();

  // 1. Buscar en el catálogo local
  const match = catalog.find(
    (a) =>
      a.id === searchId ||
      slugify(a.titulo) === slugify(searchId) ||
      a.titulo.toLowerCase() === searchId.toLowerCase()
  );

  if (match) {
    const rawMatch = (anilistCatalog as any[]).find(
      (c) => String(c.anilist_id || c.id) === match.id
    );
    const eps = generateEpisodesForAnime(
      {
        ...match,
        duracion: rawMatch?.duracion,
        total_episodios: rawMatch?.total_episodios,
        proximo_episodio: rawMatch?.proximo_episodio,
      },
      parseInt(match.id, 10) || 1
    );
    return { anime: match, episodios: eps };
  }

  // 2. Si no está en el catálogo y parece un ID numérico (ej. de AniList en el calendario), consultar AniList
  if (/^\d+$/.test(searchId)) {
    try {
      const anilistQuery = `
        query ($id: Int) {
          Media(id: $id, type: ANIME) {
            id
            title { romaji english native }
            coverImage { extraLarge large }
            bannerImage
            description(asHtml: false)
            genres
            status
            episodes
            nextAiringEpisode { episode airingAt }
            startDate { year month day }
            duration
            averageScore
          }
        }
      `;

      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: anilistQuery,
          variables: { id: parseInt(searchId, 10) },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const media = json?.data?.Media;
        if (media) {
          const titulo = media.title?.romaji || media.title?.english || media.title?.native || `Anime #${media.id}`;
          const portada = media.coverImage?.extraLarge || media.coverImage?.large || '';
          const banner = media.bannerImage || portada;

          let estado: 'emitido' | 'en_espera' | 'suspendido' | 'terminado' | 'desconocido' = 'emitido';
          if (media.status === 'FINISHED') estado = 'terminado';
          else if (media.status === 'NOT_YET_RELEASED') estado = 'en_espera';
          else if (media.status === 'CANCELLED') estado = 'suspendido';

          let fechaEstreno = '2024-01-01';
          if (media.startDate?.year) {
            const m = String(media.startDate.month || 1).padStart(2, '0');
            const d = String(media.startDate.day || 1).padStart(2, '0');
            fechaEstreno = `${media.startDate.year}-${m}-${d}`;
          }

          const animeRecord: Anime = {
            id: String(media.id),
            titulo,
            sinopsis: cleanText(media.description) || 'Sin descripción disponible para este anime.',
            portada_url: portada,
            banner_url: banner,
            generos: media.genres || ['Anime'],
            estado_emision: estado,
            fecha_estreno: fechaEstreno,
            created_at: new Date().toISOString(),
          };

          const eps = generateEpisodesForAnime(
            {
              ...animeRecord,
              duracion: media.duration,
              total_episodios: media.episodes,
              proximo_episodio: media.nextAiringEpisode,
            },
            media.id
          );

          return { anime: animeRecord, episodios: eps };
        }
      }
    } catch (err) {
      console.warn('Error resolviendo anime en AniList:', err);
    }
  }

  return { anime: null, episodios: [] };
}
