#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${1:-/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Imported/MVP 2024}"
BATCH="${IMPORT_BATCH:-MVP 2024 First Batch}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$ROOT/.runtime/audits"
MANIFEST="$OUT_DIR/mvp-2024-manifest-$STAMP.csv"
SUMMARY="$OUT_DIR/mvp-2024-summary-$STAMP.md"

cd "$ROOT"
SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-import-audit}" node scripts/safe-lane-headroom-guard.mjs

if [ ! -d "$SOURCE_DIR" ]; then
  echo "FAIL: source directory not found: $SOURCE_DIR"
  exit 1
fi

mkdir -p "$OUT_DIR"

file_count="$(find "$SOURCE_DIR" -maxdepth 1 -type f | wc -l | tr -d ' ')"
total_size="$(du -sh "$SOURCE_DIR" | awk '{print $1}')"
extension_counts="$(
  find "$SOURCE_DIR" -maxdepth 1 -type f |
    sed 's/.*\\.//' |
    tr '[:upper:]' '[:lower:]' |
    sort |
    uniq -c |
    sort -nr |
    awk '{print "- " $2 ": " $1}'
)"

printf 'canonical_asset_id,original_filename,extension,size_bytes,checksum_sha256,source_path,import_batch\n' > "$MANIFEST"

while IFS= read -r -d '' file; do
  filename="$(basename "$file")"
  extension="${filename##*.}"
  extension="$(printf '%s' "$extension" | tr '[:upper:]' '[:lower:]')"
  size_bytes="$(stat -f%z "$file")"
  checksum="$(shasum -a 256 "$file" | awk '{print $1}')"
  canonical="tjc-${checksum:0:16}"
  python3 - "$canonical" "$filename" "$extension" "$size_bytes" "$checksum" "$file" "$BATCH" <<'PY' >> "$MANIFEST"
import csv, sys
csv.writer(sys.stdout).writerow(sys.argv[1:])
PY
done < <(find "$SOURCE_DIR" -maxdepth 1 -type f -print0 | sort -z)

{
  echo "# Import Audit Summary"
  echo
  echo "- Source: \`$SOURCE_DIR\`"
  echo "- Batch: \`$BATCH\`"
  echo "- Manifest: \`$MANIFEST\`"
  echo "- Generated: $(date)"
  echo
  echo "## Count By Extension"
  echo
  if [ -n "$extension_counts" ]; then
    printf '%s\n' "$extension_counts"
  else
    echo "- none: 0"
  fi
  echo
  echo "## Total"
  echo
  echo "- Files: $file_count"
  echo "- Size: $total_size"
  echo
  echo "## HEIC Check"
  echo
  echo "HEIC files must be verified in ResourceSpace preview generation. If preview fails, keep originals and create derivative JPG copies only."
  echo
  echo "## Operator Checklist"
  echo
  echo "- Confirm source folder and batch name are correct before import."
  echo "- Confirm manifest row count matches expected source file count."
  echo "- Run \`make smoke\` before \`make import-mvp-batch\`."
  echo "- Imported assets must remain \`Needs Review / Do Not Publish\` until reviewer signoff."
  echo "- Source media was not renamed, moved, deleted, or imported by this audit."
} > "$SUMMARY"

echo "Import audit complete"
echo "Source: $SOURCE_DIR"
echo "Batch: $BATCH"
echo "Files: $file_count"
echo "Size: $total_size"
echo "Manifest: $MANIFEST"
echo "Summary: $SUMMARY"
echo "Safety: audit only; no source media renamed, moved, deleted, or imported."
echo "Next: review summary, then run: make smoke && make import-mvp-batch"
