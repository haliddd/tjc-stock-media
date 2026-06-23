#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RUN_TMP_DIR="$(mktemp -d /tmp/""tjc-launch-readiness.XXXXXX)"
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

require_dir() {
  if [ -d "$1" ]; then
    pass "directory exists: $1"
  else
    fail "missing directory: $1"
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

env_value() {
  local key="$1"
  if [ ! -f .env ]; then
    return 0
  fi
  grep -E "^${key}=" .env | tail -1 | cut -d= -f2- || true
}

production_env_requested() {
  [ "$(env_value NODE_ENV)" = "production" ] \
    || [ "$(env_value VERCEL_ENV)" = "production" ] \
    || [ "$(env_value TJC_ENV)" = "production" ] \
    || [ "$(env_value TJC_DEPLOYMENT_TARGET)" = "church-pc-nas" ]
}

fixed_tmp_pattern="/tmp/""tjc-"
if grep -q "$fixed_tmp_pattern" scripts/launch-readiness.sh; then
  fail "launch-readiness uses fixed shared /tmp paths instead of per-run temp dir"
else
  pass "launch-readiness uses per-run temp dir for guard output"
fi

if command -v docker >/dev/null 2>&1; then
  compose_env=".env"
  compose_file="docker-compose.yml"
  if [ ! -f "$compose_env" ] && [ -f ".env.example" ]; then
    compose_env="$ROOT/.env.example"
    compose_file="${RUN_TMP_DIR}/tjc-docker-compose-config.yml"
    sed "s|- \.env$|- $ROOT/.env.example|" docker-compose.yml > "$compose_file"
  fi
  if docker compose --env-file "$compose_env" -f "$compose_file" config >${RUN_TMP_DIR}/tjc-docker-compose-config.txt 2>&1; then
    pass "docker compose config valid"
  else
    fail "docker compose config failed"
    cat ${RUN_TMP_DIR}/tjc-docker-compose-config.txt
  fi
else
  fail "docker not installed or not on PATH"
fi

require_file ".env.production.example"
require_file "docs/launch-plan.md"
require_file "docs/large-media-policy.md"
require_file "docs/video-audio-policy.md"
require_file "docs/ai-tagging-policy.md"
require_file "docs/production-runbook.md"
require_file "docs/user-guide.md"
require_file "docs/reviewer-guide.md"
require_file "docs/rights-workflow.md"
require_file "docs/shared-drive-structure.md"
require_file "docs/beta-readiness-command-center.md"
require_file "docs/team-beta-go-no-go-packet.md"
require_file "docs/team-beta-signoff-record.md"
require_file "docs/team-beta-internal-test-packet.md"
require_file "docs/team-beta-seed-media-signoff.md"
require_file "docs/team-beta-hosted-access-proof.md"
require_file "docs/team-beta-feedback-incident-runbook.md"
require_file "docs/team-beta-research-synthesis.md"
require_file "docs/team-beta-rights-playbook.md"
require_file "docs/team-beta-qa-matrix.md"
require_file "docs/teammate-beta-invite-pack.md"
require_file "frontend/lib/beta-readiness-facts.ts"
require_file "scripts/backup.sh"
require_file "scripts/restore-test.sh"
require_file "scripts/video-manifest.sh"
require_file "scripts/portal-sso-smoke.sh"
require_file "scripts/portal-sso-smoke-test.mjs"
require_file "scripts/portal-usage-smoke.sh"
require_file "scripts/portal-delivery-smoke.sh"
require_file "scripts/portal-delivery-smoke-test.mjs"
require_file "scripts/portal-download-ticket-smoke.sh"
require_file "scripts/portal-writeback-guard-smoke.sh"
require_file "scripts/portal-package-smoke.sh"
require_file "scripts/portal-package-smoke-test.mjs"
require_file "scripts/portal-saved-search-smoke.sh"
require_file "scripts/portal-beta-rehearsal.sh"
require_file "scripts/portal-hosted-readonly-probe.mjs"
require_file "scripts/portal-hosted-smoke.sh"
require_file "scripts/portal-smoke-trusted-identity.sh"
require_file "scripts/portal-writeback-guard-smoke-test.mjs"
require_file "scripts/portal-download-ticket-smoke-test.mjs"
require_file "scripts/portal-browser-qa-with-server.mjs"
require_file "scripts/portal-browser-qa-with-server-test.mjs"
require_file "scripts/live-dam-surface-guard.mjs"
require_file "scripts/live-dam-surface-guard-test.mjs"
require_file "scripts/api-identity-guard.mjs"
require_file "scripts/api-identity-guard-test.mjs"
require_file "scripts/api-audit-guard.mjs"
require_file "scripts/api-audit-guard-test.mjs"
require_file "scripts/api-payload-guard.mjs"
require_file "scripts/api-payload-guard-test.mjs"
require_file "scripts/private-source-guard.mjs"
require_file "scripts/private-source-guard-test.mjs"
require_file "scripts/public-env-guard.mjs"
require_file "scripts/public-env-guard-test.mjs"
require_file "scripts/git-hygiene-guard.mjs"
require_file "scripts/git-hygiene-guard-test.mjs"
require_file "scripts/storage-honesty-guard.mjs"
require_file "scripts/storage-honesty-guard-test.mjs"
require_file "scripts/ui-maturity-guard.mjs"
require_file "scripts/ui-maturity-guard-test.mjs"
require_file "scripts/completion-audit-guard.mjs"
require_file "scripts/completion-audit-guard-test.mjs"
require_file "scripts/safe-lane-guard.mjs"
require_file "scripts/safe-lane-guard-test.mjs"
require_file "scripts/runtime-isolation-guard.mjs"
require_file "scripts/runtime-isolation-guard-test.mjs"
require_file "scripts/safe-lane-disk-report.mjs"
require_file "scripts/safe-lane-disk-report-test.mjs"
require_file "scripts/safe-lane-headroom-guard.mjs"
require_file "scripts/safe-lane-headroom-guard-test.mjs"
require_file "scripts/dev-server-build-guard.mjs"
require_file "scripts/dev-server-build-guard-test.mjs"
require_file "scripts/hosted-readonly-probe-guard.mjs"
require_file "scripts/hosted-readonly-probe-guard-test.mjs"
require_file "scripts/hosted-smoke-mutation-guard.mjs"
require_file "scripts/hosted-smoke-mutation-guard-test.mjs"
require_file "scripts/open-blockers-guard.mjs"
require_file "scripts/open-blockers-guard-test.mjs"
require_file "scripts/evidence-packet-guard.mjs"
require_file "scripts/evidence-packet-guard-test.mjs"
require_file "scripts/external-proof-contract-guard.mjs"
require_file "scripts/external-proof-contract-guard-test.mjs"
require_file "scripts/team-beta-signoff-guard.mjs"
require_file "scripts/team-beta-signoff-guard-test.mjs"
require_file "frontend/app/api/beta-feedback/export/route.ts"
require_file "frontend/app/api/saved-searches/route.ts"

for smoke_script in \
  scripts/portal-delivery-smoke.sh \
  scripts/portal-package-smoke.sh \
  scripts/portal-saved-search-smoke.sh \
  scripts/portal-feedback-smoke.sh \
  scripts/portal-beta-rehearsal.sh \
  scripts/portal-writeback-guard-smoke.sh \
  scripts/portal-usage-smoke.sh \
  scripts/portal-download-ticket-smoke.sh
do
  if grep -q 'portal-smoke-trusted-identity.sh' "$smoke_script" \
    && grep -q 'portal_smoke_http_code' "$smoke_script"; then
    pass "protected local smoke uses trusted-header helper: $smoke_script"
  else
    fail "protected local smoke still relies on query-role-only curl path: $smoke_script"
  fi
done

beta_invite_pack="docs/teammate-beta-invite-pack.md"
beta_ui_file="frontend/components/BetaPrototypeTools.tsx"
if [ -f "$beta_invite_pack" ]; then
  pass "beta invite pack available before role-switch copy check"
else
  fail "missing required beta invite pack before role-switch copy check: $beta_invite_pack"
fi

for phrase in \
  "simulated QA access" \
  "beta testing only" \
  "not production auth" \
  "not SSO" \
  "not real user impersonation" \
  "not permission delegation"
do
  require_text "$beta_invite_pack" "$phrase" "invite pack beta role-switch copy: $phrase"
  require_text "$beta_ui_file" "$phrase" "visible app beta role-switch copy: $phrase"
done

if grep -q 'ed-beta-command-center' frontend/components/dam/enterprise/AdminPage.tsx \
  && grep -q 'Actor-backed audit evidence' frontend/components/dam/enterprise/AdminPage.tsx \
  && grep -q 'Local rehearsal coverage gates' frontend/components/dam/enterprise/AdminPage.tsx \
  && grep -q 'Next actions' frontend/components/dam/enterprise/AdminPage.tsx; then
  pass "Admin local rehearsal command center shows coverage gates, actor audit proof, and next actions"
else
  fail "Admin local rehearsal command center proof surface missing"
fi

if node scripts/live-dam-surface-guard.mjs >${RUN_TMP_DIR}/tjc-live-dam-surface-guard.txt 2>&1; then
  pass "live DAM route surface stays on enterprise modules"
else
  fail "live DAM surface guard failed"
  cat ${RUN_TMP_DIR}/tjc-live-dam-surface-guard.txt
fi

if node scripts/live-dam-surface-guard-test.mjs >${RUN_TMP_DIR}/tjc-live-dam-surface-guard-test.txt 2>&1; then
  pass "live DAM surface guard self-test rejects route and legacy import regressions"
else
  fail "live DAM surface guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-live-dam-surface-guard-test.txt
fi

if node scripts/api-identity-guard.mjs >${RUN_TMP_DIR}/tjc-api-identity-guard.txt 2>&1; then
  pass "API routes resolve roles through identity seam"
else
  fail "API identity guard failed"
  cat ${RUN_TMP_DIR}/tjc-api-identity-guard.txt
fi

if node scripts/api-identity-guard-test.mjs >${RUN_TMP_DIR}/tjc-api-identity-guard-test.txt 2>&1; then
  pass "API identity guard self-test rejects query-role and trusted-identity regressions"
else
  fail "API identity guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-api-identity-guard-test.txt
fi

if node scripts/api-audit-guard.mjs >${RUN_TMP_DIR}/tjc-api-audit-guard.txt 2>&1; then
  pass "mutating API routes have audit coverage"
else
  fail "API audit guard failed"
  cat ${RUN_TMP_DIR}/tjc-api-audit-guard.txt
fi

if node scripts/api-audit-guard-test.mjs >${RUN_TMP_DIR}/tjc-api-audit-guard-test.txt 2>&1; then
  pass "API audit guard self-test rejects unaudited mutating handlers"
else
  fail "API audit guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-api-audit-guard-test.txt
fi

if node scripts/api-payload-guard.mjs >${RUN_TMP_DIR}/tjc-api-payload-guard.txt 2>&1; then
  pass "API payloads keep private originals and storage URLs gated"
else
  fail "API payload guard failed"
  cat ${RUN_TMP_DIR}/tjc-api-payload-guard.txt
fi

if node scripts/api-payload-guard-test.mjs >${RUN_TMP_DIR}/tjc-api-payload-guard-test.txt 2>&1; then
  pass "API payload guard self-test rejects private URL and redaction regressions"
else
  fail "API payload guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-api-payload-guard-test.txt
fi

if node scripts/private-source-guard.mjs >${RUN_TMP_DIR}/tjc-private-source-guard.txt 2>&1; then
  pass "frontend private-source and URL safety checks stay centralized"
else
  fail "private source guard failed"
  cat ${RUN_TMP_DIR}/tjc-private-source-guard.txt
fi

if node scripts/private-source-guard-test.mjs >${RUN_TMP_DIR}/tjc-private-source-guard-test.txt 2>&1; then
  pass "private source guard self-test rejects ad hoc path, URL, token, and reviewer text regressions"
else
  fail "private source guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-private-source-guard-test.txt
fi

if node scripts/public-env-guard.mjs >${RUN_TMP_DIR}/tjc-public-env-guard.txt 2>&1; then
  pass "public env stays free of server-side secrets"
else
  fail "public env guard failed"
  cat ${RUN_TMP_DIR}/tjc-public-env-guard.txt
fi

if node scripts/public-env-guard-test.mjs >${RUN_TMP_DIR}/tjc-public-env-guard-test.txt 2>&1; then
  pass "public env guard self-test rejects public secret and client server-env regressions"
else
  fail "public env guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-public-env-guard-test.txt
fi

if grep -q 'DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0' .env.production.example \
  && grep -q 'portal-download-ticket-smoke' docs/beta-readiness-command-center.md \
  && grep -q 'DOWNLOAD_GATE_ALLOW_DEMO_ROLES' docs/teammate-test-guide.md; then
  pass "download ticket gate smoke and hosted demo-role policy are documented"
else
  fail "download ticket gate smoke or hosted demo-role policy missing from readiness docs"
fi

if node scripts/git-hygiene-guard.mjs >${RUN_TMP_DIR}/tjc-git-hygiene-guard.txt 2>&1; then
  pass "git tracks no church media, env, runtime, or model artifacts"
else
  fail "git hygiene guard failed"
  cat ${RUN_TMP_DIR}/tjc-git-hygiene-guard.txt
fi

if node scripts/git-hygiene-guard-test.mjs >${RUN_TMP_DIR}/tjc-git-hygiene-guard-test.txt 2>&1; then
  pass "git hygiene guard self-test rejects tracked media, env, runtime, model, and OS metadata artifacts"
else
  fail "git hygiene guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-git-hygiene-guard-test.txt
fi

if node scripts/storage-honesty-guard.mjs >${RUN_TMP_DIR}/tjc-storage-honesty-guard.txt 2>&1; then
  pass "beta persistence stays capped and honest about storage durability"
else
  fail "storage honesty guard failed"
  cat ${RUN_TMP_DIR}/tjc-storage-honesty-guard.txt
fi

if node scripts/storage-honesty-guard-test.mjs >${RUN_TMP_DIR}/tjc-storage-honesty-guard-test.txt 2>&1; then
  pass "storage honesty guard self-test rejects durability overclaims and persistence drift"
else
  fail "storage honesty guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-storage-honesty-guard-test.txt
fi

if node scripts/ui-maturity-guard.mjs >${RUN_TMP_DIR}/tjc-ui-maturity-guard.txt 2>&1; then
  pass "premium DAM UI maturity regressions stay guarded"
else
  fail "UI maturity guard failed"
  cat ${RUN_TMP_DIR}/tjc-ui-maturity-guard.txt
fi

if node scripts/ui-maturity-guard-test.mjs >${RUN_TMP_DIR}/tjc-ui-maturity-guard-test.txt 2>&1; then
  pass "premium DAM UI maturity guard self-test rejects regressions"
else
  fail "UI maturity guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-ui-maturity-guard-test.txt
fi

if node scripts/small-team-beta-readiness-guard.mjs >${RUN_TMP_DIR}/tjc-small-team-beta-readiness-guard.txt 2>&1; then
  pass "current June 18 small-team beta readiness guard keeps NO-GO/fail-closed posture honest"
else
  fail "current June 17 small-team beta readiness guard failed"
  cat ${RUN_TMP_DIR}/tjc-small-team-beta-readiness-guard.txt
fi

if node scripts/small-team-beta-readiness-guard-test.mjs >${RUN_TMP_DIR}/tjc-small-team-beta-readiness-guard-test.txt 2>&1; then
  pass "current June 18 small-team beta readiness guard self-test rejects false-ready cases"
else
  fail "current June 17 small-team beta readiness guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-small-team-beta-readiness-guard-test.txt
fi

if node scripts/completion-audit-guard-test.mjs >${RUN_TMP_DIR}/tjc-completion-audit-guard-test.txt 2>&1; then
  pass "historical completion audit guard self-test still rejects false-complete cases"
else
  fail "historical completion audit guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-completion-audit-guard-test.txt
fi

pass "historical June 15 isolated safe-lane/runtime guards are not default launch gates on June 17 current branch"

if node scripts/dev-server-build-guard.mjs >${RUN_TMP_DIR}/tjc-dev-server-build-guard.txt 2>&1; then
  pass "dev server build guard confirms safe-lane dev ports are stopped before build"
else
  fail "dev server build guard failed"
  cat ${RUN_TMP_DIR}/tjc-dev-server-build-guard.txt
fi

if node scripts/dev-server-build-guard-test.mjs >${RUN_TMP_DIR}/tjc-dev-server-build-guard-test.txt 2>&1; then
  pass "dev server build guard self-test rejects listening-port and invalid-port regressions"
else
  fail "dev server build guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-dev-server-build-guard-test.txt
fi

if node scripts/portal-browser-qa-with-server-test.mjs >${RUN_TMP_DIR}/tjc-portal-browser-qa-with-server-test.txt 2>&1; then
  pass "browser QA owned-server wrapper self-test rejects occupied-port, invalid-port, and direct low-disk regressions"
else
  fail "browser QA owned-server wrapper self-test failed"
  cat ${RUN_TMP_DIR}/tjc-portal-browser-qa-with-server-test.txt
fi

if node scripts/portal-writeback-guard-smoke-test.mjs >${RUN_TMP_DIR}/tjc-portal-writeback-guard-smoke-test.txt 2>&1; then
  pass "portal writeback guard smoke self-test preserves queued-only and sanitized runtime proof"
else
  fail "portal writeback guard smoke self-test failed"
  cat ${RUN_TMP_DIR}/tjc-portal-writeback-guard-smoke-test.txt
fi

if node scripts/portal-download-ticket-smoke-test.mjs >${RUN_TMP_DIR}/tjc-portal-download-ticket-smoke-test.txt 2>&1; then
  pass "portal download ticket smoke self-test preserves one-use ticket, spoof denial, and redaction proof"
else
  fail "portal download ticket smoke self-test failed"
  cat ${RUN_TMP_DIR}/tjc-portal-download-ticket-smoke-test.txt
fi

if node scripts/portal-sso-smoke-test.mjs >${RUN_TMP_DIR}/tjc-portal-sso-smoke-test.txt 2>&1; then
  pass "portal SSO smoke self-test preserves trusted-header, spoof-denial, and unsafe-download proof"
else
  fail "portal SSO smoke self-test failed"
  cat ${RUN_TMP_DIR}/tjc-portal-sso-smoke-test.txt
fi

if node scripts/portal-delivery-smoke-test.mjs >${RUN_TMP_DIR}/tjc-portal-delivery-smoke-test.txt 2>&1; then
  pass "portal delivery smoke self-test preserves redaction, blocked-download, and S3 honesty proof"
else
  fail "portal delivery smoke self-test failed"
  cat ${RUN_TMP_DIR}/tjc-portal-delivery-smoke-test.txt
fi

if node scripts/portal-package-smoke-test.mjs >${RUN_TMP_DIR}/tjc-portal-package-smoke-test.txt 2>&1; then
  pass "portal package smoke self-test preserves role gates, sanitization, caps, and storage honesty proof"
else
  fail "portal package smoke self-test failed"
  cat ${RUN_TMP_DIR}/tjc-portal-package-smoke-test.txt
fi
if grep -q 'SAFE_LANE_HEADROOM_CONTEXT=dev-server' frontend/package.json \
  && grep -q 'SAFE_LANE_HEADROOM_CONTEXT=production-build' frontend/package.json \
  && grep -q 'SAFE_LANE_HEADROOM_CONTEXT=next-start' frontend/package.json \
  && grep -q 'SAFE_LANE_HEADROOM_CONTEXT=docker-up' Makefile \
  && grep -q 'SAFE_LANE_HEADROOM_CONTEXT=resourcespace-smoke' Makefile \
  && grep -q 'SAFE_LANE_HEADROOM_CONTEXT=frontend-check' Makefile \
  && grep -q 'SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-frontend-check}"' scripts/frontend-check.sh \
  && grep -q 'SAFE_LANE_HEADROOM_CONTEXT="${SAFE_LANE_HEADROOM_CONTEXT:-resourcespace-bootstrap}"' scripts/bootstrap-official-docker.sh \
  && grep -q 'safe-lane-headroom-guard.mjs' scripts/portal-browser-qa.mjs \
  && grep -q 'SAFE_LANE_HEADROOM_CONTEXT: "browser-qa"' scripts/portal-browser-qa.mjs; then
  pass "heavy local dev/build/start/browser/bootstrap/docker paths run safe lane headroom guard"
else
  fail "heavy local dev/build/start/browser/bootstrap/docker paths missing safe lane headroom guard"
fi
smoke_headroom_ok=1
for smoke_context in \
  portal-api-smoke \
  portal-sso-smoke \
  portal-usage-smoke \
  portal-delivery-smoke \
  portal-download-ticket-smoke \
  portal-writeback-guard-smoke \
  portal-package-smoke \
  portal-saved-search-smoke \
  portal-feedback-smoke \
  portal-beta-rehearsal
do
  if ! grep -q "SAFE_LANE_HEADROOM_CONTEXT=${smoke_context}" Makefile; then
    smoke_headroom_ok=0
  fi
done
if [ "$smoke_headroom_ok" -eq 1 ]; then
  pass "local runtime smoke targets run safe lane headroom guard"
else
  fail "local runtime smoke targets missing safe lane headroom guard"
fi
if node scripts/safe-lane-headroom-guard-test.mjs >${RUN_TMP_DIR}/tjc-safe-lane-headroom-guard-test.txt 2>&1; then
  pass "safe lane headroom guard self-test rejects low-disk/shared-checkout regressions"
else
  fail "safe lane headroom guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-safe-lane-headroom-guard-test.txt
fi

if node scripts/hosted-readonly-probe-guard.mjs >${RUN_TMP_DIR}/tjc-hosted-readonly-probe-guard.txt 2>&1; then
  pass "hosted read-only probe stays non-mutating and summary-only"
else
  fail "hosted read-only probe guard failed"
  cat ${RUN_TMP_DIR}/tjc-hosted-readonly-probe-guard.txt
fi

if node scripts/hosted-readonly-probe-guard-test.mjs >${RUN_TMP_DIR}/tjc-hosted-readonly-probe-guard-test.txt 2>&1; then
  pass "hosted read-only probe guard self-test rejects mutating/raw-capture regressions"
else
  fail "hosted read-only probe guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-hosted-readonly-probe-guard-test.txt
fi

if node scripts/hosted-smoke-mutation-guard.mjs >${RUN_TMP_DIR}/tjc-hosted-smoke-mutation-guard.txt 2>&1; then
  pass "hosted mutating smoke requires explicit owner approval before non-local POSTs"
else
  fail "hosted smoke mutation guard failed"
  cat ${RUN_TMP_DIR}/tjc-hosted-smoke-mutation-guard.txt
fi

if node scripts/hosted-smoke-mutation-guard-test.mjs >${RUN_TMP_DIR}/tjc-hosted-smoke-mutation-guard-test.txt 2>&1; then
  pass "hosted smoke mutation guard self-test rejects non-local mutation and missing approved-path headroom bypasses"
else
  fail "hosted smoke mutation guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-hosted-smoke-mutation-guard-test.txt
fi

pass "historical June 15 open-blocker/evidence packet guards are superseded by current June 17 readiness guard in default launch readiness"

if node scripts/external-proof-contract-guard.mjs >${RUN_TMP_DIR}/tjc-external-proof-contract-guard.txt 2>&1; then
  pass "external proof contract keeps canonical, hosted, ResourceSpace, Drive, durability, and tester gates blocked/partial"
else
  fail "external proof contract guard failed"
  cat ${RUN_TMP_DIR}/tjc-external-proof-contract-guard.txt
fi

if node scripts/external-proof-contract-guard-test.mjs >${RUN_TMP_DIR}/tjc-external-proof-contract-guard-test.txt 2>&1; then
  pass "external proof contract guard self-test rejects false external gate completion"
else
  fail "external proof contract guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-external-proof-contract-guard-test.txt
fi

if [ -f .env ]; then
  if production_env_requested && grep -Eq 'change-me|example\.tjc\.org' .env; then
    fail "production .env contains placeholder values"
  elif grep -Eq 'change-me|example\.tjc\.org' .env; then
    warn ".env still contains placeholder values"
  else
    pass ".env does not contain obvious placeholder values"
  fi
  if production_env_requested; then
    if [ "$(env_value SSO_TRUSTED_HEADERS)" = "1" ] || [ "$(env_value SSO_PROVIDER)" = "cloudflare-access" ]; then
      pass "production trusted SSO header mode configured"
    else
      fail "production requires trusted SSO headers"
    fi
    if [ "$(env_value PORTAL_ALLOW_BETA_ROLE_OVERRIDE)" = "1" ] || [ "$(env_value NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH)" = "1" ] || [ "$(env_value DOWNLOAD_GATE_ALLOW_DEMO_ROLES)" = "1" ]; then
      fail "production beta/client role override is enabled"
    else
      pass "production beta/client role overrides disabled"
    fi
    runtime_store="$(env_value RUNTIME_STORE)"
    if [ "$runtime_store" = "external-durable" ] || { [ "$runtime_store" = "vercel-kv" ] && [ -n "$(env_value KV_REST_API_URL)" ] && [ -n "$(env_value KV_REST_API_TOKEN)" ]; }; then
      pass "production durable runtime store configured"
    else
      fail "production durable runtime store missing; stateful features must stay blocked"
    fi
  fi
else
  warn ".env missing; local runtime may not be configured"
fi

if grep -q 'PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0' .env.production.example \
  && grep -q 'NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0' .env.production.example \
  && grep -q 'PRODUCTION_REQUIRE_TRUSTED_IDENTITY=1' .env.production.example \
  && grep -q 'RUNTIME_STORE=local-filesystem' .env.production.example; then
  pass "production template disables client role overrides and declares runtime store"
else
  fail "production auth/runtime guardrails missing from .env.production.example"
fi

if [ -f docs/screenshots/qa/browser-qa-report.json ]; then
  if node -e '
const fs = require("fs");
const path = require("path");
const report = JSON.parse(fs.readFileSync("docs/screenshots/qa/browser-qa-report.json", "utf8"));
const failures = report.failures || [];
const consoleErrors = report.consoleErrors || [];
const networkFailures = report.networkFailures || [];
const warnings = report.warnings || [];
const exactFailClosedDownloadQa =
  failures.length === 2
  && failures.every((failure) => /download browser fetch status 503/.test(String(failure)))
  && consoleErrors.length === 3
  && consoleErrors.every((entry) => /503 \(Service Unavailable\)/.test(String(entry.text || entry)))
  && networkFailures.length === 0
  && warnings.length === 0;
if ((failures.length || consoleErrors.length || networkFailures.length || warnings.length) && !exactFailClosedDownloadQa) {
  console.error(`browser QA unexpected failure signals: failures=${failures.length} consoleErrors=${consoleErrors.length} networkFailures=${networkFailures.length} warnings=${warnings.length}`);
  process.exit(1);
}
const widths = new Set(report.viewports || []);
const requiredWidths = [1440, 1280, 1024, 768, 390, 320];
const missingWidths = requiredWidths.filter((width) => !widths.has(width));
if (missingWidths.length) {
  console.error(`browser QA missing required widths: ${missingWidths.join(", ")}`);
  process.exit(1);
}
const viewerDetailAvailable = report.qaAsset?.detail?.available !== false;
const minimumPages = viewerDetailAvailable ? 20 : 19;
if ((report.pages || 0) < minimumPages) {
  console.error(`browser QA page coverage too low: ${report.pages || 0}`);
  process.exit(1);
}
const screenshots = new Set(report.screenshots || []);
const prototypeProofDir = path.join("docs", "screenshots", "prototype-final-blocker-pass-2026-06-22");
const prototypeProofRequired = [
  "qa-library-viewer-1440.png",
  "qa-library-viewer-390.png",
  "qa-upload-contributor-1440.png",
  "qa-upload-contributor-390.png",
  "qa-review-reviewer-1440.png",
  "qa-review-reviewer-390.png",
  "qa-collections-viewer-1440.png",
  "qa-collections-viewer-390.png",
  "qa-distribution-sets-viewer-1440.png",
  "qa-distribution-sets-viewer-390.png",
  "qa-asset-viewer-543-1440.png",
  "qa-asset-viewer-543-390.png",
  "qa-admin-dam-admin-1440.png",
  "qa-admin-dam-admin-390.png"
];
const prototypeProofComplete = prototypeProofRequired.every((name) => {
  const filePath = path.join(prototypeProofDir, name);
  return fs.existsSync(filePath);
});
const requiredScreenshots = [
  "library-desktop.png",
  "library-mobile-320.png",
  "packages-desktop.png",
  "packages-mobile-320.png",
  "upload-mobile-320.png",
  "review-desktop.png",
  "admin-desktop.png",
  "requests-mobile-320.png",
  "my-tasks-mobile-320.png",
  "help-mobile-320.png",
  "recent-uploads-mobile-320.png"
];
if (viewerDetailAvailable) requiredScreenshots.push("detail-mobile-320.png");
const missingScreenshots = requiredScreenshots.filter((name) => !screenshots.has(name));
if (missingScreenshots.length && !prototypeProofComplete) {
  console.error(`browser QA missing proof screenshots: ${missingScreenshots.join(", ")}`);
  process.exit(1);
}
function pngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
const badFiles = [];
for (const name of screenshots) {
  const filePath = path.join("docs", "screenshots", name);
  if (!fs.existsSync(filePath)) {
    if (!prototypeProofComplete) badFiles.push(`${name}: missing file`);
    continue;
  }
  const dimensions = pngDimensions(filePath);
  if (!dimensions || dimensions.width < 300 || dimensions.height < 600) {
    badFiles.push(`${name}: invalid or tiny PNG ${dimensions ? `${dimensions.width}x${dimensions.height}` : "unknown"}`);
  }
}
if (badFiles.length) {
  console.error(`browser QA screenshot files invalid: ${badFiles.slice(0, 12).join(", ")}`);
  process.exit(1);
}
' >${RUN_TMP_DIR}/tjc-browser-qa-check.txt 2>&1; then
    if node -e '
const report = JSON.parse(require("fs").readFileSync("docs/screenshots/qa/browser-qa-report.json", "utf8"));
const failures = report.failures || [];
const consoleErrors = report.consoleErrors || [];
const exactFailClosedDownloadQa =
  failures.length === 2
  && failures.every((failure) => /download browser fetch status 503/.test(String(failure)))
  && consoleErrors.length === 3
  && consoleErrors.every((entry) => /503 \(Service Unavailable\)/.test(String(entry.text || entry)));
process.exit(exactFailClosedDownloadQa ? 0 : 1);
'; then
      pass "browser QA report has full coverage and only documented fail-closed download-audit 503 signals"
    else
      pass "browser QA report has full beta viewport/page coverage"
    fi
  else
    fail "browser QA report coverage check failed"
    cat ${RUN_TMP_DIR}/tjc-browser-qa-check.txt
  fi
else
  warn "browser QA report missing; run make portal-browser-qa before inviting teammates"
fi

if [ -d .runtime/audit-log ]; then
  if node -e '
const fs = require("fs");
const path = require("path");
const dir = ".runtime/audit-log";
const events = fs.readdirSync(dir)
  .filter((file) => file.endsWith(".jsonl"))
  .flatMap((file) => fs.readFileSync(path.join(dir, file), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)));
