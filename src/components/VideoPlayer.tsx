'use client';

import { useEffect, useRef } from 'react';
import { Episodio } from '@/types/database';
import { resolveStream } from '@/lib/stream-resolver';
import { recordEpisodeWatchTimeInDB } from '@/lib/watch-progress';
import { getWatchProgress } from '@/lib/storage';
import M3U8Player from './M3U8Player';

interface VideoPlayerProps {
  episodio: Episodio;
  animeId?: string;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
}

export default function VideoPlayer({ episodio, animeId }: VideoPlayerProps) {
  const url = episodio.url_stream || '';
  const stream = resolveStream(url);
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetAnimeId = animeId || episodio.anime_id || '';

  // Restaurar y monitorear progreso para reproductores de video HTML5 nativo (direct-mp4 y local)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Restaurar progreso previo si existe
    const saved = getWatchProgress(episodio.id);
    if (saved && saved.currentTime > 5) {
      video.currentTime = saved.currentTime;
    }

    let lastSavedTime = 0;
    const handleTimeUpdate = () => {
      const ct = video.currentTime;
      const dur = video.duration || 1440;
      // Guardar en BD cada 5 segundos de avance
      if (Math.abs(ct - lastSavedTime) >= 4) {
        lastSavedTime = ct;
        recordEpisodeWatchTimeInDB({
          animeId: targetAnimeId,
          episodeId: episodio.id,
          episodeNumber: episodio.numero,
          currentTime: ct,
          duration: dur,
        });
      }
    };

    const handlePauseOrEnd = () => {
      recordEpisodeWatchTimeInDB({
        animeId: targetAnimeId,
        episodeId: episodio.id,
        episodeNumber: episodio.numero,
        currentTime: video.currentTime,
        duration: video.duration || 1440,
      });
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('pause', handlePauseOrEnd);
    video.addEventListener('ended', handlePauseOrEnd);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('pause', handlePauseOrEnd);
      video.removeEventListener('ended', handlePauseOrEnd);
    };
  }, [episodio.id, episodio.numero, targetAnimeId]);

  // ═══════════════════════════════════════════════════
  // LOCAL (archivos locales)
  // ═══════════════════════════════════════════════════
  if (stream.type === 'local') {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <video
            ref={videoRef}
            src={stream.url}
            controls
            playsInline
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // HLS (m3u8 directo o Zilla proxeado)
  // ═══════════════════════════════════════════════════
  if (stream.type === 'hls') {
    // ✅ Si es Zilla → NO intentar reproducir (bloqueado por CORS)
    if (stream.serverName === 'Zilla') {
      return (
        <div className="w-full max-w-5xl mx-auto">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black flex items-center justify-center">
            <div className="text-center p-6">
              <div className="animate-spin h-10 w-10 border-2 border-t-[#6c00f4] border-white/10 rounded-full mx-auto mb-4" />
              <p className="font-mono text-[11px] tracking-widest text-[var(--tenko-text-muted)]">
                {`// RESOLVIENDO FUENTE ALTERNATIVA...`}
              </p>
            </div>
          </div>
        </div>
      );
    }

    const src = stream.url;
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <M3U8Player
            src={src}
            episodeId={episodio.id}
            episodeNumber={episodio.numero}
            title={episodio.titulo || `Episodio ${episodio.numero}`}
            animeId={targetAnimeId}
          />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // IFRAME (UPNShare, Voe, Byse, MP4Upload)
  // ═══════════════════════════════════════════════════
  if (stream.type === 'iframe' || stream.type === 'mp4-embed') {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <iframe
            key={episodio.id}
            src={stream.embedUrl || stream.url}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
            referrerPolicy="no-referrer"
            title={episodio.titulo || `Episodio ${episodio.numero}`}
          />
        </div>
        <div className="mt-2 text-center">
          <p className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)]">
            {`// FUENTE: ${stream.serverName.toUpperCase()}`}
          </p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // MP4 DIRECTO
  // ═══════════════════════════════════════════════════
  if (stream.type === 'direct-mp4') {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <video
            ref={videoRef}
            src={stream.url}
            controls
            playsInline
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════
  // FALLBACK
  // ═══════════════════════════════════════════════════
  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black flex items-center justify-center">
        <div className="text-center p-6">
          <p className="font-mono text-[11px] tracking-widest text-[var(--tenko-text-muted)] mb-2">
            {`// FORMATO NO SOPORTADO`}
          </p>
          <p className="font-[family-name:var(--font-space-grotesk)] text-sm text-[var(--tenko-text-secondary)]">
            {stream.serverName}
          </p>
        </div>
      </div>
    </div>
  );
}
