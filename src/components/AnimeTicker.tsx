'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface AnimeItem {
  id: string;
  titulo: string;
}

export default function AnimeTicker() {
  const [items, setItems] = useState<AnimeItem[]>([]);

  useEffect(() => {
    async function fetchTrending() {
      // Pedimos únicamente id y titulo para evitar cualquier error de columnas 400 en Supabase
      const { data, error } = await supabase
        .from('animes')
        .select('id, titulo')
        .limit(10);
      
      if (!error && data && data.length > 0) {
        setItems(data);
      }
    }
    fetchTrending();
  }, []);

  // Si aún está cargando o falla, mostramos un título genérico de respaldo para que veas el ticker animándose sí o sí
  const displayItems = items.length > 0 ? items : [
    { id: '1', titulo: 'TENKO - Catálogo en Vivo' },
    { id: '2', titulo: 'Explora los mejores estrenos' },
    { id: '3', titulo: 'Actualización automática activa' }
  ];

  return (
    <div className="flex-1 overflow-hidden relative max-w-xl mx-auto px-4 flex items-center">
      <style jsx>{`
        @keyframes tickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .ticker-track {
          display: flex;
          gap: 1.5rem;
          width: max-content;
          animation: tickerScroll 25s linear infinite;
        }
        .ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />

      <div className="overflow-hidden w-full">
        <div className="ticker-track">
          {displayItems.concat(displayItems).map((anime, idx) => (
            <Link 
              key={`${anime.id}-${idx}`} 
              href={`/anime/${anime.id}`}
              className="flex items-center gap-2 hover:bg-zinc-900 transition-all bg-zinc-900/40 px-3 py-1 rounded-full border border-zinc-800/60 shrink-0"
            >
              <span className="text-[#6c00f4] font-mono text-[10px] font-bold">🔥 TENDENCIA</span>
              <span className="text-xs font-medium text-zinc-300">{anime.titulo}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}