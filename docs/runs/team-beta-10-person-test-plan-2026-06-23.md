# TJC Stock Media Local Team Beta Test Plan

Date: 2026-06-23
Scope: local-only 10-person beta rehearsal
Branch: `beta/local-team-workflow-ready-overnight`
Status: LOCAL TEAM BETA STATUS: GO
Portal: http://localhost:4885
ResourceSpace: http://localhost:8088

Do not deploy, merge, send invites, expose a public tunnel, or share production links from this pass.

## Test Assignment Matrix

| Tester | Role | Starting URL | Task steps | Expected result | Must not happen |
| --- | --- | --- | --- | --- | --- |
| 1 | Viewer | `/library?role=Viewer` | Search `Bible`, select asset, inspect metadata, open detail. | Library, inspector, and detail load from ResourceSpace/export data. | Source/original URL exposed. |
| 2 | Viewer | `/assets/368?role=Viewer` | Try Download and inspect restrictions. | Approved-copy gate or blocked reason appears. | Original/source download. |
| 3 | Contributor | `/upload?role=Contributor` | Add file, fill collection/source/rights/tags/notes. | Intake form holds entries. | Public/approved status appears. |
| 4 | Contributor | `/upload?role=Contributor` | Submit intake. | Receipt says submitted for review, not public. | Fake ResourceSpace sync success. |
| 5 | Reviewer | `/review?role=Reviewer` | Try decision with missing evidence. | Decision blocked. | Approval succeeds without evidence. |
| 6 | Reviewer | `/review?role=Reviewer` | Add evidence/note and request changes/restrict. | Pending write queued truthfully. | ResourceSpace status silently changes. |
| 7 | Viewer | `/collections?role=Viewer` | Open MVP collection and distribution/package surfaces. | Collection assets show; sharing/download-all stay gated. | Public bundle or source package created. |
| 8 | DAM Admin | `/admin?role=DAM%20Admin` | Review source health, pending writes, role matrix, blockers. | Admin readiness loads. | Destructive sync/publish control. |
| 9 | Viewer mobile | `/library?role=Viewer` at 390px | Browse, select asset, use bottom nav. | Mobile nav and selected sheet usable. | Horizontal overflow blocking use. |
| 10 | Mixed edge cases | `/library?role=Viewer` | Empty search, restricted asset, disabled control checks. | Truthful empty/limited states. | Inert primary action or fake success. |

## Morning Demo Script

1. Viewer opens Library, searches Bible/Plant/Bee, selects asset, shows inspector.
2. Viewer opens asset detail, attempts Download, sees gate/restriction.
3. Contributor opens Upload, adds file, submits intake, sees not-public receipt.
4. Reviewer opens Review, tries missing evidence, then queues valid decision.
5. Viewer opens Collections/Distribution, shows real assets and gated sharing/download-all.
6. Admin opens readiness, shows data source, pending writes, blockers, role gates.

## Final QA Evidence

| Check | Result |
| --- | --- |
| Smoke | PASS |
| API smoke | PASS |
| Typecheck | PASS |
| Build | PASS |
| Tests | PASS, 177 tests |
| Browser QA | PASS, 20 pages / 33 screenshots / 0 failures |
| Upload workflow | PASS |
| Review workflow | PASS |
| Collections | PASS |
| Requests | PASS |
| Admin | PASS |
| Download gate | PASS |
| Role gates | PASS |

Screenshot folder: `docs/screenshots/team-beta-ui-ux-final-2026-06-23/`

## Known Limitations

- Local beta only until Hali confirms team invite.
- Cloud team beta remains NO-GO until ResourceSpace staging, durable beta storage, private upload storage, and Vercel Preview env are configured and proven.
- ResourceSpace writeback remains queued unless live credentials and confirmation read are configured.
- Source/original files remain restricted.
- Sharing is local beta only; no public link or production invite delivery.

## Emergency Stop

1. Stop local portal.
2. Preserve `.runtime`, pending writes, and upload records.
3. Capture route, role, screenshot, console/network error, and action attempted.
4. Do not retry destructive or sync actions without admin review.
