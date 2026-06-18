#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-approve-mvp-batch}" node scripts/safe-lane-headroom-guard.mjs

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_DIR=".runtime/audits"
mkdir -p "$OUT_DIR"

BATCH="${1:-MVP 2024 First Batch}"
REVIEWER="${2:-ResourceSpace admin}"
REVIEW_DATE="${3:-$(date +%F)}"
MIN_REF="${4:-363}"
RIGHTS_STATUS="${5:-Permission Confirmed}"
PORTAL_CONFIRMATION="${6:-}"
AUDIT="/tmp/tjc-mvp-approval-audit-$STAMP.csv"
DEST="$OUT_DIR/approval-audit-$STAMP.csv"

if [ "$PORTAL_CONFIRMATION" != "portal-ready-confirmed" ]; then
  echo "FAIL: batch approval requires sixth argument: portal-ready-confirmed"
  echo "Only use after source, rights, people/minors, reviewer/date, usage scope, and derivative checks pass."
  exit 1
fi

docker compose cp scripts/resourcespace-approve-batch.php resourcespace:/tmp/resourcespace-approve-batch.php
docker compose exec -T resourcespace php /tmp/resourcespace-approve-batch.php "$BATCH" "$REVIEWER" "$REVIEW_DATE" "$AUDIT" "$MIN_REF" "$RIGHTS_STATUS" "$PORTAL_CONFIRMATION"
docker compose cp "resourcespace:$AUDIT" "$DEST"

echo "Approval audit: $DEST"
