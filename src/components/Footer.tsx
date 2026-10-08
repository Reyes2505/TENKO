"use client";

import Link from "next/link";
import Image from "next/image";
import CookieBanner from "@/components/CookieBanner";

const MAINTENANCE_MODE = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true";

export default function Footer() {
  // En mantenimiento, solo dejamos el banner de cookies (por obligación legal)
  if (MAINTENANCE_MODE) {
    return <CookieBanner />;
  }

  return (
    <>
      <div className="h-8 w-full bg-gradient-to-b from-transparent to-[#0b0b0e] pointer-events-none" />

      <footer className="relative w-full bg-[#0b0b0e] text-neutral-400 py-10 px-6 text-xs transition-colors overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-600/10 blur-[120px] rounded-full" />
        </div>

        <div className="relative max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <div className="h-9">
              <Image
                src="/tenko-logo-light.png"
                alt="TENKO天気"
                width={140}
                height={40}
                className="h-full w-auto object-contain dark:hidden"
                priority
              />
              <Image
                src="/tenko-logo-dark.png"
                alt="TENKO天気"
                width={140}
                height={40}
                className="h-full w-auto object-contain hidden dark:block"
                priority
              />
            </div>
            <p className="text-[11px] text-neutral-500">
              © 2026 TENKO AI. Todos los derechos reservados. Plataforma de anime y comunidad UGC.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-semibold text-neutral-300">
            <Link href="/terminos" className="hover:text-purple-400 transition">
              Términos y Condiciones
            </Link>
            <Link href="/privacidad" className="hover:text-purple-400 transition">
              Política de Privacidad
            </Link>
            <Link href="/cookies" className="hover:text-purple-400 transition">
              Política de Cookies
            </Link>
          </div>
        </div>
      </footer>

      <CookieBanner />
    </>
  );
}
