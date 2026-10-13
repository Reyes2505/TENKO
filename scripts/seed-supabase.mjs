// scripts/seed-supabase.mjs
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Error: Variables de entorno requeridas no encontradas.');
  console.error('Por favor define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o NEXT_PUBLIC_SUPABASE_ANON_KEY).');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function cleanText(text) {
  if (!text) return '';
  return text.replace(/<[^>]+>/g, '').trim();
}

const SAMPLE_STREAMS = [
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackSeeTheWorld.mp4',
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
];

async function seed() {
  console.log('🚀 Iniciando población de base de datos en Supabase:', SUPABASE_URL);

  const jsonPath = path.resolve(process.cwd(), 'animes_emision_anilist.json');
  if (!fs.existsSync(jsonPath)) {
    console.error('❌ Archivo animes_emision_anilist.json no encontrado en la raíz.');
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const catalog = JSON.parse(raw);
  console.log(`📦 Se encontraron ${catalog.length} animes en el catálogo.`);

  // 1. Poblar Animes
  console.log('⏳ Insertando animes en la tabla "animes"...');
  const animeRows = catalog.map((item, idx) => {
    const id = String(item.anilist_id || item.id || idx + 1);
    const titulo = item.titulo || item.titulo_ingles || item.titulo_nativo || `Anime #${id}`;
    const portada = item.portada_url || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=600';
    const banner = item.banner_url || portada;

    let estado = 'emitido';
    if (item.estado === 'FINISHED') estado = 'terminado';
    else if (item.estado === 'NOT_YET_RELEASED') estado = 'en_espera';
    else if (item.estado === 'CANCELLED') estado = 'suspendido';

    return {
      id,
      titulo,
      sinopsis: cleanText(item.sinopsis) || 'Sin descripción disponible.',
      portada_url: portada,
      banner_url: banner,
      generos: Array.isArray(item.generos) && item.generos.length > 0 ? item.generos : ['Anime'],
      estado_emision: estado,
      fecha_estreno: item.fecha_estreno || (item.anio ? `${item.anio}-01-01` : '2024-01-01'),
      total_episodios: typeof item.total_episodios === 'number' ? item.total_episodios : 12,
      duracion: typeof item.duracion === 'number' ? item.duracion : 24,
      puntuacion: typeof item.puntuacion === 'number' ? item.puntuacion : 85,
    };
  });

  const BATCH_SIZE = 50;
  for (let i = 0; i < animeRows.length; i += BATCH_SIZE) {
    const chunk = animeRows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('animes').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.warn(`⚠️ Error insertando chunk de animes (${i}-${i + chunk.length}):`, error.message);
    } else {
      console.log(`✅ Animes insertados: ${Math.min(i + BATCH_SIZE, animeRows.length)} / ${animeRows.length}`);
    }
  }

  // 2. Poblar Temporadas & Episodios para los primeros 30 animes destacados
  console.log('⏳ Creando temporadas y episodios...');
  const temporadasRows = [];
  const episodiosRows = [];

  catalog.slice(0, 30).forEach((item, idx) => {
    const animeId = String(item.anilist_id || item.id || idx + 1);
    const tempId = `temp-${animeId}`;
    const titulo = item.titulo || item.titulo_ingles || `Anime #${animeId}`;
    const banner = item.banner_url || item.portada_url || '';

    temporadasRows.push({
      id: tempId,
      anime_id: animeId,
      nombre: 'Temporada 1',
      numero: 1,
      descripcion: `Temporada 1 de ${titulo}`,
    });

    const epCount = typeof item.total_episodios === 'number' && item.total_episodios > 0
      ? Math.min(item.total_episodios, 24)
      : 12;

    for (let ep = 1; ep <= epCount; ep++) {
      const streamUrl = SAMPLE_STREAMS[(idx * 3 + ep) % SAMPLE_STREAMS.length];
      episodiosRows.push({
        id: `ep-${animeId}-${ep}`,
        anime_id: animeId,
        temporada_id: tempId,
        numero: ep,
        titulo: `${titulo} - Episodio ${ep}`,
        titulo_episodio: `Capítulo ${ep}`,
        url_stream: streamUrl,
        tipo_stream: 'online',
        duracion: '24m',
        thumbnail_url: banner,
        fecha_emision: item.fecha_estreno || '2024-01-01',
      });
    }
  });

  if (temporadasRows.length > 0) {
    const { error: tempErr } = await supabase.from('temporadas').upsert(temporadasRows, { onConflict: 'id' });
    if (tempErr) console.warn('⚠️ Error en temporadas:', tempErr.message);
    else console.log(`✅ Temporadas insertadas: ${temporadasRows.length}`);
  }

  for (let i = 0; i < episodiosRows.length; i += BATCH_SIZE) {
    const chunk = episodiosRows.slice(i, i + BATCH_SIZE);
    const { error: epErr } = await supabase.from('episodios').upsert(chunk, { onConflict: 'id' });
    if (epErr) console.warn(`⚠️ Error insertando episodios (${i}):`, epErr.message);
  }
  console.log(`✅ Episodios procesados: ${episodiosRows.length}`);

  // 3. Poblar Perfil por defecto
  const adminProfile = {
    id: 'usr_tenko_tester_001',
    user_id: 'usr_tenko_tester_001',
    name: 'Aaron Reyes (Admin)',
    handle: '@admin',
    bio: 'Administrador de TENKO AI',
    avatar_url: 'https://i.postimg.cc/0j0x4x7G/zerotwo.jpg',
    banner_url: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/100166-P6s7kE5k.jpg',
    audio_source: 'none',
    is_admin: true,
  };

  await supabase.from('profiles').upsert([adminProfile], { onConflict: 'id' }).catch(() => {});
  await supabase.from('perfiles').upsert([{ id: 'perfil_001', user_id: 'usr_tenko_tester_001', is_admin: true, username: 'admin' }], { onConflict: 'id' }).catch(() => {});

  // 4. Poblar Comentarios iniciales
  const comentariosSeed = [
    {
      id: 'c-1',
      anime_id: '178789',
      episodio_id: 'ep-178789-1',
      user_id: 'usr_tenko_tester_001',
      user_name: 'Aaron Reyes',
      user_avatar: 'https://i.postimg.cc/0j0x4x7G/zerotwo.jpg',
      contenido: '¡Qué inicio de temporada tan increíble! La animación de Studio Bind sigue estando a otro nivel.',
      calificacion: 5,
      likes: 18,
      dislikes: 0,
      es_spoiler: false,
    },
    {
      id: 'c-2',
      anime_id: '21',
      episodio_id: 'ep-21-1',
      user_id: 'usr_anime_fan_42',
      user_name: 'LuffyG5',
      user_avatar: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=200',
      contenido: 'El arco de Egghead está superando todas las expectativas. Gran calidad de animación.',
      calificacion: 5,
      likes: 24,
      dislikes: 1,
      es_spoiler: false,
    },
  ];

  await supabase.from('comentarios').upsert(comentariosSeed, { onConflict: 'id' }).catch(() => {});

  // 5. Poblar Peticiones iniciales
  const peticionesSeed = [
    {
      id: 'pet-1',
      titulo: 'Bleach: Thousand-Year Blood War - The Conflict',
      url: 'https://jkanime.net/bleach-sennen-kessen-hen-soukokutan/',
      user_id: 'usr_tenko_tester_001',
      user_name: 'Aaron Reyes',
      estado: 'en_revision',
      votos: 34,
    },
    {
      id: 'pet-2',
      titulo: 'Dandadan',
      url: 'https://jkanime.net/dandadan/',
      user_id: 'usr_momo_ayase',
      user_name: 'MomoAyase',
      estado: 'pendiente',
      votos: 52,
    },
  ];

  await supabase.from('peticiones').upsert(peticionesSeed, { onConflict: 'id' }).catch(() => {});

  console.log('🎉 Población de base de datos finalizada exitosamente.');
}

seed().catch((err) => {
  console.error('❌ Error fatal en el proceso de seed:', err);
  process.exit(1);
});
