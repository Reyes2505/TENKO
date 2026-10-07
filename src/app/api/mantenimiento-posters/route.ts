import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const revalidate = 3600; // cache 1 hora

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return NextResponse.json({ posters: [] }, { status: 500 });
  }

  const sb = createClient(url, serviceKey);

  // Traer 60 animes con portada, orden aleatorio
  const { data, error } = await sb
    .from('animes')
    .select('portada_url, banner_url')
    .not('portada_url', 'is', null)
    .limit(200);

  if (error || !data) {
    return NextResponse.json({ posters: [] }, { status: 500 });
  }

  // Mezclar aleatoriamente y tomar 30
  const shuffled = data
    .map(a => a.portada_url || a.banner_url)
    .filter(Boolean)
    .sort(() => Math.random() - 0.5)
    .slice(0, 30);

  return NextResponse.json(
    { posters: shuffled },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
