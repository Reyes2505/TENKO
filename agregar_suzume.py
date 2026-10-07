#!/usr/bin/env python3
"""
Agrega Suzume (película) a la base de datos de TENKO.
"""

from supabase import create_client
import uuid

SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def agregar_suzume():
    """Agrega Suzume no Tojimari (película)."""
    
    print('🏯 TENKO - Agregando Suzume')
    print('=' * 60)
    
    # 1. Crear el anime (película)
    anime_id = str(uuid.uuid4())
    anime_data = {
        'id': anime_id,
        'titulo': 'Suzume no Tojimari',
        'sinopsis': 'Suzume, una joven de 17 años que vive en un pueblo tranquilo de Kyushu, conoce a un joven que busca "puertas". Ella lo sigue y encuentra una puerta vieja en las ruinas de las montañas. Como si fuera arrastrada por algo, Suzume extiende su mano hacia la puerta. Pronto, puertas comienzan a abrirse por todo Japón, liberando desastres. Suzume debe cerrarlas para evitar más calamidades.',
        'portada_url': 'https://cdn.myanimelist.net/images/anime/1598/128450.jpg',
        'banner_url': 'https://cdn.myanimelist.net/images/anime/1598/128450l.jpg',
        'estado_emision': 'terminado',
        'fecha_estreno': '2022-11-11',
        'generos': ['Aventura', 'Fantasía', 'Drama', 'Romance'],
        'created_at': 'now()'
    }
    
    print('📝 Creando anime (película)...')
    result = supabase.table('animes').insert([anime_data]).execute()
    
    if result.data is None:
        print('❌ Error al crear anime')
        return
    
    print(f'✅ Anime creado con ID: {anime_id}')
    
    # 2. Crear temporada única
    temporada_id = str(uuid.uuid4())
    temporada_data = {
        'id': temporada_id,
        'anime_id': anime_id,
        'nombre': 'Película',
        'orden': 1,
        'created_at': 'now()'
    }
    
    print('📝 Creando temporada (Película)...')
    result = supabase.table('temporadas').insert([temporada_data]).execute()
    
    if result.data is None:
        print('❌ Error al crear temporada')
        return
    
    print(f'✅ Temporada creada con ID: {temporada_id}')
    
    # 3. Crear el episodio único (la película completa)
    print('📝 Creando episodio (película completa)...')
    
    ep_id = str(uuid.uuid4())
    ep_data = {
        'id': ep_id,
        'temporada_id': temporada_id,
        'numero': 1,
        'titulo': 'Suzume no Tojimari (Película Completa)',
        'descripcion': 'Película completa de Suzume no Tojimari',
        'url_stream': 'https://jkanime.net/suzume-no-tojimari/1/',
        'duracion_total': 7320,  # 122 minutos en segundos
        'segundo_actual': 0,
        'visto': False,
        'fecha_emision': '2022-11-11',
        'created_at': 'now()'
    }
    
    result = supabase.table('episodios').insert([ep_data]).execute()
    
    if result.data is None:
        print('❌ Error al crear episodio')
        return
    
    print('✅ Episodio creado')
    
    print('')
    print('=' * 60)
    print('✅ ¡Suzume agregada exitosamente!')
    print(f'📋 Anime ID: {anime_id}')
    print(f'📋 Temporada ID: {temporada_id}')
    print(f'📋 Episodios: 1 (película completa)')
    print('')
    print('🎬 Ya debería aparecer en la página principal')

if __name__ == '__main__':
    agregar_suzume()
