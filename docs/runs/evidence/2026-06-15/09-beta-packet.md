# Teammate Beta Packet

Date: 2026-06-15  
Commit SHA: a22497e96004024928128990f432806b768930a6  
Repo/branch: `codex/week15-20`; canonical hosted branch not confirmed  
Environment: draft packet only; invites not sent  
Base URL: candidate hosted URL `https://tjc-stock-media.vercel.app`, not proven current for this commit  
Role/persona: Viewer, Contributor, Reviewer, DAM Admin  
Command or manual step: packet drafted from current proof status  
Expected: honest, safe packet ready for Hali review after proof gaps close  
Actual: draft created with placeholders and blockers  
Result: BLOCKED  
Evidence path: `docs/runs/evidence/2026-06-15/09-beta-packet.md`  
Secrets redacted: yes  
Follow-up: Hali confirms tester names/roles, hosted URL/protection, real/non-real beta scope, and final approval.

## Status

Draft only. Do not send invites.

## Tester Role Matrix

| Tester | Role | Status | Notes |
|---|---|---|---|
| TBD 1 | Viewer | pending | Hali to confirm. |
| TBD 2 | Contributor | pending | Hali to confirm. |
| TBD 3 | Reviewer | pending | Hali to confirm. |
| TBD 4 | DAM Admin | pending | Hali to confirm. |

## Core Rules For Testers

- ResourceSpace is private admin software, not the normal teammate portal.
- Google Shared Drive keeps originals and source custody.
- Packages, tags, collections, AI suggestions, and approved folders do not grant permission by themselves.
- Blocked downloads are expected when rights, people, minors, sacrament, worship, sermon, music, contributor status, or derivative readiness are unclear.
- Do not upload sensitive media during beta.
- Do not upload private people media, youth-identifiable media, copyrighted media, pastoral/confidential content, or anything that should not be used in a test system.
- Do not forward beta links, passwords, screenshots with private info, or downloaded media.
- Report confusing access, fake-looking data, private field leakage, or unexpected download ability immediately.

## Role Tasks

### Viewer

- Open beta portal through approved access path.
- Search for a known topic.
- Open asset detail.
- Confirm reuse/download state is understandable.
- Try a blocked download and confirm it remains blocked.
- Report any source path, checksum, original URL, private admin notes, or custody internals seen.

### Contributor

- Review upload/send-media instructions.
- Submit harmless test metadata only if enabled.
- Confirm submitted item is Needs Review / Do Not Publish.
- Confirm contributor cannot self-approve or expose originals.

### Reviewer

- Open review queue.
- Inspect clearance, blocker, people/minors, usage scope, and note requirements.
- Confirm approval requires evidence and notes.
- Confirm live ResourceSpace writeback is disabled or queued unless explicitly approved.

### DAM Admin

- Open readiness/admin view.
- Confirm source truth, storage state, ResourceSpace status, feedback state, and writeback posture are honest.
- Export or inspect feedback only if authorized.
- Confirm normal-role redaction remains intact.

## Invite Copy Draft

Subject: TJC Stock Media tiny internal beta test

Please test the TJC Stock Media portal only through the access link Hali provides. This is a controlled internal beta, not public media approval and not a replacement for ResourceSpace or Google Shared Drive custody. Originals stay in Google Shared Drive. ResourceSpace remains private admin/DAM software.

Use your assigned role. Do not upload sensitive media. Do not forward links or passwords. Blocked downloads are expected when rights are unclear. Report anything confusing, especially fake-looking data, private field leakage, or downloads that seem too permissive.

## Feedback Process

- In-app feedback if durable storage is proven.
- If feedback durability is blocked, use Hali-approved backup channel only.
- Triage labels: `access`, `real-data`, `demo-confusion`, `redaction`, `download-safety`, `durable-state`, `review-rights`, `ui-confusion`, `blocker`, `follow-up`.

## Stop Conditions

- Anonymous access reaches protected beta app.
- Role spoofing elevates access.
- Demo/fallback data appears as real DAM data.
- Viewer/Contributor sees source path, checksum, original URL, private admin notes, or custody internals.
- Blocked media downloads.
- Hosted feedback/tickets/audit claim success while silently losing state.
- Live ResourceSpace writeback mutates data without explicit approval.
- Source media is moved, renamed, deleted, uploaded, or modified.
- Secrets or sensitive paths appear in UI, screenshots, docs, logs, or chat.

## Known Limitations

| Limitation | Status | Beta impact |
|---|---|---|
| Canonical repo/deployment not confirmed | blocker | Cannot invite. |
| Vercel protection/env not proven | blocker | Cannot invite. |
| Real ResourceSpace read not proven | blocker unless non-real rehearsal | Cannot claim real DAM beta. |
| Hosted durable state not proven | blocker or limitation | Critical workflows must fail closed/disable. |
| Google Drive custody proof not supplied | blocker | Cannot claim source custody proof. |
| Tester names/roles pending | blocker | Cannot send packet. |
