"use client";

import { createBrowserClient } from "@supabase/ssr";
import { createMockSupabase } from "./supabase-mock";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function initSupabaseClient() {
  if (
    supabaseUrl &&
    supabaseAnonKey &&
    (supabaseUrl.startsWith("http://") || supabaseUrl.startsWith("https://"))
  ) {
    try {
      return createBrowserClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
      console.warn("[TENKO] Error inicializando Supabase Client, usando mock en memoria:", err);
    }
  }
  return createMockSupabase();
}

export const supabase: any = initSupabaseClient();

