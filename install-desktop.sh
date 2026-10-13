#!/usr/bin/env bash

# ==============================================================================
# Instalador Nativo de Escritorio para Linux - TENKO
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${PROJECT_DIR}/santuario-ui"
DESKTOP_FILE="${PROJECT_DIR}/TENKO.desktop"
USER_APPS_DIR="${HOME}/.local/share/applications"
USER_DESKTOP_DIR="${HOME}/Escritorio"

if [ ! -d "$USER_DESKTOP_DIR" ]; then
    USER_DESKTOP_DIR="${HOME}/Desktop"
fi

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}⚙️  Configurando TENKO para Linux...${NC}"

# 1. Asignar permisos de ejecucion
chmod +x "${PROJECT_DIR}/santuario-anime.sh"
chmod +x "${PROJECT_DIR}/install-desktop.sh"
chmod +x "$DESKTOP_FILE"

# 2. Generar el archivo .desktop con la ruta absoluta del sistema
cat <<EOF > "$DESKTOP_FILE"
[Desktop Entry]
Version=1.0
Type=Application
Name=TENKO
Comment=Plataforma privada de streaming de anime offline y local
Exec=${PROJECT_DIR}/santuario-anime.sh start
Path=${PROJECT_DIR}
Icon=video-x-generic
Terminal=false
Categories=AudioVideo;Player;TV;
StartupNotify=true
EOF

chmod +x "$DESKTOP_FILE"

# 3. Copiar al menu de aplicaciones de Linux
mkdir -p "$USER_APPS_DIR"
cp "$DESKTOP_FILE" "${USER_APPS_DIR}/TENKO.desktop"

# Copiar al Escritorio del usuario si existe
if [ -d "$USER_DESKTOP_DIR" ]; then
    cp "$DESKTOP_FILE" "${USER_DESKTOP_DIR}/TENKO.desktop"
    chmod +x "${USER_DESKTOP_DIR}/TENKO.desktop" 2>/dev/null
    gio set "${USER_DESKTOP_DIR}/TENKO.desktop" metadata::trusted true 2>/dev/null || true
fi

# Actualizar base de datos del escritorio
if command -v update-desktop-database &> /dev/null; then
    update-desktop-database "$USER_APPS_DIR" 2>/dev/null || true
fi

echo -e "${GREEN}========================================================${NC}"
echo -e "${GREEN}🎉 ¡INSTALACIÓN COMPLETADA EXITOSAMENTE!${NC}"
echo -e "${GREEN}========================================================${NC}"
echo -e "Ahora puedes iniciar TENKO:"
echo -e " 1. Buscando 'TENKO' en tu menú de aplicaciones Linux."
echo -e " 2. Haciendo doble clic en el acceso directo del Escritorio."
echo -e " 3. Ejecutando: ./santuario-anime.sh start"
