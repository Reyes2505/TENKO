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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    '[supabase-admin] Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local'
  );
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
