# 09 Beta Packet - 2026-06-15

## Scope

This doc reconciles older Team Beta GO docs with the current June 15 isolated safety lane.

## Current Packet Decision

Current June 15 posture: NO-GO for broader beta send or public/internal launch.

Reason: P0 query-role elevation was found and fixed locally, but fresh hosted/canonical/custody/durable proof is still missing.

## Historical Context

Older June 11 docs record GO for a tiny six-person internal Team Beta batch:

- `docs/team-beta-go-no-go-packet.md`
- `docs/team-beta-signoff-record.md`
- `docs/team-beta-hosted-access-proof.md`
- `docs/team-beta-seed-media-signoff.md`

Those docs do not approve public launch, production SSO, live ResourceSpace writeback, broad archive reuse, public downloads, source media mutation, staging, deploys, or external communications.

June 15 update: `docs/team-beta-signoff-record.md`, `docs/team-beta-go-no-go-packet.md`, `docs/beta-readiness-command-center.md`, and `docs/team-beta-qa-matrix.md` now carry current NO-GO overrides. `make launch-readiness` now passes only when the signoff record is current NO-GO after the June 15 P0, and `scripts/evidence-packet-guard.mjs` rejects stale invite-GO markers.

## June 15 Override

Fresh P0 found:

- `portal-api-smoke` found `reviewer-query-role-not-trusted`.
- Query params could grant reviewer-like access in local runtime.
- UI polish paused until the bug class was fixed and proven.

Fresh P0 fixed locally:

- Query/body role override no longer works by localhost alone.
- Server-only local override is explicit and disabled in protected-mode proof.
- Trusted SSO headers can exercise local QA without trusting query params.
- API and download-ticket smokes passed after patch.
- Browser QA passed after premium UI pass resumed.

## Still Missing

Current packet cannot recommend GO until these are proven:

- Canonical repo/deployment target and commit.
- Hosted protection and SSO/session boundary.
- Hosted env values with secrets redacted.
- ResourceSpace real/non-real rehearsal scope.
- Google Drive custody.
- Hosted redaction/download behavior after the fix.
- Durable/fail-closed hosted state.

## Tester Role Matrix

Names remain placeholders until Hali confirms the current post-P0 invite scope.

| Tester | Role | Status | Notes |
|---|---|---|---|
| TBD Viewer | Viewer | pending | Search, inspect, confirm blocked downloads and feedback path. |
| TBD Contributor | Contributor | pending | Upload/intake test with harmless metadata only; no sensitive media. |
| TBD Reviewer | Reviewer | pending | Review Queue evidence checklist; blocked approval when evidence missing. |
| TBD DAM Admin | DAM Admin | pending | Readiness/admin review only; no prod env/writeback changes. |

Historical six-person list from June 11 is not reused automatically after the June 15 P0. Hali must confirm whether Jackie Yu, Alan Yu, Enoch Liu, Hali Ding, Joanna Chou, and Richard Pang remain the intended tester set.

## Role-Specific Tasks

Viewer:

- Search for safe terms such as `Bible`, `scripture`, and `Sabbath Service`.
- Open asset detail and verify reuse state is cautious.
- Try a blocked download and confirm it remains locked.
- Report any source path, original URL, checksum, private token, or admin field as P0.

Contributor:

- Open upload/intake.
- Submit harmless test metadata only if Hali approves local/hosted intake test.
- Do not upload real church media, youth media, sensitive media, copyrighted media, source files, or masters.
- Confirm submitted material is `Needs Review / Do Not Publish`.

Reviewer:

- Open Review Queue.
- Verify `Next required evidence` is readable.
- Confirm incomplete approval is blocked.
- Confirm blockers are separated and understandable.
- Do not treat AI suggestions, package membership, or folder labels as rights approval.

DAM Admin:

- Open Admin readiness.
- Confirm writeback is disabled/queued.
- Confirm storage/durability warnings are visible.
- Confirm no prod env, DNS, billing, ResourceSpace prod, or Drive originals are changed.

## Invite Copy Draft

```text
You are invited to a tiny internal TJC Stock Media beta rehearsal. This is not a public media library and not a final rights approval system.

Google Shared Drive remains the master-original warehouse. ResourceSpace remains private DAM/admin software. The portal is a teammate review/search layer for safe workflow testing.

Do not upload real church media, youth/minor media, sensitive testimony/pastoral media, copyrighted media, source files, or masters during this beta. Do not forward links.

Blocked downloads are expected when rights, people/minors, approved derivatives, or review evidence are unclear. Packages, tags, collections, AI suggestions, and approved folders do not grant permission to reuse media.

Stop testing and notify Hali immediately if you see a source path, original URL, checksum, private admin note, secret-like token, unexpected download, live ResourceSpace writeback, or any media that appears unsafe for beta.
```

Do not send this invite copy from Codex. Hali owns final approval and sending.

## Feedback Process

| Item | Value |
|---|---|
| Feedback owner | Hali pending confirmation |
| Backup | pending |
| Labels | P0 privacy/source/download/writeback, P1 workflow blocker, P2 confusing UI/copy, P3 polish |
| First response | Stop test immediately for P0 |
| Export path | pending durable hosted store proof |

## Stop Conditions

- Anonymous or role-spoofed access to protected surfaces.
- Viewer/Contributor sees source/original/private/admin data.
- Blocked or unsafe media downloads.
- Demo/fallback data appears as real beta data.
- Live ResourceSpace writeback happens without explicit approval.
- Google Drive originals are touched.
- Hosted state claims success while silently disappearing.
- Secrets or private paths appear in UI, API, docs, screenshots, or chat.

## Decision

Treat older tiny-beta GO docs as historical, scope-limited evidence. Current June 15 readiness packet stays NO-GO until open P0 gates pass.

Machine check: `make launch-readiness` reports `Team Beta GO/NO-GO packet blocks invites until human signoff` and `Team Beta human signoff record is current NO-GO after June 15 P0`.

June 15 hardening at `2026-06-15T15:39:57Z`: `docs/team-beta-go-no-go-packet.md` now records launch-readiness as `failures=0`, `warnings=3`, including `local free disk below 10 GiB`, and current local smoke examples use the actual safe-lane `BASE_URL=http://localhost:4871`. `scripts/evidence-packet-guard.mjs` and `make evidence-packet-guard-test` now reject stale `warnings=2` copy and stale `localhost:4868` commands in the Team Beta packet.

## Proof Record

| Field | Value |
|---|---|
| Date | 2026-06-15 |
| Commit SHA | `a22497e96004024928128990f432806b768930a6` |
| Repo/branch | `codex/safe-ui-beta-proof-2026-06-15` |
| Environment | isolated local worktree; hosted not proven |
| Base URL | `http://localhost:4871` for local proof |
| Role/persona | Viewer, Contributor, Reviewer, DAM Admin |
| Command or manual step | reconciled older beta packet, current P0 proof, missing hosted/custody/durable gates |
| Expected | beta packet ready for Hali approval without sending invites |
| Actual | packet draft exists but remains blocked pending Hali inputs and external proof |
| Result | BLOCKED / NO-GO |
| Evidence path | this file |
| Secrets redacted | yes |
| Follow-up | Hali confirms tester list, roles, durable feedback path, and final invite decision |
