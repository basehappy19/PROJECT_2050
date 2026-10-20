#!/bin/sh
# Back up the database to server/backups/p2050-YYYYmmdd-HHMM.sql.gz
#   cd server && sh scripts/backup.sh
# Restore:  gunzip -c backups/<file>.sql.gz | docker compose exec -T db psql -U p2050 p2050
set -e
cd "$(dirname "$0")/.."
mkdir -p backups
. ./.env
f="backups/p2050-$(date +%Y%m%d-%H%M).sql.gz"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-p2050}" "${POSTGRES_DB:-p2050}" | gzip > "$f"
echo "saved $f"
