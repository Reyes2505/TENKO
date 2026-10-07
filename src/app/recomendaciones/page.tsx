'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';
import { getRecomendacionesIA, getEstadisticasUsuario } from '@/lib/ai-recommendations';

export default function RecomendacionesPage() {
  const [recomendaciones, setRecomendaciones] = useState<Anime[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      setLoading(true);
      const { data: todosAnimes } = await supabase.from('animes').select('*');
      if (todosAnimes) {
        const recomendados = getRecomendacionesIA(todosAnimes, 12);
        setRecomendaciones(recomendados);
      }
      setEstadisticas(getEstadisticasUsuario());
      setLoading(false);
    }
    cargar();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--tenko-bg-page)]">
        <div className="animate-spin h-12 w-12 border-2 border-t-[#6c00f4] border-[var(--tenko-border)] rounded-full" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] pb-16">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 border-b border-[var(--tenko-border)] pb-6">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-2">
            // MOTOR DE DESCUBRIMIENTO
          </span>
          <h1 className="font-[family-name:var(--font-unbounded)] text-3xl md:text-4xl font-black uppercase tracking-tight text-[var(--tenko-text-primary)]">
            Tendencias <span className="text-[#6c00f4]">IA</span>
          </h1>
          <p className="font-mono text-[11px] tracking-widest text-[var(--tenko-text-muted)] mt-2">
            Basado en tu historial de visualización
          </p>
        </div>

        {estadisticas && (
          <div className="mb-10 rounded-xl border border-[var(--tenko-border)] bg-white/[0.02] p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold">
                // TU PERFIL
              </span>
            </div>
            <div className="flex flex-wrap gap-6 font-mono text-xs text-[var(--tenko-text-primary)]/60">
              <span>📺 <span className="text-[var(--tenko-text-primary)] font-bold">{estadisticas.animesVistos}</span> animes</span>
              <span>🎬 <span className="text-[var(--tenko-text-primary)] font-bold">{estadisticas.episodiosVistos}</span> episodios</span>
              <span>⏱️ <span className="text-[var(--tenko-text-primary)] font-bold">{estadisticas.tiempoTotalMinutos}</span> min</span>
            </div>
            {estadisticas.generosTop.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {estadisticas.generosTop.map((g: any) => (
                  <span
                    key={g.genero}
                    className="font-mono rounded-md bg-[#6c00f4]/15 border border-[#6c00f4]/30 px-2.5 py-1 text-[10px] tracking-widest font-bold text-[#6c00f4]"
                  >
                    {g.genero.toUpperCase()} · {g.peso}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {recomendaciones.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recomendaciones.map((anime) => (
              <Link
                key={anime.id}
                href={`/anime/${anime.id}`}
                className="group relative overflow-hidden rounded-xl border border-[var(--tenko-border)] bg-white/5 hover:border-[#6c00f4]/60 transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_-10px_rgba(108,0,244,0.5)]"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  {anime.portada_url ? (
                    <img src={anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                  <h3 className="font-[family-name:var(--font-unbounded)] text-[11px] font-bold text-white line-clamp-2 group-hover:text-[#6c00f4] transition-colors leading-snug">
                    {anime.titulo}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-[var(--tenko-border)] rounded-xl bg-white/[0.02]">
            <p className="font-mono text-xs tracking-widest text-[var(--tenko-text-muted)]">
              // VE ALGUNOS ANIMES PARA GENERAR RECOMENDACIONES
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
