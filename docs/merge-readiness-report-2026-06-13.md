# TJC Stock Media Merge Readiness Report - 2026-06-13

## Operating rule

This weekend is not for making the app bigger; it is for making the beta safer, clearer, more testable, more recoverable, and more honest.

No merge, deploy, production env change, hosted mutating smoke, beta expansion, live ResourceSpace writeback, source media mutation, broad architecture rewrite, or unrelated dirty-file staging is approved by this report.

## Current repo state

Recorded from `/Users/halim4pro/Desktop/MVP/tjc-stock-media` on 2026-06-13.

Current branch:

```text
premium-ui/tjc-enterprise-dam-workbench
```

Recent commits:

```text
ca18451 fix: unblock hosted beta smoke diagnostics
f6afda4 Prepare TJC mature DAM internal beta release
d95e8f1 chore: allow beta evidence screenshots in hygiene guard
130c974 docs: add team beta feedback backlog
490558e docs: document ResourceSpace free-tier runbook
98d4ed5 docs: refresh internal beta evidence screenshots
050bba1 feat: refine DAM shell and role-aware sidebar
9e91eee test: support beta-session hosted smoke
c961ffa feat: add internal beta login gate
2db3d2a docs: prepare internal DAM beta handoff
```

Local and remote branch inventory:

```text
codex/dam-native-ui-rebuild
codex/dam-total-ui-rebuild
codex/dam-ui-polish-rail
codex/dam-v2-enterprise-ui-system
codex/enterprise-dam-viewer-redesign
codex/hosted-beta-unblocker
codex/industry-dam-ui-rebuild
codex/pr5-safety-fix
codex/t2-session-auth-download-gate
codex/t3-trust-presenters-ui
codex/tjc-stock-media-portal
enterprise-dam-ui
goal/dam-workbench-v2-redesign
hardening/all-a-production-readiness
hardening/weekend-frontend-ux-p0p1
hardening/weekend-media-delivery-p1
hardening/weekend-security-privacy-review
hardening/weekend-truth-scope-fixture-p1
main
premium-ui/tjc-enterprise-dam-workbench
remotes/haliddd/HEAD -> haliddd/main
remotes/haliddd/codex/dam-ui-polish-rail
remotes/haliddd/codex/hosted-beta-unblocker
remotes/haliddd/goal/dam-workbench-v2-redesign
remotes/haliddd/hardening/all-a-production-readiness
remotes/haliddd/main
remotes/origin/HEAD -> origin/enterprise-dam-ui
remotes/origin/codex/dam-v2-enterprise-ui-system
remotes/origin/codex/enterprise-dam-viewer-redesign
remotes/origin/codex/industry-dam-ui-rebuild
remotes/origin/codex/tjc-stock-media-portal
remotes/origin/enterprise-dam-ui
remotes/origin/goal/dam-workbench-v2-redesign
remotes/origin/main
```

Current dirty state:

```text
 M AGENTS.md
 M docs/admin-runbook.md
 M docs/backup-restore-runbook.md
 M docs/production-runbook.md
 M docs/team-beta-feedback-backlog-2026-06-13.md
 M frontend/app/dam-enterprise.css
 M frontend/app/insights/page.tsx
 M frontend/components/UploadPage.tsx
 M frontend/components/dam/enterprise/AdminPage.tsx
 M frontend/components/dam/enterprise/AssetDetailPage.tsx
 M frontend/components/dam/enterprise/EnterpriseShared.tsx
 M frontend/components/dam/enterprise/InsightsPage.tsx
 M frontend/components/dam/enterprise/LibraryPage.tsx
 M frontend/components/dam/enterprise/PackageBuilderPage.tsx
 M frontend/components/dam/enterprise/ReviewPage.tsx
 M frontend/components/dam/shell/DamCommandHeader.tsx
 M frontend/components/dam/shell/DamShell.tsx
 M frontend/components/dam/shell/damShellNav.ts
 M frontend/lib/asset-record-workbench.ts
 M frontend/lib/intake-routing.ts
 M frontend/lib/media-delivery.ts
 M frontend/lib/package-governance.ts
 M frontend/lib/portal-context-presenters.ts
 M frontend/lib/upload-intake.ts
 M frontend/middleware.ts
?? docs/merge-readiness-report-2026-06-13.md
?? docs/photo-only-hosted-resourcespace-runbook.md
?? docs/premium-enterprise-ui-backlog.md
?? docs/smart-rules-policy.md
?? docs/tagging-taxonomy-policy.md
?? docs/weekend-beta-to-launch-report-2026-06-13.md
?? docs/youtube-transcriptions/README.md
?? tasks/prd-mature-dam-governance-roadmap.md
```

