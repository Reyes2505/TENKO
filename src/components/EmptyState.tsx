interface EmptyStateProps {
  title?: string;
  description?: string;
}

export default function EmptyState({
  title = 'No se encontraron episodios',
  description = 'No hay episodios disponibles que coincidan con la búsqueda o filtro actual.',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-zinc-800/80 bg-zinc-900/30">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/50 text-zinc-400 mb-4 border border-zinc-700/40">
        <svg
          className="h-8 w-8 text-zinc-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-[var(--tenko-text-primary)] mb-1">{title}</h3>
      <p className="text-sm text-zinc-400 max-w-md">{description}</p>
    </div>
  );
}
