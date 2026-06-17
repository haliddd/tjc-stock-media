#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORT="${PORTAL_BETA_INVITE_SMOKE_PORT:-4873}"
BASE_URL="${BASE_URL:-http://localhost:${PORT}}"
TMP_DIR="$(mktemp -d)"
SERVER_PID=""
SERVER_LOG="$TMP_DIR/next-dev.log"
TEST_LOCATION="${PORTAL_BETA_INVITE_SMOKE_LOCATION:-TJC Invite Smoke Location}"
TEST_CODE="${PORTAL_BETA_INVITE_SMOKE_CODE:-TJC_INVITE_SMOKE_PLACEHOLDER_CODE}"
VIEWER_PASSWORD="${PORTAL_BETA_INVITE_SMOKE_VIEWER_PASSWORD:-viewer-smoke-password}"
CONTRIBUTOR_PASSWORD="${PORTAL_BETA_INVITE_SMOKE_CONTRIBUTOR_PASSWORD:-contributor-smoke-password}"

cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" >/dev/null 2>&1 || true
    wait "$SERVER_PID" >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [ "$TEST_CODE" = "bad-code" ]; then
  echo "FAIL: invite smoke valid test code must differ from bad-code"
  exit 1
fi

json_escape_script='
const value = process.env.VALUE || "";
process.stdout.write(JSON.stringify(value));
'

json_string() {
  VALUE="$1" node -e "$json_escape_script"
}

invite_json() {
  printf '{%s:[%s]}' "$(json_string "$TEST_LOCATION")" "$(json_string "$TEST_CODE")"
}

port_open() {
  node -e '
const net = require("net");
const port = Number(process.argv[1]);
const socket = net.createConnection({ host: "127.0.0.1", port });
socket.setTimeout(500);
socket.on("connect", () => { socket.destroy(); process.exit(0); });
socket.on("timeout", () => { socket.destroy(); process.exit(1); });
socket.on("error", () => process.exit(1));
' "$PORT"
}

wait_for_server() {
  for _attempt in $(seq 1 120); do
    if curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/api/beta-auth/session" 2>/dev/null | grep -Eq '^(200|401|404)$'; then
      return 0
    fi
    sleep 0.5
  done
  echo "FAIL: invite smoke server did not become ready"
  sed -E 's/[A-Za-z0-9_-]{16,}/[redacted]/g' "$SERVER_LOG" || true
  exit 1
}

start_server_if_needed() {
  if [ "${PORTAL_BETA_INVITE_SMOKE_OWN_SERVER:-1}" != "1" ]; then
    return
  fi
  if port_open; then
    echo "FAIL: $BASE_URL already listening; set PORTAL_BETA_INVITE_SMOKE_OWN_SERVER=0 for an existing configured server"
    exit 1
  fi
  (
    cd "$ROOT/frontend"
    BETA_AUTH_ENABLED=1 \
    BETA_SESSION_SECRET="invite-smoke-session-secret" \
    BETA_VIEWER_PASSWORD="$VIEWER_PASSWORD" \
    BETA_CONTRIBUTOR_PASSWORD="$CONTRIBUTOR_PASSWORD" \
    BETA_REVIEWER_PASSWORD="reviewer-smoke-password" \
    BETA_ADMIN_PASSWORD="admin-smoke-password" \
    BETA_CHURCH_INVITE_CODES_JSON="$(invite_json)" \
    SSO_TRUSTED_HEADERS=1 \
    PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 \
    NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 \
    DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0 \
    TJC_STOCK_MEDIA_ROOT="$ROOT" \
    npx next dev --port "$PORT" >"$SERVER_LOG" 2>&1
  ) &
  SERVER_PID="$!"
  wait_for_server
}

