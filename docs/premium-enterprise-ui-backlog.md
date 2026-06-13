# Premium Enterprise UI Backlog

Status: P2/P3 backlog after the 2026-06-13 premium enterprise UI pass. This is not authorization for broad redesign or new features.

## Design Target

The portal should feel like a serious internal enterprise DAM for TJC: calm, dense, trustworthy, role-aware, and honest about beta limits. It should not feel like a public SaaS landing page or prototype.

## Completed In 2026-06-13 Pass

| Priority | Item | Completion note |
|---|---|---|
| P2 | Make Library list/table first, grid optional | Library now defaults to a dense list/table path with compact mobile cards and grid as an optional mode. |
| P2 | Consolidate repeated warnings | Core surfaces now lead with one clearance decision and move evidence/detail below it. |
| P2 | Rename "Can I use this?" | Enterprise surfaces now use "Clearance status" / "Reuse decision" language. |
| P2 | Remove normal-user ResourceSpace internals | Normal-role UI uses reference/media-library language; admin/source diagnostics are role-scoped. |
| P2 | Fix concatenated blocker text | Blockers are separated through blocker panels, metadata rows, and next-action copy. |
| P2 | Gate source custody fields | Source/original/private fields remain Admin/Reviewer-gated and below evidence where shown. |
| P2 | Clean Collections vs Distribution Sets | Distribution sets are framed as governed drafts; collections remain curation/reference context only. |
| P2 | Stop "Approved" overclaim | Clearance copy avoids treating raw approval, tags, packages, or collections as permission truth. |
| P2 | First-class empty preview state | Preview and derivative gaps are described honestly without fake originals. |
| P2 | Review Queue shell consistency | Review Queue now follows next-action/evidence ordering. |
| P2 | Mobile 320/390 sanity | Browser QA passes 320px and 390px core paths with no failures. |
| P3 | Full browser QA harness | Browser QA passes full local page/viewport matrix and current premium copy. |

## Remaining P2 Items

| Priority | Item | Acceptance |
|---|---|---|
| P2 | Feedback copy | Attachments disabled or strongly warned; no unsafe screenshots of people/minors/source/private info. |
| P2 | Metadata schema management | Admin can view field key, controlled values, required flag, role visibility, clearance effect, and intake requirement from durable schema data. |

## Remaining P3 Items

| Priority | Item | Acceptance |
|---|---|---|
| P3 | Pagination select polish | Native select does not look unfinished. |
| P3 | Badge density follow-up | Tune residual secondary chips after real beta feedback. |
| P3 | Empty state tone | Smaller, quieter states with reason and next action across secondary routes. |
| P3 | Real beta feedback polish | Apply changes from actual team feedback once the internal beta has enough responses. |

## Safety Rules

- Do not weaken RBAC.
- Do not hide actual blockers.
- Do not make beta look production-ready.
- Do not enable downloads, writeback, public sharing, AI approval, or video/audio workflows.
- Do not expose source/original/private data to normal roles.
- Do not turn collections, packages, metrics, or suggestions into permission truth.
