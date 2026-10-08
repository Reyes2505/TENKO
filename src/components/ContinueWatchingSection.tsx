'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface WatchProgress {
  episodioId: string;
  animeTitulo: string;
  numeroEpisodio: number;
  porcentaje: number;
  thumbnailUrl?: string;
  portadaUrl?: string;
}

export default function ContinueWatchingSection() {
  const [items, setItems] = useState<WatchProgress[]>([]);

  useEffect(() => {
    try {
      const historial = localStorage.getItem('tenko_watch_history');
      if (historial) {
        const parsed = JSON.parse(historial);
        if (Array.isArray(parsed)) {
          setItems(parsed.filter((item) => item && item.animeTitulo).slice(0, 6));
        }
      }
    } catch {
      setItems([]);
    }
  }, []);

  if (!items.length) return null;

  return (
    <section className="space-y-4">
      <div className="border-b border-zinc-200 dark:border-zinc-800/80 pb-3">
        <h3 className="font-[family-name:var(--font-unbounded)] text-sm font-extrabold uppercase tracking-wider text-zinc-900 dark:text-white">
          CONTINUAR VIENDO
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <Link
            key={item.episodioId}
            href={`/ver/${item.episodioId}`}
            className="group relative flex overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/80 hover:border-zinc-300 dark:hover:border-zinc-700 transition shadow-sm"
          >
            <div className="w-24 sm:w-28 aspect-video shrink-0 bg-zinc-100 dark:bg-zinc-950 relative overflow-hidden">
              {item.thumbnailUrl || item.portadaUrl ? (
                <img
                  src={item.thumbnailUrl || item.portadaUrl}
                  alt={item.animeTitulo}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500 font-mono">
                  TENKO
                </div>
              )}
            </div>

            <div className="p-3 flex flex-col justify-center flex-1 space-y-1 min-w-0">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
                {item.animeTitulo}
              </h4>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                Ep. {item.numeroEpisodio} · {Math.round(item.porcentaje)}% visto
              </span>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-200 dark:bg-zinc-800">
              <div
                className="h-full bg-purple-600"
                style={{ width: `${Math.min(100, Math.max(0, item.porcentaje))}%` }}
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