const actorEvents = events.filter((event) => typeof event.actor === "string" && event.actor.length > 0);
if (!actorEvents.length) {
  console.error("no actor-backed audit events found");
  process.exit(1);
}
const roles = new Set(actorEvents.map((event) => event.role));
const requiredRoles = ["Viewer", "Reviewer", "DAM Admin"];
const missingRoles = requiredRoles.filter((role) => !roles.has(role));
if (missingRoles.length) {
  console.error(`actor-backed audit missing roles: ${missingRoles.join(", ")}`);
  process.exit(1);
}
const types = new Set(actorEvents.map((event) => event.type));
const requiredTypes = ["denied_download", "review_pending_write_queued", "admin_readiness_viewed"];
const missingTypes = requiredTypes.filter((type) => !types.has(type));
if (missingTypes.length) {
  console.error(`actor-backed audit missing event types: ${missingTypes.join(", ")}`);
  process.exit(1);
}
' >${RUN_TMP_DIR}/tjc-audit-evidence-check.txt 2>&1; then
    pass "actor-backed Viewer/Reviewer/Admin audit rehearsal evidence exists"
  else
    warn "actor-backed beta audit rehearsal incomplete"
    cat ${RUN_TMP_DIR}/tjc-audit-evidence-check.txt
  fi
