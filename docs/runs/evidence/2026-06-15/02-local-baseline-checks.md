# 02 Local Baseline Checks - 2026-06-15

## Scope

This baseline was rerun from the isolated worktree only.

- Source checkout: `/Users/halim4pro/Desktop/MVP/tjc-stock-media`
- Isolated worktree: `/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run`
- Branch: `codex/safe-ui-beta-proof-2026-06-15`
- Start commit: `e88c5722f8e547b24f054633854e36391d670d42`
- Current HEAD commit: `e88c5722f8e547b24f054633854e36391d670d42`
- Actual BASE_URL: `http://localhost:4871`
- Server mode for runtime proof: `SSO_TRUSTED_HEADERS=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0`
- Secrets redacted: yes
- Latest protected rerun: `2026-06-16T13:46:56Z` / `2026-06-16 08:22:54 EDT`
- Historical protected browser QA PASS: `2026-06-16T02:59:06.306Z`
- Current browser QA status: **PASS** at `2026-06-16T16:43:07.114Z`; self-owned port-4871 browser QA completed with 20 pages, six viewports, 32 screenshots, 0 failures, 0 console errors, 0 network failures, and 0 warnings.
- Latest low-disk-safe guard matrix rerun: `2026-06-15T15:23:11Z`
- Latest evidence/readiness rerun after disk-report copy hardening: `2026-06-15T15:30:11Z`

## Baseline Result

The earlier public-env guard blocker is resolved in this isolated worktree. Client-rendered code no longer needs server `NODE_ENV` access for the local beta role switch, and public env exposure remains guarded.

Current heavy rerun status: unblocked by safe headroom. Recorded `df -g .` observation reports 24 GiB free, above the configured 10 GiB threshold. `safe-lane-headroom-guard` remains active, so future dev/build/start/browser/smoke/bootstrap/docker/import/media/backup reruns still fail closed if disk drops below threshold or the command runs from the shared checkout.

Historical low-disk note: earlier `df -g .` / launch-readiness checks ranged 0-2 GiB free, and `make safe-lane-disk-report` showed limited isolated cleanup candidates. That warning is now classified as a local operational follow-up if it recurs, not a current beta blocker.

## Checks

| Check | Result |
|---|---|
| `git diff --check` | PASS |
| `node scripts/public-env-guard.mjs` | PASS |
| `make public-env-guard-test` | PASS |
| `node scripts/private-source-guard.mjs` | PASS |
| `make live-dam-surface-guard` | PASS |
| `make live-dam-surface-guard-test` | PASS |
| `node scripts/api-identity-guard.mjs` | PASS, 19 routes |
| `node scripts/api-payload-guard.mjs` | PASS |
| `node scripts/api-audit-guard.mjs` | PASS |
| `make api-audit-guard-test` | PASS |
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
| `make launch-readiness` | PASS, failures=0 / warnings=2; warnings=`.env missing`, `.runtime/backups missing` |
| `npm --prefix frontend run typecheck` | PASS |
| `npm --prefix frontend test` | PASS, 9 files / 86 tests |
| `npm --prefix frontend run build` | PASS, `prebuild` ran `dev-server-build-guard` |
| `BASE_URL=http://localhost:4871 make portal-api-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-download-ticket-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-sso-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-delivery-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-package-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-saved-search-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-feedback-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-writeback-guard-smoke` | PASS |
| `make portal-writeback-guard-smoke-test` | PASS |
| `make portal-download-ticket-smoke-test` | PASS |
| `make portal-sso-smoke-test` | PASS |
| `make portal-delivery-smoke-test` | PASS |
| `make portal-package-smoke-test` | PASS |
| `BASE_URL=http://localhost:4871 make portal-beta-rehearsal` | PASS, `.runtime/beta-rehearsals/20260616T052323Z-82430/summary.json` |
| `BASE_URL=http://localhost:4871 PORTAL_USAGE_LOGGING=1 USAGE_ANALYTICS_DB_PATH=/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run/.runtime/analytics/portal-usage.sqlite make portal-usage-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-browser-qa` | PASS, 20 pages / 6 viewports / 32 screenshots / 0 failures; current self-owned rerun checked `2026-06-16T16:43:07.114Z`; report `docs/screenshots/qa/browser-qa-report.json` |
| Historical `BASE_URL=http://localhost:4871 PORTAL_QA_TRUSTED_HEADERS=1 node scripts/portal-browser-qa.mjs` | PASS, 21 pages / 6 viewports / 27 screenshots / 0 failures; checked `2026-06-16T02:59:06.306Z`; historical proof |
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

- Latest required rerun passed: guards, typecheck, tests, build, `portal-api-smoke`, `portal-download-ticket-smoke`, `portal-feedback-smoke`, `portal-package-smoke`, `portal-saved-search-smoke`, and `portal-beta-rehearsal` on `http://localhost:4871` at `2026-06-16T13:46:56Z`.
- Post identity/doc hardening runtime rerun passed at `2026-06-15T12:14Z`: `portal-api-smoke`, `portal-download-ticket-smoke`, `portal-package-smoke`, `portal-saved-search-smoke`, `portal-feedback-smoke`, and `portal-beta-rehearsal`. Earlier protected rerun also covered `portal-sso-smoke`, `portal-delivery-smoke`, `portal-writeback-guard-smoke`, and `portal-usage-smoke`; usage analytics required restarting the isolated local server with `PORTAL_USAGE_LOGGING=1`.
- Client privileged GET query-role cleanup passed guard/typecheck/test/build and browser QA. Latest self-owned browser QA passed at `2026-06-16T16:43:07.114Z`.
- `?role=Reviewer` cannot unlock reviewer thumbnail access without trusted identity.
- `?role=Reviewer` cannot unlock review queue access without trusted identity.
- `?role=DAM Admin` cannot unlock admin readiness without trusted identity.
- `?role=DAM Admin` asset detail remains Viewer-redacted without trusted identity.
- `?role=Admin` cannot unlock admin readiness or admin/source/private fields without trusted identity.
- Direct probes are now covered in `portal-api-smoke`; latest targeted rerun at `2026-06-15T12:14Z` returned `403` for review/admin/thumbnail escalation attempts and redacted `200` asset payloads with no `originalUrl`, `signedUrl`, `sourcePath`, private/admin terms, or S3 leak markers.
- Caller-supplied beta role headers on beta-auth routes cannot fake session role or the verified-session marker.
- Blocked downloads stay blocked.

## Posture

Local P0 query-role bug class is fixed and smoke-proven. Current browser QA is green for the local isolated proof lane: the latest self-owned run passed with 20 pages, six viewports, 32 screenshots, and zero failures. Beta posture remains NO-GO for broader send/launch because hosted protection, canonical deployment, ResourceSpace scope, Google Drive custody, durable/fail-closed state, and tester signoff are not fully proven in this packet.
