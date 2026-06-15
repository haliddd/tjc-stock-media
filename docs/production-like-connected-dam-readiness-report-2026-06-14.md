# Production-Like Connected DAM Readiness Report - 2026-06-14

## Recommendation

Teammate beta ready only after listed blockers.

The codebase is more honest and safer after this run, but teammates should not be invited yet as if this is a real connected DAM. Vercel account/protection/env, real ResourceSpace read source, Google Drive custody proof, and durable hosted state are not externally proven.

## Can Teammates Use It As A Real DAM Today?

Not yet.

They can use local/protected code paths for rehearsal, but the target experience requires a named teammate to open Vercel, log in safely, search real DAM records, inspect clearance, request/download approved derivatives, submit durable feedback, and see no fixture/demo/local-only illusion. That full chain is not proven.

## 2026-06-15 v0.0.1 Free DAM Update

Oracle Always Free setup is blocked before ResourceSpace install:

- Oracle VCN `tjc-stock-media-vcn-v001` was created in US East Ashburn.
- No VM was created.
- `VM.Standard.A1.Flex` Always Free-eligible, 2 OCPU / 12 GB, failed in AD-1, AD-2, and AD-3 due OCI capacity.
- No paid prompt was accepted, no upgrade was clicked, and no paid shape/storage/database/load balancer/backups were used.
- ResourceSpace hosted install, hosted import, hosted `do_search`, and live hosted API proof did not start.

The best current status is NO-GO for real hosted ResourceSpace-backed teammate beta. Continue local/export safety proof only until Hali explicitly approves another free-only path or A1 capacity becomes available.

Read-only hosted Vercel proof on `https://tjc-stock-media.vercel.app`:

- Anonymous `/` redirects to `/beta-login?returnTo=%2F`.
- Anonymous `/api/assets/search?limit=1` redirects to beta login.
- Anonymous `/admin` redirects to beta login.
- `/api/beta-auth/session` returns unauthenticated `401` with beta auth enabled.
- No hosted mutating smoke, persona login, env change, deploy, or invite was performed.

Current local target-branch proof:

- Local branch: `architecture/production-like-connected-dam-readiness-proof`.
- PR #15: open draft on `haliddd/tjc-stock-media`, head `architecture/production-like-connected-dam-readiness-proof`, base `main`.
- Build/test/guard suite passed; frontend tests now report 72 tests.
- Local smokes passed for API payload safety, delivery privacy, queued writeback guard, feedback, package drafts, saved searches, and beta rehearsal.
- Download ticket smoke is blocked because current seed/export has no reviewer-visible downloadable asset; this is a delivery-proof blocker, not a leak.

## Genuinely Connected Now

- ResourceSpace API-first adapter exists and paginates beyond 1,000 records.
- Export snapshot fallback exists and is read-only.
- Normal role redaction hides source custody fields.
- Approved delivery now runs through centralized `approved-delivery-gate`.
- Original-like requested variants are request-only/blocked in the normal delivery route.
- Download ticket gate requires accepted terms, policy approval, derivative availability, and required audit.
- Hosted feedback now fails closed instead of falling to local storage when KV is missing/failing.
- Admin readiness cockpit already exposes many connection states.

## Still Fallback / Local / Mock

- Demo fallback records still exist for API/local smoke when ResourceSpace/export is absent.
- Local derivative/fallback approved-copy proof exists for limited smoke IDs.
- Saved searches are local JSON.
- Package drafts are local JSON.
- Audit log is local JSONL.
- Download tickets are runtime filesystem.
- Pending write queue is local/runtime.
- No hosted Vercel dashboard/env/protection proof was captured.
- No Google Drive custody manifest was validated.
- No ResourceSpace hosted read smoke was run.
- No S3/R2/Vercel Blob derivative storage was implemented.

## Hosted-Proven

Anonymous beta gate is read-only proven for the stable hosted URL. Persona login, hosted env, deployment commit, durable store, and real ResourceSpace reads remain unproven. Hosted smokes require human URL/env/access approval and must not include mutating actions without approval.

## Durable

- Feedback can be durable only when KV is configured; code now fails closed in hosted runtime otherwise.
- Attachments need Blob or equivalent proof.
- Generic runtime state is not durable. Current code intentionally reports generic durability as false.

## Safe

- Viewer/Contributor payload redaction remains the key safety boundary.
- Approved-copy route no longer exposes source paths/original paths/storage paths in normal blocked responses.
- Public share/CDN/original delivery was not implemented.
- Live ResourceSpace writeback was not enabled.
- Drive/source media was not touched.
- No paid resources were created.
- No secrets were committed.

