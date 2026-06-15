#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4871}"
CURL_MAX_TIME="${PORTAL_BETA_REHEARSAL_CURL_MAX_TIME:-30}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "$ROOT/scripts/portal-smoke-trusted-identity.sh"
RUN_ID="$(date -u +%Y%m%dT%H%M%SZ)-$$"
RUN_DIR="$ROOT/.runtime/beta-rehearsals/$RUN_ID"
RESULTS_JSONL="$RUN_DIR/results.jsonl"
SUMMARY_JSON="$RUN_DIR/summary.json"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$RUN_DIR"
export BASE_URL RUN_ID RUN_DIR RESULTS_JSONL SUMMARY_JSON

http_code() {
  local output="$1"
  shift
  portal_smoke_http_code "$output" "$@"
}

record_pass() {
  local label="$1"
  local code="$2"
  local file="$3"
  LABEL="$label" CODE="$code" FILE="$file" node <<'NODE'
const fs = require("fs");
const path = require("path");
function parseHttpCode(value) {
  const code = Number.parseInt(value || "", 10);
  return Number.isFinite(code) && code >= 100 && code <= 599 ? code : 0;
}
const entry = {
  label: process.env.LABEL,
  status: "pass",
  httpCode: parseHttpCode(process.env.CODE),
  responseFile: path.relative(process.env.RUN_DIR, process.env.FILE)
};
fs.appendFileSync(process.env.RESULTS_JSONL, `${JSON.stringify(entry)}\n`);
NODE
}

expect_json_status() {
  local expected="$1"
  local label="$2"
  local script="$3"
  local output="$RUN_DIR/${label//[^a-zA-Z0-9_-]/_}.json"
  shift 3
  local code
  code="$(http_code "$output" "$@")"
  if [ "$code" != "$expected" ]; then
    echo "FAIL: $label expected $expected got $code"
    cat "$output"
    exit 1
  fi
  node -e "$script" < "$output"
  record_pass "$label" "$code" "$output"
  echo "PASS: $label"
}

expect_json_any_status() {
  local allowed="$1"
  local label="$2"
  local script="$3"
  local output="$RUN_DIR/${label//[^a-zA-Z0-9_-]/_}.json"
  shift 3
  local code
  code="$(http_code "$output" "$@")"
  case " $allowed " in
    *" $code "*) ;;
    *)
      echo "FAIL: $label expected one of [$allowed] got $code"
      cat "$output"
      exit 1
      ;;
  esac
  STATUS_CODE="$code" node -e "$script" < "$output"
  record_pass "$label" "$code" "$output"
  echo "PASS: $label ($code)"
}

select_json_value() {
  local label="$1"
  local script="$2"
  local output="$RUN_DIR/${label//[^a-zA-Z0-9_-]/_}.json"
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

VIEWER_ASSET_ID="$(select_json_value beta-viewer-asset-id "$first_asset_id_script" \
  "$BASE_URL/api/assets/search?role=Viewer&q=Bible&limit=5")"
if ! BLOCKED_DOWNLOAD_ID="$(select_json_value beta-blocked-download-id "$blocked_asset_id_script" \
  "$BASE_URL/api/assets/search?role=Reviewer&view=needs-review&limit=25")"; then
  BLOCKED_DOWNLOAD_ID="$(select_json_value beta-blocked-download-fallback-id "$blocked_asset_id_script" \
    "$BASE_URL/api/assets/search?role=Reviewer&limit=50")"
fi
REVIEW_ASSET_ID="$(select_json_value beta-review-asset-id "$first_asset_id_script" \
  "$BASE_URL/api/review?role=Reviewer&queue=pending")"

viewer_safety_guard='
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const forbiddenKeys = new Set([
  "metadataHealth",
  "operationalInsights",
  "resourceSpaceId",
  "resourceSpaceUrl",
  "resourceSpaceUrls",
  "duplicateGroup",
  "duplicateRole",
  "sourcePath",
  "masterDrivePath",
  "sourceAlbumPath",
  "sourceAlbumMemberships",
  "sourceLink",
  "originalFilename",
  "checksumSha256",
  "fileSizeBytes",
  "pendingReviewWrite",
  "pendingWrites",
  "reuseDecision",
  "reviewer",
  "sourceAccount",
  "sourceAlbum",
  "sourcePlatform",
  "sourceSystem",
  "workflowState",
  "integrationReadiness",
  "auditLog",
  "sourceFolder",
  "approvalRecheckDate",
  "church",
  "consentExpirationDate",
  "controlledVocabularySource",
  "doctrineSacramentTheme",
  "duplicateSimilarityHint",
  "embargoDate",
  "expirationDate",
  "hymnNumberOrTitle",
  "importBatch",
  "language",
  "masterCustodyPathStatus",
  "publicationTitle",
  "publishDate",
  "region",
  "religiousEducationLevel",
  "rightsExpirationDate",
  "sermonTitle",
  "suggestedTags",
  "testimonyTheme",
  "versionOrEdition",
  "withdrawalStatus"
]);
const forbiddenText = [/s3:\/\//i, /amazonaws\.com/i, /source path/i, /master drive/i, /checksum/i, /ResourceSpace ID/i, /\bRS\s+\d+\b/i, /[a-f0-9]{32,}/i];
const leaks = [];
function walk(value, path) {
  if (Array.isArray(value)) return value.forEach((item, index) => walk(item, `${path}[${index}]`));
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      const nextPath = path ? `${path}.${key}` : key;
      if (forbiddenKeys.has(key)) leaks.push(nextPath);
      walk(child, nextPath);
    }
    return;
  }
  if (typeof value === "string") {
    for (const pattern of forbiddenText) {
      if (pattern.test(value)) leaks.push(`${path}=${JSON.stringify(value).slice(0, 140)}`);
    }
  }
}
walk(data, "");
if (leaks.length) {
  console.error(`FAIL: Viewer payload leaked restricted beta material: ${leaks.slice(0, 20).join(", ")}`);
  process.exit(1);
}
if (data.source && (data.source.adapter !== "media-library" || data.source.label !== "Media library")) {
  console.error(`FAIL: Viewer source was not role-safe: ${JSON.stringify(data.source)}`);
  process.exit(1);
}
'

