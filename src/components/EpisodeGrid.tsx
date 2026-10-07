'use client';

import { useState, useEffect, useMemo } from 'react';
import { Episodio, SortOrder, WatchProgress } from '@/types/database';
import { getWatchProgressMap } from '@/lib/storage';
import { getHiddenEpisodeIds } from '@/lib/offlineStore';
import EpisodeCard from './EpisodeCard';
import EmptyState from './EmptyState';

interface EpisodeGridProps {
  episodios: Episodio[];
  thumbnails?: Record<string, string>;
}

export default function EpisodeGrid({ episodios, thumbnails = {} }: EpisodeGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgress>>({});
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const reloadData = () => {
    setProgressMap(getWatchProgressMap());
    setHiddenIds(getHiddenEpisodeIds());
  };

  useEffect(() => {
    reloadData();
  }, []);

  const visibleEpisodios = useMemo(() => {
    return episodios.filter((ep) => !hiddenIds.includes(ep.id));
  }, [episodios, hiddenIds]);

  const filteredEpisodios = useMemo(() => {
    return visibleEpisodios
      .filter((ep) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        const matchesNum = String(ep.numero).includes(query);
        const matchesTitle = (ep.titulo || '').toLowerCase().includes(query);
        return matchesNum || matchesTitle;
      })
      .sort((a, b) => {
        return sortOrder === 'asc' ? a.numero - b.numero : b.numero - a.numero;
      });
  }, [visibleEpisodios, searchQuery, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[var(--tenko-text-secondary)]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar episodio..."
            className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/40 pl-10 pr-4 py-2.5 text-sm text-[var(--tenko-text-primary)] placeholder-white/30 focus:border-[#6c00f4] focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[var(--tenko-text-secondary)]">
            {filteredEpisodios.length} eps
          </span>
          <div className="flex items-center gap-1.5 rounded-xl border border-[var(--tenko-border)] bg-black/40 p-1">
            <button
              onClick={() => setSortOrder('asc')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${sortOrder === 'asc' ? 'bg-[#6c00f4] text-[var(--tenko-text-primary)]' : 'text-[var(--tenko-text-secondary)]'}`}
            >
              1 → {episodios.length}
            </button>
            <button
              onClick={() => setSortOrder('desc')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${sortOrder === 'desc' ? 'bg-[#6c00f4] text-[var(--tenko-text-primary)]' : 'text-[var(--tenko-text-secondary)]'}`}
            >
              {episodios.length} → 1
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      {filteredEpisodios.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredEpisodios.map((ep) => (
            <EpisodeCard
              key={ep.id}
              episodio={ep}
              progress={progressMap[ep.id] || null}
              onDeleted={reloadData}
              thumbnail={thumbnails[ep.numero] || ''}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No se encontraron episodios" description="Prueba con otro criterio de búsqueda." />
      )}
    </div>
  );
}
