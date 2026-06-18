# Asset Status State Machine

Last updated: 2026-06-18

Purpose: keep ingest, rights, publish, delivery, and sync states separate. A single "approved" label is not enough for an enterprise DAM.

## Ingest

| State | Entry | Exit |
|---|---|---|
| Received | Upload/source link/import snapshot recorded | Metadata packet created |
| Needs Metadata | Required title/source/date/ministry evidence missing | Required metadata completed |
| Needs Review | Default state after intake/import | Reviewer records decision |
| Held | Reviewer blocks reuse pending evidence | Evidence added or asset rejected |
| Archived Reference | Kept for archive context only | Admin/reviewer changes with evidence |

## Rights

| State | Meaning |
|---|---|
| Unknown | No verified rights evidence |
| Needs Evidence | Reviewer knows exactly what proof is missing |
| Approved Internal | Internal use only for stated scope |
| Approved Public | Public/external use only for stated scope |
| Restricted | Sensitive or limited use |
| Do Not Use | Block reuse |

## Publish

| State | Meaning |
|---|---|
| Do Not Publish | Default and safe state |
| Needs Review | User should request/review before reuse |
| Internal Only | Internal approved derivative may be used within scope |
| Public Approved | Public derivative may be used within scope |
| Archive Only | Discoverable as archive/reference but not reusable |

## Delivery

| State | Meaning |
|---|---|
| Blocked | No approved derivative or evidence/ticket gap |
| Ticket Required | Download can proceed only through auditable ticket |
| Approved Derivative Ready | Safe copy exists and role/scope allow access |
| Expired | Rights, ticket, or package window expired |

## ResourceSpace Sync

| State | Meaning |
|---|---|
| Read Only | Beta reads/snapshots only |
| Disabled | Writeback is off by config/policy |
| Queued | Portal has pending decision evidence only |
| Failed | Sync failed and must be retried/reviewed |
| Confirmed By Re-read | ResourceSpace state verified after writeback |

## Allowed Transitions

- Intake/import always starts `Needs Review / Do Not Publish`.
- Public/internal approval requires reviewer, review date, usage scope, notes, and evidence.
- Package draft/request creation does not change rights or publish state.
- ResourceSpace sync state does not become `Confirmed By Re-read` from a local portal decision.
- Missing durable audit/ticket storage sends delivery to `Blocked` or `Ticket Required`, never silent success.
