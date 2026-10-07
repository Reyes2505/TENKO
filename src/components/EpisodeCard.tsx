'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Episodio, WatchProgress } from '@/types/database';
import { isEpisodeFavorite, toggleFavoriteEpisode, hideEpisode } from '@/lib/offlineStore';

interface EpisodeCardProps {
  episodio: Episodio;
  progress?: WatchProgress | null;
  thumbnail?: string;
  onDeleted?: (id: string) => void;
}

export default function EpisodeCard({
  episodio,
  progress,
  thumbnail = '',
  onDeleted,
}: EpisodeCardProps) {
  const [isFav, setIsFav] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setIsFav(isEpisodeFavorite(episodio.id));
  }, [episodio.id]);

  const handleToggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleFavoriteEpisode(episodio.id);
    setIsFav(updated);
  };

  const isWatched = progress && progress.currentTime > 0;
  const percent = progress && progress.duration > 0
    ? Math.min(100, Math.round((progress.currentTime / progress.duration) * 100))
    : 0;

  const paddedNumber = String(episodio.numero).padStart(2, '0');

  return (
    <Link
      href={`/ver/${episodio.id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-[var(--tenko-border)] bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-[#6c00f4]/60 hover:shadow-xl hover:shadow-[#6c00f4]/10"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Episodio ${episodio.numero}`}
            className={`h-full w-full object-cover transition-all duration-500 ${isHovered ? 'scale-110 blur-sm brightness-50' : ''}`}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-[#6c00f4]/20">
            <div className="text-4xl font-black text-zinc-700/60">{paddedNumber}</div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        
        <div className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white">
          EP {paddedNumber}
        </div>

        <div className={`absolute inset-0 flex items-center justify-center transition-all ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6c00f4]/90 text-white">
            <svg className="h-4 w-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleToggleFav} className={`flex h-7 w-7 items-center justify-center rounded-md backdrop-blur-md border ${isFav ? 'bg-pink-600/90 text-white border-pink-500' : 'bg-black/60 text-zinc-400 border-[var(--tenko-border)]'}`}>
            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>

        {isWatched && percent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
            <div className="h-full bg-[#6c00f4]" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="text-xs font-bold text-white group-hover:text-[#6c00f4] line-clamp-1">
          {episodio.titulo || `Episodio ${episodio.numero}`}
        </h3>
        <p className="text-[10px] text-zinc-500 mt-0.5">
          {isWatched && percent > 0 ? `${percent}% visto` : 'Sin ver'}
        </p>
      </div>
    </Link>
  );
}
