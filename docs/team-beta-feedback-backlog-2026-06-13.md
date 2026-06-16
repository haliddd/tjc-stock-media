# Team Beta Feedback Backlog

Last updated: 2026-06-13T05:55Z

Purpose: coordinate internal beta feedback for the completed mature DAM beta and turn safe, triaged teammate reports into a prioritized beta-fix backlog without weakening ResourceSpace, Google Shared Drive, or original/source boundaries.

This artifact does not approve production launch, public publishing, public downloads, live ResourceSpace writeback, source media mutation, source/original access, or a wider tester batch.

## Current Feedback Intake

| Source | Status | Result |
|---|---|---|
| Hosted agent-ready export | Checked via `/api/beta-feedback/export?role=DAM%20Admin&status=agent-ready` | 0 records, 0 critical, 0 high, 0 agent-ready |
| Repo feedback export folder | `docs/feedback/` | No reviewed teammate feedback exports yet |
| Local runtime feedback | `data/runtime/beta-feedback.json` | 7 `new` / `medium` Viewer records from hosted smoke feedback loop; treat as QA smoke evidence, not teammate feedback |
| Invite packet | `docs/team-beta-internal-test-packet.md` | Ready for six named testers only |
| Incident runbook | `docs/team-beta-feedback-incident-runbook.md` | Active triage source of truth |

Current backlog call: no confirmed teammate-submitted P0/P1 issue is available for code triage. Weekend hardening did find launch-safety P0/P1 issues through code audit, not teammate feedback. Treat those as weekend hardening PRs, not teammate feedback volume.

Do not edit app code from this backlog until a P0/P1 report is reproduced and marked `agent-ready`, or until the owner explicitly scopes a non-feedback launch hardening fix.

## Boundary Rules

- ResourceSpace remains metadata, search, and review source of truth.
- Google Shared Drive remains master-original custody.
- Approved folders, packages, collections, saved views, metrics, and AI suggestions are not permission truth.
- Viewer and Contributor roles must not receive source paths, master/original paths, checksums, private URLs, signed URLs, ResourceSpace internals, reviewer evidence, or private notes.
- Viewer downloads remain approved-copy gated only; blocked, Needs Review, Possible Minors, archive-only, or Do Not Use assets must not download.
- Review decisions remain queued/disabled unless live ResourceSpace writeback is separately approved and proven.
- AI may suggest tags only; humans approve rights, people/minors, doctrine, sacrament, hymn/music, testimony sensitivity, and reuse.

## Triage Classification

| P-level | Fix rule | Stop/continue call |
|---|---|---|
| P0 | Fix before any more testing or record explicit no-go | Stop full active batch |
| P1 | Fix or document as known limit before next batch | Continue only if incident lead says core mission still testable |
| P2 | Batch for post-test cleanup unless core task slows to failure | Continue |
| P3 | Keep as polish backlog | Continue |

## Role/Workflow Lanes

| Lane | Role | Workflow | P0/P1 examples |
|---|---|---|---|
| Find and trust | Viewer | Search, detail, blocked download, request review | Unsafe download, source/original leak, archive-only looks reusable, no recovery for assigned search |
| Submit safely | Contributor | Upload/intake, draft metadata, package/collection inspection | Upload implies publish/approval, source/master upload encouraged, package bypasses item review |
| Decide honestly | Reviewer | Queue, evidence lock, review decision, pending write | Approval without required evidence, queued write shown as synced, doctrine/hymn/minors/testimony risk hidden |
| Operate beta | DAM Admin | Readiness, Feedback Inbox, export, launch blockers | Feedback cannot submit/export, Admin overclaims production, metrics treated as approval |
| Source boundary | All roles | ResourceSpace/Shared Drive/original custody | ResourceSpace or Shared Drive replaced by portal copy; originals exposed or mutated |

## Prioritized Backlog

