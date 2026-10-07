'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getTrackingStats, formatWatchTime, getWatchTime, getWatchedEpisodes, getContinueWatching, HistoryEntry } from '@/lib/tracking';

interface UsuarioDB {
  id: string;
  user_id: string;
  email: string;
  username: string;
  is_admin: boolean;
  show_email?: boolean;
}

export default function PerfilPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [bio, setBio] = useState('Sin bio aún.');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [usuariosLista, setUsuariosLista] = useState<UsuarioDB[]>([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [continueWatching, setContinueWatching] = useState<HistoryEntry[]>([]);

  const [stats, setStats] = useState({
    animesCount: 0,
    episodiosVistos: 0,
    tiempoVisualizacion: '0m'
  });

  const cargarStatsLocal = useCallback(() => {
    const totalSeconds = getWatchTime();
    const watchedEpisodes = getWatchedEpisodes();
    const formattedTime = formatWatchTime(totalSeconds);
    const continueItems = getContinueWatching();

    setStats({
      animesCount: 0,
      episodiosVistos: watchedEpisodes.length,
      tiempoVisualizacion: formattedTime,
    });
    setContinueWatching(continueItems);
  }, []);

  useEffect(() => {
    setMounted(true);
    sincronizarPerfilCloud();
    cargarStatsLocal();

    const interval = setInterval(cargarStatsLocal, 5000);
    return () => clearInterval(interval);
  }, [cargarStatsLocal]);

  const sincronizarPerfilCloud = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        setEmail('Invitado');
        setUsername('invitado');
        setLoading(false);
        return;
      }

      setUserId(user.id);
      const userEmail = user.email || '';
      setEmail(userEmail);
      const defaultName = userEmail.split('@')[0];
      setUsername(defaultName);

      const esAdminMaster = userEmail.toLowerCase().trim() === 'aaronreyesabantoj3@gmail.com';

      let { data: perfilData } = await supabase
        .from('perfiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!perfilData) {
        const nuevoPerfil = {
          user_id: user.id,
          username: defaultName,
          email: userEmail,
          bio: 'Sin bio aún.',
          is_admin: esAdminMaster,
          show_email: false,
          updated_at: new Date()
        };

        const { data: creado } = await supabase
          .from('perfiles')
          .insert([nuevoPerfil])
          .select()
          .single();

        perfilData = creado || nuevoPerfil;
      }

      setBio(perfilData.bio || 'Sin bio aún.');
      setAvatarUrl(perfilData.avatar_url || '');
      setBannerUrl(perfilData.banner_url || '');
      setUsername(perfilData.username || defaultName);
      setShowEmail(perfilData.show_email ?? false);
      setIsAdmin(esAdminMaster || Boolean(perfilData.is_admin));

      const { count: totalAnimes } = await supabase.from('animes').select('*', { count: 'exact', head: true });

      setStats(prev => ({ ...prev, animesCount: totalAnimes || 0 }));
      cargarStatsLocal();
    } catch (err) {
      console.error('Error sincronizando perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const guardarEnNube = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const payload = {
        user_id: userId,
        username,
        email,
        bio,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        show_email: showEmail,
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('perfiles')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;
      setEditing(false);
      alert('✨ ¡Perfil sincronizado y guardado en la nube con éxito!');
    } catch (err: any) {
      alert(`❌ Error al guardar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const abrirPanelAdminUsuarios = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.from('perfiles').select('*');
      if (error) throw error;
      setUsuariosLista(data || []);
      setShowAdminModal(true);
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRol = async (targetUserId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('perfiles')
        .update({ is_admin: !currentStatus })
        .eq('user_id', targetUserId);

      if (error) throw error;
      setUsuariosLista(usuariosLista.map(u =>
        u.user_id === targetUserId ? { ...u, is_admin: !currentStatus } : u
      ));
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[var(--tenko-bg-page)] text-[var(--tenko-text-primary)] pb-32">
      {/* Navbar minimalista */}
      <nav className="bg-black/40 backdrop-blur-xl border-b border-[var(--tenko-border)] sticky top-0 z-30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-mono text-[11px] tracking-widest text-[var(--tenko-text-secondary)] hover:text-[#6c00f4] transition-colors flex items-center gap-2 group">
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            VOLVER AL CATÁLOGO
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6c00f4]/15 border border-[#6c00f4]/40 text-[#6c00f4] font-mono text-[10px] tracking-widest font-bold shadow-[0_0_15px_rgba(108,0,244,0.3)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6c00f4] animate-pulse" />
                ADMIN ACTIVO
              </div>
            ) : (
              <div className="px-3 py-1 rounded-full bg-white/5 border border-[var(--tenko-border)] text-[var(--tenko-text-secondary)] font-mono text-[10px] tracking-widest">
                USUARIO ESTÁNDAR
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 space-y-6">

        {/* Tarjeta de perfil */}
        <div className="bg-white/[0.02] border border-[var(--tenko-border)] rounded-3xl overflow-hidden shadow-2xl shadow-black/60 relative">
          <div className="h-48 sm:h-56 bg-gradient-to-r from-[#0a0a0f] via-[#6c00f4]/20 to-[#0a0a0f] relative overflow-hidden">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-50" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(108,0,244,0.15),transparent_50%)]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent" />
          </div>

          <div className="px-6 sm:px-8 pb-8 relative">
            <div className="flex justify-between items-end -mt-16 sm:-mt-20 mb-5">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-zinc-900 border-[5px] border-[#0a0a0f] overflow-hidden shadow-2xl flex items-center justify-center text-4xl relative">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  '🤖'
                )}
              </div>

              <div>
                {editing ? (
                  <button
                    onClick={guardarEnNube}
                    disabled={loading}
                    className="px-5 py-2.5 bg-[#6c00f4] hover:bg-white hover:text-black text-[var(--tenko-text-primary)] font-mono text-[11px] tracking-widest font-bold rounded-md transition-all shadow-lg shadow-[#6c00f4]/30 disabled:opacity-50"
                  >
                    {loading ? 'SINCRONIZANDO...' : 'GUARDAR CAMBIOS'}
                  </button>
                ) : (
                  <button
                    onClick={() => setEditing(true)}
                    className="px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-[var(--tenko-text-primary)] font-mono text-[11px] tracking-widest font-bold rounded-md transition-all border border-[var(--tenko-border)]"
                  >
                    EDITAR PERFIL
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="font-[family-name:var(--font-unbounded)] text-2xl font-black tracking-tight text-white">
                  {username}
                </h1>
                {isAdmin && (
                  <span className="font-mono text-[9px] tracking-widest bg-[#6c00f4]/15 text-[#6c00f4] border border-[#6c00f4]/30 px-2.5 py-0.5 rounded-full font-bold">
                    ADMIN
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-[var(--tenko-text-muted)]">
                {showEmail ? (
                  <span>{email}</span>
                ) : (
                  <span className="italic text-[var(--tenko-text-muted)]">🔒 CORREO OCULTO</span>
                )}
                {editing && (
                  <button
                    type="button"
                    onClick={() => setShowEmail(!showEmail)}
                    className="ml-2 font-mono text-[9px] tracking-widest bg-white/5 hover:bg-white/10 text-white/60 border border-[var(--tenko-border)] px-2 py-0.5 rounded transition-all"
                  >
                    {showEmail ? 'HACER PRIVADO' : 'HACER PÚBLICO'}
                  </button>
                )}
              </div>

              {editing ? (
                <div className="space-y-4 pt-4 bg-black/40 p-5 rounded-2xl border border-[var(--tenko-border)]">
                  <div>
                    <label className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-secondary)] uppercase">// Alias</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-black border border-[var(--tenko-border)] rounded-lg px-3.5 py-2.5 font-mono text-xs text-[var(--tenko-text-primary)] mt-1.5 outline-none focus:border-[#6c00f4] focus:ring-2 focus:ring-[#6c00f4]/30"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-secondary)] uppercase">// Biografía</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full bg-black border border-[var(--tenko-border)] rounded-lg px-3.5 py-2.5 text-sm text-[var(--tenko-text-primary)] mt-1.5 outline-none focus:border-[#6c00f4] focus:ring-2 focus:ring-[#6c00f4]/30 resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-secondary)] uppercase">// URL Avatar</label>
                      <input
                        type="text"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-black border border-[var(--tenko-border)] rounded-lg px-3 py-2 font-mono text-xs text-[var(--tenko-text-primary)] mt-1.5 outline-none focus:border-[#6c00f4] focus:ring-2 focus:ring-[#6c00f4]/30"
                      />
                    </div>
                    <div>
                      <label className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-secondary)] uppercase">// URL Banner</label>
                      <input
                        type="text"
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-black border border-[var(--tenko-border)] rounded-lg px-3 py-2 font-mono text-xs text-[var(--tenko-text-primary)] mt-1.5 outline-none focus:border-[#6c00f4] focus:ring-2 focus:ring-[#6c00f4]/30"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="font-[family-name:var(--font-space-grotesk)] text-sm text-white/60 pt-2 leading-relaxed max-w-2xl">
                  {bio}
                </p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3.5 mt-8 pt-6 border-t border-[var(--tenko-border)] text-center">
              <div className="bg-black/40 border border-[var(--tenko-border)] p-4 rounded-2xl">
                <div className="font-mono text-xl font-bold text-[#6c00f4] tracking-tight">{stats.animesCount}</div>
                <div className="font-mono text-[9px] text-[var(--tenko-text-muted)] uppercase tracking-widest mt-1">Catálogo</div>
              </div>
              <div className="bg-black/40 border border-[var(--tenko-border)] p-4 rounded-2xl">
                <div className="font-mono text-xl font-bold text-cyan-400 tracking-tight">{stats.episodiosVistos}</div>
                <div className="font-mono text-[9px] text-[var(--tenko-text-muted)] uppercase tracking-widest mt-1">Episodios</div>
              </div>
              <div className="bg-black/40 border border-[var(--tenko-border)] p-4 rounded-2xl">
                <div className="font-mono text-xl font-bold text-amber-400 tracking-tight">{stats.tiempoVisualizacion}</div>
                <div className="font-mono text-[9px] text-[var(--tenko-text-muted)] uppercase tracking-widest mt-1">Tiempo</div>
              </div>
            </div>
          </div>
        </div>

        {/* Continuar viendo */}
        {continueWatching.length > 0 && (
          <div className="bg-white/[0.02] border border-[var(--tenko-border)] rounded-3xl p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-2 w-2 rounded-full bg-[#6c00f4]" />
              <h2 className="font-[family-name:var(--font-unbounded)] text-lg font-black uppercase tracking-tight text-white">
                Continuar viendo
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {continueWatching.slice(0, 8).map((item) => (
                <Link
                  key={item.episodeId}
                  href={`/ver/${item.episodeId}`}
                  className="group relative rounded-xl overflow-hidden border border-[var(--tenko-border)] bg-white/5 hover:border-[#6c00f4]/60 transition-all hover:-translate-y-1"
                >
                  <div className="relative aspect-[3/4] overflow-hidden">
                    {item.animePortada ? (
                      <img src={item.animePortada} alt={item.animeTitulo} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="h-full w-full bg-zinc-800 flex items-center justify-center">
                        <span className="text-4xl">🎬</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                    <div className="absolute top-2 left-2 rounded-md bg-black/80 backdrop-blur-md px-2 py-0.5 font-mono text-[10px] font-bold text-[var(--tenko-text-primary)] tracking-widest">
                      EP {String(item.episodeNumber).padStart(2, '0')}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="h-10 w-10 rounded-full bg-[#6c00f4]/90 flex items-center justify-center shadow-lg shadow-[#6c00f4]/40">
                        <svg className="h-4 w-4 text-[var(--tenko-text-primary)] ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5">
                    <h3 className="font-[family-name:var(--font-unbounded)] text-[11px] font-bold text-[var(--tenko-text-primary)] truncate group-hover:text-[#6c00f4] transition-colors">
                      {item.animeTitulo}
                    </h3>
                    <p className="font-mono text-[10px] text-[var(--tenko-text-muted)] mt-0.5 truncate tracking-wider">
                      {item.episodeTitle} · {item.progress}%
                    </p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                    <div className="h-full bg-[#6c00f4]" style={{ width: `${item.progress}%` }} />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Panel admin */}
        {isAdmin && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-mono text-[10px] tracking-[0.3em] text-[#6c00f4] font-bold uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#6c00f4] animate-pulse" />
                Centro de operaciones
              </h3>
              <button
                onClick={abrirPanelAdminUsuarios}
                className="font-mono text-[10px] tracking-widest bg-[#6c00f4]/15 hover:bg-[#6c00f4]/25 text-[#6c00f4] border border-[#6c00f4]/40 px-3.5 py-1.5 rounded-md transition-all font-bold uppercase"
              >
                Gestionar Roles
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/admin/terminal" className="bg-white/[0.02] border border-[#6c00f4]/30 hover:border-[#6c00f4]/60 p-6 rounded-3xl transition-all group flex items-center justify-between shadow-[0_0_30px_rgba(108,0,244,0.05)]">
                <div>
                  <div className="font-[family-name:var(--font-unbounded)] text-base font-bold mb-1 text-[#6c00f4] flex items-center gap-2">
                    🛠️ Terminal
                  </div>
                  <div className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)]">
                    CONSOLA CLI · GITHUB ACTIONS
                  </div>
                </div>
                <span className="text-[#6c00f4] group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <Link href="/admin" className="bg-white/[0.02] border border-[var(--tenko-border)] hover:border-cyan-500/40 p-6 rounded-3xl transition-all group flex items-center justify-between">
                <div>
                  <div className="font-[family-name:var(--font-unbounded)] text-base font-bold mb-1 text-[var(--tenko-text-primary)] flex items-center gap-2">
                    ⚙️ Dashboard
                  </div>
                  <div className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)]">
                    PANEL VISUAL DE GESTIÓN
                  </div>
                </div>
                <span className="text-[var(--tenko-text-muted)] group-hover:text-cyan-400 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        )}

        {/* Modal admin */}
        {showAdminModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--tenko-bg-page)] border border-[var(--tenko-border)] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center border-b border-[var(--tenko-border)] pb-5">
                <div>
                  <h3 className="font-[family-name:var(--font-unbounded)] text-lg font-black text-[var(--tenko-text-primary)] flex items-center gap-2.5 uppercase tracking-tight">
                    👥 Base de usuarios
                  </h3>
                  <p className="font-mono text-[10px] tracking-widest text-[var(--tenko-text-muted)] mt-1">
                    // GESTIÓN DE PRIVILEGIOS
                  </p>
                </div>
                <button onClick={() => setShowAdminModal(false)} className="text-[var(--tenko-text-muted)] hover:text-[var(--tenko-text-primary)] font-mono text-xs p-2.5 bg-white/5 rounded-lg transition-colors border border-[var(--tenko-border)]">
                  ✕
                </button>
              </div>

              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {usuariosLista.map((u) => (
                  <div key={u.user_id} className="bg-black/40 border border-[var(--tenko-border)] p-4 rounded-2xl flex items-center justify-between transition-colors hover:border-[#6c00f4]/40">
                    <div>
                      <div className="font-[family-name:var(--font-unbounded)] text-sm font-bold text-[var(--tenko-text-primary)] flex items-center gap-2">
                        {u.username}
                        {u.is_admin && <span className="font-mono text-[9px] tracking-widest bg-[#6c00f4]/20 text-[#6c00f4] px-2 py-0.5 rounded-full">ADMIN</span>}
                      </div>
                      <div className="font-mono text-[10px] tracking-wider text-[var(--tenko-text-muted)] mt-0.5">{u.email}</div>
                    </div>

                    <button
                      onClick={() => toggleAdminRol(u.user_id, u.is_admin)}
                      className={`font-mono px-3.5 py-1.5 rounded-lg text-[10px] tracking-widest font-bold transition-all ${
                        u.is_admin
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                          : 'bg-[#6c00f4]/10 text-[#6c00f4] border border-[#6c00f4]/20 hover:bg-[#6c00f4]/20'
                      }`}
                    >
                      {u.is_admin ? 'REVOCAR ADMIN' : 'HACER ADMIN'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-[var(--tenko-border)] pt-4 flex justify-end">
                <button onClick={() => setShowAdminModal(false)} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-[var(--tenko-text-primary)] rounded-lg font-mono text-[11px] tracking-widest border border-[var(--tenko-border)] transition-all">
                  CERRAR PANEL
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
