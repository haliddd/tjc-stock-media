# Local Team Beta Evidence

Date: 2026-06-23
Branch: `beta/local-team-workflow-ready-overnight`
Portal: http://localhost:4871
ResourceSpace: http://localhost:8088

Continuation note: latest local inspection found the active portal on `http://localhost:4885`; `4871` was not listening. Use `BASE_URL=http://localhost:<active-port>` for any follow-up smoke or browser QA instead of assuming one fixed dev port.

## Current Continuation State

The UI/UX acceptance-blocker pass after the previous GO evidence has code changes pending final validation. `git diff --check` passed after the latest edits, and exact inert active-prototype patterns (`onClick={() => undefined}`, `onChange={() => undefined}`, `href="#"`, `alert(`) were not found in touched prototype files.

Full final QA commands, build, test, and browser screenshot matrix have intentionally not been rerun yet, per Hali's instruction to save full QA for the final stop point.

## Commands Run

| Command | Result |
| --- | --- |
| `git status --short` | Captured before work; branch had prototype worktree changes from current pass |
| `git branch --show-current` | `beta/local-team-workflow-ready-overnight` |
| safety checkpoint manifest | Created under `.runtime/backups/team-beta-overnight/` |
| `make up` | Existing ResourceSpace containers already running; command hit container-name conflict |
| `make smoke` | PASS; ResourceSpace URL and runtime checks responded |
| `BASE_URL=http://localhost:4871 make portal-api-smoke` | PASS after loading local beta env without printing invite code |
| `cd frontend && npm run typecheck` | PASS |
| `cd frontend && npm run build` | PASS |
| `cd frontend && npm run test` | PASS, 174 tests |
| Browser screenshot/API QA | PASS, 33 page-only screenshots across 6 viewports and 20 route/role checks; 0 failures, 0 warnings, 0 console errors, 0 network failures |
| `node --check scripts/portal-browser-qa.mjs` | PASS after screenshot wait/page-only capture updates |
| `node --check scripts/portal-browser-qa.mjs` | PASS after final proof route matrix expansion |
| `make cloud-beta-preview-preflight-test` | PASS |
| `make cloud-beta-preview-preflight` | EXPECTED NO-GO in current local shell because ResourceSpace cloud, durable DB/queues, private upload storage, beta auth, and download-gate env are not configured |

## API Smoke Summary

| Check | Result |
| --- | --- |
| Asset search | HTTP 200, 24 returned, 2,061 total |
| Asset detail | HTTP 200, sample `367`, title `Bee`, 8 related |
| Thumbnail route | HTTP 200, `image/jpeg` |
| Download gate | HTTP 200, allowed approved copy, `originalIncluded=false` |
| Collections | 19 collections |
| Upload submit | HTTP 200, `state=needs-review`, `public=false` |
| Review queue | HTTP 200, 80 items, reviewer access true |
| Review missing evidence | HTTP 400, blocked with missing evidence |
| Review valid request-changes | HTTP 202, pending write queued, ResourceSpace remains unchanged until sync |
| Admin readiness | HTTP 200, score 73, source `ResourceSpace metadata export`, 2,290 assets |

## Browser QA Summary

Screenshot summary: `docs/screenshots/qa/browser-qa-report.json`

Final UI/UX screenshot folder for this pass: `docs/screenshots/team-beta-ui-ux-final-2026-06-23/`

The browser QA script now emits page-only proof screenshots for the final route matrix at `1440`, `1280`, `1024`, `768`, `390`, and `320` when run with `PORTAL_BROWSER_QA_FULL=1`.

| Metric | Result |
| --- | --- |
| Screenshots | 33 page-only final proof screenshots |
| Viewports | 1440, 1280, 1024, 768, 390, 320 |
| Routes | Library roles, asset detail, upload, review, collections, distribution sets, requests, admin, help, recent uploads |
| Horizontal overflow | 0 QA failures |
| Console errors | 0 |
| Page errors | 0 |
| Route failures | 0 |
| Mobile nav items | 5 on checked routes |

## UI/UX Correction Evidence

Targeted pre-final previews on the clean local dev server showed:

