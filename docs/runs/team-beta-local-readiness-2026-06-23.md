# Local Team Beta Readiness

Date: 2026-06-23
Branch: `beta/local-team-workflow-ready-overnight`
Status: LOCAL TEAM BETA GO for local rehearsal only.

Do not deploy. Do not merge. Do not invite team until Hali confirms.

## 2026-06-23 UI/UX Continuation Note

A later UI/UX acceptance-blocker pass updated the active prototype surfaces after the previous GO evidence:

- moved remaining feedback/task controls to non-obstructing inline placement
- polished Upload / Intake queue, receipt copy, and progress meters
- improved Review Queue density, status buckets, tag column, and review-detail comparison copy
- fixed collection-detail inert selection checkbox with a beta-safe message
- improved Requests right panel tabs and real role-safe requested-file thumbnails
- tightened Users & Groups permission row alignment and sticky right panel
- compacted Admin readiness card so Metadata & Brand controls remain primary
- changed browser QA default screenshot folder to `docs/screenshots/team-beta-ui-ux-final-2026-06-23/`

Final full QA has not been rerun after these latest edits. Treat the older GO as the previous baseline only; this continuation remains verification-pending until the final gate runs again.

## URLs

| Surface | URL |
| --- | --- |
| Portal | http://localhost:4871 |
| ResourceSpace | http://localhost:8088 |

Continuation note: later local server inspection found the active dev portal on `http://localhost:4885` while `4871` was not listening. The committed code remains port-agnostic; set `BASE_URL` to the active local portal before running smoke/browser QA.

## Data Source

| Item | Result |
| --- | --- |
| Source used | ResourceSpace metadata export |
| Asset count in admin readiness | 2,290 |
| Search total | 2,061 |
| Collection count | 19 |
| Sample asset ID | `367` |
| Sample asset title | Bee |
| Sample collection ID | `album:mvp-2024-first-batch` |
| Thumbnail route | `/api/assets/thumbnail/367` returned `image/jpeg` |

The portal uses local ResourceSpace/export data for the library workflow. It does not claim live ResourceSpace writeback unless the write API confirms success.

## Workflows Tested

| Workflow | Status | Notes |
| --- | --- | --- |
| Viewer library browsing | PASS | Search, sort, saved view/filter controls, grid/list toggle, selection, inspector, and asset detail are wired or truthfully limited. |
| Contributor upload intake | PASS | Submit uses `/api/upload`; receipt says submitted for review, not public. |
| Reviewer evidence decision | PASS | Missing evidence blocks; valid request-changes decision queues pending write. |
| Collections / distribution | PASS | Real collection mappings and role-safe links; download all remains per-asset gated. |
| Admin readiness | PASS with local-only blockers | Shows source health, counts, pending writes, role matrix, gates, storage status, and blockers. |
| Mobile navigation | PASS | Bottom nav has five items at 390px and 320px; no horizontal overflow. |

## Validation Results

| Command | Result |
| --- | --- |
| `make smoke` | PASS, with warning that compose containers are not the active ResourceSpace process |
| `BASE_URL=http://localhost:4871 make portal-api-smoke` | PASS with local beta env loaded |
| `cd frontend && npm run typecheck` | PASS |
| `cd frontend && npm run build` | PASS |
| `cd frontend && npm run test` | PASS, 174 tests |
| Browser screenshot/API QA | PASS, 33 page-only proof screenshots, 0 failures, 0 warnings, 0 console errors, 0 network failures |

Screenshot folder from previous functional readiness pass: `docs/screenshots/team-beta-local-readiness-2026-06-23/`

Final UI/UX proof folder for this pass: `docs/screenshots/team-beta-ui-ux-final-2026-06-23/`

Final browser QA report: `docs/screenshots/qa/browser-qa-report.json` and copied to `docs/screenshots/team-beta-ui-ux-final-2026-06-23/browser-qa-report.json`, checked at `2026-06-23T08:33:52.265Z`.

## UI/UX Correction Pass

Applied on 2026-06-23 after review against the Apple-style DAM reference screens.

| Area | Correction |
| --- | --- |
| Screenshot proof | Browser QA now uses Playwright page viewport screenshots and supports `PORTAL_BROWSER_QA_SCREENSHOT_DIR=docs/screenshots/team-beta-ui-ux-final-2026-06-23`. |
| Feedback control | `Report Issues` moved from obstructing floating bottom-right overlay into sidebar/mobile inline tools. |
| Feedback guardrail | Floating feedback fallback was removed from `BetaPrototypeTools`; the control renders inline only so it cannot cover route content. |
| Upload / Intake | Reworked queue as polished table, replaced native green progress with neutral thin meters, removed debug/sample wording, added beta safety note and tag chips. |
| Review Queue | Added reliable ResourceSpace/export fallback rows, loading skeleton, dense reviewer table, truthful action wiring, and review detail decision mapping. |
| Review Detail | Side-by-side comparison, evidence checklist, decision card, and queued/synced truth copy preserved. |
| Requests | Tightened table columns, row selection, status copy, and right panel so content no longer collides at 1440px. |
| Users & Groups | Right permissions panel spacing fixed; scope labels separated; invite/deactivate are beta-safe and not fake identity actions. |
| Admin Metadata | Readiness compacted into a card; schema/taxonomy/brand/settings panels remain visible above the fold. |

Visual parity is acceptable for local team beta rehearsal. Final screenshots are page-only captures with no browser chrome, no overlapping feedback button, no giant blank areas, and no QA-detected mobile horizontal overflow.

## Safety State

| Guardrail | Result |
| --- | --- |
| ResourceSpace source of truth | Preserved |
| Original/source download exposure | Not exposed in QA; download gate response confirms `originalIncluded=false` |
| Safe-download gates | Active |
| Upload default state | Needs Review / not public |
| Review writeback | Pending write queued unless live ResourceSpace update confirms success |
| RBAC | Reviewer/Admin flows remain role gated |
| Media mutation | No original/source media mutation performed |
| Secrets | `.env` and `.env.team-beta.local` not committed |
| Production deploy | Not run |

## Known Limitations

- Cloud storage is not connected yet by request.
- Cloud team beta remains NO-GO until ResourceSpace staging and durable beta stores are configured; see `docs/runs/cloud-beta-readiness-2026-06-23.md`.
- Active local beta auth may require the current persona password from the running dev server environment; do not weaken auth to run checks.
- Admin readiness endpoint reports broader beta readiness false because pending-write/cloud/production blockers remain.
- Review approval for public use remains strict; if domain evidence is missing, approval stays blocked. The safe demo path uses request changes/restrict to queue pending writes truthfully.
- Local share links are for local beta only; no public sharing/invite delivery.
- `make up` may warn when existing ResourceSpace containers are already running outside the expected compose project name.

## Final Call

LOCAL TEAM BETA GO for local morning presentation workflow.

NO-GO for production, public sharing, deployment, merge, or team invite send until Hali confirms after reviewing screenshots and connecting storage.
