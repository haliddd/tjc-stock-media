# Joanna Mini Beta Readiness Report

Date: 2026-06-17

## Final Decision

Current state is small-team beta not ready. Production-mode local browser QA is red on approved/unsafe download safety probes because audit writes fail closed without durable runtime state. For this recovery pass, the conservative hosted behavior is to keep approved-copy downloads intentionally fail-closed for Joanna unless Hali separately approves and proves durable audit/ticket storage. Current code adds a sanitized 181-record MVP 2024 LM Photos beta snapshot for hosted fallback, but it is not Joanna/team beta ready until the stable hosted URL is redeployed/probed with that snapshot, hosted runtime persistence or fail-closed instructions are proven, and owner signoff is renewed. The formal final decision is the last line of this report.

Latest local evidence: `docs/runs/evidence/2026-06-17/small-team-beta-readiness-pass.md`.

## Hosted URL Status

- Candidate URL: `https://tjc-stock-media.vercel.app`
- Historical hosted read-only probe: PASS at `2026-06-16T19:27:18.842Z`.
- June 17 hosted read-only probe: PASS at `2026-06-17T19:29:57.070Z` for anonymous/query-role protection only.
- June 17 `/api/beta-auth/session` probe: FAIL current-build proof. Stable URL returned 401 unauthenticated session JSON without the expected `build.readinessContract` marker.
- June 17 16:04 EDT update: PASS current-build proof after Vercel production deployment `dpl_DSakz1GSaViJGeyBxVwAwB9HkFND`. Stable URL `/api/beta-auth/session` exposes `small-team-beta-readiness-2026-06-17`, commit `63474a70e930`, and Enterprise route surface.
- June 17 16:04 EDT update: PASS real beta-session smoke for Viewer, Contributor, Reviewer, and DAM Admin using private Vercel env credentials plus church/location invite code. Values are kept out of Git/docs/logs/chat; local owner handoff is `.runtime/beta-credentials-2026-06-17.env`.
- Anonymous/query-role access redirects to beta login or returns unauthenticated session state.
- Hosted mutating tests were not run because Hali approval is required.
- Hali approved hosted proof work after the first recovery update; hosted feedback smoke was run with explicit approval flag.
- Hosted URL is now proven current for June 17+ route-surface, invite-readiness, and download-ticket fail-closed hardening.

## Accounts And Roles

No passwords or real credentials were created or committed.

Prepared role paths:

- Viewer: browse/search/detail.
- Contributor: upload/intake, no review/admin.
- Reviewer/Joanna: review queue and metadata decisions.
- Admin: readiness/status only, no secrets.

## Files Changed For This Run

- `docs/specs/2026-06-16-joanna-testable-mini-beta-execution-plan.md`
- `docs/runs/beta-meeting-2026-06-16/joanna-mini-beta-baseline.md`
- `docs/runs/beta-meeting-2026-06-16/joanna-mini-beta-hosting-decision.md`
- `docs/runs/beta-meeting-2026-06-16/joanna-mini-beta-sample-manifest.md`
- `docs/joanna-mini-beta-access-instructions.md`
- `docs/joanna-mini-beta-content-policy.md`
- `docs/joanna-mini-beta-upload-guide.md`
- `docs/joanna-mini-beta-test-script.md`
- `docs/joanna-mini-beta-runbook.md`
- `docs/joanna-mini-beta-readiness-report.md`
- `docs/metadata-schema.md`
- `frontend/lib/upload-intake.ts`
- `frontend/components/UploadPage.tsx`
- `frontend/components/GatedDownloadButton.tsx`
- `frontend/components/dam/useDamApi.ts`
- `frontend/components/dam/enterprise/AssetDetailPage.tsx`
- `frontend/components/dam/enterprise/DashboardPage.tsx`
- `frontend/lib/beta-auth.ts`
- `frontend/app/api/assets/thumbnail/[id]/route.ts`
- `frontend/lib/media-source/index.ts`
- `frontend/lib/portal-reuse-decision.ts`
- `frontend/next.config.mjs`
- `scripts/portal-api-smoke.sh`
- `scripts/portal-download-ticket-smoke.sh`
- `docs/runs/beta-meeting-2026-06-16/joanna-mini-beta-ui-download-triage.md`

