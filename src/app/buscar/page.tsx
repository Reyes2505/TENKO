'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';
import AnimeGrid from '@/components/AnimeGrid';

function BuscarContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const [resultados, setResultados] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function buscar() {
      setLoading(true);
      if (!query.trim()) {
        setResultados([]);
        setLoading(false);
        return;
      }

      const q = `%${query.trim()}%`;
      const { data } = await supabase
        .from('animes')
        .select('id, titulo, portada_url, banner_url, sinopsis, generos, estado_emision, fecha_estreno')
        .or(`titulo.ilike.${q},sinopsis.ilike.${q}`)
        .order('fecha_estreno', { ascending: false })
        .limit(60);

      setResultados((data as Anime[]) || []);
      setLoading(false);
    }
    buscar();
  }, [query]);

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] pb-16">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 border-b border-[var(--tenko-border)] pb-6">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-2">
            // BÚSQUEDA
          </span>
          <h1 className="font-[family-name:var(--font-unbounded)] text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            Resultados
          </h1>
          {query && (
            <p className="font-mono text-[11px] tracking-widest text-[var(--tenko-text-muted)] mt-2">
              &ldquo;{query}&rdquo; · {resultados.length} {resultados.length === 1 ? 'RESULTADO' : 'RESULTADOS'}
            </p>
          )}
        </div>

        {!query ? (
          <div className="text-center py-16 border border-[var(--tenko-border)] rounded-xl bg-white/[0.02]">
            <p className="font-mono text-xs tracking-widest text-[var(--tenko-text-muted)]">
              // ESCRIBE ALGO EN LA BÚSQUEDA DEL HEADER
            </p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : resultados.length > 0 ? (
          <AnimeGrid animes={resultados} />
        ) : (
          <div className="text-center py-16 border border-[var(--tenko-border)] rounded-xl bg-white/[0.02]">
            <p className="font-mono text-xs tracking-widest text-[var(--tenko-text-muted)] mb-4">
              // SIN RESULTADOS
            </p>
            <Link
              href="/"
              className="font-mono text-[11px] tracking-widest text-[#6c00f4] hover:text-[var(--tenko-text-primary)] transition-colors"
            >
              ← VOLVER AL CATÁLOGO
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

export default function BuscarPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[var(--tenko-bg-page)]">
        <div className="animate-spin h-12 w-12 border-2 border-t-[#6c00f4] border-[var(--tenko-border)] rounded-full" />
      </main>
    }>
      <BuscarContent />
    </Suspense>
  );
}
