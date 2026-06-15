# 02 Local Baseline Checks - 2026-06-15

## Scope

This baseline was rerun from the isolated worktree only.

- Source checkout: `/Users/halim4pro/Desktop/MVP/tjc-stock-media`
- Isolated worktree: `/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run`
- Branch: `codex/safe-ui-beta-proof-2026-06-15`
- Start commit: `a22497e96004024928128990f432806b768930a6`
- Current HEAD commit: `a22497e96004024928128990f432806b768930a6`
- Actual BASE_URL: `http://localhost:4871`
- Server mode for runtime proof: `SSO_TRUSTED_HEADERS=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0`
- Secrets redacted: yes
- Latest protected rerun: `2026-06-15T12:14:57Z` / `2026-06-15 08:14:57 EDT`
- Latest protected browser QA rerun: `2026-06-15T13:27:23.819Z`
- Latest low-disk-safe guard matrix rerun: `2026-06-15T15:23:11Z`
- Latest evidence/readiness rerun after disk-report copy hardening: `2026-06-15T15:30:11Z`

## Baseline Result

The earlier public-env guard blocker is resolved in this isolated worktree. Client-rendered code no longer needs server `NODE_ENV` access for the local beta role switch, and public env exposure remains guarded.

Current heavy rerun status: blocked by `safe-lane-headroom-guard` until local free disk is at least 10 GiB or the threshold is deliberately lowered for a specific safe command. The dev, build, start, and browser QA rows below are the latest valid local proof, not permission to rerun heavy commands while disk remains below the guard threshold.

Latest `df -g .` / launch-readiness checks ranged 0-2 GiB free, and `make safe-lane-disk-report` showed only isolated cleanup candidates: `frontend/.next` (`497M`), `.next` (`4.0K`), and `.runtime/analytics` (`400K`). That is not enough to restore default 10 GiB headroom, so typecheck/test/build/dev/server/browser/runtime smoke reruns remain blocked in this lane.

## Checks

| Check | Result |
|---|---|
| `git diff --check` | PASS |
| `node scripts/public-env-guard.mjs` | PASS |
| `make public-env-guard-test` | PASS |
| `node scripts/private-source-guard.mjs` | PASS |
| `node scripts/api-identity-guard.mjs` | PASS, 19 routes |
| `node scripts/api-payload-guard.mjs` | PASS |
| `node scripts/api-audit-guard.mjs` | PASS |
| `node scripts/storage-honesty-guard.mjs` | PASS |
| `make storage-honesty-guard-test` | PASS |
| `node scripts/git-hygiene-guard.mjs` | PASS |
| `make safe-lane-guard` | PASS |
| `make runtime-isolation-guard` | PASS |
| `make dev-server-build-guard` | PASS, safe-lane port `4871` stopped before build |
| `make dev-server-build-guard-test` | PASS |
| `make hosted-readonly-probe-guard` | PASS |
| `make hosted-smoke-mutation-guard` | PASS, source guard plus fake-hosted fail-closed dry gate |
| `make open-blockers-guard` | PASS |
| `make open-blockers-guard-test` | PASS |
| `make evidence-packet-guard` | PASS |
| `make evidence-packet-guard-test` | PASS |
| `make launch-readiness` | PASS, failures=0 / warnings=3 (`.env missing`, `.runtime/backups missing`, `local free disk below 10 GiB`) |
| `npm --prefix frontend run typecheck` | PASS |
| `npm --prefix frontend test` | PASS, 6 files / 78 tests |
| `npm --prefix frontend run build` | PASS, `prebuild` ran `dev-server-build-guard` |
| `BASE_URL=http://localhost:4871 make portal-api-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-download-ticket-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-sso-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-delivery-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-package-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-saved-search-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-feedback-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-writeback-guard-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-beta-rehearsal` | PASS, `.runtime/beta-rehearsals/20260615T121438Z-48032/summary.json` |
| `BASE_URL=http://localhost:4871 PORTAL_USAGE_LOGGING=1 USAGE_ANALYTICS_DB_PATH=/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run/.runtime/analytics/portal-usage.sqlite make portal-usage-smoke` | PASS |
| `BASE_URL=http://localhost:4871 PORTAL_QA_TRUSTED_HEADERS=1 node scripts/portal-browser-qa.mjs` | PASS, 17 pages / 6 viewports / 23 screenshots / 0 failures; rerun checked `2026-06-15T13:27:23.819Z` |
| `make portal-hosted-smoke` with default hosted URL and no approval env | EXPECTED FAIL-CLOSED, exits before hosted/network mutation |

