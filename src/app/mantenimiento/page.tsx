export default function MantenimientoPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2">
          <span className="font-[family-name:var(--font-unbounded)] text-4xl font-black tracking-tight">
            TENKO
          </span>
          <span className="text-[#6c00f4] text-2xl font-mono">天狐</span>
        </div>

        <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-3">
          // SISTEMA EN MANTENIMIENTO
        </span>

        <h1 className="font-[family-name:var(--font-unbounded)] text-2xl md:text-3xl font-black uppercase tracking-tight mb-4">
          Estamos reconstruyendo
        </h1>

        <p className="font-[family-name:var(--font-space-grotesk)] text-sm text-white/50 mb-8 leading-relaxed">
          Estamos migrando todo el catálogo a una nueva fuente de streaming.
          Volveremos pronto con mejor calidad y más títulos.
        </p>

        <div className="inline-flex items-center gap-2 rounded-full bg-[#6c00f4]/15 border border-[#6c00f4]/40 px-4 py-2">
          <span className="h-2 w-2 rounded-full bg-[#6c00f4] animate-pulse" />
          <span className="font-mono text-[10px] tracking-widest text-[#6c00f4] font-bold">
            MIGRACIÓN EN PROGRESO
          </span>
        </div>
      </div>
    </main>
  );
}
