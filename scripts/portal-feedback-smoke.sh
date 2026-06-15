#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4871}"
CURL_MAX_TIME="${PORTAL_FEEDBACK_SMOKE_CURL_MAX_TIME:-30}"
MARKER="feedback-smoke-$(date -u +%Y%m%dT%H%M%SZ)-$$"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/portal-smoke-trusted-identity.sh"
TMP_DIR="$(mktemp -d)"
cleanup() {
  MARKER="$MARKER" node <<'NODE' >/dev/null 2>&1 || true
const fs = require("fs");
const path = require("path");
const marker = process.env.MARKER;
const filePath = path.join(process.cwd(), "data", "runtime", "beta-feedback.json");
if (!marker || !fs.existsSync(filePath)) process.exit(0);
const rows = JSON.parse(fs.readFileSync(filePath, "utf8"));
const kept = Array.isArray(rows) ? rows.filter((row) => !JSON.stringify(row).includes(marker)) : rows;
fs.writeFileSync(filePath, `${JSON.stringify(kept, null, 2)}\n`);
NODE
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT
local_runtime_probe=0
case "$BASE_URL" in
  http://localhost:*|http://127.0.0.1:*) local_runtime_probe=1 ;;
esac

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

select_json_status() {
  local expected="$1"
  local label="$2"
  local script="$3"
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}.json"
  shift 3
  local code
  code="$(http_code "$output" "$@")"
  if [ "$code" != "$expected" ]; then
    echo "FAIL: $label expected $expected got $code" >&2
    cat "$output" >&2
    return 1
  fi
  node -e "$script" < "$output"
}

feedback_id="$(select_json_status 200 feedback-submit '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== true || !data.id || !data.createdAt) {
  console.error(`FAIL: feedback submit shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
console.log(data.id);
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Viewer\",\"route\":\"/\",\"task\":\"Feedback smoke\",\"severity\":\"medium\",\"expected\":\"Feedback should save and appear in DAM Admin inbox.\",\"actual\":\"$MARKER submitted through smoke.\",\"browser\":\"portal-feedback-smoke\",\"device\":\"CLI\"}" \
  "$BASE_URL/api/beta-feedback")"
echo "PASS: feedback-submit"

unsafe_link_feedback_id="$(select_json_status 200 feedback-submit-unsafe-screenshot-link '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== true || !data.id || !data.createdAt) {
  console.error(`FAIL: unsafe screenshot feedback submit shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
console.log(data.id);
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Viewer\",\"route\":\"/\",\"task\":\"Feedback unsafe screenshot link smoke\",\"severity\":\"low\",\"expected\":\"Unsafe screenshot links should be dropped before persistence.\",\"actual\":\"$MARKER unsafe screenshot link submitted.\",\"screenshotLink\":\"javascript:alert(1)\"}" \
  "$BASE_URL/api/beta-feedback")"
echo "PASS: feedback-submit-unsafe-screenshot-link"

unsafe_private_link_feedback_id="$(select_json_status 200 feedback-submit-unsafe-private-screenshot-link '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== true || !data.id || !data.createdAt) {
  console.error(`FAIL: private-label screenshot feedback submit shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
console.log(data.id);
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Viewer\",\"route\":\"/\",\"task\":\"Feedback unsafe private screenshot link smoke\",\"severity\":\"low\",\"expected\":\"Private-label screenshot links should be dropped before persistence.\",\"actual\":\"$MARKER unsafe private screenshot link submitted.\",\"screenshotLink\":\"https://example.test/source path/master drive/checksum.png\"}" \
  "$BASE_URL/api/beta-feedback")"
echo "PASS: feedback-submit-unsafe-private-screenshot-link"

unsafe_checksum_link_feedback_id="$(select_json_status 200 feedback-submit-unsafe-checksum-screenshot-link '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== true || !data.id || !data.createdAt) {
  console.error(`FAIL: checksum-label screenshot feedback submit shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
console.log(data.id);
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Viewer\",\"route\":\"/\",\"task\":\"Feedback unsafe private-token screenshot link smoke\",\"severity\":\"low\",\"expected\":\"Screenshot links should be sanitized.\",\"actual\":\"$MARKER unsafe screenshot link submitted.\",\"screenshotLink\":\"https://example.test/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.png\"}" \
  "$BASE_URL/api/beta-feedback")"
echo "PASS: feedback-submit-unsafe-checksum-screenshot-link"

