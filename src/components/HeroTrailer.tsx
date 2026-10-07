'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Anime } from '@/types/database';
import { isEpisodeFavorite } from '@/lib/offlineStore';
import { getFileBlobUrl } from '@/lib/filestore';

interface HeroTrailerProps {
  anime: Anime;
  onOpenEditor?: () => void;
}

export default function HeroTrailer({ anime, onOpenEditor }: HeroTrailerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [videoErrorMessage, setVideoErrorMessage] = useState('');
  const [activeTrailerUrl, setActiveTrailerUrl] = useState<string>(
    anime.trailer_url || '/videos/trailers/mushoku_trailer.mp4'
  );
  const [hasRetriedTrailer, setHasRetriedTrailer] = useState(false);

  const FALLBACK_TRAILER_URL =
    'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';
  const trailerUrl = anime.trailer_url || '/videos/trailers/mushoku_trailer.mp4';
  const isOnlineTrailer =
    anime.trailer_type === 'online' ||
    activeTrailerUrl.startsWith('http://') ||
    activeTrailerUrl.startsWith('https://');

  // Resolve indexeddb:// scheme into a blob URL if present
  useEffect(() => {
    let cancelled = false;
    async function resolveIndexed() {
      if (activeTrailerUrl.startsWith('indexeddb://')) {
        const key = activeTrailerUrl.replace('indexeddb://', '');
        try {
          const url = await getFileBlobUrl(key);
          if (url && !cancelled) setActiveTrailerUrl(url);
        } catch {
          // ignore
        }
      }
    }
    resolveIndexed();
    return () => {
      cancelled = true;
    };
  }, [activeTrailerUrl]);

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <section className="relative w-full overflow-hidden border-b border-[var(--tenko-border)]/80 bg-zinc-950 text-[var(--tenko-text-primary)] min-h-[460px] lg:min-h-[520px] flex items-center">
      {/* Background Video / Trailer Player */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {!videoError && activeTrailerUrl ? (
          isOnlineTrailer && activeTrailerUrl.includes('youtube.com') ? (
            <iframe
              src={`${activeTrailerUrl}?autoplay=1&mute=1&loop=1&controls=0`}
              className="h-full w-full object-cover opacity-40 pointer-events-none scale-125"
              allow="autoplay; encrypted-media"
            />
          ) : (
            <video
              ref={videoRef}
              src={activeTrailerUrl}
              autoPlay
              loop
              muted={isMuted}
              playsInline
              onError={() => {
                if (!hasRetriedTrailer) {
                  setHasRetriedTrailer(true);
                  setActiveTrailerUrl(FALLBACK_TRAILER_URL);
                  setVideoErrorMessage('Fallo al cargar tráiler local. Probando alternativa...');
                } else {
                  setVideoError(true);
                  setVideoErrorMessage(
                    'No se pudo reproducir el tráiler local. Comprueba que el archivo exista y sea compatible (MP4 H.264/AAC).',
                  );
                }
              }}
              className="h-full w-full object-cover opacity-35 transition-opacity duration-700"
            />
          )
        ) : (
          /* Background Static Image Fallback */
          <div
            className="h-full w-full bg-cover bg-center opacity-30"
            style={{
              backgroundImage: `url(${
                anime.banner_url || anime.portada_url || 'https://wallpapercave.com/wp/wp8527011.jpg'
              })`,
            }}
          />
        )}

        {/* Gradient Overlays for Cinematic Depth */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
      </div>

        {/* Error overlay para tráiler */}
        {videoError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center bg-zinc-950/90">
            <h3 className="text-lg font-bold text-[var(--tenko-text-primary)] mb-2">Error al reproducir el tráiler</h3>
            <p className="text-sm text-zinc-300 max-w-xl mb-4">{videoErrorMessage}</p>
            <div className="flex gap-3">
              <a
                href={activeTrailerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-[#6c00f4] px-4 py-2 text-sm font-bold text-[var(--tenko-text-primary)] hover:bg-white hover:text-black"
              >
                Abrir tráiler en nueva pestaña
              </a>
              <button
                onClick={() => {
                  setVideoError(false);
                  setHasRetriedTrailer(false);
                  setActiveTrailerUrl(trailerUrl);
                }}
                className="rounded-xl border border-[var(--tenko-border)] px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-800"
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

      {/* Hero Content Layer */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

          {/* Left Column: Details */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#6c00f4]/40 bg-[#6c00f4]/15 px-3 py-1 text-xs font-bold text-[#6c00f4]">
                <span className="h-2 w-2 rounded-full bg-[#6c00f4] animate-ping" />
                Tráiler Presentación {isOnlineTrailer ? '(Online Stream)' : '(Local MP4)'}
              </span>
              <span className="rounded-full border border-[var(--tenko-border)] bg-black/40/80 px-2.5 py-0.5 text-xs text-zinc-400">
                Super Colección
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-[var(--tenko-text-primary)] sm:text-5xl lg:text-6xl drop-shadow-md">
              {anime.titulo}
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 max-w-2xl line-clamp-3 leading-relaxed drop-shadow">
              {anime.sinopsis}
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                                href="/anime/9315fccb-10c8-476e-b6fb-3471f6f36ec2"
                className="inline-flex items-center gap-2 rounded-xl bg-[#6c00f4] px-5 py-3 text-sm font-bold text-[var(--tenko-text-primary)] shadow-xl shadow-[#6c00f4]/30 hover:bg-white hover:text-black transition-all active:scale-95"
              >
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Comenzar Serie
              </Link>

              <Link
                href="/perfil"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-black/40/80 px-4 py-3 text-sm font-semibold text-zinc-200 backdrop-blur-md hover:bg-zinc-800 hover:text-[var(--tenko-text-primary)] transition-all active:scale-95"
              >
                <svg className="h-5 w-5 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
                Mi Lista
              </Link>

              {/* Controles de Tráiler */}
              {!videoError && !isOnlineTrailer && (
                <div className="flex items-center gap-1.5 rounded-xl border border-[var(--tenko-border)] bg-zinc-950/70 p-1 backdrop-blur-md">
                  <button
                    onClick={togglePlay}
                    className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-800 hover:text-[var(--tenko-text-primary)] transition-colors"
                    title={isPlaying ? 'Pausar tráiler' : 'Reproducir tráiler'}
                  >
                    {isPlaying ? (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    )}
                  </button>

                  <button
                    onClick={toggleMute}
                    className="rounded-lg p-2 text-zinc-300 hover:bg-zinc-800 hover:text-[var(--tenko-text-primary)] transition-colors"
                    title={isMuted ? 'Activar sonido' : 'Silenciar'}
                  >
                    {isMuted ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V9c0-.414.336-.75.75-.75h2.24z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.287a5.25 5.25 0 010 7.426M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.414 0-.75-.336-.75-.75V9c0-.414.336-.75.75-.75h2.24z" />
                      </svg>
                    )}
                  </button>
                </div>
              )}

              {onOpenEditor && (
                <button
                  onClick={onOpenEditor}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700/60 bg-black/40/60 px-3 py-2 text-xs font-semibold text-zinc-400 hover:text-[var(--tenko-text-primary)] hover:bg-zinc-800 transition-all"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  Editar Anime
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Mini Poster Card */}
          <div className="hidden lg:flex justify-end lg:col-span-4">
            <div className="relative aspect-[2/3] w-64 overflow-hidden rounded-2xl border border-[var(--tenko-border)] bg-black/40 shadow-2xl transition-all duration-300 hover:scale-105 hover:border-[#6c00f4]/50">
              <img
                src={anime.portada_url || 'https://images.justwatch.com/poster/243888320/s718/mushoku-tensei-jobless-reincarnation.jpg'}
                alt={anime.titulo}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />
              <div className="absolute bottom-3 left-3 right-3">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#6c00f4]">
                  En emisión local
                </span>
                <span className="block font-bold text-sm text-[var(--tenko-text-primary)] truncate">
                  {anime.titulo}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
