#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${1:-/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Videos/Incoming/Samuel Kuo/Samuel Kuo}"
BATCH_ID="${VIDEO_BATCH_ID:-Samuel Kuo Video Intake}"
SOURCE_SYSTEM="${VIDEO_SOURCE_SYSTEM:-Local video source export}"
SOURCE_ACCOUNT="${VIDEO_SOURCE_ACCOUNT:-Samuel Kuo}"
SOURCE_ALBUM="${VIDEO_SOURCE_ALBUM:-Samuel Kuo}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$ROOT/.runtime/audits"
MANIFEST="$OUT_DIR/video-manifest-$STAMP.csv"
SUMMARY="$OUT_DIR/video-manifest-summary-$STAMP.md"
STAGING_ROOT="$ROOT/.runtime/shared-drive-staging"

cd "$ROOT"
SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-video-manifest}" node scripts/safe-lane-headroom-guard.mjs

if [ ! -d "$SOURCE_DIR" ]; then
  echo "FAIL: source directory not found: $SOURCE_DIR"
  exit 1
fi

mkdir -p "$OUT_DIR"

python3 "$ROOT/scripts/stage-batch-masters.py" \
  "$SOURCE_DIR" \
  "$MANIFEST" \
  "$STAGING_ROOT" \
  --batch-id "$BATCH_ID" \
  --source-system "$SOURCE_SYSTEM" \
  --source-account "$SOURCE_ACCOUNT" \
  --source-album "$SOURCE_ALBUM" \
  --mode manifest-only

{
  echo "# Video Manifest Summary"
  echo
  echo "- Source: \`$SOURCE_DIR\`"
  echo "- Batch: \`$BATCH_ID\`"
  echo "- Manifest: \`$MANIFEST\`"
  echo "- Generated: $(date)"
  echo "- Staging mode: \`manifest-only\`"
  echo
  echo "## Count By Extension"
  echo
  python3 - "$MANIFEST" <<'PY'
import csv
import sys
from collections import defaultdict

counts = defaultdict(int)
bytes_by_ext = defaultdict(int)
with open(sys.argv[1], newline="", encoding="utf-8") as handle:
    for row in csv.DictReader(handle):
        ext = row["original_extension"]
        counts[ext] += 1
        bytes_by_ext[ext] += int(row["original_file_size_bytes"])

for ext in sorted(counts):
    gib = bytes_by_ext[ext] / 1024 / 1024 / 1024
    print(f"- {ext}: {counts[ext]} files, {gib:.2f} GiB")
PY
  echo
  echo "## Launch Gate"
  echo
  echo "- Test 1-2 MP4 files before full import."
  echo "- Use large-media admin intake for files over browser upload limit."
  echo "- Do not mark video approved until reviewer/date/notes are present."
} > "$SUMMARY"

echo "Video manifest written: $MANIFEST"
echo "Video summary written: $SUMMARY"
