#!/usr/bin/env python3
"""
Agrega Darling in the FranXX a la base de datos de TENKO.
"""

from supabase import create_client
import uuid

SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def agregar_darling():
    """Agrega Darling in the FranXX con 24 episodios."""
    
    print('🏯 TENKO - Agregando Darling in the FranXX')
    print('=' * 60)
    
    # 1. Crear el anime
    anime_id = str(uuid.uuid4())
    anime_data = {
        'id': anime_id,
        'titulo': 'Darling in the FranXX',
        'sinopsis': 'En un futuro lejano, la humanidad vive en ciudades fortificadas llamadas Plantaciones. Los niños son entrenados para pilotar robots gigantes llamados FranXX para defender a la humanidad de los Klaxosaurios. Hiro, un antiguo prodigio, se encuentra con Zero Two, una misteriosa chica con cuernos que podría ser la clave para salvar el mundo.',
        'portada_url': 'https://cdn.myanimelist.net/images/anime/1614/90408.jpg',
        'banner_url': 'https://cdn.myanimelist.net/images/anime/1614/90408l.jpg',
        'estado_emision': 'terminado',
        'fecha_estreno': '2018-01-13',
        'generos': ['Mecha', 'Ciencia Ficción', 'Romance', 'Drama', 'Acción'],
        'created_at': 'now()'
    }
    
    print('📝 Creando anime...')
    result = supabase.table('animes').insert([anime_data]).execute()
    
    if result.data is None:
        print(f'❌ Error al crear anime')
        return
    
    print(f'✅ Anime creado con ID: {anime_id}')
    
    # 2. Crear temporada
    temporada_id = str(uuid.uuid4())
    temporada_data = {
        'id': temporada_id,
        'anime_id': anime_id,
        'nombre': 'Temporada 1',
        'orden': 1,
        'created_at': 'now()'
    }
    
    print('📝 Creando temporada...')
    result = supabase.table('temporadas').insert([temporada_data]).execute()
    
    if result.data is None:
        print(f'❌ Error al crear temporada')
        return
    
    print(f'✅ Temporada creada con ID: {temporada_id}')
    
    # 3. Crear 24 episodios
    print('📝 Creando 24 episodios...')
    
    episodios = []
    for num in range(1, 25):
        ep_id = str(uuid.uuid4())
        ep_data = {
            'id': ep_id,
            'temporada_id': temporada_id,
            'numero': num,
            'titulo': f'Episodio {num}',
            'descripcion': f'Episodio {num} de Darling in the FranXX',
            'url_stream': f'https://jkanime.net/darling-in-the-franxx/{num}/',
            'duracion_total': 1440,
            'segundo_actual': 0,
            'visto': False,
            'fecha_emision': f'2018-{(num // 4) + 1:02d}-{((num - 1) % 4) * 7 + 1:02d}',
            'created_at': 'now()'
        }
        episodios.append(ep_data)
    
    result = supabase.table('episodios').insert(episodios).execute()
    
    if result.data is None:
        print(f'❌ Error al crear episodios')
        return
    
    print(f'✅ {len(episodios)} episodios creados')
    
    print('')
    print('=' * 60)
    print('✅ ¡Darling in the FranXX agregado exitosamente!')
    print(f'📋 Anime ID: {anime_id}')
    print(f'📋 Temporada ID: {temporada_id}')
    print(f'📋 Episodios: 24')
    print('')
    print('🎬 Ya debería aparecer en la página principal')

if __name__ == '__main__':
    agregar_darling()
