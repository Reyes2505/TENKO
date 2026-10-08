/**
 * Helpers de la sección social de TENKO.
 * Basado en la estructura real de la tabla `profiles`:
 *   id, name, handle, bio, avatar_url, banner_url, audio_source, updated_at
 * Los handles incluyen el prefijo @ (ej. "@admin").
 */

import { supabase } from "@/lib/supabase";

// ══════════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════════

export interface PublicProfile {
  id: string;
  name: string | null;
  handle: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_friend: boolean;
  friend_request_pending: boolean;
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  profile?: {
    name: string | null;
    handle: string | null;
    avatar_url: string | null;
  };
}

export interface ConversationSummary {
  id: string;
  other_user_id: string;
  other_user_name: string | null;
  other_user_handle: string | null;
  other_user_avatar: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

// ══════════════════════════════════════════════════════════════════
// BÚSQUEDA DE USUARIOS
// ══════════════════════════════════════════════════════════════════

/**
 * Busca usuarios por handle o nombre. Acepta queries con o sin "@".
 */
export async function searchUsers(query: string, currentUserId: string, limit = 20) {
  const q = query.trim();
  if (!q) return [];

  const qWithAt = q.startsWith("@") ? q : `@${q}`;
  const qWithoutAt = q.replace(/^@/, "");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, handle, avatar_url, bio")
    .neq("id", currentUserId)
    .or(`handle.ilike.%${qWithAt}%,handle.ilike.%${qWithoutAt}%,name.ilike.%${q}%`)
    .limit(limit);

  if (error) {
    console.error("[social.searchUsers]", error);
    return [];
  }

  return data || [];
}

export async function getSuggestedUsers(currentUserId: string, limit = 6) {
  const { data: following } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", currentUserId);

  const followingIds = (following || []).map((f) => f.following_id);
  followingIds.push(currentUserId);

  // Si no hay IDs que excluir, traer solo los más recientes
  let query = supabase
    .from("profiles")
    .select("id, name, handle, avatar_url, bio")
    .limit(limit);

  if (followingIds.length > 0) {
    query = query.not("id", "in", `(${followingIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[social.getSuggestedUsers]", error);
    return [];
  }

  return data || [];
}

// ══════════════════════════════════════════════════════════════════
// PERFIL PÚBLICO
// ══════════════════════════════════════════════════════════════════

/**
 * Obtiene el perfil público de un usuario por su handle.
 * El handle puede venir con o sin "@".
 */
export async function getPublicProfile(
  handle: string,
  currentUserId: string
): Promise<PublicProfile | null> {
  const cleanHandle = handle.startsWith("@") ? handle : `@${handle}`;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, name, handle, avatar_url, banner_url, bio")
    .eq("handle", cleanHandle)
    .maybeSingle();

  if (error || !profile) {
    console.error("[social.getPublicProfile]", error);
    return null;
  }

  const targetId = profile.id;

  const [followersRes, followingRes, isFollowingRes, friendRes, pendingReqRes] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", targetId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", targetId),
    supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", currentUserId)
      .eq("following_id", targetId)
      .maybeSingle(),
    supabase
      .from("friend_requests")
      .select("id")
      .eq("status", "accepted")
      .or(
        `and(from_user_id.eq.${currentUserId},to_user_id.eq.${targetId}),and(from_user_id.eq.${targetId},to_user_id.eq.${currentUserId})`
      )
      .maybeSingle(),
    supabase
      .from("friend_requests")
      .select("id")
      .eq("status", "pending")
      .or(
        `and(from_user_id.eq.${currentUserId},to_user_id.eq.${targetId}),and(from_user_id.eq.${targetId},to_user_id.eq.${currentUserId})`
      )
      .maybeSingle(),
  ]);

  return {
    id: profile.id,
    name: profile.name,
    handle: profile.handle,
    avatar_url: profile.avatar_url,
    banner_url: profile.banner_url,
    bio: profile.bio,
    followers_count: followersRes.count || 0,
    following_count: followingRes.count || 0,
    is_following: !!isFollowingRes.data,
    is_friend: !!friendRes.data,
    friend_request_pending: !!pendingReqRes.data,
  };
}

// ══════════════════════════════════════════════════════════════════
// FOLLOWS
// ══════════════════════════════════════════════════════════════════

export async function followUser(currentUserId: string, targetId: string) {
  const { error } = await supabase.from("follows").insert({
    follower_id: currentUserId,
    following_id: targetId,
  });
  if (error) console.error("[social.followUser]", error);
  return !error;
}

export async function unfollowUser(currentUserId: string, targetId: string) {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", currentUserId)
    .eq("following_id", targetId);
  if (error) console.error("[social.unfollowUser]", error);
  return !error;
}

// ══════════════════════════════════════════════════════════════════
// FRIEND REQUESTS
// ══════════════════════════════════════════════════════════════════

export async function sendFriendRequest(fromUserId: string, toUserId: string) {
  const { error } = await supabase.from("friend_requests").insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    status: "pending",
  });
  if (error) console.error("[social.sendFriendRequest]", error);
  return !error;
}

export async function acceptFriendRequest(requestId: string) {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "accepted" })
    .eq("id", requestId);
  if (error) console.error("[social.acceptFriendRequest]", error);
  return !error;
}

export async function rejectFriendRequest(requestId: string) {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "rejected" })
    .eq("id", requestId);
  if (error) console.error("[social.rejectFriendRequest]", error);
  return !error;
}

export async function getPendingFriendRequests(currentUserId: string): Promise<FriendRequest[]> {
  const { data: requests, error } = await supabase
    .from("friend_requests")
    .select("id, from_user_id, to_user_id, status, created_at")
    .eq("to_user_id", currentUserId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error || !requests || requests.length === 0) {
    if (error) console.error("[social.getPendingFriendRequests]", error);
    return [];
  }

  const fromIds = requests.map((r) => r.from_user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name, handle, avatar_url")
    .in("id", fromIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  return requests.map((r) => {
    const p = profileMap.get(r.from_user_id);
    return {
      id: r.id,
      from_user_id: r.from_user_id,
      to_user_id: r.to_user_id,
      status: r.status,
      created_at: r.created_at,
      profile: p ? { name: p.name, handle: p.handle, avatar_url: p.avatar_url } : undefined,
    };
  });
}

// ══════════════════════════════════════════════════════════════════
// CONVERSACIONES
// ══════════════════════════════════════════════════════════════════

export async function getOrCreateConversation(user1: string, user2: string): Promise<string | null> {
  const [a, b] = user1 < user2 ? [user1, user2] : [user2, user1];

  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("user_a_id", a)
    .eq("user_b_id", b)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("conversations")
    .insert({ user_a_id: a, user_b_id: b })
    .select("id")
    .single();

  if (error) {
    console.error("[social.getOrCreateConversation]", error);
    return null;
  }

  return created.id;
}

export async function getConversations(currentUserId: string): Promise<ConversationSummary[]> {
  const { data: convs, error } = await supabase
    .from("conversations")
    .select("id, user_a_id, user_b_id, last_message_at")
    .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`)
    .order("last_message_at", { ascending: false });

  if (error || !convs) {
    console.error("[social.getConversations]", error);
    return [];
  }

  const summaries: ConversationSummary[] = await Promise.all(
    convs.map(async (c) => {
      const otherId = c.user_a_id === currentUserId ? c.user_b_id : c.user_a_id;

      const [profileRes, lastMsgRes, unreadRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("name, handle, avatar_url")
          .eq("id", otherId)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("content")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .neq("sender_id", currentUserId)
          .is("read_at", null),
      ]);

      return {
        id: c.id,
        other_user_id: otherId,
        other_user_name: profileRes.data?.name || null,
        other_user_handle: profileRes.data?.handle || null,
        other_user_avatar: profileRes.data?.avatar_url || null,
        last_message: lastMsgRes.data?.content || null,
        last_message_at: c.last_message_at,
        unread_count: unreadRes.count || 0,
      };
    })
  );

  return summaries;
}

export async function getMessages(conversationId: string, limit = 100): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, sender_id, content, read_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[social.getMessages]", error);
    return [];
  }

  return (data || []) as ChatMessage[];
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: senderId,
    content: content.trim(),
  });
  if (error) console.error("[social.sendMessage]", error);
  return !error;
}

export async function markMessagesAsRead(conversationId: string, currentUserId: string) {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .neq("sender_id", currentUserId)
    .is("read_at", null);

  if (error) console.error("[social.markMessagesAsRead]", error);
  return !error;
}

export async function getUnreadCount(currentUserId: string): Promise<number> {
  const { data: convs } = await supabase
    .from("conversations")
    .select("id")
    .or(`user_a_id.eq.${currentUserId},user_b_id.eq.${currentUserId}`);

  if (!convs || convs.length === 0) return 0;

  const ids = convs.map((c) => c.id);

  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .in("conversation_id", ids)
    .neq("sender_id", currentUserId)
    .is("read_at", null);

  return count || 0;
}
