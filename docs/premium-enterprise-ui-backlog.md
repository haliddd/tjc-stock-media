# Premium Enterprise UI Backlog

Status: P2/P3 backlog. This is not authorization for broad redesign or new features.

## Design Target

The portal should feel like a serious internal enterprise DAM for TJC: calm, dense, trustworthy, role-aware, and honest about beta limits. It should not feel like a public SaaS landing page or prototype.

## P2 Items

| Priority | Item | Acceptance |
|---|---|---|
| P2 | Make Library list/table first, grid optional | Viewer can scan clearance, title, event, usage, derivative status, and blockers without opening every asset. |
| P2 | Consolidate repeated warnings | One canonical clearance/status panel; no repeated banner/right-panel/bottom warning noise. |
| P2 | Rename "Can I use this?" | Use "Clearance status" or "Reuse decision" consistently. |
| P2 | Remove normal-user ResourceSpace internals | Viewer/Contributor copy uses media-library/reference language; ResourceSpace admin/source terms stay Admin/Reviewer. |
| P2 | Fix concatenated blocker text | Blockers render as bullets, rows, or separated chips. |
| P2 | Gate source custody fields | Empty technical/source rows hidden from normal users; Admin-only collapsed diagnostics. |
| P2 | Clean Collections vs Distribution Sets | Collection is references; distribution set is channel-specific release packet. Neither grants permission. |
| P2 | Stop "Approved" overclaim | Use Approved only for item-level clearance with reviewer/date/scope/evidence. |
| P2 | First-class empty preview state | Missing preview says unavailable/missing, not fake imagery. |
| P2 | Review Queue shell consistency | Same theme and shell model as the rest of the app. |
| P2 | Feedback copy | Attachments disabled or strongly warned; no unsafe screenshots of people/minors/source/private info. |
| P2 | Mobile 320/390 sanity | Core beta routes have no text overlap or hidden Report issue action. |

## P3 Items

| Priority | Item | Acceptance |
|---|---|---|
| P3 | Pagination select polish | Native select does not look unfinished. |
| P3 | Badge density pass | Fewer secondary chips on cards and details. |
| P3 | Empty state tone | Smaller, quieter states with reason and next action. |
| P3 | Full browser QA harness | Stable local role/data setup for portal-browser-qa. |

## Safety Rules

- Do not weaken RBAC.
- Do not hide actual blockers.
- Do not make beta look production-ready.
- Do not enable downloads, writeback, public sharing, AI approval, or video/audio workflows.
- Do not expose source/original/private data to normal roles.
- Do not turn collections, packages, metrics, or suggestions into permission truth.
