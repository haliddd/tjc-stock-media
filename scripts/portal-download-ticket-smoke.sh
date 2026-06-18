#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4867}"
CURL_MAX_TIME="${PORTAL_DOWNLOAD_TICKET_CURL_MAX_TIME:-30}"
TMP_DIR="$(mktemp -d)"
SMOKE_EXPORT=".runtime/exports/resourcespace-metadata-99999998-$(printf "%06d" "$(($$ % 1000000))").csv"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/portal-smoke-trusted-identity.sh"
cleanup() {
  rm -rf "$TMP_DIR"
  if [ "${PORTAL_DOWNLOAD_TICKET_KEEP_FIXTURE:-0}" != "1" ]; then
    rm -f "$SMOKE_EXPORT"
  fi
}
trap cleanup EXIT
REVIEWER_HEADERS=(
  -H 'x-tjc-local-beta-role: Reviewer'
  -H 'x-tjc-role: Reviewer'
  -H "x-auth-request-email: $(portal_smoke_trusted_email "Reviewer")"
  -H 'cf-access-jwt-assertion: portal-smoke-placeholder-token'
  -H "cf-access-authenticated-user-email: $(portal_smoke_trusted_email "Reviewer")"
  -H 'cf-access-groups: Reviewer'
)
local_runtime_probe=0
case "$BASE_URL" in
  http://localhost:*|http://127.0.0.1:*) local_runtime_probe=1 ;;
esac

http_code() {
  local output="$1"
  shift
  portal_smoke_http_code "$output" "$@"
}

raw_http_code() {
  local output="$1"
  shift
  curl --max-time "$CURL_MAX_TIME" -sS -o "$output" -w '%{http_code}' "$@"
}

trusted_http_code() {
  local output="$1"
  shift
  portal_smoke_http_code "$output" "$@"
}

