interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  title = 'Error de conexión',
  message = 'No pudimos obtener la lista de episodios desde Supabase.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-red-900/30 bg-red-950/10 text-zinc-300">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-900/20 text-red-400 mb-4 border border-red-800/40">
        <svg
          className="h-7 w-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-[var(--tenko-text-primary)] mb-1">{title}</h3>
      <p className="text-xs text-red-300/80 max-w-md mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-xl bg-[#6c00f4] px-4 py-2 text-xs font-semibold text-[var(--tenko-text-primary)] hover:bg-white hover:text-black transition-all active:scale-95 shadow-lg shadow-[#6c00f4]/30"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
          Reintentar conexión
        </button>
      )}
    </div>
  );
}
