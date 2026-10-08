import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center px-6 text-center">
      <div className="space-y-4 max-w-md">
        <span className="text-purple-500 font-mono text-sm font-semibold tracking-wider uppercase">
          Error 404
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Página no encontrada
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed">
          El contenido o la ruta solicitada no existe o no se encuentra disponible en la base de datos de TENKO.
        </p>
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-purple-600 text-xs font-semibold text-white hover:bg-purple-500 transition"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
