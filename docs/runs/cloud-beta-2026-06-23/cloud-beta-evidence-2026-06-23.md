# Cloud Beta Evidence

CLOUD TEAM BETA STATUS: NO-GO for full cloud workflow

ONE-HOUR CLOUD STATUS: LIMITED GO

Current branch is hosted and proven for read-only/UI preview. Cloud upload, review writeback, feedback durability, and private upload storage are not proven.

## Preview Proof

| Item | Result |
| --- | --- |
| Branch | `beta/local-team-workflow-ready-overnight` |
| Commit | `5afd01753915b7d69b508a4289071bd2899e801c` |
| Deployment | `dpl_F7wVZpuqPud5CdcZUqWAke4Bvvuw` |
| Hosted URL | `https://tjc-stock-media-p379ubz30-hali-s-projects1.vercel.app` |
| ResourceSpace Cloud URL | `https://tjcstockmedia.free.resourcespace.com` |
| Data source | Bundled ResourceSpace beta snapshot |
| Asset count | 181 admin readiness / 163 search-visible |
| Collection count | 19 |
| Screenshot folder | `docs/screenshots/cloud-one-hour-final-2026-06-23/` |
| Browser QA report | `docs/screenshots/cloud-one-hour-final-2026-06-23/browser-qa-report.json` |

## Commands / Checks

| Check | Result |
| --- | --- |
| Local focused tests | PASS: `npm run test -- production-hardening upload-intake` |
| Typecheck | PASS after build regenerated `.next/types`: `npm run typecheck` |
| Build | PASS: `npm run build` |
| Vercel preview build | PASS / READY |
| Temporary Vercel share access | PASS |
| `/api/beta-auth/session` | PASS; beta auth enabled, current commit marker `5afd01753915...` |
| Beta login | PASS for Viewer, Contributor, Reviewer, DAM Admin |
| `/api/admin/readiness` | PASS; bundled snapshot, honest blockers |
| `/api/assets/search?limit=12` | PASS; 163 search-visible assets, 19 collections |
| `/beta-login` | PASS |
| `/library` | PASS |
| `/upload` | PASS page load; API upload fails closed |
| `/review` | PASS page load; mutation workflow not cloud GO |
| `/collections` | PASS |
| `/requests` | PASS |
| `/admin` | PASS |
| Upload source-link API | PASS fail-closed: HTTP 503, `blocked-no-durable-store`, ResourceSpace cloud pending |
| Download gate | PASS fail-closed: HTTP 503 `audit-required`; no original/source exposed |
| Leak scan | PASS; no source/original/private/API-key pattern in fetched API bodies |

## Browser QA

Report: `docs/screenshots/cloud-one-hour-final-2026-06-23/browser-qa-report.json`

| Metric | Result |
| --- | --- |
| Checked at | `2026-06-23T15:23:34.337Z` |
| Viewports | 1440, 390 |
| Pages | `/library`, `/upload`, `/review`, `/collections`, `/requests`, `/admin` |
| Screenshots | 12 |
| Failures | 0 |
| Warnings | 0 |
| Console errors | 0 |
| Blocking network failures | 0 |
| Ignored network failures | 8 aborted RSC/static/thumbnail requests during QA context teardown |

## ResourceSpace Evidence

- ResourceSpace cloud URL assigned: `https://tjcstockmedia.free.resourcespace.com`.
- Safari computer-use inspection showed ResourceSpace admin UI on the upload page.
- No API credentials were created or stored.
- No ResourceSpace API read was run.
- No field map or collection IDs are proven.
- Writeback remains disabled.

## Storage Durability Status

| Surface | Current evidence |
| --- | --- |
| Pending review writes | Not durable/proven on cloud |
| Upload intake | Hosted API fails closed without durable store |
| Feedback | Not durable/proven on cloud |
| Private upload files | No Blob/S3/R2/ResourceSpace intake proof |
| Source/original storage | No source/original exposure found in hosted API smoke |

## Required Next Cloud Proof

Before full cloud GO:

1. Create restricted ResourceSpace API user/key.
2. Export/prove field map.
3. Create/prove default/library, upload intake, and review queue collections.
4. Configure durable pending writes and feedback storage.
5. Configure private upload storage or ResourceSpace intake upload.
6. Rerun hosted API smoke and browser QA on the exact preview URL.

Do not deploy production. Do not merge. Do not invite team until Hali confirms.
