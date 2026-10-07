"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Episodio, Anime } from '@/types/database';
import M3U8Player from '@/components/M3U8Player';
import VideoPlayer from '@/components/VideoPlayer';
import { registrarVisualizacion } from '@/lib/ai-recommendations';
import { addWatchTime, markEpisodeAsWatched } from '@/lib/tracking';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default function Page({ params }: PageProps) {
  const { id } = (React as any).use ? (React as any).use(params) : (params as { id: string });
  const [episodio, setEpisodio] = useState<Episodio | null>(null);
  const [anime, setAnime] = useState<Anime | null>(null);
  const [mismaTemporada, setMismaTemporada] = useState<Episodio[]>([]);
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState('');
  const [streamLoading, setStreamLoading] = useState(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) markEpisodeAsWatched(id);
  }, [id]);

  useEffect(() => {
    heartbeatRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') addWatchTime(10);
    }, 10000);
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  useEffect(() => {
    async function getStream() {
      if (!episodio?.url_stream) return;
      const url = episodio.url_stream;

      // ✅ Si ya es UPNShare/Voe → usar directo
      if (
        url.includes('uns.bio') ||
        url.includes('voe.sx') ||
        url.includes('byselapuix') ||
        url.includes('mp4upload')
      ) {
        setStreamLoading(false);
        return;
      }

      // ✅ Si es Zilla → resolver al vuelo
      setStreamLoading(true);
      try {
        const res = await fetch('/api/resolve-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episodioId: episodio.id }),
        });
        const data = await res.json();

        if (data.success && data.streamUrl) {
          // ✅ Actualizar el episodio con la nueva URL
          setEpisodio({ ...episodio, url_stream: data.streamUrl });
          // ✅ NO llamar a setStreamUrl → dejar que VideoPlayer use url_stream
          setStreamLoading(false);
          return;
        } else {
          console.warn('Resolver no devolvió streamUrl:', data.error);
        }
      } catch (err) {
        console.error('Error resolviendo stream:', err);
      } finally {
        setStreamLoading(false);
      }
    }
    }, [episodio]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const { data: epData } = await supabase
          .from('episodios')
          .select('*')
          .eq('id', id)
          .single();

        if (epData && mounted) {
          setEpisodio(epData as Episodio);

          const { data: tempData } = await supabase
            .from('temporadas')
            .select('anime_id')
            .eq('id', (epData as Episodio).temporada_id)
            .single();

          if (tempData && mounted) {
            const { data: animeData } = await supabase
              .from('animes')
              .select('*')
              .eq('id', tempData.anime_id)
              .single();

            if (animeData && mounted) {
              setAnime(animeData);
              registrarVisualizacion(animeData, epData as Episodio, 0);
            }
          }

          const { data: sameSeason } = await supabase
            .from('episodios')
            .select('*')
            .eq('temporada_id', (epData as Episodio).temporada_id)
            .order('numero', { ascending: true });

          if (sameSeason && mounted) {
            setMismaTemporada(sameSeason as Episodio[]);
          }
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--tenko-bg-page)]">
        <div className="animate-spin h-12 w-12 border-2 border-t-[#6c00f4] border-[var(--tenko-border)] rounded-full" />
      </main>
    );
  }

  if (!episodio) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--tenko-bg-page)] text-[var(--tenko-text-primary)]">
        <span className="font-mono text-xs tracking-widest text-[var(--tenko-text-muted)]">
          // EPISODIO NO ENCONTRADO
        </span>
      </main>
    );
  }

  const currentIndex = mismaTemporada.findIndex((e) => e.id === episodio.id);
  const prevEp = currentIndex > 0 ? mismaTemporada[currentIndex - 1] : null;
  const nextEp =
    currentIndex >= 0 && currentIndex < mismaTemporada.length - 1
      ? mismaTemporada[currentIndex + 1]
      : null;

  const tituloEpisodio = episodio.titulo_episodio || episodio.titulo;
  const ambientImage = anime?.banner_url || anime?.portada_url || '';

  return (
    <main className="relative min-h-screen bg-[var(--tenko-bg-page)] pb-16 overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════
          🔮 AMBIENT GLOW — SOLO EN ESTA RUTA (/ver/[id])
          Proyecta la paleta del banner detrás del reproductor.
      ═══════════════════════════════════════════════════════════ */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        {ambientImage && (
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[70vh] opacity-30 dark:opacity-30 blur-[140px]"
            style={{
              backgroundImage: `url(${ambientImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: 0.15,
            }}
          />
        )}
        <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-[#6c00f4]/20 via-transparent to-transparent" />
      </div>

      <section className="w-full border-b border-[var(--tenko-border)] bg-black/60 backdrop-blur-xl py-6 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Navegación */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <Link
              href={anime ? `/anime/${anime.id}` : '/'}
              className="font-mono text-[11px] tracking-widest text-[var(--tenko-text-secondary)] hover:text-[#6c00f4] transition-colors"
            >
              ← {anime ? anime.titulo.toUpperCase() : 'VOLVER'}
            </Link>
            <div className="flex gap-2">
              {prevEp ? (
                <Link
                  href={`/ver/${prevEp.id}`}
                  className="font-mono rounded-md border border-[var(--tenko-border)] bg-white/5 px-3 py-1.5 text-[11px] tracking-widest text-[var(--tenko-text-primary)]/60 hover:bg-white/10 hover:text-[var(--tenko-text-primary)] transition-all"
                >
                  ← EP {String(prevEp.numero).padStart(2, '0')}
                </Link>
              ) : null}
              {nextEp ? (
                <Link
                  href={`/ver/${nextEp.id}`}
                  className="font-mono rounded-md border border-[#6c00f4]/40 bg-[#6c00f4]/20 px-3 py-1.5 text-[11px] tracking-widest text-[#6c00f4] hover:bg-[#6c00f4] hover:text-[var(--tenko-text-primary)] transition-all"
                >
                  EP {String(nextEp.numero).padStart(2, '0')} →
                </Link>
              ) : null}
            </div>
          </div>

          {/* Título del episodio */}
          <div>
            <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-1">
              // EPISODIO {String(episodio.numero).padStart(2, '0')}
            </span>
            <h1 className="font-[family-name:var(--font-unbounded)] text-xl sm:text-3xl font-black text-[var(--tenko-text-primary)] tracking-tight leading-tight">
              {tituloEpisodio}
            </h1>
          </div>

          {/* Reproductor */}
          <div className="rounded-xl overflow-hidden border border-[var(--tenko-border)] shadow-2xl shadow-black/50">
            {streamLoading ? (
              <div className="flex items-center justify-center py-20 bg-black">
                <div className="animate-spin h-10 w-10 border-2 border-t-[#6c00f4] border-[var(--tenko-border)] rounded-full" />
              </div>
            ) : (
              <VideoPlayer episodio={episodio} />
            )}
          </div>
        </div>
      </section>

      {/* Lista de episodios */}
      {mismaTemporada.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-10">
          <div className="mb-6 border-b border-[var(--tenko-border)] pb-4">
            <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-1">
              // TEMPORADA COMPLETA
            </span>
            <h2 className="font-[family-name:var(--font-unbounded)] text-lg font-black text-[var(--tenko-text-primary)] uppercase tracking-tight">
              Episodios de esta temporada
            </h2>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {mismaTemporada.map((ep) => {
              const isCurrent = ep.id === episodio.id;
              const tituloEp =
                ep.titulo_episodio && ep.titulo_episodio !== `Episodio ${ep.numero}`
                  ? ep.titulo_episodio
                  : null;

              return (
                <Link
                  key={ep.id}
                  href={`/ver/${ep.id}`}
                  title={tituloEp ? `EP ${ep.numero}: ${tituloEp}` : `Episodio ${ep.numero}`}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    isCurrent
                      ? 'border-[#6c00f4] bg-[#6c00f4]/15 ring-1 ring-[#6c00f4]/50 shadow-[0_0_20px_-5px_rgba(108,0,244,0.5)]'
                      : 'border-[var(--tenko-border)] bg-white/5 hover:border-[#6c00f4]/40 hover:bg-white/10'
                  }`}
                >
                  <span
                    className={`block font-mono text-xs font-extrabold tracking-wider ${
                      isCurrent ? 'text-[#6c00f4]' : 'text-[var(--tenko-text-secondary)]'
                    }`}
                  >
                    EP {String(ep.numero).padStart(2, '0')}
                  </span>
                  {tituloEp && (
                    <span
                      className={`block text-[9px] truncate mt-0.5 ${
                        isCurrent ? 'text-[#6c00f4]/80' : 'text-[var(--tenko-text-muted)]'
                      }`}
                    >
                      {tituloEp}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
