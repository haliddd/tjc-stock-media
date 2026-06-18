# Role Action Matrix

Last updated: 2026-06-18

Purpose: freeze what beta roles may see and do. Route/UI improvements must follow this matrix.

## Role Summary

| Role | Primary job | Can see | Can do | Cannot do |
|---|---|---|---|---|
| Viewer | Find useful media and request safe reuse | Redacted library, preview, trust state, reuse tier, request path, reference code | Search, open detail, request reuse, create draft package where enabled | See originals/source paths/checksums/private custody/admin notes; approve; download unsafe media; infer ResourceSpace internals |
| Contributor | Submit review-ready intake | Viewer-safe fields plus upload/intake state and own recent batches | Upload photos/light graphics or source links, save drafts, submit intake packet | Approve rights, publish, live import, mutate source media, upload large video/audio through browser |
| Reviewer | Decide rights and review state | Review queue, evidence summaries, operational refs needed for review | Hold/release, approve internal/public only with reviewer/date/scope/notes, request more evidence, queue writeback | Bypass evidence, claim live ResourceSpace writeback, expose originals to normal roles, let AI approve |
| DAM Admin | Operate beta cockpit | Admin readiness, feedback, audit, integration/storage state, redacted ops summaries | Triage feedback/incidents, inspect readiness, export beta feedback, manage next-batch decision | Mark Team Beta GO without owner signoff, deploy/push/mutate hosted data/source media, enable live writeback without approval |

## Route Families

| Route/workflow | Viewer | Contributor | Reviewer | DAM Admin |
|---|---:|---:|---:|---:|
| Library/search | Yes, redacted | Yes, redacted | Yes, review context | Yes, ops context |
| Asset detail | Yes, trust/request first | Yes, trust/request first | Yes, review/action context | Yes, ops context |
| Upload/intake | No | Yes | Review-only visibility | Admin intake oversight |
| Review queue | No | No | Yes | Yes |
| Requests/tasks | Own/request-safe | Own/contributor tasks | Review tasks | All beta ops tasks |
| Packages/saved searches | Draft-safe | Draft-safe | Review/package safety | Admin/package oversight |
| Admin cockpit | No | No | Limited if explicitly routed | Yes |

## Required UI Cues

- Current role must be visible in the shell or page context.
- Beta boundary must be visible: internal beta, preview/review-only, no public downloads, no live writeback.
- Next safe action must be visible when an action is blocked.
- Blocked download/reuse states must explain which evidence is missing.
- Package and saved-search copy must say draft/request/review unless approval evidence exists.
