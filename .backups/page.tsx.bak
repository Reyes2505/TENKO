"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface ShortItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  creatorName: string;
  creatorHandle: string;
  creatorAvatar: string;
  likesCount: number;
  commentsCount: number;
  audioTrack: string;
  tags: string[];
}

const SAMPLE_SHORTS: ShortItem[] = [
  {
    id: "short-1",
    title: "Zero Two Epic Moment",
    description: "La mejor escena de Darling in the Franxx ✨ #DarlingInTheFranxx #ZeroTwo #AnimeShorts #TENKO",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    creatorName: "ADMIN TENKO",
    creatorHandle: "@tenko_admin",
    creatorAvatar: "https://i.postimg.cc/0j0x4x7G/zerotwo.jpg",
    likesCount: 14200,
    commentsCount: 384,
    audioTrack: "Darling in the Franxx - Kiss of Death Remix",
    tags: ["#ZeroTwo", "#Anime", "#TENKO"],
  },
  {
    id: "short-2",
    title: "Kimetsu no Yaiba - Demon Slayer AMV",
    description: "Animación de Ufotable nivel Dios 🔥 #DemonSlayer #KimetsuNoYaiba #Tanjiro",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    creatorName: "Otaku Master",
    creatorHandle: "@otaku_master",
    creatorAvatar: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80",
    likesCount: 28900,
    commentsCount: 912,
    audioTrack: "Demon Slayer OST - Gurenge (Lofi Edition)",
    tags: ["#Kimetsu", "#Ufotable", "#Shorts"],
  },
  {
    id: "short-3",
    title: "Jujutsu Kaisen - Gojo Satoru Domain Expansion",
    description: "Ryoiki Tenkai: Muryo Kusho 🤞⚡ #JujutsuKaisen #GojoSatoru #AnimeAMV",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    creatorName: "Jujutsu Fan",
    creatorHandle: "@gojo_official",
    creatorAvatar: "https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80",
    likesCount: 45300,
    commentsCount: 1540,
    audioTrack: "Jujutsu Kaisen - Kaikai Kitan",
    tags: ["#JJK", "#Gojo", "#DomainExpansion"],
  },
];