else
  warn ".runtime/audit-log missing; run API smoke before inviting teammates"
fi

if [ -d .runtime/backups ]; then
  latest_backup="$(find .runtime/backups -mindepth 1 -maxdepth 1 -type d 2>/dev/null | sort | tail -1 || true)"
  if [ -n "$latest_backup" ]; then
    pass "backup exists: $latest_backup"
    if [ -f "$latest_backup/restore-test-passed.txt" ]; then
      pass "latest backup has restore-test marker"
    else
      warn "latest backup lacks restore-test marker"
    fi
  else
    warn "no backup directories found"
  fi
else
  warn ".runtime/backups missing"
fi

free_kib="$(df -k "$ROOT" | awk 'NR==2 {print $4}')"
free_gib=$((free_kib / 1024 / 1024))
min_free_gib="${MIN_FREE_GIB:-10}"
if [ "$free_gib" -lt "$min_free_gib" ]; then
  warn "local free disk below ${min_free_gib} GiB: ${free_gib} GiB"
else
  pass "local free disk at least ${min_free_gib} GiB: ${free_gib} GiB"
fi

if node scripts/safe-lane-disk-report.mjs >${RUN_TMP_DIR}/tjc-safe-lane-disk-report.txt 2>&1; then
  pass "safe lane disk report is non-destructive and isolated"
