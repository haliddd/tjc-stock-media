# 07 Redaction And Download Safety Proof - 2026-06-15

## Purpose

Prove browser/API payloads do not expose restricted source/private/admin data to Viewer/Contributor callers, and prove unsafe downloads remain blocked after the query-role trust bug fix.

## P0 Found

Runtime smoke found `reviewer-query-role-not-trusted`: API routes could treat `?role=Reviewer` as authority in local mode. That bug class is P0 because a query parameter must not grant Reviewer/Admin access or create fake proof.

Affected pattern:

```ts
request.nextUrl.searchParams.get("role")
```

Risk:

- Reviewer thumbnail/API access could be unlocked by URL query.
- Admin/source/private fields could become reachable if any route reused query role as authority.
- Caller-supplied internal beta role headers could create misleading beta-auth route audit/session helper context unless stripped before route helpers run and accepted only with a middleware-issued verified-session marker.
- Smokes could produce false proof by testing elevated query state instead of trusted identity.

## Fix

Role resolution now stays centralized through server identity/session helpers:

- `frontend/lib/request-identity.ts` no longer trusts localhost by default.
- `localBetaRoleOverridesEnabled()` is the only non-production query/body override gate.
- Override gate uses server-only env: `PORTAL_ALLOW_BETA_ROLE_OVERRIDE` or `BETA_ROLE_OVERRIDE_ENABLED`.
- Production runtime returns Viewer for client role overrides.
- Trusted SSO headers still work only when SSO trust is enabled.
- `frontend/app/layout.tsx` hydrates the client UI role from trusted SSO headers through `trustedRoleFromHeaders`; this path is disabled unless trusted SSO headers are enabled and does not use query/localStorage role.
- `frontend/middleware.ts` strips caller-supplied `x-tjc-beta-role` and `x-tjc-beta-session-verified`, then injects both only after a signed beta session cookie verifies.
- `frontend/lib/request-identity.ts` trusts beta role headers only when the middleware-issued verified-session marker is present.
- Download-gate demo role policy remains explicit and server-gated.
- Enterprise/legacy client privileged GET paths no longer append client `?role=` authority for asset detail, review queue, admin readiness, brand kit, or search reads. Server-side route identity remains the permission source.

Guard strengthened:

- `scripts/api-identity-guard.mjs` fails if `requestIsLocalhost(request)` can grant role override.
- `scripts/api-identity-guard-test.mjs` proves the guard fails fixture regressions for direct route query-role reads, localhost trust, trusted-SSO fallback to URL roles, privileged client `?role=` reads, missing verified beta header stripping, and generic production `x-tjc-role` trust.
- `scripts/api-identity-guard.mjs` fails if identity helpers trust beta role headers without the verified marker, or if middleware stops stripping/injecting the role and marker together.
- `scripts/api-identity-guard.mjs` fails if an API route reads `searchParams.get("role")` outside direct handoff to `requestIdentity`, `createDamRouteSession`, or `runApprovedDeliveryGate`.
- `scripts/api-identity-guard.mjs` fails if client privileged GET paths regain `?role=` authority for asset detail, review queue, admin readiness, brand kit, or search reads.
- `scripts/api-payload-guard-test.mjs` proves payload guard fixture regressions fail for private URL keys, source-redaction download field leakage, download-route gate sprawl, thumbnail variant hand-rolls, raw JSON parsing, and collection route normalization drift.
- `scripts/private-source-guard-test.mjs` proves private-source guard fixture regressions fail for ad hoc path traversal checks, URL allowlist regexes, private token regexes, reviewer text sanitizer hand-rolls, and missing reviewer text normalization.
- `scripts/hosted-smoke-mutation-guard.mjs` fails if the hosted mutating smoke can run non-local POST paths without explicit owner approval, and it executes a fake-hosted fail-closed dry gate that exits before network access.

Smoke strengthened:

- `scripts/portal-api-smoke.sh` now checks reviewer query role, admin query role, and admin query payload redaction without trusted headers.
- `scripts/portal-download-ticket-smoke.sh` now uses trusted identity headers for positive Reviewer/Admin proof paths and keeps raw no-header calls only for explicit spoof/Viewer denial probes.
- `scripts/portal-download-ticket-smoke-test.mjs` now self-tests the smoke contract so role spoof denial, private URL rejection, one-use ticket reuse denial, concurrent one-wins consumption, thumbnail/download blocking, blocked asset denial, audit persistence, and forbidden role override env drift fail before any readiness claim.
- `scripts/portal-sso-smoke-test.mjs` now self-tests the SSO smoke contract so trusted Reviewer/Admin/Contributor headers, malformed admin denial, query-admin denial, group admin claim, and unsafe-download blocking cannot be removed silently.
- `scripts/portal-delivery-smoke-test.mjs` now self-tests the delivery smoke contract so Viewer/Contributor redaction, blocked download URL denial, private S3/source leak rejection, and S3 readiness honesty cannot be removed silently.
- `scripts/portal-package-smoke-test.mjs` now self-tests the package smoke contract so Viewer package denial, Contributor save sanitization, Reviewer list caps, persisted unsafe package normalization, private governance leak rejection, and package-draft storage honesty cannot be removed silently.
- `frontend/lib/beta-auth.test.ts` checks beta-auth routes strip spoofed beta role and marker headers, then inject both only from a verified session cookie.
- `frontend/lib/production-hardening.test.ts` checks `requestIdentity` ignores naked beta role headers without the verified marker.

