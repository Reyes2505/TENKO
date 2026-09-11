export type StreamType = 'local' | 'online';

export interface Temporada {
  id: string;
  anime_id?: string | null;
  nombre: string;
  descripcion?: string | null;
  orden?: number | null;
  anio_lanzamiento?: number | null;
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
  estado_emision?: string | null;
  fecha_estreno?: string | null;
  generos?: string[] | null;
  created_at?: string | null;
}

export interface Episodio {
  id: string;
  anime_id?: string | null;
  temporada_id?: string | null;
  numero: number;
  titulo: string;
  titulo_episodio?: string | null;   // ← NUEVO: nombre del episodio (ej: "El encuentro")
  descripcion?: string | null;        // ← NUEVO: descripción del episodio
  url_stream: string;
  tipo_stream?: StreamType;
  duracion?: string | number | null;
  duracion_total?: number | null;     // ← NUEVO: duración en segundos
  segundo_actual?: number | null;     // ← NUEVO: progreso de visualización
  thumbnail_url?: string | null;
  fecha_emision?: string | null;      // ← NUEVO: fecha de emisión (YYYY-MM-DD)
  visto?: boolean | null;
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
  isSystem?: boolean; // ej: 'Favoritos', 'Por Ver'
  createdAt: number;
  episodeIds: string[];
  animeIds: string[];
}

export type FilterSeason = 'all' | string;
export type SortOrder = 'asc' | 'desc';
