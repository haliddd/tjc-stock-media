# Small-Team Beta Readiness Pass

Date: 2026-06-17
Branch: `codex/merge-recommended-set-2026-06-17`
HEAD before: `63474a70e930687b188d6327f888e677dde3c2d2`
HEAD after: `63474a70e930687b188d6327f888e677dde3c2d2`

## Final Classification

Small-team beta not ready.

Route, role, upload/review/library, invite-ops, redaction, and local browsing evidence improved. The current proof is not enough for small-team beta: production-mode local browser QA is red on approved/unsafe download safety probes because production runtime writes fail closed without a durable store, and hosted/current URL, real login/invite codes, real content counts, and durable hosted runtime state are still unproven.

Hosted teammate invite decision: NO-GO until those hosted/current gates close.

## Scope Boundary

This pass stayed inside beta-readiness blockers and beta operations polish:

- Enterprise route surface drift for `/` and `/upload`.
- Local trusted-header role proof.
- Invite-code operational readiness and smoke coverage.
- Viewer/source redaction and unsafe preview blocking.
- Approved-copy download ticket safety.
- Browser QA expectation updates where assertions were stale.
- Evidence and team instructions.

Out of scope:

- Library visual polish, multi-select polish, public sharing, ZIP/bulk workflows, tag editing, collection workflow expansion, ResourceSpace writeback, deploy, merge, real secrets, source media mutation, and `prd.json` changes.

## Environment Tested

Local app proof:

- URL: `http://localhost:4871`
- Dev command: `SSO_TRUSTED_HEADERS=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0 npm run dev`
- Production-mode browser QA command: `TJC_STOCK_MEDIA_ROOT=/Users/halim4pro/Desktop/MVP/tjc-stock-media SSO_PROVIDER=cloudflare-access PRODUCTION_REQUIRE_TRUSTED_IDENTITY=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0 npm run start`
- Browser QA role method: placeholder Cloudflare Access-style trusted headers with client/query/body role overrides disabled. This proves local trusted-header behavior only; it is not real teammate login.

Hosted read-only protection proof:

- URL: `https://tjc-stock-media.vercel.app`
- Probe: `docs/runs/evidence/2026-06-17/hosted-readonly-probes/summary.json`
- Result: unauthenticated root/query-role/admin/review/download probes redirected to beta login or returned unauthenticated session state without privileged payloads.

Hosted/current deployment was not proven. Do not claim hosted beta readiness from this evidence.

## Role And Auth Findings

- Viewer, Contributor, Reviewer, and DAM Admin were tested locally through trusted headers and smoke harnesses.
- Trusted headers prove local QA role behavior only. They are not real team login.
- Real persona passwords and real church/location invite codes were not configured or created.
- Invite smoke uses placeholder-only local fixture codes.
- Admin readiness now shows invite-code operational count/status only. It does not show raw codes or hashes.

## Content Findings

- Local browser/API evidence used local export-backed records and smoke fixtures.
- Browser QA used asset `368` (`Bench Bible`) for approved/detail proof and asset `644` (`2012 Photo 644`) for unsafe/review proof.
- The real hosted/current content target of 181 approved photos plus remaining pending/unapproved photos was not proven.
- Local API smoke generated isolated ResourceSpace-format fixtures; this does not prove hosted/current content coverage.

## Core Journey Results

- Viewer: local browser QA proves Library/search/detail/request/task/help paths. Viewer redaction and original/source blocking passed smoke/tests.
- Contributor: local browser QA proves upload and recent-upload surfaces. API smoke exercises upload/intake paths.
- Reviewer / Joanna: local browser QA proves review queue/detail/action surface. Reviewer can inspect blocked review assets that Viewer cannot.
- Admin: local browser QA proves Admin surface. Admin readiness includes safe invite-code readiness row.

## App Fixes

- `/` now resolves to the Enterprise Library surface instead of drifting to the wrong home/dashboard surface.
- `/upload` now resolves to the Enterprise Upload/intake surface.
- Route/page/nav/permission/guard facts now share the Enterprise route surface manifest.
- Requests table moved the action column next to Request ID so the primary action is not hidden off-screen at beta widths.
- Upload status chips wrap so mobile/tablet views remain usable.

## Safety And Security Fixes

