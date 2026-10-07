'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getContinueWatching, HistoryEntry } from '@/lib/tracking';

export default function ContinueWatchingSection() {
  const [items, setItems] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const load = () => setItems(getContinueWatching());
    load();
    
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold text-[var(--tenko-text-primary)] mb-4 flex items-center gap-2">
        <span className="text-[#6c00f4]">▶</span> Continuar viendo
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {items.slice(0, 12).map((item) => (
          <Link
            key={item.episodeId}
            href={`/ver/${item.episodeId}`}
            className="group relative rounded-xl overflow-hidden border border-[var(--tenko-border)] bg-white/5 hover:border-[#6c00f4]/60 transition-all hover:-translate-y-1"
          >
            <div className="relative aspect-[3/4] overflow-hidden">
              {item.animePortada ? (
                <img
                  src={item.animePortada}
                  alt={item.animeTitulo}
                  className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="h-full w-full bg-zinc-800 flex items-center justify-center">
                  <span className="text-4xl">🎬</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              
              <div className="absolute top-2 left-2 rounded-md bg-zinc-950/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white">
                EP {String(item.episodeNumber).padStart(2, '0')}
              </div>

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="h-12 w-12 rounded-full bg-[#6c00f4]/90 flex items-center justify-center shadow-lg">
                  <svg className="h-5 w-5 text-[var(--tenko-text-primary)] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="p-2.5">
              <h3 className="text-xs font-bold text-[var(--tenko-text-primary)] truncate group-hover:text-[#6c00f4] transition-colors">
                {item.animeTitulo}
              </h3>
              <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                {item.episodeTitle} · {item.progress}%
              </p>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-800">
              <div
                className="h-full bg-[#6c00f4]"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
