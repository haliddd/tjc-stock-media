#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:4871}"
TMP_DIR="$(mktemp -d)"
API_SMOKE_EXPORT=".runtime/exports/resourcespace-metadata-99999999-$(printf "%06d" "$(($$ % 1000000))").csv"
BETA_AUTH_MODE="trusted-headers"
(
  cd "$ROOT"
  SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-portal-api-smoke}" node scripts/safe-lane-headroom-guard.mjs
)
cleanup() {
  rm -rf "$TMP_DIR"
  rm -f "$API_SMOKE_EXPORT"
}
trap cleanup EXIT

ensure_api_smoke_export_script='
const fs = require("fs");
const path = require("path");
const root = process.cwd();
const out = path.join(root, process.env.API_SMOKE_EXPORT);
fs.mkdirSync(path.dirname(out), { recursive: true });

const header = [
  "resource_id",
  "title",
  "publish_status",
  "usage_scope",
  "source_album",
  "source_system",
  "source_platform",
  "source_account",
  "source_album_path",
  "source_album_memberships",
  "people_visible",
  "rights_status",
  "consent_status",
  "reviewed_by",
  "reviewed_date",
  "image_dimensions",
  "visible_content_tags",
  "tjc_terms",
  "usage_terms",
  "approval_notes",
  "file_extension",
  "source_path",
  "master_drive_path",
  "original_filename",
  "checksum_sha256",
  "file_size",
  "captured_date",
  "event_name",
  "duplicate_group",
  "duplicate_role"
];

function row(overrides) {
  const base = {
    resource_id: "",
    title: "",
    publish_status: "Needs Review",
    usage_scope: "Do Not Publish",
    source_album: "API Workflow Check",
    source_system: "ResourceSpace export",
    source_platform: "ResourceSpace",
    source_account: "lm.photos@tjc.org",
    source_album_path: "/private/api-smoke/source-album",
    source_album_memberships: "API Workflow Check",
    people_visible: "",
    rights_status: "Needs review",
    consent_status: "Unknown",
    reviewed_by: "",
    reviewed_date: "",
    image_dimensions: "2400 x 1600",
    visible_content_tags: "Bible|worship",
    tjc_terms: "Sabbath Service|Religious Education",
    usage_terms: "website|slides",
    approval_notes: "API workflow fixture",
    file_extension: "jpg",
    source_path: "/private/api-smoke/source.jpg",
    master_drive_path: "/private/api-smoke/master.jpg",
    original_filename: "api-smoke-source.jpg",
    checksum_sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    file_size: "123456",
    captured_date: "2026-06-01",
    event_name: "API Workflow Check",
    duplicate_group: "",
    duplicate_role: ""
  };
  return { ...base, ...overrides };
}

const rows = [
  row({
    resource_id: "367",
    title: "Bible Teaching Background",
    publish_status: "Approved Public",
    usage_scope: "Public",
    source_album: "Sabbath Service",
    people_visible: "no",
    rights_status: "Rights approved",
    consent_status: "Consent confirmed",
    reviewed_by: "API Workflow Reviewer",
    reviewed_date: "2026-06-01",
    visible_content_tags: "Bible|website|landscape",
    tjc_terms: "Sabbath Service|Religious Education",
    usage_terms: "website|slides|newsletter",
    approval_notes: "TJC-owned rights approved for public workflow verification",
    original_filename: "api_workflow_367.jpg",
    checksum_sha256: "3673673673673673673673673673673673673673673673673673673673673673"
  }),
  row({
    resource_id: "368",
    title: "Bench Bible",
    publish_status: "Approved Public",
    usage_scope: "Public",
    source_account: "qa.blocker@example.test",
    source_album: "Sabbath Service",
    people_visible: "",
    rights_status: "Unknown",
    consent_status: "Unknown",
    reviewed_by: "API Workflow Reviewer",
    reviewed_date: "2026-06-01",
    visible_content_tags: "Bible|study",
    tjc_terms: "Sabbath Service|Religious Education",
    usage_terms: "website|slides",
    approval_notes: "Approved-status fixture with rights/people review blockers",
    original_filename: "bench_bible.jpg",
    checksum_sha256: "3683683683683683683683683683683683683683683683683683683683683683"
  }),
  row({
    resource_id: "380",
    title: "2012 Photo 380",
    publish_status: "Needs Review",
    usage_scope: "Do Not Publish",
    source_album: "Incoming Fellowship",
    source_account: "media.intake@tjc.org",
    people_visible: "yes",
    rights_status: "Needs review",
    consent_status: "Unknown",
    reviewed_by: "",
    reviewed_date: "",
    visible_content_tags: "people|fellowship|context-safe",
    tjc_terms: "Fellowship|Testimony",
    usage_terms: "context-safe|internal review",
    approval_notes: "Needs reviewer approval before reuse",
    original_filename: "api_workflow_380.jpg",
    checksum_sha256: "6446446446446446446446446446446446446446446446446446446446446446"
  })
];

for (let index = 1; index <= 18; index += 1) {
  rows.push(row({
    resource_id: String(700 + index),
    title: `Alpha Public ${String(index).padStart(2, "0")}`,
    publish_status: "Approved Public",
    usage_scope: "Public",
    source_album: index % 2 ? "Newsletter" : "Website Hero",
    people_visible: "no",
    rights_status: "Rights approved",
    consent_status: "Consent confirmed",
    reviewed_by: "API Workflow Reviewer",
    reviewed_date: "2026-06-01",
    visible_content_tags: index % 2 ? "flower|newsletter|stock-safe" : "Bible|website|stock-safe",
    tjc_terms: index % 2 ? "Sabbath Service|Hymns of Praise" : "Sabbath Service|Religious Education",
    usage_terms: "website|slides|newsletter|stock-safe",
    approval_notes: "Public-approved pagination/sort fixture",
    original_filename: `alpha_public_${index}.jpg`,
    checksum_sha256: `${String(index).padStart(2, "0")}`.repeat(32).slice(0, 64)
  }));
}

for (let index = 1; index <= 2100; index += 1) {
  rows.push(row({
    resource_id: String(200000 + index),
    title: `People Unknown Review ${String(index).padStart(4, "0")}`,
    publish_status: "Needs Review",
    usage_scope: "Do Not Publish",
    source_album: "People Unknown Review",
    source_account: "media.intake@tjc.org",
    people_visible: "",
    rights_status: "Needs review",
    consent_status: "Unknown",
    visible_content_tags: "people|review",
    tjc_terms: "Fellowship",
    usage_terms: "internal review",
    approval_notes: "People/minors unknown review queue fixture",
    original_filename: `people_unknown_${index}.jpg`,
    checksum_sha256: `b${String(index).padStart(63, "0")}`.slice(0, 64)
  }));
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, "\"\"")}"`;
}
fs.writeFileSync(out, `${header.map(csvCell).join(",")}\n${rows.map((item) => header.map((key) => csvCell(item[key])).join(",")).join("\n")}\n`);
console.error(`PASS: generated API smoke metadata export fixture ${out} (${rows.length} rows)`);
'

API_SMOKE_EXPORT="$API_SMOKE_EXPORT" node -e "$ensure_api_smoke_export_script"

