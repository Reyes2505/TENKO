import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const maintenance = process.env.TENKO_MAINTENANCE === 'true';

  if (!maintenance) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Rutas permitidas durante mantenimiento
  const permitidas =
    pathname === '/mantenimiento' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||        // ← ¡AHORA TODAS las API!
    pathname.startsWith('/admin') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/.well-known');  // ← por si Vercel necesita

  if (permitidas) return NextResponse.next();

  return NextResponse.redirect(new URL('/mantenimiento', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