## P0 Query-Role Regression

`portal-api-smoke` found a real P0 before this baseline: `reviewer-query-role-not-trusted`. A request with `?role=Reviewer` could unlock reviewer thumbnail/API access because localhost query roles were trusted implicitly.

Patch result:

- Localhost no longer grants role override by itself.
- Query/body role overrides require explicit server-only env in local dev or trusted identity/session.
- `public-env-guard-test` proves public secret envs, unapproved `NEXT_PUBLIC_*`, and client server-env reads fail in fixture regressions.
- Production/hosted query role is never trusted.
- Unauthenticated smoke callers default to Viewer.
- Reviewer/Admin authority comes only from trusted SSO headers, trusted beta session, or explicit server-only local override.
- Server-rendered UI role hydration uses trusted SSO headers only when `SSO_TRUSTED_HEADERS=1`; query/localStorage role does not grant protected authority.
- Caller-supplied `x-tjc-beta-role` and `x-tjc-beta-session-verified` are stripped at middleware boundary; both are re-injected only after a verified beta session cookie.
- Hosted mutating smoke cannot run against the default hosted URL without explicit approval env; `hosted-smoke-mutation-guard` also runs a fake-hosted fail-closed dry gate so this cannot drift silently.
- Client privileged GET paths for asset detail, review queue, admin readiness, brand kit, and search no longer append `?role=` as an authority carrier; `api-identity-guard` now checks this.

Regression proof:

- Latest required rerun passed: guards, typecheck, tests, build, `portal-api-smoke`, `portal-download-ticket-smoke`, `portal-feedback-smoke`, `portal-package-smoke`, `portal-saved-search-smoke`, and `portal-beta-rehearsal` on `http://localhost:4871` at `2026-06-15T12:14:57Z`.
- Post identity/doc hardening runtime rerun passed at `2026-06-15T12:14Z`: `portal-api-smoke`, `portal-download-ticket-smoke`, `portal-package-smoke`, `portal-saved-search-smoke`, `portal-feedback-smoke`, and `portal-beta-rehearsal`. Earlier protected rerun also covered `portal-sso-smoke`, `portal-delivery-smoke`, `portal-writeback-guard-smoke`, and `portal-usage-smoke`; usage analytics required restarting the isolated local server with `PORTAL_USAGE_LOGGING=1`.
- Client privileged GET query-role cleanup passed guard/typecheck/test/build and protected browser QA at `2026-06-15T13:27:23.819Z`.
- `?role=Reviewer` cannot unlock reviewer thumbnail access without trusted identity.
- `?role=Reviewer` cannot unlock review queue access without trusted identity.
- `?role=DAM Admin` cannot unlock admin readiness without trusted identity.
- `?role=DAM Admin` asset detail remains Viewer-redacted without trusted identity.
- `?role=Admin` cannot unlock admin readiness or admin/source/private fields without trusted identity.
- Direct probes are now covered in `portal-api-smoke`; latest targeted rerun at `2026-06-15T12:14Z` returned `403` for review/admin/thumbnail escalation attempts and redacted `200` asset payloads with no `originalUrl`, `signedUrl`, `sourcePath`, private/admin terms, or S3 leak markers.
- Caller-supplied beta role headers on beta-auth routes cannot fake session role or the verified-session marker.
- Blocked downloads stay blocked.

## Posture

Local P0 query-role bug class is fixed and smoke/browser-proven. Premium UI maturity pass is locally green. Beta posture remains NO-GO for broader send/launch because hosted protection, canonical deployment, ResourceSpace scope, Google Drive custody, and durable/fail-closed state are not fully proven in this packet.
