import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAINTENANCE_MODE = process.env.MAINTENANCE_MODE === 'true';

// Rutas que siguen accesibles durante el mantenimiento
const PUBLIC_DURING_MAINTENANCE = [
  '/mantenimiento',
  '/shorts',      // ← Shorts desbloqueado
  '/perfil',      // ← Perfil accesible para que el usuario vea su cuenta
  '/login',       // ← Login accesible para que el usuario pueda iniciar sesión
  '/terminos',    // legales: obligatorios en muchas jurisdicciones
  '/privacidad',
  '/cookies',
  '/api',         // APIs (Auth, TikTok, etc.)
  '/_next',       // assets internos
  '/favicon.ico',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Propagar el pathname en un header para que el layout pueda leerlo
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);

  // Si NO estamos en mantenimiento, dejar pasar todo
  if (!MAINTENANCE_MODE) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Dejar pasar assets estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    /\.(png|jpg|jpeg|gif|svg|webp|ico|txt|xml|json|mp4|webm|woff|woff2|ttf|otf)$/.test(pathname)
  ) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Dejar pasar las rutas públicas
  const isPublic = PUBLIC_DURING_MAINTENANCE.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  if (isPublic) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Todo lo demás → redirigir a mantenimiento
  const url = request.nextUrl.clone();
  url.pathname = '/mantenimiento';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml|json|mp4|webm|woff|woff2|ttf|otf)$).*)',
  ],
};
