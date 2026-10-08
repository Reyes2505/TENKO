import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  if (!q.trim()) {
    return NextResponse.json({ results: [] });
  }

  const resultsMap = new Map<string, any>();

  // 1. Consulta local en Supabase
  try {
    if (supabaseUrl && supabaseAnonKey) {
      const terms = q.trim().split(/\s+/).filter(Boolean);
      const filterConditions = terms
        .map((term) => `titulo.ilike.%${term}%,sinopsis.ilike.%${term}%`)
        .join(",");

      const { data: dbData } = await supabase
        .from("animes")
        .select("id, titulo, portada_url, estado")
        .or(filterConditions)
        .limit(8);

      if (dbData && dbData.length > 0) {
        dbData.forEach((item) => {
          resultsMap.set(item.titulo.toLowerCase().trim(), {
            id: item.id,
            title: item.titulo,
            coverImage: item.portada_url,
            format: item.estado || "ANIME",
            isLocal: true,
          });
        });
      }
    }
  } catch (err) {
    console.error("Error buscando en Supabase (API):", err);
  }

  // 2. Consulta de respaldo a AniList desde el servidor
  if (resultsMap.size < 6) {
    try {
      const res = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          query: `
            query ($search: String) {
              Page(perPage: 6) {
                media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
                  id
                  title {
                    romaji
                    english
                    native
                  }
                  coverImage {
                    medium
                    extraLarge
                  }
                  seasonYear
                  format
                }
              }
            }
          `,
          variables: { search: q.trim() },
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const mediaList = json?.data?.Page?.media || [];
        mediaList.forEach((item: any) => {
          const primaryTitle =
            item.title.romaji || item.title.english || item.title.native;
          const key = primaryTitle.toLowerCase().trim();
          if (!resultsMap.has(key)) {
            resultsMap.set(key, {
              id: item.id,
              title: primaryTitle,
              coverImage: item.coverImage?.medium || item.coverImage?.extraLarge,
              year: item.seasonYear,
              format: item.format,
              isLocal: false,
            });
          }
        });
      }
    } catch (err) {
      console.error("Error buscando en AniList (API):", err);
    }
  }

  return NextResponse.json({
    results: Array.from(resultsMap.values()).slice(0, 6),
  });
}
