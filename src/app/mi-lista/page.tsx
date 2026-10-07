'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';
import { getTracking, TrackingData } from '@/lib/tracking';

export default function MiListaPage() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [tracking, setTracking] = useState<Record<string, TrackingData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      setLoading(true);
      const trackingData = await getTracking();
      setTracking(trackingData);

      const { data } = await supabase.from('animes').select('*');
      if (data) setAnimes(data);
      setLoading(false);
    }
    cargar();
  }, []);

  const animesViendo = animes.filter(a => tracking[a.id]?.estado === 'viendo');
  const animesVistos = animes.filter(a => tracking[a.id]?.estado === 'visto');
  const animesPorVer = animes.filter(a => tracking[a.id]?.estado === 'por_ver');

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--tenko-bg-page)]">
        <div className="animate-spin h-12 w-12 border-2 border-t-[#6c00f4] border-[var(--tenko-border)] rounded-full" />
      </main>
    );
  }

  const Seccion = ({
    titulo,
    acento,
    items,
    vacio,
    contador,
    children,
  }: {
    titulo: string;
    acento: string;
    items: number;
    vacio: string;
    contador?: (a: Anime) => string | null;
    children: React.ReactNode;
  }) => (
    <section className="mb-12">
      <div className="mb-5 flex items-center justify-between border-b border-[var(--tenko-border)] pb-3">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full" style={{ background: acento, boxShadow: `0 0 10px ${acento}` }} />
          <h2 className="font-[family-name:var(--font-unbounded)] text-lg font-black uppercase tracking-tight text-[var(--tenko-text-primary)]">
            {titulo}
          </h2>
          <span className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)]">
            {items} {items === 1 ? 'TÍTULO' : 'TÍTULOS'}
          </span>
        </div>
      </div>
      {items > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {children}
        </div>
      ) : (
        <div className="text-center py-12 border border-[var(--tenko-border)] rounded-xl bg-white/[0.02]">
          <p className="font-mono text-xs tracking-widest text-[var(--tenko-text-muted)]">{vacio}</p>
        </div>
      )}
    </section>
  );

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] pb-16">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 border-b border-[var(--tenko-border)] pb-6">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-2">
            // TU COLECCIÓN
          </span>
          <h1 className="font-[family-name:var(--font-unbounded)] text-3xl md:text-4xl font-black uppercase tracking-tight text-[var(--tenko-text-primary)]">
            Mi Lista
          </h1>
        </div>

        {/* VIENDO */}
        <Seccion titulo="Viendo" acento="#6c00f4" items={animesViendo.length} vacio="// NADA EN PROGRESO">
          {animesViendo.map((anime) => (
            <Link
              key={anime.id}
              href={`/anime/${anime.id}`}
              className="group relative overflow-hidden rounded-xl border border-[var(--tenko-border)] bg-white/5 hover:border-[#6c00f4]/60 transition-all hover:-translate-y-1"
            >
              <div className="aspect-[3/4] overflow-hidden">
                {anime.portada_url ? (
                  <img src={anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                <h3 className="font-[family-name:var(--font-unbounded)] text-[11px] font-bold text-[var(--tenko-text-primary)] line-clamp-2 leading-snug">
                  {anime.titulo}
                </h3>
                <p className="font-mono text-[10px] text-[#6c00f4] mt-1 tracking-wider">
                  EP {tracking[anime.id]?.ultimoEpisodio || 0}
                </p>
              </div>
            </Link>
          ))}
        </Seccion>

        {/* VISTOS */}
        <Seccion titulo="Vistos" acento="#22c55e" items={animesVistos.length} vacio="// NADA COMPLETADO">
          {animesVistos.map((anime) => (
            <Link
              key={anime.id}
              href={`/anime/${anime.id}`}
              className="group relative overflow-hidden rounded-xl border border-[var(--tenko-border)] bg-white/5 hover:border-emerald-500/60 transition-all hover:-translate-y-1"
            >
              <div className="aspect-[3/4] overflow-hidden">
                {anime.portada_url ? (
                  <img src={anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                <h3 className="font-[family-name:var(--font-unbounded)] text-[11px] font-bold text-[var(--tenko-text-primary)] line-clamp-2 leading-snug">
                  {anime.titulo}
                </h3>
              </div>
            </Link>
          ))}
        </Seccion>

        {/* POR VER */}
        <Seccion titulo="Por ver" acento="#eab308" items={animesPorVer.length} vacio="// NADA PENDIENTE">
          {animesPorVer.map((anime) => (
            <Link
              key={anime.id}
              href={`/anime/${anime.id}`}
              className="group relative overflow-hidden rounded-xl border border-[var(--tenko-border)] bg-white/5 hover:border-yellow-500/60 transition-all hover:-translate-y-1"
            >
              <div className="aspect-[3/4] overflow-hidden">
                {anime.portada_url ? (
                  <img src={anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
                )}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                <h3 className="font-[family-name:var(--font-unbounded)] text-[11px] font-bold text-[var(--tenko-text-primary)] line-clamp-2 leading-snug">
                  {anime.titulo}
                </h3>
              </div>
            </Link>
          ))}
        </Seccion>
      </div>
    </main>
  );
}