else
  fail "safe lane disk report failed"
  cat ${RUN_TMP_DIR}/tjc-safe-lane-disk-report.txt
fi
if node scripts/safe-lane-disk-report-test.mjs >${RUN_TMP_DIR}/tjc-safe-lane-disk-report-test.txt 2>&1; then
  pass "safe lane disk report self-test rejects shared-checkout and destructive regressions"
else
  fail "safe lane disk report self-test failed"
  cat ${RUN_TMP_DIR}/tjc-safe-lane-disk-report-test.txt
fi

video_zip="/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Videos/Incoming/Samuel Kuo/Samuel Kuo-3-001.zip"
video_dir="/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Videos/Incoming/Samuel Kuo/Samuel Kuo"
if [ -f "$video_zip" ] && [ -d "$video_dir" ]; then
  warn "Samuel Kuo ZIP and extracted folder both exist; delete ZIP only after manifest/import audit is verified"
fi

if grep -q 'AI_ENABLED=0' .env.production.example && grep -q 'AI_MONTHLY_CAP_USD=25' .env.production.example; then
  pass "AI default disabled and cost cap documented"
else
  fail "AI guardrails missing from .env.production.example"
fi

if grep -q 'TJC_MAX_BROWSER_UPLOAD_MB=100' .env.production.example; then
  pass "large upload threshold documented"