post_json() {
  local label="$1"
  local payload="$2"
  local cookie_jar="$TMP_DIR/${label}.cookies"
  local body_file="$TMP_DIR/${label}.json"
  local headers_file="$TMP_DIR/${label}.headers"
  local code
  code="$(curl -sS -D "$headers_file" -c "$cookie_jar" -o "$body_file" -w '%{http_code}' \
    -X POST -H 'Content-Type: application/json' --data-binary "$payload" \
    "$BASE_URL/api/beta-auth/login")"
  printf '%s\n' "$code" > "$TMP_DIR/${label}.code"
}

assert_no_invite_leak() {
  local label="$1"
  local body_file="$TMP_DIR/${label}.json"
  local headers_file="$TMP_DIR/${label}.headers"
  local cookie_jar="$TMP_DIR/${label}.cookies"
  TEST_CODE="$TEST_CODE" node - <<'NODE' "$body_file" "$headers_file" "$cookie_jar"
const fs = require("fs");
const [bodyPath, headersPath, cookiePath] = process.argv.slice(2);
const code = process.env.TEST_CODE || "";
const combined = [bodyPath, headersPath, cookiePath].map((file) => fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "").join("\n");
if (code && combined.includes(code)) {
  console.error("FAIL: invite smoke leaked raw invite code");
  process.exit(1);
}
let body = {};
try {
  body = JSON.parse(fs.readFileSync(bodyPath, "utf8"));
} catch {
  body = {};
}
if (Object.prototype.hasOwnProperty.call(body, "churchLocation")) {
  console.error("FAIL: invite login response exposed churchLocation");
  process.exit(1);
}
NODE
}

assert_status() {
  local label="$1"
  local expected="$2"
  local code
  code="$(cat "$TMP_DIR/${label}.code")"
  if [ "$code" != "$expected" ]; then
    echo "FAIL: $label expected HTTP $expected got $code"
    node -e 'const fs=require("fs"); const p=process.argv[1]; let body=""; try{body=JSON.parse(fs.readFileSync(p,"utf8")); delete body.returnTo; delete body.personas;}catch{} console.error(JSON.stringify(body));' "$TMP_DIR/${label}.json"
    exit 1
  fi
}

start_server_if_needed

viewer_payload="$(VIEWER_PASSWORD="$VIEWER_PASSWORD" node -e 'process.stdout.write(JSON.stringify({ role: "Viewer", password: process.env.VIEWER_PASSWORD, returnTo: "/" }))')"
bad_payload="$(CONTRIBUTOR_PASSWORD="$CONTRIBUTOR_PASSWORD" node -e 'process.stdout.write(JSON.stringify({ role: "Contributor", password: process.env.CONTRIBUTOR_PASSWORD, invitationCode: "bad-code", returnTo: "/" }))')"
valid_payload="$(CONTRIBUTOR_PASSWORD="$CONTRIBUTOR_PASSWORD" TEST_CODE="$TEST_CODE" node -e 'process.stdout.write(JSON.stringify({ role: "Contributor", password: process.env.CONTRIBUTOR_PASSWORD, invitationCode: process.env.TEST_CODE, returnTo: "/" }))')"

post_json "viewer-no-invite" "$viewer_payload"
assert_status "viewer-no-invite" "200"
assert_no_invite_leak "viewer-no-invite"
echo "PASS: Viewer login without invite code accepted"

post_json "contributor-bad-invite" "$bad_payload"
assert_status "contributor-bad-invite" "401"
assert_no_invite_leak "contributor-bad-invite"
echo "PASS: Contributor bad invite code rejected"

post_json "contributor-valid-invite" "$valid_payload"
assert_status "contributor-valid-invite" "200"
assert_no_invite_leak "contributor-valid-invite"
echo "PASS: Contributor valid configured invite code accepted without leaking raw code"

if [ -s "$SERVER_LOG" ] && grep -F "$TEST_CODE" "$SERVER_LOG" >/dev/null; then
  echo "FAIL: invite code appeared in server log"
  exit 1
fi

echo "Portal beta invite smoke complete."
