#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-frontend-check}" node scripts/safe-lane-headroom-guard.mjs

LOCK_DIR=".runtime/locks/frontend-check.lock"
mkdir -p ".runtime/locks"

while ! mkdir "$LOCK_DIR" 2>/dev/null; do
  if [ -f "$LOCK_DIR/pid" ]; then
    lock_pid="$(cat "$LOCK_DIR/pid" 2>/dev/null || true)"
    if [ -n "$lock_pid" ] && ! kill -0 "$lock_pid" 2>/dev/null; then
      rm -rf "$LOCK_DIR"
      continue
    fi
  fi
  echo "Waiting for another frontend check to finish..."
  sleep 2
done

printf '%s\n' "$$" > "$LOCK_DIR/pid"
cleanup_lock() {
  rm -rf "$LOCK_DIR"
}
trap cleanup_lock EXIT INT TERM

if [ ! -d frontend ]; then
  echo "FAIL: frontend directory missing"
  exit 1
fi

for required in \
  frontend/app/page.tsx \
  "frontend/app/assets/[id]/page.tsx" \
  frontend/app/upload/page.tsx \
  frontend/app/review/page.tsx \
  frontend/app/guide/page.tsx \
  frontend/app/api/assets/search/route.ts \
  "frontend/app/api/assets/[id]/route.ts" \
  frontend/app/api/upload/route.ts \
  frontend/app/api/review/route.ts \
  "frontend/app/api/download/[id]/route.ts"; do
  [ -f "$required" ] || { echo "FAIL: missing $required"; exit 1; }
done

if [ ! -d frontend/node_modules ]; then
  (cd frontend && npm install)
fi

(cd frontend && npm run typecheck)
node scripts/product-wide-parity-proof-test.mjs
rm -rf frontend/.next
node scripts/dev-server-build-guard.mjs
(cd frontend && npm run build)

[ -f frontend/.next/required-server-files.json ] || { echo "FAIL: Next production server manifest missing"; exit 1; }

if rg -n "RS_API_KEY|RS_API_USER|api_key|private key" frontend/app frontend/components >/tmp/tjc-frontend-secret-scan.txt; then
  echo "FAIL: possible client-side API secret exposure"
  cat /tmp/tjc-frontend-secret-scan.txt
  exit 1
fi

./scripts/git-hygiene-guard.mjs

if rg -n "comfyui|three.js|new Comfy|@react-three|three/examples" frontend Makefile >/tmp/tjc-forbidden-ui.txt; then
  echo "FAIL: forbidden generation/3D dependency reference found"
  cat /tmp/tjc-forbidden-ui.txt
  exit 1
fi

if rg -n 'Prefer assets marked `Approved Public`|Approved Public \| Safe for public|Approved Public means usable' docs README.md CONTEXT.md DESIGN.md HANDOFF.md STAKEHOLDER_DEMO.md scripts --glob '!scripts/frontend-check.sh' >/tmp/tjc-raw-status-drift.txt; then
  echo "FAIL: raw ResourceSpace status is described as portal reuse permission"
  cat /tmp/tjc-raw-status-drift.txt
  exit 1
fi

echo "Frontend check complete."
