"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import {
  getPublicProfile,
  sendFriendRequest,
  type PublicProfile,
} from "@/lib/social";
import FollowButton from "@/components/social/FollowButton";
import MediaDisplay from "@/components/MediaDisplay";

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const handleParam = decodeURIComponent(String(params.handle || ""));
  const handle = handleParam.startsWith("@") ? handleParam : `@${handleParam}`;

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [friendReqSent, setFriendReqSent] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUserId(user.id);

      const p = await getPublicProfile(handle, user.id);
      if (!p) {
        setNotFound(true);
      } else if (p.id === user.id) {
        router.push("/perfil");
        return;
      } else {
        setProfile(p);
        setFriendReqSent(p.friend_request_pending);
      }
      setLoading(false);
    })();
  }, [handle, router]);

  const handleSendFriendRequest = async () => {
    if (!currentUserId || !profile) return;
    const ok = await sendFriendRequest(currentUserId, profile.id);
    if (ok) setFriendReqSent(true);
  };

  if (loading || !currentUserId) {
    return (
      <main className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex flex-col items-center justify-center gap-4 p-6">
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
      </main>
    );
  }

  const avatarFallback = (profile.name || profile.handle || "?").charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Botón volver */}
        <Link
          href="/social"
          className="inline-flex items-center gap-1 text-xs font-bold text-neutral-500 hover:text-purple-600 dark:hover:text-purple-400 transition"
        >
          ← Volver a Social
        </Link>

        {/* Banner */}
        <div className="relative w-full h-40 sm:h-56 rounded-3xl overflow-hidden bg-neutral-200 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          {profile.banner_url ? (
            <MediaDisplay src={profile.banner_url} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-500/20 via-fuchsia-500/10 to-transparent" />
          )}
        </div>

        {/* Avatar + info principal */}
        <div className="-mt-16 sm:-mt-20 px-4 flex items-end gap-4">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-neutral-50 dark:border-black bg-neutral-100 dark:bg-neutral-800 shrink-0">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.name || "Avatar"}
                width={128}
                height={128}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-neutral-400">
                {avatarFallback}
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="px-4 space-y-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              {profile.name || "Sin nombre"}
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {profile.handle || "sin handle"}
            </p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="font-black text-base">
                {profile.following_count}
              </span>{" "}
              <span className="text-neutral-500 dark:text-neutral-400">Siguiendo</span>
            </div>
            <div>
              <span className="font-black text-base">
                {profile.followers_count}
              </span>{" "}
              <span className="text-neutral-500 dark:text-neutral-400">Seguidores</span>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <FollowButton
              currentUserId={currentUserId}
              targetId={profile.id}
              initialFollowing={profile.is_following}
            />

            {profile.is_friend ? (
              <span className="px-4 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-extrabold uppercase tracking-wider">
                Amigos
              </span>
            ) : friendReqSent ? (
              <span className="px-4 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-extrabold uppercase tracking-wider">
                Solicitud enviada
              </span>
            ) : (
              <button
                onClick={handleSendFriendRequest}
                className="px-4 py-1.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-extrabold uppercase tracking-wider transition cursor-pointer"
              >
                Añadir amigo
              </button>
            )}

            <Link
              href={`/mensajes`}
              className="px-4 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 hover:border-purple-500 dark:hover:border-purple-500 text-neutral-700 dark:text-neutral-300 text-xs font-extrabold uppercase tracking-wider transition"
            >
              Mensaje
            </Link>
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="pt-4">
              <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-line">
                {profile.bio}
              </p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
