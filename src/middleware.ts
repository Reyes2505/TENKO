import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const maintenance = process.env.TENKO_MAINTENANCE === 'true';

  if (!maintenance) return NextResponse.next();

  const { pathname } = request.nextUrl;

  // Rutas que SÍ se permiten en mantenimiento
  const permitidas =
    pathname === '/mantenimiento' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/admin') ||
    pathname === '/favicon.ico';

  if (permitidas) return NextResponse.next();

  // Todo lo demás → redirige a mantenimiento
  return NextResponse.redirect(new URL('/mantenimiento', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
