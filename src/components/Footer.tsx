"use client";

import Link from "next/link";
import CookieBanner from "@/components/CookieBanner";

export default function Footer() {
  return (
    <>
      <footer className="w-full bg-[#0b0b0e] border-t border-neutral-800/80 text-neutral-400 py-10 px-6 text-xs transition-colors">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Logo y Copyright */}
          <div className="flex flex-col items-center md:items-start gap-1">
            <span className="text-lg font-black font-mono tracking-tighter text-white">
              TENKO<span className="text-purple-500 ml-1 font-sans">天気</span>
            </span>
            <p className="text-[11px] text-neutral-500">
              © 2026 TENKO AI. Todos los derechos reservados. Plataforma de anime y comunidad UGC.
            </p>
          </div>

          {/* Enlaces Legales al Pie de Página */}
          <div className="flex flex-wrap items-center justify-center gap-6 font-semibold text-neutral-300">
            <Link href="/terminos" className="hover:text-purple-400 transition">
              Términos y Condiciones
            </Link>
            <Link href="/cookies" className="hover:text-purple-400 transition">
              Política de Cookies
            </Link>
            <Link href="/perfil" className="hover:text-purple-400 transition">
              Mi Perfil
            </Link>
            <Link href="/shorts" className="hover:text-purple-400 transition">
              Shorts
            </Link>
          </div>
        </div>
      </footer>

      {/* Banner flotante de aceptación de cookies */}
      <CookieBanner />
    </>
  );
}