- Viewer/Contributor reusable preview policy now blocks blocked/review-candidate previews from normal users while keeping Reviewer/Admin review inspection.
- Local SVG delivery copy no longer exposes “ResourceSpace ID” wording to normal delivery users.
- Trusted-header mode denies download-gate role override mismatch.
- Added tests for role spoof denial and Viewer thumbnail block.
- Download ticket smoke proves one-time use, original/source blocking, unsafe path denial, body-role spoof denial, concurrent consume behavior, and local audit persistence.

## Beta Operations Docs

- Added invite-code runbook section/doc covering placeholder-only code creation, rotation, revocation, leak handling, and “never put real codes in GitHub/Slack/docs/logs/screenshots/fixtures.”
- Added Admin readiness row: `Church invite codes configured`, count/status only.
- Added `scripts/portal-beta-invite-smoke.sh` with placeholder-only checks.

## QA Harness Updates

Stale expectations updated without product behavior changes:

- Library mobile check now waits for ResourceSpace data to finish loading and accepts mobile cards, desktop rows, or safe empty state.
- Package builder check now waits for the builder grid before asserting reference-only safety copy.
- Package privacy assertion accepts current “Source files remain private” wording instead of old “stay private” wording.
- Review workbench assertion now checks current approval-blocker guidance instead of old copy.
- Active nav assertion normalizes duplicate desktop/mobile active labels and numeric badges.
- App nav proof targets visible header elements so hidden mobile topbar does not fail desktop proof.

## Browser QA Failure Classification

Latest production-mode local rerun: fail.

Current failures:

| Failure | Classification | Resolution |
| --- | --- | --- |
| `blocked approved download browser fetch status 503` | True app beta blocker / hosted-runtime limitation | App fails closed because required download audit cannot persist in production mode without durable runtime state. Do not loosen. Requires durable audit/ticket store proof or explicit hosted fail-closed instructions before beta. |
| `unsafe download browser fetch status 503` | True app beta blocker / hosted-runtime limitation | Same production runtime write block. Source/original remains blocked, but browser QA is red because safety probe receives 503 and console error. |

Harness updates made during final rerun:

- Trusted-header smoke and browser QA now send placeholder Cloudflare Access-style headers (`cf-access-jwt-assertion`, `cf-access-authenticated-user-email`, `cf-access-groups`) so local production-mode QA exercises the production trusted identity path instead of relying on query roles or dev-only `x-tjc-role`.
- Download ticket smoke fixture now uses numeric ResourceSpace-style IDs instead of non-numeric test IDs.
- Download ticket smoke now uses trusted-header helper by default and keeps raw requests only for spoof/no-trusted-header probes.

Previous remaining failures before harness cleanup:

| Failure | Classification | Resolution |
| --- | --- | --- |
| Library mobile stuck on loading in screenshot | Stale QA wait / beta timing risk | Harness now waits for data-ready rows or safe empty state before capture. Latest rerun passes. |
| Package builder missing `Set outline`, `Browse DAM records`, privacy/writeback copy | Stale QA timing/copy expectation | Harness waits for builder grid and accepts current privacy wording. Latest rerun passes. |
| Review missing `Complete required evidence before approval` | Stale QA copy | Harness checks current approval-blocker guidance. Latest rerun passes. |
| Requests/My Tasks/Help/Recent Uploads active nav mismatch | Stale selector/duplicate nav expectation | Harness normalizes desktop/mobile active labels and badges. Latest rerun passes. |
| Appnav proof hidden mobile header timeout | Stale selector | Harness targets visible header. Latest rerun passes. |

Latest report: `docs/screenshots/qa/browser-qa-report.json`

- 20 pages
- 6 viewports: 1440, 1280, 1024, 768, 390, 320
- 32 screenshots
- 2 failures
- 3 console errors
- 0 network failures
- 1 expected denied console entry from a deliberate 400 safety probe

## Verification

