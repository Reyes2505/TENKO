'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime, Episodio } from '@/types/database';

export default function AnimeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [anime, setAnime] = useState<Anime | null>(null);
  const [episodios, setEpisodios] = useState<Episodio[]>([]);
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

          const { data: epsData } = await supabase
            .from('episodios')
            .select('*')
            .eq('anime_id', id)
            .order('numero', { ascending: true });

          if (epsData) setEpisodios(epsData);
        }
      } catch {
        setAnime(null);
      } finally {
        setLoading(false);
      }
    }
    loadAnimeDetail();
  }, [id]);

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

  const estadoTexto = anime.estado_emision && anime.estado_emision !== 'desconocido'
    ? anime.estado_emision.toUpperCase()
    : 'AL AIRE';

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] text-[var(--tenko-text-primary)] transition-colors duration-200">
      {/* Hero Section Limpia con Degradados Únicamente en los Límites */}
      <section className="relative w-full overflow-hidden bg-[var(--tenko-bg-page)] min-h-[460px] lg:min-h-[520px] flex items-end pb-12 pt-24">
        {/* Banner de Fondo Completo y Vivido */}
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
                {episodios.length > 0 ? (
                  <Link
                    href={`/ver/${episodios[0].id}`}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#6c00f4] px-6 py-3 text-xs font-bold tracking-wider text-white hover:bg-[#5800cc] transition shadow-md shadow-[#6c00f4]/20 active:scale-95"
                  >
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    VER PRIMER EPISODIO
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

      {/* Lista de Episodios */}
      <section className="mx-auto max-w-7xl px-6 lg:px-8 py-10 space-y-6">
        <div className="border-b border-[var(--tenko-border)] pb-4 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-unbounded)] text-lg font-black uppercase tracking-tight text-[var(--tenko-text-primary)]">
            Episodios Disponibles ({episodios.length})
          </h2>
        </div>

        {episodios.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {episodios.map((ep) => (
              <Link
                key={ep.id}
                href={`/ver/${ep.id}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] hover:border-[#6c00f4] transition shadow-sm"
              >
                <div className="aspect-video w-full bg-[var(--tenko-bg-page)] relative overflow-hidden">
                  {ep.thumbnail_url || anime.portada_url ? (
                    <img
                      src={ep.thumbnail_url || anime.portada_url}
                      alt={ep.titulo || `Episodio ${ep.numero}`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-[var(--tenko-text-secondary)] font-mono">
                      EP {ep.numero}
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-[var(--tenko-bg-card)]/90 font-mono text-[10px] text-[var(--tenko-text-primary)] border border-[var(--tenko-border)] font-bold">
                    EP {String(ep.numero).padStart(2, '0')}
                  </div>
                </div>

                <div className="p-3">
                  <h3 className="text-xs font-bold text-[var(--tenko-text-primary)] group-hover:text-[#6c00f4] transition truncate">
                    {ep.titulo || `Episodio ${ep.numero}`}
                  </h3>
                </div>
              </Link>
            ))}
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
