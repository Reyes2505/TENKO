'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Anime } from '@/types/database';

interface HeroCarouselProps {
  animes: Anime[];
}

export default function HeroCarousel({ animes }: HeroCarouselProps) {
  const destacados = animes.slice(0, 5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const goToSlide = useCallback((index: number) => {
    setIsVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setCurrentIndex(index);
      setIsVisible(true);
    }, 400);
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide((currentIndex + 1) % destacados.length);
  }, [currentIndex, destacados.length, goToSlide]);

  const prevSlide = () => {
    goToSlide((currentIndex - 1 + destacados.length) % destacados.length);
  };

  useEffect(() => {
    if (isPaused || destacados.length <= 1) return;
    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [isPaused, destacados.length, nextSlide]);

  if (!destacados.length) return null;

  const anime = destacados[currentIndex];

  return (
    <section
      className="relative w-full overflow-hidden border-b border-[var(--tenko-border)] bg-[var(--tenko-bg-page)] text-[var(--tenko-text-primary)] min-h-[420px] lg:min-h-[520px] flex items-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background con crossfade */}
      <div className="absolute inset-0 z-0">
        {destacados.map((a, i) => (
          <div
            key={a.id}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out ${
              i === currentIndex ? 'opacity-40' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${a.banner_url || a.portada_url || ''})`,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
        {/* Glow morado sutil de fondo */}
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[#6c00f4]/10 blur-[120px] pointer-events-none" />
      </div>

      {/* Content */}
      <div
        className={`relative z-10 mx-auto max-w-7xl px-6 py-12 lg:px-8 w-full transition-all duration-500 ease-out ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-3">
              <span className="font-mono rounded-full border border-[#6c00f4]/40 bg-[#6c00f4]/15 px-3 py-1 text-[10px] font-bold tracking-widest text-[#6c00f4]">
                ✦ TENKO SPOTLIGHT
              </span>
              <span className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)]">
                {String(currentIndex + 1).padStart(2, '0')} / {String(destacados.length).padStart(2, '0')}
              </span>
            </div>

            <h1 className="font-[family-name:var(--font-unbounded)] text-3xl sm:text-5xl font-black uppercase tracking-tight text-[var(--tenko-text-primary)] drop-shadow-md line-clamp-2 leading-[1.05]">
              {anime.titulo}
            </h1>

            <p className="font-[family-name:var(--font-space-grotesk)] text-sm sm:text-base text-white/70 max-w-2xl line-clamp-2 leading-relaxed">
              {anime.sinopsis || 'Sin descripción disponible'}
            </p>

            <Link
              href={`/anime/${anime.id}`}
              className="inline-flex items-center gap-2 rounded-md bg-[#6c00f4] px-6 py-3 font-mono text-xs font-bold tracking-widest text-[var(--tenko-text-primary)] shadow-xl shadow-[#6c00f4]/30 hover:bg-white hover:text-black transition-all active:scale-95"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              REPRODUCIR EN TENKO
            </Link>
          </div>

          <div className="hidden lg:flex justify-end lg:col-span-4">
            <div className="relative aspect-[3/4] w-44 overflow-hidden rounded-xl border border-[var(--tenko-border)] shadow-2xl shadow-black/60 ring-1 ring-[#6c00f4]/20">
              {anime.portada_url ? (
                <img
                  src={anime.portada_url}
                  alt={anime.titulo}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Flechas */}
      {destacados.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            aria-label="Anterior"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/50 p-2 text-white/60 hover:bg-[#6c00f4] hover:text-[var(--tenko-text-primary)] backdrop-blur-sm transition-all border border-[var(--tenko-border)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            aria-label="Siguiente"
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 rounded-full bg-black/50 p-2 text-white/60 hover:bg-[#6c00f4] hover:text-[var(--tenko-text-primary)] backdrop-blur-sm transition-all border border-[var(--tenko-border)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {destacados.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {destacados.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              aria-label={`Ir a slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === currentIndex
                  ? 'w-8 bg-[#6c00f4] shadow-[0_0_10px_rgba(108,0,244,0.8)]'
                  : 'w-1.5 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
