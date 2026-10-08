"use client";

import React, { useEffect, useRef, useState } from "react";
import MediaDisplay, { isTikTokUrl, isVideoUrl } from "@/components/MediaDisplay";

interface EditGridProps {
  urls: string[];
}

// Distribución de tamaños por posición (se repite cíclicamente)
const PATTERN = [
  "span-2",   // ancho doble
  "normal",
  "normal",
  "tall",     // alto doble (vertical)
  "span-2",
  "normal",
  "normal",
  "tall",
  "span-2",
  "normal",
  "normal",
  "tall",
];

function EditTile({ url, size }: { url: string; size: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const [openModal, setOpenModal] = useState(false);

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
      { rootMargin: "300px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (openModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [openModal]);

  // Cerrar modal con Escape
  useEffect(() => {
    if (!openModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openModal]);

  const sizeClass =
    size === "span-2"
      ? "col-span-2 aspect-[9/16]"
      : size === "tall"
      ? "row-span-2 aspect-[9/19]"
      : "aspect-[9/16]";

  // Extrae el src directo (mp4 si es TikTok resuelto por MediaDisplay)
  // Para el modal usamos el mismo src y le pedimos audio.

  return (
    <>
      <div
        ref={ref}
        className={`relative ${sizeClass} overflow-hidden bg-neutral-900 group cursor-pointer`}
        onClick={() => setOpenModal(true)}
      >
        {visible ? (
          <MediaDisplay
            src={url}
            muted
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
          </div>
        )}

        {/* Overlay con icono de play */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-7 h-7 rounded-full bg-black/80 backdrop-blur-sm flex items-center justify-center border border-white/20">
            <svg
              className="w-3.5 h-3.5 fill-white ml-0.5"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Modal de reproducción */}
      {openModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setOpenModal(false)}
        >
          <button
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm flex items-center justify-center text-white transition"
            onClick={() => setOpenModal(false)}
            aria-label="Cerrar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          <div
            className="relative max-w-[420px] w-full max-h-[90vh] aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <MediaDisplay
              src={url}
              muted={false}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
}

export default function EditGrid({ urls }: EditGridProps) {
  if (!urls || urls.length === 0) return null;

  const clean = urls.filter(
    (u) => typeof u === "string" && u.trim().length > 0
  );

  if (clean.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[180px] sm:auto-rows-[220px] lg:auto-rows-[260px] gap-1.5 grid-flow-dense">
      {clean.map((u, i) => (
        <EditTile key={`${u}-${i}`} url={u} size={PATTERN[i % PATTERN.length]} />
      ))}
    </div>
  );
}
