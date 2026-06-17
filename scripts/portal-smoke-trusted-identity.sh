#!/usr/bin/env bash

PORTAL_SMOKE_HELPER_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
(
  cd "$PORTAL_SMOKE_HELPER_ROOT"
  SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-portal-smoke}" node scripts/safe-lane-headroom-guard.mjs
)

portal_smoke_trusted_header_enabled() {
  [ "${PORTAL_SMOKE_TRUSTED_HEADERS:-${PORTAL_QA_TRUSTED_HEADERS:-1}}" = "1" ]
}

portal_smoke_trusted_email() {
  local role="$1"
  role="${role// /-}"
  role="$(printf '%s' "$role" | tr '[:upper:]' '[:lower:]')"
  printf '%s@portal-smoke.local\n' "$role"
}

portal_smoke_trusted_role() {
  portal_smoke_trusted_header_enabled || return 0
  local joined=" $* "
  case "$joined" in
    *"role=DAM%20Admin"*|*"role=DAM+Admin"*|*"role=DAM Admin"*|*'"role":"DAM Admin"'*|*"'role':'DAM Admin'"*) printf '%s\n' "DAM Admin" ;;
    *"role=Reviewer"*|*'"role":"Reviewer"'*|*"'role':'Reviewer'"*) printf '%s\n' "Reviewer" ;;
    *"role=Contributor"*|*'"role":"Contributor"'*|*"'role':'Contributor'"*) printf '%s\n' "Contributor" ;;
    *"role=Viewer"*|*'"role":"Viewer"'*|*"'role':'Viewer'"*) printf '%s\n' "Viewer" ;;
    *) printf '%s\n' "Viewer" ;;
  esac
}

portal_smoke_http_code() {
  local output="$1"
  shift
  local curl_args=("$@")
  local trusted_role
  trusted_role="$(portal_smoke_trusted_role "${curl_args[@]}")"
  portal_smoke_http_code_with_role "$trusted_role" "$output" "${curl_args[@]}"
}

portal_smoke_http_code_as() {
  local trusted_role="$1"
  local output="$2"
  shift 2
  portal_smoke_http_code_with_role "$trusted_role" "$output" "$@"
}

portal_smoke_http_code_with_role() {
  local trusted_role="$1"
  local output="$2"
  shift 2
  local curl_args=("$@")
  if [ -n "$trusted_role" ]; then
    curl_args=(
      -H "x-tjc-local-beta-role: $trusted_role"
      -H "x-tjc-role: $trusted_role"
      -H "x-auth-request-email: $(portal_smoke_trusted_email "$trusted_role")"
      -H "cf-access-jwt-assertion: portal-smoke-placeholder-token"
      -H "cf-access-authenticated-user-email: $(portal_smoke_trusted_email "$trusted_role")"
      -H "cf-access-groups: $trusted_role"
      "${curl_args[@]}"
    )
  fi
  curl --max-time "${CURL_MAX_TIME:-30}" -sS -o "$output" -w '%{http_code}' "${curl_args[@]}"
}
