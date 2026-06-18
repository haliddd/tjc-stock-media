#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-backup}" node scripts/safe-lane-headroom-guard.mjs

if [ ! -f .env ]; then
  echo "FAIL: .env missing"
  exit 1
fi

set -a
source .env
set +a

STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$ROOT/.runtime/backups/$STAMP"
mkdir -p "$BACKUP_DIR"
mkdir -p "$ROOT/.runtime/audits" "$ROOT/.runtime/exports"

if docker compose ps --status running | grep -q 'tjc-resourcespace-db'; then
  docker compose exec -T mariadb sh -eu -c '
    client_cnf="$(mktemp)"
    trap "rm -f \"$client_cnf\"" EXIT
    chmod 600 "$client_cnf"
    cat > "$client_cnf" <<EOF
[client]
user=${MYSQL_USER}
password=${MYSQL_PASSWORD}
EOF
    mariadb-dump --defaults-extra-file="$client_cnf" "${MYSQL_DATABASE}"
  ' > "$BACKUP_DIR/database.sql"
else
  echo "WARN: MariaDB is not running; database dump skipped." > "$BACKUP_DIR/database.sql.SKIPPED"
fi

tar -czf "$BACKUP_DIR/filestore-config.tgz" -C "$ROOT/.runtime" filestore resourcespace-config.php

tar -czf "$BACKUP_DIR/launch-artifacts.tgz" \
  docker-compose.yml \
  Makefile \
  .env.production.example \
  docs \
  scripts \
  .runtime/audits \
  .runtime/exports

echo "Backup written: $BACKUP_DIR"