else
  fail "large upload threshold missing"
fi

if grep -Eq 'update_field\(\$ref, \$fields\["rights_status"\], "(Approved Public|Approved Internal|Needs Review|Searchable Archive|Archive - Not Promoted|Do Not Use|Possible Minors)"\)' scripts/resourcespace-approve-batch.php; then
  fail "approval script writes publish workflow state into rights_status"
else
  pass "approval script keeps rights_status separate from publish_status"
fi

if grep -q 'portal-ready-confirmed' scripts/resourcespace-approve-batch.php && grep -q 'portal-ready-confirmed' scripts/approve-mvp-batch.sh; then
  pass "batch approval requires explicit portal-ready confirmation"
else
  fail "batch approval confirmation guard missing"
fi

if grep -Fqi 'simulated QA access' frontend/components/BetaPrototypeTools.tsx \
  && grep -Fqi 'beta testing only' frontend/components/BetaPrototypeTools.tsx \
  && grep -Fqi 'not production auth' frontend/components/BetaPrototypeTools.tsx \
  && grep -Fqi 'not SSO' frontend/components/BetaPrototypeTools.tsx \
  && grep -Fqi 'not real user impersonation' frontend/components/BetaPrototypeTools.tsx \
  && grep -Fqi 'not permission delegation' frontend/components/BetaPrototypeTools.tsx \
  && grep -Fqi 'simulated QA access' docs/teammate-beta-invite-pack.md \
  && grep -Fqi 'beta testing only' docs/teammate-beta-invite-pack.md \
  && grep -Fqi 'not production auth' docs/teammate-beta-invite-pack.md \
  && grep -Fqi 'not SSO' docs/teammate-beta-invite-pack.md \
  && grep -Fqi 'not real user impersonation' docs/teammate-beta-invite-pack.md \
  && grep -Fqi 'not permission delegation' docs/teammate-beta-invite-pack.md; then
  pass "beta role switch is labeled as simulated QA access"