absolute_url() {
  local value="$1"
  if [[ "$value" == http://* || "$value" == https://* ]]; then
    printf '%s\n' "$value"
  else
    printf '%s%s\n' "$BASE_URL" "$value"
  fi
}

ensure_runtime_export_script='
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const exportDir = path.join(root, ".runtime", "exports");
fs.mkdirSync(exportDir, { recursive: true });
const out = path.join(root, process.env.SMOKE_EXPORT);
const rows = [
  [
    "resource_id",
    "title",
    "publish_status",
    "usage_scope",
    "source_album",
    "source_system",
    "people_visible",
    "rights_status",
    "reviewed_by",
    "reviewed_date",
    "image_dimensions",
    "visible_content_tags",
    "tjc_terms",
    "approval_notes",
    "file_extension"
  ],
  [
    "999999980",
    "Approved Copy Gate Fixture Approved",
    "Approved Internal",
    "Internal",
    "Approved Copy Gate Fixture",
    "smoke-fixture",
    "no",
    "Rights approved",
    "Workflow Reviewer",
    "2026-06-11",
    "1x1",
    "Bible|Study",
    "Teaching|Bible study",
    "TJC-owned rights approved for internal smoke verification",
    "jpg"
  ],
  [
    "999999981",
    "Approved Copy Gate Fixture Blocked",
    "Needs Review",
    "Do Not Publish",
    "Approved Copy Gate Fixture",
    "smoke-fixture",
    "yes",
    "Needs review",
    "",
    "",
    "1x1",
    "Fellowship",
    "Fellowship",
    "Needs reviewer approval before reuse",
    "jpg"
  ]
];
fs.writeFileSync(out, `${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, "\"\"")}"`).join(",")).join("\n")}\n`);
console.error(`PASS: generated runtime metadata export fixture ${out}`);
'

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
  echo "PASS: $label ($code)"
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
  echo "PASS: $label ($code)"
}

expect_json_status_with_trusted_helper() {
  local expected="$1"
  local label="$2"
  local script="$3"
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}.json"
  shift 3
  local code
  code="$(trusted_http_code "$output" "$@")"
  if [ "$code" != "$expected" ]; then
    echo "FAIL: $label expected $expected got $code"
    cat "$output"
    exit 1
  fi
  node -e "$script" < "$output"
  echo "PASS: $label ($code)"
}

expect_json_status_without_trusted_headers() {
  local expected="$1"
  local label="$2"
  local script="$3"
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}.json"
  shift 3
  local code
  code="$(raw_http_code "$output" "$@")"
  if [ "$code" != "$expected" ]; then
    echo "FAIL: $label expected $expected got $code"
    cat "$output"
    exit 1
  fi
  node -e "$script" < "$output"
  echo "PASS: $label ($code)"
}

select_json_value_status() {
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
    exit 1
  fi
  local value
  if ! value="$(node -e "$script" < "$output")"; then
    cat "$output" >&2
    exit 1
  fi
  if [ -z "$value" ]; then
    echo "FAIL: $label returned empty value" >&2
    cat "$output" >&2
    exit 1
  fi
  echo "PASS: selected $label=$value" >&2
  printf '%s\n' "$value"
}

SMOKE_EXPORT="$SMOKE_EXPORT" node -e "$ensure_runtime_export_script"

approved_asset_id_script='
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const assets = Array.isArray(data.assets) ? data.assets : [];
const preferInternal = /^http:\/\/(localhost|127\.0\.0\.1):/.test(process.env.BASE_URL || "");
const asset = preferInternal
  ? assets.find((item) => item && item.id && item.reuseDecision?.downloadable === true && (item.status === "Approved Internal" || item.downloadPolicy === "internal-approved-copy-allowed"))
    || assets.find((item) => item && item.id && item.reuseDecision?.downloadable === true)
  : assets.find((item) => item && item.id && item.reuseDecision?.downloadable === true && item.status === "Approved Public")
  || assets.find((item) => item && item.id && item.reuseDecision?.downloadable === true);
if (!asset) {
  console.error("FAIL: no reviewer-visible downloadable asset found");
  process.exit(1);
}
if (asset.imageUrls && Object.prototype.hasOwnProperty.call(asset.imageUrls, "download")) {
  console.error(`FAIL: search payload exposed imageUrls.download for ${asset.id}`);
  process.exit(1);
}
console.log(asset.id);
'

blocked_asset_id_script='
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const asset = (Array.isArray(data.assets) ? data.assets : []).find((item) => item && item.id && item.reuseDecision?.downloadable !== true);
if (!asset) {
  console.error("FAIL: no reviewer-visible blocked asset found");
  process.exit(1);
}
console.log(asset.id);
'

ensure_runtime_derivative_script='
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const id = process.env.APPROVED_ID;
const filestore = path.join(root, ".runtime", "filestore");
const suffixPattern = new RegExp(`^${id}(lpr_|hpr_|scr_|pre_)`);
let found = false;
function walk(dir) {
  if (!fs.existsSync(dir) || found) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (suffixPattern.test(entry.name) && /\.(jpe?g)$/i.test(entry.name)) found = true;
    if (found) return;
  }
}
walk(filestore);
if (found) {
  console.error("PASS: existing runtime approved derivative found");
  process.exit(0);
}
const dir = path.join(filestore, "download-ticket-smoke");
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, `${id}lpr_download-ticket-smoke.jpg`);
if (!fs.existsSync(out)) {
  const jpegBase64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Aaf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/Aaf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IX//2gAMAwEAAgADAAAAEP/EFBQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EFBQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EFBABAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z";
  fs.writeFileSync(out, Buffer.from(jpegBase64, "base64"));
}
console.error(`PASS: generated runtime derivative fixture ${out}`);
'

APPROVED_ID="$(select_json_value_status 200 approved-download-asset-id "$approved_asset_id_script" \
  "${REVIEWER_HEADERS[@]}" \
  "$BASE_URL/api/assets/search?role=Reviewer&limit=100")"
BLOCKED_ID="$(select_json_value_status 200 blocked-download-asset-id "$blocked_asset_id_script" \
  "${REVIEWER_HEADERS[@]}" \
  "$BASE_URL/api/assets/search?role=Reviewer&limit=100")"

APPROVED_ID="$APPROVED_ID" node -e "$ensure_runtime_derivative_script"

expect_json_status 200 approved-detail-hides-download-url '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.asset?.imageUrls && Object.prototype.hasOwnProperty.call(data.asset.imageUrls, "download")) {
  console.error(`FAIL: detail payload exposed imageUrls.download: ${JSON.stringify(data.asset.imageUrls)}`);
  process.exit(1);
}
' "${REVIEWER_HEADERS[@]}" "$BASE_URL/api/assets/$APPROVED_ID?role=Reviewer"

VIEWER_DETAIL_OUTPUT="$TMP_DIR/viewer-detail-redacts-source.json"
VIEWER_DETAIL_CODE="$(http_code "$VIEWER_DETAIL_OUTPUT" "$BASE_URL/api/assets/$APPROVED_ID?role=Viewer")"
if [ "$VIEWER_DETAIL_CODE" != "200" ] && [ "$VIEWER_DETAIL_CODE" != "403" ]; then
  echo "FAIL: viewer-detail-redacts-source expected 200 or 403 got $VIEWER_DETAIL_CODE"
  cat "$VIEWER_DETAIL_OUTPUT"
  exit 1
fi
node -e '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
const forbidden = [
  /ResourceSpace/i,
  /Shared Drive/i,
  /source path/i,
  /master drive/i,
  /original filename/i,
  /checksum/i,
  /resourceSpaceId/i,
  /sourceAlbumPath/i,
  /masterDrivePath/i
];
if (data.source?.label !== "Media library" || data.source?.adapter !== "media-library") {
  console.error(`FAIL: viewer source was not redacted: ${JSON.stringify(data.source)}`);
  process.exit(1);
}
if (data.asset?.imageUrls && Object.prototype.hasOwnProperty.call(data.asset.imageUrls, "download")) {
  console.error(`FAIL: viewer detail exposed imageUrls.download: ${JSON.stringify(data.asset.imageUrls)}`);
  process.exit(1);
}
for (const pattern of forbidden) {
  if (pattern.test(text)) {
    console.error(`FAIL: viewer detail leaked operational source text ${pattern}: ${text.slice(0, 900)}`);
    process.exit(1);
  }
}
' < "$VIEWER_DETAIL_OUTPUT"
echo "PASS: viewer-detail-redacts-source ($VIEWER_DETAIL_CODE)"

expect_json_status 403 direct-approved-get-denied '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.allowed !== false || data.reasonCode !== "ticket-missing" || data.requiredAction !== "request-download-ticket") {
  console.error(`FAIL: direct GET did not require ticket: ${JSON.stringify(data)}`);
  process.exit(1);
}
' "${REVIEWER_HEADERS[@]}" "$BASE_URL/api/download/$APPROVED_ID?role=Reviewer"

expect_json_status 403 viewer-original-download-denied '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (data.allowed !== false || data.downloadUrl || data.ticket || /ResourceSpace|Shared Drive|master drive|original filename|checksum/i.test(text)) {
  console.error(`FAIL: viewer original-like request was not safely denied: ${text.slice(0, 900)}`);
  process.exit(1);
}
' "$BASE_URL/api/download/$APPROVED_ID?role=Viewer&variant=original"

expect_code 400 unsafe-download-path-denied "$BASE_URL/api/download/%2E%2E$APPROVED_ID?role=Viewer"

if [ "$local_runtime_probe" = "1" ]; then
  expect_json_status_without_trusted_headers 403 body-role-spoof-denied-without-trusted-header '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.allowed !== false || data.ticket || data.downloadUrl || !/role|review|not downloadable|approved/i.test(JSON.stringify(data))) {
  console.error(`FAIL: body-only Reviewer spoof did not fail closed: ${JSON.stringify(data)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","termsAccepted":true,"usageChannel":"Download ticket smoke","reason":"Body role spoof must not mint a ticket."}' \
  "$BASE_URL/api/download/$APPROVED_ID"
else
  expect_json_status_without_trusted_headers 200 body-role-spoof-ignored-for-public-viewer '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (data.allowed !== true || !data.downloadUrl || data.downloadUrl.includes("role=Reviewer") || /signedUrl|originalUrl|s3:\/\//i.test(text)) {
  console.error(`FAIL: hosted body-only Reviewer spoof elevated role or leaked delivery URL: ${text.slice(0, 900)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
    -d '{"role":"Reviewer","termsAccepted":true,"usageChannel":"Download ticket smoke","reason":"Body role spoof must not mint a reviewer-only ticket."}' \
    "$BASE_URL/api/download/$APPROVED_ID"
fi

expect_json_status 403 post-terms-false-denied '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.allowed !== false || data.requiredAction !== "accept-usage-terms") {
  console.error(`FAIL: false terms did not block: ${JSON.stringify(data)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","termsAccepted":false,"usageChannel":"Download ticket smoke","reason":"False terms must fail."}' \
  "${REVIEWER_HEADERS[@]}" \
  "$BASE_URL/api/download/$APPROVED_ID?role=Reviewer"

DOWNLOAD_URL="$(select_json_value_status 200 post-ticket-minted '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.allowed !== true || data.ticket || !data.ticketExpiresAt || !data.auditId || !data.downloadUrl) {
  console.error(`FAIL: ticket response incomplete: ${JSON.stringify(data)}`);
  process.exit(1);
}
if (!/\/api\/download\/[^?]+\?/.test(data.downloadUrl) || !data.downloadUrl.includes("ticket=")) {
  console.error(`FAIL: downloadUrl missing ticket query: ${data.downloadUrl}`);
  process.exit(1);
}
if (/signedUrl|originalUrl|s3:\/\//i.test(JSON.stringify(data))) {
  console.error(`FAIL: ticket response leaked private delivery URL: ${JSON.stringify(data)}`);
  process.exit(1);
}
console.log(data.downloadUrl);
' -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","termsAccepted":true,"usageChannel":"Download ticket smoke","reason":"One-time ticket transfer."}' \
  "${REVIEWER_HEADERS[@]}" \
  "$BASE_URL/api/download/$APPROVED_ID?role=Reviewer")"

ABS_DOWNLOAD_URL="$(absolute_url "$DOWNLOAD_URL")"
expect_code 200 ticketed-get-allowed-once "${REVIEWER_HEADERS[@]}" "$ABS_DOWNLOAD_URL"

expect_json_status 403 ticket-reuse-denied '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.allowed !== false || data.reasonCode !== "ticket-reused") {
  console.error(`FAIL: reused ticket was not denied: ${JSON.stringify(data)}`);
  process.exit(1);
}
' "${REVIEWER_HEADERS[@]}" "$ABS_DOWNLOAD_URL"

