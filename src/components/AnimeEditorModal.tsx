'use client';

import { useEffect, useRef, useState } from 'react';
import { Anime, StreamType } from '@/types/database';
import { saveLocalAnime } from '@/lib/offlineStore';

interface AnimeEditorModalProps {
  animeToEdit?: Anime | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (anime: Anime) => void;
}

export default function AnimeEditorModal({
  animeToEdit,
  isOpen,
  onClose,
  onSaved,
}: AnimeEditorModalProps) {
  const [titulo, setTitulo] = useState(animeToEdit?.titulo || '');
  const [sinopsis, setSinopsis] = useState(animeToEdit?.sinopsis || '');
  const [portadaUrl, setPortadaUrl] = useState(
    animeToEdit?.portada_url || ''
  );
  const [bannerUrl, setBannerUrl] = useState(animeToEdit?.banner_url || '');
  const [trailerType, setTrailerType] = useState<StreamType>(
    animeToEdit?.trailer_type || 'local'
  );
  const [trailerUrl, setTrailerUrl] = useState(animeToEdit?.trailer_url || '');
  const [error, setError] = useState('');
  const [uploadingTrailer, setUploadingTrailer] = useState(false);
  const trailerFileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitulo(animeToEdit?.titulo || '');
    setSinopsis(animeToEdit?.sinopsis || '');
    setPortadaUrl(animeToEdit?.portada_url || '');
    setBannerUrl(animeToEdit?.banner_url || '');
    setTrailerType(animeToEdit?.trailer_type || 'local');
    setTrailerUrl(animeToEdit?.trailer_url || '');
    setError('');
  }, [animeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) {
      setError('El título del anime es obligatorio.');
      return;
    }

    const newAnime: Anime = {
      id: animeToEdit?.id || `anime-local-${Date.now()}`,
      titulo: titulo.trim(),
      sinopsis: sinopsis.trim() || 'Sin sinopsis disponible.',
      portada_url:
        portadaUrl.trim() ||
        'https://images.justwatch.com/poster/243888320/s718/mushoku-tensei-jobless-reincarnation.jpg',
      banner_url: bannerUrl.trim() || null,
      trailer_type: trailerType,
      trailer_url:
        trailerUrl.trim() ||
        (trailerType === 'local'
          ? '/videos/trailers/mushoku_trailer.mp4'
          : 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'),
      created_at: animeToEdit?.created_at || new Date().toISOString(),
    };

    saveLocalAnime(newAnime);
    onSaved(newAnime);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-[var(--tenko-border)] bg-black/60 p-6 shadow-2xl space-y-6">
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
                d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {animeToEdit ? 'Editar Anime' : 'Agregar Nuevo Anime'}
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
        </div>

        {error && (
          <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-3 text-xs font-semibold text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Título del Anime *
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="ej. Mushoku Tensei, Naruto, Attack on Titan"
              className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/40 px-3.5 py-2 text-sm text-[var(--tenko-text-primary)] placeholder-white/30 focus:border-[#6c00f4] focus:outline-none focus:ring-1 focus:ring-[#6c00f4]/40"
            />
          </div>

          {/* Sinopsis */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Sinopsis / Descripción
            </label>
            <textarea
              rows={3}
              value={sinopsis}
              onChange={(e) => setSinopsis(e.target.value)}
              placeholder="Escribe la historia o argumento del anime..."
              className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/40 px-3.5 py-2 text-sm text-[var(--tenko-text-primary)] placeholder-white/30 focus:border-[#6c00f4] focus:outline-none focus:ring-1 focus:ring-[#6c00f4]/40"
            />
          </div>

          {/* Portada & Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                URL o Ruta Portada (Cover)
              </label>
              <input
                type="text"
                value={portadaUrl}
                onChange={(e) => setPortadaUrl(e.target.value)}
                placeholder="/images/portada.jpg o https://..."
                className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/40 px-3.5 py-2 text-xs text-[var(--tenko-text-primary)] placeholder-white/30 focus:border-[#6c00f4] focus:outline-none focus:ring-1 focus:ring-[#6c00f4]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                URL o Ruta Banner (Hero)
              </label>
              <input
                type="text"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="/images/banner.jpg o https://..."
                className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/40 px-3.5 py-2 text-xs text-[var(--tenko-text-primary)] placeholder-white/30 focus:border-[#6c00f4] focus:outline-none focus:ring-1 focus:ring-[#6c00f4]/40"
              />
            </div>
          </div>

          {/* Tráiler de Presentación (Modo Local vs Online) */}
          <div className="rounded-xl border border-[var(--tenko-border)]/80 bg-zinc-900/40 p-4 space-y-3">
            <label className="block text-xs font-bold text-zinc-200">
              Tráiler de Presentación / Video de Portada
            </label>

            {/* Selector Modo Local vs Online */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setTrailerType('local')}
                className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold transition-all border ${
                  trailerType === 'local'
                    ? 'border-[#6c00f4] bg-[#6c00f4] text-[var(--tenko-text-primary)] shadow-md'
                    : 'border-[var(--tenko-border)] bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                📁 Modo Local (.MP4)
              </button>
              <button
                type="button"
                onClick={() => setTrailerType('online')}
                className={`flex-1 rounded-xl py-2 px-3 text-xs font-semibold transition-all border ${
                  trailerType === 'online'
                    ? 'border-[#6c00f4] bg-[#6c00f4] text-[var(--tenko-text-primary)] shadow-md'
                    : 'border-[var(--tenko-border)] bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                🌐 Modo Online (URL Link)
              </button>
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1">
                {trailerType === 'local'
                  ? 'Ruta del archivo de video local en public/videos/'
                  : 'Enlace o URL pública del video / tráiler'}
              </label>
              <input
                type="text"
                value={trailerUrl}
                onChange={(e) => setTrailerUrl(e.target.value)}
                placeholder={
                  trailerType === 'local'
                    ? '/videos/trailers/mushoku_trailer.mp4'
                    : 'https://ejemplo.com/trailer.mp4'
                }
                className="w-full rounded-xl border border-[var(--tenko-border)] bg-black/60 px-3.5 py-2 text-xs text-[var(--tenko-text-primary)] placeholder-white/20 focus:border-[#6c00f4] focus:outline-none"
              />

              {trailerType === 'local' && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    ref={trailerFileRef}
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={async (ev) => {
                      const f = ev.target.files?.[0];
                      if (!f) return;
                      setUploadingTrailer(true);
                      try {
                        const key = `trailers/mushoku_trailer.mp4`;
                        const mod = await import('@/lib/filestore');
                        await mod.saveFile(key, f as File);
                        setTrailerUrl(`indexeddb://${key}`);
                      } catch (err) {
                        setError('Error al guardar el tráiler local en el navegador.');
                      } finally {
                        setUploadingTrailer(false);
                      }
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => trailerFileRef.current?.click()}
                    className="rounded-lg border border-[var(--tenko-border)] px-3 py-1 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
                  >
                    {uploadingTrailer ? 'Subiendo...' : 'Subir tráiler local'}
                  </button>

                  <span className="text-xs text-zinc-400">o pegar ruta en el campo</span>
                </div>
              )}
            </div>
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
              Guardar Anime
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}