#!/usr/bin/env bash
# Respaldo de Twenty: dump de Postgres + archivos adjuntos + .env, con retención.
# Uso:  ./backup.sh [DIRECTORIO]      (por defecto /var/backups/twenty; retención RETENTION_DAYS=14)
set -euo pipefail
cd "$(dirname "$0")"

dest=${1:-/var/backups/twenty}
retention=${RETENTION_DAYS:-14}
stamp=$(date +%F_%H%M)
mkdir -p "$dest"
chmod 700 "$dest"

db_user=$(grep '^PG_DATABASE_USER=' .env | cut -d= -f2-)
db_name=$(grep '^PG_DATABASE_NAME=' .env | cut -d= -f2-)

docker compose exec -T db pg_dump -U "${db_user:-postgres}" "${db_name:-default}" | gzip > "$dest/twenty-db-$stamp.sql.gz"
# Adjuntos (STORAGE_TYPE=local) desde el volumen del servidor.
docker compose exec -T server tar -C /app/packages/twenty-server/.local-storage -czf - . > "$dest/twenty-files-$stamp.tar.gz"
# Sin ENCRYPTION_KEY el dump no sirve para restaurar las cuentas conectadas.
install -m 600 .env "$dest/twenty-env-$stamp"

find "$dest" -name 'twenty-*' -mtime +"$retention" -delete
echo "✅ Respaldo en $dest ($stamp)"
