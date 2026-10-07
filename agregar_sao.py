#!/usr/bin/env python3
"""
Agrega toda la saga de Sword Art Online a la base de datos.
"""

from supabase import create_client
import uuid

SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def agregar_sao():
    """Agrega toda la saga de Sword Art Online."""
    
    print('🏯 TENKO - Agregando Sword Art Online')
    print('=' * 60)
    
    # ========== DEFINICIÓN DE TEMPORADAS ==========
    temporadas = [
        {
            'titulo': 'Sword Art Online',
            'sinopsis': 'En 2022, un videojuego de realidad virtual llamado Sword Art Online es lanzado. Los jugadores descubren que no pueden salir y deben completar los 100 pisos del castillo de Aincrad para liberarse. Si mueren en el juego, mueren en la vida real. Kirito, un jugador beta, debe luchar para sobrevivir.',
            'portada_url': 'https://cdn.myanimelist.net/images/anime/1/24545.jpg',
            'banner_url': 'https://cdn.myanimelist.net/images/anime/1/24545l.jpg',
            'estado': 'terminado',
            'fecha_estreno': '2012-07-08',
            'generos': ['Acción', 'Aventura', 'Fantasía', 'Romance', 'Videojuegos'],
            'total_episodios': 25,
            'slug': 'sword-art-online'
        },
        {
            'titulo': 'Sword Art Online II',
            'sinopsis': 'Un año después de escapar de SAO, Kirito entra al juego Gun Gale Online para investigar misteriosas muertes relacionadas con el juego. Allí conoce a Sinon, una francotiradora experta.',
            'portada_url': 'https://cdn.myanimelist.net/images/anime/11/65185.jpg',
            'banner_url': 'https://cdn.myanimelist.net/images/anime/11/65185l.jpg',
            'estado': 'terminado',
            'fecha_estreno': '2014-07-05',
            'generos': ['Acción', 'Aventura', 'Ciencia Ficción', 'Videojuegos'],
            'total_episodios': 24,
            'slug': 'sword-art-online-ii'
        },
        {
            'titulo': 'Sword Art Online: Alicization',
            'sinopsis': 'Kirito despierta en un misterioso mundo llamado Underworld. Sin recuerdos de cómo llegó allí, debe descubrir la verdad sobre este nuevo mundo virtual y su conexión con la realidad.',
            'portada_url': 'https://cdn.myanimelist.net/images/anime/1923/99309.jpg',
            'banner_url': 'https://cdn.myanimelist.net/images/anime/1923/99309l.jpg',
            'estado': 'terminado',
            'fecha_estreno': '2018-10-07',
            'generos': ['Acción', 'Aventura', 'Fantasía', 'Ciencia Ficción'],
            'total_episodios': 24,
            'slug': 'sword-art-online-alicization'
        },
        {
            'titulo': 'Sword Art Online: Alicization - War of Underworld',
            'sinopsis': 'La guerra por Underworld ha comenzado. Kirito y sus aliados deben enfrentarse al ejército del Imperio Oscuro para proteger lo que más aman.',
            'portada_url': 'https://cdn.myanimelist.net/images/anime/1740/104786.jpg',
            'banner_url': 'https://cdn.myanimelist.net/images/anime/1740/104786l.jpg',
            'estado': 'terminado',
            'fecha_estreno': '2019-10-13',
            'generos': ['Acción', 'Aventura', 'Fantasía', 'Ciencia Ficción'],
            'total_episodios': 23,
            'slug': 'sword-art-online-alicization-war-of-underworld'
        },
    ]
    
    total_agregados = 0
    
    for temp in temporadas:
        print(f'')
        print(f'📝 Agregando: {temp["titulo"]}')
        
        # Crear anime
        anime_id = str(uuid.uuid4())
        anime_data = {
            'id': anime_id,
            'titulo': temp['titulo'],
            'sinopsis': temp['sinopsis'],
            'portada_url': temp['portada_url'],
            'banner_url': temp['banner_url'],
            'estado_emision': temp['estado'],
            'fecha_estreno': temp['fecha_estreno'],
            'generos': temp['generos'],
            'created_at': 'now()'
        }
        
        result = supabase.table('animes').insert([anime_data]).execute()
        
        if not result.data:
            print(f'  ❌ Error creando anime')
            continue
        
        print(f'  ✅ Anime creado')
        
        # Crear temporada única
        temporada_id = str(uuid.uuid4())
        temporada_data = {
            'id': temporada_id,
            'anime_id': anime_id,
            'nombre': 'Temporada 1',
            'orden': 1,
            'created_at': 'now()'
        }
        
        result = supabase.table('temporadas').insert([temporada_data]).execute()
        
        if not result.data:
            print(f'  ❌ Error creando temporada')
            continue
        
        print(f'  ✅ Temporada creada')
        
        # Crear episodios
        episodios = []
        for num in range(1, temp['total_episodios'] + 1):
            ep_id = str(uuid.uuid4())
            ep_data = {
                'id': ep_id,
                'temporada_id': temporada_id,
                'numero': num,
                'titulo': f'Episodio {num}',
                'descripcion': f'Episodio {num} de {temp["titulo"]}',
                'url_stream': f'https://jkanime.net/{temp["slug"]}/{num}/',
                'duracion_total': 1440,
                'segundo_actual': 0,
                'visto': False,
                'fecha_emision': f'{temp["fecha_estreno"][:4]}-{((num // 4) % 12) + 1:02d}-{((num - 1) % 4) * 7 + 1:02d}',
                'created_at': 'now()'
            }
            episodios.append(ep_data)
        
        result = supabase.table('episodios').insert(episodios).execute()
        
        if not result.data:
            print(f'  ❌ Error creando episodios')
            continue
        
        print(f'  ✅ {len(episodios)} episodios creados')
        total_agregados += len(episodios)
    
    print('')
    print('=' * 60)
    print(f'✅ ¡Sword Art Online agregado exitosamente!')
    print(f'📊 Total episodios: {total_agregados}')
    print(f'📊 Temporadas: {len(temporadas)}')
    print('')
    print('🎬 Ya deberían aparecer en la página principal')


if __name__ == '__main__':
    agregar_sao()
