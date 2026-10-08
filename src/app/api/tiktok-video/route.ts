import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tiktokUrl = searchParams.get("url");

  if (!tiktokUrl) {
    return NextResponse.json(
      { error: "Se requiere la URL de TikTok" },
      { status: 400 }
    );
  }

  try {
    // Agregamos &hd=1 para forzar la máxima resolución disponible (1080p original)
    const response = await fetch(
      `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}&hd=1`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      throw new Error("Error al consultar la API de extracción");
    }

    const data = await response.json();
    
    // Priorizamos 'hdplay' (Full HD original) antes que 'play' (SD)
    const directMp4 = data?.data?.hdplay || data?.data?.play || data?.data?.wmplay;

    if (directMp4) {
      // Si la URL devuelta es relativa, le anteponemos el dominio de TikWM
      const finalUrl = directMp4.startsWith("http")
        ? directMp4
        : `https://www.tikwm.com${directMp4}`;

      return NextResponse.json({ success: true, mp4Url: finalUrl });
    }

    return NextResponse.json(
      { error: "No se encontró el video HD" },
      { status: 404 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno procesando TikTok", details: error.message },
      { status: 500 }
    );
  }
}