| Route | Result |
| --- | --- |
| `/upload?role=Contributor` | HTTP 200, no console errors, neutral thin queue meters, no floating Report Issues overlay, no sample/debug status copy. |
| `/review?role=Reviewer` | HTTP 200, real review rows render from ResourceSpace/export data after app-ready wait, no zero-row false count. |
| `/review/367?role=Reviewer` | HTTP 200, review detail comparison and decision panel render with queued/synced truth copy. |
| `/requests?role=Reviewer` | HTTP 200, table rows render, no horizontal overflow at 1440px after column trim. |
| `/admin/users?role=DAM%20Admin` | HTTP 200, right permissions panel spacing fixed; identity actions are beta-safe. |
| `/admin/taxonomy?role=DAM%20Admin` | HTTP 200, compact readiness card plus visible metadata/brand/admin panels. |

The intermittent Next dev route 404 observed during hot reload was cleared by restarting the dev server and removing only `frontend/.next` build cache. Source media, `.runtime`, pending writes, uploads, and ResourceSpace data were not touched.

## Upload Workflow Result

Upload API accepted local beta intake and returned a review packet receipt. The response stated the submission is not public. No ResourceSpace original/source media was mutated.

## Review Workflow Result

Reviewer decision without evidence is blocked. A valid `Request More Info` decision with required source, rights, people, children/youth, usage, note, reviewer, and date evidence queued a pending write. The response message explicitly says ResourceSpace record status remains unchanged until review is completed.

## Download Gate Result

Download gate returned approved-copy access for the sample asset and confirmed private originals and storage paths are not exposed. Source/original restriction messaging remains visible in the portal.

## Admin Readiness Result

Admin page is usable as the morning command center. It shows data source, asset counts, thumbnail health, pending writes, upload intake storage, role matrix, download gates, source/original restrictions, and local-only blockers.

## Cloud Preview Preflight Result

The new cloud preview preflight is fail-closed and secret-redacted. It blocks team invites until Preview env proves:

- ResourceSpace staging HTTPS URL and restricted API user/key are configured.
- ResourceSpace writeback is queued, not live.
- Pending writes and upload intake are set to durable `postgres` stores.
- Private upload storage is configured with `UPLOAD_STORAGE_PUBLIC_READ=0`.
- Beta auth is enabled and local role override is disabled.
- Download gate requires approved copies and source/original downloads are disabled.

Durable schema starter was added at `docs/runs/cloud-beta-durable-schema-2026-06-23.sql`. It covers feedback, pending review writes, upload intake metadata, and audit events for a staging DB. It does not store source/original media.

## Pending Write State

Pending writes existed before final QA and increased during authenticated review queue proof. They remain local runtime records and do not claim ResourceSpace sync unless the live API returns success.

## Screenshot Paths

- `docs/screenshots/team-beta-local-readiness-2026-06-23/library-viewer-1440.png`
- `docs/screenshots/team-beta-local-readiness-2026-06-23/library-viewer-390.png`
- `docs/screenshots/team-beta-local-readiness-2026-06-23/upload-contributor-1440.png`
- `docs/screenshots/team-beta-local-readiness-2026-06-23/review-reviewer-1440.png`
- `docs/screenshots/team-beta-local-readiness-2026-06-23/collections-viewer-1440.png`
- `docs/screenshots/team-beta-local-readiness-2026-06-23/admin-1440.png`
- `docs/screenshots/team-beta-ui-ux-final-2026-06-23/` after final UI/UX QA gate
- `docs/screenshots/team-beta-ui-ux-final-2026-06-23/library-viewer-1440.png`
- `docs/screenshots/team-beta-ui-ux-final-2026-06-23/upload-contributor-1440.png`
- `docs/screenshots/team-beta-ui-ux-final-2026-06-23/review-reviewer-1440.png`
- `docs/screenshots/team-beta-ui-ux-final-2026-06-23/review-detail-reviewer-1440.png`
- `docs/screenshots/team-beta-ui-ux-final-2026-06-23/requests-reviewer-1440.png`
- `docs/screenshots/team-beta-ui-ux-final-2026-06-23/collections-viewer-1440.png`
- `docs/screenshots/team-beta-ui-ux-final-2026-06-23/admin-taxonomy-1440.png`

## Final Commit SHA

Recorded in final handoff after commit. This file is part of that commit.

## Not Production

This is a local beta rehearsal artifact. It is not production-ready, not deployed, not merged, and not approved for public sharing or team invites.
