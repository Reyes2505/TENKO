'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  getInventario,
  actualizarInventario,
  filterByEstado,
  getEstadisticasInventario,
  InventarioAnime,
  EstadoAnime,
} from '@/lib/inventory';

const ESTADOS: { valor: EstadoAnime | 'todos'; label: string }[] = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'en_emision', label: 'En Emisión' },
  { valor: 'finalizado', label: 'Finalizados' },
  { valor: 'desconocido', label: 'Desconocidos' },
];

export default function InventarioPage() {
  const [inventario, setInventario] = useState<InventarioAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<EstadoAnime | 'todos'>('todos');
  const [actualizando, setActualizando] = useState(false);

  useEffect(() => {
    async function cargar() {
      setLoading(true);
      const data = await getInventario();
      setInventario(data);
      setLoading(false);
    }
    cargar();
  }, []);

  const handleActualizar = async () => {
    setActualizando(true);
    const data = await actualizarInventario();
    setInventario(data);
    localStorage.setItem('santuario_inventario_time', String(Date.now()));
    setActualizando(false);
  };

  const stats = getEstadisticasInventario(inventario);
  const filtrados = filtro === 'todos' ? inventario : filterByEstado(inventario, filtro);

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">Inventario</h1>
            <p className="text-xs text-zinc-500 mt-1">
              Datos sincronizados con AniList
            </p>
          </div>
          <button
            onClick={handleActualizar}
            disabled={actualizando}
            className="rounded-lg bg-white text-black px-4 py-2 text-xs font-bold hover:bg-zinc-200 disabled:opacity-50"
          >
            {actualizando ? 'Sincronizando...' : 'Actualizar'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-6 gap-3 mb-6">
          <div className="rounded-xl border border-zinc-800 p-3 text-center">
            <div className="text-2xl font-black text-white">{stats.total}</div>
            <div className="text-[10px] text-zinc-500">Total</div>
          </div>
          <div className="rounded-xl border border-green-500/30 p-3 text-center">
            <div className="text-2xl font-black text-green-400">{stats.enEmision}</div>
            <div className="text-[10px] text-green-300">Emisión</div>
          </div>
          <div className="rounded-xl border border-[#6c00f4]/30 p-3 text-center">
            <div className="text-2xl font-black text-[#6c00f4]">{stats.finalizados}</div>
            <div className="text-[10px] text-[#6c00f4]/70">Finalizados</div>
          </div>
          <div className="rounded-xl border border-zinc-700/30 p-3 text-center">
            <div className="text-2xl font-black text-[var(--tenko-text-secondary)]">{stats.desconocidos}</div>
            <div className="text-[10px] text-zinc-500">Desc.</div>
          </div>
          <div className="rounded-xl border border-purple-500/30 p-3 text-center">
            <div className="text-2xl font-black text-purple-400">
              {stats.popularidadPromedio.toFixed(0)}
            </div>
            <div className="text-[10px] text-purple-300">Popularidad</div>
          </div>
          <div className="rounded-xl border border-amber-500/30 p-3 text-center">
            <div className="text-2xl font-black text-amber-400">
              {stats.scorePromedio.toFixed(0)}
            </div>
            <div className="text-[10px] text-amber-300">Score</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-4">
          {ESTADOS.map((e) => (
            <button
              key={e.valor}
              onClick={() => setFiltro(e.valor)}
              className={`px-3 py-1.5 rounded-lg text-xs ${
                filtro === e.valor ? 'bg-white text-black' : 'bg-zinc-900 text-[var(--tenko-text-secondary)]'
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="text-center py-10 text-zinc-500">Cargando...</div>
        ) : (
          <div className="space-y-2">
            {filtrados.map((anime) => (
              <Link
                key={anime.id}
                href={`/anime/${anime.id}`}
                className="flex items-center gap-3 rounded-xl border border-zinc-800 p-3 hover:bg-zinc-900/50 transition-all"
              >
                {anime.portada ? (
                  <img src={anime.portada} alt={anime.titulo} className="h-12 w-9 rounded object-cover" />
                ) : (
                  <div className="h-12 w-9 rounded bg-zinc-800" />
                )}
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white">{anime.titulo}</h3>
                  <p className="text-xs text-zinc-500">
                    {anime.totalEpisodios > 0 && `${anime.totalEpisodios} eps · `}
                    Score: {anime.score} · Pop: {anime.popularidad}
                  </p>
                </div>
                <span className={`text-xs font-semibold ${
                  anime.estado === 'en_emision' ? 'text-green-400' :
                  anime.estado === 'finalizado' ? 'text-[#6c00f4]' : 'text-[var(--tenko-text-secondary)]'
                }`}>
                  {anime.estado === 'en_emision' ? 'Emisión' :
                   anime.estado === 'finalizado' ? 'Finalizado' : 'Desc.'}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
