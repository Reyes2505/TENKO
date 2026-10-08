'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';
import AnimeCard from '@/components/AnimeCard';

export default function RecomendacionesPage() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('animes')
          .select('id, titulo, portada_url, banner_url, sinopsis, generos, estado_emision, fecha_estreno')
          .limit(18);

        if (!error && data) setAnimes(data as Anime[]);
      } catch {
        setAnimes([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] text-[var(--tenko-text-primary)] pt-20 pb-16 px-6 lg:px-8 max-w-7xl mx-auto space-y-12 transition-colors duration-200">
      <div className="border-b border-[var(--tenko-border)] pb-5">
        <h1 className="font-[family-name:var(--font-unbounded)] text-2xl md:text-4xl font-black uppercase tracking-tight text-[var(--tenko-text-primary)]">
          Tendencias y Recomendaciones
        </h1>
        <p className="text-xs text-[var(--tenko-text-secondary)] mt-2">
          Selección de títulos destacados según valoraciones y reproducciones de la comunidad
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-xl bg-[var(--tenko-bg-card)] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--tenko-text-primary)] tracking-wide">
                Tendencias Recientes
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
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
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--tenko-text-primary)] tracking-wide">
                Recomendados para ti
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {animes.slice(6, 18).map((anime, index) => (
                <AnimeCard
                  key={anime.id}
                  anime={anime}
                  episodioSugerido={index + 1}
                  esNuevo={index < 3}
                  esPopular={index >= 3}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
