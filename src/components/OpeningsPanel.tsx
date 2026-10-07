'use client';

import { useEffect, useRef, useState } from 'react';
import { deleteFile, getFileBlobUrl, listFiles, saveFile } from '@/lib/filestore';
import SpotifyLoginPanel from '@/components/SpotifyLoginPanel';

function parseSpotifyUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const type = parts[0];
      const id = parts[1].split('?')[0];
      if (['track', 'album', 'playlist', 'show', 'episode'].includes(type)) {
        return { type, id };
      }
    }

    // Soporte para URIs de Spotify
    if (value.startsWith('spotify:')) {
      const segments = value.split(':').filter(Boolean);
      if (segments.length >= 3) {
        return { type: segments[1], id: segments[2] };
      }
    }
  } catch {
    return null;
  }
  return null;
}

export default function OpeningsPanel() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [spotifyInput, setSpotifyInput] = useState('');
  const [spotifyEmbedUrl, setSpotifyEmbedUrl] = useState<string | null>(null);
  const [spotifyError, setSpotifyError] = useState<string | null>(null);
  const [localFiles, setLocalFiles] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadLocalFiles = async () => {
    try {
      const keys = await listFiles();
      const openingKeys = keys.filter((key) => key.startsWith('openings/'));
      setLocalFiles(openingKeys);
    } catch (err) {
      console.error('Error cargando archivos locales de openings:', err);
      setLocalFiles([]);
    }
  };

  useEffect(() => {
    loadLocalFiles();
  }, []);

  const handleSpotifyPreview = () => {
    if (!spotifyInput.trim()) {
      setSpotifyError('Ingresa una URL o URI de Spotify válida.');
      setSpotifyEmbedUrl(null);
      return;
    }

    const parsed = parseSpotifyUrl(spotifyInput);
    if (!parsed) {
      setSpotifyError('No se pudo reconocer el enlace de Spotify. Usa track, album o playlist.');
      setSpotifyEmbedUrl(null);
      return;
    }

    setSpotifyError(null);
    setSpotifyEmbedUrl(`https://open.spotify.com/embed/${parsed.type}/${parsed.id}`);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadMessage(null);
    setAudioError(null);
    setIsUploading(true);

    if (!file.type.startsWith('audio/')) {
      setUploadMessage('El archivo debe ser un audio MP3 o compatible.');
      setIsUploading(false);
      return;
    }

    const key = `openings/${Date.now()}-${file.name}`;
    try {
      await saveFile(key, file);
      await loadLocalFiles();
      setSelectedKey(key);
      const url = await getFileBlobUrl(key);
      setAudioSrc(url);
      setUploadMessage(`Archivo guardado como ${file.name}.`);
      setAudioError(null);
    } catch (error) {
      console.error('Error guardando MP3 local:', error);
      setUploadMessage('No se pudo guardar el archivo localmente.');
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const handleSelectLocal = async (key: string) => {
    setSelectedKey(key);
    setAudioError(null);
    try {
      const url = await getFileBlobUrl(key);
      if (!url) {
        throw new Error('No se encontró el archivo en IndexedDB');
      }
      setAudioSrc(url);
    } catch (error) {
      console.error('Error resolviendo MP3 local:', error);
      setAudioSrc(null);
      setAudioError('No se pudo cargar el audio local. Intenta recargar la página o reinstalar el archivo.');
    }
  };

  const handleDeleteLocal = async (key: string) => {
    await deleteFile(key);
    setLocalFiles((prev) => prev.filter((item) => item !== key));
    if (selectedKey === key) {
      setSelectedKey(null);
      setAudioSrc(null);
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] border border-zinc-800/70 bg-black/60/80 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#6c00f4]">Openings</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--tenko-text-primary)] sm:text-4xl">
              Escucha tus openings favoritos
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Usa Spotify para reproducir un opening oficial o carga tus propios MP3 locales y escúchalos con la misma estética del universo TENKO.
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <div className="rounded-[1.5rem] border border-[var(--tenko-border)] bg-black/60/80 p-5 shadow-inner shadow-black/20">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--tenko-text-primary)]">Spotify</h3>
                <p className="text-sm text-zinc-400">
                  Pega un enlace de Spotify para ver el reproductor integrado y abrirlo desde el navegador.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-semibold text-emerald-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                Spotify
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                Enlace de Spotify
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={spotifyInput}
                  onChange={(event) => setSpotifyInput(event.target.value)}
                  placeholder="https://open.spotify.com/track/..."
                  className="min-w-0 flex-1 rounded-2xl border border-[var(--tenko-border)] bg-black/60 px-4 py-3 text-sm text-[var(--tenko-text-primary)] outline-none transition focus:border-[#6c00f4]"
                />
                <button
                  type="button"
                  onClick={handleSpotifyPreview}
                  className="inline-flex items-center justify-center rounded-2xl bg-green-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-green-400"
                >
                  Cargar Spotify
                </button>
              </div>
              {spotifyError && (
                <p className="text-sm text-rose-400">{spotifyError}</p>
              )}

              {spotifyEmbedUrl ? (
                <div className="overflow-hidden rounded-[1.5rem] border border-[var(--tenko-border)] bg-black/40">
                  <iframe
                    title="Spotify Opening Player"
                    className="h-[320px] w-full border-0"
                    allow="encrypted-media; clipboard-write"
                    src={spotifyEmbedUrl}
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--tenko-border)] bg-black/60/70 p-6 text-sm text-zinc-500">
                  Ingresa un enlace válido y presiona "Cargar Spotify" para previsualizar el player.
                </div>
              )}

              {spotifyInput && (
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <a
                    href={spotifyInput}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl border border-[var(--tenko-border)] bg-black/40 px-4 py-2 text-xs font-semibold text-[var(--tenko-text-primary)] transition hover:bg-zinc-800"
                  >
                    Abrir en Spotify
                  </a>
                </div>
              )}
            </div>
          </div>

          <SpotifyLoginPanel />

          <div className="rounded-[1.5rem] border border-[var(--tenko-border)] bg-black/60/80 p-5 shadow-inner shadow-black/20">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[var(--tenko-text-primary)]">Local MP3</h3>
                <p className="text-sm text-zinc-400">
                  Sube tus archivos MP3 para escucharlos sin conexión en el navegador.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/5 px-3 py-1 text-xs font-semibold text-sky-300">
                Local
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                Agregar MP3
              </label>
              <input
                type="file"
                accept="audio/mp3,audio/*"
                onChange={handleFileUpload}
                className="block w-full rounded-2xl border border-[var(--tenko-border)] bg-black/60 px-4 py-3 text-sm text-[var(--tenko-text-primary)] file:mr-4 file:rounded-full file:border-0 file:bg-[#6c00f4] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--tenko-text-primary)] file:hover:bg-white"
              />
              {uploadMessage && (
                <p className="text-sm text-zinc-300">{uploadMessage}</p>
              )}

              <div className="rounded-[1.5rem] border border-[var(--tenko-border)] bg-black/60/70 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--tenko-text-primary)]">Archivos locales</p>
                  <span className="text-xs text-zinc-500">{localFiles.length} guardado(s)</span>
                </div>
                {localFiles.length > 0 ? (
                  <div className="space-y-3">
                    {localFiles.map((key) => {
                      const name = key.replace('openings/', '');
                      const isSelected = key === selectedKey;
                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 transition ${
                            isSelected ? 'border-[#6c00f4]/50 bg-[#6c00f4]/10' : 'border-[var(--tenko-border)] bg-black/60/80'
                          }`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--tenko-text-primary)]">{name}</p>
                            <p className="text-xs text-zinc-500">{isSelected ? 'Reproduciendo' : 'Listo para reproducir'}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSelectLocal(key)}
                              className="rounded-2xl border border-[var(--tenko-border)] bg-black/40 px-3 py-2 text-xs font-semibold text-[var(--tenko-text-primary)] transition hover:border-[#6c00f4]"
                            >
                              {isSelected ? 'Tocar de nuevo' : 'Reproducir'}
                            </button>
                            <button
                              onClick={() => handleDeleteLocal(key)}
                              className="rounded-2xl border border-rose-500/40 bg-rose-500/5 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No hay archivos locales cargados aún.</p>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-[var(--tenko-border)] bg-black/60/80 p-4">
                <p className="mb-3 text-sm font-semibold text-[var(--tenko-text-primary)]">Reproductor</p>
                <audio
                  ref={audioRef}
                  controls
                  src={audioSrc ?? undefined}
                  onError={() => setAudioError('El reproductor no puede reproducir este archivo. Usa un MP3 válido.')}
                  className="w-full rounded-3xl bg-black/40 px-3 py-3 outline-none"
                >
                  Tu navegador no soporta audio HTML5.
                </audio>
                {audioError && (
                  <p className="mt-3 text-sm text-rose-400">{audioError}</p>
                )}
                {!audioSrc && (
                  <p className="mt-3 text-sm text-zinc-500">Selecciona un archivo local o sube uno para escucharlo aquí.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
