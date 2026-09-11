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

  // Tracking
  useEffect(() => {
    if (id) {
      markEpisodeAsWatched(id);
    }
  }, [id]);

  useEffect(() => {
    heartbeatRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') {
        addWatchTime(10);
      }
    }, 10000);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  // Obtener stream M3U8
  useEffect(() => {
    async function getStream() {
      if (!episodio?.url_stream) return;
      
      setStreamLoading(true);
      try {
        const res = await fetch(`/api/stream?url=${encodeURIComponent(episodio.url_stream)}`);
        const data = await res.json();
        
        if (data.success && data.streamUrl) {
          setStreamUrl(data.streamUrl);
        }
      } catch (err) {
        console.error('Error obteniendo stream:', err);
      } finally {
        setStreamLoading(false);
      }
    }

    if (episodio) {
      getStream();
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
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="animate-spin h-12 w-12 border-2 border-t-blue-500 border-zinc-800 rounded-full" />
      </main>
    );
  }

  if (!episodio) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Episodio no encontrado
      </main>
    );
  }

  const currentIndex = mismaTemporada.findIndex((e) => e.id === episodio.id);
  const prevEp = currentIndex > 0 ? mismaTemporada[currentIndex - 1] : null;
  const nextEp = currentIndex >= 0 && currentIndex < mismaTemporada.length - 1 ? mismaTemporada[currentIndex + 1] : null;

  // Título para mostrar: prioriza titulo_episodio
  const tituloEpisodio = episodio.titulo_episodio || episodio.titulo;

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <section className="w-full border-b border-zinc-800/80 bg-black/80 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Navegación */}
          <div className="flex items-center justify-between">
            <Link href={anime ? `/anime/${anime.id}` : '/'} className="text-xs font-semibold text-zinc-400 hover:text-blue-400">
              ← {anime ? anime.titulo : 'Volver'}
            </Link>
            <div className="flex gap-2">
              {prevEp ? (
                <Link href={`/ver/${prevEp.id}`} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
                  ← EP {prevEp.numero}
                </Link>
              ) : null}
              {nextEp ? (
                <Link href={`/ver/${nextEp.id}`} className="rounded-lg border border-blue-600/40 bg-blue-600/20 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-600 hover:text-white">
                  EP {nextEp.numero} →
                </Link>
              ) : null}
            </div>
          </div>

          {/* Reproductor */}
          {streamLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin h-10 w-10 border-2 border-t-blue-500 border-zinc-800 rounded-full" />
            </div>
          ) : streamUrl ? (
            <M3U8Player
              src={streamUrl}
              episodeId={episodio.id}
              episodeNumber={episodio.numero}
              title={tituloEpisodio}
              animeId={anime?.id}
              animeTitulo={anime?.titulo}
              animePortada={anime?.portada_url}
              temporadaId={episodio.temporada_id}
              onNextEpisode={() => {
                if (nextEp) window.location.href = `/ver/${nextEp.id}`;
              }}
              onPrevEpisode={() => {
                if (prevEp) window.location.href = `/ver/${prevEp.id}`;
              }}
            />
          ) : (
            <VideoPlayer
              episodio={episodio}
              onNextEpisode={() => {
                if (nextEp) window.location.href = `/ver/${nextEp.id}`;
              }}
              onPrevEpisode={() => {
                if (prevEp) window.location.href = `/ver/${prevEp.id}`;
              }}
            />
          )}
        </div>
      </section>

      {/* Lista de episodios */}
      {mismaTemporada.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-8">
          <h2 className="text-lg font-bold text-white mb-4">
            Episodios de esta temporada
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {mismaTemporada.map((ep) => {
              const isCurrent = ep.id === episodio.id;
              const tituloEp = ep.titulo_episodio && ep.titulo_episodio !== `Episodio ${ep.numero}` 
                ? ep.titulo_episodio 
                : null;
              
              return (
                <Link
                  key={ep.id}
                  href={`/ver/${ep.id}`}
                  title={tituloEp ? `EP ${ep.numero}: ${tituloEp}` : `Episodio ${ep.numero}`}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50'
                      : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
                  }`}
                >
                  <span className={`block text-xs font-extrabold ${isCurrent ? 'text-blue-400' : 'text-zinc-400'}`}>
                    EP {String(ep.numero).padStart(2, '0')}
                  </span>
                  {tituloEp && (
                    <span className={`block text-[9px] truncate mt-0.5 ${isCurrent ? 'text-blue-300' : 'text-zinc-500'}`}>
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
