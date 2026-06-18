# Local Prototype To Beta Architecture

Date: 2026-06-18

## Current Call

The app is a local prototype. Current product score is 5/10 for local DAM prototype usefulness. Target is 8/10 for local prototype honesty, not beta readiness.

Local DAM prototype: improved, still blocked from Team Beta.

Team Beta: NO-GO.

Enterprise beta: NO-GO.

Production: NO-GO.

Use this label until all P0 blockers are closed:

```text
Local prototype only. Not beta-ready.
```

## Storage State Matrix

| State surface | Current state | Durable? | Production truth | Required beta architecture |
|---|---|---:|---|---|
| Audit logs | local-only | No | Runtime JSONL is accountability evidence only, not production audit durability. | Append-only durable audit store with actor, role, source, target, timestamp, immutable payload, backup, and restore proof. |
| Download tickets | local-only | No | Runtime JSON tickets fail closed when durable production writes are missing. | Durable expiring ticket store with one-time consume, approved-rendition scope, and audit link. |
| Review decisions | local-only | No | Portal review decisions can queue locally; ResourceSpace remains final truth. | Durable reviewer decision store with reviewer, date, usage scope, notes, evidence checklist, and sync state. |
| Pending ResourceSpace writes | blocked | No | Live writeback is disabled unless explicit env, field map, smoke proof, and owner approval exist. | Durable sync queue plus ResourceSpace writeback worker with retry, conflict, audit, and failure states. |
| Package drafts | local-only | No | Local JSON drafts do not grant sharing permission or durable package storage. | Durable package/share draft store with asset refs, terms, expiry, recipients, audit, and revocation. |
| Intake batches | local-only | No | Browser intake creates review packets only; production browser file intake needs durable storage or admin/Drive intake. | Durable intake store with originals custody handoff, manifests, reviewer queue, and source mutation protection. |
| Saved searches | local-only | No | Local JSON saved views are prototype convenience, not team profile durability. | User/team-scoped durable profile storage with retention and access policy. |
| Feedback | local-only | Partial path only | Local JSON supports rehearsal triage; KV/Blob must be configured and proven before wider testing. | Durable feedback, attachment storage, owner/status audit trail, export, and incident workflow. |
| Usage events | local-only | No | Local SQLite events must not be reported as success metrics. | Durable event logging for search, view, download, package, and zero-result analytics. |

## Identity Matrix

| Identity path | Current state | Production trusted? | Truth | Required proof |
|---|---|---:|---|---|
| Demo role | local-only | No | Client-selected role is prototype browsing only, not authentication. | Replace with verified user identity. |
| Prototype login | prototype-login | No | Signed role cookie and middleware headers support rehearsal only, not IdP-backed accounts. | Real accounts, lifecycle, group mapping, session expiry, and audit actor proof. |
| Query/body/script override | ignored in production | No | Client role overrides are ignored in production and only work under explicit local env. | No production role authority from client strings. |
| SSO headers | header-shim | Not proven | Header mapping code exists; header presence is not hosted IdP proof. | Hosted IdP assertion, group claims, role map, and route smoke evidence. |
| Production trusted identity | not proven | No | Production identity is not proven; missing trusted headers fail closed to Viewer. | IdP assertion, groups, audit actor integrity, expiry, and no client override authority. |

## P0 Blockers

| Area | Current state | Beta requirement |
|---|---|---|
| Durable audit log | Local/runtime adapter or hosted blocked | Append-only durable audit store with backup/restore proof |
| Download tickets | Gate logic exists, durability not proven hosted | Durable, expiring, auditable tickets |
| Pending review writes | Local pending queue / ResourceSpace writeback not live | Durable review decision queue with sync status |
| Package drafts | Draft-safe package model | Durable package/portal/share draft storage |
| Saved searches | Local/draft behavior | Team-scoped durable saved views |
| Feedback | Local rehearsal storage; partial durable path only | Full durable triage, owner, status, audit trail |
| Usage events | Partial/local | Durable views/downloads/share analytics |
| Identity | Demo role and local overrides remain | Proven user identity, groups, RBAC, audit actor integrity |
| Hosted catalog proof | Missing 181-record hosted proof | Hosted catalog proof with redaction and fail-closed boundaries |
| Owner signoff | Missing | Hali/Enoch signoff record |

## Required Beta Architecture

- Durable database or KV for audit, tickets, packages, saved searches, feedback, usage, and pending writes. Feedback KV alone does not prove the other stores.
- Append-only audit events with actor, role, source, target, timestamp, and immutable payload.
- Real identity provider and group-to-role mapping.
- Download ticket store with expiry, one-time use, approved rendition only, and no original/source exposure.
- Review decision store with reviewer, date, usage scope, notes, evidence checklist, sync state, and ResourceSpace handoff.
- Package/portal draft store with asset refs, allowed renditions, permissions, expiry, terms, recipients, and readiness state.
- Backup and restore test for every durable store.
- Hosted proof packet showing catalog count, redaction, fail-closed downloads, and no source mutation.

## Admin Surface Required Wording

- Local prototype.
- Not beta-ready.
- Durable state missing.
- Identity not production-proven.
- Hosted proof missing.
- Use local rehearsal/pass/hold wording only for teammate testing.
