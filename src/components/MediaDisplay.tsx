"use client";

import React, { useState, useEffect, useRef } from "react";

interface MediaDisplayProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackInitials?: string;
  muted?: boolean;
  autoPlay?: boolean;
  controls?: boolean;
  loop?: boolean;
  onLoaded?: () => void;
  poster?: string;
}

export const isVideoUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const cleanUrl = url.split("?")[0].toLowerCase();
  return (
    cleanUrl.endsWith(".mp4") ||
    cleanUrl.endsWith(".webm") ||
    cleanUrl.endsWith(".mov") ||
    cleanUrl.endsWith(".m3u8") ||
    cleanUrl.endsWith(".gif") ||
    url.includes("video") ||
    url.includes("mp4")
  );
};

export const isTikTokUrl = (url?: string | null): boolean => {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes("tiktok.com") ||
    lower.includes("vt.tiktok") ||
    lower.includes("vm.tiktok")
  );
};

// ─── Caché en memoria de MP4 resueltos ───────────────────────────
const mp4MemoryCache = new Map<string, string>();

export default function MediaDisplay({
  src,
  alt = "Media",
  className = "w-full h-full object-cover",
  fallbackInitials = "AD",
  muted = true,
  autoPlay = true,
  controls = false,
  loop = true,
  onLoaded,
  poster,
}: MediaDisplayProps) {
  const [hasError, setHasError] = useState(false);
  const [resolvedMp4, setResolvedMp4] = useState<string | null>(null);
  const [isLoadingTikTok, setIsLoadingTikTok] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setHasError(false);
    setResolvedMp4(null);

    if (src && isTikTokUrl(src)) {
      // ¿Ya está en caché de memoria?
      const cached = mp4MemoryCache.get(src);
      if (cached) {
        setResolvedMp4(cached);
        return;
      }

      setIsLoadingTikTok(true);
      fetch(`/api/tiktok-video?url=${encodeURIComponent(src)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.mp4Url) {
            mp4MemoryCache.set(src, data.mp4Url);
            setResolvedMp4(data.mp4Url);
          } else {
            setHasError(true);
          }
        })
        .catch(() => setHasError(true))
        .finally(() => setIsLoadingTikTok(false));
    }
  }, [src]);

  // Intentar reproducir al montar y manejar autoplay bloqueado
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !autoPlay) return;
    v.play().catch(() => {
      /* autoplay bloqueado, esperar interacción */
    });
  }, [autoPlay, resolvedMp4, src]);

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 text-white font-black tracking-wider select-none ${className}`}
      >
        {fallbackInitials}
      </div>
    );
  }

  // TikTok (resuelto vía API)
  if (isTikTokUrl(src)) {
    if (isLoadingTikTok) {
      return (
        <div className={`flex items-center justify-center bg-neutral-900 text-neutral-400 text-[10px] font-bold p-2 text-center ${className}`}>
          <span className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-1.5 flex-shrink-0" />
          Cargando...
        </div>
      );
    }

    if (resolvedMp4) {
      return (
        <video
          ref={videoRef}
          src={resolvedMp4}
          poster={poster}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          playsInline
          controls={controls}
          onLoadedData={onLoaded}
          onError={() => setHasError(true)}
          style={{
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            willChange: "transform",
          }}
          className={className}
        />
      );
    }
  }

  // Video directo MP4/WebM/GIF
  if (isVideoUrl(src)) {
    return (
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        controls={controls}
        onLoadedData={onLoaded}
        onError={() => setHasError(true)}
        style={{
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          willChange: "transform",
        }}
        className={className}
      />
    );
  }

  // Imagen
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      onLoad={onLoaded}
      className={className}
    />
  );
}
