'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { formatTikTokCount } from '@/lib/utils';

interface UserStats {
  following: number;
  followers: number;
  likes: number;
}

export default function PerfilStats({ userId }: { userId: string }) {
  const [stats, setStats] = useState<UserStats>({ following: 0, followers: 0, likes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!userId) return;

      const { data, error } = await supabase.rpc('get_user_profile_stats', {
        user_uuid: userId,
      });

      if (!error && data && data.length > 0) {
        setStats({
          following: Number(data[0].total_following),
          followers: Number(data[0].total_followers),
          likes: Number(data[0].total_likes_received),
        });
      }
      setLoading(false);
    }

    fetchStats();
  }, [userId]);

  if (loading) {
    return <div className="animate-pulse h-5 w-60 bg-white/10 rounded-md my-2" />;
  }

  return (
    <div className="flex items-center gap-4 text-sm my-2">
      <p>
        <span className="font-bold text-white mr-1">{formatTikTokCount(stats.following)}</span>
        <span className="text-gray-400">Siguiendo</span>
      </p>
      <p>
        <span className="font-bold text-white mr-1">{formatTikTokCount(stats.followers)}</span>
        <span className="text-gray-400">Seguidores</span>
      </p>
      <p>
        <span className="font-bold text-white mr-1">{formatTikTokCount(stats.likes)}</span>
        <span className="text-gray-400">Me gusta</span>
      </p>
    </div>
  );
}