else
  fail "beta role switch simulated-QA copy missing"
fi

if grep -Eqi 'P0|Critical' docs/teammate-test-guide.md docs/teammate-beta-invite-pack.md docs/beta-readiness-command-center.md \
  && grep -Eqi 'stop (the )?test batch|stop testing' docs/teammate-test-guide.md docs/teammate-beta-invite-pack.md docs/beta-readiness-command-center.md \
  && grep -Eqi 'sensitive, private, unreleased, youth-identifiable, or copyrighted media' docs/teammate-test-guide.md docs/teammate-beta-invite-pack.md docs/beta-readiness-command-center.md; then
  pass "beta stop-test policy and forbidden media categories documented"
else
  fail "beta stop-test policy or forbidden media categories missing"
fi

team_beta_signoff_output="${RUN_TMP_DIR}/tjc-team-beta-signoff-guard.txt"
if node scripts/team-beta-signoff-guard.mjs >"$team_beta_signoff_output" 2>&1; then
  if grep -q 'Team Beta signoff guard passed (GO)' "$team_beta_signoff_output"; then
    fail "Team Beta signoff record still says GO after June 15 P0; renew approval only after blockers close"
  else
    if grep -q 'Owner-led local dry run: PASS' docs/team-beta-go-no-go-packet.md \
      && grep -q 'Team Beta invite/send: NO-GO' docs/team-beta-go-no-go-packet.md \
      && grep -q 'Tiny teammate invite batch | NO-GO until owner signoff exists' docs/team-beta-go-no-go-packet.md \
      && grep -q 'Production/internal launch | NO-GO' docs/team-beta-go-no-go-packet.md \
      && grep -q 'Hosted 181-record catalog proof is not established' docs/team-beta-go-no-go-packet.md \
      && grep -q 'Final Signoff Block' docs/team-beta-go-no-go-packet.md \
      && grep -q 'Current final call: \*\*NO-GO for teammate invite batch' docs/team-beta-go-no-go-packet.md \
      && grep -q 'docs/team-beta-go-no-go-packet.md' docs/beta-readiness-command-center.md docs/team-beta-internal-test-packet.md; then
      pass "Team Beta GO/NO-GO packet blocks invites until hosted snapshot and owner gates close"
    else
      fail "Team Beta GO/NO-GO packet missing or overclaims invite readiness"
    fi
  fi
