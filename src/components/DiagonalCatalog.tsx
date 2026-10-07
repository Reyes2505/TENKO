'use client';

import Link from 'next/link';
import { Anime } from '@/types/database';

interface DiagonalCatalogProps {
  animes: Anime[];
  /** Ángulo de rotación en grados (recomendado: -8 a -15) */
  angle?: number;
  /** Dirección de desplazamiento */
  direction?: 'left' | 'right';
  /** Velocidad de scroll (segundos por ciclo, menos = más rápido) */
  speed?: number;
  /** Filas a mostrar */
  rows?: number;
}

export default function DiagonalCatalog({
  animes,
  angle = -12,
  direction = 'left',
  speed = 60,
  rows = 3,
}: DiagonalCatalogProps) {
  if (animes.length === 0) return null;

  // Dividir animes en N filas
  const chunkSize = Math.ceil(animes.length / rows);
  const filas = Array.from({ length: rows }, (_, i) =>
    animes.slice(i * chunkSize, (i + 1) * chunkSize)
  );

  return (
    <section className="relative overflow-hidden py-24 my-12">
      {/* Máscaras laterales para difuminar los bordes */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[var(--tenko-bg-page)] to-transparent z-20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-[var(--tenko-bg-page)] to-transparent z-20" />

      {/* Contenedor rotado */}
      <div
        className="space-y-6"
        style={{
          transform: `rotate(${angle}deg) scale(1.15)`,
          transformOrigin: 'center center',
        }}
      >
        {filas.map((fila, idx) => (
          <div
            key={idx}
            className="flex gap-4 will-change-transform"
            style={{
              animation: `marquee-${direction} ${speed + idx * 8}s linear infinite`,
              width: 'max-content',
            }}
          >
            {/* Duplicar para loop infinito */}
            {[...fila, ...fila, ...fila].map((anime, i) => (
              <DiagonalCard key={`${anime.id}-${i}`} anime={anime} />
            ))}
          </div>
        ))}
      </div>

      {/* CSS de animación (inyectado inline para que funcione sin config) */}
      <style jsx>{`
        @keyframes marquee-left {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @keyframes marquee-right {
          0%   { transform: translateX(-33.333%); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </section>
  );
}

function DiagonalCard({ anime }: { anime: Anime }) {
  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group relative shrink-0 w-44 sm:w-52 aspect-[2/3] rounded-xl overflow-hidden border border-white/10 bg-black/40 transition-all duration-500 hover:scale-105 hover:z-10 hover:border-[#6c00f4] hover:shadow-[0_0_40px_-5px_rgba(108,0,244,0.6)]"
    >
      {anime.portada_url ? (
        <img
          src={anime.portada_url}
          alt={anime.titulo}
          className="h-full w-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">
          🎬
        </div>
      )}

      {/* Overlay con gradiente morado */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-70 transition-opacity" />

      {/* Glow morado sutil */}
      <div className="absolute inset-0 bg-[#6c00f4]/0 group-hover:bg-[#6c00f4]/10 transition-all" />

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="font-[family-name:var(--font-unbounded)] text-[11px] font-bold text-white line-clamp-2 leading-snug group-hover:text-[#6c00f4] transition-colors">
          {anime.titulo}
        </h3>
        {anime.estado_emision && (
          <span className="mt-1.5 inline-block font-mono text-[9px] tracking-widest font-bold text-[#6c00f4]/80 uppercase">
            {anime.estado_emision}
          </span>
        )}
      </div>
    </Link>
  );
}
