'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Episodio, WatchProgress } from '@/types/database';
import { isEpisodeFavorite, toggleFavoriteEpisode, hideEpisode } from '@/lib/offlineStore';
import { getWatchedEpisodes } from '@/lib/tracking';
import { supabase } from '@/lib/supabase';

interface EpisodeCardProps {
  episodio: Episodio;
  progress?: WatchProgress | null;
  isSelected?: boolean;
  onDeleted?: (id: string) => void;
}

export default function EpisodeCard({
  episodio,
  progress,
  isSelected = false,
  onDeleted,
}: EpisodeCardProps) {
  const [isFav, setIsFav] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [animePortada, setAnimePortada] = useState('');
  const [isWatched, setIsWatched] = useState(false);

  // Obtener la portada del anime
  useEffect(() => {
    async function loadPortada() {
      try {
        const { data: tempData } = await supabase
          .from('temporadas')
          .select('anime_id')
          .eq('id', episodio.temporada_id)
          .single();

        if (tempData) {
          const { data: animeData } = await supabase
            .from('animes')
            .select('portada_url')
            .eq('id', tempData.anime_id)
            .single();

          if (animeData?.portada_url) {
            setAnimePortada(animeData.portada_url);
          }
        }
      } catch (err) {
        // Silencioso
      }
    }

    if (!episodio.thumbnail_url && episodio.temporada_id) {
      loadPortada();
    }
  }, [episodio.id, episodio.thumbnail_url, episodio.temporada_id]);

  // Verificar si el episodio está visto
  useEffect(() => {
    const watchedEpisodes = getWatchedEpisodes();
    setIsWatched(watchedEpisodes.includes(episodio.id));
  }, [episodio.id]);

  useEffect(() => {
    setIsFav(isEpisodeFavorite(episodio.id));
  }, [episodio.id]);

  const handleToggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleFavoriteEpisode(episodio.id);
    setIsFav(updated);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`¿Estás seguro de eliminar el Episodio ${episodio.numero}?`)) {
      hideEpisode(episodio.id);
      if (onDeleted) onDeleted(episodio.id);
    }
  };

  const paddedNumber = String(episodio.numero).padStart(2, '0');
  const thumbnailUrl = episodio.thumbnail_url || animePortada || '';

  // Formatear fecha
  const formatearFecha = (fecha: string | null | undefined) => {
    if (!fecha) return null;
    try {
      const date = new Date(fecha + 'T00:00:00');
      return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
    } catch {
      return null;
    }
  };

  const fechaFormateada = formatearFecha(episodio.fecha_emision);

  return (
    <Link
      href={`/ver/${episodio.id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex flex-col overflow-hidden rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 ${
        isSelected
          ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50'
          : 'border-zinc-800/60 bg-zinc-900/40 hover:border-blue-500/60'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
        {thumbnailUrl && !imageError ? (
          <img
            src={thumbnailUrl}
            alt={`Episodio ${episodio.numero}`}
            className={`h-full w-full object-cover transition-all duration-500 ${
              isHovered ? 'scale-110 blur-sm brightness-50' : isWatched ? 'brightness-75' : ''
            }`}
            loading="lazy"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-600/20 to-indigo-600/20">
            <div className="text-5xl font-black text-zinc-700 group-hover:text-blue-400 transition-colors">
              {paddedNumber}
            </div>
          </div>
        )}

        {/* Overlay gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Checkmark de visto */}
        {isWatched && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-emerald-600/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white border border-emerald-400/50">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Visto
          </div>
        )}

        {/* Botón de play al hover */}
        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-lg shadow-blue-600/40 scale-75 group-hover:scale-100 transition-transform duration-300">
            <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        {/* Badge EP */}
        <div className="absolute top-2 left-2 rounded-md bg-zinc-950/80 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white border border-white/10">
          EP {paddedNumber}
        </div>

        {/* Botón favorito */}
        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleToggleFav}
            className={`flex h-7 w-7 items-center justify-center rounded-md backdrop-blur-md border transition-all ${
              isFav
                ? 'bg-pink-600/90 text-white border-pink-500'
                : 'bg-zinc-950/60 text-zinc-400 border-white/10 hover:text-pink-400'
            }`}
          >
            <svg className="h-3 w-3 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info mejorada */}
      <div className="p-3 space-y-1">
        {/* Número de episodio */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">
            Episodio {paddedNumber}
          </span>
          {isWatched && (
            <span className="text-[10px] text-emerald-400 font-mono">✓ Visto</span>
          )}
        </div>

        {/* Nombre del episodio */}
        {episodio.titulo_episodio ? (
          <h3 className={`text-xs font-bold transition-colors line-clamp-2 leading-tight ${
            isWatched ? 'text-emerald-400' : 'text-zinc-100 group-hover:text-blue-400'
          }`}>
            {episodio.titulo_episodio}
          </h3>
        ) : (
          <h3 className={`text-xs font-bold transition-colors line-clamp-1 ${
            isWatched ? 'text-emerald-400' : 'text-zinc-100 group-hover:text-blue-400'
          }`}>
            {episodio.titulo || `Episodio ${episodio.numero}`}
          </h3>
        )}

        {/* Fecha de emisión */}
        {fechaFormateada && (
          <div className="flex items-center gap-1 text-[10px] text-zinc-500">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <span>{fechaFormateada}</span>
          </div>
        )}

        {/* Duración si existe */}
        {episodio.duracion_total && episodio.duracion_total > 0 && (
          <div className="text-[10px] text-zinc-600 font-mono">
            {Math.floor(episodio.duracion_total / 60)} min
          </div>
        )}
      </div>
    </Link>
  );
}
