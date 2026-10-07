#!/usr/bin/env python3
"""
consultar_calendario.py v2
==========================
Consulta el calendario de emisión y muestra los animes que emiten HOY.

Mejoras v2:
- ✅ Compatible con el schema actual (sin 'proxima_fecha')
- ✅ Distingue animes EN BD vs PENDIENTES
- ✅ Cuenta exacta de próximos días (count correcto en supabase-py v2)
- ✅ Manejo de errores y valores nulos
- ✅ Soporta filtro por temporada (--temporada=verano_2026)
- ✅ Soporta modo --proximos (7 días) o --hoy (solo hoy)
- ✅ Usa variables de entorno si están disponibles
"""

import os
import sys
import argparse
from datetime import datetime
from supabase import create_client, Client
from postgrest.exceptions import APIError

SUPABASE_URL = os.environ.get(
    'SUPABASE_URL',
    'https://uftfbidzobftjbonziql.supabase.co'
)
SUPABASE_KEY = os.environ.get(
    'SUPABASE_SERVICE_ROLE_KEY',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A'
)

DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
SEP = '=' * 80


# ============================================================================
# HELPERS
# ============================================================================

def safe_hora(hora_raw) -> str:
    """Normaliza hora_emision a 'HH:MM'. Acepta None, 'HH:MM:SS', 'HH:MM'."""
    if not hora_raw:
        return '--:--'
    s = str(hora_raw)
    return s[:5] if len(s) >= 5 else s


def estado_emision(hora_str: str, hora_actual: str) -> str:
    if hora_str == '--:--':
        return '❔ Sin hora'
    try:
        return '✅ Ya emitido' if hora_str <= hora_actual else '⏳ Por emitir'
    except Exception:
        return '❔ ?'


# ============================================================================
# CONSULTAS
# ============================================================================

def consultar_dia(supabase: Client, dia: int, temporada: str = None):
    """Devuelve las filas de calendario_emision para un día concreto."""
    q = supabase.table('calendario_emision').select(
        'titulo, dia_semana, hora_emision, proximo_episodio, '
        'anime_id, en_bd, portada_url'
    ).eq('dia_semana', dia).eq('activo', True)

    if temporada:
        q = q.eq('temporada', temporada)

    try:
        resp = q.order('hora_emision').execute()
        return resp.data or []
    except APIError as e:
        print(f'⚠️  Error consultando día {DIAS[dia]}: {e.message}')
        return []


def contar_dia(supabase: Client, dia: int, temporada: str = None) -> int:
    """Cuenta cuántos animes emiten un día concreto."""
    try:
        q = supabase.table('calendario_emision').select(
            'id', count='exact'
        ).eq('dia_semana', dia).eq('activo', True)

        if temporada:
            q = q.eq('temporada', temporada)

        resp = q.execute()
        return resp.count or 0
    except APIError:
        return 0


def contar_sin_dia(supabase: Client, temporada: str = None) -> int:
    """Cuenta animes activos SIN día asignado (pendientes de sync-anilist)."""
    try:
        q = supabase.table('calendario_emision').select(
            'id', count='exact'
        ).eq('activo', True).is_('dia_semana', 'null')

        if temporada:
            q = q.eq('temporada', temporada)

        resp = q.execute()
        return resp.count or 0
    except APIError:
        return 0


# ============================================================================
# IMPRESIÓN
# ============================================================================

def imprimir_header(temporada: str = None):
    print(SEP)
    print('📅 CALENDARIO DE EMISIÓN - ANIMES DE HOY')
    print(f'🕐 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
    if temporada:
        print(f'🍂 Temporada: {temporada}')
    print(SEP)
    print()


def imprimir_animes_hoy(animes, hora_actual: str):
    print(SEP)

    if not animes:
        print('  ⚠️  No hay animes programados para hoy.')
        print('     (¿Corriste `seed_calendario.js` y `sync_anilist.py`?)')
        print()
        return

    en_bd = [a for a in animes if a.get('en_bd')]
    pendientes = [a for a in animes if not a.get('en_bd')]

    print(f'  📊 Total hoy: {len(animes)}')
    print(f'     🎬 En BD (listos para ver): {len(en_bd)}')
    print(f'     ⏳ Pendientes de sync:      {len(pendientes)}')
    print(SEP)
    print()

    for i, a in enumerate(animes, 1):
        titulo = (a.get('titulo') or '')[:55]
        hora = safe_hora(a.get('hora_emision'))
        ep = a.get('proximo_episodio') or '?'
        estado = estado_emision(hora, hora_actual)
        flag_bd = '🎬' if a.get('en_bd') else '⏳'

        print(f'  [{i:2}] {flag_bd} {estado} │ {hora} │ {titulo} (EP {ep})')

    print()


def imprimir_proximos(supabase: Client, hoy: int, temporada: str = None):
    print(SEP)
    print('📅 PRÓXIMOS DÍAS')
    print(SEP)

    total_semana = 0
    for offset in range(1, 8):
        dia = (hoy + offset) % 7
        count = contar_dia(supabase, dia, temporada)
        total_semana += count
        marca = '📌' if count > 0 else '  '
        print(f'  {marca} {DIAS[dia]:<11} │ {count:>3} animes')

    print()
    print(f'  📈 Total próximos 7 días: {total_semana}')

    sin_dia = contar_sin_dia(supabase, temporada)
    if sin_dia > 0:
        print()
        print(f'  ⚠️  {sin_dia} animes activos SIN día asignado.')
        print('     → Ejecuta `sync_anilist.py` para completarlos.')

    print()


# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='Consulta el calendario de emisión.')
    parser.add_argument('--temporada', default=None,
                        help='Filtrar por temporada (ej: verano_2026, otono_2026)')
    parser.add_argument('--hoy', action='store_true',
                        help='Mostrar solo el día de hoy (omite próximos 7 días)')
    parser.add_argument('--sin-color', action='store_true',
                        help='(reservado) desactiva colores ANSI')
    args = parser.parse_args()

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

    hoy = datetime.now().weekday()
    hora_actual = datetime.now().strftime('%H:%M:%S')

    imprimir_header(args.temporada)
    print(f'📆 Hoy es: {DIAS[hoy]}')
    print(f'🕐 Hora actual: {hora_actual[:5]}')
    print()

    animes = consultar_dia(supabase, hoy, args.temporada)
    imprimir_animes_hoy(animes, hora_actual)

    if not args.hoy:
        imprimir_proximos(supabase, hoy, args.temporada)

    print(SEP)


if __name__ == '__main__':
    main()