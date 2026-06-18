#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_CSV="${1:-}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$ROOT/.runtime/exports"

cd "$ROOT"
SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-export-metadata}" node scripts/safe-lane-headroom-guard.mjs

mkdir -p "$OUT_DIR"

if [ -z "$SOURCE_CSV" ]; then
  CONTAINER_EXPORT="/tmp/tjc-mvp-metadata-export-$STAMP.csv"
  docker compose ps --status running --services | grep -qx resourcespace || {
    echo "FAIL: ResourceSpace is not running. Run: make up"
    exit 1
  }
  docker compose cp scripts/resourcespace-export-metadata.php resourcespace:/tmp/resourcespace-export-metadata.php
  docker compose exec -T resourcespace php /tmp/resourcespace-export-metadata.php "$CONTAINER_EXPORT"
  DEST="$OUT_DIR/resourcespace-metadata-$STAMP.csv"
  docker compose cp "resourcespace:$CONTAINER_EXPORT" "$DEST"
else
  if [ ! -f "$SOURCE_CSV" ]; then
  echo "FAIL: CSV not found: $SOURCE_CSV"
  exit 1
  fi

  DEST="$OUT_DIR/resourcespace-metadata-$STAMP.csv"
  cp "$SOURCE_CSV" "$DEST"
fi

header="$(head -1 "$DEST" | tr '[:upper:]' '[:lower:]')"
required=(rights_status usage_scope publish_status workflow_state source_system source_path master_drive_path checksum_sha256 source_album_memberships)
missing=()
for col in "${required[@]}"; do
  if ! grep -q "$col" <<<"$header"; then
    missing+=("$col")
  fi
done

echo "Metadata export copied: $DEST"
if [ "${#missing[@]}" -gt 0 ]; then
  echo "WARN: missing expected columns: ${missing[*]}"
else
  echo "Required MVP columns: OK"
fi
