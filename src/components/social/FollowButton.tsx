"use client";

import { useState } from "react";
import { followUser, unfollowUser } from "@/lib/social";

interface FollowButtonProps {
  currentUserId: string;
  targetId: string;
  initialFollowing: boolean;
  onChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({
  currentUserId,
  targetId,
  initialFollowing,
  onChange,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);

    const next = !isFollowing;
    const ok = next
      ? await followUser(currentUserId, targetId)
      : await unfollowUser(currentUserId, targetId);

    if (ok) {
      setIsFollowing(next);
      onChange?.(next);
    }
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-4 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider transition cursor-pointer ${
        isFollowing
          ? "bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200"
          : "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-950/40"
      } ${loading ? "opacity-50 cursor-wait" : ""}`}
    >
      {loading ? "..." : isFollowing ? "Siguiendo" : "Seguir"}
    </button>
  );
}
