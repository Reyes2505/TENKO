import { Anime, Episodio, UserProfile, CustomList } from '@/types/database';

const KEYS = {
  ANIMES: 'santuario_local_animes_v1',
  EPISODES: 'santuario_local_episodes_v1',
  HIDDEN_EPISODES: 'santuario_hidden_episodes_v1',
  PROFILE: 'santuario_user_profile_v1',
  LISTS: 'santuario_custom_lists_v1',
  FAVORITES: 'santuario_favorites_v1',
};

// --- ANIMES ---
export const DEFAULT_MUSHOKU_ANIME: Anime = {
  id: 'mushoku-tensei-main',
  titulo: 'Mushoku Tensei: Jobless Reincarnation',
  sinopsis:
    'Un otaku desempleado de 34 años muere atropellado por un camión y renace en un mundo de fantasía con magia e espadas como Rudeus Greyrat, manteniendo los recuerdos de su vida anterior.',
  portada_url: 'https://images.justwatch.com/poster/243888320/s718/mushoku-tensei-jobless-reincarnation.jpg',
  banner_url: 'https://wallpapercave.com/wp/wp8527011.jpg',
  trailer_url: '/videos/trailers/mushoku_trailer.mp4',
  trailer_type: 'local',
  created_at: new Date().toISOString(),
};

export function getLocalAnimes(): Anime[] {
  if (typeof window === 'undefined') return [DEFAULT_MUSHOKU_ANIME];
  try {
    const raw = localStorage.getItem(KEYS.ANIMES);
    const list: Anime[] = raw ? JSON.parse(raw) : [];
    if (!list.some((a) => a.id === DEFAULT_MUSHOKU_ANIME.id)) {
      list.unshift(DEFAULT_MUSHOKU_ANIME);
    }
    return list;
  } catch {
    return [DEFAULT_MUSHOKU_ANIME];
  }
}

export function saveLocalAnime(anime: Anime): Anime[] {
  if (typeof window === 'undefined') return [];
  const list = getLocalAnimes();
  const index = list.findIndex((a) => a.id === anime.id);
  if (index >= 0) {
    list[index] = anime;
  } else {
    list.push(anime);
  }
  localStorage.setItem(KEYS.ANIMES, JSON.stringify(list));
  return list;
}

export function deleteLocalAnime(animeId: string): Anime[] {
  if (typeof window === 'undefined') return [];
  const list = getLocalAnimes().filter((a) => a.id !== animeId);
  localStorage.setItem(KEYS.ANIMES, JSON.stringify(list));
  return list;
}

// --- EPISODIOS LOCALES & ELIMINACIÓN TOTAL ---
export function getLocalEpisodes(): Episodio[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEYS.EPISODES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalEpisode(episodio: Episodio): Episodio[] {
  if (typeof window === 'undefined') return [];
  const list = getLocalEpisodes();
  const index = list.findIndex((e) => e.id === episodio.id);
  if (index >= 0) {
    list[index] = episodio;
  } else {
    list.push(episodio);
  }
  localStorage.setItem(KEYS.EPISODES, JSON.stringify(list));
  // Remover de lista de ocultados si fue guardado de nuevo
  restoreEpisode(episodio.id);
  return list;
}

// --- EPISODIOS ELIMINADOS / OCULTADOS (DE SUPABASE O LOCAL) ---
export function getHiddenEpisodeIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEYS.HIDDEN_EPISODES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function hideEpisode(episodeId: string): string[] {
  if (typeof window === 'undefined') return [];
  const hidden = getHiddenEpisodeIds();
  if (!hidden.includes(episodeId)) {
    hidden.push(episodeId);
    localStorage.setItem(KEYS.HIDDEN_EPISODES, JSON.stringify(hidden));
  }
  return hidden;
}

export function restoreEpisode(episodeId: string): string[] {
  if (typeof window === 'undefined') return [];
  const hidden = getHiddenEpisodeIds().filter((id) => id !== episodeId);
  localStorage.setItem(KEYS.HIDDEN_EPISODES, JSON.stringify(hidden));
  return hidden;
}

export function deleteLocalEpisode(episodeId: string): Episodio[] {
  if (typeof window === 'undefined') return [];
  // 1. Eliminar de lista local
  const list = getLocalEpisodes().filter((e) => e.id !== episodeId);
  localStorage.setItem(KEYS.EPISODES, JSON.stringify(list));
  // 2. Registrar como ocultado para que desaparezca también si venía de Supabase
  hideEpisode(episodeId);
  return list;
}

// --- PERFIL DE USUARIO ---
export const DEFAULT_PROFILE: UserProfile = {
  id: 'user-default',
  username: 'Anime Otaku Offline',
  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=TenkoOtaku',
  bio: 'Coleccionista de anime local y explorador del universo TENKO.',
  favorite_genre: 'Isekai / Fantasía',
  joined_date: new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
};

export function getUserProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(KEYS.PROFILE);
    return raw ? JSON.parse(raw) : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function updateUserProfile(profile: Partial<UserProfile>): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  const current = getUserProfile();
  const updated = { ...current, ...profile };
  localStorage.setItem(KEYS.PROFILE, JSON.stringify(updated));
  return updated;
}

