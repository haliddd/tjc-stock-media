#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-polish-mvp-ui}" node scripts/safe-lane-headroom-guard.mjs

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR=".runtime/audits"
mkdir -p "$OUT_DIR"

COLLECTION="${1:-MVP 2024 - First Batch}"
AUDIT="/tmp/tjc-mvp-ui-polish-$STAMP.csv"
DEST="$OUT_DIR/ui-polish-audit-$STAMP.csv"

docker compose cp scripts/resourcespace-polish-mvp-ui.php resourcespace:/tmp/resourcespace-polish-mvp-ui.php
docker compose exec -T resourcespace php /tmp/resourcespace-polish-mvp-ui.php "$COLLECTION" "$AUDIT"
docker compose cp "resourcespace:$AUDIT" "$DEST"

echo "UI polish audit: $DEST"
