#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4871}"
CURL_MAX_TIME="${PORTAL_DELIVERY_SMOKE_CURL_MAX_TIME:-30}"
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/portal-smoke-trusted-identity.sh"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

http_code() {
  local output="$1"
  shift
  portal_smoke_http_code "$output" "$@"
}

expect_json() {
  local label="$1"
  local script="$2"
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}.json"
  shift 2
  local code
  code="$(http_code "$output" "$@")"
  if [ "$code" != "200" ]; then
    echo "FAIL: $label expected 200 got $code"
    cat "$output"
    exit 1
  fi
  node -e "$script" < "$output"
  echo "PASS: $label"
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

expect_json_any_status() {
  local allowed="$1"
  local label="$2"
  local script="$3"
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}.json"
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
  echo "PASS: $label ($code)"
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

VIEWER_ASSET_ID="$(select_json_value viewer-delivery-asset-id "$first_asset_id_script" \
  "$BASE_URL/api/assets/search?role=Viewer&limit=5")"
CONTRIBUTOR_ASSET_ID="$(select_json_value contributor-delivery-asset-id "$first_asset_id_script" \
  "$BASE_URL/api/assets/search?role=Contributor&limit=5")"
if ! BLOCKED_DOWNLOAD_ID="$(select_json_value blocked-delivery-asset-id "$blocked_asset_id_script" \
  "$BASE_URL/api/assets/search?role=Reviewer&view=needs-review&limit=25")"; then
  BLOCKED_DOWNLOAD_ID="$(select_json_value blocked-delivery-fallback-asset-id "$blocked_asset_id_script" \
    "$BASE_URL/api/assets/search?role=Reviewer&limit=50")"
fi

delivery_payload_guard='
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const forbiddenKeys = new Set([
  "checksumSha256",
  "duplicateGroup",
  "duplicateRole",
  "fileSizeBytes",
  "masterDrivePath",
  "originalFilename",
  "pendingReviewWrite",
  "resourceSpaceId",
  "resourceSpaceUrl",
  "resourceSpaceUrls",
  "reuseDecision",
  "reviewer",
  "sourceAccount",
  "sourceAlbum",
  "sourceAlbumPath",
  "sourceAlbumMemberships",
  "sourceLink",
  "sourcePath",
  "sourcePlatform",
  "sourceSystem",
  "workflowState",
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
const forbiddenText = [
  /s3:\/\//i,
  /amazonaws\.com/i,
  /S3_BUCKET/i,
  /S3_PREVIEW_PREFIX/i,
  /S3_ORIGINAL_PREFIX/i,
  /S3_ACCESS_ROLE/i,
  /AWS_ACCESS_KEY_ID/i,
  /AWS_SECRET_ACCESS_KEY/i,
  /private[- ]s3/i,
  /original prefix/i,
  /source path/i,
  /master drive/i,
  /master\/original path/i,
  /checksum/i,
  /[a-f0-9]{32,}/i
];
const leaks = [];
function walk(value, path) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${index}]`));
    return;
  }
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
  console.error(`FAIL: delivery payload leaked private delivery/source material: ${leaks.slice(0, 24).join(", ")}`);
  process.exit(1);
}
'

normal_delivery_payload_guard="$delivery_payload_guard"'
if (data.source && (data.source.label !== "Media library" || data.source.adapter !== "media-library")) {
  console.error(`FAIL: normal-user source was not redacted: ${JSON.stringify(data.source)}`);
  process.exit(1);
}
'

blocked_download_guard="$delivery_payload_guard
if (data.downloadUrl || data.url || data.signedUrl || data.originalUrl) {
  console.error(\`FAIL: blocked download response exposed a URL: \${JSON.stringify(data).slice(0, 500)}\`);
  process.exit(1);
}
"

expect_json viewer-search-delivery-safe "$normal_delivery_payload_guard" \
  "$BASE_URL/api/assets/search?role=Viewer&limit=1"

expect_json contributor-search-delivery-safe "$normal_delivery_payload_guard" \
  "$BASE_URL/api/assets/search?role=Contributor&limit=1"

expect_json viewer-asset-delivery-safe "$normal_delivery_payload_guard" \
  "$BASE_URL/api/assets/$VIEWER_ASSET_ID?role=Viewer"

expect_json contributor-asset-delivery-safe "$normal_delivery_payload_guard" \
  "$BASE_URL/api/assets/$CONTRIBUTOR_ASSET_ID?role=Contributor"

expect_json_status 403 viewer-download-gate-no-private-url "$blocked_download_guard" \
  "$BASE_URL/api/download/$BLOCKED_DOWNLOAD_ID?role=Viewer"

expect_json_any_status "403 404" reviewer-download-post-no-private-url "$blocked_download_guard" \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","termsAccepted":true,"usageChannel":"Delivery privacy smoke","reason":"Verify blocked derivative delivery does not expose private storage."}' \
  "$BASE_URL/api/download/$BLOCKED_DOWNLOAD_ID"

expect_json admin-s3-readiness-honest '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const item = (data.integrationReadiness || data.readiness || []).find((entry) => entry.id === "s3-delivery");
if (!item) {
  console.error("FAIL: admin readiness missing s3-delivery item");
  process.exit(1);
}
const text = `${item.state || ""} ${item.detail || ""}`;
if (/operational/i.test(item.state || "") || /signed (url|delivery).*ready|production.*ready|fully configured/i.test(text)) {
  console.error(`FAIL: S3 readiness overclaimed production delivery: ${JSON.stringify(item)}`);
  process.exit(1);
}
if (!/signed/i.test(item.detail || "") || !/smoke|staging|production/i.test(item.detail || "")) {
  console.error(`FAIL: S3 readiness does not name signed delivery proof gap: ${JSON.stringify(item)}`);
  process.exit(1);
}
' "$BASE_URL/api/admin/readiness?role=DAM%20Admin"

echo "Portal delivery privacy smoke complete."