Worktree had many unrelated dirty files before this run. They were not reverted.

## Passing Checks

- `rg -n "Joanna-testable|mini beta|not a public launch" docs/specs docs/runs/beta-meeting-2026-06-16`: PASS.
- `npm --prefix frontend test`: PASS, 12 files / 110 tests.
- `npm --prefix frontend run build`: PASS clean after Next server chunk output was pinned to `server/chunks/`.
- `npm --prefix frontend run typecheck`: PASS after build settled. One parallel run failed because build cleanup removed `.next/types` while typecheck was reading it.
- `git diff --check`: PASS.
- `node scripts/api-payload-guard.mjs`: PASS.
- `node scripts/api-audit-guard.mjs`: PASS.
- `node scripts/storage-honesty-guard.mjs`: PASS.
- `make launch-readiness`: PASS with `failures=0`, `warnings=1`; remaining warning is `.env` placeholder values.
- `make backup`: PASS, wrote `.runtime/backups/20260617-201323`; database dump skipped because Docker daemon was unavailable.
- `make restore-test`: PASS for archive restore; database dump not present in latest backup.
- `BASE_URL=http://localhost:4869 make portal-api-smoke`: PASS.
- `BASE_URL=http://localhost:4869 make portal-beta-rehearsal`: PASS.
- `BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe`: PASS for read-only protection only.
- `BASE_URL=http://127.0.0.1:4867 make portal-download-ticket-smoke`: PASS.
- Vercel production deploy: PASS. Stable alias `https://tjc-stock-media.vercel.app` now points to deployment `dpl_46AGWyuAmR99SLGMnqqv8BdNFWUi` / `https://tjc-stock-media-kvy0s5jvn-hali-s-projects1.vercel.app`, created 2026-06-16 18:55 EDT.
- Hosted anonymous protection: PASS. Root redirects to beta login; query-role API probes do not expose privileged JSON or secret/source fields.
- Manual local dev download proof: `POST /api/download/367?role=Viewer` with accepted terms returned ticket; one ticketed `GET` returned `200 image/jpeg`; original/master request returned `403 original-request-only`.
- Production local read proof at `http://127.0.0.1:4869`: Reviewer search returned `total: 2061`, first 120 were `Approved Public`, and details for asset `367` showed `rightsStatus: Rights approved`, `rightsBasis: TJC-owned`, no exposed `imageUrls.download`, no source path/checksum.

## Failing Or Limited Checks

- June 17 production-mode local browser QA is red: 2 failures and 3 console errors in `docs/screenshots/qa/browser-qa-report.json`, both tied to download audit writes failing closed with `503 audit-required`.
- June 17 local invite smoke is green with placeholder codes, but real invite codes were not created or tested.
- June 17 local content proof used local/export-backed data and fixtures. Current code now adds a sanitized `bundled-beta-catalog` fallback with 181 MVP 2024 LM Photos records and no source paths/checksums, but stable hosted count proof still needs redeploy/probe evidence.
- Historical hosted content proof remains superseded but unresolved on the stable URL until redeploy: Reviewer search returned `sourceAdapter: demo-fallback`, `rawTotal: 16`, `approvedRaw: 12`, `needsReview: 2`, `archive: 1`, and `portalReady: 1`.
- Hosted runtime persistence is partial: feedback POST/Admin visibility passed, blocked download failed closed with `503 audit-required`, and no source/original/private/checksum leak was found. Hosted upload intake and review decision persistence were not separately proven against real beta content.

- First Vercel deploy attempt failed before release because local artifacts/deps were included in the upload. `.vercelignore` now excludes local build/dependency/runtime/media artifacts; retry succeeded.
- One Vercel build attempt failed before release because local-only safe-lane disk guard expected a git checkout. The guard now skips only in `VERCEL=1`; local guard self-test passes.
- `BASE_URL=http://127.0.0.1:4869` production-mode download POST/GET fails closed with `503 audit-required` because required audit/ticket writes are blocked without durable runtime storage. This is safe, but hosted production needs a durable runtime store before download can work there.
- `BASE_URL=http://localhost:4869 make portal-browser-qa`: FAIL after producing 20-page / 6-viewport report. Main failures: clipped collection/package/request controls, normal-user detail copy flagged for operational phrases, viewer upload block expectation mismatch, broken preview images for some thumbnails.
- Hosted authenticated role-path proof remains blocked until Hali provides usable Viewer/Contributor/Reviewer/Admin credentials and real invite codes privately, or confirms Hali will test those roles first. No hosted upload/review/download mutation was run.

