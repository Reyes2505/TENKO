"use client";

import React, { useState, useEffect } from "react";

interface MediaDisplayProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackInitials?: string;
  muted?: boolean;
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

export default function MediaDisplay({
  src,
  alt = "Media",
  className = "w-full h-full object-cover",
  fallbackInitials = "AD",
  muted = true,
}: MediaDisplayProps) {
  const [hasError, setHasError] = useState(false);
  const [resolvedMp4, setResolvedMp4] = useState<string | null>(null);
  const [isLoadingTikTok, setIsLoadingTikTok] = useState(false);

  useEffect(() => {
    setHasError(false);
    setResolvedMp4(null);

    if (src && isTikTokUrl(src)) {
      setIsLoadingTikTok(true);
      fetch(`/api/tiktok-video?url=${encodeURIComponent(src)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.mp4Url) {
            setResolvedMp4(data.mp4Url);
          } else {
            setHasError(true);
          }
        })
        .catch(() => setHasError(true))
        .finally(() => setIsLoadingTikTok(false));
    }
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-600 text-white font-black tracking-wider select-none ${className}`}
      >
        {fallbackInitials}
      </div>
    );
  }

  // Reproductor HD sin marcas de agua para TikTok
  if (isTikTokUrl(src)) {
    if (isLoadingTikTok) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-400 text-[10px] font-bold p-2 text-center">
          <span className="w-3.5 h-3.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-1.5 flex-shrink-0"></span>
          Cargando...
        </div>
      );
    }

    if (resolvedMp4) {
      return (
        <video
          src={resolvedMp4}
          autoPlay
          loop
          muted={muted}
          playsInline
          onError={() => setHasError(true)}
          style={{
            transform: "translateZ(0)",
            backfaceVisibility: "hidden",
            willChange: "transform",
          }}
          className={`w-full h-full object-cover pointer-events-none ${className}`}
        />
      );
    }
  }

  // Reproductor para vídeos directos MP4/WebM/GIF
  if (isVideoUrl(src)) {
    return (
      <video
        src={src}
        autoPlay
        loop
        muted={muted}
        playsInline
        onError={() => setHasError(true)}
        style={{
          transform: "translateZ(0)",
          backfaceVisibility: "hidden",
          willChange: "transform",
        }}
        className={`w-full h-full object-cover ${className}`}
      />
    );
  }

  // Imagen Estándar HD
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
