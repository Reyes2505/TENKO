import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getAdmin() {
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function fetchTikwm(tiktokUrl: string, hd: boolean): Promise<string | null> {
  try {
    const url = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}${hd ? "&hd=1" : ""}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.code !== 0) return null;

    const candidates = [data?.data?.hdplay, data?.data?.play, data?.data?.wmplay].filter(Boolean);
    for (const c of candidates) {
      if (typeof c === "string" && c.length > 0) {
        return c.startsWith("http") ? c : `https://www.tikwm.com${c}`;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tiktokUrl = searchParams.get("url");

  if (!tiktokUrl) {
    return NextResponse.json({ error: "Se requiere la URL de TikTok" }, { status: 400 });
  }

  const admin = getAdmin();

  // 1. Intentar leer de caché
  try {
    const { data: cached } = await admin
      .from("tiktok_cache")
      .select("mp4_url, expires_at")
      .eq("tiktok_url", tiktokUrl)
      .maybeSingle();

    if (cached && new Date(cached.expires_at) > new Date()) {
      return NextResponse.json(
        { success: true, mp4Url: cached.mp4_url, cached: true },
        {
          headers: {
            "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        }
      );
    }
  } catch (e) {
    console.warn("[tiktok-video] cache read failed:", e);
  }

  // 2. Resolver desde tikwm
  let mp4Url = await fetchTikwm(tiktokUrl, true);
  let hd = true;
  if (!mp4Url) {
    mp4Url = await fetchTikwm(tiktokUrl, false);
    hd = false;
  }

  if (!mp4Url) {
    return NextResponse.json(
      { error: "No se pudo resolver el video de TikTok" },
      { status: 404 }
    );
  }

  // 3. Guardar en caché (silenciosamente, no bloquear respuesta)
  try {
    await admin.from("tiktok_cache").upsert({
      tiktok_url: tiktokUrl,
      mp4_url: mp4Url,
      hd,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (e) {
    console.warn("[tiktok-video] cache write failed:", e);
  }

  return NextResponse.json(
    { success: true, mp4Url, cached: false },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
