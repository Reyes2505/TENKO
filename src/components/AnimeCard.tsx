'use client';

import Link from 'next/link';
import { Anime } from '@/types/database';

interface AnimeCardProps {
  anime: Anime;
  episodioSugerido?: number;
  esNuevo?: boolean;
  esPopular?: boolean;
}

export default function AnimeCard({
  anime,
  episodioSugerido = 1,
  esNuevo = false,
  esPopular = false,
}: AnimeCardProps) {
  return (
    <Link href={`/anime/${anime.id}`} className="group flex flex-col space-y-2">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] shadow-md transition-all duration-300 group-hover:scale-[1.03] group-hover:border-[#6c00f4]">
        {anime.portada_url ? (
          <img
            src={anime.portada_url}
            alt={anime.titulo}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-[var(--tenko-text-secondary)] font-mono">
            SIN PORTADA
          </div>
        )}

        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          {esNuevo && (
            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider bg-[#00bcd4] text-white uppercase shadow">
              NUEVO
            </span>
          )}
          {esPopular && (
            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider bg-[#f8b133] text-black uppercase shadow">
              POPULAR
            </span>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-xs font-bold text-[var(--tenko-text-primary)] uppercase truncate group-hover:text-[#6c00f4] transition">
          {anime.titulo}
        </h3>
        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--tenko-text-secondary)]">
          <span>Ep. {String(episodioSugerido).padStart(2, '0')} · SUB</span>
          <span className="text-amber-500 font-bold flex items-center gap-1">
            ★ 4.8
          </span>
        </div>
      </div>
    </Link>
  );
}
