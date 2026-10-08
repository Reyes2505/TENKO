'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';
import HeroCarousel from '@/components/HeroCarousel';
import AnimeCard from '@/components/AnimeCard';
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
    <main className="min-h-screen bg-[var(--tenko-bg-page)] text-[var(--tenko-text-primary)] pb-16 transition-colors duration-200">
      <HeroCarousel animes={animes.slice(0, 5)} />

      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-8 space-y-12">
        {/* 1. Tendencias Recientes */}
        <div className="space-y-4">
          <div className="border-b border-[var(--tenko-border)] pb-3">
            <h2 className="font-[family-name:var(--font-unbounded)] text-sm font-extrabold uppercase tracking-wider text-[var(--tenko-text-primary)]">
              TENDENCIAS RECIENTES
            </h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-[var(--tenko-bg-card)] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {animes.slice(0, 6).map((anime, index) => (
                <AnimeCard
                  key={anime.id}
                  anime={anime}
                  episodioSugerido={1}
                  esNuevo={index < 3}
                  esPopular={index >= 3}
                />
              ))}
            </div>
          )}
        </div>

        {/* 2. Continuar Viendo */}
        <ContinueWatchingSection />

        {/* 3. Catálogo Principal Completo */}
        <div className="space-y-6">
          <div className="flex items-end justify-between border-b border-[var(--tenko-border)] pb-3">
            <h2 className="font-[family-name:var(--font-unbounded)] text-sm font-extrabold uppercase tracking-wider text-[var(--tenko-text-primary)]">
              CATÁLOGO PRINCIPAL
            </h2>
            <span className="text-xs font-mono text-[var(--tenko-text-secondary)]">
              {animes.length} TÍTULOS {pagina > 1 && `· PÁG. ${pagina}/${totalPaginas}`}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-xl bg-[var(--tenko-bg-card)] animate-pulse" />
              ))}
            </div>
          ) : animesPaginados.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {animesPaginados.map((anime, index) => (
                <AnimeCard
                  key={anime.id}
                  anime={anime}
                  episodioSugerido={1}
                  esNuevo={index < 2}
                  esPopular={anime.estado_emision === 'emitido'}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 border border-[var(--tenko-border)] rounded-xl bg-[var(--tenko-bg-card)]">
              <p className="text-xs font-mono text-[var(--tenko-text-secondary)]">
                No hay títulos registrados en la base de datos.
              </p>
            </div>
          )}

          {/* Navegación de Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--tenko-bg-card)] border border-[var(--tenko-border)] text-xs font-semibold text-[var(--tenko-text-primary)] hover:bg-[var(--tenko-border)] disabled:opacity-40 transition"
              >
                Anterior
              </button>
              <span className="text-xs text-[var(--tenko-text-secondary)] px-3 font-mono">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="px-3.5 py-1.5 rounded-lg bg-[var(--tenko-bg-card)] border border-[var(--tenko-border)] text-xs font-semibold text-[var(--tenko-text-primary)] hover:bg-[var(--tenko-border)] disabled:opacity-40 transition"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
