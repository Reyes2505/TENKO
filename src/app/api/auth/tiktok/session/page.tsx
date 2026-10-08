"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function TikTokSessionPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Procesando sesión...");

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    if (!accessToken || !refreshToken) {
      setStatus("No se recibieron tokens. Redirigiendo...");
      setTimeout(() => router.push("/login?error=tiktok_no_tokens"), 1500);
      return;
    }

    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error }) => {
        if (error) {
          console.error("[session] setSession error:", error);
          setStatus("Error al iniciar sesión. Redirigiendo...");
          setTimeout(() => router.push("/login?error=tiktok_session"), 1500);
        } else {
          setStatus("Sesión iniciada. Redirigiendo a tu perfil...");
          window.history.replaceState(null, "", "/api/auth/tiktok/session");
          setTimeout(() => router.push("/perfil"), 800);
        }
      });
  }, [router]);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
        <p className="text-sm font-bold">{status}</p>
      </div>
    </div>
  );
}
