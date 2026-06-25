#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RUN_TMP_DIR="$(mktemp -d /tmp/""tjc-slim-readiness.XXXXXX)"
cleanup() {
  rm -rf "$RUN_TMP_DIR"
}
trap cleanup EXIT

failures=0
warnings=0

pass() {
  printf 'PASS: %s\n' "$1"
}

warn() {
  warnings=$((warnings + 1))
  printf 'WARN: %s\n' "$1"
}

fail() {
  failures=$((failures + 1))
  printf 'FAIL: %s\n' "$1"
}

require_file() {
  if [ -f "$1" ]; then
    pass "file exists: $1"
  else
    fail "missing file: $1"
  fi
}

require_text() {
  local file="$1"
  local text="$2"
  local label="$3"
  if [ ! -f "$file" ]; then
    fail "missing file before text check: $file ($label)"
  elif grep -Fqi "$text" "$file"; then
    pass "text present: $label"
  else
    fail "missing text: $label"
  fi
}

run_node_guard() {
  local label="$1"
  local script="$2"
  local output="${RUN_TMP_DIR}/${label}.txt"
  if node "$script" >"$output" 2>&1; then
    pass "$label"
  else
    fail "$label"
    cat "$output"
  fi
}

require_file "docs/START_HERE.md"
require_file "docs/command-matrix.md"
require_file "docs/architecture/live-dam-surface-2026-06-10.md"
require_file "docs/product/PRD-slim-atlas-resourcespace-portal-cleanup.md"
require_file "docs/product/slim-atlas-resourcespace-portal-cleanup.prd.json"
require_file ".env.production.example"

require_text "docs/START_HERE.md" "thin church-user portal over ResourceSpace" "Slim Atlas thesis"
require_text "docs/START_HERE.md" "ResourceSpace remains the DAM/search/review layer" "ResourceSpace stays DAM truth"
require_text "docs/START_HERE.md" "Google Shared Drive remains master-original custody" "Shared Drive custody"
require_text "docs/command-matrix.md" "not canonical for Slim Atlas cleanup" "old launch/package gates de-canonicalized"
require_text "docs/architecture/live-dam-surface-2026-06-10.md" "/assets/[id]" "asset detail in live surface"
require_text "docs/architecture/live-dam-surface-2026-06-10.md" "/upload" "upload in live surface"
require_text "docs/product/google-drive-photos-resourcespace-portal-prd.md" "reference evidence only" "older PRD superseded"

if command -v docker >/dev/null 2>&1; then
  compose_env=".env"
  compose_file="docker-compose.yml"
  if [ ! -f "$compose_env" ] && [ -f ".env.example" ]; then
    compose_env="$ROOT/.env.example"
    compose_file="${RUN_TMP_DIR}/tjc-docker-compose-config.yml"
    sed "s|- \.env$|- $ROOT/.env.example|" docker-compose.yml >"$compose_file"
  fi
  if docker compose --env-file "$compose_env" -f "$compose_file" config >"${RUN_TMP_DIR}/docker-compose-config.txt" 2>&1; then
    pass "docker compose config valid"
  else
    fail "docker compose config failed"
    cat "${RUN_TMP_DIR}/docker-compose-config.txt"
  fi
else
  warn "docker not installed or not on PATH; skipped compose config"
fi

run_node_guard "live slim surface guard" "scripts/live-dam-surface-guard.mjs"
run_node_guard "live slim surface guard self-test" "scripts/live-dam-surface-guard-test.mjs"
run_node_guard "API identity guard" "scripts/api-identity-guard.mjs"
run_node_guard "API audit guard" "scripts/api-audit-guard.mjs"
run_node_guard "API payload guard" "scripts/api-payload-guard.mjs"
run_node_guard "private source guard" "scripts/private-source-guard.mjs"
run_node_guard "public env guard" "scripts/public-env-guard.mjs"
run_node_guard "git hygiene guard" "scripts/git-hygiene-guard.mjs"

if grep -q 'PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0' .env.production.example \
  && grep -q 'NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0' .env.production.example \
  && grep -q 'PRODUCTION_REQUIRE_TRUSTED_IDENTITY=1' .env.production.example; then
  pass "production template disables local role overrides and requires trusted identity"
else
  fail "production auth guardrails missing from .env.production.example"
fi

if git diff --check >"${RUN_TMP_DIR}/diff-check.txt" 2>&1; then
  pass "git diff --check"
else
  fail "git diff --check"
  cat "${RUN_TMP_DIR}/diff-check.txt"
fi

echo
echo "Slim readiness summary: failures=$failures warnings=$warnings"
if [ "$failures" -gt 0 ]; then
  exit 1
fi
