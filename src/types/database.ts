export type StreamType = 'local' | 'online';

export type EstadoEmision = 'emitido' | 'en_espera' | 'suspendido' | 'terminado' | 'desconocido';

export interface Temporada {
  id: string;
  nombre: string;
  descripcion?: string | null;
  created_at?: string | null;
}

export interface Anime {
  id: string;
  titulo: string;
  sinopsis: string;
  portada_url: string;
  banner_url?: string | null;
  trailer_url?: string | null;
  trailer_type?: StreamType;
  generos?: string[];
  fecha_estreno?: string | null;
  fecha_finalizacion?: string | null;
  estado_emision?: EstadoEmision;
  created_at?: string | null;
}

export interface Episodio {
  id: string;
  anime_id?: string | null;
  temporada_id?: string | null;
  numero: number;
  titulo: string;
  // ✅ Nuevos campos usados en EpisodeCard y ver/[id]
  titulo_episodio?: string | null;
  fecha_emision?: string | null;
  duracion_total?: number | null;
  url_stream: string;
  tipo_stream?: StreamType;
  duracion?: string | number | null;
  thumbnail_url?: string | null;
  created_at?: string | null;
}

export interface WatchProgress {
  episodeId: string;
  episodeNumber: number;
  currentTime: number;
  duration: number;
  completed: boolean;
  lastWatchedAt: number;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar_url: string;
  bio: string;
  favorite_genre: string;
  joined_date: string;
}

export interface CustomList {
  id: string;
  name: string;
  description: string;
  isSystem?: boolean;
  createdAt: number;
  episodeIds: string[];
  animeIds: string[];
}

export type FilterSeason = 'all' | string;
export type SortOrder = 'asc' | 'desc';