## What Joanna Can Test

- Open hosted beta login page after Hali confirms the stable URL exposes the June 17+ build marker and provides credentials privately.
- Browse photo library with LM Photos records mostly public-facing.
- Search sample photos by Bible, worship, fellowship, flowers, and related terms.
- Open asset detail and inspect review/rights context.
- Submit photo-only upload/intake with minimal required metadata.
- Open review queue locally/proven by rehearsal.
- Approve only with evidence, reject, archive, or flag rights issues.
- Test status filters using the deterministic 10% holdout across Approved Internal, Needs Review, Searchable Archive, Possible Minors, and Do Not Use.
- Test local approved-copy download workflow if using local dev server; hosted production download remains intentionally blocked for Joanna unless durable audit/ticket storage is configured and proven.
- Give feedback on fields, upload friction, categories, rights uncertainty, and search quality.

## Known Limitations

- June 17 final call is local-only. Do not invite Joanna or team testers until the stable hosted URL is redeployed/probed with the 181-record beta snapshot and owner gates are proven.
- Hosted reviewer/admin login was not exercised because usable persona credentials were not available to this run.
- Hosted mutating upload/review was not run.
- Hosted deployment has the newest deploy-package/build fixes and LM Photos runtime overlay code from this working tree, but it is a Vercel CLI deploy of a dirty worktree rather than a clean Git commit deployment.
- All current LM Photos assets are treated as TJC-owned and public-ready by a runtime-only overlay. About 90% are `Approved Public`; about 10% are intentionally left across other statuses for test rounds.
- ResourceSpace export/API was unavailable in June 16 count report; current code falls back to a sanitized 181-record bundled beta snapshot before demo data when hosted export/API are unavailable.
- Review decisions are queued/pending portal evidence, not live ResourceSpace truth.
- Original/source download remains blocked for normal roles.
- Approved derivative download works locally in dev with audit/ticket storage; hosted production download fails closed until durable audit/ticket storage exists.
- Browser QA shows UI overflow/copy issues that should be fixed before a broader team beta.
- Hosted durable storage remains unproven. Local archive backup/restore passed, but database backup/restore remains unproven because Docker/MariaDB was unavailable.

Final decision: Small-team beta not ready; hosted/team beta NO-GO until the stable hosted URL is redeployed/probed with the 181-record bundled beta snapshot, hosted upload/review persistence boundaries or fail-closed instructions are documented, and owner signoff is renewed.

## Risk Owners

- Hosted env and persona credentials: Hali / deployment owner.
- Content policy and rights review: Joanna as reviewer/content manager, Hali for approval boundaries.
- ResourceSpace/export restoration: DAM technical owner.
- UI/browser QA fixes: implementation owner.
- Durable hosted state and backup/restore: app admin / Hali.

## Intentionally Out Of Scope

- Public launch.
- Broad internal or six-person beta.
- Full archive import.
- Video/audio import.
- DNS changes.
- Paid hosting or cloud upgrades.
- Live ResourceSpace writeback.
- Source media mutation.
- Production/prd data mutation.

## Hali Decisions Needed

- Use `.runtime/beta-credentials-2026-06-17.env` for private owner handoff or rotate credentials in Vercel before sharing with Joanna.
- Configure real hosted content source, or explicitly decide Joanna is testing demo-fallback workflow only.
- Confirm conservative recovery default: keep hosted downloads blocked for this Joanna round, or override it by configuring durable hosted runtime storage for audit/tickets and proving hosted download-ticket smoke.
- Decide whether browser QA overflow/copy failures must block Joanna or can wait until after her content feedback.

Current owner-ready answer: NO-GO for Joanna/team invite until the hosted 181-record beta snapshot and no-download/queued-review boundary are proven on the stable URL.
