# Local Team Beta Evidence

Date: 2026-06-23
Branch: `beta/local-team-workflow-ready-overnight`
Commit at final QA start: `52fc8deb858a5f15e93f15f3fcb29aa28c9851b3`
Portal: http://localhost:4885
ResourceSpace: http://localhost:8088
Status: LOCAL TEAM BETA STATUS: GO

Do not deploy. Do not merge. Do not invite team until Hali confirms.

## Final QA Summary

| Area | Result |
| --- | --- |
| Local portal | PASS on `http://localhost:4885` |
| ResourceSpace URL | PASS on `http://localhost:8088` |
| Data source | ResourceSpace metadata export |
| Asset count | 2,290 admin / 2,061 search-visible |
| Collection count | 19 |
| Screenshot folder | `docs/screenshots/team-beta-ui-ux-final-2026-06-23/` |
| Browser QA | PASS; 20 pages, 6 viewports, 33 screenshots, 0 failures |
| Command gate | PASS |
| Cloud beta | NO-GO |

## Commands Run

| Command | Result |
| --- | --- |
| `node ... browser-qa-report.json summary` | PASS; report exists and has 0 failures/warnings/console/network issues. |
| `make smoke` | PASS; ResourceSpace URL/runtime checks passed. |
| `BASE_URL=http://localhost:4885 make portal-api-smoke` | PASS. |
| `cd frontend && npm run typecheck` | PASS. |
| `cd frontend && npm run build` | PASS. |
| `cd frontend && npm run test` | PASS; 24 test files / 177 tests. |

## Browser QA Report

Report path: `docs/screenshots/team-beta-ui-ux-final-2026-06-23/browser-qa-report.json`

```json
{
  "checkedAt": "2026-06-23T08:33:52.265Z",
  "viewports": [1440, 1280, 1024, 768, 390, 320],
  "pages": 20,
  "failures": 0,
  "warnings": 0,
  "consoleErrors": 0,
  "networkFailures": 0,
  "screenshots": 33,
  "qaAsset": {
    "detail": {
      "id": "368",
      "path": "/assets/368",
      "title": "Bench Bible",
      "available": true
    },
    "unsafe": {
      "id": "644",
      "path": "/assets/644",
      "title": "2012 Photo 644",
      "available": true
    }
  }
}
```

## API Smoke Summary

| Check | Result |
| --- | --- |
| Asset search | PASS; search-visible count previously verified at 2,061. |
| Asset detail | PASS. |
| Thumbnail route | PASS. |
| Download gate | PASS; approved-copy behavior and source/original exclusion confirmed. |
| Collections | PASS; 19 collections. |
| Upload submit | PASS; intake creates not-public `needs-review` receipt. |
| Review missing evidence | PASS; missing evidence blocks decision. |
| Review valid decision | PASS; queues pending write truthfully. |
| Admin readiness | PASS; readiness endpoint reachable for admin role. |
| Role gates | PASS; API smoke completed local beta role checks. |

## Workflow Evidence

| Workflow | Result |
| --- | --- |
| Upload workflow | PASS; submit returns review intake state, not public approval. |
| Review workflow | PASS; missing evidence blocked, valid request-changes path queued. |
| Download gate | PASS; original/source files remain restricted. |
| Admin readiness | PASS; admin can see source, counts, pending writes, blockers, and role gates. |
| Collections | PASS; browser QA and API smoke cover collection/distribution surfaces. |
| Requests | PASS; browser QA covers requests desktop/mobile. |
| Feedback / Report Issues | PASS; browser QA has 0 obstruction failures. |

## Known Limitations

- Cloud team beta remains NO-GO.
- ResourceSpace cloud URL/API credentials are not configured.
- Vercel Preview env is not proven against current branch.
- Durable upload intake and private upload storage are not proven.
- Pending writes stay local/queued unless live ResourceSpace writeback is configured and re-read.
- No production deploy, merge, public share, or team invite approved.

## Not Production

This is local team beta evidence only. Cloud beta and production remain blocked.
