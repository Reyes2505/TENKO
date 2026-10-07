"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const NAV = [
  { href: "/", label: "INICIO" },
  { href: "/calendario", label: "CALENDARIO" },
  { href: "/recomendaciones", label: "TENDENCIAS" },
  { href: "/mi-lista", label: "MI LISTA" },
];

interface UserInfo {
  username: string;
  isAdmin: boolean;
  initials: string;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      const u = session?.user;
      if (!u) {
        setUser(null);
        return;
      }
      const email = u.email || "";
      const defaultName = email.split("@")[0];

      const { data: perfil } = await supabase
        .from("perfiles")
        .select("username, is_admin")
        .eq("user_id", u.id)
        .maybeSingle();

      const username = perfil?.username || defaultName;
      const esAdminMaster = email.toLowerCase().trim() === "aaronreyesabantoj3@gmail.com";

      setUser({
        username,
        isAdmin: esAdminMaster || Boolean(perfil?.is_admin),
        initials: username.slice(0, 2).toUpperCase(),
      });
    }
    loadUser();
    const { data: sub } = supabase.auth.onAuthStateChange(() => loadUser());
    return () => sub.subscription.unsubscribe();
  }, []);

  const buscar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/buscar?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-[var(--tenko-bg-page)]/85 border-b border-[var(--tenko-border)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16 gap-4">
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <span className="font-[family-name:var(--font-unbounded)] text-xl font-black tracking-tight text-[var(--tenko-text-primary)]">
            TENKO
          </span>
          <span className="text-[#6c00f4] text-xs font-mono opacity-70 group-hover:opacity-100 transition">
            天狐
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 font-mono text-[11px] tracking-widest transition rounded-full ${
                  active
                    ? "text-[var(--tenko-text-primary)] bg-[#6c00f4]/20 border border-[#6c00f4]/40"
                    : "text-[var(--tenko-text-secondary)] hover:text-[var(--tenko-text-primary)] hover:bg-[var(--tenko-bg-card)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form onSubmit={buscar} className="relative hidden sm:block">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="BUSCAR EN TENKO..."
            className="w-44 focus:w-60 transition-all duration-300 rounded-full bg-[var(--tenko-bg-card)] border border-[var(--tenko-border)] px-4 py-2 font-mono text-[11px] tracking-widest uppercase text-[var(--tenko-text-primary)] placeholder-[var(--tenko-text-muted)] outline-none focus:ring-2 focus:ring-[#6c00f4] focus:border-transparent"
          />
          <button
            type="submit"
            aria-label="Buscar"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--tenko-text-muted)] hover:text-[#6c00f4] transition"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </button>
        </form>

        <button
          onClick={toggle}
          aria-label="Cambiar tema"
          className="relative w-14 h-7 rounded-full bg-[var(--tenko-bg-card)] border border-[var(--tenko-border-strong)] transition hover:border-[#6c00f4]/60 shrink-0"
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-[#6c00f4] flex items-center justify-center transition-transform duration-300 ${
              theme === "light" ? "translate-x-7" : "translate-x-0"
            }`}
          >
            {theme === "dark" ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            )}
          </span>
        </button>

        {user ? (
          <div className="flex items-center gap-2 shrink-0">
            {user.isAdmin && (
              <Link
                href="/admin"
                title="Panel Admin"
                className="hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-[#6c00f4]/15 border border-[#6c00f4]/40 text-[#6c00f4] hover:bg-[#6c00f4] hover:text-white transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
                </svg>
              </Link>
            )}
            <Link
              href="/perfil"
              className="h-8 w-8 rounded-full bg-[#6c00f4] flex items-center justify-center font-[family-name:var(--font-unbounded)] text-[11px] font-bold text-white hover:scale-110 transition-transform"
              title={`@${user.username}`}
            >
              {user.initials}
            </Link>
          </div>
        ) : (
          <Link
            href="/login"
            className="shrink-0 px-4 py-2 rounded-full bg-[#6c00f4] font-mono text-[11px] tracking-widest font-bold text-white hover:bg-white hover:text-black transition-all"
          >
            ENTRAR
          </Link>
        )}
      </div>
    </header>
  );
}
