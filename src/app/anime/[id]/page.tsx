'use client';

import { useEffect, useState, use, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime, Episodio, ProgresoEpisodio } from '@/types/database';
import { fetchWatchProgressForAnime, formatDurationSeconds } from '@/lib/watch-progress';

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

  useEffect(() => {
    async function loadAnimeDetail() {
      setLoading(true);
      try {
        const { data: animeData } = await supabase
          .from('animes')
          .select('*')
          .eq('id', id)
          .single();

        if (animeData) {
          setAnime(animeData);

          let { data: epsData } = await supabase
            .from('episodios')
            .select('*')
            .eq('anime_id', animeData.id)
            .order('numero', { ascending: true });

          if (!epsData || epsData.length === 0) {
            const { data: fallbackEps } = await supabase
              .from('episodios')
              .select('*')
              .eq('anime_id', id)
              .order('numero', { ascending: true });
            epsData = fallbackEps;
          }

          if (epsData && epsData.length > 0) {
            setEpisodios(epsData);

            // Cargar tiempo de visualización registrado en la base de datos
            const epIds = epsData.map((e: Episodio) => e.id);
            const progress = await fetchWatchProgressForAnime(animeData.id, epIds);
            setProgresoMap(progress);
          }
        }
      } catch {
        setAnime(null);
      } finally {
        setLoading(false);
      }
    }
    loadAnimeDetail();
  }, [id]);

  // Actualizar el progreso cuando el usuario regrese a la pestaña o tras cambios
  useEffect(() => {
    const handleProgressUpdate = () => {
      if (anime && episodios.length > 0) {
        fetchWatchProgressForAnime(anime.id, episodios.map((e) => e.id)).then(setProgresoMap);
      }
    };

    window.addEventListener('tenko-watch-progress-update', handleProgressUpdate);
    window.addEventListener('focus', handleProgressUpdate);

    return () => {
      window.removeEventListener('tenko-watch-progress-update', handleProgressUpdate);
      window.removeEventListener('focus', handleProgressUpdate);
    };
  }, [anime, episodios]);

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

                <button className="inline-flex items-center gap-2 rounded-xl bg-[var(--tenko-bg-card)] border border-[var(--tenko-border)] px-5 py-3 text-xs font-semibold text-[var(--tenko-text-primary)] hover:bg-[var(--tenko-border)] transition active:scale-95 shadow-sm">
                  + MI LISTA
                </button>
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
    </main>
  );
}