unsafe_route_feedback_id="$(select_json_status 200 feedback-submit-unsafe-route '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== true || !data.id || !data.createdAt) {
  console.error(`FAIL: unsafe route feedback submit shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
console.log(data.id);
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Viewer\",\"route\":\"/../private-source-path\",\"task\":\"Feedback unsafe route smoke\",\"severity\":\"low\",\"expected\":\"Unsafe route should be normalized before persistence.\",\"actual\":\"$MARKER unsafe route submitted.\"}" \
  "$BASE_URL/api/beta-feedback")"
echo "PASS: feedback-submit-unsafe-route"

unsafe_checksum_route_feedback_id="$(select_json_status 200 feedback-submit-unsafe-checksum-route '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== true || !data.id || !data.createdAt) {
  console.error(`FAIL: checksum route feedback submit shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
console.log(data.id);
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Viewer\",\"route\":\"/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"task\":\"Feedback unsafe private-token route smoke\",\"severity\":\"low\",\"expected\":\"Private-token route should be normalized before persistence.\",\"actual\":\"$MARKER unsafe route submitted.\"}" \
  "$BASE_URL/api/beta-feedback")"
echo "PASS: feedback-submit-unsafe-checksum-route"

unsafe_text_feedback_id="$(select_json_status 200 feedback-submit-unsafe-text '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== true || !data.id || !data.createdAt) {
  console.error(`FAIL: unsafe text feedback submit shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
console.log(data.id);
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Viewer\",\"route\":\"/\",\"task\":\"source path feedback\",\"severity\":\"low\",\"expected\":\"Feedback should keep safe fields only.\",\"actual\":\"$MARKER unsafe text submitted.\",\"reporterName\":\"master drive reporter\",\"browser\":\"checksum browser\",\"device\":\"source path device\",\"viewport\":\"master drive viewport\"}" \
  "$BASE_URL/api/beta-feedback")"
echo "PASS: feedback-submit-unsafe-text"

unsafe_checksum_text_feedback_id="$(select_json_status 200 feedback-submit-unsafe-checksum-text '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== true || !data.id || !data.createdAt) {
  console.error(`FAIL: checksum text feedback submit shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
console.log(data.id);
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Viewer\",\"route\":\"/\",\"task\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"severity\":\"low\",\"expected\":\"Feedback should keep safe required fields.\",\"actual\":\"$MARKER unsafe private-token text submitted.\",\"reporterName\":\"dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd\",\"browser\":\"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee\",\"device\":\"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff\",\"viewport\":\"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef\"}" \
  "$BASE_URL/api/beta-feedback")"
echo "PASS: feedback-submit-unsafe-checksum-text"

stale_feedback_id="stale-feedback-$MARKER"
if [ "$local_runtime_probe" = "1" ]; then
  STALE_FEEDBACK_ID="$stale_feedback_id" node <<'NODE'
const fs = require("fs");
const path = require("path");
const filePath = path.join(process.cwd(), "data", "runtime", "beta-feedback.json");
fs.mkdirSync(path.dirname(filePath), { recursive: true });
const existing = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath, "utf8")) : [];
const filler = Array.from({ length: 510 }, (_, index) => ({
  id: `${process.env.STALE_FEEDBACK_ID}-filler-${index}`,
  createdAt: `2000-01-01T00:${String(index % 60).padStart(2, "0")}:00.000Z`,
  updatedAt: `2000-01-01T00:${String(index % 60).padStart(2, "0")}:00.000Z`,
  role: "Viewer",
  route: "/",
  task: `Oversized local-json feedback filler ${index}`,
  severity: "low",
  expected: "Local private beta feedback remains bounded.",
  actual: "Filler record for cap probe.",
  status: "fixed",
  storageMode: "local-json",
  actor: "feedback-smoke:filler"
}));
existing.unshift({
  id: process.env.STALE_FEEDBACK_ID,
  createdAt: "2030-01-01T00:00:00.000Z",
  updatedAt: "not-a-date",
  role: "Root",
  route: "/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  task: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  severity: "urgent",
  expected: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  actual: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  status: "done",
  notes: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  reporterName: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
  browser: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  device: "1111111111111111111111111111111111111111111111111111111111111111",
  viewport: "2222222222222222222222222222222222222222222222222222222222222222",
  attachmentUrl: "https://example.test/3333333333333333333333333333333333333333333333333333333333333333.png",
  storageMode: "filesystem",
  actor: "4444444444444444444444444444444444444444444444444444444444444444"
}, ...filler);
fs.writeFileSync(filePath, `${JSON.stringify(existing, null, 2)}\n`);
NODE
fi