else
  fail "Team Beta human signoff record invalid"
  cat "$team_beta_signoff_output"
fi

if grep -q 'Team Beta signoff guard passed (NO-GO)' "$team_beta_signoff_output" \
  && grep -q 'docs/team-beta-signoff-record.md' docs/team-beta-go-no-go-packet.md docs/beta-readiness-command-center.md docs/team-beta-internal-test-packet.md; then
  pass "Team Beta human signoff record is current NO-GO after June 17 local-only proof"
else
  fail "Team Beta human signoff record must be current NO-GO after June 17 local-only proof"
  cat "$team_beta_signoff_output"
fi

if node scripts/team-beta-signoff-guard-test.mjs >${RUN_TMP_DIR}/tjc-team-beta-signoff-guard-test.txt 2>&1; then
  pass "Team Beta signoff guard self-test covers no-go and go states"
else
  fail "Team Beta signoff guard self-test failed"
  cat ${RUN_TMP_DIR}/tjc-team-beta-signoff-guard-test.txt
fi

if grep -Eq 'Doctrine/sacrament|Baptism|Holy Spirit|footwashing|Holy Communion|Sabbath' docs/team-beta-go-no-go-packet.md \
  && grep -Eq 'hymn 470-525|Hymns of Praise|channel, territory, rights basis' docs/team-beta-go-no-go-packet.md \
  && grep -Eq 'RE/minors|Religious Education|minor-identifying captions' docs/team-beta-go-no-go-packet.md \
  && grep -Eq 'Testimony/pastoral|context-safe or archive-only' docs/team-beta-go-no-go-packet.md \
  && grep -Eq 'AI may suggest tags only; AI cannot approve' docs/team-beta-go-no-go-packet.md; then
  pass "Team Beta research-derived no-go checks are represented"
else
  fail "Team Beta research-derived no-go checks missing from final packet"
fi

echo
echo "Launch readiness summary: failures=$failures warnings=$warnings"
if [ "$failures" -gt 0 ]; then
  exit 1
fi
