# TJC Stock Media Local Team Beta Test Plan

Date: 2026-06-23
Scope: local-only team beta workflow rehearsal
Portal: http://localhost:4871
ResourceSpace: http://localhost:8088

This plan is for a local rehearsal only. Do not deploy, merge, send invites, expose a public tunnel, or share production links from this pass.

Before rehearsal, confirm the active portal port. A later continuation found the dev server on `http://localhost:4885` while `4871` was stopped. Use the active local URL consistently in every tester starting link.

## Tester Assignments

| Tester | Role | Starting URL | Task steps | Expected result | Must not happen | Issue reporting |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Viewer | `/library?role=Viewer` | Search for `Bible`, select an asset, inspect metadata, open detail. | Library filters, selected inspector, and detail route update from ResourceSpace/export data. | Source/original URL exposed; fake public approval shown. | Use sidebar/mobile `Report Issues`; include URL and screenshot. |
| 2 | Viewer | `/library?role=Viewer` | Try Download on a visible asset, then inspect Rights & Usage. | Download uses approved-copy gate or shows blocked reason. | Original/source file downloads; unexplained success toast. | Report issue with asset ID. |
| 3 | Contributor | `/upload?role=Contributor` | Add 2 test files, fill collection, brand/source, rights, credit, tags, notes. | File list and metadata fields persist. | File disappears without receipt; public/approved status appears. | Report issue with filename and form state. |
| 4 | Contributor | `/upload?role=Contributor` | Submit intake. | Receipt says submitted for review, not public, source/original restricted. | ResourceSpace original mutated; fake ResourceSpace ID success. | Report issue and keep browser open. |
| 5 | Reviewer | `/review?role=Reviewer` | Select queue item, try decision with missing evidence. | Decision is blocked with missing evidence. | Approval succeeds without required note/evidence. | Report exact missing-evidence message. |
| 6 | Reviewer | `/review?role=Reviewer` | Fill required evidence/note, request changes or restrict. | Pending write queues locally; ResourceSpace remains unchanged until sync. | Fake synced approval; public status changes silently. | Report pending write ID if visible. |
| 7 | Viewer | `/collections?role=Viewer` | Open MVP collection, inspect assets, try share/download all. | Real collection assets appear; share is local-safe; download all stays per-asset gated. | Public link or source bundle created. | Report collection ID and action. |
| 8 | DAM Admin | `/admin?role=DAM%20Admin` | Review source health, pending writes, upload intake, role matrix, blockers. | Admin page shows local beta status and limitations. | Blank admin page; destructive sync/publish control. | Report module name. |
| 9 | Viewer mobile | `/library?role=Viewer` at 390px | Browse, select asset, use bottom nav. | Five-item bottom nav stays visible; selected sheet is usable. | Horizontal overflow; nav hidden by sheet. | Attach mobile screenshot. |
| 10 | Mixed edge cases | `/library?role=Viewer` | Try empty search, unsupported filters, disabled controls, restricted assets. | Unsupported actions explain local beta limit. | Inert primary button; fake success. | Report route, role, expected vs actual. |

## 30-Minute Demo Script

1. Open Viewer Library and search for a real term such as `Bible`, `Plant`, or `Bee`.
2. Select asset `367` or another visible record and show inspector metadata, status, and source/original restriction.
3. Try Download and explain approved-copy gate behavior.
4. Open Asset Detail and show Details / Metadata / Activity tabs.
5. Open Upload as Contributor, add files, fill metadata, submit, and show receipt: submitted for review, not public.
6. Open Review as Reviewer, demonstrate missing evidence block, then submit a safe request-changes decision that queues a pending write.
7. Open Collections, inspect `album:mvp-2024-first-batch`, and show gated distribution behavior.
8. Open Admin and show data source, counts, pending writes, role matrix, and local-only blockers.
9. End with current limitation callout: no cloud storage configured, no production deploy, no team invites until owner confirms.

## UI/UX Acceptance Notes

- Final proof screenshots must come from Playwright page screenshots only; no browser toolbar/chrome.
- `Report Issues` lives in the sidebar/mobile top tools and must not cover content.
- Upload queue uses neutral thin progress meters and statuses `Completed`, `Uploading`, `Queued`, or `Failed`.
- Review and Requests tables must show real rows or truthful loading/empty states; no false nonzero count with blank table.
- Admin readiness stays visible but compact so Metadata Schema, Taxonomies, Brand Kit, Validation Rules, and Settings remain primary.
- All primary buttons either perform a safe action, queue a local action truthfully, or explain why local beta disables the action.

## Daily Upload / Review Rhythm

1. Contributors upload new files or source links during the day.
2. Every upload starts as Needs Review / Do Not Publish.
3. Reviewers triage queue, require source/rights/people/usage evidence, and queue decisions.
4. Admin checks pending writes and readiness blockers before any wider sharing.
5. Public/internal delivery uses approved-copy gates only; source/original access stays restricted.

## Known Limitations

- Cloud storage is not configured in this pass by request.
- Cloud team beta remains NO-GO until ResourceSpace staging, durable beta storage, private upload storage, and Vercel Preview env are configured and proven.
- ResourceSpace writeback is pending-write preview unless live credentials are configured.
- Sharing is local beta only; no public link or invite delivery is created.
- Existing Docker containers were already running, so `make up` reported container-name conflict while `make smoke` confirmed local ResourceSpace health.

## Emergency Stop

1. Stop portal dev server.
2. Stop ResourceSpace stack only if needed.
3. Do not delete `.runtime`.
4. Preserve pending writes and upload records.
5. Capture screenshot, route, role, console error, and action attempted.
6. Do not retry destructive or sync actions without admin review.
