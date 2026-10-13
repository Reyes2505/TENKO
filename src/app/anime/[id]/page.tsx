'use client';

import { useEffect, useState, use, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime, Episodio, ProgresoEpisodio, Comentario, WatchlistStatus } from '@/types/database';
import { fetchWatchProgressForAnime, formatDurationSeconds } from '@/lib/watch-progress';
import {
  getAnimeWatchlistStatusAction,
  addToWatchlistAction,
  removeFromWatchlistAction,
} from '@/actions/watchlist';
import {
  getComentariosAction,
  agregarComentarioAction,
  reaccionarComentarioAction,
} from '@/actions/comentarios';
import { getAnimeWithFallback, getFallbackCatalog } from '@/lib/catalog-fallback';

export default function AnimeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodios, setEpisodios] = useState<Episodio[]>([]);
  const [progresoMap, setProgresoMap] = useState<Record<string, ProgresoEpisodio>>({});
  const [loading, setLoading] = useState(true);

  // Estado de Mi Lista
  const [watchlistStatus, setWatchlistStatus] = useState<WatchlistStatus | null>(null);
  const [watchlistDropdownOpen, setWatchlistDropdownOpen] = useState(false);
  const [watchlistUpdating, setWatchlistUpdating] = useState(false);

  // Estado de Comentarios y Reseñas
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [nuevoComentario, setNuevoComentario] = useState('');
  const [calificacion, setCalificacion] = useState(5);
  const [esSpoiler, setEsSpoiler] = useState(false);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [comentarioExito, setComentarioExito] = useState(false);

  // Animes Relacionados
  const [animesRelacionados, setAnimesRelacionados] = useState<Anime[]>([]);

  useEffect(() => {
    async function loadAnimeDetail() {
      setLoading(true);
      try {
        let currentAnime: Anime | null = null;
        let currentEpisodios: Episodio[] = [];

        // 1. Intentar consultar en Supabase
        try {
          const { data: animeData } = await supabase
            .from('animes')
            .select('*')
            .eq('id', id)
            .single();

          if (animeData) {
            currentAnime = animeData as Anime;

            const { data: epsData } = await supabase
              .from('episodios')
              .select('*')
              .eq('anime_id', animeData.id)
              .order('numero', { ascending: true });

            if (epsData && epsData.length > 0) {
              currentEpisodios = epsData as Episodio[];
            }
          }
        } catch {
          // Continuar con resolución de catálogo / AniList
        }

        // 2. Si no se encontró en Supabase, resolver por catálogo local o API de AniList
        if (!currentAnime) {
          const fallback = await getAnimeWithFallback(id);
          if (fallback.anime) {
            currentAnime = fallback.anime;
            currentEpisodios = fallback.episodios;
          }
        }

        if (currentAnime) {
          setAnime(currentAnime);
          setEpisodios(currentEpisodios);

          // Cargar tiempo de visualización registrado en la base de datos
          if (currentEpisodios.length > 0) {
            const epIds = currentEpisodios.map((e: Episodio) => e.id);
            const progress = await fetchWatchProgressForAnime(currentAnime.id, epIds);
            setProgresoMap(progress);
          }

          // Cargar estado de watchlist
          const status = await getAnimeWatchlistStatusAction(currentAnime.id);
          setWatchlistStatus(status);

          // Cargar comentarios
          const commsRes = await getComentariosAction(currentAnime.id);
          if (commsRes.success && commsRes.data) {
            setComentarios(commsRes.data);
          }

          // Cargar animes relacionados
          try {
            const { data: related } = await supabase
              .from('animes')
              .select('*')
              .neq('id', currentAnime.id)
              .limit(6);
            if (related && related.length > 0) {
              setAnimesRelacionados(related as Anime[]);
            } else {
              const allFallback = getFallbackCatalog();
              setAnimesRelacionados(allFallback.filter((a) => a.id !== currentAnime?.id).slice(0, 6));
            }
          } catch {
            const allFallback = getFallbackCatalog();
            setAnimesRelacionados(allFallback.filter((a) => a.id !== currentAnime?.id).slice(0, 6));
          }
        } else {
          setAnime(null);
        }
      } catch (err) {
        console.error('Error cargando anime:', err);
        setAnime(null);
      } finally {
        setLoading(false);
      }
    }

    loadAnimeDetail();

    // Re-sincronizar cuando la ventana recibe foco
    const handleFocus = () => {
      if (anime && episodios.length > 0) {
        const epIds = episodios.map((e) => e.id);
        fetchWatchProgressForAnime(anime.id, epIds).then((progress) => {
          setProgresoMap(progress);
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [id]);

  // Contar episodios vistos o completados
  const statsVisualizacion = useMemo(() => {
    let vistos = 0;
    let enProgreso = 0;
    episodios.forEach((ep) => {
      const p = progresoMap[ep.id] || progresoMap[`ep_num_${ep.numero}`];
      if (p && p.completado) vistos++;
      else if (p && p.porcentaje > 0) enProgreso++;
    });
    return { vistos, enProgreso };
  }, [episodios, progresoMap]);

  // Determinar episodio para el botón de reproducción principal
  const resumeEpisode = useMemo(() => {
    if (!episodios.length) return null;

    // 1. Buscar primero el que esté en progreso incompleto
    const inProgress = episodios.find((ep) => {
      const p = progresoMap[ep.id] || progresoMap[`ep_num_${ep.numero}`];
      return p && p.porcentaje > 0 && !p.completado;
    });
    if (inProgress) {
      const p = progresoMap[inProgress.id] || progresoMap[`ep_num_${inProgress.numero}`];
      return { ep: inProgress, type: 'continue' as const, percent: p?.porcentaje || 0 };
    }

    // 2. Si no, buscar el siguiente después del último completado
    let lastCompletedIdx = -1;
    episodios.forEach((ep, idx) => {
      const p = progresoMap[ep.id] || progresoMap[`ep_num_${ep.numero}`];
      if (p && p.completado) lastCompletedIdx = idx;
    });

    if (lastCompletedIdx >= 0 && lastCompletedIdx < episodios.length - 1) {
      return { ep: episodios[lastCompletedIdx + 1], type: 'next' as const, percent: 0 };
    }

    // 3. Si no hay nada o todos completados, primer episodio
    return { ep: episodios[0], type: 'start' as const, percent: 0 };
  }, [episodios, progresoMap]);

  // Manejo de Mi Lista
  const handleSetWatchlist = async (estado: WatchlistStatus | 'remover') => {
    if (!anime) return;
    setWatchlistUpdating(true);
    setWatchlistDropdownOpen(false);

    if (estado === 'remover') {
      await removeFromWatchlistAction(anime.id);
      setWatchlistStatus(null);
    } else {
      await addToWatchlistAction(anime.id, estado);
      setWatchlistStatus(estado);
    }
    setWatchlistUpdating(false);
  };

  // Manejo de Envío de Comentario
  const handleSubmitComentario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anime || !nuevoComentario.trim() || enviandoComentario) return;

    setEnviandoComentario(true);
    const res = await agregarComentarioAction({
      animeId: anime.id,
      contenido: nuevoComentario,
      calificacion,
      es_spoiler: esSpoiler,
    });

    if (res.success && res.data) {
      setComentarios([res.data, ...comentarios]);
      setNuevoComentario('');
      setComentarioExito(true);
      setTimeout(() => setComentarioExito(false), 3000);
    }
    setEnviandoComentario(false);
  };

  // Manejo de Reacción a Comentario
  const handleReaccionar = async (comentarioId: string, tipo: 'like' | 'dislike') => {
    const res = await reaccionarComentarioAction(comentarioId, tipo);
    if (res.success) {
      setComentarios((prev) =>
        prev.map((c) =>
          c.id === comentarioId ? { ...c, likes: res.likes, dislikes: res.dislikes } : c
        )
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--tenko-bg-page)] flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#6c00f4] border-t-transparent" />
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-[var(--tenko-bg-page)] text-[var(--tenko-text-primary)] flex flex-col items-center justify-center gap-4">
        <p className="font-mono text-sm">Anime no encontrado en la base de datos.</p>
        <Link href="/" className="px-4 py-2 rounded-lg bg-[#6c00f4] text-white font-bold text-xs">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const estadoTexto =
    anime.estado_emision && anime.estado_emision !== 'desconocido'
      ? anime.estado_emision.toUpperCase()
      : 'AL AIRE';

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] text-[var(--tenko-text-primary)] transition-colors duration-200">
      {/* Hero Section Limpia con Degradados Únicamente en los Límites */}
      <section className="relative w-full overflow-hidden bg-[var(--tenko-bg-page)] min-h-[460px] lg:min-h-[520px] flex items-end pb-12 pt-24">
        {/* Banner de Fondo Completo y Vívido */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-500"
            style={{
              backgroundImage: `url(${anime.banner_url || anime.portada_url || ''})`,
            }}
          />
          {/* Degradado Superior para integrar el Header */}
          <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[var(--tenko-bg-page)] to-transparent" />

          {/* Degradado Inferior para difuminar suavemente la transición del banner */}
          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[var(--tenko-bg-page)] to-transparent" />

          {/* Degradado Lateral Izquierdo para legibilidad del texto */}
          <div className="absolute inset-y-0 left-0 w-full lg:w-2/3 bg-gradient-to-r from-[var(--tenko-bg-page)] via-[var(--tenko-bg-page)]/80 to-transparent" />
        </div>

        {/* Contenido Principal */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-end">
            {/* Portada Miniatura */}
            <div className="hidden sm:block lg:col-span-3 shrink-0">
              <div className="relative aspect-[3/4] w-full max-w-[220px] overflow-hidden rounded-2xl border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] shadow-2xl">
                {anime.portada_url ? (
                  <img
                    src={anime.portada_url}
                    alt={anime.titulo}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-[var(--tenko-bg-card)] text-xs text-[var(--tenko-text-secondary)] font-mono">
                    SIN PORTADA
                  </div>
                )}
              </div>
            </div>

            {/* Metadatos, Título y Sinopsis */}
            <div className="lg:col-span-9 space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded-md bg-[var(--tenko-bg-card)] border border-[var(--tenko-border)] text-[var(--tenko-text-primary)] font-bold shadow-sm">
                  EPISODIOS: {episodios.length || '--'}
                </span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold uppercase">
                  {estadoTexto}
                </span>
                {statsVisualizacion.vistos > 0 && (
                  <span className="px-2.5 py-1 rounded-md bg-purple-500/15 border border-purple-500/30 text-purple-400 font-bold">
                    VISTOS: {statsVisualizacion.vistos}/{episodios.length}
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 font-bold">
                  ★ 4.8
                </span>
              </div>

              <h1 className="font-[family-name:var(--font-unbounded)] text-2xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[var(--tenko-text-primary)] leading-tight">
                {anime.titulo}
              </h1>

              {/* Géneros interactivos */}
              {anime.generos && anime.generos.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {anime.generos.map((gen) => (
                    <Link
                      key={gen}
                      href={`/buscar?genero=${encodeURIComponent(gen)}`}
                      className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono text-[var(--tenko-text-secondary)] hover:border-[#6c00f4] hover:text-[#00f0ff] transition-colors"
                    >
                      #{gen}
                    </Link>
                  ))}
                </div>
              )}

              <p className="text-xs sm:text-sm text-[var(--tenko-text-secondary)] max-w-2xl line-clamp-3 leading-relaxed">
                {anime.sinopsis || 'Sin descripción disponible.'}
              </p>

              {/* Botones de Acción */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {resumeEpisode ? (
                  <Link
                    href={`/ver/${resumeEpisode.ep.id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#6c00f4] px-6 py-3 text-xs font-bold tracking-wider text-white hover:bg-[#5800cc] transition shadow-md shadow-[#6c00f4]/20 active:scale-95"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    {resumeEpisode.type === 'continue'
                      ? `CONTINUAR EP ${resumeEpisode.ep.numero} (${resumeEpisode.percent}%)`
                      : resumeEpisode.type === 'next'
                      ? `SIGUIENTE: EP ${resumeEpisode.ep.numero}`
                      : 'VER PRIMER EPISODIO'}
                  </Link>
                ) : (
                  <button
                    disabled
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--tenko-bg-card)] border border-[var(--tenko-border)] px-6 py-3 text-xs font-bold tracking-wider text-[var(--tenko-text-secondary)] cursor-not-allowed opacity-60"
                  >
                    PRÓXIMAMENTE
                  </button>
                )}

                {/* Apartado Interactivo: Selector de Estado de Mi Lista */}
                <div className="relative">
                  <button
                    onClick={() => setWatchlistDropdownOpen(!watchlistDropdownOpen)}
                    disabled={watchlistUpdating}
                    className={`inline-flex items-center gap-2 rounded-xl border px-5 py-3 text-xs font-semibold transition active:scale-95 shadow-sm ${
                      watchlistStatus
                        ? 'bg-[#6c00f4]/15 border-[#6c00f4] text-white font-bold'
                        : 'bg-[var(--tenko-bg-card)] border-[var(--tenko-border)] text-[var(--tenko-text-primary)] hover:bg-[var(--tenko-border)]'
                    }`}
                  >
                    {watchlistUpdating ? (
                      <span className="inline-block w-3 h-3 rounded-full border-2 border-t-[#6c00f4] border-transparent animate-spin" />
                    ) : watchlistStatus === 'viendo' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                        VIENDO
                      </>
                    ) : watchlistStatus === 'favorito' ? (
                      <>
                        <span className="text-amber-400">★</span>
                        FAVORITO
                      </>
                    ) : watchlistStatus === 'visto' ? (
                      <>
                        <span className="text-emerald-400">✓</span>
                        COMPLETADO
                      </>
                    ) : watchlistStatus === 'por_ver' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                        POR VER
                      </>
                    ) : (
                      <>+ MI LISTA</>
                    )}
                    <svg className="w-3 h-3 ml-1 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {/* Menú Dropdown de Estados */}
                  {watchlistDropdownOpen && (
                    <div className="absolute left-0 mt-2 w-48 rounded-xl border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] shadow-xl z-30 p-1.5 space-y-1 backdrop-blur-md">
                      <button
                        onClick={() => handleSetWatchlist('viendo')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition flex items-center justify-between ${
                          watchlistStatus === 'viendo' ? 'bg-[#6c00f4] text-white font-bold' : 'hover:bg-white/10 text-[var(--tenko-text-primary)]'
                        }`}
                      >
                        <span>▶ Viendo</span>
                        {watchlistStatus === 'viendo' && <span>✓</span>}
                      </button>
                      <button
                        onClick={() => handleSetWatchlist('por_ver')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition flex items-center justify-between ${
                          watchlistStatus === 'por_ver' ? 'bg-[#6c00f4] text-white font-bold' : 'hover:bg-white/10 text-[var(--tenko-text-primary)]'
                        }`}
                      >
                        <span>⏳ Por Ver</span>
                        {watchlistStatus === 'por_ver' && <span>✓</span>}
                      </button>
                      <button
                        onClick={() => handleSetWatchlist('visto')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition flex items-center justify-between ${
                          watchlistStatus === 'visto' ? 'bg-[#6c00f4] text-white font-bold' : 'hover:bg-white/10 text-[var(--tenko-text-primary)]'
                        }`}
                      >
                        <span>✓ Completado</span>
                        {watchlistStatus === 'visto' && <span>✓</span>}
                      </button>
                      <button
                        onClick={() => handleSetWatchlist('favorito')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono transition flex items-center justify-between ${
                          watchlistStatus === 'favorito' ? 'bg-[#6c00f4] text-white font-bold' : 'hover:bg-white/10 text-[var(--tenko-text-primary)]'
                        }`}
                      >
                        <span>★ Favorito</span>
                        {watchlistStatus === 'favorito' && <span>✓</span>}
                      </button>
                      {watchlistStatus && (
                        <div className="border-t border-[var(--tenko-border)] pt-1 mt-1">
                          <button
                            onClick={() => handleSetWatchlist('remover')}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-red-400 hover:bg-red-500/10 transition"
                          >
                            ✕ Quitar de mi lista
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lista de Episodios con Barras de Progreso Visuales */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-10 space-y-6">
        <div className="border-b border-[var(--tenko-border)] pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-unbounded)] text-lg font-black uppercase tracking-tight text-[var(--tenko-text-primary)]">
              Episodios Disponibles ({episodios.length})
            </h2>
            <p className="text-xs text-[var(--tenko-text-secondary)] font-mono mt-1">
              Progreso sincronizado en tiempo real con la base de datos
            </p>
          </div>

          {statsVisualizacion.vistos > 0 && (
            <div className="text-xs font-mono text-[var(--tenko-text-secondary)] flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {statsVisualizacion.vistos} episodios completados
              </span>
            </div>
          )}
        </div>

        {episodios.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {episodios.map((ep) => {
              const prog = progresoMap[ep.id] || progresoMap[`ep_num_${ep.numero}`];
              const percent = prog ? Math.min(100, Math.max(0, prog.porcentaje)) : 0;
              const isCompleted = prog ? prog.completado || percent >= 90 : false;
              const hasProgress = prog && prog.tiempo_visto > 0;

              return (
                <Link
                  key={ep.id}
                  href={`/ver/${ep.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] hover:border-[#6c00f4] transition shadow-sm hover:shadow-lg hover:shadow-[#6c00f4]/10"
                >
                  {/* Contenedor de Miniatura */}
                  <div className="aspect-video w-full bg-[var(--tenko-bg-page)] relative overflow-hidden">
                    {ep.thumbnail_url || anime.banner_url || anime.portada_url ? (
                      <img
                        src={ep.thumbnail_url || anime.banner_url || anime.portada_url}
                        alt={ep.titulo || `Episodio ${ep.numero}`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-[var(--tenko-text-secondary)] font-mono">
                        EP {ep.numero}
                      </div>
                    )}

                    {/* Badge de Número de Episodio */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[var(--tenko-bg-card)]/90 backdrop-blur-md font-mono text-[10px] text-[var(--tenko-text-primary)] border border-[var(--tenko-border)] font-bold z-10">
                      EP {String(ep.numero).padStart(2, '0')}
                    </div>

                    {/* Badge de Estado de Visualización en BD */}
                    {isCompleted ? (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-emerald-500/90 text-white font-mono text-[10px] font-bold flex items-center gap-1 shadow-md backdrop-blur-md z-10">
                        <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        VISTO
                      </div>
                    ) : hasProgress ? (
                      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/85 text-[#00f0ff] border border-[#6c00f4]/50 font-mono text-[10px] font-extrabold shadow-md backdrop-blur-md z-10">
                        {percent}%
                      </div>
                    ) : null}

                    {/* Overlay Hover Icono Play */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                      <div className="h-10 w-10 rounded-full bg-[#6c00f4] text-white flex items-center justify-center shadow-lg shadow-[#6c00f4]/50 scale-90 group-hover:scale-100 transition-transform">
                        <svg className="h-4 w-4 ml-0.5 fill-current" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>

                    {/* ═══════════════════════════════════════════════════════════
                        BARRA DE PROGRESO VISUAL (BASADA EN TIEMPO DE LA BD)
                    ═══════════════════════════════════════════════════════════ */}
                    <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/80 backdrop-blur-sm z-20 overflow-hidden">
                      {hasProgress ? (
                        <div
                          className={`h-full transition-all duration-500 ${
                            isCompleted
                              ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]'
                              : 'bg-gradient-to-r from-[#6c00f4] via-[#9030ff] to-[#00f0ff] shadow-[0_0_10px_rgba(108,0,244,0.8)]'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      ) : (
                        <div className="h-full w-full bg-white/5" />
                      )}
                    </div>
                  </div>

                  {/* Metadatos y Pie de Tarjeta */}
                  <div className="p-3">
                    <h3 className="text-xs font-bold text-[var(--tenko-text-primary)] group-hover:text-[#6c00f4] transition truncate">
                      {ep.titulo_episodio || ep.titulo || `Episodio ${ep.numero}`}
                    </h3>

                    <div className="flex items-center justify-between mt-2 text-[11px] font-mono">
                      {hasProgress ? (
                        <span
                          className={
                            isCompleted
                              ? 'text-emerald-500 font-semibold flex items-center gap-1'
                              : 'text-[#a855f7] font-semibold'
                          }
                        >
                          {isCompleted ? (
                            <>✓ Completado</>
                          ) : (
                            <>
                              {formatDurationSeconds(prog.tiempo_visto)} /{' '}
                              {formatDurationSeconds(prog.duracion_total || 1440)}
                            </>
                          )}
                        </span>
                      ) : (
                        <span className="text-[var(--tenko-text-secondary)]">
                          {ep.duracion || '24m'}
                        </span>
                      )}

                      <span className="text-[#6c00f4] font-bold group-hover:translate-x-0.5 transition-transform">
                        {isCompleted
                          ? 'Repetir →'
                          : hasProgress
                          ? 'Continuar →'
                          : 'Reproducir →'}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border border-[var(--tenko-border)] rounded-xl bg-[var(--tenko-bg-card)]">
            <p className="text-xs font-mono text-[var(--tenko-text-secondary)]">
              No hay episodios registrados para este título.
            </p>
          </div>
        )}
      </section>

      {/* ═══════════════════════════════════════════════════════════
          APARTADO: RESEÑAS Y COMENTARIOS DE LA COMUNIDAD
      ═══════════════════════════════════════════════════════════ */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-10 space-y-8 border-t border-[var(--tenko-border)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-1">
              // COMUNIDAD TENKO
            </span>
            <h2 className="font-[family-name:var(--font-unbounded)] text-xl font-black uppercase tracking-tight text-[var(--tenko-text-primary)]">
              Reseñas y Comentarios ({comentarios.length})
            </h2>
          </div>
        </div>

        {/* Formulario para publicar comentario o reseña */}
        <form
          onSubmit={handleSubmitComentario}
          className="rounded-2xl border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] p-5 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[var(--tenko-text-secondary)]">Tu valoración:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCalificacion(star)}
                    className={`text-lg transition-transform hover:scale-125 ${
                      star <= calificacion ? 'text-amber-400' : 'text-gray-600'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-mono text-[var(--tenko-text-secondary)] cursor-pointer">
              <input
                type="checkbox"
                checked={esSpoiler}
                onChange={(e) => setEsSpoiler(e.target.checked)}
                className="rounded border-[var(--tenko-border)] bg-black/40 text-[#6c00f4] focus:ring-[#6c00f4]"
              />
              <span>Contiene Spoilers</span>
            </label>
          </div>

          <textarea
            value={nuevoComentario}
            onChange={(e) => setNuevoComentario(e.target.value)}
            rows={3}
            placeholder="¿Qué te pareció este anime? Comparte tu opinión con la comunidad..."
            className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/30 p-3 text-xs text-[var(--tenko-text-primary)] placeholder-white/30 outline-none focus:border-[#6c00f4] resize-none"
          />

          <div className="flex items-center justify-between">
            {comentarioExito && (
              <span className="text-xs font-mono text-emerald-400">✓ ¡Comentario publicado con éxito!</span>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                disabled={enviandoComentario || !nuevoComentario.trim()}
                className="rounded-xl bg-[#6c00f4] px-5 py-2.5 font-mono text-xs font-bold text-white hover:bg-[#5800cc] transition disabled:opacity-40"
              >
                {enviandoComentario ? 'PUBLICANDO...' : 'PUBLICAR COMENTARIO'}
              </button>
            </div>
          </div>
        </form>

        {/* Lista de Comentarios */}
        <div className="space-y-4">
          {comentarios.length > 0 ? (
            comentarios.map((comm) => (
              <div
                key={comm.id}
                className="rounded-xl border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={comm.user_avatar || 'https://i.postimg.cc/0j0x4x7G/zerotwo.jpg'}
                      alt={comm.user_name}
                      className="w-8 h-8 rounded-full object-cover border border-[#6c00f4]/40"
                    />
                    <div>
                      <span className="text-xs font-bold text-[var(--tenko-text-primary)] block">
                        {comm.user_name}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--tenko-text-secondary)]">
                        {new Date(comm.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {comm.calificacion && (
                    <div className="flex items-center text-amber-400 text-xs">
                      {'★'.repeat(comm.calificacion)}
                    </div>
                  )}
                </div>

                {comm.es_spoiler ? (
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-mono text-amber-400/80 hover:text-amber-300">
                      ⚠️ Este comentario contiene spoilers. Clic para ver.
                    </summary>
                    <p className="mt-2 text-xs text-[var(--tenko-text-secondary)] leading-relaxed pl-2 border-l border-amber-500/30">
                      {comm.contenido}
                    </p>
                  </details>
                ) : (
                  <p className="text-xs text-[var(--tenko-text-secondary)] leading-relaxed">
                    {comm.contenido}
                  </p>
                )}

                <div className="flex items-center gap-4 pt-1 text-[11px] font-mono text-[var(--tenko-text-secondary)]">
                  <button
                    onClick={() => handleReaccionar(comm.id, 'like')}
                    className="flex items-center gap-1.5 hover:text-emerald-400 transition"
                  >
                    <span>▲</span>
                    <span>{comm.likes || 0}</span>
                  </button>
                  <button
                    onClick={() => handleReaccionar(comm.id, 'dislike')}
                    className="flex items-center gap-1.5 hover:text-red-400 transition"
                  >
                    <span>▼</span>
                    <span>{comm.dislikes || 0}</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 border border-[var(--tenko-border)] rounded-xl bg-white/[0.01]">
              <p className="text-xs font-mono text-[var(--tenko-text-secondary)]">
                Aún no hay comentarios para este anime. ¡Sé el primero en opinar!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          APARTADO: ANIMES RELACIONADOS Y RECOMENDADOS
      ═══════════════════════════════════════════════════════════ */}
      {animesRelacionados.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 lg:px-8 py-10 space-y-6 border-t border-[var(--tenko-border)] pb-20">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-1">
                // DESCUBRE MÁS
              </span>
              <h2 className="font-[family-name:var(--font-unbounded)] text-lg font-black uppercase tracking-tight text-[var(--tenko-text-primary)]">
                Títulos Relacionados
              </h2>
            </div>
            <Link
              href="/buscar"
              className="text-xs font-mono text-[#6c00f4] hover:underline"
            >
              Ver catálogo completo →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {animesRelacionados.map((rel) => (
              <Link
                key={rel.id}
                href={`/anime/${rel.id}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] hover:border-[#6c00f4] transition"
              >
                <div className="aspect-[3/4] w-full overflow-hidden bg-black/40">
                  <img
                    src={rel.portada_url}
                    alt={rel.titulo}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-2.5">
                  <h3 className="text-xs font-bold truncate group-hover:text-[#6c00f4] transition">
                    {rel.titulo}
                  </h3>
                  <span className="text-[10px] font-mono text-[var(--tenko-text-secondary)] uppercase block mt-1">
                    {rel.estado_emision || 'EN EMISIÓN'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
