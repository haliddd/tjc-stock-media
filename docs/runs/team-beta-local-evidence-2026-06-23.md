# Local Team Beta Evidence

Date: 2026-06-23
Branch: `beta/local-team-workflow-ready-overnight`
Portal: http://localhost:4885
ResourceSpace: http://localhost:8088

## Commands Run

| Command | Result |
| --- | --- |
| `git status --short` | Captured before work; branch had prototype worktree changes from current pass |
| `git branch --show-current` | `beta/local-team-workflow-ready-overnight` |
| safety checkpoint manifest | Created under `.runtime/backups/team-beta-overnight/` |
| `make up` | Existing ResourceSpace containers already running; command hit container-name conflict |
| `make smoke` | PASS; ResourceSpace URL and runtime checks responded |
| `BASE_URL=http://localhost:4885 make portal-api-smoke` | PASS after loading `.env.team-beta.local` without printing invite code |
| `cd frontend && npm run typecheck` | PASS |
| `cd frontend && npm run build` | PASS |
| `cd frontend && npm run test` | PASS, 174 tests |
| Browser screenshot/API QA | PASS, 60 screenshots across 6 viewports and 10 routes |

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

Screenshot summary: `docs/screenshots/team-beta-local-readiness-2026-06-23/summary.json`

| Metric | Result |
| --- | --- |
| Screenshots | 60 |
| Viewports | 1440, 1280, 1024, 768, 390, 320 |
| Routes | Library roles, asset detail, upload, review, collections, distribution sets, admin |
| Horizontal overflow | 0 |
| Console errors | 0 |
| Page errors | 0 |
| Route failures | 0 |
| Mobile nav items | 5 on checked routes |

## Upload Workflow Result

Upload API accepted local beta intake and returned a review packet receipt. The response stated the submission is not public. No ResourceSpace original/source media was mutated.

## Review Workflow Result

Reviewer decision without evidence is blocked. A valid `Request More Info` decision with required source, rights, people, children/youth, usage, note, reviewer, and date evidence queued a pending write. The response message explicitly says ResourceSpace record status remains unchanged until review is completed.

## Download Gate Result

Download gate returned approved-copy access for the sample asset and confirmed private originals and storage paths are not exposed. Source/original restriction messaging remains visible in the portal.

## Admin Readiness Result

Admin page is usable as the morning command center. It shows data source, asset counts, thumbnail health, pending writes, upload intake storage, role matrix, download gates, source/original restrictions, and local-only blockers.

## Pending Write State

Pending writes existed before final QA and increased during authenticated review queue proof. They remain local runtime records and do not claim ResourceSpace sync unless the live API returns success.

## Screenshot Paths

- `docs/screenshots/team-beta-local-readiness-2026-06-23/library-viewer-1440.png`
- `docs/screenshots/team-beta-local-readiness-2026-06-23/library-viewer-390.png`
- `docs/screenshots/team-beta-local-readiness-2026-06-23/upload-contributor-1440.png`
- `docs/screenshots/team-beta-local-readiness-2026-06-23/review-reviewer-1440.png`
- `docs/screenshots/team-beta-local-readiness-2026-06-23/collections-viewer-1440.png`
- `docs/screenshots/team-beta-local-readiness-2026-06-23/admin-1440.png`

## Final Commit SHA

Recorded in final handoff after commit. This file is part of that commit.

## Not Production

This is a local beta rehearsal artifact. It is not production-ready, not deployed, not merged, and not approved for public sharing or team invites.