Note: hardening branch refs `hardening/weekend-security-privacy-review`, `hardening/weekend-frontend-ux-p0p1`, `hardening/weekend-media-delivery-p1`, and `hardening/weekend-truth-scope-fixture-p1` all resolve to `ca18451`. Their QA evidence comes from completed Codex thread reports, not from currently reliable live branch diffs. Old Codex worktrees for those threads are not usable as git worktrees. Reconstruct each code PR on a clean branch before opening or merging.

## Branch inventory and disposition

| Workstream | Branch | Purpose | Files touched | Type | QA already reported | Missing QA before PR/merge | Merge risk | Dependencies | Disposition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Docs/runbook/policy pass | Current dirty docs on `premium-ui/tjc-enterprise-dam-workbench`; should be split to clean docs branch | Weekend beta launch report, photo-only ResourceSpace runbook, taxonomy policy, smart rules policy, premium UI backlog, feedback backlog, admin/production/backup runbook updates, this merge-readiness report | `docs/weekend-beta-to-launch-report-2026-06-13.md`, `docs/photo-only-hosted-resourcespace-runbook.md`, `docs/tagging-taxonomy-policy.md`, `docs/smart-rules-policy.md`, `docs/premium-enterprise-ui-backlog.md`, `docs/team-beta-feedback-backlog-2026-06-13.md`, `docs/admin-runbook.md`, `docs/production-runbook.md`, `docs/backup-restore-runbook.md`, `docs/merge-readiness-report-2026-06-13.md` | Docs only | Docs pass completed by orchestrator threads; no hosted mutation run | `git diff --check`; full required local suite if PR policy requires it | Low if narrow path-based staging is used | None | PR now, docs-only, with narrow path adds |
| SEC-002 beta login throttling | `hardening/weekend-security-privacy-review` | Throttle beta login attempts and keep beta auth safer | `frontend/app/api/beta-auth/login/route.ts`, `frontend/lib/beta-login-throttle.ts`, `frontend/lib/beta-auth.test.ts`, `frontend/lib/beta-auth.ts` | Code | Scoped SEC-002 QA reported passed: focused tests 12/12, build, post-build typecheck, guard scripts. Launch-readiness red in contaminated worktree due inherited Brand Hub guard. | Reconstruct on clean branch; rerun full required suite; add or backlog direct KV throttle storage failure test; run relevant local auth/API smokes | High until clean branch exists, because auth/security code and branch ref lacks live diff | Frontend guard may be needed first if `make launch-readiness` still blocks on Brand Hub; docs PR should land first | PR after docs only if isolated and QA-passed again |
| Frontend guard | `hardening/weekend-frontend-ux-p0p1` | Keep Brand Hub from visible beta launch surface; guard `/brand-hub` redirect expectation | `scripts/live-dam-surface-guard.mjs`, `scripts/portal-browser-qa.mjs` | Code/scripts | Reported passed: typecheck, build, guards, launch-readiness, targeted redirect proof. Full browser QA had local role/setup caveat. | Reconstruct on clean branch; rerun required suite; run `portal-browser-qa` if UI behavior is validated | Low to moderate; scripts only but can affect release gate | Should land before other code PR validation if launch-readiness fails without it | PR now or immediately after docs if still needed to unblock launch-readiness |
| Truth/scope/fixture | `hardening/weekend-truth-scope-fixture-p1` | Ensure Viewer/Contributor do not see `demo-fallback` rows and normal roles stay photo-only; tighten source truth fixture behavior | `frontend/lib/catalog-scope.ts`, `frontend/lib/catalog.ts`, `frontend/lib/media-source/session.ts`, `frontend/app/api/assets/[id]/route.ts`, `frontend/app/api/assets/thumbnail/[id]/route.ts`, `frontend/app/api/download/[id]/route.ts`, `frontend/app/api/review-request/route.ts`, `frontend/lib/asset-selection.ts`, `frontend/lib/production-hardening.test.ts`, `scripts/tag-search-static-smoke.mjs` | Code | Reported passed: tests 43/43, typecheck, build, guards, launch-readiness with 0 failures and 3 warnings | Reconstruct on clean branch; rerun full required suite; run local API/download/writeback/package smokes | Moderate to high because it touches catalog/API/download boundaries | Prefer after docs and after any launch-readiness guard needed for clean validation | PR after SEC-002 or before media delivery if no conflicts |
| Media delivery | `hardening/weekend-media-delivery-p1` | Prevent hosted/prod `demo-fallback` approved-copy bytes from being mintable/downloadable | `frontend/lib/media-delivery.ts`, `frontend/lib/media-delivery.test.ts`, `scripts/storage-honesty-guard.mjs` | Code | Reported passed: focused tests 3/3, typecheck, build, guards. Launch-readiness failed only from unrelated Brand Hub guard before frontend guard branch. | Reconstruct on clean branch; rerun full required suite; run local download-ticket and storage honesty smokes | Moderate to high because it touches delivery/download safety | Should follow truth/scope/fixture if both touch delivery assumptions; frontend guard may be needed first for launch-readiness | PR after truth/scope/fixture if no security regression |
| Premium UI implementation | `premium-ui/tjc-enterprise-dam-workbench` | Enterprise DAM workbench UI and current broad local edits | Dirty app files include `frontend/app/dam-enterprise.css`, `frontend/app/insights/page.tsx`, `frontend/components/UploadPage.tsx`, `frontend/components/dam/enterprise/*`, `frontend/components/dam/shell/*`, `frontend/lib/asset-record-workbench.ts`, `frontend/lib/intake-routing.ts`, `frontend/lib/media-delivery.ts`, `frontend/lib/package-governance.ts`, `frontend/lib/portal-context-presenters.ts`, `frontend/lib/upload-intake.ts`, `frontend/middleware.ts` | Code and docs mixed in current worktree | No current merge-ready QA for dirty worktree in this report | Full rebuild of clean branch, full required suite, browser QA at 320/390/desktop, security review, conflict review with safety branches | High; broad UI and middleware overlap, includes unrelated dirty files | Must wait for safety PRs to settle | Hold |
| Premium UI polish rail | `codex/dam-ui-polish-rail` | Separate clean worktree with committed UI polish/refactor stack | Broad diff versus `main`, including UI pages, DAM shell, API, guards, docs, package files, and safety helper refactors | Code and docs | Clean worktree observed; branch log shows UI polish and safety refactor commits. No current QA acceptance recorded in this report. | Full branch QA and security review after safety PRs land | High due broad surface and likely conflicts with current premium UI and safety hardening | Depends on safety PRs and dirty-file arbitration | Hold for later |

