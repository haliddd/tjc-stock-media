#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-demo-check}" node scripts/safe-lane-headroom-guard.mjs

for required in \
  README.md \
  DESIGN.md \
  HANDOFF.md \
  STAKEHOLDER_DEMO.md \
  docs/launch-plan.md \
  docs/metadata-schema.md \
  docs/rights-workflow.md \
  docs/demo-script.md \
  docs/large-media-policy.md \
  docs/video-audio-policy.md \
  docs/ai-tagging-policy.md; do
  [ -f "$required" ] || { echo "FAIL: missing $required"; exit 1; }
done

./scripts/frontend-check.sh

for shot in \
  docs/screenshots/library-desktop.png \
  docs/screenshots/asset-detail-desktop.png \
  docs/screenshots/upload-desktop.png \
  docs/screenshots/review-desktop.png \
  docs/screenshots/library-mobile-320.png \
  docs/screenshots/detail-mobile-320.png; do
  if [ ! -f "$shot" ]; then
    echo "WARN: screenshot missing: $shot"
  fi
done

if ! rg -q "ResourceSpace remains" HANDOFF.md DESIGN.md STAKEHOLDER_DEMO.md; then
  echo "FAIL: source-of-truth boundary not documented"
  exit 1
fi

if ! rg -q "Viewer cannot" HANDOFF.md STAKEHOLDER_DEMO.md; then
  echo "FAIL: role safety expectations not documented"
  exit 1
fi

echo "Demo check complete."
