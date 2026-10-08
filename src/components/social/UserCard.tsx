"use client";

import Link from "next/link";
import Image from "next/image";
import FollowButton from "./FollowButton";

interface UserCardProps {
  currentUserId: string;
  user: {
    id: string;
    name: string | null;
    handle: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
  isFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function UserCard({
  currentUserId,
  user,
  isFollowing = false,
  onFollowChange,
}: UserCardProps) {
  const profileUrl = user.handle ? `/social/${user.handle}` : `/social/id/${user.id}`;

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 hover:border-purple-400/50 dark:hover:border-purple-500/50 transition">
      {/* Avatar */}
      <Link href={profileUrl} className="shrink-0">
        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-800">
          {user.avatar_url ? (
            <Image
              src={user.avatar_url}
              alt={user.name || "Avatar"}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xl font-bold">
              {(user.name || user.handle || "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </Link>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <Link href={profileUrl} className="block group">
          <h3 className="font-bold text-sm text-neutral-900 dark:text-white truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition">
            {user.name || "Sin nombre"}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {user.handle || "sin handle"}
          </p>
        </Link>
        {user.bio && (
          <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1.5 line-clamp-2">
            {user.bio}
          </p>
        )}
      </div>

      {/* Botón seguir */}
      <div className="shrink-0">
        <FollowButton
          currentUserId={currentUserId}
          targetId={user.id}
          initialFollowing={isFollowing}
          onChange={onFollowChange}
        />
      </div>
    </div>
  );
}
