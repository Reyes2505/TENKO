'use client';

import Link from 'next/link';
import { Anime } from '@/types/database';

interface AnimeCardProps {
  anime: Anime;
}

const ESTADO_COLORS: Record<string, string> = {
  'emitido':     'bg-emerald-500',
  'en_espera':   'bg-yellow-500',
  'suspendido':  'bg-red-500',
  'terminado':   'bg-[#6c00f4]',
  'desconocido': 'bg-zinc-500',
};

const ESTADO_LABELS: Record<string, string> = {
  'emitido':     'EN EMISIÓN',
  'en_espera':   'PRÓXIMAMENTE',
  'suspendido':  'SUSPENDIDO',
  'terminado':   'FINALIZADO',
  'desconocido': 'DESCONOCIDO',
};

export default function AnimeCard({ anime }: AnimeCardProps) {
  const estado = anime.estado_emision || 'desconocido';
  const dotColor = ESTADO_COLORS[estado] || ESTADO_COLORS['desconocido'];
  const estadoLabel = ESTADO_LABELS[estado] || 'DESCONOCIDO';

  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group relative overflow-hidden rounded-xl border border-[var(--tenko-border)] bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-[#6c00f4]/60 hover:shadow-[0_0_40px_-10px_rgba(108,0,244,0.6)]"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        {anime.portada_url ? (
          <img
            src={anime.portada_url}
            alt={anime.titulo}
            className="h-full w-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-50"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">?</div>
        )}

        {/* Estado (badge mono) */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-md bg-black/70 backdrop-blur-md px-2 py-1 border border-[var(--tenko-border)]">
          <span className={`h-2 w-2 rounded-full ${dotColor} animate-pulse`} />
          <span className="font-mono text-[9px] font-bold tracking-widest text-white">
            {estadoLabel}
          </span>
        </div>

        {/* Botón play con glow morado */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#6c00f4]/90 text-[var(--tenko-text-primary)] shadow-lg shadow-[#6c00f4]/50 scale-50 group-hover:scale-100 transition-transform duration-300">
            <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
        <h3 className="font-[family-name:var(--font-unbounded)] text-xs font-bold text-[var(--tenko-text-primary)] line-clamp-2 leading-snug group-hover:text-[#6c00f4] transition-colors">
          {anime.titulo}
        </h3>

        {anime.generos && anime.generos.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {anime.generos.slice(0, 2).map((genero) => (
              <span
                key={genero}
                className="font-mono px-1.5 py-0.5 rounded bg-[#6c00f4]/15 border border-[#6c00f4]/30 text-[9px] tracking-widest text-[#6c00f4]"
              >
                {genero.toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
