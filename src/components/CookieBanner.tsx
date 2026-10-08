"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function CookieBanner() {
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    const consent = localStorage.getItem("tenko_cookie_consent");
    if (!consent) {
      setAccepted(false);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem("tenko_cookie_consent", "true");
    setAccepted(true);
  };

  if (accepted) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-neutral-950/95 border-t border-neutral-800 p-4 backdrop-blur-md text-white flex flex-col sm:flex-row items-center justify-between gap-4 text-xs shadow-2xl">
      <p className="max-w-3xl text-neutral-300 text-center sm:text-left">
        Utilizamos cookies propias y de terceros para mejorar tu experiencia, analizar el tráfico y mostrar publicidad personalizada en el futuro. Al continuar navegando en <span className="text-purple-400 font-bold">TENKO AI</span>, aceptas nuestra{" "}
        <Link href="/cookies" className="underline text-purple-400 hover:text-purple-300">Política de Cookies</Link> y nuestros{" "}
        <Link href="/terminos" className="underline text-purple-400 hover:text-purple-300">Términos y Condiciones</Link>.
      </p>
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={acceptCookies}
          className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold px-5 py-2 rounded-xl transition cursor-pointer shadow-md shadow-purple-950"
        >
          Aceptar y continuar
        </button>
      </div>
    </div>
  );
}
