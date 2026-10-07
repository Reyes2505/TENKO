'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface AnimeDetectado {
  nombre: string;
  enBD: boolean;
  animeId?: string;
  encontrado?: {
    id: string;
    titulo: string;
    portada_url: string;
    episodios: number;
  };
}

export default function PeticionesPage() {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<AnimeDetectado[]>([]);
  const [analizando, setAnalizando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const limpiarNombre = (texto: string): string => {
    let nombre = texto;
    nombre = nombre.replace(/https?:\/\/[^\s]+/g, '');
    nombre = nombre.replace(/\[\d+\]/g, '');
    nombre = nombre.split('—')[0].split('–')[0];
    nombre = nombre.replace(/\(Temporada \d+\)/gi, '');
    nombre = nombre.replace(/Temporada \d+$/gi, '');
    nombre = nombre.replace(/Season \d+$/gi, '');
    nombre = nombre.replace(/\*/g, '');
    nombre = nombre.replace(/^-\s*/, '');
    nombre = nombre.replace(/^##+\s*/, '');
    return nombre.trim();
  };

  const detectarAnimesLocal = (texto: string): string[] => {
    const animes: string[] = [];
    const urlRegex = /https?:\/\/jkanime\.net\/([a-z0-9-]+)\/?/g;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(texto)) !== null) {
      const slug = urlMatch[1];
      if (slug && slug.length > 3 && !slug.includes('directorio') && !slug.includes('buscar')) {
        const nombre = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        animes.push(nombre);
      }
    }
    if (animes.length === 0) {
      const lineas = texto.split('\n');
      for (const linea of lineas) {
        const limpia = limpiarNombre(linea);
        if (limpia.length > 3 && !limpia.includes('http') && !limpia.includes('---')) {
          animes.push(limpia);
        }
      }
    }
    return [...new Set(animes)].filter(n => n.length > 3);
  };

  const analizarPeticion = async () => {
    setAnalizando(true);
    setMensaje('');

    const nombres = detectarAnimesLocal(texto);
    if (nombres.length === 0) {
      setMensaje('⚠️ No se detectaron animes.');
      setAnalizando(false);
      return;
    }

    const resultados: AnimeDetectado[] = [];

    for (const nombre of nombres) {
      const { data } = await supabase
        .from('animes')
        .select('*')
        .ilike('titulo', `%${nombre.slice(0, 30)}%`)
        .limit(1);

      if (data && data.length > 0) {
        const anime = data[0];
        const temps = await supabase.from('temporadas').select('id').eq('anime_id', anime.id);
        let totalEps = 0;
        for (const t of temps.data || []) {
          const eps = await supabase.from('episodios').select('id').eq('temporada_id', t.id);
          totalEps += (eps.data || []).length;
        }

        resultados.push({
          nombre,
          enBD: true,
          animeId: anime.id,
          encontrado: {
            id: anime.id,
            titulo: anime.titulo,
            portada_url: anime.portada_url || '',
            episodios: totalEps,
          },
        });
      } else {
        resultados.push({ nombre, enBD: false });
      }
    }

    setResultados(resultados);
    setAnalizando(false);
  };

  const agregarAnime = async (nombre: string) => {
    setMensaje(`🔄 Sincronizando "${nombre}"...`);
    try {
      const slug = nombre.toLowerCase().replace(/\s+/g, '-');
      const url = `https://jkanime.net/${slug}/`;
      const response = await fetch(`/api/sync-anime?nombre=${encodeURIComponent(url)}`);
      const data = await response.json();

      if (data.success) {
        setMensaje(`✅ "${nombre}" sincronizado! Episodios: ${data.episodios || 0}`);
        analizarPeticion();
      } else {
        setMensaje(`❌ Error: ${data.error || 'Desconocido'}`);
      }
    } catch {
      setMensaje('❌ Error de conexión con el bot');
    }
  };

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] pb-16">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10 border-b border-[var(--tenko-border)] pb-6">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-2">
            // COMUNIDAD · SOLICITUDES
          </span>
          <h1 className="font-[family-name:var(--font-unbounded)] text-3xl md:text-4xl font-black uppercase tracking-tight text-[var(--tenko-text-primary)]">
            Peticiones al Bot
          </h1>
          <p className="font-mono text-[11px] tracking-widest text-[var(--tenko-text-muted)] mt-2">
            Pega URLs de JK Anime o nombres de anime
          </p>
        </div>

        <div className="mb-8">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/40 p-4 font-mono text-sm text-[var(--tenko-text-primary)] placeholder-white/30 outline-none transition-all focus:border-[#6c00f4] focus:ring-2 focus:ring-[#6c00f4]/40 resize-none"
            placeholder={'Ejemplos:\n\nhttps://jkanime.net/suzume-no-tojimari/\n\nMushoku Tensei\nRe:Zero'}
          />
          <button
            onClick={analizarPeticion}
            disabled={analizando || !texto.trim()}
            className="mt-4 w-full rounded-md bg-[#6c00f4] px-4 py-3 font-mono text-xs font-bold tracking-widest uppercase text-[var(--tenko-text-primary)] shadow-lg shadow-[#6c00f4]/30 hover:bg-white hover:text-black transition-all active:scale-95 disabled:opacity-50"
          >
            {analizando ? '🔍 ANALIZANDO...' : '🔍 DETECTAR ANIMES'}
          </button>
        </div>

        {mensaje && (
          <div className={`mb-6 rounded-lg p-3 font-mono text-[11px] tracking-wider ${
            mensaje.startsWith('✅') ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30' :
            mensaje.startsWith('❌') ? 'bg-red-950/40 text-red-300 border border-red-500/30' :
            'bg-yellow-950/40 text-yellow-300 border border-yellow-500/30'
          }`}>
            {mensaje}
          </div>
        )}

        {resultados.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-baseline gap-3 mb-4">
              <h2 className="font-[family-name:var(--font-unbounded)] text-lg font-black uppercase tracking-tight text-[var(--tenko-text-primary)]">
                Resultados
              </h2>
              <span className="font-mono text-[10px] tracking-widest text-[#6c00f4] font-bold">
                {resultados.length} DETECTADOS
              </span>
            </div>

            {resultados.map((resultado, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 flex items-center justify-between ${
                  resultado.enBD
                    ? 'border-emerald-500/30 bg-emerald-950/10'
                    : 'border-red-500/30 bg-red-950/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  {resultado.enBD && resultado.encontrado?.portada_url ? (
                    <img
                      src={resultado.encontrado.portada_url}
                      alt={resultado.nombre}
                      className="h-16 w-11 rounded object-cover border border-[var(--tenko-border)]"
                    />
                  ) : (
                    <div className="h-16 w-11 rounded bg-white/5 border border-[var(--tenko-border)] flex items-center justify-center text-lg">
                      {resultado.enBD ? '✅' : '❌'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-[family-name:var(--font-unbounded)] text-sm font-bold text-[var(--tenko-text-primary)]">
                      {resultado.nombre}
                    </h3>
                    {resultado.enBD && resultado.encontrado ? (
                      <p className="font-mono text-[10px] tracking-wider text-emerald-400 mt-0.5">
                        ✓ DISPONIBLE · {resultado.encontrado.episodios} EPS
                      </p>
                    ) : (
                      <p className="font-mono text-[10px] tracking-wider text-red-400 mt-0.5">
                        ✗ NO ESTÁ EN LA BD
                      </p>
                    )}
                  </div>
                </div>

                {resultado.enBD && resultado.encontrado ? (
                  <Link
                    href={`/anime/${resultado.encontrado.id}`}
                    className="font-mono rounded-md bg-[#6c00f4] px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--tenko-text-primary)] hover:bg-white hover:text-black transition-all"
                  >
                    VER ANIME
                  </Link>
                ) : (
                  <button
                    onClick={() => agregarAnime(resultado.nombre)}
                    className="font-mono rounded-md bg-emerald-600 px-3 py-1.5 text-[10px] font-bold tracking-widest text-[var(--tenko-text-primary)] hover:bg-emerald-500 transition-all"
                  >
                    + AGREGAR
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
