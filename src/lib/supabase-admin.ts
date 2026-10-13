/**
 * Cliente Supabase con SERVICE ROLE — bypassea RLS.
 *
 * ⚠️ NUNCA importar desde un Client Component ("use client").
 * Solo usar en:
 *   - API Routes (runtime = 'nodejs')
 *   - Server Actions
 *   - Scripts backend
 */

import { createClient } from '@supabase/supabase-js';
import { createMockSupabase } from './supabase-mock';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function initSupabaseAdmin() {
  if (
    url &&
    serviceKey &&
    (url.startsWith('http://') || url.startsWith('https://'))
  ) {
    try {
      return createClient(url, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } catch (err) {
      console.warn('[TENKO] Error inicializando Supabase Admin, usando mock:', err);
    }
  }
  return createMockSupabase();
}

export const supabaseAdmin: any = initSupabaseAdmin();

