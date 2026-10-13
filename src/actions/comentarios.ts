// src/actions/comentarios.ts
import { supabase } from '@/lib/supabase';
import { Comentario } from '@/types/database';

export interface ComentarioInput {
  animeId: string;
  episodioId?: string | null;
  contenido: string;
  calificacion?: number;
  es_spoiler?: boolean;
}

/**
 * Obtiene los comentarios de un anime o episodio
 */
export async function getComentariosAction(
  animeId: string,
  episodioId?: string | null
): Promise<{ success: boolean; data: Comentario[]; error?: string }> {
  try {
    let query = supabase.from('comentarios').select('*').eq('anime_id', animeId);

    if (episodioId) {
      query = query.eq('episodio_id', episodioId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { success: false, data: [], error: error.message };
    }

    return {
      success: true,
      data: (data || []) as Comentario[],
    };
  } catch (err: any) {
    return {
      success: false,
      data: [],
      error: err?.message || 'Error al obtener comentarios',
    };
  }
}

/**
 * Agrega un nuevo comentario o reseña
 */
export async function agregarComentarioAction(
  input: ComentarioInput
): Promise<{ success: boolean; data?: Comentario; error?: string }> {
  try {
    if (!input.contenido || input.contenido.trim().length === 0) {
      return { success: false, error: 'El contenido no puede estar vacío' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'usr_tenko_tester_001';
    const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Aaron Reyes';
    const userAvatar =
      user?.user_metadata?.avatar_url || 'https://i.postimg.cc/0j0x4x7G/zerotwo.jpg';

    const nuevoComentario: Comentario = {
      id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      anime_id: input.animeId,
      episodio_id: input.episodioId || null,
      user_id: userId,
      user_name: userName,
      user_avatar: userAvatar,
      contenido: input.contenido.trim(),
      calificacion: input.calificacion || 5,
      likes: 0,
      dislikes: 0,
      es_spoiler: Boolean(input.es_spoiler),
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('comentarios').insert(nuevoComentario);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: nuevoComentario,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error al guardar comentario',
    };
  }
}

/**
 * Reacciona a un comentario con like o dislike
 */
export async function reaccionarComentarioAction(
  comentarioId: string,
  tipo: 'like' | 'dislike'
): Promise<{ success: boolean; likes: number; dislikes: number; error?: string }> {
  try {
    const { data: comm } = await supabase
      .from('comentarios')
      .select('*')
      .eq('id', comentarioId)
      .maybeSingle();

    if (!comm) {
      return { success: false, likes: 0, dislikes: 0, error: 'Comentario no encontrado' };
    }

    const nuevosLikes = tipo === 'like' ? (comm.likes || 0) + 1 : (comm.likes || 0);
    const nuevosDislikes = tipo === 'dislike' ? (comm.dislikes || 0) + 1 : (comm.dislikes || 0);

    await supabase
      .from('comentarios')
      .update({ likes: nuevosLikes, dislikes: nuevosDislikes })
      .eq('id', comentarioId);

    return {
      success: true,
      likes: nuevosLikes,
      dislikes: nuevosDislikes,
    };
  } catch (err: any) {
    return {
      success: false,
      likes: 0,
      dislikes: 0,
      error: err?.message || 'Error al reaccionar',
    };
  }
}
