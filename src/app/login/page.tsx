"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

import { supabase } from "@/lib/supabase";

// ══════════════════════════════════════════════════════════════════
// HELPERS: generación de handle desde el correo
// ══════════════════════════════════════════════════════════════════

/**
 * Genera un handle base a partir del correo:
 *   aaron@gmail.com        → @aaron
 *   aaron+test@gmail.com   → @aaron
 *   juan.perez@mail.com    → @juanperez
 *   user123@dominio.com    → @user123
 */
function generateHandleFromEmail(email: string): string {
  const localPart = email.split("@")[0] || "";
  const beforePlus = localPart.split("+")[0] || localPart;
  const clean = beforePlus.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();
  return `@${clean || "user"}`;
}

/**
 * Asegura que el handle sea único en la tabla profiles.
 * Si "@aaron" ya existe, prueba "@aaron2", "@aaron3", etc.
 */
async function uniqueHandle(baseHandle: string): Promise<string> {
  const base = baseHandle.replace(/^@/, "");
  let candidate = `@${base}`;
  let suffix = 1;

  while (suffix < 100) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", candidate)
      .maybeSingle();

    if (!data) return candidate;

    suffix += 1;
    candidate = `@${base}${suffix}`;
  }

  // Fallback con sufijo aleatorio
  return `@${base}${Math.random().toString(36).slice(2, 6)}`;
}

// ══════════════════════════════════════════════════════════════════

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/perfil");
      }
    }
    checkSession();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage("");

    try {
      if (isRegister) {
        // 1. Generar handle único a partir del correo
        const baseHandle = generateHandleFromEmail(email);
        const handle = await uniqueHandle(baseHandle);

        // 2. Registro
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim() || "Usuario Tenko",
              handle,
              avatar_url: "https://i.postimg.cc/0j0x4x7G/zerotwo.jpg",
              bio: "Fan de Anime & Shorts",
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          localStorage.setItem("user_display_name", fullName.trim() || "Usuario Tenko");
          localStorage.setItem("user_handle", handle);
          localStorage.setItem("user_avatar_url", "https://i.postimg.cc/0j0x4x7G/zerotwo.jpg");

          // Crear/actualizar el perfil en la tabla profiles
          await supabase.from("profiles").upsert({
            id: data.user.id,
            name: fullName.trim() || "Usuario Tenko",
            handle,
            avatar_url: "https://i.postimg.cc/0j0x4x7G/zerotwo.jpg",
            bio: "Fan de Anime & Shorts",
            updated_at: new Date().toISOString(),
          });

          window.dispatchEvent(new Event("tenko-profile-updated"));
          router.push("/perfil");
        }
      } else {
        // ─── LOGIN ────────────────────────────────────────────────
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.user) {
          const meta = data.user.user_metadata || {};
          if (meta.full_name) localStorage.setItem("user_display_name", meta.full_name);
          if (meta.handle) localStorage.setItem("user_handle", meta.handle);
          if (meta.avatar_url) localStorage.setItem("user_avatar_url", meta.avatar_url);

          window.dispatchEvent(new Event("tenko-profile-updated"));
          router.push("/perfil");
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Ocurrió un error al autenticar");
    } finally {
      setLoading(false);
    }
  };

  const handleTikTokLogin = () => {
    window.location.href = "/api/auth/tiktok";
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0b0b0e] text-neutral-900 dark:text-white flex items-center justify-center p-4 transition-colors">
      <div className="absolute w-96 h-96 bg-purple-900/20 rounded-full blur-3xl pointer-events-none -top-10 -left-10" />
      <div className="absolute w-96 h-96 bg-pink-900/15 rounded-full blur-3xl pointer-events-none bottom-0 right-0" />

      <div className="relative w-full max-w-md bg-white/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 backdrop-blur-xl p-8 rounded-3xl shadow-2xl z-10">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block h-14">
            <Image
              src="/tenko-logo-light.png"
              alt="TENKO天気"
              width={200}
              height={64}
              className="h-full w-auto object-contain mx-auto dark:hidden"
              priority
            />
            <Image
              src="/tenko-logo-dark.png"
              alt="TENKO天気"
              width={200}
              height={64}
              className="h-full w-auto object-contain mx-auto hidden dark:block"
              priority
            />
          </Link>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium mt-3">
            {isRegister ? "Crea tu cuenta para acceder a la comunidad" : "Ingresa a tu cuenta para continuar"}
          </p>
        </div>

        <div className="mb-6">
          <button
            onClick={handleTikTokLogin}
            type="button"
            className="w-full py-3 px-4 rounded-xl bg-black hover:bg-neutral-950 border border-neutral-300 dark:border-neutral-700 text-white font-extrabold text-xs flex items-center justify-center gap-3 transition shadow-lg cursor-pointer"
          >
            <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
            </svg>
            Continuar con TikTok
          </button>
          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
            <span className="flex-shrink mx-4 text-neutral-500 text-[10px] uppercase font-bold">o con correo</span>
            <div className="flex-grow border-t border-neutral-200 dark:border-neutral-800"></div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-500/50 text-red-700 dark:text-red-300 text-xs font-semibold text-center">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej. Otaku Master"
                className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-purple-500 transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Correo Electrónico
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-purple-500 transition"
            />
            {isRegister && (
              <p className="mt-1 text-[10px] text-neutral-500 dark:text-neutral-400">
                Tu nombre de usuario se generará automáticamente desde tu correo.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded-xl px-4 py-3 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs tracking-wider uppercase transition shadow-lg shadow-purple-950/50 cursor-pointer disabled:opacity-50"
          >
            {loading ? "Procesando..." : isRegister ? "Crear Cuenta" : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {isRegister ? "¿Ya tienes una cuenta?" : "¿Aún no tienes cuenta?"}{" "}
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMessage("");
              }}
              className="text-purple-600 dark:text-purple-400 font-bold hover:underline ml-1 cursor-pointer"
            >
              {isRegister ? "Inicia Sesión" : "Regístrate gratis"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
