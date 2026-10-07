'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';
import HeroCarousel from '@/components/HeroCarousel';
import AnimeGrid from '@/components/AnimeGrid';
import ContinueWatchingSection from '@/components/ContinueWatchingSection';

const ITEMS_POR_PAGINA = 24;

export default function Home() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('animes')
          .select('id, titulo, portada_url, banner_url, sinopsis, generos, estado_emision, fecha_estreno')
          .order('fecha_estreno', { ascending: false });

        if (!error && data) setAnimes(data as Anime[]);
        else setAnimes([]);
      } catch {
        setAnimes([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalPaginas = Math.ceil(animes.length / ITEMS_POR_PAGINA);
  const animesPaginados = animes.slice(
    (pagina - 1) * ITEMS_POR_PAGINA,
    pagina * ITEMS_POR_PAGINA
  );

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)]">
      <HeroCarousel animes={animes.slice(0, 5)} />

      <section className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <ContinueWatchingSection />

        {/* Header de sección */}
        <div className="mb-10 border-b border-[var(--tenko-border)] pb-6">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-2">
            // EXPLORACIÓN DE CONTENIDO
          </span>
          <h2 className="font-[family-name:var(--font-unbounded)] text-3xl md:text-4xl font-black uppercase tracking-tight text-[var(--tenko-text-primary)]">
            Catálogo Principal
          </h2>
        </div>

        <p className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)] mb-6">
          {animes.length} ANIMES
          {pagina > 1 && ` · PÁG. ${pagina}/${totalPaginas}`}
        </p>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : animesPaginados.length > 0 ? (
          <AnimeGrid animes={animesPaginados} />
        ) : (
          <div className="text-center py-16 border border-[var(--tenko-border)] rounded-xl bg-white/[0.02]">
            <p className="font-mono text-xs tracking-widest text-[var(--tenko-text-muted)]">
              // SIN RESULTADOS
            </p>
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-10">
            <button
              onClick={() => setPagina(Math.max(1, pagina - 1))}
              disabled={pagina === 1}
              className="px-4 py-2 rounded-md bg-white/5 font-mono text-[11px] tracking-widest text-[var(--tenko-text-primary)]/60 hover:bg-white/10 hover:text-[var(--tenko-text-primary)] disabled:opacity-30 transition-all"
            >
              ← PREV
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter((num) => num === 1 || num === totalPaginas || Math.abs(num - pagina) <= 1)
              .map((num, idx, arr) => (
                <div key={num} className="flex items-center gap-1.5">
                  {idx > 0 && arr[idx - 1] !== num - 1 && (
                    <span className="text-[var(--tenko-text-muted)] font-mono">...</span>
                  )}
                  <button
                    onClick={() => setPagina(num)}
                    className={`h-9 w-9 rounded-md font-mono text-[11px] font-bold transition-all ${
                      pagina === num
                        ? 'bg-[#6c00f4] text-[var(--tenko-text-primary)] shadow-md shadow-[#6c00f4]/30'
                        : 'bg-white/5 text-[var(--tenko-text-secondary)] hover:bg-white/10 hover:text-[var(--tenko-text-primary)]'
                    }`}
                  >
                    {num}
                  </button>
                </div>
              ))}
            <button
              onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
              disabled={pagina === totalPaginas}
              className="px-4 py-2 rounded-md bg-white/5 font-mono text-[11px] tracking-widest text-[var(--tenko-text-primary)]/60 hover:bg-white/10 hover:text-[var(--tenko-text-primary)] disabled:opacity-30 transition-all"
            >
              SIG →
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
