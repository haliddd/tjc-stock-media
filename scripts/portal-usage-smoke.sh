#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4871}"
USAGE_ANALYTICS_DB_PATH="${USAGE_ANALYTICS_DB_PATH:-$(pwd)/.runtime/analytics/portal-usage.sqlite}"
CURL_MAX_TIME="${PORTAL_USAGE_SMOKE_CURL_MAX_TIME:-30}"
MARKER="usage-smoke-$(date -u +%Y%m%dT%H%M%SZ)-$$"
SMOKE_STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/portal-smoke-trusted-identity.sh"
export USAGE_ANALYTICS_DB_PATH MARKER SMOKE_STARTED_AT

TMP_DIR="$(mktemp -d)"
cleanup() {
  node <<'NODE' >/dev/null 2>&1 || true
const { DatabaseSync } = require("node:sqlite");
const file = process.env.USAGE_ANALYTICS_DB_PATH;
const marker = process.env.MARKER;
if (!file || !marker) process.exit(0);
const db = new DatabaseSync(file);
db.prepare("DELETE FROM usage_events WHERE role = ? AND metadata_json LIKE ?").run("Root", `%${marker}%`);
db.close();
NODE
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

http_code() {
  local output="$1"
  shift
  portal_smoke_http_code "$output" "$@"
}

expect_code() {
  local expected="$1"
  local label="$2"
  shift 2
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}"
  local code
  code="$(http_code "$output" "$@")"
  if [ "$code" != "$expected" ]; then
    echo "FAIL: $label expected $expected got $code"
    cat "$output"
    exit 1
  fi
  echo "PASS: $label"
}

expect_any_code() {
  local allowed="$1"
  local label="$2"
  shift 2
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}"
  local code
  code="$(http_code "$output" "$@")"
  case " $allowed " in
    *" $code "*) echo "PASS: $label ($code)" ;;
    *)
      echo "FAIL: $label expected one of [$allowed] got $code"
      cat "$output"
      exit 1
      ;;
  esac
}

select_json_value() {
  local label="$1"
  local script="$2"
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}.json"
  shift 2
  local code
  code="$(http_code "$output" "$@")"
  if [ "$code" != "200" ]; then
    echo "FAIL: $label expected 200 got $code" >&2
    cat "$output" >&2
    return 1
  fi
  local value
  if ! value="$(node -e "$script" < "$output")"; then
    cat "$output" >&2
    return 1
  fi
  if [ -z "$value" ]; then
    echo "FAIL: $label returned an empty value" >&2
    cat "$output" >&2
    return 1
  fi
  echo "PASS: selected $label=$value" >&2
  printf '%s\n' "$value"
}

first_asset_id_script='
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const asset = (Array.isArray(data.assets) ? data.assets : []).find((item) => item && item.id);
if (!asset) {
  console.error("FAIL: no asset id found in API response");
  process.exit(1);
}
console.log(asset.id);
'

blocked_asset_id_script='
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const asset = (Array.isArray(data.assets) ? data.assets : []).find((item) => item && item.id && (!item.reuseDecision || item.reuseDecision.downloadable !== true));
if (!asset) {
  console.error("FAIL: no blocked/non-downloadable asset id found in API response");
  process.exit(1);
}
console.log(asset.id);
'

ASSET_VIEW_ID="$(select_json_value usage-asset-view-id "$first_asset_id_script" \
  "$BASE_URL/api/assets/search?role=Reviewer&q=Bible&limit=5")"

if ! BLOCKED_DOWNLOAD_ID="$(select_json_value usage-blocked-download-id "$blocked_asset_id_script" \
  "$BASE_URL/api/assets/search?role=Reviewer&view=needs-review&limit=25")"; then
  BLOCKED_DOWNLOAD_ID="$(select_json_value usage-blocked-download-fallback-id "$blocked_asset_id_script" \
    "$BASE_URL/api/assets/search?role=Reviewer&limit=50")"
fi

REVIEW_ASSET_ID="$(select_json_value usage-review-asset-id "$first_asset_id_script" \
  "$BASE_URL/api/review?role=Reviewer&queue=pending")"

