#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4871}"
CURL_MAX_TIME="${PORTAL_WRITEBACK_GUARD_SMOKE_CURL_MAX_TIME:-30}"
MARKER="writeback-guard-$(date -u +%Y%m%dT%H%M%SZ)-$$"
SMOKE_STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/portal-smoke-trusted-identity.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
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

review_asset_id_script='
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const asset = (Array.isArray(data.assets) ? data.assets : []).find((item) => item && item.id);
if (!asset) {
  console.error("FAIL: no review asset id found");
  process.exit(1);
}
console.log(asset.id);
'

REVIEW_ASSET_ID="$(select_json_value review-writeback-guard-asset-id "$review_asset_id_script" \
  "$BASE_URL/api/review?role=Reviewer&queue=pending")"

expect_json_status 200 writeback-readiness-not-live '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const item = (data.integrationReadiness || []).find((entry) => entry.id === "review-writes");
if (!item) {
  console.error("FAIL: admin readiness missing review-writes integration");
  process.exit(1);
}
if (item.ready === true || /Operational/i.test(item.state || "")) {
  console.error(`FAIL: no-live writeback guard expected non-operational review-writes state: ${JSON.stringify(item)}`);
  process.exit(1);
}
if (!/pending-sync|disabled|not configured|field refs|field map|credentials|writeback/i.test(`${item.detail || ""} ${item.state || ""}`)) {
  console.error(`FAIL: review-writes readiness detail does not explain blocked writeback: ${JSON.stringify(item)}`);
  process.exit(1);
}
' "$BASE_URL/api/admin/readiness?role=DAM%20Admin"