- `make live-dam-surface-guard` — pass.
- `make live-dam-surface-guard-test` — pass.
- `make ui-maturity-guard` — pass.
- `make portal-api-smoke` — pass against local production-mode server after Cloudflare-style trusted-header harness update.
- `./scripts/portal-beta-invite-smoke.sh` — pass.
- `BASE_URL=http://localhost:4871 ./scripts/portal-download-ticket-smoke.sh` — fail in production-mode local server: required download audit cannot persist without durable runtime store, returns `503 audit-required`. Earlier dev-mode rerun passed after clean dev-server restart.
- `BASE_URL=http://localhost:4871 PORTAL_QA_TRUSTED_HEADERS=1 node scripts/portal-browser-qa.mjs` — fail in production-mode local server: 20 pages / 6 viewports / 32 screenshots, 2 failures, 3 console errors, 0 network failures.
- `make small-team-beta-readiness-guard` — expected fail while latest browser QA report is red.
- `make small-team-beta-readiness-guard-test` — pass.
- `BASE_URL=https://tjc-stock-media.vercel.app HOSTED_READONLY_PROBE_OUTPUT=docs/runs/evidence/2026-06-17/hosted-readonly-probes/summary.json node scripts/portal-hosted-readonly-probe.mjs` — pass. Read-only hosted protection proof only; no POST, hosted writeback, env mutation, raw bodies, or headers stored.
- `curl -sS http://localhost:4871/api/beta-auth/session` during local dev — pass; payload exposes non-secret build `readinessContract: small-team-beta-readiness-2026-06-17`, route surface home `EnterpriseLibraryPage`, and upload `EnterpriseUploadPage`.
- `make team-beta-signoff-guard` — pass, current signoff remains NO-GO.
- `make team-beta-signoff-guard-test` — pass.
- `bash -n scripts/launch-readiness.sh` — pass after updating stale June 15 packet wording expectations.
- `node --check scripts/evidence-packet-guard.mjs scripts/team-beta-signoff-guard-test.mjs scripts/small-team-beta-readiness-guard.mjs scripts/small-team-beta-readiness-guard-test.mjs` — pass.
- `node scripts/evidence-packet-guard.mjs` — fail only on historical June 15 freshness/open-blocker/prd stamp requirements after current packet wording was aligned to June 17. `prd.json` was not touched.
- `npm run typecheck` from `frontend/` — pass.
- `npm test -- build-info.test.ts beta-auth.test.ts` from `frontend/` — pass, 2 files / 10 tests.
- `npm test` from `frontend/` — pass, 16 files / 134 tests.
- `npm run build` from `frontend/` — pass.
- `make safe-lane-guard` — fail due historical isolated worktree/branch/evidence requirements only.
- `make runtime-isolation-guard` — fail due same historical isolated worktree/evidence requirements only.

## Files Changed

App/runtime:

- `frontend/app/page.tsx`
- `frontend/app/upload/page.tsx`
- `frontend/app/dam-enterprise.css`
- `frontend/components/dam/enterprise/RequestsPage.tsx`
- `frontend/components/dam/shell/damShellNav.ts`
- `frontend/lib/dam/enterprise-route-surface.json`
- `frontend/lib/dam/enterprise-route-surface.ts`
- `frontend/lib/permissions.ts`
- `frontend/lib/request-identity.ts`
- `frontend/lib/portal-reuse-decision.ts`
- `frontend/lib/media-delivery.ts`
- `frontend/lib/beta-auth.ts`
- `frontend/lib/build-info.ts`
- `frontend/lib/dam-readiness-integrations.ts`

Tests/scripts:

- `frontend/lib/beta-auth.test.ts`
- `frontend/lib/build-info.test.ts`
- `frontend/lib/production-hardening.test.ts`
- `scripts/live-dam-surface-guard.mjs`
- `scripts/live-dam-surface-guard-test.mjs`
- `scripts/ui-maturity-guard.mjs`
- `scripts/portal-api-smoke.sh`
- `scripts/portal-browser-qa.mjs`
- `scripts/portal-download-ticket-smoke.sh`
- `scripts/portal-hosted-readonly-probe.mjs`
- `scripts/portal-beta-invite-smoke.sh`
- `scripts/small-team-beta-readiness-guard.mjs`
- `scripts/small-team-beta-readiness-guard-test.mjs`
- `scripts/launch-readiness.sh`
- `scripts/evidence-packet-guard.mjs`
- `scripts/team-beta-signoff-guard-test.mjs`
- `Makefile`

Docs/evidence:

