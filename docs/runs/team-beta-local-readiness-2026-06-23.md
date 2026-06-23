# Local Team Beta Readiness

Date: 2026-06-23
Branch: `beta/local-team-workflow-ready-overnight`
Status: LOCAL TEAM BETA GO for local rehearsal only.

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
| `make smoke` | PASS, with existing-container name warning from already-running ResourceSpace stack |
| `BASE_URL=http://localhost:4885 make portal-api-smoke` | PASS with local beta env loaded |
| `cd frontend && npm run typecheck` | PASS |
| `cd frontend && npm run build` | PASS |
| `cd frontend && npm run test` | PASS, 174 tests |
| Browser screenshot/API QA | PASS, 60 screenshots, 0 overflow, 0 console errors, 0 page errors, 0 route failures |

Screenshot folder: `docs/screenshots/team-beta-local-readiness-2026-06-23/`

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
- Admin readiness endpoint reports broader beta readiness false because pending-write/cloud/production blockers remain.
- Review approval for public use remains strict; if domain evidence is missing, approval stays blocked. The safe demo path uses request changes/restrict to queue pending writes truthfully.
- Local share links are for local beta only; no public sharing/invite delivery.
- `make up` may warn when existing ResourceSpace containers are already running outside the expected compose project name.

## Final Call

LOCAL TEAM BETA GO for local morning presentation workflow.

NO-GO for production, public sharing, deployment, merge, or team invite send until Hali confirms after reviewing screenshots and connecting storage.
