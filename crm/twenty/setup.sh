#!/usr/bin/env bash
# Genera crm/twenty/.env con secretos aleatorios y levanta Twenty CRM.
# Uso:  ./setup.sh [SERVER_URL]     p. ej.  ./setup.sh https://crm.c4b.mx
set -euo pipefail
cd "$(dirname "$0")"

command -v docker >/dev/null || { echo "❌ Docker no está instalado: https://docs.docker.com/get-docker/"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "❌ Falta el plugin 'docker compose' v2 (apt-get install docker-compose-plugin)"; exit 1; }
command -v openssl >/dev/null || { echo "❌ Falta openssl"; exit 1; }

if [ -f .env ]; then
  echo "ℹ️  Ya existe .env; no lo sobrescribo (bórralo si quieres regenerarlo)."
else
  server_url=${1:-http://localhost:3001}
  pg_password=$(openssl rand -hex 24)
  encryption_key=$(openssl rand -base64 32)
  sed -e "s|^SERVER_URL=.*|SERVER_URL=${server_url}|" \
      -e "s|^PG_DATABASE_PASSWORD=.*|PG_DATABASE_PASSWORD=${pg_password}|" \
      -e "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${encryption_key}|" \
      .env.example > .env
  chmod 600 .env
  echo "✅ .env creado (SERVER_URL=${server_url}). Respalda ENCRYPTION_KEY y PG_DATABASE_PASSWORD en un lugar seguro."
fi

echo "⏳ Levantando Twenty (la primera vez corre migraciones, puede tardar 2–5 min)..."
if docker compose up -d --wait; then
  echo "🎉 Twenty listo en $(grep '^SERVER_URL=' .env | cut -d= -f2-)"
else
  echo "⚠️  Aún no está sano. Revisa: docker compose logs -f server"
  exit 1
fi
