# Joanna Mini Beta Readiness Report

Date: 2026-06-16

## Final Decision

Current state is locally ready for Joanna content-manager testing with limitations. The formal final decision is the last line of this report.

## Hosted URL Status

- Candidate URL: `https://tjc-stock-media.vercel.app`
- Hosted read-only probe: PASS at `2026-06-16T19:27:18.842Z`.
- Anonymous/query-role access redirects to beta login or returns unauthenticated session state.
- Hosted mutating tests were not run because Hali approval is required.
- Joanna link should be shared only after Hali confirms hosted role credentials out of band.
- Hosted URL is not proven to contain the newest local Joanna mini-beta changes, including the LM Photos public-release overlay and download fixes.

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
- `BASE_URL=http://localhost:4869 make portal-api-smoke`: PASS.
- `BASE_URL=http://localhost:4869 make portal-beta-rehearsal`: PASS.
- `BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe`: PASS.
- `BASE_URL=http://127.0.0.1:4867 make portal-download-ticket-smoke`: PASS.
- Vercel production deploy: PASS. Stable alias `https://tjc-stock-media.vercel.app` now points to deployment `dpl_46AGWyuAmR99SLGMnqqv8BdNFWUi` / `https://tjc-stock-media-kvy0s5jvn-hali-s-projects1.vercel.app`, created 2026-06-16 18:55 EDT.
- Hosted anonymous protection: PASS. Root redirects to beta login; query-role API probes do not expose privileged JSON or secret/source fields.
- Manual local dev download proof: `POST /api/download/367?role=Viewer` with accepted terms returned ticket; one ticketed `GET` returned `200 image/jpeg`; original/master request returned `403 original-request-only`.
- Production local read proof at `http://127.0.0.1:4869`: Reviewer search returned `total: 2061`, first 120 were `Approved Public`, and details for asset `367` showed `rightsStatus: Rights approved`, `rightsBasis: TJC-owned`, no exposed `imageUrls.download`, no source path/checksum.

## Failing Or Limited Checks

- First Vercel deploy attempt failed before release because local artifacts/deps were included in the upload. `.vercelignore` now excludes local build/dependency/runtime/media artifacts; retry succeeded.
- One Vercel build attempt failed before release because local-only safe-lane disk guard expected a git checkout. The guard now skips only in `VERCEL=1`; local guard self-test passes.
- `make launch-readiness`: FAIL due stale June 15 broad-beta evidence, open-blocker metadata, missing/old screenshot packet, and external durable-state proof language. This is broader than Joanna mini beta.
- `BASE_URL=http://127.0.0.1:4869` production-mode download POST/GET fails closed with `503 audit-required` because required audit/ticket writes are blocked without durable runtime storage. This is safe, but hosted production needs a durable runtime store before download can work there.
- `BASE_URL=http://localhost:4869 make portal-browser-qa`: FAIL after producing 20-page / 6-viewport report. Main failures: clipped collection/package/request controls, normal-user detail copy flagged for operational phrases, viewer upload block expectation mismatch, broken preview images for some thumbnails.
- Hosted authenticated role-path proof remains blocked until Hali provides usable Viewer/Reviewer/Admin credentials or confirms a private credential handoff path. No hosted upload/review/download mutation was run.

## What Joanna Can Test

- Open hosted beta login page after Hali provides credentials privately.
- Browse photo library with LM Photos records mostly public-facing.
- Search sample photos by Bible, worship, fellowship, flowers, and related terms.
- Open asset detail and inspect review/rights context.
- Submit photo-only upload/intake with minimal required metadata.
- Open review queue locally/proven by rehearsal.
- Approve only with evidence, reject, archive, or flag rights issues.
- Test status filters using the deterministic 10% holdout across Approved Internal, Needs Review, Searchable Archive, Possible Minors, and Do Not Use.
- Test local approved-copy download workflow if using local dev server; hosted production download remains blocked until durable runtime storage is configured.
- Give feedback on fields, upload friction, categories, rights uncertainty, and search quality.

## Known Limitations

- Hosted reviewer/admin login was not exercised because usable persona credentials were not available to this run.
- Hosted mutating upload/review was not run.
- Hosted deployment has the newest deploy-package/build fixes and LM Photos runtime overlay code from this working tree, but it is a Vercel CLI deploy of a dirty worktree rather than a clean Git commit deployment.
- All current LM Photos assets are treated as TJC-owned and public-ready by a runtime-only overlay. About 90% are `Approved Public`; about 10% are intentionally left across other statuses for test rounds.
- ResourceSpace export/API was unavailable in June 16 count report; portal uses media-library/export/local fallback for beta proof.
- Review decisions are queued/pending portal evidence, not live ResourceSpace truth.
- Original/source download remains blocked for normal roles.
- Approved derivative download works locally in dev with audit/ticket storage; hosted production download fails closed until durable audit/ticket storage exists.
- Browser QA shows UI overflow/copy issues that should be fixed before a broader team beta.
- Hosted durable storage/backup/restore remains unproven.

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

- Provide Viewer, Reviewer/Joanna, and DAM Admin persona credentials privately, or confirm Hali will test those roles first.
- Decide whether to configure durable hosted runtime storage for audit/tickets so hosted download can work, or keep hosted download blocked for this round.
- Decide whether browser QA overflow/copy failures must block Joanna or can wait until after her content feedback.

Beta ready with limitations
