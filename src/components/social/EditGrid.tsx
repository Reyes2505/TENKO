"use client";

import React, { useEffect, useRef, useState } from "react";
import MediaDisplay, { isTikTokUrl, isVideoUrl } from "@/components/MediaDisplay";

interface EditGridProps {
  urls: string[];
}

function EditTile({ url }: { url: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isMedia = isTikTokUrl(url) || isVideoUrl(url);

  return (
    <div
      ref={ref}
      className="relative aspect-[9/16] overflow-hidden bg-neutral-900 group"
    >
      {visible ? (
        <MediaDisplay
          src={url}
          muted
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
        </div>
      )}

      {/* Etiqueta opcional en hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}

export default function EditGrid({ urls }: EditGridProps) {
  if (!urls || urls.length === 0) return null;

  const clean = urls.filter((u) => typeof u === "string" && u.trim().length > 0);

  if (clean.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
      {clean.map((u, i) => (
        <EditTile key={`${u}-${i}`} url={u} />
      ))}
    </div>
  );
}
