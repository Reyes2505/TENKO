'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('✅ Cuenta creada. Revisa tu email para confirmar.');
        setIsLoading(false);
        return;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (data.session) {
          await new Promise(resolve => setTimeout(resolve, 500));
          window.location.href = '/';
        } else {
          setError('No se pudo iniciar sesión.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-[var(--tenko-border)] bg-white/[0.02] backdrop-blur-xl p-8 shadow-2xl shadow-black/60 relative overflow-hidden">
          {/* Glow morado decorativo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-32 bg-[#6c00f4]/20 blur-[100px] pointer-events-none" />

          <div className="relative text-center mb-8">
            <div className="inline-flex items-center justify-center gap-2 mb-4">
              <span className="font-[family-name:var(--font-unbounded)] text-3xl font-black tracking-tight text-[var(--tenko-text-primary)]">
                TENKO
              </span>
              <span className="text-[#6c00f4] text-lg font-mono">天狐</span>
            </div>
            <p className="font-mono text-[11px] tracking-[0.3em] text-[#6c00f4] font-bold uppercase">
              // {isRegistering ? 'NUEVO ACCESO' : 'ACCESO AL SISTEMA'}
            </p>
          </div>

          {error && (
            <div className={`mb-5 rounded-lg p-3 font-mono text-[11px] tracking-wider ${
              error.startsWith('✅')
                ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                : 'bg-red-950/40 text-red-300 border border-red-500/30'
            }`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="relative space-y-5">
            <div>
              <label className="block font-mono text-[10px] tracking-[0.2em] font-bold text-[var(--tenko-text-secondary)] uppercase mb-2">
                // Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-[var(--tenko-border)] bg-black/40 px-4 py-3 font-mono text-sm text-[var(--tenko-text-primary)] placeholder-white/30 outline-none transition-all focus:border-[#6c00f4] focus:ring-2 focus:ring-[#6c00f4]/40"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block font-mono text-[10px] tracking-[0.2em] font-bold text-[var(--tenko-text-secondary)] uppercase mb-2">
                // Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-[var(--tenko-border)] bg-black/40 px-4 py-3 font-mono text-sm text-[var(--tenko-text-primary)] placeholder-white/30 outline-none transition-all focus:border-[#6c00f4] focus:ring-2 focus:ring-[#6c00f4]/40"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-[#6c00f4] px-4 py-3 font-mono text-xs font-bold tracking-widest uppercase text-[var(--tenko-text-primary)] shadow-lg shadow-[#6c00f4]/30 hover:bg-white hover:text-black transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'PROCESANDO...' : isRegistering ? 'CREAR CUENTA' : 'ENTRAR'}
            </button>
          </form>

          <p className="relative text-center mt-6">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)] hover:text-[#6c00f4] transition-colors uppercase"
            >
              {isRegistering ? '→ YA TENGO CUENTA' : '→ NO TENGO CUENTA'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