expect_json_status 400 feedback-submit-invalid-severity '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!Array.isArray(data.missing) || !data.missing.includes("severity")) {
  console.error(`FAIL: invalid feedback severity did not report missing severity: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Viewer\",\"route\":\"/\",\"task\":\"Feedback smoke invalid\",\"severity\":\"urgent\",\"expected\":\"Invalid severity should be rejected.\",\"actual\":\"$MARKER invalid severity.\"}" \
  "$BASE_URL/api/beta-feedback"

expect_json_status 403 feedback-viewer-inbox-denied '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/DAM Admin/i.test(data.error || "")) {
  console.error(`FAIL: viewer denial copy invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' "$BASE_URL/api/beta-feedback?role=Viewer"

stale_feedback_probe_id=""
if [ "$local_runtime_probe" = "1" ]; then
  stale_feedback_probe_id="$stale_feedback_id"
fi

FEEDBACK_ID="$feedback_id" UNSAFE_LINK_FEEDBACK_ID="$unsafe_link_feedback_id" UNSAFE_PRIVATE_LINK_FEEDBACK_ID="$unsafe_private_link_feedback_id" UNSAFE_CHECKSUM_LINK_FEEDBACK_ID="$unsafe_checksum_link_feedback_id" UNSAFE_ROUTE_FEEDBACK_ID="$unsafe_route_feedback_id" UNSAFE_CHECKSUM_ROUTE_FEEDBACK_ID="$unsafe_checksum_route_feedback_id" UNSAFE_TEXT_FEEDBACK_ID="$unsafe_text_feedback_id" UNSAFE_CHECKSUM_TEXT_FEEDBACK_ID="$unsafe_checksum_text_feedback_id" STALE_FEEDBACK_ID="$stale_feedback_probe_id" expect_json_status 200 feedback-admin-list-visible '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const id = process.env.FEEDBACK_ID;
const unsafeLinkId = process.env.UNSAFE_LINK_FEEDBACK_ID;
const unsafePrivateLinkId = process.env.UNSAFE_PRIVATE_LINK_FEEDBACK_ID;
const unsafeChecksumLinkId = process.env.UNSAFE_CHECKSUM_LINK_FEEDBACK_ID;
const unsafeRouteId = process.env.UNSAFE_ROUTE_FEEDBACK_ID;
const unsafeChecksumRouteId = process.env.UNSAFE_CHECKSUM_ROUTE_FEEDBACK_ID;
const unsafeTextId = process.env.UNSAFE_TEXT_FEEDBACK_ID;
const unsafeChecksumTextId = process.env.UNSAFE_CHECKSUM_TEXT_FEEDBACK_ID;
const staleId = process.env.STALE_FEEDBACK_ID;
if (!Array.isArray(data.feedback) || typeof data.count !== "number") {
  console.error(`FAIL: feedback inbox shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
if (data.count > 500 || data.feedback.length > 500) {
  console.error(`FAIL: feedback local-json inbox was not capped: ${JSON.stringify({ count: data.count, length: data.feedback.length })}`);
  process.exit(1);
}
const record = data.feedback.find((item) => item.id === id);
if (!record || record.status !== "new" || !["local-json", "vercel-kv"].includes(record.storageMode)) {
  console.error(`FAIL: submitted feedback not listed with storage mode: ${JSON.stringify({ id, count: data.count, record }).slice(0, 500)}`);
  process.exit(1);
}
if (!record.actor) {
  console.error(`FAIL: submitted feedback missing actor identity: ${JSON.stringify(record).slice(0, 500)}`);
  process.exit(1);
}
const unsafeLinkRecord = data.feedback.find((item) => item.id === unsafeLinkId);
if (!unsafeLinkRecord || unsafeLinkRecord.attachmentUrl) {
  console.error(`FAIL: unsafe screenshot link persisted: ${JSON.stringify({ unsafeLinkId, unsafeLinkRecord }).slice(0, 500)}`);
  process.exit(1);
}
const unsafePrivateLinkRecord = data.feedback.find((item) => item.id === unsafePrivateLinkId);
if (!unsafePrivateLinkRecord || unsafePrivateLinkRecord.attachmentUrl) {
  console.error(`FAIL: private-label screenshot link persisted: ${JSON.stringify({ unsafePrivateLinkId, unsafePrivateLinkRecord }).slice(0, 500)}`);
  process.exit(1);
}
const unsafeChecksumLinkRecord = data.feedback.find((item) => item.id === unsafeChecksumLinkId);
if (!unsafeChecksumLinkRecord || unsafeChecksumLinkRecord.attachmentUrl) {
  console.error(`FAIL: checksum-label screenshot link persisted: ${JSON.stringify({ unsafeChecksumLinkId, unsafeChecksumLinkRecord }).slice(0, 500)}`);
  process.exit(1);
}
const unsafeRouteRecord = data.feedback.find((item) => item.id === unsafeRouteId);
if (!unsafeRouteRecord || unsafeRouteRecord.route !== "/") {
  console.error(`FAIL: unsafe feedback route persisted: ${JSON.stringify({ unsafeRouteId, unsafeRouteRecord }).slice(0, 500)}`);
  process.exit(1);
}
const unsafeChecksumRouteRecord = data.feedback.find((item) => item.id === unsafeChecksumRouteId);
if (!unsafeChecksumRouteRecord || unsafeChecksumRouteRecord.route !== "/") {
  console.error(`FAIL: checksum feedback route persisted: ${JSON.stringify({ unsafeChecksumRouteId, unsafeChecksumRouteRecord }).slice(0, 500)}`);
  process.exit(1);
}
const unsafeTextRecord = data.feedback.find((item) => item.id === unsafeTextId);
if (!unsafeTextRecord || unsafeTextRecord.task !== "Free play" || unsafeTextRecord.reporterName || unsafeTextRecord.browser || unsafeTextRecord.device || unsafeTextRecord.viewport) {
  console.error(`FAIL: unsafe feedback text labels persisted: ${JSON.stringify({ unsafeTextId, unsafeTextRecord }).slice(0, 700)}`);
  process.exit(1);
}
const unsafeChecksumTextRecord = data.feedback.find((item) => item.id === unsafeChecksumTextId);
if (!unsafeChecksumTextRecord || unsafeChecksumTextRecord.task !== "Free play" || unsafeChecksumTextRecord.expected !== "Feedback should keep safe required fields." || !/unsafe private-token text submitted/i.test(unsafeChecksumTextRecord.actual || "") || unsafeChecksumTextRecord.reporterName || unsafeChecksumTextRecord.browser || unsafeChecksumTextRecord.device || unsafeChecksumTextRecord.viewport) {
  console.error(`FAIL: checksum feedback text labels persisted: ${JSON.stringify({ unsafeChecksumTextId, unsafeChecksumTextRecord }).slice(0, 700)}`);
  process.exit(1);
}
if (staleId) {
  const stale = data.feedback.find((item) => item.id === staleId);
  if (!stale || stale.role !== "Viewer" || stale.route !== "/" || stale.task !== "Free play" || stale.expected || stale.actual || stale.notes || stale.reporterName || stale.browser || stale.device || stale.viewport || stale.actor || stale.severity !== "medium" || stale.status !== "new" || stale.storageMode !== "local-json" || stale.attachmentUrl) {
    console.error(`FAIL: persisted unsafe feedback was not normalized: ${JSON.stringify(stale).slice(0, 500)}`);
    process.exit(1);
  }
}
const text = JSON.stringify(data.feedback);
if (text.includes("../private") || /source path|master drive|checksum/i.test(text) || /[a-f0-9]{32,}/i.test(text)) {
  console.error(`FAIL: feedback inbox leaked unsafe text labels: ${text.slice(0, 900)}`);
  process.exit(1);
}
' "$BASE_URL/api/beta-feedback?role=DAM%20Admin"

expect_json_status 403 feedback-viewer-patch-denied '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/DAM Admin/i.test(data.error || "")) {
  console.error(`FAIL: viewer patch denial copy invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -X PATCH -H 'Content-Type: application/json' \
  -d '{"role":"Viewer","status":"fixed"}' \
  "$BASE_URL/api/beta-feedback/$feedback_id?role=Viewer"

expect_json_status 400 feedback-admin-patch-invalid-status '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/status is invalid/i.test(data.error || "")) {
  console.error(`FAIL: invalid patch status was not rejected: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -X PATCH -H 'Content-Type: application/json' \
  -d '{"role":"DAM Admin","status":"done"}' \
  "$BASE_URL/api/beta-feedback/$feedback_id?role=DAM%20Admin"

expect_json_status 404 feedback-admin-patch-malformed-id '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/not found/i.test(data.error || "")) {
  console.error(`FAIL: malformed feedback id did not return not found: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -X PATCH -H 'Content-Type: application/json' \
  -d '{"role":"DAM Admin","status":"agent-ready"}' \
  "$BASE_URL/api/beta-feedback/..%2Fprivate-source?role=DAM%20Admin"

FEEDBACK_ID="$feedback_id" expect_json_status 200 feedback-admin-patch '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const id = process.env.FEEDBACK_ID;
if (data.ok !== true || data.feedback?.id !== id || data.feedback?.status !== "agent-ready" || data.feedback?.severity !== "high") {
  console.error(`FAIL: feedback patch did not persist triage fields: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
if (!/smoke triage note/i.test(data.feedback.notes || "")) {
  console.error(`FAIL: feedback patch did not persist notes: ${JSON.stringify(data.feedback).slice(0, 500)}`);
  process.exit(1);
}
if (/\.\.\/private|source path|master drive|checksum|[a-f0-9]{32,}/i.test(JSON.stringify(data.feedback))) {
  console.error(`FAIL: feedback patch echoed unsafe labels: ${JSON.stringify(data.feedback).slice(0, 700)}`);
  process.exit(1);
}
' -X PATCH -H 'Content-Type: application/json' \
  -d '{"role":"DAM Admin","status":"agent-ready","severity":"high","notes":"Workflow triage note for agent-ready feedback."}' \
  "$BASE_URL/api/beta-feedback/$feedback_id?role=DAM%20Admin"

FEEDBACK_ID="$feedback_id" expect_json_status 200 feedback-admin-list-patched '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const id = process.env.FEEDBACK_ID;
const record = (data.feedback || []).find((item) => item.id === id);
if (!record || record.status !== "agent-ready" || record.severity !== "high") {
  console.error(`FAIL: patched feedback not visible in inbox: ${JSON.stringify({ id, record }).slice(0, 500)}`);
  process.exit(1);
}
' "$BASE_URL/api/beta-feedback?role=DAM%20Admin"

expect_json_status 403 feedback-viewer-export-denied '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/DAM Admin/i.test(data.error || "")) {
  console.error(`FAIL: viewer export denial copy invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' "$BASE_URL/api/beta-feedback/export?role=Viewer"

FEEDBACK_ID="$feedback_id" expect_json_status 200 feedback-admin-export-agent-ready '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const id = process.env.FEEDBACK_ID;
if (data.schema !== "tjc-beta-feedback-export.v1" || !data.exportedAt || !data.counts || !Array.isArray(data.records)) {
  console.error(`FAIL: feedback export packet shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
if (data.filters?.status !== "agent-ready" || data.filters?.severity !== "high") {
  console.error(`FAIL: feedback export filters missing: ${JSON.stringify(data.filters)}`);
  process.exit(1);
}
const record = data.records.find((item) => item.id === id);
if (!record || record.status !== "agent-ready" || record.severity !== "high" || !record.actor) {
  console.error(`FAIL: agent-ready export missing patched record: ${JSON.stringify({ id, counts: data.counts, record }).slice(0, 500)}`);
  process.exit(1);
}
if (data.counts.exportedRecords < 1 || data.counts.agentReady < 1 || data.counts.high < 1) {
  console.error(`FAIL: feedback export counts weak: ${JSON.stringify(data.counts)}`);
  process.exit(1);
}
if (JSON.stringify(data).includes("../private") || /source path|master drive|checksum/i.test(JSON.stringify(data)) || /[a-f0-9]{32,}/i.test(JSON.stringify(data))) {
  console.error(`FAIL: feedback export leaked unsafe text labels: ${JSON.stringify(data).slice(0, 900)}`);
  process.exit(1);
}
' "$BASE_URL/api/beta-feedback/export?role=DAM%20Admin&status=agent-ready&severity=high&feedbackRole=Viewer"

expect_json_status 200 feedback-readiness-reports-storage '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const item = (data.integrationReadiness || []).find((entry) => entry.id === "beta-feedback-storage");
if (!item) {
  console.error("FAIL: admin readiness missing beta-feedback-storage item");
  process.exit(1);
}
if (!/feedback/i.test(item.label || "") || !/Records:/i.test(item.detail || "")) {
  console.error(`FAIL: beta feedback readiness detail weak: ${JSON.stringify(item)}`);
  process.exit(1);
}
' "$BASE_URL/api/admin/readiness?role=DAM%20Admin"

echo "Portal beta feedback smoke complete."
