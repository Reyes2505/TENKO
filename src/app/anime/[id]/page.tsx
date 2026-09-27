'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime, Episodio, Temporada } from '@/types/database';
import EpisodeGrid from '@/components/EpisodeGrid';

interface AnimeConSaga extends Anime {
  saga_titulo?: string | null;
  saga_normalizada?: string | null;
  es_saga_principal?: boolean | null;
  anime_padre_id?: string | null;
}

export default function AnimeDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [anime, setAnime] = useState<AnimeConSaga | null>(null);
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [episodios, setEpisodios] = useState<Episodio[]>([]);
  const [temporadaActiva, setTemporadaActiva] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);

      try {
        // 1. Cargar anime actual
        const { data: animeData } = await supabase
          .from('animes')
          .select('*')
          .eq('id', id)
          .single();

        if (!animeData) return;
        setAnime(animeData);

        // 2. Determinar el ID de la saga (padre o el mismo)
        const animeConSaga = animeData as AnimeConSaga;
        const sagaPadreId = animeConSaga.anime_padre_id || animeData.id;

        // 3. Cargar TODOS los animes de la saga
        const { data: sagaAnimes } = await supabase
          .from('animes')
          .select('id, titulo, portada_url, banner_url, sinopsis, estado_emision, fecha_estreno, generos, saga_titulo, anime_padre_id')
          .or(`id.eq.${sagaPadreId},anime_padre_id.eq.${sagaPadreId}`)
          .order('fecha_estreno');

        if (!sagaAnimes || sagaAnimes.length === 0) return;

        // 4. Ordenar: padre primero, luego hijos por año
        const animesOrdenados = [...sagaAnimes].sort((a, b) => {
          if (a.id === sagaPadreId) return -1;
          if (b.id === sagaPadreId) return 1;
          const fechaA = a.fecha_estreno ? new Date(a.fecha_estreno).getTime() : 0;
          const fechaB = b.fecha_estreno ? new Date(b.fecha_estreno).getTime() : 0;
          return fechaA - fechaB;
        });

        const animeIdsSaga = animesOrdenados.map(a => a.id);

        // 5. Cargar temporadas de TODA la saga
        const { data: tempsData } = await supabase
          .from('temporadas')
          .select('*')
          .in('anime_id', animeIdsSaga)
          .order('orden');

        if (!tempsData || tempsData.length === 0) {
          setTemporadas([]);
          setEpisodios([]);
          return;
        }

        // 6. Enriquecer temporadas con info del anime y orden global
        const tempsEnriquecidas: Temporada[] = [];
        for (const animeSaga of animesOrdenados) {
          const tempsDelAnime = tempsData.filter(t => t.anime_id === animeSaga.id);
          const esPrincipal = animeSaga.id === sagaPadreId;
          const totalAnimesSaga = animesOrdenados.length;

          for (const temp of tempsDelAnime) {
            let nombreTemp = temp.nombre;

            // Si la saga tiene múltiples animes, prefijar con el nombre
            if (totalAnimesSaga > 1 && !esPrincipal) {
              nombreTemp = `${animeSaga.titulo}`;
            } else if (totalAnimesSaga > 1 && tempsDelAnime.length > 1) {
              nombreTemp = temp.nombre;
            }

            tempsEnriquecidas.push({
              ...temp,
              nombre: nombreTemp,
              // Orden global: año del anime * 100 + orden de temporada
              orden: (animeSaga.fecha_estreno 
                ? new Date(animeSaga.fecha_estreno).getFullYear() * 100 
                : 0) + (temp.orden || 0),
            } as Temporada & { orden: number });
          }
        }

        // 7. Cargar episodios de TODAS las temporadas
        const tempIds = tempsEnriquecidas.map(t => t.id);
        const { data: epsData } = await supabase
          .from('episodios')
          .select('*')
          .in('temporada_id', tempIds)
          .order('numero');

        if (epsData) {
          setEpisodios(epsData);
        }

        setTemporadas(tempsEnriquecidas);

        // 8. Seleccionar la primera temporada por defecto
        if (tempsEnriquecidas.length > 0) {
          setTemporadaActiva(tempsEnriquecidas[0].id);
        }

      } catch (err) {
        console.error('Error cargando anime:', err);
      } finally {
        setTimeout(() => setLoading(false), 500);
      }
    }

    loadData();
  }, [id]);

  // Estadísticas del anime
  const stats = useMemo(() => {
    const totalEpisodios = episodios.length;
    const anioEstreno = anime?.fecha_estreno
      ? new Date(anime.fecha_estreno).getFullYear()
      : null;
    const totalTemporadas = temporadas.length;
    const estadoLabel = anime?.estado_emision === 'emitido' ? 'En emisión'
      : anime?.estado_emision === 'terminado' ? 'Finalizado'
      : anime?.estado_emision === 'suspendido' ? 'Suspendido'
      : 'Desconocido';

    return { totalEpisodios, anioEstreno, totalTemporadas, estadoLabel };
  }, [episodios, temporadas, anime]);

  // ============================================================================
  // LOADING SKELETON
  // ============================================================================
  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950">
        <div className="h-64 md:h-80 skeleton-shimmer relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 animate-spin-slow flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-zinc-400 animate-pulse">Cargando anime...</p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 -mt-20 relative z-10">
          <div className="flex gap-6">
            <div className="w-40 shrink-0">
              <div className="aspect-[3/4] rounded-xl skeleton-shimmer" />
            </div>
            <div className="flex-1 pt-16 space-y-4">
              <div className="h-8 w-2/3 skeleton-shimmer rounded-lg" />
              <div className="h-4 w-full skeleton-shimmer rounded-lg" />
              <div className="h-4 w-4/5 skeleton-shimmer rounded-lg" />
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="h-14 skeleton-shimmer rounded-lg" />
                <div className="h-14 skeleton-shimmer rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ============================================================================
  // NO ENCONTRADO
  // ============================================================================
  if (!anime) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center animate-fade-in">
          <div className="text-6xl mb-4">😢</div>
          <p className="text-white text-lg font-bold">Anime no encontrado</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
            ← Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================
  const estadoDot =
    anime.estado_emision === 'emitido' ? 'bg-green-500' :
    anime.estado_emision === 'suspendido' ? 'bg-red-500' :
    anime.estado_emision === 'terminado' ? 'bg-blue-500' : 'bg-zinc-500';

  const esSaga = temporadas.length > 1;

  return (
    <main className="min-h-screen bg-zinc-950 pb-20">
      {/* ==================== BANNER ==================== */}
      <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
        {anime.banner_url || anime.portada_url ? (
          <img
            src={anime.banner_url || anime.portada_url}
            alt={anime.titulo}
            className="h-full w-full object-cover animate-parallax"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
        )}

        {/* Gradientes de superposición */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-zinc-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-transparent" />

        {/* Botón volver */}
        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 z-20 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur-md px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-black/80 transition-all hover:scale-105 animate-fade-in"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Volver
        </button>

        {/* Badge de saga */}
        {esSaga && anime.saga_titulo && (
          <div className="absolute top-6 right-6 z-20 rounded-full bg-blue-600/90 backdrop-blur-md px-4 py-2 text-xs font-bold text-white animate-fade-in flex items-center gap-2">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
            </svg>
            SAGA · {temporadas.length} TEMPORADAS
          </div>
        )}
      </div>

      {/* ==================== INFO PRINCIPAL ==================== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-40 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Portada */}
          <div className="w-40 md:w-56 shrink-0 mx-auto md:mx-0 animate-slide-up">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border-2 border-zinc-800/60 shadow-2xl shadow-black/60 hover:shadow-blue-500/30 transition-all duration-500 hover:scale-[1.03] hover:border-blue-500/40">
              {anime.portada_url ? (
                <img
                  src={anime.portada_url}
                  alt={anime.titulo}
                  className="h-full w-full object-cover transition-transform duration-700"
                />
              ) : (
                <div className="h-full w-full bg-zinc-800 flex items-center justify-center text-5xl">🎬</div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 pt-2 md:pt-24">
            {/* Título */}
            <div className="flex items-start gap-3 animate-slide-up delay-100">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight">
                {anime.titulo}
              </h1>
              <span className={`mt-2 h-3 w-3 rounded-full ${estadoDot} animate-pulse shrink-0`} />
            </div>

            {/* Estado + Meta */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs animate-slide-up delay-200">
              <span className="px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 font-mono uppercase tracking-wider">
                {stats.estadoLabel}
              </span>
              {stats.anioEstreno && (
                <span className="text-zinc-400 font-mono">{stats.anioEstreno}</span>
              )}
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-400 font-mono">
                {stats.totalTemporadas} {stats.totalTemporadas === 1 ? 'temporada' : 'temporadas'}
              </span>
              <span className="text-zinc-400">·</span>
              <span className="text-zinc-400 font-mono">
                {stats.totalEpisodios} {stats.totalEpisodios === 1 ? 'episodio' : 'episodios'}
              </span>
            </div>

            {/* Sinopsis */}
            {anime.sinopsis && (
              <p className="mt-4 text-sm md:text-base text-zinc-400 max-w-3xl leading-relaxed animate-slide-up delay-300">
                {anime.sinopsis}
              </p>
            )}

            {/* Géneros */}
            {anime.generos && anime.generos.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 animate-slide-up delay-400">
                {anime.generos.map((genero) => (
                  <span
                    key={genero}
                    className="px-3 py-1 rounded-full bg-blue-950/40 border border-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-900/40 hover:border-blue-400/50 transition-all cursor-default"
                  >
                    {genero}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==================== CONTENIDO ==================== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12">
        {temporadas.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-12 text-center animate-fade-in">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="text-lg font-bold text-white mb-2">Sin episodios disponibles</h3>
            <p className="text-sm text-zinc-500">
              Este anime aún no tiene episodios cargados en la plataforma.
            </p>
          </div>
        ) : (
          <>
            {/* ==================== SELECTOR DE TEMPORADAS ==================== */}
            {esSaga && (
              <div className="mb-8 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                    </svg>
                    Temporadas
                  </h2>
                  <span className="text-xs text-zinc-500 font-mono">
                    {temporadas.length} disponibles
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                  {temporadas.map((temp, index) => {
                    const epsDeTemp = episodios.filter(ep => ep.temporada_id === temp.id);
                    const esActiva = temporadaActiva === temp.id;

                    return (
                      <button
                        key={temp.id}
                        onClick={() => setTemporadaActiva(temp.id)}
                        className={`group relative shrink-0 px-5 py-3 rounded-xl transition-all duration-300 ${
                          esActiva
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/40 scale-[1.02]'
                            : 'bg-zinc-900/80 text-zinc-400 hover:bg-zinc-800 hover:text-white border border-zinc-800/60 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono ${esActiva ? 'text-blue-200' : 'text-zinc-500'}`}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="text-sm font-bold whitespace-nowrap">
                            {temp.nombre.length > 30 ? `${temp.nombre.substring(0, 30)}...` : temp.nombre}
                          </span>
                        </div>
                        <div className={`mt-1 text-[10px] font-mono ${esActiva ? 'text-blue-200' : 'text-zinc-500'}`}>
                          {epsDeTemp.length} {epsDeTemp.length === 1 ? 'episodio' : 'episodios'}
                        </div>

                        {/* Indicador activo */}
                        {esActiva && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-1 w-8 rounded-full bg-blue-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==================== GRID DE EPISODIOS ==================== */}
            {temporadas.map((temp) => {
              const epsDeTemp = episodios.filter(ep => ep.temporada_id === temp.id);

              // Si hay múltiples temporadas, mostrar solo la activa
              if (esSaga && temp.id !== temporadaActiva) return null;
              // Si solo hay una temporada, mostrar todas
              if (!esSaga && epsDeTemp.length === 0) return null;

              if (epsDeTemp.length === 0) {
                return (
                  <div key={temp.id} className="rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-12 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="text-sm text-zinc-500">Esta temporada aún no tiene episodios.</p>
                  </div>
                );
              }

              return (
                <div key={temp.id} className="animate-fade-in">
                  {/* Header de temporada */}
                  <div className="border-b border-zinc-900 pb-4 mb-6 flex items-end justify-between">
                    <div>
                      <h2 className="text-xl font-black text-white flex items-center gap-2">
                        {temp.nombre}
                      </h2>
                      <p className="text-xs text-zinc-500 mt-1 font-mono">
                        {epsDeTemp.length} {epsDeTemp.length === 1 ? 'episodio' : 'episodios'} · {stats.estadoLabel}
                      </p>
                    </div>

                    {/* Botón de reproducir primero */}
                    {epsDeTemp.length > 0 && (
                      <Link
                        href={`/ver/${epsDeTemp[0].id}`}
                        className="hidden sm:flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white transition-all hover:scale-105 shadow-lg shadow-blue-600/30"
                      >
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Reproducir EP 1
                      </Link>
                    )}
                  </div>

                  <EpisodeGrid episodios={epsDeTemp} />
                </div>
              );
            })}
          </>
        )}
      </section>
    </main>
  );
}
