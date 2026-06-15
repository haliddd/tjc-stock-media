#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-resourcespace-smoke}" node scripts/safe-lane-headroom-guard.mjs

if [ ! -f .env ]; then
  echo "FAIL: .env missing. Run: cp .env.example .env"
  exit 1
fi

set -a
source .env
set +a

PORT="${RESOURCESPACE_PORT:-8088}"

command -v docker >/dev/null || { echo "FAIL: docker missing"; exit 1; }
docker compose version >/dev/null || { echo "FAIL: docker compose missing"; exit 1; }

if [ ! -d .runtime/resourcespace-docker ]; then
  echo "FAIL: official ResourceSpace Docker repo not bootstrapped. Run: make init"
  exit 1
fi

docker compose config >/dev/null

echo "Docker compose config: OK"

if docker compose ps --status running --services | grep -qx 'resourcespace'; then
  echo "ResourceSpace container: running"
else
  echo "WARN: ResourceSpace container is not running. Run: make up"
fi

if docker compose ps --status running --services | grep -qx 'mariadb'; then
  echo "MariaDB container: running"
else
  echo "WARN: MariaDB container is not running. Run: make up"
fi

if curl -fsS "http://localhost:${PORT}" >/dev/null 2>&1; then
  echo "ResourceSpace URL: OK http://localhost:${PORT}"
else
  echo "WARN: http://localhost:${PORT} did not respond yet. If containers just started, wait and retry."
fi

[ -d .runtime/filestore ] && echo "Filestore volume path: OK"
[ -d .runtime/mariadb ] && echo "MariaDB volume path: OK"
[ -f .runtime/resourcespace-config.php ] && echo "ResourceSpace config path: OK"

echo "Smoke check complete."
