// src/actions/perfil.ts
import { supabase } from '@/lib/supabase';

export interface PerfilUpdateInput {
  name?: string;
  handle?: string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  audioSource?: 'none' | 'banner' | 'avatar';
  edits?: string[];
  tiktok_username?: string | null;
}

/**
 * Actualiza el perfil del usuario autenticado
 */
export async function actualizarPerfilAction(input: PerfilUpdateInput) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'usr_tenko_tester_001';

    const payload: Record<string, any> = {
      id: userId,
      updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) payload.name = input.name;
    if (input.handle !== undefined) payload.handle = input.handle;
    if (input.bio !== undefined) payload.bio = input.bio;
    if (input.avatarUrl !== undefined) payload.avatar_url = input.avatarUrl;
    if (input.bannerUrl !== undefined) payload.banner_url = input.bannerUrl;
    if (input.audioSource !== undefined) payload.audio_source = input.audioSource;
    if (input.edits !== undefined) payload.edits = input.edits;
    if (input.tiktok_username !== undefined) payload.tiktok_username = input.tiktok_username;

    const { error } = await supabase.from('profiles').upsert(payload);

    if (error) {
      return { success: false, error: error.message };
    }

    // Persistir localmente en fallback
    if (typeof window !== 'undefined') {
      if (input.avatarUrl) localStorage.setItem('user_avatar_url', input.avatarUrl);
      if (input.bannerUrl) localStorage.setItem('user_banner_url', input.bannerUrl);
      if (input.name) localStorage.setItem('user_name', input.name);
      if (input.handle) localStorage.setItem('user_handle', input.handle);
    }

    return {
      success: true,
      data: payload,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error al actualizar perfil',
    };
  }
}

/**
 * Obtiene el perfil de un usuario por su handle o ID
 */
export async function obtenerPerfilAction(identifier: string) {
  try {
    const clean = identifier.startsWith('@') ? identifier : `@${identifier}`;
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or(`handle.eq.${clean},id.eq.${identifier}`)
      .maybeSingle();

    if (!data) {
      return { success: false, data: null, error: 'Perfil no encontrado' };
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err?.message || 'Error al obtener perfil',
    };
  }
}
