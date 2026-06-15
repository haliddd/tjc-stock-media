#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIP_DIR="${1:-/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Incoming/lm-photo}"
RUN_ID="${RUN_ID:-lm-photos-completion-$(date +%Y%m%d-%H%M%S)}"
WORK_ROOT="$ROOT/.runtime/lm-photos-stream/$RUN_ID"
AUDIT_DIR="$ROOT/.runtime/audits/$RUN_ID"
STAGING_ROOT="${STAGING_ROOT:-$ROOT/.runtime/shared-drive-staging}"
STAGE_MODE="${STAGE_MODE:-hardlink}"
DELETE_VERIFIED_ZIPS="${DELETE_VERIFIED_ZIPS:-0}"
DRY_RUN="${DRY_RUN:-1}"
MIN_FREE_MB="${MIN_FREE_MB:-1024}"
PROCESS_LIMIT="${PROCESS_LIMIT:-0}"

cd "$ROOT"
SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-lm-photos-stream-run}" node scripts/safe-lane-headroom-guard.mjs
mkdir -p "$WORK_ROOT" "$AUDIT_DIR"

if [ ! -d "$ZIP_DIR" ]; then
  echo "FAIL: ZIP directory not found: $ZIP_DIR"
  exit 1
fi

if [ "$DRY_RUN" != "1" ]; then
  docker compose ps --status running --services | grep -qx resourcespace || {
    echo "FAIL: ResourceSpace is not running. Run: make up"
    exit 1
  }
fi

echo "Run ID: $RUN_ID"
echo "ZIP dir: $ZIP_DIR"
echo "Dry run: $DRY_RUN"
echo "Delete verified ZIPs: $DELETE_VERIFIED_ZIPS"
echo "Work root: $WORK_ROOT"
echo "Audit dir: $AUDIT_DIR"
echo "Staging root: $STAGING_ROOT"
echo "Stage mode: $STAGE_MODE"
if [ "$DRY_RUN" = "1" ]; then
  echo "Mode: dry run only; no ZIP extraction, ResourceSpace import, staging write, temp cleanup, or ZIP deletion."
else
  echo "Mode: live run; process albums one at a time and verify manifest count equals import audit count."
fi

ORDER_FILE="$WORK_ROOT/zip-order.txt"
find "$ZIP_DIR" -maxdepth 1 -type f -name '*.zip' ! -name 'Open Album-3-001.zip' | sort > "$ORDER_FILE"
find "$ZIP_DIR" -maxdepth 1 -type f -name 'Open Album-3-001.zip' | sort >> "$ORDER_FILE"
zip_count="$(wc -l < "$ORDER_FILE" | tr -d ' ')"
echo "ZIPs discovered: $zip_count"
if grep -q '/Open Album-3-001.zip$' "$ORDER_FILE"; then
  echo "Order note: Open Album-3-001.zip queued last because it is largest."
fi

processed=0
while IFS= read -r zip <&3; do
  [ -n "$zip" ] || continue
  if [ "$PROCESS_LIMIT" != "0" ] && [ "$processed" -ge "$PROCESS_LIMIT" ]; then
    echo "Process limit reached: $PROCESS_LIMIT"
    break
  fi

  album_zip="$(basename "$zip")"
  album="${album_zip%-3-001.zip}"
  album="${album%.zip}"
  safe_album="$(printf '%s' "$album" | tr '/: ' '___' | tr -cd '[:alnum:]_.-')"
  if [ -z "$safe_album" ]; then
    safe_album="$(shasum -a 256 <<<"$album" | awk '{print substr($1,1,16)}')"
  fi
  extract_dir="$WORK_ROOT/extract/$safe_album"
  album_audit="$AUDIT_DIR/$safe_album.import-audit.csv"
  source_manifest="$AUDIT_DIR/$safe_album.source-manifest.csv"

  free_mb="$(df -m "$WORK_ROOT" | awk 'NR==2 {print $4}')"
  if [ "$free_mb" -lt "$MIN_FREE_MB" ]; then
    echo "FAIL: free space ${free_mb}MB below MIN_FREE_MB=${MIN_FREE_MB} before $album_zip"
    exit 2
  fi

  echo "==> Album: $album_zip"
  echo "    Album name: $album"
  echo "    Free MB before: $free_mb"

  if [ "$DRY_RUN" = "1" ]; then
    file_count="$(python3 - "$zip" <<'PY'
