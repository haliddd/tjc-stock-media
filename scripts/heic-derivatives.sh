#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="${1:-/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Imported/MVP 2024}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR="$ROOT/.runtime/heic-derivatives"
RUN_DIR="$OUT_DIR/$STAMP"
PLAN="$RUN_DIR/heic-derivative-plan.csv"
AUDIT="$RUN_DIR/heic-derivative-audit.csv"
CONTAINER_DIR="/tmp/tjc-heic-derivatives-$STAMP"
CONTAINER_PLAN="/tmp/tjc-heic-derivative-plan-$STAMP.csv"
CONTAINER_AUDIT="/tmp/tjc-heic-derivative-audit-$STAMP.csv"

cd "$ROOT"
SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-heic-derivatives}" node scripts/safe-lane-headroom-guard.mjs

if [ ! -d "$SOURCE_DIR" ]; then
  echo "FAIL: source directory not found: $SOURCE_DIR"
  exit 1
fi

command -v sips >/dev/null 2>&1 || {
  echo "FAIL: macOS sips is required for local HEIC to JPG conversion"
  exit 1
}

command -v jpegtran >/dev/null 2>&1 || {
  echo "FAIL: jpegtran is required to strip metadata from derivative JPGs"
  exit 1
}

docker compose ps --status running --services | grep -qx resourcespace || {
  echo "FAIL: ResourceSpace is not running. Run: make up"
  exit 1
}

mkdir -p "$RUN_DIR/derivatives"

docker compose cp scripts/resourcespace-heic-derivatives.php resourcespace:/tmp/resourcespace-heic-derivatives.php
docker compose exec -T resourcespace php /tmp/resourcespace-heic-derivatives.php plan "$CONTAINER_PLAN"
docker compose cp "resourcespace:$CONTAINER_PLAN" "$PLAN"

python3 - "$PLAN" "$SOURCE_DIR" "$RUN_DIR/derivatives" "$AUDIT" "$ROOT/.runtime/filestore" <<'PY'
import csv
import subprocess
import sys
from pathlib import Path

plan = Path(sys.argv[1])
source_dir = Path(sys.argv[2])
derivative_dir = Path(sys.argv[3])
audit = Path(sys.argv[4])
host_filestore = Path(sys.argv[5])

with plan.open(newline="") as src, audit.open("w", newline="") as out:
    reader = csv.DictReader(src)
    writer = csv.writer(out)
    writer.writerow(["resource_id", "original_filename", "source_file", "derivative_file", "status", "error"])
    for row in reader:
        resource_id = row["resource_id"]
        source_file = source_dir / row["source_basename"]
        if not source_file.exists() and row.get("resource_path", "").startswith("/var/www/html/filestore/"):
            source_file = host_filestore / row["resource_path"].removeprefix("/var/www/html/filestore/")
        derivative_file = derivative_dir / f"{resource_id}.jpg"
        temp_file = derivative_dir / f"{resource_id}.with-metadata.jpg"
        status = "converted"
        error = ""

        if not source_file.exists():
            status = "failed"
            error = "source file not found"
        else:
            result = subprocess.run(
                ["sips", "-s", "format", "jpeg", str(source_file), "--out", str(derivative_file)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
            )
            if result.returncode != 0:
                status = "failed"
                error = result.stderr.strip() or "sips conversion failed"
            else:
                temp_file.write_bytes(derivative_file.read_bytes())
                strip_result = subprocess.run(
                    ["jpegtran", "-copy", "none", "-outfile", str(derivative_file), str(temp_file)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.PIPE,
                    text=True,
                )
                temp_file.unlink(missing_ok=True)
                if strip_result.returncode != 0:
                    status = "failed"
                    error = strip_result.stderr.strip() or "jpegtran metadata strip failed"

        writer.writerow([resource_id, row["original_filename"], source_file, derivative_file, status, error])
PY

converted_count="$(awk -F, 'NR>1 && $5=="converted"{count++} END{print count+0}' "$AUDIT")"
planned_count="$(awk 'NR>1{count++} END{print count+0}' "$PLAN")"
if [ "$planned_count" -eq 0 ]; then
  echo "No HEIC resources currently need derivatives. Plan: $PLAN"
  exit 0
fi
if [ "$converted_count" -eq 0 ]; then
  echo "No HEIC derivatives converted. Audit: $AUDIT"
  exit 1
fi

docker compose exec -T resourcespace rm -rf "$CONTAINER_DIR"
docker compose exec -T resourcespace mkdir -p "$CONTAINER_DIR"
docker compose cp "$RUN_DIR/derivatives/." "resourcespace:$CONTAINER_DIR"
docker compose exec -T resourcespace php /tmp/resourcespace-heic-derivatives.php attach "$CONTAINER_DIR" "$CONTAINER_AUDIT"
docker compose cp "resourcespace:$CONTAINER_AUDIT" "$RUN_DIR/resourcespace-heic-attach-audit.csv"

echo "HEIC derivative plan: $PLAN"
echo "HEIC conversion audit: $AUDIT"
echo "ResourceSpace attach audit: $RUN_DIR/resourcespace-heic-attach-audit.csv"
