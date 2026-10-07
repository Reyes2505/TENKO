/**
 * Reproductor Universal de Mirrors
 * 
 * Detecta el tipo de stream basado en la URL y devuelve
 * la información necesaria para reproducirlo correctamente.
 */

export type StreamType =
  | 'hls'          // m3u8 directo (Zilla, otros)
  | 'iframe'       // UPNShare, Voe, Byse
  | 'mp4-embed'    // MP4Upload
  | 'direct-mp4'   // .mp4 directo
  | 'local'        // /videos/...
  | 'unknown';

export interface ResolvedStream {
  type: StreamType;
  url: string;
  embedUrl?: string;
  proxiedUrl?: string;
  requiresProxy: boolean;
  serverName: string;
}

export function resolveStream(url: string): ResolvedStream {
  if (!url) {
    return { type: 'unknown', url, requiresProxy: false, serverName: 'Vacío' };
  }

  const lower = url.toLowerCase();

  // ── Locales ────────────────────────────────────
  if (url.startsWith('/videos/')) {
    return { type: 'local', url, requiresProxy: false, serverName: 'Local' };
  }

  // ── Zilla Networks (m3u8, CORS bloqueado) ─────
  if (lower.includes('zilla-networks')) {
    return {
      type: 'hls',
      url,
      proxiedUrl: `/api/proxy-video?url=${encodeURIComponent(url)}`,
      requiresProxy: true,
      serverName: 'Zilla',
    };
  }

  // ── UPNShare (iframe) ─────────────────────────
  if (lower.includes('uns.bio') || lower.includes('upnshare')) {
    return {
      type: 'iframe',
      url,
      embedUrl: url,
      requiresProxy: false,
      serverName: 'UPNShare',
    };
  }

  // ── Voe (iframe) ──────────────────────────────
  if (lower.includes('voe.sx')) {
    return {
      type: 'iframe',
      url,
      embedUrl: url,
      requiresProxy: false,
      serverName: 'Voe',
    };
  }

  // ── Byse (iframe) ─────────────────────────────
  if (lower.includes('byselapuix')) {
    return {
      type: 'iframe',
      url,
      embedUrl: url,
      requiresProxy: false,
      serverName: 'Byse',
    };
  }

  // ── MP4Upload (iframe) ────────────────────────
  if (lower.includes('mp4upload')) {
    return {
      type: 'mp4-embed',
      url,
      embedUrl: url,
      requiresProxy: false,
      serverName: 'MP4Upload',
    };
  }

  // ── HLS genérico ──────────────────────────────
  if (lower.includes('.m3u8')) {
    return {
      type: 'hls',
      url,
      requiresProxy: false,
      serverName: 'HLS',
    };
  }

  // ── Video directo ─────────────────────────────
  if (lower.includes('.mp4') || lower.includes('.mkv') || lower.includes('.webm')) {
    return {
      type: 'direct-mp4',
      url,
      requiresProxy: false,
      serverName: 'Directo',
    };
  }

  // ── Fallback ──────────────────────────────────
  return {
    type: 'unknown',
    url,
    embedUrl: url,
    requiresProxy: false,
    serverName: 'Desconocido',
  };
}