http_code() {
  local output="$1"
  shift
  local curl_args=("$@")
  local trusted_role
  trusted_role="$(trusted_header_role "${curl_args[@]}")"
  if [ -n "$trusted_role" ]; then
    curl_args=(
      -H "x-tjc-role: $trusted_role"
      -H "x-auth-request-email: $(trusted_header_email "$trusted_role")"
      -H "cf-access-jwt-assertion: portal-api-smoke-placeholder-token"
      -H "cf-access-authenticated-user-email: $(trusted_header_email "$trusted_role")"
      -H "cf-access-groups: $trusted_role"
      "${curl_args[@]}"
    )
    if [ "$BETA_AUTH_MODE" = "beta-session" ]; then
      curl_args=(-b "$(beta_cookie_jar_for_role "$trusted_role")" "${curl_args[@]}")
    fi
  fi
  curl -sS -o "$output" -w '%{http_code}' "${curl_args[@]}"
}

http_code_without_trusted_headers() {
  local output="$1"
  shift
  curl -sS -o "$output" -w '%{http_code}' "$@"
}

trusted_header_enabled() {
  [ "${PORTAL_API_SMOKE_TRUSTED_HEADERS:-${PORTAL_QA_TRUSTED_HEADERS:-1}}" = "1" ]
}

trusted_header_email() {
  printf '%s\n' "${1// /-}@portal-api-smoke.local"
}

beta_cookie_jar_for_role() {
  case "$1" in
    Viewer) printf '%s/viewer.jar\n' "$TMP_DIR" ;;
    Contributor) printf '%s/contributor.jar\n' "$TMP_DIR" ;;
    Reviewer) printf '%s/reviewer.jar\n' "$TMP_DIR" ;;
    "DAM Admin") printf '%s/admin.jar\n' "$TMP_DIR" ;;
    *) printf '%s/viewer.jar\n' "$TMP_DIR" ;;
  esac
}

beta_password_for_role() {
  local var_name
  case "$1" in
    Viewer) var_name="BETA_VIEWER_PASSWORD" ;;
    Contributor) var_name="BETA_CONTRIBUTOR_PASSWORD" ;;
    Reviewer) var_name="BETA_REVIEWER_PASSWORD" ;;
    "DAM Admin") var_name="BETA_ADMIN_PASSWORD" ;;
    *) var_name="" ;;
  esac
  if [ -n "$var_name" ]; then
    printf '%s\n' "${!var_name:-}"
  fi
}

trusted_header_role() {
  trusted_header_enabled || return 0
  local joined=" $* "
  case "$joined" in
    *"role=DAM%20Admin"*|*"role=DAM+Admin"*|*"role=DAM Admin"*|*'"role":"DAM Admin"'*|*"'role':'DAM Admin'"*) printf '%s\n' "DAM Admin" ;;
    *"role=Reviewer"*|*'"role":"Reviewer"'*|*"'role':'Reviewer'"*) printf '%s\n' "Reviewer" ;;
    *"role=Contributor"*|*'"role":"Contributor"'*|*"'role':'Contributor'"*) printf '%s\n' "Contributor" ;;
    *"role=Viewer"*|*'"role":"Viewer"'*|*"'role':'Viewer'"*) printf '%s\n' "Viewer" ;;
    *) printf '%s\n' "Viewer" ;;
  esac
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
}

expect_code_without_trusted_headers() {
  local expected="$1"
  local label="$2"
  shift 2
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}"
  local code
  code="$(http_code_without_trusted_headers "$output" "$@")"
  if [ "$code" != "$expected" ]; then
    echo "FAIL: $label expected $expected got $code"
    cat "$output"
    exit 1
  fi
}

expect_query_role_not_trusted() {
  local label="$1"
  shift
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}"
  local code
  code="$(http_code_without_trusted_headers "$output" "$@")"
  case "$code" in
    307|403) ;;
    200)
      case "$BASE_URL" in
        http://localhost:*|http://127.0.0.1:*) ;;
        *)
          echo "FAIL: $label expected query role to be denied before reviewer access, got $code"
          exit 1
          ;;
      esac
      ;;
    *)
      echo "FAIL: $label expected query role to be denied before reviewer access, got $code"
      exit 1
      ;;
  esac
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
}

expect_json_status_without_trusted_headers() {
  local expected="$1"
  local label="$2"
  local script="$3"
  local output="$TMP_DIR/${label//[^a-zA-Z0-9_-]/_}.json"
  shift 3
  local code
  code="$(http_code_without_trusted_headers "$output" "$@")"
  if [ "$code" != "$expected" ]; then
    echo "FAIL: $label expected $expected got $code"
    cat "$output"
    exit 1
  fi
  node -e "$script" < "$output"
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
}

establish_beta_api_sessions() {
  local probe="$TMP_DIR/beta-auth-session-probe.json"
  local code
  code="$(http_code_without_trusted_headers "$probe" "$BASE_URL/api/beta-auth/session" || true)"
  BUILD_CONTRACT="small-team-beta-readiness-2026-06-17" node -e '
const fs = require("fs");
let data = {};
try { data = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); } catch {}
const build = data.build || {};
if (build.app !== "tjc-stock-media" || build.readinessContract !== process.env.BUILD_CONTRACT) {
  console.error(`FAIL: beta session build contract missing or stale: ${JSON.stringify(build).slice(0, 500)}`);
  process.exit(1);
}
const serialized = JSON.stringify(build);
if (/BETA_|SECRET|TOKEN|PASSWORD|INVITE|real-code|private-code/i.test(serialized)) {
  console.error(`FAIL: beta session build contract leaked secret-shaped text: ${serialized.slice(0, 500)}`);
  process.exit(1);
}
' "$probe"
  if ! node -e 'const fs=require("fs"); let data={}; try{data=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))}catch{} process.exit(data.enabled===true ? 0 : 1)' "$probe"; then
    BETA_AUTH_MODE="trusted-headers"
    return
  fi

  BETA_AUTH_MODE="beta-session"
  for role in Viewer Contributor Reviewer "DAM Admin"; do
    local password
    password="$(beta_password_for_role "$role")"
    if [ -z "$password" ]; then
      echo "FAIL: beta auth is enabled at $BASE_URL but ${role} password env is missing for portal-api-smoke"
      exit 1
    fi
    local payload="$TMP_DIR/api-login-${role// /-}.json"
    ROLE="$role" PASSWORD="$password" node -e 'process.stdout.write(JSON.stringify({role:process.env.ROLE,password:process.env.PASSWORD,returnTo:"/"}))' > "$payload"
    local output="$TMP_DIR/api-login-${role// /-}-response.json"
    local login_code
    login_code="$(curl -sS -o "$output" -w '%{http_code}' -c "$(beta_cookie_jar_for_role "$role")" -X POST -H 'Content-Type: application/json' --data-binary "@$payload" "$BASE_URL/api/beta-auth/login")"
    if [ "$login_code" != "200" ]; then
      echo "FAIL: beta login ${role} expected 200 got $login_code"
      cat "$output"
      exit 1
    fi
  done
}

establish_beta_api_sessions

