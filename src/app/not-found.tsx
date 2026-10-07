import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[var(--tenko-bg-page)] text-[var(--tenko-text-primary)] min-h-[60vh]">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-[#6c00f4]/10 text-[#6c00f4] mb-6 border border-[#6c00f4]/30 shadow-2xl shadow-[#6c00f4]/20">
        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold mb-2">
        // ERROR 404
      </span>
      <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-black mb-2 uppercase tracking-tight">
        Página no encontrada
      </h1>
      <p className="font-[family-name:var(--font-space-grotesk)] text-sm text-[var(--tenko-text-secondary)] max-w-md mb-8">
        El episodio o la ruta que intentas acceder no existe en la base de datos de tu universo TENKO.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-md bg-[#6c00f4] px-5 py-2.5 font-mono text-xs font-bold tracking-widest text-[var(--tenko-text-primary)] hover:bg-white hover:text-black transition-all active:scale-95 shadow-lg shadow-[#6c00f4]/30"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        REGRESAR AL CATÁLOGO
      </Link>
    </main>
  );
}
