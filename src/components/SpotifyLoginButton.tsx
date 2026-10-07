'use client';

import { useEffect, useState } from 'react';

export default function SpotifyLoginButton() {
  const [status, setStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');
  const [message, setMessage] = useState<string>('Revisa tu cuenta Spotify para iniciar sesión.');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const spotifyStatus = params.get('spotify');
    if (spotifyStatus === 'connected') {
      setStatus('connected');
      setMessage('Conectado con Spotify. Ahora puedes escuchar tu música premium.');
    }
    if (spotifyStatus === 'error') {
      setStatus('error');
      setMessage('No se pudo conectar con Spotify. Intenta otra vez.');
    }
  }, []);

  return (
    <div className="rounded-[1.5rem] border border-zinc-800/90 bg-zinc-950/80 p-5 shadow-inner shadow-black/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-green-400">Spotify Premium</p>
          <h3 className="mt-1 text-lg font-semibold text-[var(--tenko-text-primary)]">Inicia sesión con Spotify</h3>
          <p className="mt-2 text-sm text-zinc-400">
            Si tienes Spotify Premium puedes reproducir tu playlist o canción desde Spotify Web Player.
          </p>
        </div>
        <a
          href="/api/spotify/auth"
          className="inline-flex items-center justify-center rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400"
        >
          Iniciar sesión Spotify
        </a>
      </div>
      <p className="mt-3 text-sm text-zinc-400">{message}</p>
      {status === 'connected' && (
        <p className="mt-2 text-sm text-emerald-300">Ya estás conectado. Usa un embed o tu playlist para escuchar.</p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-sm text-rose-400">Error de conexión con Spotify. Verifica tus credenciales.</p>
      )}
    </div>
  );
}