## Recommended PR sequence

### PR 1 - Docs/runbooks/policies only

Open first. Use a clean branch from `main` or current accepted base. Stage only the docs paths listed below, using narrow path-based adds:

```text
docs/weekend-beta-to-launch-report-2026-06-13.md
docs/photo-only-hosted-resourcespace-runbook.md
docs/tagging-taxonomy-policy.md
docs/smart-rules-policy.md
docs/premium-enterprise-ui-backlog.md
docs/team-beta-feedback-backlog-2026-06-13.md
docs/admin-runbook.md
docs/production-runbook.md
docs/backup-restore-runbook.md
docs/merge-readiness-report-2026-06-13.md
```

Do not include `AGENTS.md`, `docs/youtube-transcriptions/`, app UI files, media files, env files, runtime files, or `tasks/prd-mature-dam-governance-roadmap.md`.

Required PR statement: docs only; no code, no env, no deploy, no hosted mutating smoke, no beta widening, no ResourceSpace writeback.

### PR 2 - SEC-002 beta login throttling

Open only after a clean branch is reconstructed and scoped QA passes again. Keep SEC-002 isolated from other security changes unless a human approves a broader security bundle.

Recommended files:

```text
frontend/app/api/beta-auth/login/route.ts
frontend/lib/beta-login-throttle.ts
frontend/lib/beta-auth.test.ts
frontend/lib/beta-auth.ts
```

If feedback attachment disablement, hosted KV fail-closed behavior, or explicit hosted `BETA_SESSION_SECRET` enforcement are still pending from the security thread, split them into a separate security PR or clearly scope them inside PR 2 with fresh QA evidence.

### PR 3 - Truth/scope/fixture

Open after PR 2, unless conflict review shows it should precede SEC-002. This PR touches source truth and role-visible fixture behavior, so keep it tightly reviewed.

Required safety assertions:

- Viewer/Contributor see no source/original/master/admin/checksum/private/signed URL details.
- Viewer/Contributor do not receive `demo-fallback` rows in hosted/prod truth mode.
- Normal roles remain photo-only.
- Queued review/writeback is not represented as synced.

### PR 4 - Media delivery

Open after PR 3 if no overlap regression exists. This PR protects derivative delivery and download minting behavior.

Required safety assertions:

- Hosted/prod `demo-fallback` approved-copy bytes are not mintable or downloadable.
- Download tickets do not expose backend storage URLs.
- Non-portal-ready, blocked, archive-only, Needs Review, Possible Minors, Do Not Use, or review-pending media cannot download.

### PR 5 - Frontend guard, if still needed

Requested nominal position is PR 5. Orchestrator adjustment: if `make launch-readiness` fails on Brand Hub exposure before PR 5, move this to immediately after PR 1 so later code PRs can be validated against the same launch-readiness gate.

Required safety assertions:

- Brand Hub is not visible as a beta launch surface.
- `/brand-hub` redirect or guard behavior is documented by test evidence.
- Guard scripts do not hide blockers or make beta appear production-ready.

### PR 6 - Premium UI implementation later

Hold until safety PRs are merged and verified. Premium UI is broad and should not ride with launch hardening.