export default function ShortsPage() {
  const [shortsList, setShortsList] = useState<ShortItem[]>(SAMPLE_SHORTS);
  const [activeVideoId, setActiveVideoId] = useState<string>(SAMPLE_SHORTS[0].id);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [likedShorts, setLikedShorts] = useState<Record<string, boolean>>({});
  const [savedShorts, setSavedShorts] = useState<Record<string, boolean>>({});
  const [commentsOpenId, setCommentsOpenId] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string[]>>({
    "short-1": ["¡Increíble edición!", "Zero Two la mejor waifu 💖", "TENKO Shorts está genial🔥"],
  });
  const [newComment, setNewComment] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Datos reales del perfil de usuario conectado a la web
  const [userProfile, setUserProfile] = useState({
    name: "ADMIN 000",
    handle: "@admin",
    bio: "TESTER",
    avatar: "https://i.postimg.cc/0j0x4x7G/zerotwo.jpg",
    following: 0,
    followers: 0,
    likes: 0,
  });

  const [activeTab, setActiveTab] = useState<string>("para-ti");
  const [searchQuery, setSearchQuery] = useState("");

  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  // Cargar perfil REAL del usuario desde Supabase
  useEffect(() => {
    async function loadRealUserProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        let name = "ADMIN 000";
        let handle = "@admin";
        let bio = "TESTER";
        let avatar = "https://i.postimg.cc/0j0x4x7G/zerotwo.jpg";
        let following = 0;
        let followers = 0;
        let likes = 0;

        if (user) {
          name = user.user_metadata?.full_name || name;
          handle = user.user_metadata?.username || handle;
          bio = user.user_metadata?.bio || bio;
          avatar = user.user_metadata?.avatar_url || avatar;

          // Consultar tabla 'profiles'
          const { data: dbProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (dbProfile) {
            if (dbProfile.name) name = dbProfile.name;
            if (dbProfile.handle) handle = dbProfile.handle;
            if (dbProfile.bio) bio = dbProfile.bio;
            if (dbProfile.avatar_url) avatar = dbProfile.avatar_url;
          }

          // Consultar estadísticas de la función RPC
          const { data: statsData } = await supabase.rpc("get_user_profile_stats", {
            user_uuid: user.id,
          });

          if (statsData && statsData.length > 0) {
            following = Number(statsData[0].total_following || 0);
            followers = Number(statsData[0].total_followers || 0);
            likes = Number(statsData[0].total_likes_received || 0);
          }
        } else {
          // Fallback local si no se ha iniciado sesión
          if (typeof window !== "undefined") {
            name = localStorage.getItem("user_display_name") || name;
            handle = localStorage.getItem("user_handle") || handle;
            bio = localStorage.getItem("user_bio") || bio;
            avatar = localStorage.getItem("user_avatar_url") || avatar;
          }
        }

        setUserProfile({ name, handle, bio, avatar, following, followers, likes });
      } catch (err) {
        console.log("Error cargando datos reales del usuario:", err);
      }
    }

    loadRealUserProfile();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleVideoRef = useCallback((node: HTMLVideoElement | null, id: string) => {
    if (!node) return;
    videoRefs.current[id] = node;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveVideoId(id);
            node.play().catch(() => {});
          } else {
            node.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    observer.observe(node);
  }, []);

  const togglePlayPause = (id: string) => {
    const video = videoRefs.current[id];
    if (video) {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    }
  };

  const toggleLike = (id: string) => {
    setLikedShorts((prev) => ({ ...prev, [id]: !prev[id] }));
    setShortsList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const isLiked = likedShorts[id];
          return {
            ...item,
            likesCount: isLiked ? item.likesCount - 1 : item.likesCount + 1,
          };
        }
        return item;
      })
    );
  };

  const toggleSave = (id: string) => {
    const isSaved = !savedShorts[id];
    setSavedShorts((prev) => ({ ...prev, [id]: isSaved }));
    showToast(isSaved ? "Guardado en Mi Lista 📌" : "Removido de Mi Lista");
  };

  const handleShare = (id: string) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/shorts#${id}`);
      showToast("¡Enlace copiado al portapapeles! 🔗");
    }
  };

  const handleAddComment = (id: string) => {
    if (!newComment.trim()) return;
    setComments((prev) => ({
      ...prev,
      [id]: [...(prev[id] || []), newComment.trim()],
    }));
    setShortsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, commentsCount: item.commentsCount + 1 } : item))
    );
    setNewComment("");
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  // Íconos SVG profesionales para cada sección de TikTok (Sin Emojis)
  const sidebarMenuItems = [
    {
      id: "para-ti",
      label: "Para ti",
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
    {
      id: "explorar",
      label: "Explorar",
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21a9 9 0 100-18 9 9 0 000 18zm3.707-12.707l-2.5 6a1 1 0 01-.586.586l-6 2.5a.5.5 0 01-.654-.654l2.5-6a1 1 0 01.586-.586l6-2.5a.5.5 0 01.654.654z" />
        </svg>
      ),
    },
    {
      id: "siguiendo",
      label: "Siguiendo",
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6" />
        </svg>
      ),
    },
    {
      id: "friends",
      label: "Friends",
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      id: "minidramas",
      label: "Minidramas",
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 4v16M17 4v16M3 8h4M3 12h18M3 16h4M17 8h4M17 16h4M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" />
        </svg>
      ),
    },
    {
      id: "live",
      label: "LIVE",
      isLive: true,
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: "mensajes",
      label: "Mensajes",
      badge: "34",
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      id: "actividad",
      label: "Actividad",
      badge: "2",
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      id: "cargar",
      label: "Cargar",
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: "mas",
      label: "Más",
      svg: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      ),
    },
  ];

  const handleTabClick = (tabId: string, label: string) => {
    setActiveTab(tabId);
    showToast(`Sección "${label}" activada ✨`);
  };

  return (
    <div className="relative w-full h-[calc(100vh-61px)] bg-[#000000] text-white flex overflow-hidden font-sans select-none">
      {/* Toast Notificación */}
      {toastMessage && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-[#fe2c55]/90 text-white text-xs font-extrabold px-5 py-2.5 rounded-full shadow-2xl backdrop-blur-md animate-bounce border border-white/20">
          {toastMessage}
        </div>
      )}

      {/* LADO IZQUIERDO: VISTA PREVIA DEL PERFIL REAL CONECTADO A LA WEB */}
      <aside className="hidden lg:flex flex-col w-80 shrink-0 border-r border-neutral-900 bg-[#000000] p-5 overflow-y-auto justify-between">
        <div className="space-y-6">
          {/* Card Resumen de Tu Perfil Real */}
          <div className="bg-neutral-900/80 border border-neutral-800 rounded-2xl p-4 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-purple-500 shrink-0 bg-black shadow-md">
                <img src={userProfile.avatar} alt="Perfil" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-black text-sm text-white truncate">{userProfile.name}</h2>
                <p className="text-xs text-neutral-400 truncate">{userProfile.handle}</p>
                <span className="inline-block mt-1 bg-purple-600/30 border border-purple-500/50 text-purple-300 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  SHORTS CREATOR
                </span>
              </div>
            </div>

            {/* Biografía */}
            {userProfile.bio && (
              <p className="text-[11px] text-neutral-300 font-medium line-clamp-2 mb-3 bg-black/40 p-2 rounded-lg border border-white/5">
                {userProfile.bio}
              </p>
            )}

            {/* Estadísticas Reales del Usuario */}
            <div className="grid grid-cols-3 gap-2 py-2.5 border-t border-neutral-800/80 text-center text-xs">
              <div>
                <p className="font-extrabold text-white">{formatNumber(userProfile.following)}</p>
                <p className="text-[10px] text-neutral-400">Siguiendo</p>
              </div>
              <div>
                <p className="font-extrabold text-white">{formatNumber(userProfile.followers)}</p>
                <p className="text-[10px] text-neutral-400">Seguidores</p>
              </div>
              <div>
                <p className="font-extrabold text-white">{formatNumber(userProfile.likes)}</p>
                <p className="text-[10px] text-neutral-400">Me gusta</p>
              </div>
            </div>

            <Link
              href="/perfil"
              className="mt-3 w-full block text-center bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs py-2 rounded-xl transition shadow-md shadow-purple-950/50"
            >
              Ir a mi perfil
            </Link>
          </div>

          {/* Cuentas Sugeridas */}
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-neutral-500 px-2 uppercase tracking-wider">Cuentas Sugeridas</p>
            {[
              { name: "Zero Two Official", handle: "@zerotwo_fans", img: "https://i.postimg.cc/0j0x4x7G/zerotwo.jpg" },
              { name: "Ufotable Studio", handle: "@ufotable_jp", img: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=150&auto=format&fit=crop&q=80" },
              { name: "Gojo Satoru AMV", handle: "@gojo_jjk", img: "https://images.unsplash.com/photo-1563089145-599997674d42?w=150&auto=format&fit=crop&q=80" },
            ].map((account, idx) => (
              <div key={idx} className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-neutral-900/60 cursor-pointer transition">
                <img src={account.img} className="w-8 h-8 rounded-full object-cover border border-purple-500/40" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-neutral-200 truncate">{account.name}</p>
                  <p className="text-[10px] text-neutral-500 truncate">{account.handle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-900 text-[10px] text-neutral-600">
          <p>© 2026 TENKO AI • Shorts System</p>
        </div>
      </aside>

      {/* ÁREA CENTRAL: FEED REPRODUCTOR DE SHORTS */}
      <main className="flex-1 h-full flex justify-center items-center overflow-hidden relative bg-[#000000]">
        <div className="w-full max-w-md h-full snap-y snap-mandatory overflow-y-scroll scrollbar-none relative bg-neutral-950 shadow-2xl border-x border-neutral-900">
          {shortsList.map((short) => {
            const isLiked = !!likedShorts[short.id];
            const isSaved = !!savedShorts[short.id];

            return (
              <div
                key={short.id}
                className="w-full h-full snap-start relative flex items-center justify-center bg-black overflow-hidden shrink-0"
              >
                {/* Elemento de Video */}
                <video
                  ref={(node) => handleVideoRef(node, short.id)}
                  src={short.videoUrl}
                  loop
                  muted={isMuted}
                  playsInline
                  onClick={() => togglePlayPause(short.id)}
                  className="w-full h-full object-cover cursor-pointer"
                />

                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80 pointer-events-none" />

                {/* Control de Sonido (Arriba Izquierda) */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="absolute top-4 left-4 z-30 p-2.5 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md text-white border border-white/10 transition cursor-pointer"
                  title={isMuted ? "Activar sonido" : "Silenciar"}
                >
                  {isMuted ? (
                    <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-3 bg-[#fe2c55] rounded-full animate-pulse" />
                      <svg className="w-4 h-4 text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </div>
                  )}
                </button>

                {/* ACCIONES DEL VIDEO (Borde Derecho Interno) */}
                <div className="absolute right-3 bottom-12 z-30 flex flex-col items-center gap-5">
                  {/* Avatar Creador */}
                  <div className="relative group">
                    <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-[#fe2c55] p-0.5 bg-black shadow-lg">
                      <img src={short.creatorAvatar} alt={short.creatorName} className="w-full h-full object-cover rounded-full" />
                    </div>
                    <button className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-[#fe2c55] hover:bg-pink-600 text-white rounded-full p-0.5 text-[10px] shadow-md transition">
                      ➕
                    </button>
                  </div>

                  {/* Me Gusta */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => toggleLike(short.id)}
                      className="p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition active:scale-125 cursor-pointer border border-white/10"
                    >
                      <svg
                        className={`w-6 h-6 transition-colors duration-200 ${
                          isLiked ? "fill-[#fe2c55] text-[#fe2c55] drop-shadow-[0_0_10px_rgba(254,44,85,0.8)]" : "fill-none text-white"
                        }`}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                    </button>
                    <span className="text-[11px] font-extrabold text-white shadow-sm">
                      {formatNumber(short.likesCount)}
                    </span>
                  </div>

                  {/* Comentarios */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => setCommentsOpenId(commentsOpenId === short.id ? null : short.id)}
                      className="p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition active:scale-110 cursor-pointer border border-white/10"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </button>
                    <span className="text-[11px] font-extrabold text-white shadow-sm">
                      {formatNumber(short.commentsCount)}
                    </span>
                  </div>

                  {/* Guardar */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => toggleSave(short.id)}
                      className="p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition active:scale-110 cursor-pointer border border-white/10"
                    >
                      <svg
                        className={`w-6 h-6 ${isSaved ? "fill-amber-400 text-amber-400" : "fill-none text-white"}`}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                    <span className="text-[11px] font-extrabold text-white shadow-sm">Guardar</span>
                  </div>

                  {/* Compartir */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      onClick={() => handleShare(short.id)}
                      className="p-3 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white transition active:scale-110 cursor-pointer border border-white/10"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                    </button>
                    <span className="text-[11px] font-extrabold text-white shadow-sm">Compartir</span>
                  </div>

                  {/* Disco Giratorio */}
                  <div className="w-10 h-10 rounded-full border-2 border-neutral-700 bg-gradient-to-tr from-pink-900 to-black flex items-center justify-center animate-spin duration-3000 shadow-xl mt-2">
                    <span className="text-xs">🎵</span>
                  </div>
                </div>

                {/* Información Inferior del Creador */}
                <div className="absolute left-4 bottom-6 right-20 z-30 space-y-2.5 text-left text-white">
                  <div className="flex items-center gap-2">
                    <Link href="/perfil" className="font-extrabold text-sm hover:underline flex items-center gap-1">
                      {short.creatorName}
                      <span className="text-pink-400 text-xs font-semibold">{short.creatorHandle}</span>
                    </Link>
                    <span className="bg-[#fe2c55]/80 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border border-white/20">
                      SHORT
                    </span>
                  </div>

                  <p className="text-xs font-medium leading-relaxed text-neutral-200 line-clamp-2 drop-shadow">
                    {short.description}
                  </p>

                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full w-fit border border-white/10">
                    <span className="animate-pulse">🎵</span>
                    <p className="truncate max-w-[200px] text-[11px]">{short.audioTrack}</p>
                  </div>
                </div>

                {/* Modal Comentarios */}
                {commentsOpenId === short.id && (
                  <div className="absolute inset-x-0 bottom-0 h-[60%] z-40 bg-neutral-900/95 backdrop-blur-xl rounded-t-3xl border-t border-neutral-800 p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                        Comentarios ({comments[short.id]?.length || 0})
                      </h3>
                      <button
                        onClick={() => setCommentsOpenId(null)}
                        className="text-neutral-400 hover:text-white text-xs font-bold p-1"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto py-3 space-y-3 scrollbar-thin">
                      {(comments[short.id] || []).length > 0 ? (
                        comments[short.id].map((c, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <div className="w-6 h-6 rounded-full bg-[#fe2c55] flex items-center justify-center font-bold text-[10px]">
                              U
                            </div>
                            <div className="flex-1 bg-neutral-800/60 p-2.5 rounded-xl border border-neutral-700/50">
                              <span className="font-bold text-pink-400 text-[11px] block">@fan_tenko</span>
                              <p className="text-neutral-200 text-xs mt-0.5">{c}</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-center text-neutral-500 text-xs py-8">
                          Sé el primero en comentar este Short 🔥
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
                      <input
                        type="text"
                        placeholder="Escribe un comentario..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddComment(short.id)}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#fe2c55]"
                      />
                      <button
                        onClick={() => handleAddComment(short.id)}
                        className="bg-[#fe2c55] hover:bg-pink-600 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* LADO DERECHO: MENÚ DE NAVEGACIÓN TIKTOK CON ÍCONOS VECTORIALES SVG (SIN EMOJIS) */}
      <aside className="hidden md:flex flex-col w-64 shrink-0 border-l border-neutral-900 bg-[#000000] p-4 overflow-y-auto scrollbar-none justify-between">
        <div className="space-y-4">
          
          {/* Barra de Búsqueda TikTok */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-full pl-9 pr-4 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#fe2c55] transition"
            />
            <svg
              className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Menú de Secciones TikTok con Íconos SVG (Sin Emojis) */}
          <nav className="space-y-0.5">
            {sidebarMenuItems.map((item) => {
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTabClick(item.id, item.label)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
                    isSelected
                      ? "text-[#fe2c55] bg-neutral-900/80"
                      : "text-neutral-200 hover:bg-neutral-900/50 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isSelected ? "text-[#fe2c55]" : "text-neutral-400"}>
                      {item.svg}
                    </span>
                    <span className={isSelected ? "font-extrabold text-[#fe2c55]" : ""}>
                      {item.label}
                    </span>
                  </div>

                  {/* Badges de Mensajes y Actividad */}
                  {item.badge && (
                    <span className="bg-[#fe2c55] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow-md">
                      {item.badge}
                    </span>
                  )}

                  {/* Badge LIVE */}
                  {item.isLive && (
                    <span className="bg-red-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider animate-pulse">
                      LIVE
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-3 border-t border-neutral-900 text-[10px] text-neutral-600 px-2">
          <p>© 2026 TENKO AI • Navigation Panel</p>
        </div>
      </aside>
    </div>
  );
}