RACE_DOWNLOAD_URL="$(select_json_value_status 200 post-ticket-race-minted '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.allowed !== true || data.ticket || !data.downloadUrl) {
  console.error(`FAIL: race ticket response incomplete: ${JSON.stringify(data)}`);
  process.exit(1);
}
console.log(data.downloadUrl);
' -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","termsAccepted":true,"usageChannel":"Download ticket smoke","reason":"Concurrent one-time ticket race."}' \
  "${REVIEWER_HEADERS[@]}" \
  "$BASE_URL/api/download/$APPROVED_ID?role=Reviewer")"
ABS_RACE_DOWNLOAD_URL="$(absolute_url "$RACE_DOWNLOAD_URL")"
race_one="$TMP_DIR/race-one.body"
race_two="$TMP_DIR/race-two.body"
code_one_file="$TMP_DIR/race-one.code"
code_two_file="$TMP_DIR/race-two.code"
(curl --max-time "$CURL_MAX_TIME" -sS -o "$race_one" -w '%{http_code}' "${REVIEWER_HEADERS[@]}" "$ABS_RACE_DOWNLOAD_URL" > "$code_one_file") &
pid_one=$!
(curl --max-time "$CURL_MAX_TIME" -sS -o "$race_two" -w '%{http_code}' "${REVIEWER_HEADERS[@]}" "$ABS_RACE_DOWNLOAD_URL" > "$code_two_file") &
pid_two=$!
wait "$pid_one"
wait "$pid_two"
race_codes="$(cat "$code_one_file") $(cat "$code_two_file")"
if [[ "$race_codes" != "200 403" && "$race_codes" != "403 200" ]]; then
  echo "FAIL: concurrent consume expected one 200 and one 403, got $race_codes"
  cat "$race_one"
  cat "$race_two"
  exit 1
