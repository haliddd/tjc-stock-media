#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME="$ROOT/.runtime"
OFFICIAL="$RUNTIME/resourcespace-docker"

cd "$ROOT"
SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-resourcespace-bootstrap}" node scripts/safe-lane-headroom-guard.mjs

mkdir -p "$RUNTIME" "$RUNTIME/filestore" "$RUNTIME/mariadb" "$RUNTIME/audits" "$RUNTIME/exports" "$RUNTIME/backups"

if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "Created .env from .env.example. Local defaults are not production secrets."
fi

if [ ! -d "$OFFICIAL/.git" ]; then
  git clone --depth 1 https://github.com/resourcespace/docker.git "$OFFICIAL"
else
  git -C "$OFFICIAL" fetch --depth 1 origin main
  git -C "$OFFICIAL" reset --hard origin/main
fi

touch "$RUNTIME/resourcespace-config.php"
chmod 666 "$RUNTIME/resourcespace-config.php" || true

echo "Official ResourceSpace Docker repo ready at $OFFICIAL"