## Runtime Proof

Protected-mode dev server:

```bash
cd /Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run/frontend
SSO_TRUSTED_HEADERS=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0 npx next dev --port 4871
```

Actual BASE_URL:

```bash
http://localhost:4871
```

Latest required rerun: `2026-06-16T13:46:56Z` in isolated worktree.

Proof commands:

| Command | Result |
|---|---|
| `BASE_URL=http://localhost:4871 make portal-api-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-download-ticket-smoke` | PASS |
| `make portal-download-ticket-smoke-test` | PASS |
| `BASE_URL=http://localhost:4871 make portal-sso-smoke` | PASS |
| `make portal-sso-smoke-test` | PASS |
| `BASE_URL=http://localhost:4871 make portal-delivery-smoke` | PASS |
| `make portal-delivery-smoke-test` | PASS |
| `make portal-package-smoke-test` | PASS |
| `BASE_URL=http://localhost:4871 make portal-writeback-guard-smoke` | PASS |
| `BASE_URL=http://localhost:4871 make portal-browser-qa` | PASS current UI/browser QA; 20 pages, six viewports, 32 screenshots, 0 failures at `2026-06-16T16:43:07.114Z` |
| Historical `BASE_URL=http://localhost:4871 PORTAL_QA_TRUSTED_HEADERS=1 node scripts/portal-browser-qa.mjs` | PASS at `2026-06-16T02:59:06.306Z`; historical proof |
| `make hosted-smoke-mutation-guard` | PASS |
| `make portal-hosted-smoke` with default hosted URL and no approval env | EXPECTED FAIL-CLOSED before hosted mutation |

Relevant runtime results:

- Latest required rerun passed at `2026-06-16T13:46:56Z`: `git diff --check`, safe-lane/runtime/API identity/payload/private-source/public-env/git-hygiene/storage-honesty/evidence guards and self-tests, `make launch-readiness`, typecheck, tests, build, `BASE_URL=http://localhost:4871 make portal-api-smoke`, and `BASE_URL=http://localhost:4871 make portal-download-ticket-smoke`.
- Latest runtime smoke rerun passed at `2026-06-16T13:46:56Z`: `portal-api-smoke`, `portal-download-ticket-smoke`, `portal-feedback-smoke`, `portal-package-smoke`, `portal-saved-search-smoke`, and `portal-beta-rehearsal` against explicit `BASE_URL=http://localhost:4871`.
- Latest launch-readiness reported failures=0 / warnings=2; `.env missing` remains a hosted/durable proof blocker and `.runtime/backups missing` remains a backup/restore proof blocker.
- `GET /api/assets/thumbnail/644?variant=detail&role=Reviewer` without trusted headers returned blocked.
- Same reviewer thumbnail request with trusted SSO headers returned allowed where expected.
- `GET /api/review?role=Reviewer&queue=pending` without trusted headers returned blocked.
- `GET /api/admin/readiness?role=DAM%20Admin` without trusted headers returned blocked.
- `GET /api/admin/readiness?role=Admin` without trusted headers returned blocked.
- `GET /api/assets/367?role=DAM%20Admin` without trusted headers returned Viewer-redacted payload.
- `GET /api/assets/367?role=Admin` without trusted headers returned Viewer-redacted payload.
- Production generic SSO/header shims fail closed: `x-tjc-role`, `x-auth-request-email`, and `x-auth-request-groups` no longer grant Reviewer/Admin authority in production without Cloudflare Access mode plus Access assertion/email proof. Direct role shim headers remain local rehearsal only.
- Direct query-role probes are now covered in `portal-api-smoke` for Reviewer, `DAM Admin`, and plain `Admin` query roles; they returned `403` for review/admin/thumbnail escalation and redacted `200` asset payloads with no `originalUrl`, `signedUrl`, `sourcePath`, private/admin terms, or S3 leak markers.
- `GET /api/download/368?role=Viewer` remained blocked.
- Download ticket smoke proved direct GET denial, terms requirement, one-use ticket, reuse denial, concurrent one-wins ticket consumption, thumbnail download block, blocked asset denial, and audit persistence.
- Trusted-header SSO smoke proved Reviewer/Contributor/DAM Admin headers override client role inputs while unsafe download remains blocked.
- Beta-auth middleware and identity tests proved caller-supplied beta role/marker headers are stripped, naked beta role headers are ignored, and malicious headers cannot override a verified session role.
- Delivery smoke proved Viewer/Contributor payloads and blocked download gates do not leak private storage, source custody, or unfinished S3 delivery details.
- Writeback guard smoke proved complete reviewer decisions queue pending-write truth instead of live ResourceSpace sync.
- Browser QA proved Contributor/Reviewer/Admin UI access through trusted SSO headers without re-enabling query-role trust.
- Default hosted smoke now refuses non-local POST behavior unless `PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1` and `PORTAL_HOSTED_SMOKE_APPROVED_BY` are set; this session did not run hosted mutation.

## Safety Boundary

This is local proof only. It does not prove hosted origin protection, canonical deployment env, ResourceSpace rehearsal scope, Google Drive custody, or durable production runtime state.

Decision: local redaction/download P0 query-role bug class is fixed and proven. Overall beta remains NO-GO until external and hosted gates pass.
