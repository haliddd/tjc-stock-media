#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-https://tjc-stock-media.vercel.app}"
MARKER="hosted-smoke-$(date -u +%Y%m%dT%H%M%SZ)-$$"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT
local_runtime_probe=0
case "$BASE_URL" in
  http://localhost:*|http://127.0.0.1:*) local_runtime_probe=1 ;;
esac

http_code() {
  local output="$1"
  shift
  curl --max-time 20 -sS -o "$output" -w '%{http_code}' "$@"
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

append_param() {
  local url="$1"
  local key="$2"
  local value="$3"
  case "$url" in
    *\?*) printf '%s&%s=%s\n' "$url" "$key" "$value" ;;
    *) printf '%s?%s=%s\n' "$url" "$key" "$value" ;;
  esac
}

role_param() {
  node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$1"
}

cookie_jar_for_role() {
  case "$1" in
    Viewer) printf '%s/viewer.jar\n' "$TMP_DIR" ;;
    Contributor) printf '%s/contributor.jar\n' "$TMP_DIR" ;;
    Reviewer) printf '%s/reviewer.jar\n' "$TMP_DIR" ;;
    "DAM Admin") printf '%s/admin.jar\n' "$TMP_DIR" ;;
    *) printf '%s/unknown.jar\n' "$TMP_DIR" ;;
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

role_url() {
  local role="$1"
  local path="$2"
  local url="$BASE_URL$path"
  if [ "$AUTH_MODE" = "beta-session" ]; then
    printf '%s\n' "$url"
  else
    append_param "$url" "role" "$(role_param "$role")"
  fi
}

page_url() {
  local role="$1"
  local path="$2"
  append_param "$(role_url "$role" "$path")" "taskMode" "1"
}

role_curl_args() {
  local role="$1"
  if [ "$AUTH_MODE" = "beta-session" ]; then
    printf '%s\n%s\n' "-b" "$(cookie_jar_for_role "$role")"
  elif [ "$local_runtime_probe" = "1" ]; then
    printf '%s\n%s\n%s\n%s\n' "-H" "x-tjc-role: $role" "-H" "x-auth-request-email: ${role// /-}@portal-hosted-smoke.local"
  fi
}

read_role_curl_args() {
  local role="$1"
  role_args=()
  while IFS= read -r arg; do
    role_args+=("$arg")
  done < <(role_curl_args "$role")
}

expect_code_role() {
  local expected="$1"
  local label="$2"
  local role="$3"
  local path="$4"
  shift 4
  local url
  url="$(page_url "$role" "$path")"
  read_role_curl_args "$role"
  expect_code "$expected" "$label" ${role_args[@]+"${role_args[@]}"} "$@" "$url"
}

expect_json_status_role() {
  local expected="$1"
  local label="$2"
  local role="$3"
  local path="$4"
  local script="$5"
  shift 5
  local url
  url="$(role_url "$role" "$path")"
  read_role_curl_args "$role"
  expect_json_status "$expected" "$label" "$script" ${role_args[@]+"${role_args[@]}"} "$@" "$url"
}

select_json_value_role() {
  local label="$1"
  local role="$2"
  local path="$3"
  local script="$4"
  shift 4
  local url
  url="$(role_url "$role" "$path")"
  read_role_curl_args "$role"
  select_json_value "$label" "$script" ${role_args[@]+"${role_args[@]}"} "$@" "$url"
}

