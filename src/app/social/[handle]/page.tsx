"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import MediaDisplay, { isVideoUrl, isTikTokUrl } from "@/components/MediaDisplay";
import EditGrid from "@/components/social/EditGrid";
import { supabase } from "@/lib/supabase";
import {
  getPublicProfile,
  sendFriendRequest,
  type PublicProfile,
} from "@/lib/social";
import FollowButton from "@/components/social/FollowButton";

type AudioSource = "none" | "banner" | "avatar";

interface FullProfile extends PublicProfile {
  likes_count: number;
  audio_source: AudioSource;
  tiktok_open_id: string | null;
  tiktok_username: string | null;
  edits: string[];
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const handleParam = decodeURIComponent(String(params.handle || ""));
  const handle = handleParam.startsWith("@") ? handleParam : `@${handleParam}`;

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [friendReqSent, setFriendReqSent] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioSource>("none");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUserId(user.id);

      const p = await getPublicProfile(handle, user.id);
      if (!p) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }
      if (p.id === user.id) {
        router.push("/perfil");
        return;
      }

      const { data: extra } = await supabase
        .from("profiles")
        .select("audio_source, tiktok_open_id, tiktok_username, edits")
        .eq("id", p.id)
        .maybeSingle();

      let likesCount = 0;
      try {
        const { data: likesData } = await supabase.rpc(
          "get_user_profile_stats",
          { user_uuid: p.id }
        );
        if (likesData && likesData.length > 0) {
          likesCount = Number(likesData[0].total_likes_received || 0);
        }
      } catch {
        /* RPC opcional */
      }

      setProfile({
        ...p,
        likes_count: likesCount,
        audio_source: (extra?.audio_source as AudioSource) || "none",
        tiktok_open_id: extra?.tiktok_open_id || null,
        tiktok_username: extra?.tiktok_username || null,
        edits: Array.isArray(extra?.edits) ? extra.edits : [],
      });
      setFriendReqSent(p.friend_request_pending);
      setAudioSource((extra?.audio_source as AudioSource) || "none");
      setIsLoading(false);
    })();
  }, [handle, router]);

  const formatNumber = (num: number) => {
    if (num >= 1000000)
      return `${(num / 1000000).toFixed(1).replace(".", ",")} M`;
    if (num >= 1000)
      return `${(num / 1000).toFixed(1).replace(".", ",")} mil`;
    return num.toString();
  };

  const handleSendFriendRequest = async () => {
    if (!currentUserId || !profile) return;
    const ok = await sendFriendRequest(currentUserId, profile.id);
    if (ok) setFriendReqSent(true);
  };

  const setQuickAudioSource = (source: AudioSource) => {
    setAudioSource((prev) => (prev === source ? "none" : source));
  };

  const bannerHasMedia = profile
    ? isVideoUrl(profile.banner_url) || isTikTokUrl(profile.banner_url)
    : false;
  const avatarHasMedia = profile
    ? isVideoUrl(profile.avatar_url) || isTikTokUrl(profile.avatar_url)
    : false;

  // ─── Loading ────────────────────────────────────────────────────
  if (isLoading || !currentUserId) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white pb-16 transition-colors">
        <div className="relative w-full h-64 sm:h-80 md:h-96 bg-neutral-200 dark:bg-neutral-900 animate-pulse" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-20 sm:-mt-24 relative z-20">
          <div className="flex flex-col sm:flex-row items-start gap-6 pb-6">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-neutral-50 dark:border-black bg-neutral-300 dark:bg-neutral-800 animate-pulse flex-shrink-0 shadow-xl" />
            <div className="flex-1 min-w-0 space-y-4 pt-4 w-full">
              <div className="h-7 sm:h-8 w-48 bg-neutral-300 dark:bg-neutral-800 rounded-lg animate-pulse" />
              <div className="flex items-center gap-6 pt-1">
                <div className="h-5 w-24 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
                <div className="h-5 w-28 bg-neutral-200 dark:bg-neutral-800 rounded-md animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── No encontrado ──────────────────────────────────────────────
  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-extrabold">Usuario no encontrado</h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          El perfil {handle} no existe en TENKO.
        </p>
        <Link
          href="/social"
          className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition"
        >
          Volver a Social
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white transition-colors">
      {/* Banner */}
      <div className="relative w-full h-64 sm:h-80 md:h-96 overflow-hidden bg-neutral-200 dark:bg-black group">
        <MediaDisplay
          src={profile.banner_url}
          alt="Banner de perfil"
          muted={audioSource !== "banner"}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-50/0 via-neutral-50/20 to-neutral-50 dark:from-black/0 dark:via-black/30 dark:to-black pointer-events-none" />

        {bannerHasMedia && (
          <button
            onClick={() => setQuickAudioSource("banner")}
            className="absolute top-4 right-6 z-20 px-3.5 py-1.5 rounded-full bg-black/60 dark:bg-black/50 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold flex items-center gap-2 transition border border-white/20 dark:border-white/15 shadow-lg cursor-pointer"
          >
            {audioSource === "banner" ? (
              <>
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping" />
                <span className="text-pink-400 font-bold">
                  Silenciar Audio Banner
                </span>
              </>
            ) : (
              <>
                <svg
                  className="w-3.5 h-3.5 text-neutral-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
                <span className="text-neutral-200">Activar Audio Banner</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Contenido */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-20 sm:-mt-24 relative z-20 pb-32">
        <div className="flex flex-col sm:flex-row items-start gap-6 pb-6">
          <div className="relative flex-shrink-0 group">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-neutral-50 dark:border-black bg-neutral-200 dark:bg-neutral-800 shadow-2xl relative">
              <MediaDisplay
                src={profile.avatar_url}
                alt={profile.name || "Avatar"}
                muted={audioSource !== "avatar"}
                className="w-full h-full object-cover"
                fallbackInitials={(profile.name || profile.handle || "?")
                  .charAt(0)
                  .toUpperCase()}
              />
            </div>

            {avatarHasMedia && (
              <button
                onClick={() => setQuickAudioSource("avatar")}
                title={
                  audioSource === "avatar"
                    ? "Silenciar audio del avatar"
                    : "Activar audio del avatar"
                }
                className="absolute bottom-1 right-1 p-2 rounded-full bg-black/80 text-white text-xs hover:scale-110 transition shadow-lg cursor-pointer border border-neutral-700"
              >
                {audioSource === "avatar" ? "🔊" : "🔇"}
              </button>
            )}
          </div>

          <div className="flex-1 min-w-0 space-y-3 pt-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 dark:text-white truncate">
                {profile.name || "Sin nombre"}
              </h1>
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                {profile.handle || "sin handle"}
              </span>

              {profile.tiktok_open_id && (
                <span className="px-2 py-0.5 rounded-md bg-black/80 border border-neutral-700 text-[10px] tracking-widest font-black uppercase text-white shadow-sm inline-flex items-center gap-1">
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                  </svg>
                  TikTok
                </span>
              )}

              <span className="px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-500/40 text-[10px] tracking-widest font-black uppercase text-white shadow-sm flex items-center">
                SHOR
                <span className="text-purple-500 font-black text-xs mx-[0.5px]">
                  T
                </span>
                S
              </span>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-xs sm:text-sm">
              <div>
                <span className="font-extrabold text-neutral-900 dark:text-white mr-1.5">
                  {formatNumber(profile.following_count)}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                  Siguiendo
                </span>
              </div>
              <div>
                <span className="font-extrabold text-neutral-900 dark:text-white mr-1.5">
                  {formatNumber(profile.followers_count)}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                  Seguidores
                </span>
              </div>
              <div>
                <span className="font-extrabold text-neutral-900 dark:text-white mr-1.5">
                  {formatNumber(profile.likes_count)}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">
                  Me gusta
                </span>
              </div>
            </div>

            {/* Botones */}
            <div className="flex items-center gap-3 pt-1 flex-wrap">
              <FollowButton
                currentUserId={currentUserId}
                targetId={profile.id}
                initialFollowing={profile.is_following}
              />

              {profile.is_friend ? (
                <span className="px-6 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
                  Amigos
                </span>
              ) : friendReqSent ? (
                <span className="px-6 py-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                  Solicitud enviada
                </span>
              ) : (
                <button
                  onClick={handleSendFriendRequest}
                  className="px-6 py-2.5 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-300 font-extrabold text-xs transition cursor-pointer"
                >
                  Añadir amigo
                </button>
              )}

              <Link
                href={`/mensajes`}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs transition shadow-md cursor-pointer"
              >
                Mensaje
              </Link>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 font-normal leading-relaxed max-w-lg whitespace-pre-line">
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Collage de edits */}
        {profile.edits && profile.edits.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-4">
              Edits · {profile.edits.length}
            </h2>
            <EditGrid urls={profile.edits} />
          </div>
        )}
      </div>
    </div>
  );
}
