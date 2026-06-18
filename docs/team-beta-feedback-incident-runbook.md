# Team Beta Feedback and Incident Runbook

Last updated: 2026-06-11

Use this for the internal Team Beta test round only. It is an operations runbook for feedback triage, stop-test decisions, and agent handoff. It does not approve production launch, public publishing, live ResourceSpace writeback, source/original downloads, or source media changes.

## Current Gate

AI-preparable triage workflow is ready when this runbook is present and feedback smoke evidence remains green. The invite gate is still human-blocked until these owner fields are filled:

| Gate | Required human owner | Fill before invites |
|---|---|---|
| Primary feedback triager | Hali until delegated | Name, contact channel, watch window |
| Backup feedback triager | TBD | Name, contact channel, watch window |
| Incident lead | TBD | Name, authority to pause/resume test |
| Rights/media reviewer | TBD | Name, preview-only seed signoff |
| Tech/env owner | TBD | Hosted env confirmation for feedback, writeback, and download gate |
| Access coordinator | TBD | Named tester list and private URL sharing policy |

Do not widen beyond the tiny first batch unless primary and backup triagers are both named. Backup triager is required because a P0 report must be acknowledged within 15 minutes during active testing.

## Watch Plan

| Watch surface | Who watches | Cadence | What to look for |
|---|---|---|---|
| Admin -> Feedback Inbox | Primary triager; backup triager if primary unavailable | Every 15 minutes during active test windows; once at end of day | New reports, critical/high severity, duplicate clusters, agent-ready candidates |
| In-app Task Mode reports | Testers submit; triager reviews in Feedback Inbox | Continuous during test | Role, route, task, severity, expected, actual, screenshot/attachment |
| Admin -> Readiness | Tech/env owner plus incident lead | Before invite send and after any hosted env change | Feedback storage mode, open critical count, writeback disabled/queued, download gate state |
| Invite channel | Access coordinator plus incident lead | Before send; immediately on stop-test | Who has URL, whether testers need pause/resume notice |
| Manual fallback template | Primary triager | Only if app feedback unavailable | `docs/teammate-feedback-template.md` reports copied into triage notes or follow-up issue export |

Preferred capture path is the in-app Report issue button in Task Mode. Use the template only when the app is unavailable.

## Severity Workflow

The app stores severity as `critical`, `high`, `medium`, and `low`. Triage uses P-levels:

| P-level | App severity | Examples | Required action |
|---|---|---|---|
| P0 | `critical` | Security/privacy leak; source path, checksum, master/original, private storage, signed URL, or ResourceSpace-internal detail visible to non-admin; restricted or non-portal-ready media downloads; public/internal reuse implied without reviewer/date/scope; live writeback claimed when queued/disabled; sensitive/private/unreleased/youth-identifiable/copyrighted media visible or uploaded; role gate bypass | Stop active testing. Acknowledge within 15 minutes. Capture safe evidence. Mark status `triaged`, then `agent-ready` only after repro and owner note. Fix or explicitly no-go before any more invites. |
| P1 | `high` | Core task blocked; broken route; feedback cannot submit/export; reviewer evidence lock broken but no unsafe release; Admin cannot see readiness/feedback; search/review/upload path prevents assigned mission | Continue only if incident lead confirms core mission still testable. Fix or document as known limit before next batch. Export as `agent-ready` when repro is clear. |
| P2 | `medium` | Confusing copy, missing recovery guidance, search relevance weakness, mobile friction, unclear beta/production distinction, slow workflow that does not block mission | Batch for post-test cleanup unless it blocks core task. Mark `triaged`; move to `agent-ready` when scoped for implementation. |
| P3 | `low` | Visual polish, wording preference, minor layout issue, non-blocking suggestion | Keep as polish backlog. Mark `triaged` or `wont-fix` with note. |

Status flow:

1. `new`: tester-submitted, not yet reviewed.
2. `triaged`: primary or backup triager assigned P-level, added note, and decided stop/continue.
3. `agent-ready`: repro, expected/actual, route, role, and owner decision are enough for implementation.
4. `fixed`: validated fix or documented operational resolution.
5. `wont-fix`: intentionally deferred or out of beta scope, with note.

## Triage Steps

1. Open Admin -> Feedback Inbox as DAM Admin.
2. Click Refresh.
3. Filter Status = `new`.
4. For each record, confirm role, route, task, expected, actual, attachment, device, and browser.
5. Assign P-level using the table above.
6. Set app severity: P0=`critical`, P1=`high`, P2=`medium`, P3=`low`.
7. Add an Admin note in this format:

```text
P-level:
Decision: stop-test / continue / known-limit / duplicate
Owner:
Evidence safe to share:
Repro:
Next action:
```

8. Set status to `triaged`.
9. For implementation work, tighten note until an agent can act without asking for missing basics, then set status to `agent-ready`.
10. Export agent-ready packet at end of test window and immediately after any P0/P1 cluster.

## Export Path

UI path:

1. Admin -> Feedback Inbox.
2. Set filters before export:
   - Status: `agent-ready` for implementation handoff.
   - Severity: `critical` or `high` for urgent export, or `all` for end-of-window export.
   - Role/route filters only when handing off a narrow cluster.
3. Click Export JSON.
4. Save the downloaded file using this naming pattern:

```text
docs/feedback/tjc-beta-feedback-YYYY-MM-DD-agent-ready.json
docs/feedback/tjc-beta-feedback-YYYY-MM-DD-p0-p1.json
```

API path:

```bash
mkdir -p docs/feedback
curl -sS \
  -H "Cookie: <trusted-beta-or-sso-admin-session>" \
  "https://tjc-stock-media.vercel.app/api/beta-feedback/export?status=agent-ready" \
  -o docs/feedback/tjc-beta-feedback-$(date -u +%F)-agent-ready.json
```

For urgent P0/P1:

```bash
mkdir -p docs/feedback
curl -sS \
  -H "Cookie: <trusted-beta-or-sso-admin-session>" \
  "https://tjc-stock-media.vercel.app/api/beta-feedback/export?status=agent-ready&severity=critical" \
  -o docs/feedback/tjc-beta-feedback-$(date -u +%F)-p0.json
curl -sS \
  -H "Cookie: <trusted-beta-or-sso-admin-session>" \
  "https://tjc-stock-media.vercel.app/api/beta-feedback/export?status=agent-ready&severity=high" \
  -o docs/feedback/tjc-beta-feedback-$(date -u +%F)-p1.json
```

Export packet schema is `tjc-beta-feedback-export.v1`. It includes filters, counts, and records. The API is DAM Admin only through trusted beta session/SSO; Viewer export must stay denied.

Local fallback storage path is `data/runtime/beta-feedback.json`. Hosted beta should use Vercel KV for durable feedback storage and Vercel Blob for attachments before widening beyond tiny internal testing.

## Stop-Test Triggers

Stop the active test batch immediately for any P0:

- Non-admin sees source path, master/original path, checksum, private storage, signed URL, ResourceSpace-internal detail, or original filename where it should be redacted.
- Viewer, Contributor, or Reviewer can download restricted, Needs Review, archive-only, non-portal-ready, thumbnail-only, master, or source media.
- App says ResourceSpace writeback succeeded when hosted writeback is disabled/queued.
- Review approval bypasses required reviewer, date, usage scope, people/minors, rights, or note evidence and implies public/internal reuse.
- Sensitive, private, unreleased, youth-identifiable, sacrament-sensitive, testimony-sensitive, hymn-rights-unclear, or copyrighted media appears reusable without review.
- Beta URL is forwarded outside named internal testers.
- Feedback capture/export is broken during a test window and testers are reporting safety issues through another channel.

P1 may pause only the affected role/path if the incident lead confirms no P0 risk and the remaining mission is still testable.

## Incident Response