expect_json_status 200 viewer-search-finds-safe-results "$viewer_safety_guard
if (!Array.isArray(data.assets) || data.assets.length < 1 || !data.counts?.currentlyShown) {
  console.error(\`FAIL: Viewer search did not return usable result evidence: \${JSON.stringify(data).slice(0, 500)}\`);
  process.exit(1);
}
" "$BASE_URL/api/assets/search?role=Viewer&q=Bible&limit=3"

expect_json_status 200 viewer-opens-asset-trust-record "$viewer_safety_guard
if (!data.asset || data.asset.id !== \"$VIEWER_ASSET_ID\") {
  console.error(\`FAIL: Viewer asset trust record missing: \${JSON.stringify(data).slice(0, 500)}\`);
  process.exit(1);
}
" "$BASE_URL/api/assets/$VIEWER_ASSET_ID?role=Viewer"

expect_json_status 403 viewer-download-stays-blocked "$viewer_safety_guard
if (data.downloadUrl || data.signedUrl || data.originalUrl) {
  console.error(\`FAIL: Viewer blocked download exposed URL: \${JSON.stringify(data).slice(0, 500)}\`);
  process.exit(1);
}
" "$BASE_URL/api/download/$BLOCKED_DOWNLOAD_ID?role=Viewer"

expect_json_status 403 viewer-cannot-review "$viewer_safety_guard" \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Viewer\",\"id\":\"$REVIEW_ASSET_ID\",\"action\":\"Request More Info\",\"notes\":\"Viewer beta rehearsal should not review.\"}" \
  "$BASE_URL/api/review"

expect_json_status 200 reviewer-queue-loads '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.canReview !== true || !Array.isArray(data.queues) || !Array.isArray(data.assets)) {
  console.error(`FAIL: Reviewer queue did not load governance workbench: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' "$BASE_URL/api/review?role=Reviewer&queue=pending"

expect_json_status 400 reviewer-incomplete-approval-blocks '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const missing = data.missingEvidence || [];
if (!Array.isArray(missing) || !missing.includes("sourceConfirmed") || !missing.includes("reviewNote")) {
  console.error(`FAIL: Reviewer incomplete approval did not return evidence blockers: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Reviewer\",\"id\":\"$REVIEW_ASSET_ID\",\"action\":\"Approve Public\",\"notes\":\"short\",\"checklist\":{}}" \
  "$BASE_URL/api/review"

expect_json_any_status "200 202" reviewer-complete-decision-is-honest '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const code = process.env.STATUS_CODE;
if (data.ok !== true || !data.pendingWriteId || !data.auditRecord || !data.auditRecord.actor) {
  console.error(`FAIL: Reviewer complete decision lacks pending-write/audit evidence: ${JSON.stringify(data).slice(0, 700)}`);
  process.exit(1);
}
if (code === "202" && /synced_to_resourcespace|updated through the live API/i.test(JSON.stringify(data))) {
  console.error(`FAIL: Queued review overclaimed ResourceSpace writeback: ${JSON.stringify(data).slice(0, 700)}`);
  process.exit(1);
}
' \
  -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Reviewer\",\"id\":\"$REVIEW_ASSET_ID\",\"action\":\"Request More Info\",\"notes\":\"Private beta rehearsal complete evidence packet.\",\"checklist\":{\"sourceConfirmed\":true,\"rightsConfirmed\":true,\"peopleVisibilityConfirmed\":true,\"childrenYouthChecked\":true,\"usageScopeSelected\":true},\"reviewerName\":\"Private Beta Rehearsal\"}" \
  "$BASE_URL/api/review"

expect_json_status 200 dam-admin-readiness-opens '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!data.betaReadiness || !Array.isArray(data.integrationReadiness) || !data.auditLog) {
  console.error(`FAIL: DAM Admin readiness missing command-center facts: ${JSON.stringify(data).slice(0, 700)}`);
  process.exit(1);
}
const s3 = data.integrationReadiness.find((item) => item.id === "s3-delivery");
if (!s3 || /operational/i.test(s3.state || "") || /signed (url|delivery).*ready|production.*ready/i.test(`${s3.state} ${s3.detail}`)) {
  console.error(`FAIL: DAM Admin S3 readiness overclaims delivery: ${JSON.stringify(s3)}`);
  process.exit(1);
}
' "$BASE_URL/api/admin/readiness?role=DAM%20Admin"

node <<'NODE'
const fs = require("fs");
const results = fs.readFileSync(process.env.RESULTS_JSONL, "utf8")
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const summary = {
  runId: process.env.RUN_ID,
  generatedAt: new Date().toISOString(),
  baseUrl: process.env.BASE_URL,
  status: results.every((item) => item.status === "pass") ? "pass" : "fail",
  checks: results,
  inviteDecision: "Local dry run passed. Hold teammate invites until private URL, access policy, seed data, and feedback triager are confirmed."
};
fs.writeFileSync(process.env.SUMMARY_JSON, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`PASS: private beta rehearsal evidence written to ${process.env.SUMMARY_JSON}`);
NODE

echo "Portal private beta rehearsal complete."
