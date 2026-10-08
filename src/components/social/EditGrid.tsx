"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import MediaDisplay from "@/components/MediaDisplay";

interface EditGridProps {
  urls: string[];
}

// ─── Tile del grid ───────────────────────────────────────────────
function EditTile({
  url,
  index,
  onOpen,
}: {
  url: string;
  index: number;
  onOpen: (i: number) => void;
}) {
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
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="relative mb-1.5 overflow-hidden bg-neutral-900 group cursor-pointer break-inside-avoid"
      onClick={() => onOpen(index)}
    >
      {visible ? (
        <MediaDisplay
          src={url}
          muted
          className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <div className="w-full aspect-[9/16] flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-7 h-7 rounded-full bg-black/80 backdrop-blur-sm flex items-center justify-center border border-white/20">
          <svg className="w-3.5 h-3.5 fill-white ml-0.5" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Visor con swipe, teclado, fullscreen, mute ─────────────────
function Viewer({
  urls,
  startIndex,
  onClose,
}: {
  urls: string[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [hiddenUI, setHiddenUI] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoWrapperRef = useRef<HTMLDivElement | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchDeltaX = useRef(0);
  const wheelLock = useRef(false);
  const hideUITimer = useRef<NodeJS.Timeout | null>(null);

  const goNext = useCallback(
    () => setIndex((i) => (i + 1) % urls.length),
    [urls.length]
  );
  const goPrev = useCallback(
    () => setIndex((i) => (i - 1 + urls.length) % urls.length),
    [urls.length]
  );

  // Precarga siguiente y anterior
  useEffect(() => {
    const preload = (i: number) => {
      if (i < 0 || i >= urls.length) return;
      const img = new Image();
      img.src = `/api/tiktok-video?url=${encodeURIComponent(urls[i])}`;
    };
    preload(index + 1);
    preload(index - 1);
  }, [index, urls]);

  // Bloquear scroll del body
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Fullscreen listener
  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = videoWrapperRef.current || containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  // Teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "f" || e.key === "F") toggleFullscreen();
      else if (e.key === "m" || e.key === "M") setMuted((m) => !m);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose, toggleFullscreen]);

  // Wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (wheelLock.current) return;
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (Math.abs(delta) < 30) return;
    wheelLock.current = true;
    if (delta > 0) goNext();
    else goPrev();
    setTimeout(() => {
      wheelLock.current = false;
    }, 400);
  };

  // Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    // Solo cuenta como swipe horizontal si dx > dy
    if (Math.abs(dx) > Math.abs(dy)) {
      touchDeltaX.current = dx;
    }
  };
  const handleTouchEnd = () => {
    if (touchStartX.current === null) return;
    const dx = touchDeltaX.current;
    if (Math.abs(dx) > 60) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
    touchDeltaX.current = 0;
  };

  // Auto-ocultar UI tras 2.5s sin movimiento
  const resetHideUI = () => {
    setHiddenUI(false);
    if (hideUITimer.current) clearTimeout(hideUITimer.current);
    hideUITimer.current = setTimeout(() => setHiddenUI(true), 2500);
  };

  useEffect(() => {
    resetHideUI();
    return () => {
      if (hideUITimer.current) clearTimeout(hideUITimer.current);
    };
  }, []);

  const onMouseMove = () => resetHideUI();

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center select-none ${
        hiddenUI ? "cursor-none" : ""
      }`}
      onClick={(e) => {
        // Click en fondo cierra (fuera del video)
        if (e.target === e.currentTarget) onClose();
      }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseMove={onMouseMove}
    >
      {/* Fondo con blur del video */}
      <div
        className="absolute inset-0 opacity-30 scale-110 pointer-events-none"
        style={{
          filter: "blur(60px)",
          backgroundImage: "linear-gradient(135deg, #1a0b2e 0%, #000 100%)",
        }}
      />

      {/* Controles UI */}
      <div
        className={`absolute inset-0 z-20 transition-opacity duration-300 pointer-events-none ${
          hiddenUI ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Contador */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-bold pointer-events-auto">
          {index + 1} / {urls.length}
        </div>

        {/* Cerrar */}
        <button
          className="absolute top-4 right-16 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white transition pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Cerrar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Fullscreen */}
        <button
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm flex items-center justify-center text-white transition pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          aria-label="Pantalla completa"
        >
          {fullscreen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4H4m11 0h5v5m0 11v-5h-5m-6 5H4v-5" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>

        {/* Flechas (solo desktop) */}
        <button
          className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm items-center justify-center text-white transition pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="Anterior"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm items-center justify-center text-white transition pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="Siguiente"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Hint */}
        <div className="hidden sm:block absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-[11px] font-medium pointer-events-auto">
          ← → navegar · F fullscreen · M silenciar · ESC cerrar
        </div>
      </div>

      {/* Video wrapper (respeta aspect ratio) */}
      <div
        ref={videoWrapperRef}
        className="relative w-full h-full flex items-center justify-center"
        onClick={(e) => e.stopPropagation()}
      >
        <MediaDisplay
          key={urls[index]}
          src={urls[index]}
          muted={muted}
          className="h-full w-auto max-w-full object-contain"
        />
      </div>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────
export default function EditGrid({ urls }: EditGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!urls || urls.length === 0) return null;

  const clean = urls.filter(
    (u) => typeof u === "string" && u.trim().length > 0
  );

  if (clean.length === 0) return null;

  return (
    <>
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-1.5">
        {clean.map((u, i) => (
          <EditTile
            key={`${u}-${i}`}
            url={u}
            index={i}
            onOpen={setOpenIndex}
          />
        ))}
      </div>

      {mounted &&
        openIndex !== null &&
        createPortal(
          <Viewer
            urls={clean}
            startIndex={openIndex}
            onClose={() => setOpenIndex(null)}
          />,
          document.body
        )}
    </>
  );
}