// --- LISTAS PERSONALIZADAS Y FAVORITOS ---
export function getCustomLists(): CustomList[] {
  if (typeof window === 'undefined') return getDefaultLists();
  try {
    const raw = localStorage.getItem(KEYS.LISTS);
    if (!raw) {
      const defaults = getDefaultLists();
      localStorage.setItem(KEYS.LISTS, JSON.stringify(defaults));
      return defaults;
    }
    return JSON.parse(raw);
  } catch {
    return getDefaultLists();
  }
}

function getDefaultLists(): CustomList[] {
  return [
    {
      id: 'list-favorites',
      name: 'Mis Favoritos',
      description: 'Episodios y animes guardados como favoritos.',
      isSystem: true,
      createdAt: Date.now(),
      episodeIds: [],
      animeIds: [DEFAULT_MUSHOKU_ANIME.id],
    },
    {
      id: 'list-watchlist',
      name: 'Por Ver / Pendientes',
      description: 'Episodios o temporadas que planeas ver más adelante.',
      isSystem: true,
      createdAt: Date.now(),
      episodeIds: [],
      animeIds: [],
    },
  ];
}

export function saveCustomList(list: CustomList): CustomList[] {
  if (typeof window === 'undefined') return [];
  const lists = getCustomLists();
  const index = lists.findIndex((l) => l.id === list.id);
  if (index >= 0) {
    lists[index] = list;
  } else {
    lists.push(list);
  }
  localStorage.setItem(KEYS.LISTS, JSON.stringify(lists));
  return lists;
}

export function deleteCustomList(listId: string): CustomList[] {
  if (typeof window === 'undefined') return [];
  const lists = getCustomLists().filter((l) => l.id !== listId || l.isSystem);
  localStorage.setItem(KEYS.LISTS, JSON.stringify(lists));
  return lists;
}

export function toggleFavoriteEpisode(episodeId: string): boolean {
  if (typeof window === 'undefined') return false;
  const lists = getCustomLists();
  const favList = lists.find((l) => l.id === 'list-favorites');
  if (!favList) return false;

  const exists = favList.episodeIds.includes(episodeId);
  if (exists) {
    favList.episodeIds = favList.episodeIds.filter((id) => id !== episodeId);
  } else {
    favList.episodeIds.push(episodeId);
  }

  saveCustomList(favList);
  return !exists;
}

export function isEpisodeFavorite(episodeId: string): boolean {
  const lists = getCustomLists();
  const favList = lists.find((l) => l.id === 'list-favorites');
  return favList ? favList.episodeIds.includes(episodeId) : false;
}