| Priority | Status | Role/workflow | Item | Acceptance |
|---|---|---|---|---|
| P0 | None confirmed | All / source boundary | Hold code edits until a reproduced P0 exists. | Hosted export or Admin inbox shows `critical` + `agent-ready`; incident lead records stop/resume call. |
| P1 | None confirmed | All / core route | Hold code edits until a reproduced P1 exists. | Hosted export or Admin inbox shows `high` + `agent-ready`; repro has role, route, expected, actual, device/browser. |
| P1 | Weekend hardening | Security / feedback | Hosted feedback storage and attachment safety must be deployed and validated before next batch. | Attachments disabled or privately gated; hosted KV failure does not claim saved; Admin can verify feedback works. |
| P1 | Weekend hardening | Security / auth | Hosted beta must require explicit `BETA_SESSION_SECRET` and throttle repeated invalid login attempts. | Focused tests pass; hosted env name confirmed without recording value; no session cookie on rate limit. |
| P1 | Weekend hardening | Viewer / photo-only scope | Normal Viewer/Contributor beta must be photo-only and hide fixture/demo rows. | No audio/video, `demo-fallback`, fixture labels, `@example` creators, source/original/private tokens in normal payloads. |
| P2 | Watch | DAM Admin / feedback operations | Separate smoke-loop feedback from teammate reports so backlog counts do not look like user confusion. | Smoke records are marked `fixed`, `wont-fix`, or labeled as QA smoke before next batch report. |
| P2 | Watch | Viewer / search recovery | Track whether `RE`, `Religious Education`, `Sabbath Service`, `Hymns of Praise`, `baptism`, `Holy Communion`, `testimony`, `children`, and `archive-only` feel TJC-native. | 80%+ testers can find useful results or clear recovery guidance; no sensitive category looks stock-safe without review. |
| P2 | Watch | Viewer / trust language | Track whether testers can distinguish `Portal Ready`, `Needs Review`, `Stock-safe`, `Context-safe`, and `Archive-only` within 60 seconds. | No tester reports that raw `Approved Public`, package membership, collection membership, metrics, or AI suggestions read as permission. |
| P2 | Watch | Contributor / upload | Track whether harmless test upload flow clearly defaults to `Needs Review / Do Not Publish`. | No contributor report says upload appears published, approved, or reusable. |
| P2 | Watch | Reviewer / evidence | Track whether evidence checklist matches real TJC risks: doctrine/sacrament, hymn/music, RE/minors, testimony/pastoral, lifecycle, approved derivative. | Reviewer cannot complete approval without required evidence and note; completed decision states queued/synced/blocked honestly. |
| P2 | Watch | DAM Admin / readiness | Track whether launch blockers are obvious without reading docs. | Admin can identify production SSO, durable storage, live writeback, rights review, and original/master blockers from command center. |
| P3 | Watch | All / polish | Collect wording, layout, mobile nav, and preference feedback after P0/P1/P2 triage. | Cosmetic changes do not alter safety claims or role boundaries. |

## Feedback Collection Steps

1. During active testing, DAM Admin checks Feedback Inbox every 15 minutes.
2. For each `new` report, classify P0/P1/P2/P3 and add admin note with owner, evidence safety, repro, and next action.
3. Mark implementation-ready records `agent-ready` only after role, route, expected, actual, device/browser, and safe evidence are present.
4. Export urgent P0/P1 immediately; export all `agent-ready` records at end of watch window.
5. Save reviewed export only under `docs/feedback/`; do not store raw screenshots, private paths, original/master URLs, people/minors evidence, pastoral testimony details, or secrets.
6. Agents may edit code only for confirmed P0/P1 records, or for lower priorities after owner explicitly scopes implementation.

## Owner Next Actions

| Owner | Next action |
|---|---|
| Hali Ding | Watch first 24 hours, classify reports, export agent-ready JSON. |
| Enoch Liu | Backup triage, access containment, preview-only seed/source boundary check. |
| Jackie Yu, Alan Yu, Joanna Chou, Richard Pang | Run assigned role tasks, report one must-fix before next batch, avoid unsafe screenshots/details. |

## Next-Batch Gate

Do not invite a wider internal batch until:

- P0 count is 0 unresolved.
- P1 count is 0 unresolved or explicitly documented as accepted beta limit.
- Weekend hardening P0/P1 PRs are reviewed, merged by a human, deployed by a human if needed, and hosted evidence is rerun with explicit approval for mutating smokes.
- Feedback export has been reviewed for private/source details before commit.
- Smoke-loop records are excluded from teammate feedback counts.
- Incident lead records resume or hold-next-batch decision.