Requirements before any premium UI PR:

- Clean branch with no docs/runbook/policy leftovers unless intentionally scoped.
- Full local required suite.
- Local browser QA at 320 px, 390 px, and desktop.
- Security review for source redaction, download gates, package governance, and role surfaces.
- Explicit conflict review against SEC-002, truth/scope, media delivery, and frontend guard.

## Required checks

Run for every PR before requesting review:

```bash
git diff --check
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
node scripts/private-source-guard.mjs
node scripts/public-env-guard.mjs
node scripts/api-identity-guard.mjs
node scripts/api-payload-guard.mjs
node scripts/api-audit-guard.mjs
node scripts/storage-honesty-guard.mjs
node scripts/git-hygiene-guard.mjs
make launch-readiness
```

Add these local smokes for code PRs touching delivery, auth, source truth, review, packages, or feedback:

```bash
BASE_URL=http://localhost:4868 make portal-api-smoke
BASE_URL=http://localhost:4868 make portal-feedback-smoke
BASE_URL=http://localhost:4868 make portal-download-ticket-smoke
BASE_URL=http://localhost:4868 make portal-writeback-guard-smoke
BASE_URL=http://localhost:4868 make portal-package-smoke
```

Add this when UI or route visibility changes:

```bash
BASE_URL=http://localhost:4868 make portal-browser-qa
```

Do not run these hosted checks without explicit human approval:

```bash
BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-smoke
BASE_URL=https://tjc-stock-media.vercel.app make portal-writeback-guard-smoke
```

Reason: hosted smoke can mutate beta feedback storage or review/pending-write evidence.

## Unresolved blockers

| Blocker | Severity | Owner | Required next action |
| --- | --- | --- | --- |
| Hardening branch refs all resolve to `ca18451`, so live branch diffs are not trustworthy | P1 release process | Orchestrator plus branch owners | Reconstruct each PR on a clean branch from thread diff/evidence; rerun checks before PR |
| Existing dirty worktree mixes docs, app UI, protected files, and premium UI edits | P1 release process | Orchestrator plus human owner | Stage only scoped PR paths; do not use `git add -A`; keep unrelated dirty files untouched |
| Hosted evidence is not current after safety branch reconstruction | P1 launch readiness | QA / Release plus human owner | Use local smokes first; request explicit approval before any hosted mutating smoke |
| SEC-002 lacks direct KV throttle storage failure test in current evidence | P2 unless fail-open behavior found | Security / QA | Add targeted test or record as backlog before merge decision |
| Production launch requirements remain unproven | P0 for wider launch | Human owner | Prove SSO/origin protection, durable storage, ResourceSpace writeback, derivative delivery, rights/media review, backup/restore, and real DAM gates |

## Dirty-file arbitration

Do not stage or include:

```text
AGENTS.md
docs/youtube-transcriptions/
tasks/prd-mature-dam-governance-roadmap.md
frontend/app/dam-enterprise.css
frontend/app/insights/page.tsx
frontend/components/UploadPage.tsx
frontend/components/dam/enterprise/
frontend/components/dam/shell/
frontend/lib/asset-record-workbench.ts
frontend/lib/intake-routing.ts
frontend/lib/media-delivery.ts
frontend/lib/package-governance.ts
frontend/lib/portal-context-presenters.ts
frontend/lib/upload-intake.ts
frontend/middleware.ts
```

Exception: `frontend/lib/media-delivery.ts` may belong to the media delivery PR only after a clean branch reconstruction proves the exact intended diff. It must not be staged from the current mixed premium UI worktree.

Docs-only PR may include only the listed docs paths and this report. `docs/youtube-transcriptions/README.md` remains unrelated unless a human confirms launch-useful and safe.

## Human approval required

Human approval is required before:

- Merging any PR.
- Deploying any branch.
- Running hosted mutating smokes.
- Changing Vercel, Upstash, Blob, ResourceSpace, Cloudflare, Google Drive, DNS, billing, or env settings.
- Widening beta invites.
- Enabling live ResourceSpace writeback.
- Enabling production query-role trust.
- Enabling public share/CDN/original behavior.
- Including `AGENTS.md`, `docs/youtube-transcriptions/`, `tasks/prd-mature-dam-governance-roadmap.md`, runtime data, media files, env files, source exports, or unsafe screenshots in any PR.
- Combining premium UI work with safety hardening.

## Final beta recommendation

HOLD NEXT BATCH.

Tiny internal beta may continue only for already named testers while safety boundaries hold, P0/P1 remain zero, feedback works, and no hosted smoke fails after changes.

Wider church rollout and production/internal launch remain NO-GO until production SSO/origin protection, durable storage, live ResourceSpace writeback proof, production derivative delivery, full rights/media review, church-host backup/restore, and real DAM workflow gates are proven by humans and current production evidence.
