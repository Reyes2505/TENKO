'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        router.push('/login');
        return;
      }

      const esAdminMaster = user.email?.toLowerCase().trim() === 'aaronreyesabantoj3@gmail.com';

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('is_admin')
        .eq('user_id', user.id)
        .maybeSingle();

      setIsAdmin(esAdminMaster || Boolean(perfil?.is_admin));
      setLoading(false);
    }
    check();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--tenko-bg-page)]">
        <div className="animate-spin h-12 w-12 border-2 border-t-[#6c00f4] border-[var(--tenko-border)] rounded-full" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--tenko-bg-page)] text-white">
        <div className="text-center border border-red-500/30 bg-red-950/20 rounded-2xl p-12">
          <div className="text-5xl mb-4">🔒</div>
          <p className="font-[family-name:var(--font-unbounded)] text-lg font-bold mb-2">
            Acceso Restringido
          </p>
          <p className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)]">
            // REQUIERE PRIVILEGIOS DE ADMINISTRADOR
          </p>
          <button
            onClick={() => router.push('/')}
            className="mt-6 rounded-md bg-[#6c00f4] px-6 py-2.5 font-mono text-xs font-bold tracking-widest text-[var(--tenko-text-primary)] hover:bg-white hover:text-black transition-all"
          >
            VOLVER AL INICIO
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] text-[var(--tenko-text-primary)] pb-20">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-10 border-b border-[var(--tenko-border)] pb-6">
          <span className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold block mb-2">
            // PANEL DE CONTROL
          </span>
          <h1 className="font-[family-name:var(--font-unbounded)] text-3xl md:text-4xl font-black uppercase tracking-tight">
            Dashboard Administrativo
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/admin/terminal"
            className="rounded-2xl border border-[#6c00f4]/30 bg-gradient-to-br from-[#6c00f4]/10 to-white/[0.02] p-6 hover:border-[#6c00f4] hover:shadow-lg hover:shadow-[#6c00f4]/20 transition-all group"
          >
            <h3 className="font-[family-name:var(--font-unbounded)] text-base font-bold text-[#6c00f4] flex items-center gap-2 mb-2">
              🛠️ Terminal
            </h3>
            <p className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)]">
              CONSOLA CLI · SCRAPING · SINCRONIZACIÓN
            </p>
            <div className="mt-4 font-mono text-[10px] tracking-widest text-[#6c00f4] group-hover:translate-x-1 transition-transform inline-block">
              ABRIR CONSOLA →
            </div>
          </Link>

          <Link
            href="/inventario"
            className="rounded-2xl border border-[var(--tenko-border)] bg-white/[0.02] p-6 hover:border-[#6c00f4]/60 transition-all group"
          >
            <h3 className="font-[family-name:var(--font-unbounded)] text-base font-bold text-[var(--tenko-text-primary)] flex items-center gap-2 mb-2">
              📦 Inventario
            </h3>
            <p className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)]">
              GESTIÓN DE RECURSOS · SERVIDORES
            </p>
            <div className="mt-4 font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)] group-hover:text-[#6c00f4] group-hover:translate-x-1 transition-all inline-block">
              VER INVENTARIO →
            </div>
          </Link>

          <Link
            href="/peticiones"
            className="rounded-2xl border border-[var(--tenko-border)] bg-white/[0.02] p-6 hover:border-[#6c00f4]/60 transition-all group"
          >
            <h3 className="font-[family-name:var(--font-unbounded)] text-base font-bold text-[var(--tenko-text-primary)] flex items-center gap-2 mb-2">
              🤖 Peticiones
            </h3>
            <p className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)]">
              SOLICITUDES DE LA COMUNIDAD
            </p>
            <div className="mt-4 font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)] group-hover:text-[#6c00f4] group-hover:translate-x-1 transition-all inline-block">
              REVISAR COLA →
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