1. Pause: incident lead tells testers to stop the affected task or full beta batch.
2. Contain: access coordinator stops further URL sharing. Do not delete, rename, move, or mutate source media.
3. Capture: triager records role, route, asset id if visible, task, expected, actual, timestamp, browser/device, screenshot only if it does not expose private/source material.
4. Classify: set P0/P1/P2/P3 and app severity. P0 is `critical`.
5. Preserve: leave source media untouched. Keep ResourceSpace writeback disabled/queued. Do not print secrets or private URLs in notes.
6. Route: rights/media issues go to rights/media reviewer; env/writeback/download gate issues go to tech/env owner; access leak goes to access coordinator and incident lead.
7. Decide: incident lead records one of `resume`, `resume affected role only`, `hold next batch`, or `no-go until fixed`.
8. Export: mark implementation-ready records `agent-ready` and export JSON.
9. Verify: after fix or operational decision, rerun relevant smoke:
   - `BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe`
   - Mutating hosted verification only with approval: `PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1 PORTAL_HOSTED_SMOKE_APPROVED_BY=<owner-or-ticket> BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-smoke`
   - `BASE_URL=http://localhost:4871 make portal-feedback-smoke`
   - `BASE_URL=http://localhost:4871 make portal-beta-rehearsal`
   - Add `portal-download-ticket-smoke`, `portal-writeback-guard-smoke`, or `portal-browser-qa` for related incidents.
10. Resume: send tester resume wording only after incident lead approves.

## Tester Notification Wording

Stop all testing:

```text
Please pause TJC Stock Media beta testing now. We are reviewing a possible safety issue. Do not continue tasks, upload files, share links, or retry downloads until we send a resume note. If you already saw the issue, submit one Report issue entry with role, route, expected, and actual. Do not include private/source media details in screenshots.
```

Stop affected task only:

```text
Please pause the [task/role] path for now while we review a beta issue. Other assigned beta tasks may continue. Do not retry the paused path or share the beta link outside this group.
```

Need more evidence:

```text
Could you add one Report issue entry with your role, route, device/browser, what you expected, what happened, and safe repro steps? Please avoid screenshots that expose private/source media, people/minors, or original file details.
```

Resume testing:

```text
Beta testing may resume for [scope]. The reviewed issue is [fixed / documented as a known beta limit / isolated to a paused path]. Continue using only your assigned trusted beta session or SSO identity and Report issue for anything confusing or unsafe.
```

Close next-batch gate:

```text
We are holding the next beta batch until the current P0/P1 items are resolved or explicitly accepted as beta limits. Please do not forward the URL or invite more testers.
```

## Evidence Readiness

Known current evidence from `docs/beta-readiness-command-center.md` and `docs/team-beta-qa-matrix.md`:

- Local and hosted smoke evidence is green for the covered beta workflow.
- Hosted smoke covers feedback POST, non-admin feedback denial, DAM Admin feedback inbox, and Viewer unsafe download block.
- Feedback smoke covers submit, sanitization, validation, Admin list, patch, agent-ready export, and readiness storage reporting.
- Browser QA report at `docs/screenshots/qa/browser-qa-report.json` shows 17 pages, 1440/1280/1024/768/390/320 widths, 23 screenshots, zero failures, zero warnings, zero console errors, and zero network failures at `2026-06-11T18:30:56.411Z`.
- No `.runtime/beta-rehearsals/summary.json` artifact is present in this worktree; command-center notes say the latest beta rehearsal passed and wrote local evidence under `.runtime/beta-rehearsals/`.

## Human Fill-Ins Before Invite Send

Copy this block into the command center or launch note before sending invites:

```text
Primary feedback triager:
Backup feedback triager:
Incident lead:
Rights/media reviewer:
Tech/env owner:
Access coordinator:
Active test window:
Triage watch cadence:
Private URL sharing policy confirmed by:
Hosted feedback storage checked by:
Hosted writeback disabled/queued checked by:
Preview-only seed visibility signed off by:
Resume/no-resume authority:
```
