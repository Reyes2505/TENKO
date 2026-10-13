// src/actions/peticiones.ts
import { supabase } from '@/lib/supabase';
import { Peticion } from '@/types/database';

export interface PeticionInput {
  titulo: string;
  url?: string;
  nota?: string;
}

/**
 * Obtiene todas las peticiones comunitarias ordenadas por votos
 */
export async function obtenerPeticionesAction(): Promise<{
  success: boolean;
  data: Peticion[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('peticiones')
      .select('*')
      .order('votos', { ascending: false });

    if (error) {
      return { success: false, data: [], error: error.message };
    }

    return {
      success: true,
      data: (data || []) as Peticion[],
    };
  } catch (err: any) {
    return {
      success: false,
      data: [],
      error: err?.message || 'Error al obtener peticiones',
    };
  }
}

/**
 * Registra una nueva petición de anime
 */
export async function crearPeticionAction(
  input: PeticionInput
): Promise<{ success: boolean; data?: Peticion; error?: string }> {
  try {
    if (!input.titulo || input.titulo.trim().length === 0) {
      return { success: false, error: 'El título del anime es requerido' };
    }

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || 'usr_tenko_tester_001';
    const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Aaron Reyes';

    const nuevaPeticion: Peticion = {
      id: `pet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      titulo: input.titulo.trim(),
      url: input.url?.trim() || undefined,
      user_id: userId,
      user_name: userName,
      estado: 'pendiente',
      votos: 1,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('peticiones').insert(nuevaPeticion);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: nuevaPeticion,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Error al registrar petición',
    };
  }
}

/**
 * Agrega un voto a una petición comunitaria
 */
export async function votarPeticionAction(
  peticionId: string
): Promise<{ success: boolean; votos: number; error?: string }> {
  try {
    const { data: pet } = await supabase
      .from('peticiones')
      .select('*')
      .eq('id', peticionId)
      .maybeSingle();

    if (!pet) {
      return { success: false, votos: 0, error: 'Petición no encontrada' };
    }

    const nuevosVotos = (pet.votos || 0) + 1;
    await supabase.from('peticiones').update({ votos: nuevosVotos }).eq('id', peticionId);

    return {
      success: true,
      votos: nuevosVotos,
    };
  } catch (err: any) {
    return {
      success: false,
      votos: 0,
      error: err?.message || 'Error al votar',
    };
  }
}
