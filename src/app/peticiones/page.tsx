'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { Peticion } from '@/types/database';
import {
  obtenerPeticionesAction,
  crearPeticionAction,
  votarPeticionAction,
} from '@/actions/peticiones';

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

  // Peticiones de la comunidad
  const [peticiones, setPeticiones] = useState<Peticion[]>([]);
  const [cargandoPeticiones, setCargandoPeticiones] = useState(true);
  const [nuevaPeticionTitulo, setNuevaPeticionTitulo] = useState('');
  const [nuevaPeticionUrl, setNuevaPeticionUrl] = useState('');
  const [guardandoPeticion, setGuardandoPeticion] = useState(false);

  useEffect(() => {
    async function cargar() {
      setCargandoPeticiones(true);
      const res = await obtenerPeticionesAction();
      if (res.success) {
        setPeticiones(res.data);
      }
      setCargandoPeticiones(false);
    }
    cargar();
  }, []);

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
        const nombre = slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
    return [...new Set(animes)].filter((n) => n.length > 3);
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

  const handleCrearPeticion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaPeticionTitulo.trim() || guardandoPeticion) return;

    setGuardandoPeticion(true);
    const res = await crearPeticionAction({
      titulo: nuevaPeticionTitulo,
      url: nuevaPeticionUrl || undefined,
    });

    if (res.success && res.data) {
      setPeticiones([res.data, ...peticiones]);
      setNuevaPeticionTitulo('');
      setNuevaPeticionUrl('');
      setMensaje('✅ ¡Petición comunitaria registrada con éxito!');
    }
    setGuardandoPeticion(false);
  };

  const handleVotar = async (peticionId: string) => {
    const res = await votarPeticionAction(peticionId);
    if (res.success) {
      setPeticiones((prev) =>
        prev.map((p) => (p.id === peticionId ? { ...p, votos: res.votos } : p))
      );
    }
  };

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] pb-24 text-[var(--tenko-text-primary)]">
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-12">
        {/* Cabecera */}
        <div className="border-b border-[var(--tenko-border)] pb-6">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-2">
            // COMUNIDAD · SOLICITUDES Y BOT
          </span>
          <h1 className="font-[family-name:var(--font-unbounded)] text-3xl md:text-4xl font-black uppercase tracking-tight">
            Peticiones y Solicitudes
          </h1>
          <p className="font-mono text-xs text-[var(--tenko-text-secondary)] mt-2">
            Pega enlaces de JK Anime, detecta títulos automáticamente o solicita animes a la comunidad.
          </p>
        </div>

        {/* Sección 1: Detector y Sincronizador de JKAnime */}
        <div className="rounded-2xl border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] p-6 space-y-4">
          <h2 className="font-[family-name:var(--font-unbounded)] text-base font-bold text-[var(--tenko-text-primary)]">
            🔍 Escaneo Rápido de Enlaces o Títulos
          </h2>
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/40 p-4 font-mono text-xs text-[var(--tenko-text-primary)] placeholder-white/30 outline-none transition focus:border-[#6c00f4] resize-none"
            placeholder={'Ejemplos:\nhttps://jkanime.net/suzume-no-tojimari/\nMushoku Tensei\nRe:Zero'}
          />
          <button
            onClick={analizarPeticion}
            disabled={analizando || !texto.trim()}
            className="w-full rounded-xl bg-[#6c00f4] px-4 py-3 font-mono text-xs font-bold tracking-widest uppercase text-white shadow-lg shadow-[#6c00f4]/25 hover:bg-[#5800cc] transition disabled:opacity-50"
          >
            {analizando ? '🔍 ANALIZANDO...' : '🔍 DETECTAR ANIMES'}
          </button>
        </div>

        {mensaje && (
          <div
            className={`rounded-xl p-3 font-mono text-xs tracking-wider ${
              mensaje.startsWith('✅')
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                : mensaje.startsWith('❌')
                ? 'bg-red-950/40 text-red-300 border border-red-500/30'
                : 'bg-yellow-950/40 text-yellow-300 border border-yellow-500/30'
            }`}
          >
            {mensaje}
          </div>
        )}

        {/* Resultados del Escaneo */}
        {resultados.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-baseline gap-3 mb-2">
              <h2 className="font-[family-name:var(--font-unbounded)] text-base font-black uppercase tracking-tight">
                Resultados Detectados ({resultados.length})
              </h2>
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
                      className="h-16 w-11 rounded-lg object-cover border border-[var(--tenko-border)]"
                    />
                  ) : (
                    <div className="h-16 w-11 rounded-lg bg-white/5 border border-[var(--tenko-border)] flex items-center justify-center text-lg">
                      {resultado.enBD ? '✅' : '❌'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-[family-name:var(--font-unbounded)] text-xs sm:text-sm font-bold text-[var(--tenko-text-primary)]">
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
                    className="font-mono rounded-lg bg-[#6c00f4] px-3 py-1.5 text-xs font-bold tracking-wider text-white hover:bg-[#5800cc] transition"
                  >
                    VER ANIME
                  </Link>
                ) : (
                  <button
                    onClick={() => agregarAnime(resultado.nombre)}
                    className="font-mono rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold tracking-wider text-white hover:bg-emerald-500 transition"
                  >
                    + AGREGAR
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════
            APARTADO: PETICIONES DE LA COMUNIDAD CON VOTACIONES
        ═══════════════════════════════════════════════════════════ */}
        <div className="space-y-6 pt-6 border-t border-[var(--tenko-border)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-1">
                // VOTACIONES EN VIVO
              </span>
              <h2 className="font-[family-name:var(--font-unbounded)] text-xl font-black uppercase tracking-tight">
                Peticiones de la Comunidad
              </h2>
            </div>
          </div>

          {/* Formulario para registrar nueva petición */}
          <form
            onSubmit={handleCrearPeticion}
            className="rounded-2xl border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] p-5 space-y-3"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--tenko-text-primary)]">
              + Solicitar un nuevo anime
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                value={nuevaPeticionTitulo}
                onChange={(e) => setNuevaPeticionTitulo(e.target.value)}
                placeholder="Nombre del anime (ej. Frieren Season 2)..."
                className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/30 p-2.5 text-xs text-[var(--tenko-text-primary)] placeholder-white/30 outline-none focus:border-[#6c00f4]"
              />
              <input
                type="url"
                value={nuevaPeticionUrl}
                onChange={(e) => setNuevaPeticionUrl(e.target.value)}
                placeholder="URL de referencia (opcional)..."
                className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/30 p-2.5 text-xs text-[var(--tenko-text-primary)] placeholder-white/30 outline-none focus:border-[#6c00f4]"
              />
            </div>
            <button
              type="submit"
              disabled={guardandoPeticion || !nuevaPeticionTitulo.trim()}
              className="rounded-xl bg-[#6c00f4] px-5 py-2 font-mono text-xs font-bold text-white hover:bg-[#5800cc] transition disabled:opacity-40"
            >
              {guardandoPeticion ? 'ENVIANDO...' : 'ENVIAR PETICIÓN'}
            </button>
          </form>

          {/* Lista de Peticiones Comunitarias */}
          <div className="space-y-3">
            {cargandoPeticiones ? (
              <div className="text-center py-8 text-xs font-mono text-[var(--tenko-text-secondary)]">
                Cargando peticiones comunitarias...
              </div>
            ) : peticiones.length > 0 ? (
              peticiones.map((pet) => (
                <div
                  key={pet.id}
                  className="rounded-xl border border-[var(--tenko-border)] bg-[var(--tenko-bg-card)] p-4 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-[var(--tenko-text-primary)]">
                        {pet.titulo}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold uppercase ${
                          pet.estado === 'completada'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : pet.estado === 'en_progreso'
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {pet.estado}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-[var(--tenko-text-secondary)]">
                      Solicitado por {pet.user_name} · {new Date(pet.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleVotar(pet.id)}
                      className="flex items-center gap-1.5 rounded-xl border border-[var(--tenko-border)] bg-black/40 hover:border-[#6c00f4] hover:text-[#00f0ff] px-3 py-2 text-xs font-mono transition"
                    >
                      <span>▲ Votar</span>
                      <span className="font-bold text-[#6c00f4]">{pet.votos || 0}</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 border border-[var(--tenko-border)] rounded-xl bg-white/[0.01]">
                <p className="text-xs font-mono text-[var(--tenko-text-secondary)]">
                  No hay peticiones registradas. ¡Sé el primero en solicitar un anime!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
