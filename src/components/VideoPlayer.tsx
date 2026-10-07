'use client';

import { Episodio } from '@/types/database';
import { resolveStream } from '@/lib/stream-resolver';
import M3U8Player from './M3U8Player';

interface VideoPlayerProps {
  episodio: Episodio;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
}

export default function VideoPlayer({ episodio }: VideoPlayerProps) {
  const url = episodio.url_stream || '';
  const stream = resolveStream(url);

  // ═══════════════════════════════════════════════════
  // LOCAL (archivos locales)
  // ═══════════════════════════════════════════════════
  if (stream.type === 'local') {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <video
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
    const src = stream.requiresProxy && stream.proxiedUrl
      ? stream.proxiedUrl
      : stream.url;

    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <M3U8Player
            src={src}
            episodeId={episodio.id}
            episodeNumber={episodio.numero}
            title={episodio.titulo || `Episodio ${episodio.numero}`}
          />
        </div>
        {stream.serverName === 'Zilla' && (
          <div className="mt-2 text-center">
            <p className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)]">
              // FUENTE: {stream.serverName.toUpperCase()} (puede fallar por CORS)
            </p>
          </div>
        )}
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
            // FUENTE: {stream.serverName.toUpperCase()}
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
            // FORMATO NO SOPORTADO
          </p>
          <p className="font-[family-name:var(--font-space-grotesk)] text-sm text-[var(--tenko-text-secondary)]">
            {stream.serverName}
          </p>
        </div>
      </div>
    </div>
  );
}
