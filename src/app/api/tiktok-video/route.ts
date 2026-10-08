import { NextRequest, NextResponse } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchTikwm(tiktokUrl: string, hd: boolean): Promise<string | null> {
  try {
    const url = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}${hd ? "&hd=1" : ""}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data?.code !== 0) return null;

    const candidates = [
      data?.data?.hdplay,
      data?.data?.play,
      data?.data?.wmplay,
    ].filter(Boolean);

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
    return NextResponse.json(
      { error: "Se requiere la URL de TikTok" },
      { status: 400 }
    );
  }

  // Intento 1: con HD
  let mp4Url = await fetchTikwm(tiktokUrl, true);

  // Intento 2: sin HD (por si el video no tiene HD)
  if (!mp4Url) {
    mp4Url = await fetchTikwm(tiktokUrl, false);
  }

  if (mp4Url) {
    return NextResponse.json(
      { success: true, mp4Url },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  }

  return NextResponse.json(
    { error: "No se pudo resolver el video de TikTok" },
    { status: 404 }
  );
}