import sys, zipfile
from pathlib import Path
media = {".jpg",".jpeg",".png",".heic",".heif",".gif",".webp",".tif",".tiff",".arw",".mp4",".mov",".m4v",".avi",".mkv",".mp3",".m4a",".wav",".aac",".aiff",".flac"}
with zipfile.ZipFile(sys.argv[1]) as zf:
    print(sum(1 for info in zf.infolist() if not info.is_dir() and Path(info.filename).suffix.lower() in media))
PY
)"
    zip_size_mb="$(du -m "$zip" | awk '{print $1}')"
    echo "    Media files in ZIP: $file_count"
    echo "    ZIP size MB: $zip_size_mb"
    echo "    Would write source manifest: $source_manifest"
    echo "    Would write album import audit: $album_audit"
    processed=$((processed + 1))
    continue
  fi

  rm -rf "$extract_dir"
  mkdir -p "$extract_dir"
  ditto -x -k "$zip" "$extract_dir"

  # Google Photos ZIPs usually contain a single album folder. If so, import that folder.
  album_dir="$extract_dir"
  first_dir="$(find "$extract_dir" -mindepth 1 -maxdepth 1 -type d | head -1 || true)"
  dir_count="$(find "$extract_dir" -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
  file_count_root="$(find "$extract_dir" -mindepth 1 -maxdepth 1 -type f | wc -l | tr -d ' ')"
  if [ "$dir_count" = "1" ] && [ "$file_count_root" = "0" ] && [ -n "$first_dir" ]; then
    album_dir="$first_dir"
  fi

  ./scripts/stage-batch-masters.py \
    "$album_dir" \
    "$source_manifest" \
    "$STAGING_ROOT" \
    --batch-id "LM Photos Completion Run" \
    --source-system "Google Photos album export" \
    --source-account "lm.photo@tjc.org" \
    --source-album "$album" \
    --mode "$STAGE_MODE"

  IMPORT_BATCH="LM Photos Completion Run" \
  IMPORT_COLLECTION="LM Photos - $album" \
  IMPORT_RUN_COLLECTION="LM Photos Completion Run - All Albums" \
  IMPORT_SOURCE_SYSTEM="Google Photos album export" \
  IMPORT_SOURCE_ACCOUNT="lm.photo@tjc.org" \
  IMPORT_SOURCE_ALBUM="$album" \
  IMPORT_STAGING_MANIFEST="$source_manifest" \
  ./scripts/import-mvp-batch.sh "$album_dir"

  latest_import_audit="$(ls -t "$ROOT/.runtime/audits"/resourcespace-import-audit-*.csv | head -1)"
  cp "$latest_import_audit" "$album_audit"

  source_count="$(python3 - "$source_manifest" <<'PY'
import csv, sys
with open(sys.argv[1], newline="", encoding="utf-8") as handle:
    print(sum(1 for _ in csv.DictReader(handle)))
PY
)"
  audited_count="$(($(wc -l < "$album_audit") - 1))"
  if [ "$source_count" != "$audited_count" ]; then
    echo "FAIL: source count $source_count != audited count $audited_count for $album"
    exit 3
  fi

  rm -rf "$extract_dir"

  if [ "$DELETE_VERIFIED_ZIPS" = "1" ]; then
    rm "$zip"
    echo "    Deleted verified ZIP: $album_zip"
  else
    echo "    Kept ZIP because DELETE_VERIFIED_ZIPS=0"
  fi

  processed=$((processed + 1))
done 3< "$ORDER_FILE"

echo "Processed albums: $processed"
if [ "$DRY_RUN" = "1" ]; then
  echo "Dry run complete: no files extracted, staged, imported, deleted, or cleaned up."
  echo "Next: choose PROCESS_LIMIT, confirm free space, run make smoke, then use DRY_RUN=0 only when ready."
fi
