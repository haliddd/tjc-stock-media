# 00 Hali Dependencies - 2026-06-15

## Scope

This doc records owner-dependent gates for the isolated safe UI beta-proof run.

- Source checkout: `/Users/halim4pro/Desktop/MVP/tjc-stock-media`
- Isolated worktree: `/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run`
- Branch: `codex/safe-ui-beta-proof-2026-06-15`
- Start commit: `a22497e96004024928128990f432806b768930a6`
- Current HEAD commit: `a22497e96004024928128990f432806b768930a6`
- Actual BASE_URL for local proof: `http://localhost:4871`
- Secrets redacted: yes

## Owner Dependencies

| Dependency | Needed By | Needed Owner Action | Status |
|---|---|---|---|
| Canonical repo/deployment confirmation | Monday | Confirm exact repo, branch, deployment alias, and commit intended for beta. | pending |
| Vercel project access or env confirmation | Monday | Confirm Vercel project/env values read-only with secrets redacted. No mutation approved here. | blocked |
| Hosted beta URL | Monday | Confirm stable hosted beta URL and whether it is protected. | pending |
| ResourceSpace endpoint/API user status | Monday | Confirm real read-only ResourceSpace path or declare non-real rehearsal. | blocked |
| Durable store decision | Monday | Confirm Vercel KV, Blob, other durable store, or disabled/fail-closed state. | blocked |
| Sanitized Google Drive custody proof approach | Monday | Confirm acceptable proof format that does not expose private paths/media. | pending |
| Named tester list | Wednesday | Confirm tester names and whether June 11 six-person list still applies after June 15 P0. | pending |
| Intended role per tester | Wednesday | Confirm Viewer/Contributor/Reviewer/DAM Admin assignment per tester. | pending |
| Invite send ownership | Wednesday | Confirm Codex must not send invites; Hali owns final send/no-send. | pending |
| Final go/no-go ownership | Wednesday | Confirm final decision remains Hali-owned. | pending |

## Proof Record

| Field | Value |
|---|---|
| Date | 2026-06-15 |
| Commit SHA | `a22497e96004024928128990f432806b768930a6` |
| Repo/branch | `codex/safe-ui-beta-proof-2026-06-15` |
| Environment | isolated local worktree |
| Base URL | `http://localhost:4871` for local proof |
| Role/persona | operator / Hali dependency owner |
| Command or manual step | inspected repo docs, older beta packets, worktree state |
| Expected | dependencies named with available/blocked/not needed/pending status |
| Actual | dependency ledger created; external proof still missing |
| Result | BLOCKED for broader beta |
| Evidence path | this file |
| Secrets redacted | yes |
| Follow-up | Hali supplies canonical, hosted, ResourceSpace, custody, durable-state decisions |

## Safety Boundaries

Not approved or touched in this run:

- Vercel production env mutation.
- ResourceSpace production mutation.
- Google Drive originals.
- DNS or billing.
- Live writeback.
- Tester invites.
- Public launch.
- Source media.

## Decision

Current posture remains NO-GO. Local P0 query-role elevation is fixed and proven, but owner-dependent hosted/custody/durable gates are still open.