expect_json_status 400 writeback-incomplete-evidence-blocked '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (!Array.isArray(data.missingEvidence) || !data.missingEvidence.includes("reviewNote")) {
  console.error(`FAIL: missing review evidence did not report reviewNote: ${text}`);
  process.exit(1);
}
if (/updated through the live API|resourcespace-live-writeback|synced_to_resourcespace/i.test(text)) {
  console.error(`FAIL: incomplete evidence claimed ResourceSpace writeback: ${text}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Reviewer\",\"id\":\"$REVIEW_ASSET_ID\",\"action\":\"Approve Public\",\"notes\":\"short\",\"checklist\":{\"sourceConfirmed\":true}}" \
  "$BASE_URL/api/review"

expect_json_status 202 writeback-complete-evidence-queues-only '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (data.ok !== true || !data.pendingWriteId || !data.auditRecord) {
  console.error(`FAIL: queued review response missing pending write/audit proof: ${text}`);
  process.exit(1);
}
if (data.mode === "resourcespace-live-writeback" || data.sync?.ok !== false || /updated through the live API|synced_to_resourcespace/i.test(text)) {
  console.error(`FAIL: no-live writeback guard saw a fake live ResourceSpace success: ${text}`);
  process.exit(1);
}
if (!["queued", "ready_to_sync", "sync_failed"].includes(data.syncState)) {
  console.error(`FAIL: queued review response had unexpected sync state: ${data.syncState}`);
  process.exit(1);
}
if (!data.auditRecord.actor || data.auditRecord.reviewerRole !== "Reviewer") {
  console.error(`FAIL: queued review audit proof missing actor/reviewer role: ${JSON.stringify(data.auditRecord)}`);
  process.exit(1);
}
if (data.label !== "Request More Info" || /source path|master drive|checksum|\.\.\/private|[a-f0-9]{32,}/i.test(text)) {
  console.error(`FAIL: queued review response echoed unsafe display fields: ${text.slice(0, 900)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Reviewer\",\"id\":\"$REVIEW_ASSET_ID\",\"action\":\"Request More Info\",\"label\":\"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\",\"notes\":\"$MARKER complete evidence should queue without live ResourceSpace writeback.\",\"checklist\":{\"sourceConfirmed\":true,\"rightsConfirmed\":true,\"peopleVisibilityConfirmed\":true,\"childrenYouthChecked\":true,\"usageScopeSelected\":true},\"reviewerName\":\"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\"}" \
  "$BASE_URL/api/review"

if [ "$local_runtime_probe" = "1" ]; then
  MARKER="$MARKER" node <<'NODE'
const fs = require("fs");
const path = require("path");
const now = new Date().toISOString();
const pendingDir = path.join(process.cwd(), ".runtime", "pending-review-writes");
fs.mkdirSync(pendingDir, { recursive: true });
fs.writeFileSync(path.join(pendingDir, `unsafe-${process.env.MARKER}.json`), `${JSON.stringify({
  id: `unsafe-${process.env.MARKER}`,
  resourceId: "../private",
  oldStatus: "../private old",
  requestedStatus: "../private requested",
  reviewerRole: "Root",
  reviewerName: "../private reviewer",
  createdAt: "not-a-date",
  updatedAt: now,
  note: "../private note",
  checklist: { sourceConfirmed: "yes" },
  blockers: ["../private"],
  syncState: "synced_as_admin",
  retryCount: -7,
  lastError: "../private pending error"
}, null, 2)}\n`);
fs.writeFileSync(path.join(pendingDir, `unsafe-token-${process.env.MARKER}.json`), `${JSON.stringify({
  id: `unsafe-token-${process.env.MARKER}`,
  resourceId: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  oldStatus: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  requestedStatus: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  reviewerRole: "Reviewer",
  reviewerName: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  createdAt: "not-a-date",
  updatedAt: now,
  note: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  checklist: { sourceConfirmed: "yes" },
  blockers: ["ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"],
  syncState: "queued",
  retryCount: -7,
  lastError: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
}, null, 2)}\n`);
for (let index = 0; index < 210; index += 1) {
  fs.writeFileSync(path.join(pendingDir, `filler-${process.env.MARKER}-${index}.json`), `${JSON.stringify({
    id: `filler-${process.env.MARKER}-${index}`,
    resourceId: `filler-${index}`,
    oldStatus: "Needs Review",
    requestedStatus: "Needs Review",
    reviewerRole: "Reviewer",
    reviewerName: "Writeback Guard Filler",
    createdAt: `2000-01-01T00:${String(index % 60).padStart(2, "0")}:00.000Z`,
    updatedAt: `2000-01-01T00:${String(index % 60).padStart(2, "0")}:00.000Z`,
    note: "Filler pending write for cap probe.",
    checklist: { sourceConfirmed: true },
    blockers: [],
    syncState: "queued",
    retryCount: 0
  }, null, 2)}\n`);
}

const auditDir = path.join(process.cwd(), ".runtime", "audit-log");
fs.mkdirSync(auditDir, { recursive: true });
const month = now.slice(0, 7);
fs.appendFileSync(path.join(auditDir, `${month}.jsonl`), `${JSON.stringify({
  id: `unsafe-${process.env.MARKER}`,
  type: "root_shell",
  createdAt: now,
  role: "Root",
  actor: "",
  assetId: "../private",
  resourceSpaceId: "../private",
  packageId: "../private",
  status: "rooted",
  summary: "../private audit summary",
  details: { "../private": "../private detail", unsafeNumber: Number.NaN }
})}\n`);
fs.appendFileSync(path.join(auditDir, `${month}.jsonl`), `${JSON.stringify({
  id: `unsafe-phrase-${process.env.MARKER}`,
  type: "saved_search_saved",
  createdAt: now,
  role: "Reviewer",
  actor: "source path actor",
  assetId: "master drive asset",
  resourceSpaceId: "checksum resource",
  packageId: "source path package",
  status: "preview",
  summary: "source path audit summary",
  details: { "source path": "master drive checksum", plain: "checksum handoff" }
})}\n`);
fs.appendFileSync(path.join(auditDir, `${month}.jsonl`), `${JSON.stringify({
  id: `unsafe-token-${process.env.MARKER}`,
  type: "saved_search_saved",
  createdAt: now,
  role: "Reviewer",
  actor: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  assetId: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  resourceSpaceId: "cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  packageId: "dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  status: "preview",
  summary: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  details: {
    "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff": "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    plain: "1111111111111111111111111111111111111111111111111111111111111111"
  }
})}\n`);
NODE
fi

expect_json_status 200 writeback-pending-queue-visible '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const item = (data.integrationReadiness || []).find((entry) => entry.id === "pending-review-writes");
if (!item) {
  console.error("FAIL: admin readiness missing pending-review-writes integration");
  process.exit(1);
}
if (!/pending review write/i.test(item.label || "") || !/pending writes?/i.test(item.detail || "")) {
  console.error(`FAIL: pending write readiness row is weak: ${JSON.stringify(item)}`);
  process.exit(1);
}
const pendingMatch = String(item.detail || "").match(/([0-9,]+) pending write/);
const pendingCount = pendingMatch ? Number(pendingMatch[1].replace(/,/g, "")) : NaN;
if (!Number.isFinite(pendingCount) || pendingCount > 200) {
  console.error(`FAIL: pending write readiness count was not capped: ${JSON.stringify(item)}`);
  process.exit(1);
}
const readinessText = JSON.stringify({ auditLog: data.auditLog, integrationReadiness: data.integrationReadiness });
if (/synced_as_admin|root_shell|Root|source path|master drive|[a-f0-9]{32,}/i.test(readinessText)) {
  console.error(`FAIL: unsafe persisted audit/pending fields leaked into readiness: ${readinessText.slice(0, 900)}`);
  process.exit(1);
}
const recent = data.auditLog?.recent || [];
const normalizedAudit = recent.find((entry) => entry.id && entry.id.includes("unsafe-writeback-guard"));
if (normalizedAudit && (normalizedAudit.role !== "Viewer" || normalizedAudit.status !== "preview" || normalizedAudit.type !== "admin_denied" || !normalizedAudit.actor)) {
  console.error(`FAIL: unsafe audit line was not normalized: ${JSON.stringify(normalizedAudit)}`);
  process.exit(1);
}
' "$BASE_URL/api/admin/readiness?role=DAM%20Admin"

if [ "$local_runtime_probe" = "1" ]; then
  SMOKE_STARTED_AT="$SMOKE_STARTED_AT" node <<'NODE'
const fs = require("fs");
const path = require("path");
const auditDir = path.join(process.cwd(), ".runtime", "audit-log");
const files = fs.existsSync(auditDir)
  ? fs.readdirSync(auditDir).filter((file) => file.endsWith(".jsonl")).sort().reverse()
  : [];
const lines = files.flatMap((file) => fs.readFileSync(path.join(auditDir, file), "utf8").split("\n").filter(Boolean));
const startedAt = Date.parse(process.env.SMOKE_STARTED_AT || "");
const smokeLines = lines.filter((line) => {
  if (/"id":"unsafe-/.test(line)) return false;
  try {
    const event = JSON.parse(line);
    return Date.parse(event.createdAt || "") >= startedAt;
  } catch {
    return false;
  }
});
if (!smokeLines.length) {
  console.error("FAIL: no persisted audit lines found for writeback guard smoke marker");
  process.exit(1);
}
const unsafe = smokeLines.find((line) => /\.\.\/private|synced_as_admin|root_shell|Root|source path|master drive|checksum|[a-f0-9]{32,}/i.test(line));
if (unsafe) {
  console.error(`FAIL: appendAuditEvent persisted unsafe audit material: ${unsafe.slice(0, 900)}`);
  process.exit(1);
}
console.log("PASS: persisted audit lines sanitized");
NODE
fi

echo "Portal ResourceSpace writeback guard smoke complete."
