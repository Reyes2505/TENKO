import { createClient } from '@supabase/supabase-js';
import { searchAnime } from 'animeav1-api';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Normalización de títulos ─────────────────────────────────────
function normalizeTitle(str) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Tokens de un título ──────────────────────────────────────────
function tokens(str) {
  return new Set(normalizeTitle(str).split(' ').filter(Boolean));
}

// ─── Similitud por intersección de tokens ─────────────────────────
function similarity(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return common / Math.max(ta.size, tb.size);
}

// ─── Tokens en común ──────────────────────────────────────────────
function commonTokenCount(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  let common = 0;
  for (const t of ta) if (tb.has(t)) common++;
  return common;
}

// ─── Umbrales de validación ───────────────────────────────────────
const MIN_SIMILARITY = 0.7;
const MIN_COMMON_TOKENS = 2;

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
        console.warn(`🔴 Huérfano: "${anime.titulo}"`);
        continue;
      }

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

      if (!mejor) {
        rechazados++;
        continue;
      }

      const tituloMejor = mejor.title || mejor.titulo || mejor.name || '';
      const comunes = commonTokenCount(anime.titulo, tituloMejor);

      if (mejorScore < MIN_SIMILARITY || comunes < MIN_COMMON_TOKENS) {
        rechazados++;
        console.warn(`⚠️ Rechazado: "${anime.titulo}" (score: ${mejorScore.toFixed(2)}, tokens comunes: ${comunes})`);
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
      console.log(`✅ Asignado: "${anime.titulo}" → ${slug} (score: ${mejorScore.toFixed(2)}, comunes: ${comunes})`);

      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error(`❌ Error buscando "${anime.titulo}":`, err.message);
    }
  }

  console.log(`\n📊 Resultados:
  - Slugs recuperados: ${encontrados}
  - Rechazados por baja similitud: ${rechazados}
  - Animes huérfanos: ${huerfanos}`);
}

matchCascaronesB();