runtime_store_write_mode() {
  local label="runtime-store-readiness-probe"
  local output="$TMP_DIR/${label}.json"
  local code
  code="$(http_code "$output" "$BASE_URL/api/admin/readiness?role=DAM%20Admin")"
  if [ "$code" != "200" ]; then
    echo "FAIL: $label expected 200 got $code"
    cat "$output"
    exit 1
  fi
  node - <<'NODE' "$output"
const fs = require("fs");
const data = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (!Array.isArray(data.integrationReadiness)) {
  console.error("FAIL: admin readiness did not expose integrationReadiness for runtime-store probe");
  process.exit(1);
}
const runtimeStore = data.integrationReadiness.find((item) => item && item.id === "runtime-state-store");
if (!runtimeStore) {
  console.error("FAIL: admin readiness missing runtime-state-store integration row");
  process.exit(1);
}
if (runtimeStore.state === "Blocked" && runtimeStore.ready === false) {
  const detail = `${runtimeStore.detail || ""}`;
  if (!/production/i.test(detail) || !/durable runtime store/i.test(detail)) {
    console.error(`FAIL: runtime-state-store blocked without durable production detail: ${JSON.stringify(runtimeStore)}`);
    process.exit(1);
  }
  process.stdout.write("blocked");
  process.exit(0);
}
if (runtimeStore.ready === true || runtimeStore.state === "Operational" || runtimeStore.state === "Degraded" || runtimeStore.state === "Local beta only") {
  process.stdout.write("writable");
  process.exit(0);
}
console.error(`FAIL: runtime-state-store state is not actionable for smoke: ${JSON.stringify(runtimeStore)}`);
process.exit(1);
NODE
}

normal_user_payload_guard='
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const forbiddenKeys = new Set([
  "metadataHealth",
  "zeroResultInsights",
  "operationalInsights",
  "resourceSpaceId",
  "resourceSpaceUrl",
  "resourceSpaceUrls",
  "duplicateGroup",
  "duplicateRole",
  "checksum",
  "checksum_sha256",
  "sourcePath",
  "source_path",
  "masterDrivePath",
  "sourceAlbumPath",
  "sourceAlbumMemberships",
  "source_album",
  "sourceLink",
  "sourceFolder",
  "originalFilename",
  "checksumSha256",
  "fileSizeBytes",
  "resource_space_id",
  "pendingReviewWrite",
  "pendingWrites",
  "review_status",
  "reviewedBy",
  "reviewed_by",
  "reviewedAt",
  "reviewed_at",
  "reuseDecision",
  "reviewer",
  "rights_status",
  "sourceAccount",
  "sourceAlbum",
  "sourcePlatform",
  "sourceSystem",
  "syncSource",
  "sync_source",
  "approvedForPublic",
  "approved_for_public",
  "approvedForInternal",
  "approved_for_internal",
  "lastSyncedAt",
  "last_synced_at",
  "workflowState",
  "portalReadiness",
  "blockedPublic",
  "blockedAssetIds",
  "fieldMappings",
  "integrationReadiness",
  "auditLog",
  "rawTotal",
  "visibleToRole",
  "approvedRaw",
  "approved",
  "portalReady",
  "batchApprovedWithBlockers",
  "needsReview",
  "pendingReview",
  "archiveCandidates",
  "childrenYouth",
  "missingSource",
  "rightsReview",
  "approvedThisMonth",
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
  /ResourceSpace/i,
  /Shared Drive/i,
  /pending writes?/i,
  /API mapping/i,
  /launch gate/i,
  /diagnostics?/i,
  /metadata health/i,
  /raw totals?/i,
  /source[- ]of[- ]truth/i,
  /field refs?/i,
  /source path/i,
  /master drive/i,
  /master\/original path/i,
  /master files?/i,
  /original filename/i,
  /checksum/i,
  /raw ResourceSpace/i,
  /ResourceSpace ID/i,
  /\bRS\s+\d+\b/,
  /[a-f0-9]{32,}/i,
  /MVP 2024/i,
  /stock media candidate/i,
  /prototype/i,
  /Demo role/i,
  /demo-fallback/i
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
      if (pattern.test(value)) leaks.push(`${path}=${JSON.stringify(value).slice(0, 120)}`);
    }
  }
}
walk(data, "");
if (leaks.length) {
  console.error(`FAIL: normal-user payload leaked operational fields/copy: ${leaks.slice(0, 20).join(", ")}`);
  process.exit(1);
}
if (data.source && (data.source.label !== "Media library" || data.source.adapter !== "media-library")) {
  console.error(`FAIL: normal-user source was not redacted: ${JSON.stringify(data.source)}`);
  process.exit(1);
}
'

