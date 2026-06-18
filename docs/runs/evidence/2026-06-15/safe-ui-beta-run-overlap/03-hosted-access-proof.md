# 03 Hosted Access Proof - 2026-06-15

## Scope

This doc records hosted access status for the June 15 safety lane.

## Result

Limited hosted read-only probes were run against the historical stable URL without credentials and without any POST/writeback/env mutation.

Reason for limited scope: available hosted smoke docs state that some hosted checks mutate hosted feedback or review state. This run was not approved to mutate hosted data, Vercel env, ResourceSpace prod, tester invites, or public launch surfaces.

## Existing Context

`docs/team-beta-hosted-access-proof.md` defines prior hosted beta expectations:

- Stable URL only: `https://tjc-stock-media.vercel.app`
- No Vercel preview URLs for testers.
- `RESOURCESPACE_ENABLE_WRITEBACK=0`
- `RESOURCESPACE_WRITEBACK_MODE=queued`
- `BETA_FEEDBACK_ENABLED=1`
- `BETA_TASK_MODE_ENABLED=1`
- `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0`

It also warns not to run mutating hosted smokes without owner approval.

The script now enforces that warning: `portal-hosted-smoke` exits before any non-local POST unless both `PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1` and `PORTAL_HOSTED_SMOKE_APPROVED_BY` are set. `make hosted-smoke-mutation-guard` checks that approval gate stays present and appears before POST paths.

## Current June 15 Gap

This local run proved:

- Query role cannot grant Reviewer/Admin power locally.
- Trusted headers can exercise protected local QA without query-role trust.
- Local browser QA passed in protected trusted-header mode.

Limited hosted read-only probe result:

- Probe base: `https://tjc-stock-media.vercel.app`
- Repeatable command: `BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe`
- Latest summary checked at: `2026-06-15T11:52:56.617Z`
- Probe safety guard: `make hosted-readonly-probe-guard` PASS; guard requires GET/HEAD-only probes, no request bodies, no raw response body/header persistence, summary-only leak flags, and fail-closed exit on forbidden or privileged response shapes.
- Hosted mutation safety guard: `make hosted-smoke-mutation-guard` PASS; guard requires explicit owner approval before `portal-hosted-smoke` can run against non-local targets.
- Evidence summary: `hosted-readonly-probes/summary.json`
- `/` followed to `/beta-login?returnTo=%2F`.
- `/api/beta-auth/session` returned `401` JSON with session-shape keys only.
- `GET /api/review?role=Reviewer&queue=pending` followed to beta login HTML, not review JSON.
- `GET /api/admin/readiness?role=DAM%20Admin` followed to beta login HTML, not admin readiness JSON.
- `GET /api/assets/367?role=DAM%20Admin` followed to beta login HTML, not asset JSON.
- `GET /api/download/368?role=Viewer` followed to beta login HTML, not a download payload.
- Summary leak flags found no source/original/private/admin/token patterns or privileged response shapes in the inspected read-only responses.

This run did not prove:

- Hosted origin/session protection for authenticated roles.
- Hosted SSO/session trust boundary.
- Hosted redaction/download behavior after the P0 query-role fix.
- Hosted env values.
- Hosted deployment commit alignment.

## Decision

Hosted access remains NO-GO until read-only owner proof and any approved hosted smokes are completed without violating mutation boundaries.

## Negative Test Matrix Status

| Case | Status | Notes |
|---|---|---|
| Anonymous hosted access blocked | PARTIAL PASS read-only | Historical stable URL and API probes redirected/denied unauthenticated access to beta login/session. |
| Invalid/expired hosted session blocked | NOT RUN | Requires hosted auth/session proof. |
| Query/localStorage/cookie role spoofing | PARTIAL PASS local + hosted read-only | Query role proven blocked locally; unauthenticated hosted query-role API probes did not return privileged JSON. Authenticated hosted/session spoofing still not run. |
| Writeback disabled/queued | NOT RUN hosted | Local/env docs indicate expected settings; Vercel env not verified. |

## Proof Record

| Field | Value |
|---|---|
| Date | 2026-06-15 |
| Commit SHA | `a22497e96004024928128990f432806b768930a6` |
| Repo/branch | `codex/safe-ui-beta-proof-2026-06-15` |
| Environment | local protected-mode proof; limited hosted read-only probes |
| Base URL | local `http://localhost:4871`; hosted probe base `https://tjc-stock-media.vercel.app` |
| Role/persona | Viewer/Contributor/Reviewer/DAM Admin local trusted-header personas |
| Command or manual step | local smokes/browser QA; `BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe`; `make hosted-readonly-probe-guard`; `make hosted-smoke-mutation-guard`; hosted mutating smokes intentionally not run |
| Expected | hosted protected access proof or blocker |
| Actual | anonymous hosted probes redirect/deny to beta login/session; authenticated hosted roles/env/deployment still unproven |
| Result | PARTIAL PASS read-only / BLOCKED for full hosted proof |
| Evidence path | this file; `07-redaction-and-download-safety-proof.md`; `10-final-qa-summary.md` |
| Secrets redacted | yes |
| Follow-up | Hali confirms canonical hosted URL/protection, deployment commit, env, and approves any authenticated or mutating hosted proof scope |
