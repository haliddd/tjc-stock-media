# Cloud Beta Readiness

CLOUD TEAM BETA STATUS: NO-GO for full cloud workflow

ONE-HOUR CLOUD STATUS: LIMITED GO

Hosted read-only preview is proven on the current branch. ResourceSpace cloud is assigned, but live API/read/writeback and durable stores are not proven, so upload/review/team testing stays blocked.

| Field | Value |
| --- | --- |
| Branch | `beta/local-team-workflow-ready-overnight` |
| Commit | `5afd01753915b7d69b508a4289071bd2899e801c` |
| Vercel Preview URL | `https://tjc-stock-media-p379ubz30-hali-s-projects1.vercel.app` |
| Branch alias | `https://tjc-stock-media-git-beta-local-team-wor-24b29a-hali-s-projects1.vercel.app` |
| Temporary share URL | Created for QA; expires 2026-06-24 14:19 EDT |
| Stable hosted URL | `https://tjc-stock-media.vercel.app` remains old/front-door candidate only, not current proof |
| ResourceSpace Cloud URL | `https://tjcstockmedia.free.resourcespace.com` |
| Data source | Bundled ResourceSpace beta snapshot |
| Asset count | 181 admin readiness / 163 search-visible |
| Collection count | 19 |
| Screenshot folder | `docs/screenshots/cloud-one-hour-final-2026-06-23/` |
| Upload storage | Not configured/proven; cloud upload intake fails closed |
| Pending writes storage | Not configured/proven for cloud |
| Feedback storage | Not configured/proven for cloud |
| Writeback mode | Disabled / queued only |
| Beta auth | Enabled on current preview; Viewer, Contributor, Reviewer, DAM Admin login passed |
| Download gate | PASS fail-closed; hosted download returned audit-required 503, no original/source exposure |
| Role gates | PASS via beta session roles on hosted preview |
| Browser QA | PASS after classifying aborted RSC/static prefetches as teardown noise |

## Current Hosted Findings

- Current Vercel preview is `READY` at commit `5afd01753915b7d69b508a4289071bd2899e801c`.
- Preview app beta auth is enabled and app sessions report the current commit marker.
- `/beta-login`, `/library`, `/upload`, `/review`, `/collections`, `/requests`, and `/admin` return app HTML through the protected preview share URL.
- `/api/admin/readiness` returns the bundled snapshot with 181 assets and honest integration blockers.
- `/api/assets/search?limit=12` returns 163 search-visible assets and 19 collections.
- Hosted upload source-link probe returns 503 with `storageMode: blocked-no-durable-store` and message `ResourceSpace cloud pending. Cloud upload intake requires durable storage or admin/Drive intake.`
- Hosted leak scan found no `sourcePath`, `masterDrivePath`, `checksumSha256`, original/signed/private URL, Google Drive/Photos URL, or API-key patterns in fetched API bodies.
- Browser QA produced 12 screenshots across desktop/mobile for the six required routes with zero route failures, zero console errors, zero horizontal overflow, and zero blocking network failures.
- Vercel Deployment Protection still exists. QA used a temporary Vercel share URL; do not invite a team until Hali confirms access plan.

## ResourceSpace Cloud Status

- ResourceSpace cloud instance exists at `https://tjcstockmedia.free.resourcespace.com`.
- Safari computer-use inspection on 2026-06-23 showed the ResourceSpace admin UI logged in on the upload page.
- No restricted ResourceSpace API user/key has been created or stored.
- No ResourceSpace field map has been exported/proven.
- Required collections still need creation/proof:
  - default/library
  - upload intake
  - review queue
- Live writeback remains disabled and must stay disabled until API smoke proves read/write safety.

## Known Blockers

- Full cloud GO is blocked by missing restricted ResourceSpace API credentials.
- Full cloud GO is blocked by missing ResourceSpace field map and staging collection IDs.
- Full cloud GO is blocked by missing durable pending-write storage.
- Full cloud GO is blocked by missing durable feedback storage.
- Full cloud GO is blocked by missing private upload storage or proven ResourceSpace intake upload.
- Hosted preview is protected by Vercel Deployment Protection; share URL is temporary.
- Upload/review mutation workflows must not be used by team on cloud; they fail closed or remain read-only until durable stores exist.
- Stable production URL is not current branch proof.

## Safety Call

Hali may demo hosted UI/read-only only. Do not deploy production. Do not merge. Do not invite team to test uploads/reviews. Full cloud GO requires ResourceSpace API, durable beta storage, private upload storage, role gates, download gate, no source/original exposure, and browser/API QA against that exact preview.