expect_json_status 403 unsafe-thumbnail-viewer-payload-safe "$normal_user_payload_guard" "$BASE_URL/api/assets/thumbnail/380?variant=detail"
expect_query_role_not_trusted reviewer-query-role-not-trusted "$BASE_URL/api/assets/thumbnail/380?variant=detail&role=Reviewer"
expect_code 200 unsafe-thumbnail-reviewer "$BASE_URL/api/assets/thumbnail/380?variant=detail&role=Reviewer"
expect_code 403 unsafe-download-variant-reviewer "$BASE_URL/api/assets/thumbnail/380?variant=download&role=Reviewer"
expect_json_any_status "403 503" blocked-approved-download-viewer "$normal_user_payload_guard
if (data.downloadUrl || data.url || data.signedUrl || data.originalUrl) {
  console.error(\`FAIL: blocked download exposed URL: \${JSON.stringify(data).slice(0, 500)}\`);
  process.exit(1);
}
if (process.env.STATUS_CODE === \"503\" && data.reasonCode !== \"audit-required\") {
  console.error(\`FAIL: 503 blocked download was not audit-required: \${JSON.stringify(data).slice(0, 500)}\`);
  process.exit(1);
}
" "$BASE_URL/api/download/368?role=Viewer"
expect_query_role_not_trusted review-query-role-not-trusted "$BASE_URL/api/review?role=Reviewer&queue=pending"
expect_query_role_not_trusted admin-query-role-not-trusted "$BASE_URL/api/admin/readiness?role=DAM%20Admin"
expect_query_role_not_trusted plain-admin-query-role-not-trusted "$BASE_URL/api/admin/readiness?role=Admin"
expect_json_status_without_trusted_headers 200 admin-query-role-payload-redacted "$normal_user_payload_guard" "$BASE_URL/api/assets/367?role=DAM%20Admin"
expect_json_status_without_trusted_headers 200 plain-admin-query-role-payload-redacted "$normal_user_payload_guard" "$BASE_URL/api/assets/367?role=Admin"
expect_code 400 malformed-asset-detail "$BASE_URL/api/assets/%2E%2E380?role=Reviewer"
expect_code 400 malformed-thumbnail "$BASE_URL/api/assets/thumbnail/%2E%2E380?variant=detail&role=Reviewer"
expect_code 400 malformed-download "$BASE_URL/api/download/%2E%2E368?role=Viewer"
expect_code 400 checksum-asset-detail "$BASE_URL/api/assets/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa?role=Reviewer"
expect_code 400 checksum-thumbnail "$BASE_URL/api/assets/thumbnail/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb?variant=detail&role=Reviewer"
expect_code 400 checksum-download "$BASE_URL/api/download/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc?role=Viewer"
expect_json_status 404 missing-thumbnail-viewer-payload-safe "$normal_user_payload_guard" "$BASE_URL/api/assets/thumbnail/999999?variant=detail&role=Viewer"
expect_json_status 400 unknown-saved-view-payload-safe '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (Object.prototype.hasOwnProperty.call(data, "view") || JSON.stringify(data).includes("../")) {
  console.error("FAIL: unknown saved-view response echoed rejected input");
  process.exit(1);
}
' "$BASE_URL/api/assets/search?role=Viewer&view=../../admin"
expect_json_status 400 unknown-collection-payload-safe '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (Object.prototype.hasOwnProperty.call(data, "collection") || JSON.stringify(data).includes("../")) {
  console.error("FAIL: unknown collection response echoed rejected input");
  process.exit(1);
}
' "$BASE_URL/api/assets/search?role=Viewer&collection=../../admin"
expect_json_status 400 unknown-sort-payload-safe '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (Object.prototype.hasOwnProperty.call(data, "sort") || text.includes("../") || /source path|master drive|checksum|[a-f0-9]{32,}/i.test(text)) {
  console.error("FAIL: unknown sort response echoed rejected input");
  process.exit(1);
}
' "$BASE_URL/api/assets/search?role=Viewer&sort=../private-source-path"

expect_json_status 200 unsafe-search-query-filter-sanitized '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (data.appliedIntent?.rawQuery || text.includes("../private") || /source path|master drive|checksum|[a-f0-9]{32,}/i.test(text)) {
  console.error(`FAIL: unsafe search query/filter leaked into response: ${text.slice(0, 900)}`);
  process.exit(1);
}
' "$BASE_URL/api/assets/search?role=Viewer&q=source%20path%20master%20drive&filter=checksum%7CBible&limit=1"

expect_code 400 bad-review-action \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","id":"380","action":"Made Up"}' \
  "$BASE_URL/api/review"

expect_code 400 malformed-review-asset \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","id":"../380","action":"Approve Public"}' \
  "$BASE_URL/api/review"

expect_code 404 missing-review-asset \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","id":"999999","action":"Approve Public"}' \
  "$BASE_URL/api/review"

expect_json_status 403 review-action-viewer-denied-payload-safe "$normal_user_payload_guard" \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Viewer","id":"380","action":"Request More Info","notes":"Viewer should not review."}' \
  "$BASE_URL/api/review"

expect_json_status 400 review-action-missing-evidence '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const missing = data.missingEvidence || [];
if (!Array.isArray(missing) || !missing.includes("sourceConfirmed") || !missing.includes("reviewNote")) {
  console.error(`FAIL: missing evidence did not list checklist/note blockers: ${JSON.stringify(data)}`);
  process.exit(1);
}
if (/updated through the live API|synced_to_resourcespace/i.test(JSON.stringify(data))) {
  console.error("FAIL: incomplete review action claimed ResourceSpace sync");
  process.exit(1);
}
' \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","id":"380","action":"Approve Public","notes":"short","checklist":{}}' \
  "$BASE_URL/api/review"

RUNTIME_STORE_WRITE_MODE="$(runtime_store_write_mode)"
review_action_sync_payload='{"role":"Reviewer","id":"380","action":"Request More Info","notes":"QA review workflow decision with complete minimum evidence.","checklist":{"sourceConfirmed":true,"rightsConfirmed":true,"peopleVisibilityConfirmed":true,"childrenYouthChecked":true,"usageScopeSelected":true},"reviewerName":"API Workflow Reviewer"}'

if [ "$RUNTIME_STORE_WRITE_MODE" = "blocked" ]; then
expect_json_status 503 review-action-runtime-store-required '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (data.reasonCode !== "runtime-store-required") {
  console.error(`FAIL: runtime-store blocked review did not return exact reasonCode: ${text}`);
  process.exit(1);
}
if (!/Durable runtime store required/i.test(data.detail || "")) {
  console.error(`FAIL: runtime-store blocked review missing durable-store detail: ${text}`);
  process.exit(1);
}
if (data.pendingWriteId || data.auditRecord || data.usageRecord) {
  console.error(`FAIL: runtime-store blocked review claimed write/audit success: ${text}`);
  process.exit(1);
}
if (data.sync?.ok === true || data.mode === "resourcespace-live-writeback" || data.syncState === "synced_to_resourcespace" || /updated through the live API|synced_to_resourcespace/i.test(text)) {
  console.error(`FAIL: runtime-store blocked review claimed ResourceSpace sync: ${text}`);
  process.exit(1);
}
if (/sourcePath|masterDrivePath|sourceAlbumPath|sourceAlbumMemberships|originalFilename|checksumSha256|resourceSpaceUrl|resourceSpaceUrls|adminUrl|\/private\/|[a-f0-9]{32,}/i.test(text)) {
  console.error(`FAIL: runtime-store blocked review leaked private/source/admin payload: ${text.slice(0, 900)}`);
  process.exit(1);
}
' \
  -X POST -H 'Content-Type: application/json' \
  -d "$review_action_sync_payload" \
  "$BASE_URL/api/review"
else
expect_json_any_status "200 202" review-action-sync-truth '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const code = process.env.STATUS_CODE;
if (data.ok !== true || !data.pendingWriteId || !data.auditRecord) {
  console.error(`FAIL: review action did not return pending write/audit proof: ${JSON.stringify(data)}`);
  process.exit(1);
}
if (data.auditRecord.reviewerRole !== "Reviewer" || data.auditRecord.requestedStatus !== "Needs Review") {
  console.error(`FAIL: review action audit proof has wrong role/status: ${JSON.stringify(data.auditRecord)}`);
  process.exit(1);
}
if (!data.auditRecord.actor || data.auditRecord.actor !== data.usageRecord?.actor) {
  console.error(`FAIL: review audit/usage actor mismatch: ${JSON.stringify({ audit: data.auditRecord, usage: data.usageRecord })}`);
  process.exit(1);
}
if (code === "200") {
  if (data.sync?.ok !== true || data.mode !== "resourcespace-live-writeback" || data.syncState !== "synced_to_resourcespace") {
    console.error(`FAIL: 200 review response did not prove live ResourceSpace writeback: ${JSON.stringify(data)}`);
    process.exit(1);
  }
} else {
  const text = JSON.stringify(data);
  if (data.sync?.ok !== false || data.mode === "resourcespace-live-writeback" || /updated through the live API|synced_to_resourcespace/i.test(text)) {
    console.error(`FAIL: queued review response claimed ResourceSpace success: ${text}`);
    process.exit(1);
  }
  if (!["queued", "ready_to_sync", "sync_failed"].includes(data.syncState)) {
    console.error(`FAIL: queued review response had unexpected sync state: ${data.syncState}`);
    process.exit(1);
  }
}
' \
  -X POST -H 'Content-Type: application/json' \
  -d "$review_action_sync_payload" \
  "$BASE_URL/api/review"
fi

expect_json_status 400 empty-upload-contributor-payload-safe "$normal_user_payload_guard" \
  -X POST -F 'role=Contributor' -F 'eventName=No files test' \
  "$BASE_URL/api/upload"

expect_json noncanonical-upload-tags '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (data.status !== "needs-review" || data.defaultReviewState !== "Needs Review" || data.defaultUsageScope !== "Do Not Publish") {
  console.error(`FAIL: noncanonical upload tag intake did not create needs-review batch: ${text.slice(0, 700)}`);
  process.exit(1);
}
if (!Array.isArray(data.reviewerTasks) || !data.reviewerTasks.some((task) => /Taxonomy reviewer/i.test(task))) {
  console.error(`FAIL: noncanonical upload tag did not become taxonomy reviewer task: ${text.slice(0, 700)}`);
  process.exit(1);
}
if (data.resourceSpaceWritten !== false) {
  console.error(`FAIL: upload response claimed ResourceSpace write: ${text.slice(0, 700)}`);
  process.exit(1);
}
' \
  -X POST \
  -F 'role=Contributor' \
  -F 'title=Noncanonical tag test' \
  -F 'eventName=Noncanonical tag test' \
  -F 'eventDate=2026-06-06' \
  -F 'ministry=Internet Ministry' \
  -F 'source=QA Reviewer' \
  -F 'peopleVisible=No' \
  -F 'minorsVisible=No' \
  -F 'usageRights=TJC-owned / permission confirmed' \
  -F 'approvalSuggestion=Internal ministry' \
  -F 'notes=No consent restrictions; no people visible.' \
  -F 'doctrineSacramentSensitive=No' \
  -F 'testimonyPastoralSensitive=No' \
  -F 'hymnMusicPresent=No' \
  -F 'tags=qa-only' \
  -F 'intakeNotes=QA invalid taxonomy intake.' \
  -F 'sourceLink=https://drive.google.com/example' \
  "$BASE_URL/api/upload"

expect_json noncanonical-upload-tags-payload-safe "$normal_user_payload_guard" \
  -X POST \
  -F 'role=Contributor' \
  -F 'title=Noncanonical tag test' \
  -F 'eventName=Noncanonical tag test' \
  -F 'eventDate=2026-06-06' \
  -F 'ministry=Internet Ministry' \
  -F 'source=QA Reviewer' \
  -F 'peopleVisible=No' \
  -F 'minorsVisible=No' \
  -F 'usageRights=TJC-owned / permission confirmed' \
  -F 'approvalSuggestion=Internal ministry' \
  -F 'notes=No consent restrictions; no people visible.' \
  -F 'doctrineSacramentSensitive=No' \
  -F 'testimonyPastoralSensitive=No' \
  -F 'hymnMusicPresent=No' \
  -F 'tags=qa-only' \
  -F 'intakeNotes=QA invalid taxonomy intake.' \
  -F 'sourceLink=https://drive.google.com/example' \
  "$BASE_URL/api/upload"

expect_json unsafe-upload-tags-sanitized '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (data.status !== "needs-review" || data.resourceSpaceWritten !== false) {
  console.error(`FAIL: unsafe upload tags did not create honest needs-review packet: ${text.slice(0, 700)}`);
  process.exit(1);
}
if (!Array.isArray(data.reviewerTasks) || !data.reviewerTasks.some((task) => /Taxonomy reviewer/i.test(task))) {
  console.error(`FAIL: unsafe upload tags did not become taxonomy reviewer task: ${text.slice(0, 700)}`);
  process.exit(1);
}
if (text.includes("../private") || /source path|master drive|checksum|[a-f0-9]{32,}/i.test(text)) {
  console.error(`FAIL: unsafe upload tags echoed unsafe material: ${text.slice(0, 700)}`);
  process.exit(1);
}
' -X POST \
  -F 'role=Contributor' \
  -F 'title=Unsafe tag test' \
  -F 'eventName=Unsafe tag test' \
  -F 'eventDate=2026-06-06' \
  -F 'ministry=Internet Ministry' \
  -F 'source=QA Reviewer' \
  -F 'peopleVisible=No' \
  -F 'minorsVisible=No' \
  -F 'usageRights=TJC-owned / permission confirmed' \
  -F 'approvalSuggestion=Internal ministry' \
  -F 'notes=No consent restrictions; no people visible.' \
  -F 'doctrineSacramentSensitive=No' \
  -F 'testimonyPastoralSensitive=No' \
  -F 'hymnMusicPresent=No' \
  -F 'tags=source path, master drive, checksum' \
  -F 'intakeNotes=QA unsafe tag intake.' \
  -F 'sourceLink=https://drive.google.com/example' \
  "$BASE_URL/api/upload"

expect_json source-link-upload-contributor '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.status !== "needs-review" || data.fileCount !== 0 || data.sourceLinkCaptured !== true || data.defaultReviewState !== "Needs Review" || data.defaultUsageScope !== "Do Not Publish") {
  console.error("FAIL: source-link intake was not accepted without local files");
  process.exit(1);
}
const text = JSON.stringify(data);
const operationalText = text.replace(/resourceSpaceWritten/g, "resource_written");
if (/drive\.google\.com/i.test(text) || Object.prototype.hasOwnProperty.call(data, "sourceLink")) {
  console.error("FAIL: contributor upload response echoed source-link details");
  process.exit(1);
}
if (/ResourceSpace|Shared Drive|pending writes?|API mapping|launch gate|diagnostics?|metadata health|raw totals?|source[- ]of[- ]truth|field refs?|source path|master drive|master\/original path|master files?|original filename|checksum|raw ResourceSpace|ResourceSpace ID|\bRS\s+\d+\b/i.test(operationalText)) {
  console.error("FAIL: contributor upload response leaked operational copy");
  process.exit(1);
}
' -X POST \
  -F 'role=Contributor' \
  -F 'title=Source link test' \
  -F 'eventName=Source link test' \
  -F 'eventDate=2026-06-06' \
  -F 'ministry=Internet Ministry' \
  -F 'source=QA Reviewer' \
  -F 'peopleVisible=No' \
  -F 'minorsVisible=No' \
  -F 'usageRights=TJC-owned / permission confirmed' \
  -F 'approvalSuggestion=Internal ministry' \
  -F 'notes=No consent restrictions; no people visible.' \
  -F 'doctrineSacramentSensitive=No' \
  -F 'testimonyPastoralSensitive=No' \
  -F 'hymnMusicPresent=No' \
  -F 'tags=Bible, worship' \
  -F 'intakeNotes=QA no-file intake with source link only.' \
  -F 'sourceLink=https://drive.google.com/example' \
  "$BASE_URL/api/upload"

expect_json_status 400 unsafe-source-link-upload-blocked '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (!/file|source link|media link/i.test(data.error || "")) {
  console.error(`FAIL: unsafe source link did not behave like missing intake evidence: ${text.slice(0, 700)}`);
  process.exit(1);
}
if (/javascript:|source path|master drive|checksum|\.\.\/private/i.test(text)) {
  console.error(`FAIL: unsafe source link response echoed unsafe material: ${text.slice(0, 700)}`);
  process.exit(1);
}
' -X POST \
  -F 'role=Contributor' \
  -F 'title=Unsafe source link test' \
  -F 'eventName=Unsafe source link test' \
  -F 'eventDate=2026-06-06' \
  -F 'ministry=Internet Ministry' \
  -F 'source=QA Reviewer' \
  -F 'peopleVisible=No' \
  -F 'minorsVisible=No' \
  -F 'usageRights=TJC-owned / permission confirmed' \
  -F 'approvalSuggestion=Internal ministry' \
  -F 'notes=No consent restrictions; no people visible.' \
  -F 'doctrineSacramentSensitive=No' \
  -F 'testimonyPastoralSensitive=No' \
  -F 'hymnMusicPresent=No' \
  -F 'tags=Bible, worship' \
  -F 'intakeNotes=QA unsafe source link intake.' \
  -F 'sourceLink=javascript:alert(1)' \
  "$BASE_URL/api/upload"

expect_json_status 400 upload-display-fields-sanitized '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (!Array.isArray(data.missingRequired) || !data.missingRequired.includes("batch/event name") || !data.missingRequired.includes("event date") || !data.missingRequired.includes("ministry/team") || !data.missingRequired.includes("source/photographer")) {
  console.error(`FAIL: unsafe upload display/date fields did not become missing requirements: ${text.slice(0, 700)}`);
  process.exit(1);
}
if (text.includes("../private") || /source path|master drive|checksum/i.test(text)) {
  console.error(`FAIL: upload validation echoed unsafe display fields: ${text.slice(0, 700)}`);
  process.exit(1);
}
' -X POST \
  -F 'role=Contributor' \
  -F 'title=../private source path' \
  -F 'eventName=../private event' \
  -F 'eventDate=2026-02-30' \
  -F 'ministry=../private master drive' \
  -F 'source=../private checksum' \
  -F 'peopleVisible=No' \
  -F 'minorsVisible=No' \
  -F 'usageRights=TJC-owned / permission confirmed' \
  -F 'approvalSuggestion=Internal ministry' \
  -F 'notes=No consent restrictions; no people visible.' \
  -F 'doctrineSacramentSensitive=No' \
  -F 'testimonyPastoralSensitive=No' \
  -F 'hymnMusicPresent=No' \
  -F 'tags=Bible, worship' \
  -F 'intakeNotes=QA unsafe display fields.' \
  -F 'sourceLink=https://drive.google.com/example' \
  "$BASE_URL/api/upload"

expect_json_status 400 upload-checksum-display-fields-sanitized '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (!Array.isArray(data.missingRequired) || !data.missingRequired.includes("batch/event name") || !data.missingRequired.includes("ministry/team") || !data.missingRequired.includes("source/photographer")) {
  console.error(`FAIL: checksum-shaped upload display fields did not become missing requirements: ${text.slice(0, 700)}`);
  process.exit(1);
}
if (/[a-f0-9]{32,}/i.test(text)) {
  console.error(`FAIL: upload validation echoed checksum-shaped display fields: ${text.slice(0, 700)}`);
  process.exit(1);
}
' -X POST \
  -F 'role=Contributor' \
  -F 'title=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' \
  -F 'eventName=Checksum private-token event' \
  -F 'eventDate=2026-06-06' \
  -F 'ministry=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' \
  -F 'source=cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc' \
  -F 'peopleVisible=No' \
  -F 'minorsVisible=No' \
  -F 'usageRights=TJC-owned / permission confirmed' \
  -F 'approvalSuggestion=Internal ministry' \
  -F 'notes=No consent restrictions; no people visible.' \
  -F 'doctrineSacramentSensitive=No' \
  -F 'testimonyPastoralSensitive=No' \
  -F 'hymnMusicPresent=No' \
  -F 'tags=Bible, worship' \
  -F 'intakeNotes=QA checksum-shaped display fields.' \
  -F 'sourceLink=https://drive.google.com/example' \
  "$BASE_URL/api/upload"

expect_json_status 403 batch-viewer-payload-safe '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (/governance|ResourceSpace|Shared Drive|pending writes?|API mapping|launch gate|diagnostics?|metadata health|raw totals?|field refs?|source[- ]of[- ]truth/i.test(text)) {
  console.error(`FAIL: batch viewer denial leaked operational copy: ${text}`);
  process.exit(1);
}
if (!/reviewer access/i.test(data.error || "")) {
  console.error(`FAIL: batch viewer denial did not use safe reviewer-access copy: ${text}`);
  process.exit(1);
}
' \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Viewer","action":"request-review","assetIds":["380"]}' \
  "$BASE_URL/api/batch"

expect_code 400 batch-malformed-asset \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","action":"request-review","assetIds":["../380"]}' \
  "$BASE_URL/api/batch"

expect_code 400 batch-checksum-asset \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","action":"request-review","assetIds":["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]}' \
  "$BASE_URL/api/batch"

expect_json_status 404 batch-missing-asset-payload-safe '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (Object.prototype.hasOwnProperty.call(data, "missing") || text.includes("999999") || text.includes("../")) {
  console.error("FAIL: batch missing response echoed selected asset IDs");
  process.exit(1);
}
if (data.missingCount !== 1) {
  console.error(`FAIL: batch missing response did not return safe count: ${JSON.stringify(data)}`);
  process.exit(1);
}
' \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","action":"request-review","assetIds":["999999"]}' \
  "$BASE_URL/api/batch"

expect_json batch-preview-reviewer '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== false || data.count !== 1 || !/Sharing stays paused/.test(data.message || "") || /library sync|source records/i.test(data.message || "")) {
  console.error("FAIL: batch preview did not stay read-only/honest");
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Reviewer","action":"request-review","assetIds":["380"]}' \
  "$BASE_URL/api/batch"

expect_code 403 collection-viewer \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Viewer","assetIds":["368"],"title":"Viewer collection"}' \
  "$BASE_URL/api/collections"

expect_code 400 collection-malformed-asset \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Contributor","assetIds":["../368"],"title":"Bad collection"}' \
  "$BASE_URL/api/collections"

expect_code 403 collection-hidden-asset-contributor \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Contributor","assetIds":["380"],"title":"Unsafe collection"}' \
  "$BASE_URL/api/collections"

expect_json_status 404 collection-missing-asset-payload-safe '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (Object.prototype.hasOwnProperty.call(data, "missing") || text.includes("999999") || text.includes("../")) {
  console.error("FAIL: collection missing response echoed selected asset IDs");
  process.exit(1);
}
if (data.missingCount !== 1) {
  console.error(`FAIL: collection missing response did not return safe count: ${JSON.stringify(data)}`);
  process.exit(1);
}
if (/ResourceSpace|Shared Drive|pending writes?|API mapping|launch gate|public gate|diagnostics?|metadata health|raw totals?|source[- ]of[- ]truth|field refs?|source path|master drive|master\/original path|master files?|original filename|checksum|raw ResourceSpace|ResourceSpace ID|\bRS\s+\d+\b|Persistence/i.test(text)) {
  console.error("FAIL: collection missing response leaked operational copy");
  process.exit(1);
}
' \
  -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Contributor","assetIds":["999999"],"title":"Missing collection"}' \
  "$BASE_URL/api/collections"

expect_json collection-preview-contributor '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== false || data.assetCount !== 1 || !/Sharing stays paused/.test(data.message || "")) {
  console.error("FAIL: collection draft preview did not stay read-only/honest");
  process.exit(1);
}
const text = JSON.stringify(data);
if (/ResourceSpace|Shared Drive|pending writes?|API mapping|launch gate|public gate|diagnostics?|metadata health|raw totals?|source[- ]of[- ]truth|field refs?|source path|master drive|master\/original path|master files?|original filename|checksum|raw ResourceSpace|ResourceSpace ID|\bRS\s+\d+\b|Persistence/i.test(text)) {
  console.error("FAIL: contributor collection response leaked operational copy");
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Contributor","assetIds":["368"],"title":"Approved collection","audience":"Internal ministry"}' \
  "$BASE_URL/api/collections"

expect_json collection-display-fields-sanitized '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (data.title !== "Untitled ministry collection" || data.owner !== "Ministry media" || data.expiry !== null || text.includes("../private") || /source path|master drive|checksum/i.test(text)) {
  console.error(`FAIL: collection display fields were not sanitized: ${text.slice(0, 700)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Contributor","assetIds":["368"],"title":"source path handoff","owner":"master drive checksum owner","expiry":"2026-02-30","audience":"Internal ministry"}' \
  "$BASE_URL/api/collections"

expect_json collection-checksum-display-fields-sanitized '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (data.title !== "Untitled ministry collection" || data.owner !== "Ministry media" || /[a-f0-9]{32,}/i.test(text)) {
  console.error(`FAIL: collection checksum-shaped display fields were not sanitized: ${text.slice(0, 700)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Contributor","assetIds":["368"],"title":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","owner":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb","expiry":"2026-02-30","audience":"Internal ministry"}' \
  "$BASE_URL/api/collections"

expect_json collection-expiry-date-preserved '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.expiry !== "2026-06-30") {
  console.error(`FAIL: valid collection expiry date was not preserved: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Contributor","assetIds":["368"],"title":"Expiry test","expiry":"2026-06-30","audience":"Internal ministry"}' \
  "$BASE_URL/api/collections"

expect_json_status 403 public-portal-collection-gate '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/cannot add|selected assets|collection draft/i.test(data.error || "")) {
  console.error("FAIL: public portal draft did not block non-portal-ready asset explicitly");
  process.exit(1);
}
const text = JSON.stringify(data);
if (/ResourceSpace|Shared Drive|pending writes?|API mapping|launch gate|public gate|diagnostics?|metadata health|raw totals?|source[- ]of[- ]truth|field refs?|source path|master drive|master\/original path|master files?|original filename|checksum|raw ResourceSpace|ResourceSpace ID|\bRS\s+\d+\b|Persistence/i.test(text) || data.portalReadiness || data.blockedPublic) {
  console.error("FAIL: public collection gate response leaked operational copy");
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Contributor","assetIds":["380"],"title":"Public candidate","audience":"Public-approved portal"}' \
  "$BASE_URL/api/collections"

expect_json reviewer-admin-links-blocked '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const count = Object.keys(data.resourceSpaceUrls || {}).length;
if (count !== 0) {
  console.error(`FAIL: Reviewer received ${count} ResourceSpace admin URLs`);
  process.exit(1);
}
' "$BASE_URL/api/review?role=Reviewer&queue=pending"

expect_json_status 403 review-queue-viewer-payload-safe "$normal_user_payload_guard" "$BASE_URL/api/review?role=Viewer&queue=pending"
expect_json_status 403 review-queue-contributor-payload-safe "$normal_user_payload_guard" "$BASE_URL/api/review?role=Contributor&queue=pending"

expect_json dam-admin-links-visible '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const count = Object.keys(data.resourceSpaceUrls || {}).length;
if (count < 1) {
  console.error("FAIL: DAM Admin did not receive ResourceSpace admin URLs");
  process.exit(1);
}
' "$BASE_URL/api/review?role=DAM%20Admin&queue=pending"

expect_code 403 admin-readiness-viewer "$BASE_URL/api/admin/readiness?role=Viewer"

expect_json admin-readiness-dam-admin '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!Array.isArray(data.readiness) || !Array.isArray(data.fieldMappings) || !Array.isArray(data.vocabulary)) {
  console.error("FAIL: DAM readiness did not return readiness, field mappings, and vocabulary");
  process.exit(1);
}
' "$BASE_URL/api/admin/readiness?role=DAM%20Admin"

expect_json canonical-duplicate-groups-not-queue '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const duplicateQueue = data.queues.find((queue) => queue.id === "duplicate-candidates");
if (!duplicateQueue) {
  console.error("FAIL: duplicate queue missing");
  process.exit(1);
}
if (duplicateQueue.count > 999) {
  console.error(`FAIL: canonical duplicate groups inflated review queue: ${duplicateQueue.count}`);
  process.exit(1);
}
' "$BASE_URL/api/review?role=Reviewer&queue=duplicate-candidates"

expect_json limit-clamped '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.assets.length !== 1 || data.counts.rendered !== 1) {
  console.error(`FAIL: negative limit was not clamped to 1: ${data.assets.length}/${data.counts.rendered}`);
  process.exit(1);
}
' "$BASE_URL/api/assets/search?role=Viewer&limit=-1"

expect_json paginated-search-range '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.assets.length !== 5 || data.pagination?.rangeStart !== 6 || data.pagination?.rangeEnd !== 10 || data.pagination?.previousOffset !== 0 || data.pagination?.nextOffset !== 10) {
  console.error(`FAIL: pagination range/offset incorrect: ${JSON.stringify(data.pagination)}`);
  process.exit(1);
}
' "$BASE_URL/api/assets/search?role=Viewer&limit=5&offset=5"

expect_json reviewer-approved-rights-unknown-stays-review '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if ((data.counts?.rightsReview || 0) < 1 || (data.metadataHealth?.needsRights || 0) < 1) {
  console.error("FAIL: approved assets with unknown rights/consent were treated as fully clear");
  process.exit(1);
}
' "$BASE_URL/api/assets/search?role=Reviewer&view=approved-church-wide&limit=5"