fi
echo "PASS: ticket-concurrent-consume-one-wins ($race_codes)"

expect_json_status 403 thumbnail-download-variant-blocked '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.requiredAction !== "request-download-ticket" || !/download gate/i.test(data.error || "")) {
  console.error(`FAIL: thumbnail download variant was not blocked: ${JSON.stringify(data)}`);
  process.exit(1);
}
' "${REVIEWER_HEADERS[@]}" "$BASE_URL/api/assets/thumbnail/$APPROVED_ID?variant=download&role=Reviewer"

expect_json_status 403 blocked-asset-post-still-denied '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.allowed !== false || data.downloadUrl || data.ticket) {
  console.error(`FAIL: blocked asset received download material: ${JSON.stringify(data)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","termsAccepted":true,"usageChannel":"Download ticket smoke","reason":"Blocked asset must remain blocked."}' \
  "${REVIEWER_HEADERS[@]}" \
  "$BASE_URL/api/download/$BLOCKED_ID?role=Reviewer"

if [ "$local_runtime_probe" = "1" ]; then
  APPROVED_ID="$APPROVED_ID" node -e '
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const dir = path.join(root, ".runtime", "audit-log");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((file) => file.endsWith(".jsonl")).sort() : [];
const rows = files.flatMap((file) => fs.readFileSync(path.join(dir, file), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)));
const approvedId = process.env.APPROVED_ID;
const gate = rows.find((row) => row.type === "download_gate_checked" && row.assetId === approvedId && row.status === "allowed" && row.details?.termsAccepted === true);
const transfer = rows.find((row) => row.type === "approved_download" && row.assetId === approvedId && row.status === "allowed" && row.details?.gateAuditId);
if (!gate || !transfer) {
  console.error(`FAIL: required download audit events missing: ${JSON.stringify({ gate: Boolean(gate), transfer: Boolean(transfer) })}`);
  process.exit(1);
}
console.error("PASS: required download audit events persisted");
'
else
  expect_json_status_with_trusted_helper 200 hosted-admin-readiness-audit-surface-safe '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!Array.isArray(data.readiness) || !Array.isArray(data.fieldMappings) || !Array.isArray(data.vocabulary)) {
  console.error("FAIL: hosted readiness did not return readiness, field mappings, and vocabulary");
  process.exit(1);
}
const text = JSON.stringify(data);
if (/signedUrl|originalUrl|s3:\/\/|master drive path|sourceAlbumPath|masterDrivePath/i.test(text)) {
  console.error(`FAIL: hosted readiness exposed private delivery/source internals: ${text.slice(0, 900)}`);
  process.exit(1);
}
  ' "$BASE_URL/api/admin/readiness?role=DAM%20Admin"
  echo "PASS: hosted audit persistence covered by per-request auditId checks"
fi

echo "Portal download ticket smoke complete."
