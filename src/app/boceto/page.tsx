'use client';

import React, { useState } from 'react';
import Link from 'next/link';

const MOCK_HERO = {
  id: 'ARC-3077',
  title: 'SHINJITEITA NAKAMA-TACHI NI DUNGEON OKUCHI DE KOROSAREKAKETA',
  titleJap: '信じていた仲間達にダンジョン奥地で殺されかけた',
  synopsis: 'Expulsado de la Concordia de las Tribus. Traición en lo más profundo del abismo. Cuando la confianza se quiebra, la única salida es construir un imperio desde la nada absoluta.',
  banner: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=1600&auto=format&fit=crop',
  year: '2026',
  episodes: '12 EPS',
  studio: 'STUDIO BIND',
  rating: '9.4'
};

const MOCK_CATALOG = [
  { id: '01', title: 'Love Live! Hasunosora Jogakuin', titleJap: '蓮ノ空女学院スクールアイドルクラブ', genres: ['MÚSICA', 'SLICE OF LIFE'], cover: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600&auto=format&fit=crop', status: 'EN EMISIÓN', episodes: 'EP 04', rating: '8.8' },
  { id: '02', title: 'Disney Twisted-Wonderland', titleJap: 'ツイステッドワンダーランド', genres: ['FANTASÍA', 'MISTERIO'], cover: 'https://images.unsplash.com/photo-1563089145-599997674d42?q=80&w=600&auto=format&fit=crop', status: 'PRÓXIMAMENTE', episodes: 'EP 01', rating: '8.5' },
  { id: '03', title: 'Tensei Kizoku 3rd Season', titleJap: '転生貴族の鑑定スキル', genres: ['ISEKAI', 'ESTRATEGIA'], cover: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop', status: 'EN EMISIÓN', episodes: 'EP 08', rating: '8.2' },
  { id: '04', title: 'Steel Ball Run: JoJo Part 7', titleJap: 'スティール・ボール・ラン', genres: ['ACCIÓN', 'AVENTURA'], cover: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?q=80&w=600&auto=format&fit=crop', status: 'COMPLETO', episodes: 'EP 24', rating: '9.7' }
];

export default function TenkoBocetoPage() {
  const [activeFilter, setActiveFilter] = useState<string>('TODOS');

  return (
    <div className="min-h-screen bg-[var(--tenko-bg-page)] text-[var(--tenko-text-primary)] antialiased selection:bg-[#6c00f4] selection:text-[var(--tenko-text-primary)]">
      <main className="relative">
        {/* HERO */}
        <section className="relative w-full h-[70vh] min-h-[500px] bg-black overflow-hidden border-b border-[var(--tenko-border)] flex items-end">
          <img src={MOCK_HERO.banner} alt={MOCK_HERO.title} className="absolute inset-0 w-full h-full object-cover object-center opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/40 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/75 to-transparent w-full md:w-3/4 z-10" />
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[#6c00f4]/10 blur-[120px] pointer-events-none" />

          <div className="relative z-20 max-w-7xl mx-auto w-full p-8 md:p-16 flex flex-col justify-end h-full">
            <div className="flex items-center gap-3 font-mono text-[11px] font-bold text-[#6c00f4] uppercase mb-3">
              <span className="bg-[#6c00f4] text-[var(--tenko-text-primary)] px-2 py-0.5 rounded-sm tracking-widest">TENKO SPOTLIGHT</span>
              <span className="text-[var(--tenko-text-secondary)]">• {MOCK_HERO.studio}</span>
              <span className="text-[var(--tenko-text-secondary)]">• {MOCK_HERO.year}</span>
            </div>
            <span className="font-serif text-[15px] text-[var(--tenko-text-muted)] tracking-widest mb-1 italic">{MOCK_HERO.titleJap}</span>
            <h1 className="font-[family-name:var(--font-unbounded)] text-[32px] md:text-[50px] font-black uppercase leading-[0.98] tracking-tight max-w-4xl mb-4 text-[var(--tenko-text-primary)]">
              {MOCK_HERO.title}
            </h1>
            <p className="font-[family-name:var(--font-space-grotesk)] text-[14px] text-[var(--tenko-text-primary)]/70 max-w-2xl leading-relaxed mb-8">
              {MOCK_HERO.synopsis}
            </p>
            <div>
              <button className="bg-[#6c00f4] text-[var(--tenko-text-primary)] font-mono text-[12px] font-bold tracking-widest uppercase px-8 py-4 hover:bg-white hover:text-black transition-all duration-300 inline-flex items-center gap-3 shadow-xl shadow-[#6c00f4]/30 active:scale-95 rounded-md">
                <span>▶ REPRODUCIR EN TENKO</span>
                <span className="opacity-70">[{MOCK_HERO.episodes}]</span>
              </button>
            </div>
          </div>
        </section>

        {/* CATÁLOGO MOCK */}
        <section className="max-w-7xl mx-auto px-8 py-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-[var(--tenko-border)] pb-6 mb-10 gap-4">
            <div>
              <span className="font-mono text-[10px] text-[#6c00f4] tracking-[0.3em] uppercase font-bold block mb-1">
                // SANDBOX DE PROTOTIPADO
              </span>
              <h2 className="font-[family-name:var(--font-unbounded)] text-[28px] font-black uppercase tracking-tight">
                Catálogo de Prueba
              </h2>
            </div>
            <div className="flex gap-2 font-mono text-[11px] font-bold uppercase">
              {['TODOS', 'EN EMISIÓN', 'PRÓXIMAMENTE', 'TOP RATED'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-2 transition-all duration-300 rounded-sm tracking-widest ${
                    activeFilter === filter
                      ? 'bg-[#6c00f4] text-[var(--tenko-text-primary)] shadow-md shadow-[#6c00f4]/30'
                      : 'bg-white/5 text-[var(--tenko-text-muted)] hover:text-[var(--tenko-text-primary)] hover:bg-white/10'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {MOCK_CATALOG.map((item) => (
              <div key={item.id} className="group cursor-pointer border border-[var(--tenko-border)] bg-white/[0.02] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#6c00f4] hover:shadow-2xl hover:shadow-[#6c00f4]/20">
                <div className="flex justify-between items-center font-mono text-[10px] mb-3 text-[var(--tenko-text-muted)]">
                  <span className="text-[#6c00f4] font-bold">#{item.id}</span>
                  <span className="bg-white/5 px-2 py-0.5 font-bold uppercase tracking-widest text-[var(--tenko-text-primary)]/60">{item.status}</span>
                </div>
                <div className="aspect-[2/3] w-full overflow-hidden bg-black relative mb-4 rounded">
                  <img src={item.cover} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-2 py-1 font-mono text-[10px] text-[var(--tenko-text-primary)] font-bold">
                    ★ {item.rating}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-[#6c00f4] block truncate mb-1">{item.titleJap}</span>
                <h3 className="font-[family-name:var(--font-unbounded)] font-bold text-[15px] uppercase leading-snug line-clamp-2 mb-3 group-hover:text-[#6c00f4] transition-colors">
                  {item.title}
                </h3>
                <div className="font-mono text-[10px] text-[var(--tenko-text-muted)] border-t border-[var(--tenko-border)] pt-3 flex justify-between">
                  <span>{item.genres.join('/')}</span>
                  <span>{item.episodes}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