expect_json viewer-search-redacts-operational-diagnostics '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const forbiddenTopLevel = ["metadataHealth", "zeroResultInsights", "operationalInsights"];
const leakedTopLevel = forbiddenTopLevel.filter((key) => key in data);
if (leakedTopLevel.length) {
  console.error(`FAIL: Viewer search leaked ${leakedTopLevel.join(", ")}`);
  process.exit(1);
}
const forbiddenCounts = [
  "rawTotal",
  "visibleToRole",
  "approvedRaw",
  "approved",
  "portalReady",
  "batchApprovedWithBlockers",
  "needsReview",
  "pendingReview",
  "archive",
  "archiveCandidates",
  "blocked",
  "childrenYouth",
  "missingSource",
  "rightsReview",
  "approvedThisMonth"
];
const leakedCounts = forbiddenCounts.filter((key) => data.counts && key in data.counts);
if (leakedCounts.length) {
  console.error(`FAIL: Viewer search leaked ${leakedCounts.map((key) => `counts.${key}`).join(", ")}`);
  process.exit(1);
}
if (!data.source || data.source.label !== "Media library" || data.source.adapter !== "media-library") {
  console.error("FAIL: Viewer search source was not redacted");
  process.exit(1);
}
' "$BASE_URL/api/assets/search?role=Viewer&limit=1"

