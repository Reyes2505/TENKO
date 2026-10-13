'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime, WatchlistStatus } from '@/types/database';
import { getTracking, TrackingData } from '@/lib/tracking';
import {
  getWatchlistAction,
  addToWatchlistAction,
  removeFromWatchlistAction,
} from '@/actions/watchlist';

type TabTipo = 'todos' | 'viendo' | 'por_ver' | 'visto' | 'favorito';

interface ItemListaCompleto {
  anime: Anime;
  estado: WatchlistStatus;
  ultimoEpisodio?: number;
  progreso?: number;
}

export default function MiListaPage() {
  const [items, setItems] = useState<ItemListaCompleto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabTipo>('todos');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const cargarLista = async () => {
    setLoading(true);
    try {
      const trackingLocal = getTracking();
      const watchlistRes = await getWatchlistAction();
      const { data: todosAnimes } = await supabase.from('animes').select('*');

      const animesMap = new Map<string, Anime>(
        (todosAnimes || []).map((a: Anime) => [a.id, a])
      );

      const itemsMap = new Map<string, ItemListaCompleto>();

      // 1. Incorporar watchlist de base de datos
      if (watchlistRes.success && watchlistRes.data) {
        watchlistRes.data.forEach((wl) => {
          const anime = wl.anime || animesMap.get(wl.anime_id);
          if (anime) {
            itemsMap.set(anime.id, {
              anime,
              estado: wl.estado,
              ultimoEpisodio: wl.ultimo_episodio || 1,
              progreso: wl.estado === 'visto' ? 100 : 50,
            });
          }
        });
      }

      // 2. Fusionar con tracking local
      Object.entries(trackingLocal).forEach(([animeId, track]) => {
        const anime = animesMap.get(animeId);
        if (anime && !itemsMap.has(animeId)) {
          itemsMap.set(animeId, {
            anime,
            estado: track.estado as WatchlistStatus,
            ultimoEpisodio: track.ultimoEpisodio || 1,
            progreso: track.progreso || 0,
          });
        }
      });

      setItems(Array.from(itemsMap.values()));
    } catch (err) {
      console.error('Error cargando lista:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarLista();
  }, []);

  const handleCambiarEstado = async (animeId: string, nuevoEstado: WatchlistStatus | 'remover') => {
    setUpdatingId(animeId);
    if (nuevoEstado === 'remover') {
      await removeFromWatchlistAction(animeId);
      setItems((prev) => prev.filter((i) => i.anime.id !== animeId));
    } else {
      await addToWatchlistAction(animeId, nuevoEstado);
      setItems((prev) =>
        prev.map((i) => (i.anime.id === animeId ? { ...i, estado: nuevoEstado } : i))
      );
    }
    setUpdatingId(null);
  };

  const itemsFiltrados = useMemo(() => {
    if (activeTab === 'todos') return items;
    return items.filter((i) => i.estado === activeTab);
  }, [items, activeTab]);

  const conteos = useMemo(() => {
    return {
      todos: items.length,
      viendo: items.filter((i) => i.estado === 'viendo').length,
      por_ver: items.filter((i) => i.estado === 'por_ver').length,
      visto: items.filter((i) => i.estado === 'visto').length,
      favorito: items.filter((i) => i.estado === 'favorito').length,
    };
  }, [items]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--tenko-bg-page)]">
        <div className="animate-spin h-12 w-12 border-2 border-t-[#6c00f4] border-[var(--tenko-border)] rounded-full" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] pb-24 text-[var(--tenko-text-primary)]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Cabecera */}
        <div className="mb-8 border-b border-[var(--tenko-border)] pb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-2">
              // TU COLECCIÓN PERSONAL
            </span>
            <h1 className="font-[family-name:var(--font-unbounded)] text-3xl md:text-4xl font-black uppercase tracking-tight">
              Mi Lista
            </h1>
          </div>
          <span className="font-mono text-xs text-[var(--tenko-text-secondary)]">
            {items.length} {items.length === 1 ? 'anime registrado' : 'animes registrados'}
          </span>
        </div>

        {/* Pestañas de Filtrado */}
        <div className="flex flex-wrap gap-2 mb-8 border-b border-[var(--tenko-border)] pb-3">
          {(
            [
              { key: 'todos', label: 'Todos' },
              { key: 'viendo', label: '▶ Viendo' },
              { key: 'por_ver', label: '⏳ Por Ver' },
              { key: 'visto', label: '✓ Completados' },
              { key: 'favorito', label: '★ Favoritos' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-mono transition flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-[#6c00f4] text-white font-bold shadow-md shadow-[#6c00f4]/20'
                  : 'bg-[var(--tenko-bg-card)] border border-[var(--tenko-border)] text-[var(--tenko-text-secondary)] hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30">
                {conteos[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Grid de Contenido */}
        {itemsFiltrados.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
            {itemsFiltrados.map(({ anime, estado, ultimoEpisodio, progreso }) => (
              <div
                key={anime.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] hover:border-[#6c00f4] transition hover:-translate-y-1 shadow-sm"
              >
                {/* Portada */}
                <Link href={`/anime/${anime.id}`} className="relative aspect-[3/4] w-full overflow-hidden block">
                  <img
                    src={anime.portada_url}
                    alt={anime.titulo}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {/* Badge de Estado */}
                  <div className="absolute top-2 left-2 z-10">
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-[9px] font-black uppercase shadow-md ${
                        estado === 'viendo'
                          ? 'bg-blue-600 text-white'
                          : estado === 'favorito'
                          ? 'bg-amber-500 text-black'
                          : estado === 'visto'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-purple-600 text-white'
                      }`}
                    >
                      {estado === 'viendo'
                        ? 'Viendo'
                        : estado === 'favorito'
                        ? '★ Fav'
                        : estado === 'visto'
                        ? 'Completado'
                        : 'Por ver'}
                    </span>
                  </div>

                  {/* Barra de progreso inferior */}
                  {progreso !== undefined && progreso > 0 && (
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-black/60 z-10">
                      <div
                        className="h-full bg-gradient-to-r from-[#6c00f4] to-[#00f0ff]"
                        style={{ width: `${Math.min(100, progreso)}%` }}
                      />
                    </div>
                  )}
                </Link>

                {/* Info y Acciones */}
                <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                  <div>
                    <Link
                      href={`/anime/${anime.id}`}
                      className="font-bold text-xs line-clamp-1 hover:text-[#6c00f4] transition"
                    >
                      {anime.titulo}
                    </Link>
                    {ultimoEpisodio ? (
                      <span className="font-mono text-[10px] text-[var(--tenko-text-secondary)] block mt-0.5">
                        Episodio {ultimoEpisodio}
                      </span>
                    ) : null}
                  </div>

                  {/* Selector rápido de estado / quitar */}
                  <div className="pt-2 border-t border-[var(--tenko-border)] flex items-center justify-between">
                    <select
                      value={estado}
                      disabled={updatingId === anime.id}
                      onChange={(e) =>
                        handleCambiarEstado(
                          anime.id,
                          e.target.value as WatchlistStatus | 'remover'
                        )
                      }
                      className="w-full text-[10px] font-mono bg-black/40 border border-[var(--tenko-border)] rounded-md px-1.5 py-1 text-[var(--tenko-text-primary)] outline-none focus:border-[#6c00f4]"
                    >
                      <option value="viendo">▶ Viendo</option>
                      <option value="por_ver">⏳ Por Ver</option>
                      <option value="visto">✓ Visto</option>
                      <option value="favorito">★ Favorito</option>
                      <option value="remover">✕ Eliminar</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 border border-[var(--tenko-border)] rounded-2xl bg-white/[0.01]">
            <p className="font-mono text-xs tracking-widest text-[var(--tenko-text-secondary)] mb-4">
              // NO TIENES ANIMES EN ESTA CATEGORÍA
            </p>
            <Link
              href="/buscar"
              className="inline-block rounded-xl bg-[#6c00f4] px-6 py-2.5 font-mono text-xs font-bold text-white hover:bg-[#5800cc] transition"
            >
              EXPLORAR CATÁLOGO →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
