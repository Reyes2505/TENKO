'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const CACHE_KEY = 'anilist_calendario_cache';
const CACHE_DURATION = 30 * 60 * 1000;

const QUERY = `
query {
  Page(page: 1, perPage: 50) {
    media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
      id
      title { romaji }
      coverImage { large }
      nextAiringEpisode { episode airingAt }
      format
    }
  }
}
`;

export default function CalendarioPage() {
  const [animesEnEmision, setAnimesEnEmision] = useState<any[]>([]);
  const [animesEnBD, setAnimesEnBD] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDay() - 1);

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true);
      setError('');

      try {
        const { data: animesBD } = await supabase.from('animes').select('*');
        if (animesBD) setAnimesEnBD(animesBD);
      } catch (err) {
        console.error('Error cargando Supabase:', err);
      }

      const cache = localStorage.getItem(CACHE_KEY);
      if (cache) {
        const { data, timestamp } = JSON.parse(cache);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setAnimesEnEmision(data);
          setLoading(false);
          return;
        }
      }

      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: QUERY }),
        });

        if (response.status === 429) {
          const cacheViejo = localStorage.getItem(CACHE_KEY);
          if (cacheViejo) {
            const { data } = JSON.parse(cacheViejo);
            setAnimesEnEmision(data);
          }
          setError('Límite de API alcanzado. Mostrando datos en caché.');
          setLoading(false);
          return;
        }

        const data = await response.json();
        const animes = data.data.Page.media
          .filter((anime: any) => anime.nextAiringEpisode)
          .map((anime: any) => {
            const fecha = new Date(anime.nextAiringEpisode.airingAt * 1000);
            return {
              id: anime.id,
              titulo: anime.title.romaji,
              portada: anime.coverImage.large,
              hora: fecha.getHours().toString().padStart(2, '0') + ':' + fecha.getMinutes().toString().padStart(2, '0'),
              dia: (fecha.getDay() + 6) % 7,
              episodio: anime.nextAiringEpisode.episode,
              formato: anime.format || 'TV',
            };
          });

        setAnimesEnEmision(animes);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: animes, timestamp: Date.now() }));
      } catch (err) {
        setError('Error al conectar con AniList.');
      } finally {
        setLoading(false);
      }
    }

    cargarDatos();
  }, []);

  const animesDelDia = animesEnEmision
    .filter(a => a.dia === diaSeleccionado)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  const encontrarEnBD = (tituloAniList: string) => {
    const tituloNormalizado = tituloAniList.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const exacta = animesEnBD.find(a => {
      const tituloBD = a.titulo.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      return tituloBD === tituloNormalizado;
    });
    if (exacta) return exacta;

    const palabrasAniList = tituloNormalizado.split(' ').filter(p => p.length > 2);
    return animesEnBD.find(a => {
      const tituloBD = a.titulo.toLowerCase().replace(/[^a-z0-9\s]/g, '');
      const primeras2 = palabrasAniList.slice(0, 2);
      if (primeras2.every(p => tituloBD.includes(p))) return true;
      if (palabrasAniList.includes('mushoku') && palabrasAniList.includes('tensei')) {
        return tituloBD.includes('mushoku') && tituloBD.includes('tensei');
      }
      if (tituloNormalizado.includes('re:zero') || tituloNormalizado.includes('rezero')) {
        return tituloBD.includes('re:zero') || tituloBD.includes('rezero');
      }
      return false;
    });
  };

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] pb-16">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 border-b border-[var(--tenko-border)] pb-6">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-2">
            // SIMULCAST & ESTRENOS
          </span>
          <h1 className="font-[family-name:var(--font-unbounded)] text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
            Calendario de Estrenos
          </h1>
          <p className="font-mono text-[11px] tracking-widest text-[var(--tenko-text-muted)] mt-2">
            Animes en emisión con próximos episodios
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-950/30 p-3 font-mono text-xs text-yellow-300">
            ⚠️ {error}
          </div>
        )}

        {/* Selector de días */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-2">
          {DIAS_SEMANA.map((dia, i) => {
            const cantidad = animesEnEmision.filter(a => a.dia === i).length;
            const isActive = diaSeleccionado === i;
            return (
              <button
                key={dia}
                onClick={() => setDiaSeleccionado(i)}
                className={`px-4 py-2.5 rounded-md font-mono text-[11px] font-bold tracking-widest uppercase whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-[#6c00f4] text-[var(--tenko-text-primary)] shadow-md shadow-[#6c00f4]/30'
                    : 'bg-white/5 text-[var(--tenko-text-secondary)] hover:bg-white/10 hover:text-[var(--tenko-text-primary)] border border-[var(--tenko-border)]'
                }`}
              >
                {dia}
                {cantidad > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                    isActive ? 'bg-white/20' : 'bg-white/10 text-white/60'
                  }`}>
                    {cantidad}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mb-6 flex items-baseline gap-3">
          <h2 className="font-[family-name:var(--font-unbounded)] text-xl font-black uppercase tracking-tight text-white">
            {DIAS_SEMANA[diaSeleccionado]}
          </h2>
          <span className="font-mono text-[11px] tracking-widest text-[#6c00f4] font-bold">
            {animesDelDia.length} ESTRENOS
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : animesDelDia.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {animesDelDia.map((anime) => {
              const enBD = encontrarEnBD(anime.titulo);
              const href = enBD ? `/anime/${enBD.id}` : `https://anilist.co/anime/${anime.id}`;
              const esExterno = !enBD;

              return (
                <a
                  key={anime.id}
                  href={href}
                  target={esExterno ? '_blank' : undefined}
                  rel={esExterno ? 'noopener noreferrer' : undefined}
                  className="group relative overflow-hidden rounded-xl border border-[var(--tenko-border)] bg-white/5 hover:border-[#6c00f4]/60 transition-all hover:-translate-y-1 hover:shadow-[0_0_30px_-10px_rgba(108,0,244,0.5)]"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    {anime.portada ? (
                      <img src={anime.portada} alt={anime.titulo} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/80 to-transparent">
                    <h3 className="font-[family-name:var(--font-unbounded)] text-[11px] font-bold text-[var(--tenko-text-primary)] line-clamp-2 group-hover:text-[#6c00f4] transition-colors leading-snug">
                      {anime.titulo}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-[#6c00f4] tracking-wider">
                        EP {anime.episodio}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--tenko-text-secondary)]">{anime.hora} HRS</span>
                      {enBD ? (
                        <span className="font-mono text-[9px] tracking-widest font-bold text-[#6c00f4] bg-[#6c00f4]/15 border border-[#6c00f4]/30 px-1.5 py-0.5 rounded">
                          ✓ DISPONIBLE
                        </span>
                      ) : (
                        <span className="font-mono text-[9px] tracking-widest text-[var(--tenko-text-muted)]">ANILIST ↗</span>
                      )}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 border border-[var(--tenko-border)] rounded-xl bg-white/[0.02]">
            <p className="font-mono text-xs tracking-widest text-[var(--tenko-text-muted)]">
              // SIN ESTRENOS PROGRAMADOS
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
