"use client";

import React, { useEffect, useRef, useState } from "react";
import MediaDisplay from "@/components/MediaDisplay";

interface EditGridProps {
  urls: string[];
}

function EditTile({ url }: { url: string }) {
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

  useEffect(() => {
    document.body.style.overflow = openModal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [openModal]);

  useEffect(() => {
    if (!openModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenModal(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openModal]);

  return (
    <>
      <div
        ref={ref}
        className="relative mb-1.5 overflow-hidden bg-neutral-900 group cursor-pointer break-inside-avoid"
        onClick={() => setOpenModal(true)}
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
            className="relative max-w-[420px] w-full max-h-[90vh] bg-black rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <MediaDisplay
              src={url}
              muted={false}
              className="w-full h-auto max-h-[90vh] object-contain"
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
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-1.5">
      {clean.map((u, i) => (
        <EditTile key={`${u}-${i}`} url={u} />
      ))}
    </div>
  );
}
