#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIP_DIR="${1:-/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Incoming/lm-photo}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$ROOT/.runtime/audits"
OUT="$OUT_DIR/lm-photos-zip-inventory-$STAMP.csv"

cd "$ROOT"
SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-lm-photos-zip-inventory}" node scripts/safe-lane-headroom-guard.mjs

mkdir -p "$OUT_DIR"
python3 "$ROOT/scripts/lm-photos-zip-inventory.py" "$ZIP_DIR" "$OUT"

echo "LM Photos ZIP inventory: $OUT"
