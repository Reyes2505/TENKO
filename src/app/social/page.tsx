"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  searchUsers,
  getSuggestedUsers,
  getPendingFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  type FriendRequest,
} from "@/lib/social";
import UserCard from "@/components/social/UserCard";

interface SearchResult {
  id: string;
  name: string | null;
  handle: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export default function SocialPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [followStatus, setFollowStatus] = useState<Record<string, boolean>>({});

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // ─── Sesión y carga inicial ─────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUserId(user.id);

      const [sug, reqs] = await Promise.all([
        getSuggestedUsers(user.id),
        getPendingFriendRequests(user.id),
      ]);
      setSuggestions(sug as SearchResult[]);
      setRequests(reqs);
      setLoading(false);
    })();
  }, [router]);

  // ─── Búsqueda con debounce ──────────────────────────────────────
  useEffect(() => {
    if (!currentUserId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchUsers(query, currentUserId);
      setResults(res as SearchResult[]);
      setSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, currentUserId]);

  // ─── Aceptar / rechazar solicitudes ─────────────────────────────
  const handleAccept = async (id: string) => {
    await acceptFriendRequest(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };
  const handleReject = async (id: string) => {
    await rejectFriendRequest(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  // ─── Loading ────────────────────────────────────────────────────
  if (loading || !currentUserId) {
    return (
      <main className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-purple-500/30 border-t-purple-500 animate-spin" />
      </main>
    );
  }

  const showSearchResults = query.trim().length > 0;

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-10">

        {/* Header */}
        <header className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            Social
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Encuentra amigos, sigue a otros fans y envía mensajes.
          </p>
        </header>

        {/* Buscador */}
        <section>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por @handle o nombre..."
              className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl px-5 py-4 pl-12 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-purple-500 transition"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 rounded-full border-2 border-purple-500/30 border-t-purple-500 animate-spin" />
              </div>
            )}
          </div>
        </section>

        {/* Resultados de búsqueda */}
        {showSearchResults && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              Resultados
            </h2>
            {results.length === 0 && !searching ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No se encontraron usuarios con &quot;{query}&quot;.
              </p>
            ) : (
              <div className="space-y-3">
                {results.map((u) => (
                  <UserCard
                    key={u.id}
                    currentUserId={currentUserId}
                    user={u}
                    isFollowing={followStatus[u.id] || false}
                    onFollowChange={(v) =>
                      setFollowStatus((prev) => ({ ...prev, [u.id]: v }))
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Solicitudes pendientes */}
        {!showSearchResults && requests.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              Solicitudes pendientes ({requests.length})
            </h2>
            <div className="space-y-3">
              {requests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-purple-400/30 dark:border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20"
                >
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0">
                    {r.profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.profile.avatar_url}
                        alt={r.profile.name || "Avatar"}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 font-bold">
                        {(r.profile?.name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">
                      {r.profile?.name || "Usuario"}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {r.profile?.handle || ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleAccept(r.id)}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer"
                    >
                      Aceptar
                    </button>
                    <button
                      onClick={() => handleReject(r.id)}
                      className="px-3 py-1.5 rounded-lg bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition cursor-pointer"
                    >
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sugerencias */}
        {!showSearchResults && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              Sugerencias para ti
            </h2>
            {suggestions.length === 0 ? (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                No hay sugerencias por ahora. Vuelve más tarde.
              </p>
            ) : (
              <div className="space-y-3">
                {suggestions.map((u) => (
                  <UserCard
                    key={u.id}
                    currentUserId={currentUserId}
                    user={u}
                    isFollowing={followStatus[u.id] || false}
                    onFollowChange={(v) =>
                      setFollowStatus((prev) => ({ ...prev, [u.id]: v }))
                    }
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