AUTH_MODE="query"
BETA_SESSION_PROBE="$TMP_DIR/beta-session.json"
BETA_SESSION_CODE="$(http_code "$BETA_SESSION_PROBE" "$BASE_URL/api/beta-auth/session" || true)"
if node -e 'const fs=require("fs"); let data={}; try{data=JSON.parse(fs.readFileSync(process.argv[1],"utf8"))}catch{} process.exit(data.enabled===true ? 0 : 1)' "$BETA_SESSION_PROBE"; then
  AUTH_MODE="beta-session"
  for role in Viewer Contributor Reviewer "DAM Admin"; do
    password="$(beta_password_for_role "$role")"
    if [ -z "$password" ]; then
      echo "FAIL: beta auth is enabled at $BASE_URL but ${role} password env is missing for portal-hosted-smoke"
      exit 1
    fi
    payload="$TMP_DIR/login-${role// /-}.json"
    ROLE="$role" PASSWORD="$password" node -e 'process.stdout.write(JSON.stringify({role:process.env.ROLE,password:process.env.PASSWORD,returnTo:"/"}))' > "$payload"
    expect_json_status 200 "beta-login-${role// /-}" '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== true || !data.role) {
  console.error(`FAIL: beta login failed shape: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -c "$(cookie_jar_for_role "$role")" -X POST -H 'Content-Type: application/json' --data-binary "@$payload" "$BASE_URL/api/beta-auth/login"
  done
  echo "PASS: hosted smoke using beta-session persona cookies"
else
  if [ "$local_runtime_probe" != "1" ]; then
    echo "FAIL: hosted beta auth is not enabled at $BASE_URL; production smoke requires beta-session persona cookies"
    cat "$BETA_SESSION_PROBE"
    exit 1
  fi
  echo "PASS: local smoke using query/local trusted-header fallback; beta auth session endpoint status $BETA_SESSION_CODE"
fi

blocked_asset_id_script='
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const asset = (Array.isArray(data.assets) ? data.assets : []).find((item) => item && item.id && (!item.reuseDecision || item.reuseDecision.downloadable !== true));
if (!asset) {
  console.error("FAIL: no blocked/non-downloadable asset id found in API response");
  process.exit(1);
}
console.log(asset.id);
'

expect_code_role 200 hosted-root Viewer "/"
expect_code_role 200 hosted-upload Contributor "/upload"
expect_code_role 200 hosted-review Reviewer "/review"
expect_code_role 200 hosted-admin "DAM Admin" "/admin"
expect_code_role 200 hosted-guide Viewer "/guide"

expect_json_status_role 200 hosted-feedback-post Viewer "/api/beta-feedback" '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (data.ok !== true || !data.id || !data.createdAt) {
  console.error(`FAIL: feedback POST did not return ok/id/createdAt: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
' -X POST -H 'Content-Type: application/json' \
  -d "{\"role\":\"Viewer\",\"route\":\"/\",\"task\":\"Hosted smoke feedback loop\",\"severity\":\"medium\",\"expected\":\"Feedback saves for DAM Admin triage.\",\"actual\":\"$MARKER feedback POST reached hosted beta.\",\"browser\":\"portal-hosted-smoke\",\"device\":\"CLI\"}"

viewer_denied_path="/api/beta-feedback"
admin_visible_path="/api/beta-feedback"
if [ "$AUTH_MODE" = "beta-session" ]; then
  viewer_denied_path="/api/beta-feedback?role=DAM%20Admin"
  admin_visible_path="/api/beta-feedback?role=Viewer"
fi

expect_json_status_role 403 hosted-feedback-viewer-denied Viewer "$viewer_denied_path" '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!/admin/i.test(data.error || "")) {
  console.error(`FAIL: Viewer feedback inbox denial was not explicit: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
'

expect_json_status_role 200 hosted-feedback-admin-visible "DAM Admin" "$admin_visible_path" '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
if (!Array.isArray(data.feedback) || typeof data.count !== "number") {
  console.error(`FAIL: DAM Admin feedback inbox shape invalid: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
'

BLOCKED_DOWNLOAD_ID="$(select_json_value_role hosted-blocked-download-id Reviewer "/api/assets/search?view=needs-review&limit=25" "$blocked_asset_id_script")"

expect_json_status_role 403 hosted-viewer-download-blocked Viewer "/api/download/$BLOCKED_DOWNLOAD_ID" '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const forbiddenKeys = new Set([
  "downloadUrl",
  "url",
  "signedUrl",
  "originalUrl",
  "sourceUrl",
  "privateUrl",
  "sourcePath",
  "originalPath",
  "masterPath",
  "custodyPath",
  "checksum",
  "sha256",
  "md5"
]);
const forbiddenValuePatterns = [
  /https?:\/\//i,
  /s3:\/\//i,
  /gs:\/\//i,
  /file:\/\//i,
  /\/Volumes\//i,
  /Shared Drive\/.+/i,
  /\b(master|original|source|custody)[-_ /]*(path|file|url|location)\b[^.]*[/:\\]/i,
  /\b[a-f0-9]{32,}\b/i
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
    for (const pattern of forbiddenValuePatterns) {
      if (pattern.test(value)) leaks.push(`${path}=${JSON.stringify(value).slice(0, 160)}`);
    }
  }
}
walk(data, "");
if (leaks.length) {
  console.error(`FAIL: blocked Viewer download exposed URL/source/original/private/master/checksum material: ${leaks.slice(0, 20).join(", ")}`);
  process.exit(1);
}
if (!data.error && !data.reason) {
  console.error(`FAIL: blocked Viewer download missing reason/error: ${JSON.stringify(data).slice(0, 500)}`);
  process.exit(1);
}
'

echo "Hosted portal smoke complete for $BASE_URL."
