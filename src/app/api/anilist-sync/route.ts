import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const ANILIST_API_URL = "https://graphql.anilist.co";

const ANILIST_QUERY = `
query SyncAnimeInfo($search: String, $id: Int) {
  Media(search: $search, id: $id, type: ANIME) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    coverImage {
      extraLarge
      large
      color
    }
    bannerImage
    description(asHtml: false)
    status
    episodes
    genres
    season
    seasonYear
    averageScore
  }
}
`;

export async function POST(req: NextRequest) {
  try {
    const { query, id, animeId } = await req.json();

    if (!query && !id) {
      return NextResponse.json(
        { error: "Se requiere el parámetro 'query' o 'id'" },
        { status: 400 }
      );
    }

    const response = await fetch(ANILIST_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: ANILIST_QUERY,
        variables: id ? { id: Number(id) } : { search: query },
      }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Error AniList: ${response.statusText}` },
        { status: response.status }
      );
    }

    const { data } = await response.json();
    const media = data?.Media;

    if (!media) {
      return NextResponse.json(
        { error: "Anime no encontrado en AniList" },
        { status: 404 }
      );
    }

    const portadaUrl = media.coverImage.extraLarge || media.coverImage.large;
    const bannerUrl = media.bannerImage || portadaUrl;

    const result = {
      anilist_id: media.id,
      portada_url: portadaUrl,
      banner_url: bannerUrl,
      color_dominante: media.coverImage.color,
      sinopsis: media.description ? media.description.replace(/<[^>]+>/g, "").trim() : "",
      estado: media.status,
      episodios_totales: media.episodes,
      puntuacion: media.averageScore,
    };

    // Si se envía el ID interno de Supabase, actualizamos la fila correspondiente
    if (animeId) {
      const { error: dbError } = await supabase
        .from("animes")
        .update(result)
        .eq("id", animeId);

      if (dbError) {
        return NextResponse.json(
          { error: "Error al actualizar en base de datos", details: dbError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error interno del servidor", details: error.message },
      { status: 500 }
    );
  }
}
