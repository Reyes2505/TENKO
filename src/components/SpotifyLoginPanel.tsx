'use client';

import { useEffect, useState } from 'react';

interface TokenState {
  connected: boolean;
  profile?: {
    display_name?: string;
    email?: string;
    images?: Array<{ url: string }>;
  };
  error?: string;
}

export default function SpotifyLoginPanel() {
  const [status, setStatus] = useState<TokenState>({ connected: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch('/api/spotify/me');
        const data = await res.json();
        if (!res.ok) {
          setStatus({ connected: false, error: data?.error || 'No conectado' });
          return;
        }
        setStatus({ connected: data.connected, profile: data.profile, error: data.error });
      } catch (err) {
        setStatus({ connected: false, error: 'Error al consultar estado' });
        console.error('Spotify status fetch failed:', err);
      } finally {
        setLoading(false);
      }
    }

    loadStatus();
  }, []);

  return (
    <div className="rounded-[1.5rem] border border-zinc-800/90 bg-zinc-950/80 p-5 shadow-inner shadow-black/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-green-400">Spotify Premium</p>
          <h3 className="mt-1 text-lg font-semibold text-white">Reproductor para suscriptores</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Inicia sesión con Spotify para reproducir tu propia playlist o canción directamente desde tu cuenta.
          </p>
        </div>
        <a
          href="/api/spotify/auth"
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
        >
          {status.connected ? 'Volver a conectar' : 'Conectar Spotify'}
        </a>
      </div>

      <div className="mt-4 rounded-3xl border border-zinc-800/90 bg-zinc-900/70 p-4 text-sm text-zinc-300">
        {loading ? (
          <p>Cargando estado de Spotify...</p>
        ) : status.connected ? (
          <div className="space-y-2">
            <p className="text-sm text-emerald-300">Conectado como {status.profile?.display_name || 'usuario Spotify'}.</p>
            <p className="text-sm text-zinc-400">El player de Spotify Web puede no controlar el volumen interno desde el iframe.</p>
            <p className="text-sm text-zinc-400">Usa los controles de volumen del navegador o la app de Spotify para ajustar audio.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {status.error === 'Spotify no está configurado' ? (
              <>
                <p className="text-sm text-rose-400">Spotify no está configurado en el servidor.</p>
                <p className="text-sm text-zinc-400">Agrega SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET en tu `.env.local` y reinicia el servidor.</p>
              </>
            ) : (
              <>
                <p className="text-sm text-zinc-400">No estás conectado. Inicia sesión para reproducir con tu cuenta.</p>
                {status.error && <p className="text-sm text-rose-400">{status.error}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
