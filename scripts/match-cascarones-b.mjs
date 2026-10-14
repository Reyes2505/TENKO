      // Regla extra: exigir al menos 2 tokens en común
      const tokensA = new Set(normalizeTitle(anime.titulo).split(" ").filter(Boolean));
      const tituloMejor = mejor ? (mejor.title || mejor.titulo || mejor.name || "") : "";
      const tokensB = new Set(normalizeTitle(tituloMejor).split(" ").filter(Boolean));
      let commonTokens = 0;
      for (const t of tokensA) if (tokensB.has(t)) commonTokens++;

      if (!mejor || mejorScore < MIN_SIMILARITY || commonTokens < 2) {import { createClient } from '@supabase/supabase-js';
import { searchAnime } from 'animeav1-api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Normalización de títulos para comparar ──────────────────────
function normalizeTitle(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // quitar acentos
    .replace(/[^a-z0-9\s]/g, ' ')                        // solo alfanumérico
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Similitud simple basada en tokens ───────────────────────────
function similarity(a, b) {
  const ta = new Set(normalizeTitle(a).split(' ').filter(Boolean));
  const tb = new Set(normalizeTitle(b).split(' ').filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const token of ta) if (tb.has(token)) common++;
  return common / Math.max(ta.size, tb.size);
}

// ─── Umbral mínimo aceptable (0.5 = 50% de tokens coincidentes) ──
const MIN_SIMILARITY = 0.7;

async function matchCascaronesB() {
  const { data: cascaronesB, error } = await supabase
    .from('animes')
    .select('id, titulo')
    .is('animeav1_slug', null);

  if (error) {
    console.error('❌ Error obteniendo cascarones B:', error.message);
    return;
  }

  console.log(`🔍 Analizando ${cascaronesB.length} animes sin slug...`);
  let encontrados = 0;
  let huerfanos = 0;
  let rechazados = 0;

  for (const anime of cascaronesB) {
    try {
      const resultados = await searchAnime(anime.titulo);

      if (!resultados || resultados.length === 0) {
        huerfanos++;
        console.warn(`🔴 Cascarón Tipo C (Huérfano): "${anime.titulo}"`);
        continue;
      }

      // Buscar el resultado con mejor similitud
      let mejor = null;
      let mejorScore = 0;

      for (const r of resultados) {
        const tituloResultado = r.title || r.titulo || r.name || '';
        const score = similarity(anime.titulo, tituloResultado);
        if (score > mejorScore) {
          mejorScore = score;
          mejor = r;
        }
      }

      if (!mejor || mejorScore < MIN_SIMILARITY) {
        rechazados++;
        console.warn(`⚠️ Sin coincidencia válida: "${anime.titulo}" (mejor score: ${mejorScore.toFixed(2)})`);
        continue;
      }

      const slug = mejor.slug || mejor.url?.split('/').pop();

      if (!slug) {
        rechazados++;
        continue;
      }

      await supabase
        .from('animes')
        .update({ animeav1_slug: slug })
        .eq('id', anime.id);

      encontrados++;
      console.log(`✅ Slug asignado: "${anime.titulo}" → ${slug} (score: ${mejorScore.toFixed(2)})`);

      // Pequeña pausa para no saturar el sitio
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`❌ Error buscando "${anime.titulo}":`, err.message);
    }
  }

  console.log(`\n📊 Resultados:
  - Slugs recuperados (Tipo B → Tipo A): ${encontrados}
  - Rechazados por baja similitud: ${rechazados}
  - Animes huérfanos confirmados (Tipo C): ${huerfanos}`);
}

matchCascaronesB();
