#!/usr/bin/env bash

# ==============================================================================
# TENKO - Lanzador Nativo para Linux
# ==============================================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="${PROJECT_DIR}/santuario-ui"
PID_FILE="${PROJECT_DIR}/.santuario-anime.pid"
PORT=3000

# Color Codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

print_banner() {
    echo -e "${BLUE}"
    echo "========================================================"
    echo "    ⛩️  TENKO - Version Nativa Linux  ⛩️"
    echo "========================================================"
    echo -e "${NC}"
}

check_dependencies() {
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Error: Node.js no esta instalado en este sistema Linux.${NC}"
        exit 1
    fi

    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ Error: npm no esta instalado.${NC}"
        exit 1
    fi
}

is_running() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            return 0
        fi
    fi
    return 1
}

start_app() {
    print_banner
    check_dependencies

    if is_running; then
        echo -e "${YELLOW}⚠️ TENKO ya se encuentra ejecutandose (PID: $(cat "$PID_FILE")).${NC}"
        open_browser
        exit 0
    fi

    echo -e "${GREEN}🚀 Iniciando TENKO en modo local...${NC}"
    cd "$APP_DIR" || exit 1

    # Iniciar la aplicación de escritorio (Electron), que a su vez arranca el servidor Next
    npm run desktop > "${PROJECT_DIR}/santuario.log" 2>&1 &

    SERVER_PID=$!
    echo "$SERVER_PID" > "$PID_FILE"

    echo -e "${GREEN}✅ Aplicación de escritorio iniciada (PID: ${SERVER_PID})${NC}"
    sleep 2
    open_browser
}

open_browser() {
    URL="http://localhost:${PORT}"
    echo -e "${BLUE}🌐 Abriendo ventana en ${URL}...${NC}"

    if command -v xdg-open &> /dev/null; then
        xdg-open "$URL" &> /dev/null &
    elif command -v google-chrome &> /dev/null; then
        google-chrome --app="$URL" &> /dev/null &
    elif command -v firefox &> /dev/null; then
        firefox --new-window "$URL" &> /dev/null &
    else
        echo -e "${YELLOW}Abre manualmente la aplicacion en tu navegador: ${URL}${NC}"
    fi
}

stop_app() {
    print_banner
    if is_running; then
        PID=$(cat "$PID_FILE")
        echo -e "${YELLOW}🛑 Deteniendo servicio de TENKO (PID: ${PID})...${NC}"
        kill "$PID" 2>/dev/null
        rm -f "$PID_FILE"
        echo -e "${GREEN}✅ Servicio detenido correctamente.${NC}"
    else
        echo -e "${YELLOW}⚠️ El servicio no esta activo.${NC}"
    fi
}

status_app() {
    print_banner
    if is_running; then
        echo -e "${GREEN}🟢 ESTADO: TENKO esta ACTIVO (PID: $(cat "$PID_FILE"))${NC}"
        echo -e "Accede en: http://localhost:${PORT}"
    else
        echo -e "${RED}🔴 ESTADO: TENKO esta DETENIDO.${NC}"
    fi
}

case "$1" in
    start)
        start_app
        ;;
    stop)
        stop_app
        ;;
    status)
        status_app
        ;;
    restart)
        stop_app
        sleep 1
        start_app
        ;;
    *)
        print_banner
        echo "Uso: ./santuario-anime.sh {start|stop|status|restart}"
        echo ""
        echo "Comandos:"
        echo "  start   - Inicia el servicio local y abre la interfaz"
        echo "  stop    - Detiene el servicio local"
        echo "  status  - Muestra el estado del servicio"
        echo "  restart - Reinicia la aplicacion"
        exit 1
        ;;
esac
