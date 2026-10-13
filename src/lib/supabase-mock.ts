// In-memory mock database & client for Supabase with complete 250-anime catalog and episodes
import anilistCatalog from '../../animes_emision_anilist.json';
import { Anime, Episodio, Temporada } from '@/types/database';

export interface MockUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

const DEFAULT_USER: MockUser = {
  id: "usr_tenko_tester_001",
  email: "aaronreyesabantoj3@gmail.com",
  user_metadata: {
    full_name: "Aaron Reyes (Admin)",
    username: "@admin",
    handle: "@admin",
    avatar_url: "https://i.postimg.cc/0j0x4x7G/zerotwo.jpg",
    bio: "Administrador de TENKO AI",
    audio_source: "none",
  },
};

export const SAMPLE_STREAMS = [
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4",
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4",
];

export function cleanText(htmlOrText?: string | null): string {
  if (!htmlOrText) return "";
  return htmlOrText.replace(/<[^>]+>/g, "").trim();
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── GENERADOR DE EPISODIOS ──────────────────────────────────────────
export function generateEpisodesForAnime(
  anime: {
    id: string;
    titulo: string;
    portada_url?: string;
    banner_url?: string | null;
    fecha_estreno?: string | null;
    duracion?: number | null;
    total_episodios?: number | null;
    proximo_episodio?: { numero?: number } | null;
    format?: string;
  },
  animeIndex = 0
): Episodio[] {
  let epCount = 12;

  // Respetar fielmente la cantidad de episodios según AniList
  if (typeof anime.total_episodios === "number" && anime.total_episodios > 0) {
    // Si la serie tiene episodios definidos (ej. 12, 14, 24, 26, 48), respetamos la cantidad
    // con un límite razonable de 75 para rendimiento en memoria
    epCount = Math.min(anime.total_episodios, 75);
  } else if (anime.proximo_episodio?.numero && anime.proximo_episodio.numero > 1) {
    // Si está en emisión, el número de episodios ya emitidos es proximo - 1
    const emitted = anime.proximo_episodio.numero - 1;
    epCount = Math.max(1, Math.min(50, emitted));
  } else if (
    anime.format === "MOVIE" ||
    (typeof anime.duracion === "number" && anime.duracion > 70)
  ) {
    epCount = 1;
  }

  const episodes: Episodio[] = [];
  const tempId = `temp-${anime.id}`;
  const banner = anime.banner_url || anime.portada_url || "";

  for (let num = 1; num <= epCount; num++) {
    const streamUrl = SAMPLE_STREAMS[(animeIndex * 5 + num) % SAMPLE_STREAMS.length];
    episodes.push({
      id: `ep-${anime.id}-${num}`,
      anime_id: String(anime.id),
      temporada_id: tempId,
      numero: num,
      titulo: `${anime.titulo} - Episodio ${num}`,
      titulo_episodio: `Capítulo ${num}`,
      url_stream: streamUrl,
      tipo_stream: "online",
      duracion: `${anime.duracion || 24}m`,
      thumbnail_url: banner,
      fecha_emision: anime.fecha_estreno || "2024-01-01",
      created_at: new Date().toISOString(),
    });
  }

  return episodes;
}

// ─── POBLACIÓN DE DATOS INICIALES DEL CATÁLOGO (250 ANIMES) ───────────
const ALL_ANIMES: Anime[] = [];
const ALL_TEMPORADAS: Temporada[] = [];
const ALL_EPISODIOS: Episodio[] = [];

(anilistCatalog as any[]).forEach((item, index) => {
  const animeId = String(item.anilist_id || item.id || index + 1);
  const titulo = item.titulo || item.titulo_ingles || item.titulo_nativo || `Anime #${animeId}`;
  const portada = item.portada_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600";
  const banner = item.banner_url || portada;

  let estado: 'emitido' | 'en_espera' | 'suspendido' | 'terminado' | 'desconocido' = 'emitido';
  if (item.estado === 'FINISHED') estado = 'terminado';
  else if (item.estado === 'NOT_YET_RELEASED') estado = 'en_espera';
  else if (item.estado === 'CANCELLED') estado = 'suspendido';

  const animeRecord: Anime = {
    id: animeId,
    titulo,
    sinopsis: cleanText(item.sinopsis) || "Sin descripción disponible para este anime.",
    portada_url: portada,
    banner_url: banner,
    generos: Array.isArray(item.generos) ? item.generos : ["Anime"],
    estado_emision: estado,
    fecha_estreno: item.fecha_estreno || (item.anio ? `${item.anio}-01-01` : "2024-01-01"),
    created_at: new Date().toISOString(),
  };

  ALL_ANIMES.push(animeRecord);

  // Temporada
  const tempId = `temp-${animeId}`;
  ALL_TEMPORADAS.push({
    id: tempId,
    anime_id: animeId,
    nombre: "Temporada 1",
    numero: 1,
    descripcion: `Temporada completa de ${titulo}`,
    created_at: new Date().toISOString(),
  });

  // Episodios asociados con conteo correspondiente a AniList
  const eps = generateEpisodesForAnime(
    {
      ...animeRecord,
      duracion: item.duracion,
      total_episodios: item.total_episodios,
      proximo_episodio: item.proximo_episodio,
      format: item.format,
    },
    index
  );

  ALL_EPISODIOS.push(...eps);
});

export const mockDbStore: Record<string, any[]> = {
  animes: ALL_ANIMES,
  episodios: ALL_EPISODIOS,
  temporadas: ALL_TEMPORADAS,
  profiles: [
    {
      id: DEFAULT_USER.id,
      name: "Aaron Reyes (Admin)",
      handle: "@admin",
      bio: "Administrador de TENKO AI",
      avatar_url: "https://i.postimg.cc/0j0x4x7G/zerotwo.jpg",
      banner_url: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/100166-P6s7kE5k.jpg",
      audio_source: "none",
      is_admin: true,
      tiktok_open_id: null,
      tiktok_username: null,
      edits: [],
      updated_at: new Date().toISOString(),
    },
  ],
  perfiles: [
    {
      id: "perfil_001",
      user_id: DEFAULT_USER.id,
      is_admin: true,
      username: "admin",
      created_at: new Date().toISOString(),
    },
  ],
  friend_requests: [],
  follows: [],
  likes: [],
};

export class MockQueryBuilder {
  private table: string;
  private filters: ((item: any) => boolean)[] = [];
  private eqConditions: Record<string, string> = {};
  private sortFn: ((a: any, b: any) => number) | null = null;
  private limitCount: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(_columns = "*") {
    return this;
  }

  eq(column: string, value: any) {
    const strVal = String(value);
    this.eqConditions[column] = strVal;

    let matchedAnimeId: string | null = null;
    if (this.table === "episodios" && column === "anime_id") {
      const found = mockDbStore.animes.find(
        (a) => String(a.id) === strVal || slugify(a.titulo) === slugify(strVal)
      );
      if (found) matchedAnimeId = String(found.id);
    }

    this.filters.push((item) => {
      const itemVal = item[column];
      if (itemVal === undefined || itemVal === null) return false;
      if (String(itemVal) === strVal) return true;

      // Soporte inteligente para slugs y IDs en tabla animes
      if (this.table === "animes" && column === "id") {
        if (slugify(String(item.titulo)) === slugify(strVal)) return true;
      }

      // Soporte inteligente para episodios por slug o ID de anime
      if (matchedAnimeId && String(itemVal) === matchedAnimeId) {
        return true;
      }

      return false;
    });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push((item) => String(item[column]) !== String(value));
    return this;
  }

  ilike(column: string, pattern: string) {
    const cleanPattern = pattern.replace(/%/g, "").toLowerCase();
    this.filters.push((item) => {
      const val = item[column];
      return typeof val === "string" && val.toLowerCase().includes(cleanPattern);
    });
    return this;
  }

  or(filterStr: string) {
    const terms = filterStr.split(",").map((t) => t.trim());
    this.filters.push((item) => {
      return terms.some((term) => {
        const parts = term.split(".");
        if (parts.length >= 3) {
          const col = parts[0];
          const op = parts[1];
          const val = parts.slice(2).join(".").replace(/%/g, "").toLowerCase();
          if (op === "ilike") {
            const itemVal = item[col];
            return typeof itemVal === "string" && itemVal.toLowerCase().includes(val);
          }
          if (op === "eq") {
            return String(item[col]) === val;
          }
        }
        return false;
      });
    });
    return this;
  }

  not(column: string, _operator: string, value: any) {
    this.filters.push((item) => item[column] !== value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    const asc = options?.ascending ?? true;
    this.sortFn = (a, b) => {
      const valA = a[column];
      const valB = b[column];
      if (valA === valB) return 0;
      if (valA == null) return asc ? -1 : 1;
      if (valB == null) return asc ? 1 : -1;
      return asc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
    };
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.limitCount = to - from + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    return this.execute();
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this.execute();
  }

  insert(data: any | any[]) {
    const items = Array.isArray(data) ? data : [data];
    if (!mockDbStore[this.table]) {
      mockDbStore[this.table] = [];
    }
    mockDbStore[this.table].push(...items);
    return Promise.resolve({ data: items, error: null });
  }

  upsert(data: any | any[]) {
    const items = Array.isArray(data) ? data : [data];
    if (!mockDbStore[this.table]) {
      mockDbStore[this.table] = [];
    }
    const store = mockDbStore[this.table];
    items.forEach((item) => {
      const idKey = item.id ? "id" : item.user_id ? "user_id" : null;
      if (idKey) {
        const idx = store.findIndex((x) => x[idKey] === item[idKey]);
        if (idx >= 0) {
          store[idx] = { ...store[idx], ...item };
        } else {
          store.push(item);
        }
      } else {
        store.push(item);
      }
    });
    return Promise.resolve({ data: items, error: null });
  }

  update(values: Record<string, any>) {
    const store = mockDbStore[this.table] || [];
    const matched: any[] = [];
    store.forEach((item, idx) => {
      if (this.filters.every((fn) => fn(item))) {
        store[idx] = { ...item, ...values };
        matched.push(store[idx]);
      }
    });
    return Promise.resolve({ data: matched, error: null });
  }

  delete() {
    const store = mockDbStore[this.table] || [];
    mockDbStore[this.table] = store.filter((item) => !this.filters.every((fn) => fn(item)));
    return Promise.resolve({ data: null, error: null });
  }

  private execute(): Promise<{ data: any; error: any }> {
    const list = mockDbStore[this.table] || [];
    let result = list.filter((item) => this.filters.every((fn) => fn(item)));

    // ── Respaldo on-demand si el anime no se encontró en memoria ──
    if (result.length === 0 && this.table === "animes" && this.eqConditions["id"]) {
      const searchId = this.eqConditions["id"];
      const catalogMatch = (anilistCatalog as any[]).find((c) =>
        String(c.anilist_id) === searchId ||
        String(c.id) === searchId ||
        slugify(String(c.titulo || c.titulo_ingles || "")) === slugify(searchId)
      );

      if (catalogMatch) {
        const animeId = String(catalogMatch.anilist_id || catalogMatch.id || searchId);
        const animeRecord: Anime = {
          id: animeId,
          titulo: catalogMatch.titulo || catalogMatch.titulo_ingles || `Anime #${animeId}`,
          sinopsis: cleanText(catalogMatch.sinopsis) || "Sin descripción disponible.",
          portada_url: catalogMatch.portada_url || "https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600",
          banner_url: catalogMatch.banner_url || catalogMatch.portada_url || "",
          generos: Array.isArray(catalogMatch.generos) ? catalogMatch.generos : ["Anime"],
          estado_emision: catalogMatch.estado === "FINISHED" ? "terminado" : "emitido",
          fecha_estreno: catalogMatch.fecha_estreno || "2024-01-01",
          created_at: new Date().toISOString(),
        };

        mockDbStore.animes.push(animeRecord);

        // Crear temporada y episodios al vuelo
        mockDbStore.temporadas.push({
          id: `temp-${animeId}`,
          anime_id: animeId,
          nombre: "Temporada 1",
          numero: 1,
          descripcion: `Temporada de ${animeRecord.titulo}`,
          created_at: new Date().toISOString(),
        });

        const newEps = generateEpisodesForAnime({
          ...animeRecord,
          duracion: catalogMatch.duracion,
          total_episodios: catalogMatch.total_episodios,
          proximo_episodio: catalogMatch.proximo_episodio,
          format: catalogMatch.format,
        });
        mockDbStore.episodios.push(...newEps);

        result = [animeRecord];
      }
    }

    // ── Respaldo on-demand para episodios por anime_id ──
    if (result.length === 0 && this.table === "episodios" && this.eqConditions["anime_id"]) {
      const targetAnimeId = this.eqConditions["anime_id"];
      const parentAnime = mockDbStore.animes.find(
        (a) => String(a.id) === targetAnimeId || slugify(a.titulo) === slugify(targetAnimeId)
      );

      if (parentAnime) {
        const generated = generateEpisodesForAnime(parentAnime);
        mockDbStore.episodios.push(...generated);
        result = generated;
      }
    }

    // ── Respaldo on-demand para temporadas por ID ──
    if (result.length === 0 && this.table === "temporadas" && this.eqConditions["id"]) {
      const tempId = this.eqConditions["id"];
      const extractedAnimeId = tempId.startsWith("temp-") ? tempId.replace("temp-", "") : tempId;
      const newSeason: Temporada = {
        id: tempId,
        anime_id: extractedAnimeId,
        nombre: "Temporada 1",
        numero: 1,
        descripcion: "Temporada 1",
        created_at: new Date().toISOString(),
      };
      mockDbStore.temporadas.push(newSeason);
      result = [newSeason];
    }

    // ── Respaldo on-demand para episodios por id individual ──
    if (result.length === 0 && this.table === "episodios" && this.eqConditions["id"]) {
      const epId = this.eqConditions["id"];
      const match = epId.match(/^ep-(.+)-(\d+)$/);
      if (match) {
        const targetAnimeId = match[1];
        const epNum = parseInt(match[2], 10);
        const parentAnime = mockDbStore.animes.find(
          (a) => String(a.id) === targetAnimeId || slugify(a.titulo) === slugify(targetAnimeId)
        );

        if (parentAnime) {
          const generated = generateEpisodesForAnime(parentAnime);
          mockDbStore.episodios.push(...generated);
          const found = generated.find((e) => e.numero === epNum);
          if (found) result = [found];
        }
      }

      // Si aún no hay resultado, usar el primer episodio disponible como resguardo
      if (result.length === 0 && mockDbStore.episodios.length > 0) {
        result = [mockDbStore.episodios[0]];
      }
    }

    if (this.sortFn) {
      result = [...result].sort(this.sortFn);
    }
    if (this.limitCount != null) {
      result = result.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      return Promise.resolve({
        data: result[0] || null,
        error: result[0] ? null : { message: "No rows found" },
      });
    }

    if (this.isMaybeSingle) {
      return Promise.resolve({
        data: result[0] || null,
        error: null,
      });
    }

    return Promise.resolve({
      data: result,
      error: null,
    });
  }

  // Promise interface (thenable)
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

export function createMockSupabase() {
  let currentUser: MockUser | null = DEFAULT_USER;

  return {
    from: (table: string) => new MockQueryBuilder(table),
    rpc: async (fnName: string, _args?: any) => {
      if (fnName === "get_user_profile_stats") {
        return {
          data: [
            {
              total_following: 12,
              total_followers: 1240,
              total_likes_received: 8400,
            },
          ],
          error: null,
        };
      }
      return { data: [], error: null };
    },
    auth: {
      getUser: async () => ({
        data: { user: currentUser },
        error: null,
      }),
      getSession: async () => ({
        data: {
          session: currentUser
            ? {
                user: currentUser,
                access_token: "mock_jwt_token_tenko",
                refresh_token: "mock_refresh_token_tenko",
              }
            : null,
        },
        error: null,
      }),
      signUp: async ({ email, options }: any) => {
        const newUser: MockUser = {
          id: `usr_${Date.now()}`,
          email,
          user_metadata: options?.data || {},
        };
        currentUser = newUser;
        if (mockDbStore.profiles) {
          mockDbStore.profiles.push({
            id: newUser.id,
            name: newUser.user_metadata?.full_name || "Usuario Tenko",
            handle: newUser.user_metadata?.handle || "@user",
            avatar_url: newUser.user_metadata?.avatar_url || "https://i.postimg.cc/0j0x4x7G/zerotwo.jpg",
            bio: newUser.user_metadata?.bio || "",
            audio_source: "none",
            updated_at: new Date().toISOString(),
          });
        }
        return {
          data: {
            user: newUser,
            session: {
              user: newUser,
              access_token: "mock_token",
              refresh_token: "mock_refresh",
            },
          },
          error: null,
        };
      },
      signInWithPassword: async ({ email }: any) => {
        currentUser = {
          ...DEFAULT_USER,
          email,
        };
        return {
          data: {
            user: currentUser,
            session: {
              user: currentUser,
              access_token: "mock_token",
              refresh_token: "mock_refresh",
            },
          },
          error: null,
        };
      },
      signOut: async () => {
        currentUser = null;
        return { error: null };
      },
      setSession: async () => ({ error: null }),
      updateUser: async ({ data }: any) => {
        if (currentUser) {
          currentUser.user_metadata = {
            ...currentUser.user_metadata,
            ...data,
          };
        }
        return { data: { user: currentUser }, error: null };
      },
      onAuthStateChange: (_callback: any) => ({
        data: {
          subscription: {
            unsubscribe: () => {},
          },
        },
      }),
    },
  };
}