expect_json viewer-search-payload-safe "$normal_user_payload_guard" "$BASE_URL/api/assets/search?role=Viewer&limit=1"
expect_json contributor-search-payload-safe "$normal_user_payload_guard" "$BASE_URL/api/assets/search?role=Contributor&limit=1"
expect_json viewer-asset-payload-safe "$normal_user_payload_guard" "$BASE_URL/api/assets/367?role=Viewer"
expect_json viewer-asset-detail-scaffold-safe "$normal_user_payload_guard" "$BASE_URL/api/assets/368?role=Viewer"
expect_json contributor-asset-payload-safe "$normal_user_payload_guard" "$BASE_URL/api/assets/367?role=Contributor"
expect_json_any_status "403 503" viewer-denied-download-payload-safe "$normal_user_payload_guard
if (data.downloadUrl || data.url || data.signedUrl || data.originalUrl) {
  console.error(\`FAIL: Viewer denied download exposed URL: \${JSON.stringify(data).slice(0, 500)}\`);
  process.exit(1);
}
if (process.env.STATUS_CODE === \"503\" && data.reasonCode !== \"audit-required\") {
  console.error(\`FAIL: Viewer denied download 503 was not audit-required: \${JSON.stringify(data).slice(0, 500)}\`);
  process.exit(1);
}
" "$BASE_URL/api/download/368?role=Viewer"
expect_json_any_status "403 503" contributor-denied-download-payload-safe "$normal_user_payload_guard
if (data.downloadUrl || data.url || data.signedUrl || data.originalUrl) {
  console.error(\`FAIL: Contributor denied download exposed URL: \${JSON.stringify(data).slice(0, 500)}\`);
  process.exit(1);
}
if (process.env.STATUS_CODE === \"503\" && data.reasonCode !== \"audit-required\") {
  console.error(\`FAIL: Contributor denied download 503 was not audit-required: \${JSON.stringify(data).slice(0, 500)}\`);
  process.exit(1);
}
" "$BASE_URL/api/download/368?role=Contributor"
if [ "$RUNTIME_STORE_WRITE_MODE" = "blocked" ]; then
expect_json_status 503 download-gate-audit-required '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (data.reasonCode !== "audit-required") {
  console.error(`FAIL: blocked download audit did not return exact audit-required reason: ${text}`);
  process.exit(1);
}
if (data.downloadUrl || data.url || data.signedUrl || data.originalUrl) {
  console.error(`FAIL: blocked download audit exposed URL: ${text}`);
  process.exit(1);
}
if (data.auditRecord || data.usageRecord || /audit.*success|persisted":true|persisted successfully/i.test(text)) {
  console.error(`FAIL: blocked download audit claimed persisted audit success: ${text}`);
  process.exit(1);
}
if (/sourcePath|masterDrivePath|sourceAlbumPath|sourceAlbumMemberships|originalFilename|checksumSha256|resourceSpaceUrl|resourceSpaceUrls|adminUrl|\/private\/|[a-f0-9]{32,}/i.test(text)) {
  console.error(`FAIL: blocked download audit leaked private/source/admin payload: ${text.slice(0, 900)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Viewer","termsAccepted":true,"variant":"../private-source-path","usageChannel":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","reason":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}' \
  "$BASE_URL/api/download/380"
else
expect_json_status 403 download-gate-metadata-sanitized '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if (data.downloadUrl || text.includes("../private") || /source path|master drive|checksum|[a-f0-9]{32,}/i.test(text)) {
  console.error(`FAIL: blocked download gate echoed unsafe metadata: ${text.slice(0, 700)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d '{"role":"Viewer","termsAccepted":true,"variant":"../private-source-path","usageChannel":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","reason":"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"}' \
  "$BASE_URL/api/download/380"
fi

expect_json rights-status-not-publish-status '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.asset?.rightsStatus === data.asset?.status || /Approved Public|Approved Internal|Needs Review/.test(data.asset?.rightsStatus || "")) {
  console.error("FAIL: publish status leaked into rights status display");
  process.exit(1);
}
' "$BASE_URL/api/assets/368?role=Viewer"

expect_json role-scoped-search-images '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const first = data.assets[0];
if (!first?.imageUrls?.card?.includes("role=Reviewer") || !first?.preview?.includes("role=Reviewer")) {
  console.error("FAIL: search response image URLs are not role scoped");
  process.exit(1);
}
' "$BASE_URL/api/assets/search?role=Reviewer&view=needs-review&limit=5"

expect_json viewer-payload-hides-original-metadata '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const asset = data.asset;
const leaked = ["sourcePath", "masterDrivePath", "sourceAlbumPath", "sourceAlbumMemberships", "originalFilename", "checksumSha256", "duplicateGroup", "duplicateRole", "fileSizeBytes"].filter((key) => asset && key in asset);
if (leaked.length) {
  console.error(`FAIL: Viewer asset payload leaked restricted metadata: ${leaked.join(", ")}`);
  process.exit(1);
}
' "$BASE_URL/api/assets/367?role=Viewer"

expect_json reviewer-payload-hides-source-custody '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const asset = data.asset;
const leaked = ["sourcePath", "masterDrivePath", "sourceAlbumPath", "sourceAlbumMemberships", "originalFilename", "checksumSha256", "duplicateGroup", "duplicateRole"].filter((key) => asset && key in asset);
if (leaked.length) {
  console.error(`FAIL: Reviewer asset payload leaked source custody metadata: ${leaked.join(", ")}`);
  process.exit(1);
}
' "$BASE_URL/api/assets/367?role=Reviewer"

expect_json dam-admin-payload-keeps-source-custody '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!data.asset?.sourcePath || !data.asset?.originalFilename || !data.asset?.checksumSha256) {
  console.error("FAIL: DAM Admin asset payload lost source custody metadata");
  process.exit(1);
}
' "$BASE_URL/api/assets/367?role=DAM%20Admin"

expect_json people-unknown-saved-view '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.total < 1 || !data.assets.every((asset) => asset.peopleRisk === "Unknown")) {
  console.error("FAIL: people-unknown saved view is not backed by people/minors metadata");
  process.exit(1);
}
' "$BASE_URL/api/assets/search?role=Reviewer&view=people-unknown&limit=10"

expect_json brand-kit-viewer-redacts-operations '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if ("collectionStatus" in data || data.kit?.collectionEnvKey || data.kit?.resourceSpaceCollectionId) {
  console.error(`FAIL: Viewer Brand Kit leaked collection operations: ${JSON.stringify(data.kit).slice(0, 500)}`);
  process.exit(1);
}
const leakedSection = (data.kit?.sections || []).find((section) => section.envKey || section.resourceSpaceCollectionId);
if (leakedSection) {
  console.error(`FAIL: Viewer Brand Kit section leaked operations: ${JSON.stringify(leakedSection)}`);
  process.exit(1);
}
if (/BRAND_KIT_|ResourceSpace collection|collection\/source membership|Configured BRAND_KIT|Missing BRAND_KIT/i.test(text)) {
  console.error(`FAIL: Viewer Brand Kit leaked operational setup copy: ${text.slice(0, 900)}`);
  process.exit(1);
}
if (!data.source || data.source.label !== "Media library") {
  console.error(`FAIL: Viewer Brand Kit source was not redacted: ${JSON.stringify(data.source)}`);
  process.exit(1);
}
' "$BASE_URL/api/brand-kits/mvp-2024?role=Viewer"

expect_json brand-kit-contributor-redacts-operations '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const text = JSON.stringify(data);
if ("collectionStatus" in data || data.kit?.collectionEnvKey || data.kit?.resourceSpaceCollectionId) {
  console.error(`FAIL: Contributor Brand Kit leaked collection operations: ${JSON.stringify(data.kit).slice(0, 500)}`);
  process.exit(1);
}
if (/BRAND_KIT_|ResourceSpace collection|collection\/source membership|Configured BRAND_KIT|Missing BRAND_KIT/i.test(text)) {
  console.error(`FAIL: Contributor Brand Kit leaked operational setup copy: ${text.slice(0, 900)}`);
  process.exit(1);
}
' "$BASE_URL/api/brand-kits/mvp-2024?role=Contributor"

expect_json brand-kit-admin-keeps-operations '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!data.kit || !("collectionEnvKey" in data.kit) || !Array.isArray(data.kit.sections) || !data.kit.sections.every((section) => "envKey" in section)) {
  console.error(`FAIL: DAM Admin Brand Kit lost setup diagnostics: ${JSON.stringify(data.kit).slice(0, 500)}`);
  process.exit(1);
}
' "$BASE_URL/api/brand-kits/mvp-2024?role=DAM%20Admin"

expect_json az-sort-applies-before-limit '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const titles = data.assets.map((asset) => asset.title);
const sorted = [...titles].sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
if (JSON.stringify(titles) !== JSON.stringify(sorted)) {
  console.error(`FAIL: A-Z sort did not apply before limit: ${titles.join(" | ")}`);
  process.exit(1);
}
' "$BASE_URL/api/assets/search?role=Viewer&sort=A-Z&limit=20"

echo "Portal API smoke complete."
