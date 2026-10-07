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
        const { data: animeData } = await supabase
          .from('animes')
          .select('*')
          .eq('id', id)
          .single();

        if (!animeData) return;
        setAnime(animeData);

        const animeConSaga = animeData as AnimeConSaga;
        const sagaPadreId = animeConSaga.anime_padre_id || animeData.id;

        const { data: sagaAnimes } = await supabase
          .from('animes')
          .select('id, titulo, portada_url, banner_url, sinopsis, estado_emision, fecha_estreno, generos, saga_titulo, anime_padre_id')
          .or(`id.eq.${sagaPadreId},anime_padre_id.eq.${sagaPadreId}`)
          .order('fecha_estreno');

        if (!sagaAnimes || sagaAnimes.length === 0) return;

        const animesOrdenados = [...sagaAnimes].sort((a, b) => {
          if (a.id === sagaPadreId) return -1;
          if (b.id === sagaPadreId) return 1;
          const fechaA = a.fecha_estreno ? new Date(a.fecha_estreno).getTime() : 0;
          const fechaB = b.fecha_estreno ? new Date(b.fecha_estreno).getTime() : 0;
          return fechaA - fechaB;
        });

        const animeIdsSaga = animesOrdenados.map(a => a.id);

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

        const tempsEnriquecidas: Temporada[] = [];
        for (const animeSaga of animesOrdenados) {
          const tempsDelAnime = tempsData.filter(t => t.anime_id === animeSaga.id);
          const esPrincipal = animeSaga.id === sagaPadreId;
          const totalAnimesSaga = animesOrdenados.length;

          for (const temp of tempsDelAnime) {
            let nombreTemp = temp.nombre;
            if (totalAnimesSaga > 1 && !esPrincipal) {
              nombreTemp = `${animeSaga.titulo}`;
            } else if (totalAnimesSaga > 1 && tempsDelAnime.length > 1) {
              nombreTemp = temp.nombre;
            }

            tempsEnriquecidas.push({
              ...temp,
              nombre: nombreTemp,
              orden: (animeSaga.fecha_estreno
                ? new Date(animeSaga.fecha_estreno).getFullYear() * 100
                : 0) + (temp.orden || 0),
            } as Temporada & { orden: number });
          }
        }

        const tempIds = tempsEnriquecidas.map(t => t.id);
        const { data: epsData } = await supabase
          .from('episodios')
          .select('*')
          .in('temporada_id', tempIds)
          .order('numero');

        if (epsData) setEpisodios(epsData);
        setTemporadas(tempsEnriquecidas);

        if (tempsEnriquecidas.length > 0) {
          setTemporadaActiva(tempsEnriquecidas[0].id);
        }
      } catch (err) {
        console.error('Error cargando anime:', err);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    }

    loadData();
  }, [id]);

  const stats = useMemo(() => {
    const totalEpisodios = episodios.length;
    const anioEstreno = anime?.fecha_estreno ? new Date(anime.fecha_estreno).getFullYear() : null;
    const totalTemporadas = temporadas.length;
    const estadoLabel = anime?.estado_emision === 'emitido' ? 'EN EMISIÓN'
      : anime?.estado_emision === 'terminado' ? 'FINALIZADO'
      : anime?.estado_emision === 'suspendido' ? 'SUSPENDIDO'
      : 'DESCONOCIDO';

    return { totalEpisodios, anioEstreno, totalTemporadas, estadoLabel };
  }, [episodios, temporadas, anime]);

  // Loading
  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--tenko-bg-page)]">
        <div className="h-64 md:h-80 bg-white/5 animate-pulse relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-[#6c00f4]/20 border border-[#6c00f4]/40 animate-pulse flex items-center justify-center">
                <svg className="h-8 w-8 text-[#6c00f4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="font-mono text-[11px] tracking-widest text-[var(--tenko-text-muted)]">
                // CARGANDO ANIME...
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 -mt-20 relative z-10">
          <div className="flex gap-6">
            <div className="w-40 shrink-0">
              <div className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse" />
            </div>
            <div className="flex-1 pt-16 space-y-4">
              <div className="h-8 w-2/3 bg-white/5 animate-pulse rounded-lg" />
              <div className="h-4 w-full bg-white/5 animate-pulse rounded-lg" />
              <div className="h-4 w-4/5 bg-white/5 animate-pulse rounded-lg" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // No encontrado
  if (!anime) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--tenko-bg-page)]">
        <div className="text-center">
          <div className="text-6xl mb-4">😢</div>
          <p className="font-[family-name:var(--font-unbounded)] text-lg font-bold text-[var(--tenko-text-primary)]">
            Anime no encontrado
          </p>
          <Link href="/" className="font-mono text-[11px] tracking-widest text-[#6c00f4] hover:text-[var(--tenko-text-primary)] text-xs mt-3 inline-block transition-colors">
            ← VOLVER AL INICIO
          </Link>
        </div>
      </main>
    );
  }

  const estadoDot =
    anime.estado_emision === 'emitido' ? 'bg-emerald-500' :
    anime.estado_emision === 'suspendido' ? 'bg-red-500' :
    anime.estado_emision === 'terminado' ? 'bg-[#6c00f4]' : 'bg-zinc-500';

  const esSaga = temporadas.length > 1;
  const ambientImage = anime.banner_url || anime.portada_url || '';

  return (
    <main className="relative min-h-screen bg-[var(--tenko-bg-page)] pb-20 overflow-hidden">
      {/* Glow sutil derivado del banner (pero NO es el Ambient Glow del reproductor) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {ambientImage && (
          <div
            className="absolute top-0 left-0 w-full h-[60vh] opacity-10 blur-[140px]"
            style={{
              backgroundImage: `url(${ambientImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
        )}
      </div>

      {/* ==================== BANNER ==================== */}
      <div className="relative h-[60vh] min-h-[400px] overflow-hidden">
        {anime.banner_url || anime.portada_url ? (
          <img
            src={anime.banner_url || anime.portada_url}
            alt={anime.titulo}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-zinc-900 via-[#0a0a0f] to-black" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/70 to-[#0a0a0f]/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f]/80 via-transparent to-transparent" />

        <button
          onClick={() => router.back()}
          className="absolute top-6 left-6 z-20 flex items-center gap-2 rounded-md bg-black/60 backdrop-blur-md border border-[var(--tenko-border)] px-4 py-2 font-mono text-[11px] tracking-widest text-[var(--tenko-text-primary)]/70 hover:text-[var(--tenko-text-primary)] hover:border-[#6c00f4]/60 transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
          </svg>
          VOLVER
        </button>

        {esSaga && anime.saga_titulo && (
          <div className="absolute top-6 right-6 z-20 rounded-md bg-[#6c00f4] px-4 py-2 font-mono text-[10px] font-bold tracking-widest text-[var(--tenko-text-primary)] flex items-center gap-2 shadow-lg shadow-[#6c00f4]/40">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
            </svg>
            SAGA · {temporadas.length} TEMPORADAS
          </div>
        )}
      </div>

      {/* ==================== INFO PRINCIPAL ==================== */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 -mt-40 relative z-10">
        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          <div className="w-40 md:w-56 shrink-0 mx-auto md:mx-0">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border-2 border-[var(--tenko-border)] shadow-2xl shadow-black/60 hover:shadow-[#6c00f4]/30 hover:scale-[1.02] hover:border-[#6c00f4]/40 transition-all duration-500">
              {anime.portada_url ? (
                <img
                  src={anime.portada_url}
                  alt={anime.titulo}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-zinc-800 flex items-center justify-center text-5xl">🎬</div>
              )}
            </div>
          </div>

          <div className="flex-1 pt-2 md:pt-24">
            <div className="flex items-start gap-3">
              <h1 className="font-[family-name:var(--font-unbounded)] text-3xl md:text-4xl lg:text-5xl font-black text-white leading-[1.05] uppercase tracking-tight drop-shadow-lg">
                {anime.titulo}
              </h1>
              <span className={`mt-2 h-3 w-3 rounded-full ${estadoDot} animate-pulse shrink-0`} />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-[10px] tracking-widest">
              <span className="px-3 py-1 rounded-full bg-[#6c00f4]/15 border border-[#6c00f4]/30 text-[#6c00f4] font-bold">
                {stats.estadoLabel}
              </span>
              {stats.anioEstreno && (
                <span className="text-[var(--tenko-text-secondary)]">{stats.anioEstreno}</span>
              )}
              <span className="text-[var(--tenko-text-muted)]">·</span>
              <span className="text-[var(--tenko-text-secondary)]">
                {stats.totalTemporadas} {stats.totalTemporadas === 1 ? 'TEMPORADA' : 'TEMPORADAS'}
              </span>
              <span className="text-[var(--tenko-text-muted)]">·</span>
              <span className="text-[var(--tenko-text-secondary)]">
                {stats.totalEpisodios} {stats.totalEpisodios === 1 ? 'EPISODIO' : 'EPISODIOS'}
              </span>
            </div>

            {anime.sinopsis && (
              <p className="mt-5 font-[family-name:var(--font-space-grotesk)] text-sm md:text-base text-[var(--tenko-text-primary)]/70 max-w-3xl leading-relaxed">
                {anime.sinopsis}
              </p>
            )}

            {anime.generos && anime.generos.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {anime.generos.map((genero) => (
                  <span
                    key={genero}
                    className="font-mono px-3 py-1 rounded-md bg-white/5 border border-[var(--tenko-border)] text-[var(--tenko-text-primary)]/60 text-[10px] tracking-widest font-bold uppercase hover:border-[#6c00f4]/40 hover:text-[#6c00f4] transition-all cursor-default"
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
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-14">
        {temporadas.length === 0 ? (
          <div className="rounded-2xl border border-[var(--tenko-border)] bg-white/[0.02] p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="font-[family-name:var(--font-unbounded)] text-lg font-bold text-[var(--tenko-text-primary)] mb-2">
              Sin episodios disponibles
            </h3>
            <p className="font-mono text-[11px] tracking-widest text-[var(--tenko-text-muted)]">
              // ESTE ANIME AÚN NO TIENE EPISODIOS CARGADOS
            </p>
          </div>
        ) : (
          <>
            {esSaga && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-5 border-b border-[var(--tenko-border)] pb-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[#6c00f4]" />
                    <h2 className="font-[family-name:var(--font-unbounded)] text-lg font-black uppercase tracking-tight text-[var(--tenko-text-primary)]">
                      Temporadas
                    </h2>
                  </div>
                  <span className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)]">
                    {temporadas.length} DISPONIBLES
                  </span>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-3">
                  {temporadas.map((temp, index) => {
                    const epsDeTemp = episodios.filter(ep => ep.temporada_id === temp.id);
                    const esActiva = temporadaActiva === temp.id;

                    return (
                      <button
                        key={temp.id}
                        onClick={() => setTemporadaActiva(temp.id)}
                        className={`group relative shrink-0 px-5 py-3 rounded-lg transition-all duration-300 ${
                          esActiva
                            ? 'bg-[#6c00f4] text-[var(--tenko-text-primary)] shadow-lg shadow-[#6c00f4]/40 scale-[1.02]'
                            : 'bg-white/5 text-[var(--tenko-text-primary)]/60 hover:bg-white/10 hover:text-[var(--tenko-text-primary)] border border-[var(--tenko-border)] hover:border-[#6c00f4]/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-[10px] tracking-widest ${esActiva ? 'text-[var(--tenko-text-primary)]/70' : 'text-[var(--tenko-text-muted)]'}`}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="font-[family-name:var(--font-unbounded)] text-xs font-bold whitespace-nowrap uppercase">
                            {temp.nombre.length > 30 ? `${temp.nombre.substring(0, 30)}...` : temp.nombre}
                          </span>
                        </div>
                        <div className={`mt-1 font-mono text-[9px] tracking-widest ${esActiva ? 'text-[var(--tenko-text-primary)]/60' : 'text-[var(--tenko-text-muted)]'}`}>
                          {epsDeTemp.length} {epsDeTemp.length === 1 ? 'EP' : 'EPS'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {temporadas.map((temp) => {
              const epsDeTemp = episodios.filter(ep => ep.temporada_id === temp.id);

              if (esSaga && temp.id !== temporadaActiva) return null;
              if (!esSaga && epsDeTemp.length === 0) return null;

              if (epsDeTemp.length === 0) {
                return (
                  <div key={temp.id} className="rounded-2xl border border-[var(--tenko-border)] bg-white/[0.02] p-12 text-center">
                    <div className="text-4xl mb-3">📭</div>
                    <p className="font-mono text-[11px] tracking-widest text-[var(--tenko-text-muted)]">
                      // ESTA TEMPORADA AÚN NO TIENE EPISODIOS
                    </p>
                  </div>
                );
              }

              return (
                <div key={temp.id}>
                  <div className="border-b border-[var(--tenko-border)] pb-4 mb-6 flex items-end justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="font-[family-name:var(--font-unbounded)] text-xl font-black text-[var(--tenko-text-primary)] uppercase tracking-tight">
                        {temp.nombre}
                      </h2>
                      <p className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)] mt-1">
                        {epsDeTemp.length} {epsDeTemp.length === 1 ? 'EPISODIO' : 'EPISODIOS'} · {stats.estadoLabel}
                      </p>
                    </div>

                    {epsDeTemp.length > 0 && (
                      <Link
                        href={`/ver/${epsDeTemp[0].id}`}
                        className="hidden sm:flex items-center gap-2 rounded-md bg-[#6c00f4] hover:bg-white hover:text-black px-4 py-2 font-mono text-[11px] tracking-widest font-bold text-[var(--tenko-text-primary)] transition-all shadow-lg shadow-[#6c00f4]/30"
                      >
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        REPRODUCIR EP 1
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
