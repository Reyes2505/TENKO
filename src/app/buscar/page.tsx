'use client';

import { useEffect, useState, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';
import AnimeGrid from '@/components/AnimeGrid';
import { getFallbackCatalog } from '@/lib/catalog-fallback';

const GENEROS_POPULARES = [
  'Todos',
  'Acción',
  'Aventura',
  'Fantasía',
  'Isekai',
  'Comedia',
  'Romance',
  'Ciencia Ficción',
  'Sobrenatural',
  'Drama',
];

function BuscarContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryParam = searchParams.get('q') || '';
  const generoParam = searchParams.get('genero') || 'Todos';

  const [inputQuery, setInputQuery] = useState(queryParam);
  const [generoSeleccionado, setGeneroSeleccionado] = useState(generoParam);
  const [estadoFiltro, setEstadoFiltro] = useState<'todos' | 'emitido' | 'terminado'>('todos');
  const [orden, setOrden] = useState<'reciente' | 'titulo'>('reciente');

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar catálogo inicial y reaccionar a cambios
  useEffect(() => {
    async function cargarCatalogo() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('animes')
          .select('id, titulo, portada_url, banner_url, sinopsis, generos, estado_emision, fecha_estreno');

        if (!error && data && data.length > 0) {
          setAnimes(data as Anime[]);
        } else {
          setAnimes(getFallbackCatalog());
        }
      } catch (err) {
        console.error('Error cargando animes en búsqueda:', err);
        setAnimes(getFallbackCatalog());
      } finally {
        setLoading(false);
      }
    }
    cargarCatalogo();
  }, []);

  // Filtrado y ordenamiento reactivo
  const resultadosFiltrados = useMemo(() => {
    let res = [...animes];

    // Filtro por texto
    if (inputQuery.trim()) {
      const q = inputQuery.toLowerCase().trim();
      res = res.filter(
        (a) =>
          a.titulo.toLowerCase().includes(q) ||
          (a.sinopsis && a.sinopsis.toLowerCase().includes(q))
      );
    }

    // Filtro por género
    if (generoSeleccionado !== 'Todos') {
      const gen = generoSeleccionado.toLowerCase();
      res = res.filter((a) =>
        a.generos?.some((g) => g.toLowerCase().includes(gen))
      );
    }

    // Filtro por estado
    if (estadoFiltro !== 'todos') {
      res = res.filter((a) => a.estado_emision === estadoFiltro);
    }

    // Ordenamiento
    if (orden === 'titulo') {
      res.sort((a, b) => a.titulo.localeCompare(b.titulo));
    } else {
      res.sort((a, b) => (b.fecha_estreno || '').localeCompare(a.fecha_estreno || ''));
    }

    return res;
  }, [animes, inputQuery, generoSeleccionado, estadoFiltro, orden]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputQuery.trim()) {
      router.push(`/buscar?q=${encodeURIComponent(inputQuery.trim())}`);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] pb-24 text-[var(--tenko-text-primary)]">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Cabecera */}
        <div className="mb-8 border-b border-[var(--tenko-border)] pb-6">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-2">
            // EXPLORADOR TENKO
          </span>
          <h1 className="font-[family-name:var(--font-unbounded)] text-3xl md:text-4xl font-black uppercase tracking-tight">
            Catálogo y Búsqueda
          </h1>
          <p className="font-mono text-xs text-[var(--tenko-text-secondary)] mt-2">
            Encuentra animes por título, sinopsis, géneros o estado de emisión
          </p>
        </div>

        {/* Barra de Búsqueda Interactiva */}
        <form onSubmit={handleSearchSubmit} className="mb-6 relative">
          <div className="relative flex items-center">
            <span className="absolute left-4 text-gray-400">🔍</span>
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Buscar anime por nombre, palabras clave..."
              className="w-full rounded-2xl border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] py-3.5 pl-12 pr-10 font-mono text-sm text-[var(--tenko-text-primary)] placeholder-white/30 outline-none transition focus:border-[#6c00f4] shadow-sm"
            />
            {inputQuery && (
              <button
                type="button"
                onClick={() => setInputQuery('')}
                className="absolute right-4 text-xs font-mono text-[var(--tenko-text-secondary)] hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </form>

        {/* Filtros de Géneros y Opciones */}
        <div className="space-y-4 mb-8">
          {/* Chips de Géneros */}
          <div className="flex flex-wrap gap-2">
            {GENEROS_POPULARES.map((gen) => (
              <button
                key={gen}
                onClick={() => setGeneroSeleccionado(gen)}
                className={`px-3 py-1.5 rounded-xl font-mono text-xs transition ${
                  generoSeleccionado === gen
                    ? 'bg-[#6c00f4] text-white font-bold shadow-md shadow-[#6c00f4]/25'
                    : 'bg-[var(--tenko-bg-card)] border border-[var(--tenko-border)] text-[var(--tenko-text-secondary)] hover:text-white'
                }`}
              >
                {gen}
              </button>
            ))}
          </div>

          {/* Opciones de Estado y Orden */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[var(--tenko-text-secondary)]">Estado:</span>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value as any)}
                className="rounded-lg border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] px-3 py-1.5 font-mono text-xs text-[var(--tenko-text-primary)] outline-none focus:border-[#6c00f4]"
              >
                <option value="todos">Todos</option>
                <option value="emitido">En emisión</option>
                <option value="terminado">Terminado</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-[var(--tenko-text-secondary)]">Ordenar por:</span>
              <select
                value={orden}
                onChange={(e) => setOrden(e.target.value as any)}
                className="rounded-lg border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] px-3 py-1.5 font-mono text-xs text-[var(--tenko-text-primary)] outline-none focus:border-[#6c00f4]"
              >
                <option value="reciente">Más recientes</option>
                <option value="titulo">Título A-Z</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contador de Resultados */}
        <div className="mb-6 flex items-center justify-between font-mono text-xs text-[var(--tenko-text-secondary)]">
          <span>
            {resultadosFiltrados.length} {resultadosFiltrados.length === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </span>
          {(inputQuery || generoSeleccionado !== 'Todos' || estadoFiltro !== 'todos') && (
            <button
              onClick={() => {
                setInputQuery('');
                setGeneroSeleccionado('Todos');
                setEstadoFiltro('todos');
              }}
              className="text-[#6c00f4] hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : resultadosFiltrados.length > 0 ? (
          <AnimeGrid animes={resultadosFiltrados} />
        ) : (
          <div className="text-center py-20 border border-[var(--tenko-border)] rounded-2xl bg-white/[0.01]">
            <p className="font-mono text-xs tracking-widest text-[var(--tenko-text-secondary)] mb-4">
              // NO SE ENCONTRARON ANIMES CON ESOS CRITERIOS
            </p>
            <button
              onClick={() => {
                setInputQuery('');
                setGeneroSeleccionado('Todos');
                setEstadoFiltro('todos');
              }}
              className="rounded-xl bg-[#6c00f4] px-5 py-2.5 font-mono text-xs font-bold text-white hover:bg-[#5800cc] transition"
            >
              RESTABLECER FILTROS
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function BuscarPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[var(--tenko-bg-page)]">
          <div className="animate-spin h-12 w-12 border-2 border-t-[#6c00f4] border-[var(--tenko-border)] rounded-full" />
        </main>
      }
    >
      <BuscarContent />
    </Suspense>
  );
}