node <<'NODE'
const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const file = process.env.USAGE_ANALYTICS_DB_PATH;
if (!file) process.exit(0);
fs.mkdirSync(path.dirname(file), { recursive: true });
const db = new DatabaseSync(file);
db.exec(`
  CREATE TABLE IF NOT EXISTS usage_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL,
    type TEXT NOT NULL,
    role TEXT NOT NULL,
    actor TEXT,
    asset_id TEXT,
    resource_space_id TEXT,
    route TEXT,
    query TEXT,
    metadata_json TEXT
  );
`);
db.prepare(`
  INSERT INTO usage_events (created_at, type, role, actor, asset_id, resource_space_id, route, query, metadata_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  new Date().toISOString(),
  "search",
  "Root",
  "",
  "../private-asset",
  "../private-resource",
  "javascript:alert(1)",
  "../private-query",
  JSON.stringify({ smokeMarker: process.env.MARKER, "../private": "../private" })
);
db.prepare(`
  INSERT INTO usage_events (created_at, type, role, actor, asset_id, resource_space_id, route, query, metadata_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  new Date().toISOString(),
  "asset_view",
  "Root",
  "",
  "../private-asset",
  "../private-resource",
  "javascript:alert(1)",
  "ignored",
  JSON.stringify({ smokeMarker: process.env.MARKER, "../private": "../private" })
);
db.prepare(`
  INSERT INTO usage_events (created_at, type, role, actor, asset_id, resource_space_id, route, query, metadata_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  new Date().toISOString(),
  "search",
  "Root",
  "",
  "master drive asset",
  "checksum resource",
  "/review/source path",
  "source path handoff",
  JSON.stringify({ smokeMarker: process.env.MARKER, "source path": "master drive checksum" })
);
db.prepare(`
  INSERT INTO usage_events (created_at, type, role, actor, asset_id, resource_space_id, route, query, metadata_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  new Date().toISOString(),
  "asset_view",
  "Root",
  "",
  "master-drive-checksum",
  "review-resource",
  "/library/master drive",
  "ignored",
  JSON.stringify({ smokeMarker: process.env.MARKER, "review note": "checksum ready" })
);
db.prepare(`
  INSERT INTO usage_events (created_at, type, role, actor, asset_id, resource_space_id, route, query, metadata_json)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  new Date().toISOString(),
  "search",
  "Root",
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  "/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  JSON.stringify({ smokeMarker: process.env.MARKER, "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" })
);
db.close();
NODE

expect_code 200 usage-search \
  "$BASE_URL/api/assets/search?role=Reviewer&q=$MARKER&limit=1"

expect_code 200 usage-asset-view \
  "$BASE_URL/api/assets/$ASSET_VIEW_ID?role=Reviewer"

expect_any_code "403 404" usage-download-gate \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Reviewer\",\"termsAccepted\":true,\"usageChannel\":\"Usage smoke\",\"reason\":\"$MARKER\"}" \
  "$BASE_URL/api/download/$BLOCKED_DOWNLOAD_ID"

expect_any_code "200 202" usage-review-action \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Reviewer\",\"id\":\"$REVIEW_ASSET_ID\",\"action\":\"Request More Info\",\"notes\":\"Usage workflow review action $MARKER\",\"checklist\":{\"sourceConfirmed\":true,\"rightsConfirmed\":true,\"peopleVisibilityConfirmed\":true,\"childrenYouthChecked\":true,\"usageScopeSelected\":true},\"reviewerName\":\"Usage Workflow Reviewer\"}" \
  "$BASE_URL/api/review"

expect_code 200 usage-brand-kit \
  "$BASE_URL/api/brand-kits/mvp-2024?role=Reviewer"

node <<'NODE'
const { DatabaseSync } = require("node:sqlite");
const file = process.env.USAGE_ANALYTICS_DB_PATH;
const marker = process.env.MARKER;
const db = new DatabaseSync(file, { readOnly: true });
const rows = db.prepare(`
  SELECT type, role, actor, asset_id AS assetId, route, query, metadata_json AS metadataJson
  FROM usage_events
  WHERE created_at >= ?
  ORDER BY id DESC
  LIMIT 200
`).all(process.env.SMOKE_STARTED_AT);
db.close();

const requiredCategories = {
  search: (row) => row.type === "search" || row.type === "search_query" || row.type === "search_zero_result",
  asset_view: (row) => row.type === "asset_view" || row.type === "asset_open",
  download_gate: (row) => row.type === "download_gate",
  review_action: (row) => row.type === "review_action",
  brand_kit_view: (row) => row.type === "brand_kit_view"
};
const missingCategories = Object.entries(requiredCategories)
  .filter(([, matches]) => !rows.some(matches))
  .map(([category]) => category);
if (missingCategories.length) {
  console.error(`FAIL: usage analytics missing event categories: ${missingCategories.join(", ")}`);
  process.exit(1);
}
const search = rows.find((row) => requiredCategories.search(row) && row.query === marker);
if (!search) {
  console.error(`FAIL: usage analytics missing search marker ${marker}`);
  process.exit(1);
}
const badActor = rows
  .filter((row) => Object.values(requiredCategories).some((matches) => matches(row)))
  .filter((row) => row.role !== "Root")
  .find((row) => typeof row.actor !== "string" || !row.actor.length);
if (badActor) {
  console.error(`FAIL: usage analytics event missing actor: ${JSON.stringify(badActor)}`);
  process.exit(1);
}
console.log(`PASS: usage analytics recorded ${Object.keys(requiredCategories).join(", ")} at ${file}`);
NODE

expect_json_status() {
  local expected="$1"
  local label="$2"
  local script="$3"
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}.json"
  shift 3
  local code
  code="$(http_code "$output" "$@")"
  if [ "$code" != "$expected" ]; then
    echo "FAIL: $label expected $expected got $code"
    cat "$output"
    exit 1
  fi
  node -e "$script" < "$output"
  echo "PASS: $label"
}

expect_json_status 200 usage-analytics-payload-sanitized '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data.usageAnalytics || {});
if (/private|Root|javascript:|source path|master drive|checksum|[a-f0-9]{32,}/i.test(text)) {
  console.error(`FAIL: unsafe usage analytics labels leaked to Reviewer payload: ${text.slice(0, 700)}`);
  process.exit(1);
}
if (!Array.isArray(data.usageAnalytics?.topSearches) || !Array.isArray(data.usageAnalytics?.topAssets) || !Array.isArray(data.usageAnalytics?.dailyEvents)) {
  console.error(`FAIL: usage analytics payload missing metric arrays: ${JSON.stringify(data.usageAnalytics).slice(0, 500)}`);
  process.exit(1);
}
' "$BASE_URL/api/assets/search?role=Reviewer&q=$MARKER&limit=1"

echo "Portal usage analytics smoke complete."