- `docs/small-team-beta-operations-runbook.md`
- `docs/joanna-mini-beta-runbook.md`
- `docs/joanna-mini-beta-readiness-report.md`
- `docs/team-beta-internal-test-packet.md`
- `docs/team-beta-go-no-go-packet.md`
- `docs/team-beta-signoff-record.md`
- `docs/runs/evidence/2026-06-17/small-team-beta-readiness-pass.md`
- `docs/runs/evidence/2026-06-17/open-blockers.json`
- `docs/runs/evidence/2026-06-17/hosted-readonly-probes/summary.json`
- `docs/runs/evidence/2026-06-17/enterprise-dam-10h-autonomous-architecture-pass.md`
- `docs/screenshots/qa/browser-qa-report.json`
- Browser QA screenshots under `docs/screenshots/` and `docs/screenshots/primitive-proof/`

Pre-existing dirty/unrelated files noted and not intentionally edited by this pass:

- `AGENTS.md`
- `.superpowers/`
- `docs/runs/evidence/2026-06-15/hosted-readonly-probes/summary.json`

## Team Beta Packet

- Access and invite-code operations: `docs/small-team-beta-operations-runbook.md`
- Tester script: `docs/team-beta-internal-test-packet.md`
- Viewer/Contributor/Reviewer/Admin guidance: `docs/team-beta-internal-test-packet.md`
- Upload guide: `docs/joanna-mini-beta-upload-guide.md`
- Reviewer guide: `docs/reviewer-guide.md`
- Known limitations and command center: `docs/beta-readiness-command-center.md`
- Feedback and incident reporting: `docs/team-beta-feedback-incident-runbook.md`

This packet is suitable for local/internal rehearsal. It is not enough for real team beta until hosted/current access, real login/invite setup, real content, and hosted persistence are proven.

## PR / Merge Safety

### Scope Boundary

Small-team beta readiness only. Not public launch, not hosted-production proof, not production SSO proof, not durable hosted runtime proof.

### Reviewer Checklist

- Confirm `/` and `/library` land on Enterprise Library.
- Confirm `/upload` uses Enterprise Upload/intake.
- Confirm Admin readiness shows invite-code count/status only.
- Confirm no raw invite codes appear in committed files, screenshots, docs, reports, logs, or script output.
- Confirm Viewer cannot fetch blocked thumbnails or original/source/download-grade media.
- Confirm Reviewer/Admin can inspect review assets.
- Confirm download tickets are one-time use.
- Confirm browser QA remains green locally.
- Confirm hosted/current URL and real login path before sending invites.

### Risk Note

Hosted URL, real team auth, real content counts, and hosted runtime persistence remain unproven. Browser QA is local-only and trusted-header based.

### Rollback Plan

1. Revert Enterprise route manifest wiring if route/nav behavior regresses.
2. Revert `/` to the prior home surface only if beta owners decide Library should not be default.
3. Revert invite readiness row and invite smoke independently if diagnostics cause deployment trouble.
4. Keep safety tests in place if any app code is reverted.

### Follow-Up Issues

- Verify hosted protected URL is current.
- Convert hosted protection from read-only partial proof to current deployment proof.
- Prove hosted `/api/beta-auth/session` exposes `build.readinessContract=small-team-beta-readiness-2026-06-17` after deployment/currentness evidence exists.
- Configure real beta persona passwords and church/location invite codes outside Git.
- Prove real 181 approved photos plus remaining pending/unapproved content.
- Prove durable hosted runtime storage for feedback, audit, review decisions, upload intake, and download tickets.
- Decide whether safe-lane/runtime guards should be updated for current canonical branch/worktree or run only in the historical isolated worktree.

## Remaining Limitations

- Hosted protected URL read-only access protection was tested, but current deployment/version was not proven.
- Real login/invite-code flow was not tested without trusted headers.
- Real expected media counts were not proven.
- Hosted/runtime persistence was not proven.
- ResourceSpace writeback remains intentionally disabled/unproven.
- Local smoke fixtures prove harness behavior, not hosted beta content.

## Machine-Readable Open Blockers

Current blocker matrix: `docs/runs/evidence/2026-06-17/open-blockers.json`

- `hosted-protected-url-current` — partial; read-only access protection passed, deployment currentness remains unproven.
- Local build currentness contract is ready at `/api/beta-auth/session`; hosted session still reports `buildContract: null`, so hosted currentness remains unproven.
- `real-beta-auth-and-invite-codes` — blocked.
- `real-content-counts` — blocked.
- `durable-hosted-runtime-state` — blocked.
- `owner-signoff-and-tester-packet` — blocked.
- `historical-guard-freshness` — partial; do not touch `prd.json` or historical evidence only to make stale guards green.
