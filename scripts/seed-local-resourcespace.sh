#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_ROOT="${RESOURCE_ROOT:-$ROOT}"
STAMP="$(date +%Y%m%d-%H%M%S)"
SEED_JSON="$COMPOSE_ROOT/.runtime/resourcespace-local-seed.json"
ROLE_CREDS="$COMPOSE_ROOT/.runtime/local-role-credentials.txt"
API_ENV="$COMPOSE_ROOT/.runtime/resourcespace-local-api.env"
CONTAINER_SEED_JSON="/tmp/tjc-resourcespace-local-seed.json"
CONTAINER_SAMPLE_DIR="/tmp/tjc-local-sample-assets"
CONTAINER_AUDIT="/tmp/tjc-local-sample-import-$STAMP.csv"
CONTAINER_EXPORT="/tmp/tjc-local-metadata-export-$STAMP.csv"

cd "$ROOT"
SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-resourcespace-local-seed}" node scripts/safe-lane-headroom-guard.mjs

if [ ! -f "$COMPOSE_ROOT/docker-compose.yml" ]; then
  echo "FAIL: ResourceSpace compose root not found: $COMPOSE_ROOT"
  exit 1
fi

(cd "$COMPOSE_ROOT" && docker compose ps --status running --services) | grep -qx resourcespace || {
  echo "FAIL: ResourceSpace is not running. Run: make up"
  exit 1
}

mkdir -p "$COMPOSE_ROOT/.runtime" "$COMPOSE_ROOT/.runtime/audits" "$COMPOSE_ROOT/.runtime/exports"
touch "$SEED_JSON"
chmod 600 "$SEED_JSON" "$ROLE_CREDS" "$API_ENV" 2>/dev/null || true

if [ -s "$SEED_JSON" ]; then
  (cd "$COMPOSE_ROOT" && docker compose cp "$SEED_JSON" "resourcespace:$CONTAINER_SEED_JSON")
else
  (cd "$COMPOSE_ROOT" && docker compose exec -T resourcespace sh -lc "printf '{}' > '$CONTAINER_SEED_JSON'")
fi

(cd "$COMPOSE_ROOT" && docker compose cp "$ROOT/scripts/resourcespace-seed-local.php" resourcespace:/tmp/resourcespace-seed-local.php)
(cd "$COMPOSE_ROOT" && docker compose exec -T resourcespace php /tmp/resourcespace-seed-local.php "$CONTAINER_SEED_JSON") > "$SEED_JSON"
chmod 600 "$SEED_JSON"

node - "$SEED_JSON" "$ROLE_CREDS" "$API_ENV" <<'NODE'
const fs = require("node:fs");
const [seedPath, roleCredsPath, apiEnvPath] = process.argv.slice(2);
const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
const lines = [
  "ResourceSpace local test users",
  "URL=http://localhost:8088",
  `generated_at=${seed.generatedAt}`,
  "",
];
for (const row of seed.credentials) {
  lines.push(
    `[${row.role}]`,
    `group=${row.group}`,
    `group_ref=${row.group_ref}`,
    `username=${row.username}`,
    `password=${row.password}`,
    `user_ref=${row.user_ref}`,
    "",
  );
}
fs.writeFileSync(roleCredsPath, `${lines.join("\n")}\n`, { mode: 0o600 });
fs.writeFileSync(apiEnvPath, [
  "RESOURCESPACE_BASE_URL=http://localhost:8088",
  `RESOURCESPACE_API_USER=${seed.api.username}`,
  `RESOURCESPACE_API_KEY=${seed.api.key}`,
  "RESOURCESPACE_ENABLE_WRITEBACK=0",
  "RESOURCESPACE_WRITEBACK_MODE=queued",
  "",
].join("\n"), { mode: 0o600 });
NODE

SAMPLE_COUNT="$(
  cd "$COMPOSE_ROOT"
  docker compose exec -T resourcespace php -r 'include "/var/www/html/include/boot.php"; command_line_only(); $collection=(int) ps_value("SELECT ref value FROM collection WHERE name = ?", ["s", "Local DAM Sample Assets"], 0); if ($collection <= 0) { echo "0"; exit; } echo ps_value("SELECT COUNT(*) value FROM collection_resource WHERE collection = ?", ["i", $collection], 0);'
)"