## Not Production-Ready

- Real SSO/origin protection not configured.
- Durable audit/ticket/package/saved-search/pending-write stores not implemented/proven.
- ResourceSpace host/API not proven from Vercel.
- Google Drive custody manifest not proven.
- Backup/restore not proven.
- Future derivative object storage not chosen/proven.
- Wider rollout rights review remains outside this run.

## Accounts / Services Needed

- Vercel project connected to `haliddd/tjc-stock-media`.
- Vercel deployment protection or equivalent preview access restriction.
- KV/Redis store for feedback.
- Blob or attachment policy if feedback attachments are enabled.
- ResourceSpace host/API credentials for read-only proof.
- Google Shared Drive ID and sanitized custody manifest.
- Future SSO/origin provider.
- Future backup destination.
- Future object storage provider if approved derivatives move off local/export proof.

## Human Steps Remaining

1. Retry Oracle A1 capacity later/off-hours, or explicitly approve another free-only path.
2. Install ResourceSpace only after a free eligible VM exists.
3. Confirm Vercel account/project/free plan, deployment protection, env names, and hosted commit without exposing values.
4. Confirm `RESOURCESPACE_ENABLE_WRITEBACK=0` and `RESOURCESPACE_WRITEBACK_MODE=queued`.
5. Configure/prove KV or another durable store for hosted beta state, or disable/fail closed.
6. Provide sanitized Google Shared Drive custody manifest.
7. Approve persona hosted proof if passwords can be entered secret-safely.
8. Approve any hosted mutating smoke separately.

## Checks Planned / Run

Passed on 2026-06-14:

- `git diff --check`
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend test` (71 tests)
- `npm --prefix frontend run build`
- `node scripts/private-source-guard.mjs`
- `node scripts/public-env-guard.mjs`
- `node scripts/api-identity-guard.mjs`
- `node scripts/api-payload-guard.mjs`
- `node scripts/api-audit-guard.mjs`
- `node scripts/storage-honesty-guard.mjs`
- `node scripts/git-hygiene-guard.mjs`
- `make launch-readiness` (passed with existing `.env` placeholder warning)
- `BASE_URL=http://localhost:4868 make portal-api-smoke`
- `BASE_URL=http://localhost:4868 make portal-download-ticket-smoke`
- `BASE_URL=http://localhost:4868 make portal-feedback-smoke`
- `BASE_URL=http://localhost:4868 make portal-package-smoke`
- `BASE_URL=http://localhost:4868 make portal-browser-qa`

Browser QA covered 16 page/role combinations across 1440, 1280, 1024, 768, 390, and 320 px, with 20 screenshots, zero failures, zero console errors, and zero network failures. It skipped Viewer asset-detail screenshots because no Viewer-visible real asset fixture exists when fallback records are hidden, which is the correct beta honesty behavior.

Passed on 2026-06-15 target branch:

- `git diff --check`
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend test` (72 tests)
- `npm --prefix frontend run build`
- `node scripts/private-source-guard.mjs`
- `node scripts/public-env-guard.mjs`
- `node scripts/api-identity-guard.mjs`
- `node scripts/api-payload-guard.mjs`
- `node scripts/api-audit-guard.mjs`
- `node scripts/storage-honesty-guard.mjs`
- `node scripts/git-hygiene-guard.mjs`
- `node scripts/live-dam-surface-guard.mjs`
- `make launch-readiness` (0 failures, 1 `.env` placeholder warning)
- `BASE_URL=http://localhost:4868 make portal-api-smoke`
- `BASE_URL=http://localhost:4868 make portal-delivery-smoke`
- `BASE_URL=http://localhost:4868 make portal-writeback-guard-smoke`
- `BASE_URL=http://localhost:4868 make portal-feedback-smoke`
- `BASE_URL=http://localhost:4868 make portal-package-smoke`
- `BASE_URL=http://localhost:4868 make portal-saved-search-smoke`
- `BASE_URL=http://localhost:4868 make portal-beta-rehearsal`

Blocked on 2026-06-15:

- `BASE_URL=http://localhost:4868 make portal-download-ticket-smoke`: no reviewer-visible downloadable asset exists in current seed/export.

## Next Exact Action

Stage only touched readiness docs/code files, push branch to `haliddd`, and open a draft PR titled `Production-like connected DAM readiness proof`.
