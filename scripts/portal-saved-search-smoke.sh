#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4871}"
CURL_MAX_TIME="${PORTAL_SAVED_SEARCH_SMOKE_CURL_MAX_TIME:-30}"
MARKER="saved-search-smoke-$(date -u +%Y%m%dT%H%M%SZ)-$$"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/portal-smoke-trusted-identity.sh"
TMP_DIR="$(mktemp -d)"
cleanup() {
  MARKER="$MARKER" node <<'NODE' >/dev/null 2>&1 || true
const fs = require("fs");
const path = require("path");
const marker = process.env.MARKER;
const filePath = path.join(process.cwd(), "data", "runtime", "saved-searches.json");
if (!marker || !fs.existsSync(filePath)) process.exit(0);
const rows = JSON.parse(fs.readFileSync(filePath, "utf8"));
const kept = Array.isArray(rows) ? rows.filter((row) => !JSON.stringify(row).includes(marker)) : rows;
fs.writeFileSync(filePath, `${JSON.stringify(kept, null, 2)}\n`);
NODE
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

http_code() {
  local output="$1"
  shift
  portal_smoke_http_code "$output" "$@"
}

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

search_id="search-$MARKER"
unsafe_query_search_id="search-unsafe-query-$MARKER"
stale_search_id="stale-search-$MARKER"
private_creator_search_id="private-creator-search-$MARKER"
local_runtime_probe=0
case "$BASE_URL" in
  http://localhost:*|http://127.0.0.1:*) local_runtime_probe=1 ;;
esac

expect_json_status 403 saved-search-viewer-list-denied '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/Contributor|Reviewer|DAM Admin/i.test(data.error || "")) {
  console.error(`FAIL: viewer saved search list denial copy invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' "$BASE_URL/api/saved-searches?role=Viewer"

expect_json_status 403 saved-search-viewer-save-denied '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/Contributor|Reviewer|DAM Admin/i.test(data.error || "")) {
  console.error(`FAIL: viewer saved search save denial copy invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d "{\"id\":\"$search_id\",\"title\":\"Viewer should not save\",\"query\":\"Bible\"}" \
  "$BASE_URL/api/saved-searches?role=Viewer"

expect_json_status 400 saved-search-empty-blocked '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/query|saved view|collection|filter/i.test(data.error || "")) {
  console.error(`FAIL: empty saved search was not rejected clearly: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d '{"title":"Empty search"}' \
  "$BASE_URL/api/saved-searches?role=Contributor"

SEARCH_ID="$search_id" expect_json_status 200 saved-search-contributor-save-sanitized '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const id = process.env.SEARCH_ID;
if (data.ok !== true || data.storageMode !== "local-json" || data.search?.id !== id) {
  console.error(`FAIL: saved search save shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
if (data.search.createdBy !== "Contributor" || data.search.role !== "Contributor") {
  console.error(`FAIL: saved search missing actor/role: ${JSON.stringify(data.search).slice(0, 500)}`);
  process.exit(1);
}
if (/local-beta:|sso:|@/i.test(data.search.createdBy || "")) {
  console.error(`FAIL: saved search save response leaked creator identity: ${JSON.stringify(data.search).slice(0, 500)}`);
  process.exit(1);
}
if (data.search.view || data.search.filters.includes("../private") || data.search.filters.some((filter) => /^[a-f0-9]{32,}$/i.test(filter)) || data.search.filters.length !== new Set(data.search.filters).size) {
  console.error(`FAIL: saved search fields were not sanitized/deduped: ${JSON.stringify(data.search).slice(0, 500)}`);
  process.exit(1);
}
if (JSON.stringify(data.search).includes("../private") || /source path|master drive|checksum/i.test(JSON.stringify(data.search))) {
  console.error(`FAIL: saved search save echoed unsafe field labels: ${JSON.stringify(data.search).slice(0, 700)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d "{\"id\":\"$search_id\",\"title\":\"$MARKER Bible search\",\"query\":\"Bible\",\"view\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"collection\":\"master drive set\",\"filters\":[\"portal ready\",\"portal ready\",\"../private\",\"source path\",\"master drive\",\"checksum\",\"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\"],\"sort\":\"A-Z\"}" \
  "$BASE_URL/api/saved-searches?role=Contributor"

UNSAFE_QUERY_SEARCH_ID="$unsafe_query_search_id" expect_json_status 200 saved-search-query-title-sanitized '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const id = process.env.UNSAFE_QUERY_SEARCH_ID;
const text = JSON.stringify(data.search || {});
if (data.ok !== true || data.search?.id !== id || data.search?.query || data.search?.title !== "portal ready" || !data.search?.filters?.includes("portal ready")) {
  console.error(`FAIL: unsafe saved search query/title were not sanitized into safe filter fallback: ${text.slice(0, 700)}`);
  process.exit(1);
}
if (text.includes("../private") || /source path|master drive|checksum/i.test(text) || /[a-f0-9]{32,}/i.test(text)) {
  console.error(`FAIL: saved search echoed unsafe query/title: ${text.slice(0, 700)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d "{\"id\":\"$unsafe_query_search_id\",\"title\":\"cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc\",\"query\":\"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd\",\"filters\":[\"portal ready\"]}" \
  "$BASE_URL/api/saved-searches?role=Contributor"

if [ "$local_runtime_probe" = "1" ]; then
  STALE_SEARCH_ID="$stale_search_id" PRIVATE_CREATOR_SEARCH_ID="$private_creator_search_id" node <<'NODE'
const fs = require("fs");
const path = require("path");
const filePath = path.join(process.cwd(), "data", "runtime", "saved-searches.json");
fs.mkdirSync(path.dirname(filePath), { recursive: true });
const existing = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : [];
const filler = Array.from({ length: 260 }, (_, index) => ({
  id: `${process.env.STALE_SEARCH_ID}-filler-${index}`,
  title: `Oversized local-json filler ${index}`,
  query: "Bible",
  filters: ["portal ready"],
  sort: "Newest",
  createdAt: `2000-01-01T00:${String(index % 60).padStart(2, "0")}:00.000Z`,
  updatedAt: `2000-01-01T00:${String(index % 60).padStart(2, "0")}:00.000Z`,
  createdBy: "saved-search-smoke:filler",
  role: "Reviewer",
  storageMode: "local-json"
}));
existing.unshift({
  id: process.env.PRIVATE_CREATOR_SEARCH_ID,
  title: "Reviewer beta pick",
  query: "Bible",
  filters: ["portal ready"],
  sort: "Newest",
  createdAt: "2030-01-02T00:00:00.000Z",
  updatedAt: "2030-01-02T00:00:00.000Z",
  createdBy: "sso:reviewer@example.org",
  role: "Reviewer",
  storageMode: "local-json"
}, {
  id: `source path stale id ${process.env.STALE_SEARCH_ID}`,
  title: "portal ready",
  query: "Bible",
  filters: ["portal ready"],
  sort: "Newest",
  createdAt: "2030-01-01T00:00:00.000Z",
  updatedAt: "2030-01-01T00:00:00.000Z",
  createdBy: "saved-search-smoke:unsafe-id",
  role: "Reviewer",
  storageMode: "local-json"
}, {
  id: process.env.STALE_SEARCH_ID,
  title: "../private source path",
  query: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  view: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  collection: "master drive set",
  filters: ["portal ready", "../private", "portal ready", "source path", "master drive", "checksum", "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"],
  sort: "unsafe-sort",
  createdAt: "not-a-date",
  updatedAt: "2030-01-01T00:00:00.000Z",
  createdBy: "source path actor",
  role: "Viewer",
  storageMode: "local-json"
}, ...filler);
fs.writeFileSync(filePath, `${JSON.stringify(existing, null, 2)}\n`);
NODE
fi

stale_search_probe_id=""
private_creator_probe_id=""
if [ "$local_runtime_probe" = "1" ]; then
  stale_search_probe_id="$stale_search_id"
  private_creator_probe_id="$private_creator_search_id"
fi

if [ "$local_runtime_probe" = "1" ]; then
  PRIVATE_CREATOR_SEARCH_ID="$private_creator_search_id" expect_json_status 200 saved-search-contributor-list-scrubs-creator '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const id = process.env.PRIVATE_CREATOR_SEARCH_ID;
const record = (data.searches || []).find((item) => item.id === id);
if (!record) {
  console.error(`FAIL: seeded private creator saved search missing from Contributor list: ${JSON.stringify({ id, count: data.count }).slice(0, 500)}`);
  process.exit(1);
}
const text = JSON.stringify(record);
if (record.createdBy !== "Reviewer" || /sso:|reviewer@example\.org|@example\.org/i.test(text)) {
  console.error(`FAIL: saved search contributor list leaked creator identity: ${text.slice(0, 700)}`);
  process.exit(1);
}
' "$BASE_URL/api/saved-searches?role=Contributor"
fi

SEARCH_ID="$search_id" UNSAFE_QUERY_SEARCH_ID="$unsafe_query_search_id" STALE_SEARCH_ID="$stale_search_probe_id" PRIVATE_CREATOR_SEARCH_ID="$private_creator_probe_id" expect_json_status 200 saved-search-reviewer-list-visible '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const id = process.env.SEARCH_ID;
const unsafeQueryId = process.env.UNSAFE_QUERY_SEARCH_ID;
const staleId = process.env.STALE_SEARCH_ID;
const privateCreatorId = process.env.PRIVATE_CREATOR_SEARCH_ID;
if (!Array.isArray(data.searches) || data.storageMode !== "local-json") {
  console.error(`FAIL: saved search list shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
if (data.count > 250 || data.searches.length > 250) {
  console.error(`FAIL: saved search local-json list was not capped: ${JSON.stringify({ count: data.count, length: data.searches.length })}`);
  process.exit(1);
}
const record = data.searches.find((item) => item.id === id);
if (!record || record.storageMode !== "local-json" || record.query !== "Bible") {
  console.error(`FAIL: saved search not visible to Reviewer: ${JSON.stringify({ id, count: data.count, record }).slice(0, 500)}`);
  process.exit(1);
}
const unsafeQueryRecord = data.searches.find((item) => item.id === unsafeQueryId);
if (!unsafeQueryRecord || unsafeQueryRecord.query || unsafeQueryRecord.title !== "portal ready") {
  console.error(`FAIL: unsafe query/title saved search was not normalized in list: ${JSON.stringify({ unsafeQueryId, unsafeQueryRecord }).slice(0, 500)}`);
  process.exit(1);
}
if (staleId) {
  const stale = data.searches.find((item) => item.id === staleId);
  if (!stale || stale.query || stale.title !== "portal ready" || stale.createdBy !== "local-beta:unknown" || stale.view || stale.collection || stale.filters.includes("../private") || stale.filters.some((filter) => /^[a-f0-9]{32,}$/i.test(filter)) || stale.filters.length !== new Set(stale.filters).size || stale.sort !== "Approved first" || stale.role === "Viewer") {
    console.error(`FAIL: persisted unsafe saved search was not normalized: ${JSON.stringify(stale).slice(0, 500)}`);
    process.exit(1);
  }
}
if (privateCreatorId) {
  const privateCreator = data.searches.find((item) => item.id === privateCreatorId);
  if (!privateCreator || privateCreator.createdBy !== "sso:reviewer@example.org") {
    console.error(`FAIL: Reviewer saved search list lost creator audit identity: ${JSON.stringify(privateCreator).slice(0, 500)}`);
    process.exit(1);
  }
}
const text = JSON.stringify(data.searches);
if (text.includes("../private") || /source[- ]path|master[- ]drive|checksum/i.test(text) || /[a-f0-9]{32,}/i.test(text)) {
  console.error(`FAIL: saved search list leaked unsafe labels: ${text.slice(0, 700)}`);
  process.exit(1);
}
' "$BASE_URL/api/saved-searches?role=Reviewer"

expect_json_status 200 saved-search-readiness-reports-storage '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const item = (data.integrationReadiness || []).find((entry) => entry.id === "saved-search-storage");
if (!item) {
  console.error("FAIL: admin readiness missing saved-search-storage item");
  process.exit(1);
}
if (!/local-json/i.test(item.detail || "") || !/wider rollout/i.test(item.detail || "")) {
  console.error(`FAIL: saved search readiness detail weak: ${JSON.stringify(item)}`);
  process.exit(1);
}
' "$BASE_URL/api/admin/readiness?role=DAM%20Admin"

echo "Portal saved search smoke complete."