if [ "${SAMPLE_COUNT:-0}" -eq 0 ]; then
  (cd "$COMPOSE_ROOT" && docker compose exec -T resourcespace rm -rf "$CONTAINER_SAMPLE_DIR")
  (cd "$COMPOSE_ROOT" && docker compose exec -T resourcespace mkdir -p "$CONTAINER_SAMPLE_DIR")
  (cd "$COMPOSE_ROOT" && docker compose exec -T resourcespace sh -lc "convert -size 1400x900 gradient:'#f7fbf8-#d8eadf' -gravity center -fill '#17463f' -font DejaVu-Sans-Bold -pointsize 58 -annotate 0 'TJC Sample\\nSabbath Worship' '$CONTAINER_SAMPLE_DIR/01-sabbath-worship-sample.jpg'")
  (cd "$COMPOSE_ROOT" && docker compose exec -T resourcespace sh -lc "convert -size 1400x900 xc:'#eef4f7' -fill '#0f3557' -draw 'rectangle 120,130 1280,770' -fill '#ffffff' -font DejaVu-Sans-Bold -pointsize 54 -gravity center -annotate 0 'TJC Sample\\nYouth Fellowship Review' '$CONTAINER_SAMPLE_DIR/02-youth-fellowship-review.png'")
  (cd "$COMPOSE_ROOT" && docker compose exec -T resourcespace sh -lc "convert -size 1400x900 gradient:'#fff7ec-#e7ebf2' -fill '#663b16' -font DejaVu-Sans-Bold -pointsize 54 -gravity center -annotate 0 'TJC Sample\\nWebsite Hero Candidate' '$CONTAINER_SAMPLE_DIR/03-website-hero-candidate.jpg'")

  (cd "$COMPOSE_ROOT" && docker compose cp "$ROOT/scripts/resourcespace-import-batch.php" resourcespace:/tmp/resourcespace-import-batch.php)
  (cd "$COMPOSE_ROOT" && docker compose exec -T resourcespace php /tmp/resourcespace-import-batch.php \
    "$CONTAINER_SAMPLE_DIR" \
    "$CONTAINER_AUDIT" \
    "Local DAM Sample Assets" \
    "Local DAM Sample Assets" \
    "" \
    "Local generated sample assets" \
    "local-seed@tjc-stock-media.local" \
    "Local DAM Sample Assets" \
    "")

  (cd "$COMPOSE_ROOT" && docker compose cp "resourcespace:$CONTAINER_AUDIT" "$COMPOSE_ROOT/.runtime/audits/resourcespace-local-sample-import-$STAMP.csv")
else
  echo "Local sample collection already has $SAMPLE_COUNT resource(s); skipping sample import."
fi

(cd "$COMPOSE_ROOT" && docker compose cp "$ROOT/scripts/resourcespace-seed-sample-state.php" resourcespace:/tmp/resourcespace-seed-sample-state.php)
(cd "$COMPOSE_ROOT" && docker compose exec -T resourcespace php /tmp/resourcespace-seed-sample-state.php "Local DAM Sample Assets" "Local Seed Reviewer" "$(date +%Y-%m-%d)")

(cd "$COMPOSE_ROOT" && docker compose cp "$ROOT/scripts/resourcespace-export-metadata.php" resourcespace:/tmp/resourcespace-export-metadata.php)
(cd "$COMPOSE_ROOT" && docker compose exec -T resourcespace php /tmp/resourcespace-export-metadata.php "$CONTAINER_EXPORT" 1)
(cd "$COMPOSE_ROOT" && docker compose cp "resourcespace:$CONTAINER_EXPORT" "$COMPOSE_ROOT/.runtime/exports/resourcespace-metadata-$STAMP.csv")

echo "ResourceSpace local seed complete."
echo "Role credentials stored at: $ROLE_CREDS"
echo "API env stored at: $API_ENV"
echo "Latest export: $COMPOSE_ROOT/.runtime/exports/resourcespace-metadata-$STAMP.csv"
echo "Live writeback remains disabled until API field map verification is completed."
