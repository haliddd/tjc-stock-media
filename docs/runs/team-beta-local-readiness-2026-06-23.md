# Local Team Beta Readiness

Date: 2026-06-23
Branch: `beta/local-team-workflow-ready-overnight`
Commit at final QA start: `52fc8deb858a5f15e93f15f3fcb29aa28c9851b3`
Status: LOCAL TEAM BETA STATUS: GO

Do not deploy. Do not merge. Do not invite team until Hali confirms.

## URLs

| Surface | URL |
| --- | --- |
| Portal | http://localhost:4885 |
| ResourceSpace | http://localhost:8088 |

## Data Source

| Item | Result |
| --- | --- |
| Source used | ResourceSpace metadata export |
| Asset count in admin readiness | 2,290 |
| Search-visible asset count | 2,061 |
| Collection count | 19 |
| Sample detail asset | `368` / Bench Bible |
| Sample unsafe asset | `644` / 2012 Photo 644 |
| Sample collection | `album:mvp-2024-first-batch` |
| Screenshot folder | `docs/screenshots/team-beta-ui-ux-final-2026-06-23/` |

The local beta reads ResourceSpace/export data. Review writes remain queued unless live ResourceSpace API writeback is explicitly configured and re-read.

## Final Command Gate

| Command | Result |
| --- | --- |
| `make smoke` | PASS; ResourceSpace URL/runtime checks passed. Docker compose containers were not named as active, but `http://localhost:8088` responded. |
| `BASE_URL=http://localhost:4885 make portal-api-smoke` | PASS; generated API smoke fixture and completed portal API smoke. |
| `cd frontend && npm run typecheck` | PASS |
| `cd frontend && npm run build` | PASS |
| `cd frontend && npm run test` | PASS; 24 files / 177 tests passed. |

## Browser QA

Report: `docs/screenshots/team-beta-ui-ux-final-2026-06-23/browser-qa-report.json`

| Metric | Result |
| --- | --- |
| Checked at | `2026-06-23T08:33:52.265Z` |
| Viewports | 1440, 1280, 1024, 768, 390, 320 |
| Pages | 20 |
| Screenshots | 33 |
| Failures | 0 |
| Warnings | 0 |
| Console errors | 0 |
| Network failures | 0 |

## Workflow Results

| Workflow | Status | Evidence |
| --- | --- | --- |
| Viewer library browsing | PASS | Browser QA covers library desktop/mobile; API smoke confirms search. |
| Asset detail | PASS | Browser QA uses detail asset `368` / Bench Bible. |
| Contributor upload intake | PASS | API smoke confirms upload submits as `needs-review` and not public. |
| Reviewer evidence workflow | PASS | API smoke confirms missing evidence blocks and valid decision queues pending write. |
| Collections / distribution | PASS | Browser QA covers collections and packages/distribution surfaces; API smoke confirms 19 collections. |
| Requests | PASS | Browser QA covers requests desktop/mobile. |
| Admin readiness | PASS | Browser QA covers admin; API smoke confirms readiness endpoint. |
| Download gate | PASS | API smoke confirms approved-copy gate and no original/source inclusion. |
| Role gates | PASS | API smoke verifies role boundaries for local beta routes. |
| Source/original exposure | PASS | API smoke and browser QA showed no source/original exposure. |

## Known Limitations

- Cloud team beta remains NO-GO until ResourceSpace staging, durable beta storage, private upload storage, and Vercel Preview env are configured and proven.
- Old Vercel URL is a stable front-door candidate only after current branch/cloud env are redeployed and re-proved.
- Local pending writes are local runtime records and do not claim ResourceSpace sync.
- Local upload intake is beta review intake, not public publishing.
- Local share/distribution links are beta-safe only; no public invite or production sharing approved.
- `make smoke` warned ResourceSpace compose container names were not active, while URL/runtime checks still passed.

## Final Call

LOCAL TEAM BETA STATUS: GO

Cloud remains NO-GO. Do not deploy, merge, publicly share, or invite team until Hali confirms.
