'use client';

import { Anime } from '@/types/database';
import AnimeCard from './AnimeCard';

interface AnimeGridProps {
  animes: Anime[];
}

export default function AnimeGrid({ animes }: AnimeGridProps) {
  if (!animes || animes.length === 0) {
    return (
      <div className="text-center py-16 border border-zinc-800 rounded-xl bg-zinc-900/40">
        <p className="text-xs font-mono text-zinc-500">
          No se encontraron títulos disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
      {animes.map((anime, index) => (
        <AnimeCard
          key={anime.id}
          anime={anime}
          episodioSugerido={1}
          esNuevo={index < 4}
          esPopular={index % 3 === 0}
        />
      ))}
    </div>
  );
}
