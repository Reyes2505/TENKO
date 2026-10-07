'use client';

import { useEffect, useState } from 'react';
import { Episodio } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface VideoPlayerProps {
  episodio: Episodio;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
}

export default function VideoPlayer({ episodio, onNextEpisode, onPrevEpisode }: VideoPlayerProps) {
  const [animeSlug, setAnimeSlug] = useState('');

  const url = episodio.url_stream || '';
  const isLocal = url.startsWith('/videos/');
  const isM3U8 = url.includes('.m3u8');
  const isJkPlayer = url.includes('jkplayer') || url.includes('jkanime.net');

  // Obtener slug del anime
  useEffect(() => {
    async function getAnimeSlug() {
      try {
        const { data: temporada } = await supabase
          .from('temporadas')
          .select('anime_id')
          .eq('id', episodio.temporada_id)
          .single();

        if (temporada) {
          const { data: anime } = await supabase
            .from('animes')
            .select('titulo')
            .eq('id', temporada.anime_id)
            .single();

          if (anime) {
            const slug = anime.titulo
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .replace(/\s+/g, '-');
            setAnimeSlug(slug);
          }
        }
      } catch (err) {
        console.error('Error:', err);
      }
    }

    if (isM3U8) {
      getAnimeSlug();
    }
  }, [episodio.temporada_id, isM3U8]);

  // Video local
  if (isLocal) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <video src={url} controls playsInline className="h-full w-full object-contain" />
        </div>
      </div>
    );
  }

  // Para M3U8 - construir URL de la página del episodio
  if (isM3U8 && animeSlug) {
    const episodePageUrl = `https://jkanime.net/${animeSlug}/${episodio.numero}/`;
    
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <iframe
            key={episodio.id}
            src={`/api/player?url=${encodeURIComponent(episodePageUrl)}`}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen"
            title={`Episodio ${episodio.numero}`}
          />
        </div>
      </div>
    );
  }

  // Para JK Player directo
  if (isJkPlayer) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <iframe
            key={episodio.id}
            src={`/api/player?url=${encodeURIComponent(url)}`}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen"
            title={`Episodio ${episodio.numero}`}
          />
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black flex items-center justify-center">
        <p className="text-sm text-zinc-500">Video no disponible</p>
      </div>
    </div>
  );
}
