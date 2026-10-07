"use client";

import { useEffect, useRef, useState } from 'react';
import { Episodio, StreamType } from '@/types/database';
import { saveLocalEpisode } from '@/lib/offlineStore';
import { saveFile } from '@/lib/filestore';

interface EpisodeEditorModalProps {
  episodeToEdit?: Episodio | null;
  defaultEpisodeNumber?: number;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (episode: Episodio) => void;
}

export default function EpisodeEditorModal({
  episodeToEdit,
  defaultEpisodeNumber = 1,
  isOpen,
  onClose,
  onSaved,
}: EpisodeEditorModalProps) {
  const [numero, setNumero] = useState<number>(
    episodeToEdit?.numero || defaultEpisodeNumber
  );
  const [titulo, setTitulo] = useState(episodeToEdit?.titulo || '');
  const [streamType, setStreamType] = useState<StreamType>(
    episodeToEdit?.tipo_stream || 'local'
  );
  const [urlStream, setUrlStream] = useState(
    episodeToEdit?.url_stream || ''
  );
  const [thumbnailUrl, setThumbnailUrl] = useState(
    episodeToEdit?.thumbnail_url || ''
  );
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setNumero(episodeToEdit?.numero || defaultEpisodeNumber);
    setTitulo(episodeToEdit?.titulo || '');
    setStreamType(episodeToEdit?.tipo_stream || 'local');
    setUrlStream(episodeToEdit?.url_stream || '');
    setThumbnailUrl(episodeToEdit?.thumbnail_url || '');
    setError('');
  }, [episodeToEdit, defaultEpisodeNumber, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero || isNaN(numero) || numero <= 0) {
      setError('Introduce un número de episodio válido.');
      return;
    }

    if (!urlStream.trim()) {
      setError('Debes especificar la ruta local o el enlace online del video.');
      return;
    }

    const newEp: Episodio = {
      id: episodeToEdit?.id || `ep-local-${Date.now()}`,
      numero,
      titulo: titulo.trim() || `Episodio ${numero}`,
      url_stream: urlStream.trim(),
      tipo_stream: streamType,
      thumbnail_url: thumbnailUrl.trim() || null,
      created_at: episodeToEdit?.created_at || new Date().toISOString(),
    };

    saveLocalEpisode(newEp);
    onSaved(newEp);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-2xl border border-[var(--tenko-border)] bg-black/60 p-6 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--tenko-border)] pb-4">
          <h2 className="text-xl font-bold text-[var(--tenko-text-primary)] flex items-center gap-2">
            <svg
              className="h-5 w-5 text-[#6c00f4]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
            {episodeToEdit ? 'Editar Episodio' : 'Agregar Capítulo Manual'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

              {streamType === 'local' && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={async (ev) => {
                      const f = ev.target.files?.[0];
                      if (!f) return;
                      setUploading(true);
                      try {
                        const key = `mushoku/episodio_${String(numero).padStart(2, '0')}.mp4`;
                        await saveFile(key, f);
                        setUrlStream(`indexeddb://${key}`);
                      } catch (err) {
                        setError('Error al guardar el archivo local en el navegador.');
                      } finally {
                        setUploading(false);
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-lg border border-[var(--tenko-border)] px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                  >
                    {uploading ? 'Subiendo...' : 'Subir archivo local'}
                  </button>

                  <span className="text-xs text-zinc-400">o pegar ruta en el campo</span>
                </div>
              )}
        </div>

        {error && (
          <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-3 text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Número Cap. *
              </label>
              <input
                type="number"
                min="1"
                required
                value={numero}
                onChange={(e) => setNumero(parseInt(e.target.value) || 1)}
                className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/40 px-3.5 py-2 text-sm text-[var(--tenko-text-primary)] placeholder-white/30 focus:border-[#6c00f4] focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Título del Capítulo
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="ej. El renacer en otro mundo"
                className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/40 px-3.5 py-2 text-sm text-[var(--tenko-text-primary)] placeholder-white/30 focus:border-[#6c00f4] focus:outline-none"
              />
            </div>
          </div>

          {/* Selector de Modo Local u Online */}
          <div className="rounded-xl border border-[var(--tenko-border)]/80 bg-zinc-900/40 p-4 space-y-3">
            <label className="block text-xs font-bold text-zinc-200">
              Modo de Reproducción del Capítulo
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStreamType('local')}
                className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold transition-all border ${
                  streamType === 'local'
                    ? 'border-[#6c00f4] bg-[#6c00f4] text-[var(--tenko-text-primary)] shadow-md'
                    : 'border-[var(--tenko-border)] bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                📁 Modo Local (.MP4)
              </button>
              <button
                type="button"
                onClick={() => setStreamType('online')}
                className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold transition-all border ${
                  streamType === 'online'
                    ? 'border-[#6c00f4] bg-[#6c00f4] text-[var(--tenko-text-primary)] shadow-md'
                    : 'border-[var(--tenko-border)] bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                🌐 Modo Online (Link)
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                {streamType === 'local'
                  ? 'Ruta del archivo .mp4 local (ej. /videos/mushoku/episodio_01.mp4)'
                  : 'Enlace o URL directa de video (ej. https://servidor.com/video.mp4)'}
              </label>
              <input
                type="text"
                required
                value={urlStream}
                onChange={(e) => setUrlStream(e.target.value)}
                placeholder={
                  streamType === 'local'
                    ? `/videos/mushoku/episodio_${String(numero).padStart(2, '0')}.mp4`
                    : 'https://servidor.com/episodio.mp4'
                }
                className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/60 px-3.5 py-2 text-xs text-[var(--tenko-text-primary)] placeholder-white/20 focus:border-[#6c00f4] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              URL de Miniatura (Opcional)
            </label>
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              placeholder="https://... o /images/thumb.jpg"
              className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/40 px-3.5 py-2 text-xs text-[var(--tenko-text-primary)] placeholder-white/30 focus:border-[#6c00f4] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--tenko-border)] bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#6c00f4] px-5 py-2 text-xs font-bold text-[var(--tenko-text-primary)] hover:bg-white hover:text-black shadow-lg shadow-[#6c00f4]/30 active:scale-95"
            >
              Guardar Capítulo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
