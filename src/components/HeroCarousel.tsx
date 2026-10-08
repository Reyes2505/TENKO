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
    }, 250);
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide((currentIndex + 1) % destacados.length);
  }, [currentIndex, destacados.length, goToSlide]);

  useEffect(() => {
    if (isPaused || destacados.length <= 1) return;
    const interval = setInterval(nextSlide, 7000);
    return () => clearInterval(interval);
  }, [isPaused, destacados.length, nextSlide]);

  if (!destacados.length) return null;

  const anime = destacados[currentIndex];
  const animeNext1 = destacados[(currentIndex + 1) % destacados.length];
  const animeNext2 = destacados[(currentIndex + 2) % destacados.length];

  return (
    <section
      className="relative w-full overflow-hidden bg-[var(--tenko-bg-page)] text-[var(--tenko-text-primary)] min-h-[440px] lg:min-h-[500px] flex items-center pt-16 transition-colors duration-200"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Banner de Fondo Vivido con Degradados ÚNICAMENTE en los límites */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {destacados.map((a, i) => (
          <div
            key={a.id}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ${
              i === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url(${a.banner_url || a.portada_url || ''})` }}
          />
        ))}

        {/* Degradado Superior para integrar con el Header */}
        <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-[var(--tenko-bg-page)] to-transparent" />

        {/* Degradado Inferior para fundir el límite del banner */}
        <div className="absolute bottom-0 inset-x-0 h-28 bg-gradient-to-t from-[var(--tenko-bg-page)] to-transparent" />

        {/* Degradado Izquierdo para dar legibilidad limpia al texto */}
        <div className="absolute inset-y-0 left-0 w-full lg:w-2/3 bg-gradient-to-r from-[var(--tenko-bg-page)] via-[var(--tenko-bg-page)]/80 to-transparent" />
      </div>

      <div
        className={`relative z-10 mx-auto max-w-7xl px-6 py-8 lg:px-8 w-full transition-all duration-300 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-3.5">
            <h1 className="font-[family-name:var(--font-unbounded)] text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-[var(--tenko-text-primary)] line-clamp-2 leading-tight">
              {anime.titulo}
            </h1>

            <p className="text-xs sm:text-sm text-[var(--tenko-text-secondary)] max-w-xl line-clamp-2 leading-relaxed">
              {anime.sinopsis || 'Sin descripción disponible.'}
            </p>

            <div className="flex items-center gap-3 text-xs font-mono pt-0.5">
              <span className="text-[var(--tenko-text-primary)] font-semibold">Ep. 2 · SUB</span>
              <span className="text-amber-500 font-bold flex items-center gap-1">
                ★ 4.8
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-500 uppercase">
                AL AIRE
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Link
                href={`/anime/${anime.id}`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#6c00f4] px-5 py-2.5 text-xs font-bold tracking-wider text-white hover:bg-[#5800cc] transition shadow-md"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                VER EPISODIO 1
              </Link>
              <button className="inline-flex items-center gap-2 rounded-lg bg-[var(--tenko-bg-card)] border border-[var(--tenko-border)] px-5 py-2.5 text-xs font-semibold text-[var(--tenko-text-primary)] hover:bg-[var(--tenko-border)] transition">
                + MI LISTA
              </button>
            </div>
          </div>

          <div className="hidden lg:flex justify-end lg:col-span-5 relative h-72 items-center pr-4">
            {animeNext2?.portada_url && (
              <div className="absolute right-0 w-36 aspect-[3/4] rounded-xl overflow-hidden border border-[var(--tenko-border)] shadow-md opacity-40 translate-x-10 scale-90 rotate-6">
                <img src={animeNext2.portada_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            {animeNext1?.portada_url && (
              <div className="absolute right-8 w-40 aspect-[3/4] rounded-xl overflow-hidden border border-[var(--tenko-border)] shadow-lg opacity-75 translate-x-5 scale-95 rotate-3 z-10">
                <img src={animeNext1.portada_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="relative z-20 w-44 aspect-[3/4] rounded-xl overflow-hidden border border-[var(--tenko-border)] shadow-xl">
              {anime.portada_url ? (
                <img src={anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[var(--tenko-bg-card)] text-xs text-[var(--tenko-text-secondary)]">
                  SIN PORTADA
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-6">
          {destacados.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`h-1 rounded-full transition-all ${
                i === currentIndex ? 'w-10 bg-[#6c00f4]' : 'w-4 bg-[var(--tenko-border)]'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
