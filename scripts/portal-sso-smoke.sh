#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:4868}"
CURL_MAX_TIME="${PORTAL_SSO_SMOKE_CURL_MAX_TIME:-30}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

http_code() {
  local output="$1"
  shift
  curl --max-time "$CURL_MAX_TIME" -sS -o "$output" -w '%{http_code}' "$@"
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
  local expected_codes="$1"
  local label="$2"
  local script="$3"
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}.json"
  shift 3
  local code
  code="$(http_code "$output" "$@")"
  if ! printf ' %s ' "$expected_codes" | grep -q " $code "; then
    echo "FAIL: $label expected one of [$expected_codes] got $code"
    cat "$output"
    exit 1
  fi
  node -e "$script" < "$output"
  echo "PASS: $label ($code)"
}

trusted_headers=(
  -H "x-tjc-role: Reviewer"
  -H "cf-access-authenticated-user-email: reviewer.sso@example.test"
)

admin_headers=(
  -H "x-tjc-role: DAM Admin"
  -H "cf-access-authenticated-user-email: admin.sso@example.test"
)

contributor_headers=(
  -H "x-tjc-role: Contributor"
  -H "cf-access-authenticated-user-email: contributor.sso@example.test"
)

malicious_headers=(
  -H "x-tjc-role: not-admin"
  -H "cf-access-authenticated-user-email: malicious.sso@example.test"
)

negative_phrase_headers=(
  -H "x-tjc-role: not dam admin"
  -H "cf-access-authenticated-user-email: negative.sso@example.test"
)

no_role_claim_headers=(
  -H "cf-access-authenticated-user-email: no-role.sso@example.test"
)

group_admin_headers=(
  -H "x-tjc-role: Viewer"
  -H "x-tjc-groups: ministry members, DAM Admin"
  -H "cf-access-authenticated-user-email: group-admin.sso@example.test"
)

expect_json_status 403 malformed-admin-header-does-not-escalate '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/DAM Admin/i.test(data.error || "")) {
  console.error(`malformed admin denial copy invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' "${malicious_headers[@]}" "$BASE_URL/api/admin/readiness?role=Viewer"

expect_json_status 403 negative-admin-phrase-does-not-escalate '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/DAM Admin/i.test(data.error || "")) {
  console.error(`negative admin denial copy invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' "${negative_phrase_headers[@]}" "$BASE_URL/api/admin/readiness?role=Viewer"

expect_json_status 403 missing-trusted-role-does-not-use-query-admin '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/DAM Admin/i.test(data.error || "")) {
  console.error(`missing trusted role denial copy invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' "${no_role_claim_headers[@]}" "$BASE_URL/api/admin/readiness?role=DAM%20Admin"

expect_json group-admin-claim-beats-viewer-header '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!Array.isArray(data.readiness) || !data.betaReadiness || !data.auditLog) {
  console.error(`group admin claim did not beat lower direct role: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' "${group_admin_headers[@]}" "$BASE_URL/api/admin/readiness?role=Viewer"

expect_json admin-header-overrides-viewer '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!Array.isArray(data.readiness) || !data.betaReadiness || !data.auditLog) {
  console.error(`admin readiness missing readiness/beta/audit packets: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' "${admin_headers[@]}" "$BASE_URL/api/admin/readiness?role=Viewer"

expect_json reviewer-header-opens-review-queue '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.canReview !== true || !Array.isArray(data.assets) || !Array.isArray(data.queues)) {
  console.error(`review queue did not resolve Reviewer from trusted headers: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' "${trusted_headers[@]}" "$BASE_URL/api/review?role=Viewer&queue=pending"

expect_json reviewer-header-lists-packages '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!Array.isArray(data.packages) || data.storageMode !== "local-json") {
  console.error(`package list did not resolve Reviewer from trusted headers: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' "${trusted_headers[@]}" "$BASE_URL/api/packages?role=Viewer"

expect_json reviewer-header-previews-batch '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== false || data.count !== 1 || !/Sharing stays paused/.test(data.message || "")) {
  console.error(`batch preview did not resolve Reviewer from trusted headers: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' "${trusted_headers[@]}" \
  -d '{"role":"Viewer","action":"request-review","assetIds":["644"]}' \
  "$BASE_URL/api/batch"

expect_json contributor-header-previews-collection '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== false || data.assetCount !== 1 || !/Sharing stays paused/.test(data.message || "")) {
  console.error(`collection preview did not resolve Contributor from trusted headers: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' "${contributor_headers[@]}" \
  -d '{"role":"Viewer","assetIds":["368"],"title":"SSO smoke collection","audience":"Internal ministry"}' \
  "$BASE_URL/api/collections"

expect_json contributor-header-validates-upload '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.status !== "validated" || data.sourceLinkCaptured !== true) {
  console.error(`upload intake did not resolve Contributor from trusted headers: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -X POST "${contributor_headers[@]}" \
  -F 'role=Viewer' \
  -F 'title=SSO trusted upload test' \
  -F 'eventName=SSO trusted upload test' \
  -F 'eventDate=2026-06-10' \
  -F 'ministry=Internet Ministry' \
  -F 'source=QA Reviewer' \
  -F 'peopleVisible=No' \
  -F 'minorsVisible=No' \
  -F 'doctrineSacramentSensitive=No' \
  -F 'testimonyPastoralSensitive=No' \
  -F 'hymnMusicPresent=No' \
  -F 'usageRights=TJC-owned / permission confirmed' \
  -F 'approvalSuggestion=Internal ministry' \
  -F 'notes=No consent restrictions; no people visible.' \
  -F 'tags=Bible, worship' \
  -F 'intakeNotes=Trusted-header SSO smoke with source link only.' \
  -F 'sourceLink=https://drive.google.com/example' \
  "$BASE_URL/api/upload"

expect_json admin-header-opens-feedback-inbox '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!Array.isArray(data.feedback) || typeof data.count !== "number") {
  console.error(`feedback inbox did not resolve DAM Admin from trusted headers: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' "${admin_headers[@]}" "$BASE_URL/api/beta-feedback?role=Viewer"

expect_json_any_status "403 503" reviewer-header-keeps-unsafe-download-blocked '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.allowed !== false || data.ticket || data.downloadUrl) {
  console.error(`download gate did not return safe blocked response: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
if (data.reasonCode === "audit-required") process.exit(0);
if (!Array.isArray(data.reasonCodes) || !data.reasonCodes.length) {
  console.error(`download gate did not report blocker reason codes: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' "${trusted_headers[@]}" \
  -d '{"role":"Viewer","termsAccepted":true,"usageChannel":"SSO smoke","reason":"trusted identity rehearsal"}' \
  "$BASE_URL/api/download/368"

echo "Portal SSO smoke complete."
