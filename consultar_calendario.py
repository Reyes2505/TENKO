#!/usr/bin/env python3
"""
Consulta el calendario de emisión y muestra los animes que emiten HOY.
"""

from datetime import datetime
from supabase import create_client

SUPABASE_URL = 'https://uftfbidzobftjbonziql.supabase.co'
SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']


def main():
    print('=' * 80)
    print('📅 CALENDARIO DE EMISIÓN - ANIMES DE HOY')
    print(f'📅 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    print('=' * 80)
    print()
    
    # Día actual (0=Lunes, 6=Domingo)
    hoy = datetime.now().weekday()
    hora_actual = datetime.now().strftime('%H:%M:%S')
    
    print(f'📆 Hoy es: {DIAS[hoy]}')
    print(f'🕐 Hora actual: {hora_actual}')
    print()
    
    # Consultar animes de hoy
    response = supabase.table('calendario_emision').select(
        'titulo, dia_semana, hora_emision, proximo_episodio, proxima_fecha, activo'
    ).eq('dia_semana', hoy).eq('activo', True).order('hora_emision').execute()
    
    animes = response.data or []
    
    print(f'📺 Animes que emiten HOY: {len(animes)}')
    print()
    print('=' * 80)
    
    for i, anime in enumerate(animes, 1):
        titulo = anime.get('titulo', '')
        hora = anime.get('hora_emision') or '--:--'
        ep = anime.get('proximo_episodio') or '?'
        fecha = anime.get('proxima_fecha') or 'N/A'
        
        # Determinar si ya se emitió o está por emitirse
        estado = '⏳ Por emitir'
        if hora != '--:--':
            if hora <= hora_actual:
                estado = '✅ Ya emitido'
            else:
                estado = '⏳ Por emitir'
        
        print(f'[{i}] {estado} | {hora} | {titulo[:50]} (EP {ep})')
        print(f'     📅 Fecha: {fecha}')
    
    print()
    print('=' * 80)
    
    # Próximos días
    print()
    print('📅 PRÓXIMOS DÍAS:')
    for i in range(1, 8):
        dia = (hoy + i) % 7
        count_response = supabase.table('calendario_emision').select(
            'id', count='exact'
        ).eq('dia_semana', dia).eq('activo', True).execute()
        
        count = count_response.count if count_response.count else 0
        print(f'   {DIAS[dia]}: {count} animes')


if __name__ == '__main__':
    main()
