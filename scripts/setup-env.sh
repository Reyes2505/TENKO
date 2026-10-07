#!/bin/bash
# Configura la SUPABASE_SERVICE_ROLE_KEY en .env.local de forma segura

set -e

ENV_FILE=".env.local"

echo "🔐 Configuración de Supabase Service Role Key"
echo ""

# Verificar que .env.local existe
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ No existe $ENV_FILE"
  echo "   Créalo primero con las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY"
  exit 1
fi

# Verificar variables base
if ! grep -q "^NEXT_PUBLIC_SUPABASE_URL=" "$ENV_FILE"; then
  echo "❌ Falta NEXT_PUBLIC_SUPABASE_URL en $ENV_FILE"
  exit 1
fi

# Verificar si ya existe la service role
if grep -q "^SUPABASE_SERVICE_ROLE_KEY=" "$ENV_FILE"; then
  echo "⚠️  Ya existe SUPABASE_SERVICE_ROLE_KEY en $ENV_FILE"
  read -p "¿Reemplazar? (s/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Cancelado."
    exit 0
  fi
  sed -i '/^SUPABASE_SERVICE_ROLE_KEY=/d' "$ENV_FILE"
  sed -i '/^# Service Role (backend only)/d' "$ENV_FILE"
fi

# Pedir la key SIN mostrarla
echo "Pega la service_role key (no se verá al escribir):"
read -s SERVICE_KEY
echo ""

# Validar formato básico
if [[ ! "$SERVICE_KEY" =~ ^eyJ ]]; then
  echo "❌ La key no parece un JWT válido (debe empezar con 'eyJ')"
  exit 1
fi

# Decodificar payload para verificar rol
PAYLOAD=$(echo "$SERVICE_KEY" | cut -d. -f2 | base64 -d 2>/dev/null || echo "")

if echo "$PAYLOAD" | grep -q '"role":"anon"'; then
  echo "❌ ERROR: Esa es la key ANON, no la SERVICE_ROLE."
  echo "   Ve a Supabase → Settings → API → service_role → Reveal"
  exit 1
fi

if echo "$PAYLOAD" | grep -q '"role":"service_role"'; then
  echo "✅ Key identificada como service_role"
else
  echo "⚠️  No se pudo verificar el rol, continuando..."
fi

# Guardar en .env.local
echo "" >> "$ENV_FILE"
echo "# Service Role (backend only) — añadida $(date)" >> "$ENV_FILE"
echo "SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY" >> "$ENV_FILE"

# Permisos restrictivos
chmod 600 "$ENV_FILE"

echo ""
echo "✅ Key guardada en $ENV_FILE (permisos 600)"
echo ""
echo "🧪 Verificando conexión con Supabase..."
echo ""

# Test de conexión
node --env-file=.env.local -e "
import('@supabase/supabase-js').then(async ({ createClient }) => {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { count, error } = await sb.from('animes').select('*', { count: 'exact', head: true });
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  console.log('✅ Conexión OK. Animes en DB:', count);
});
"
