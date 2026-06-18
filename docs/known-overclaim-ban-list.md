# Known Overclaim Ban List

Last updated: 2026-06-18

Purpose: phrases UI/docs/API responses must not use unless the required evidence is present.

| Banned/conditional phrase | Allowed only when | Safer beta wording |
|---|---|---|
| Production-ready | Production identity, durable storage, ops, monitoring, backup/restore, security review, and owner release approval are complete | Local prototype / production NO-GO |
| Public approved | Reviewer/date/scope/notes/evidence and approved derivative exist | Needs review / request public approval |
| Synced to ResourceSpace | Writeback ran and ResourceSpace was re-read successfully | Queued for review/writeback disabled |
| Durable archive | Durable DB/blob/object storage, backups, restore proof, retention policy exist | Local JSON / snapshot / fail-closed beta state |
| Safe to publish | Rights, people/minors, doctrine/sacrament, music, testimony, scope, and derivative checks pass | Request review before publishing |
| Download approved | Approved derivative, role, scope, ticket, and audit storage all pass | Download blocked or ticket-gated |
| Imported into archive | Source custody and import audit completed with operator approval | Intake packet received / snapshot loaded |
| ResourceSpace truth updated | Live writeback approved, executed, and verified | Portal decision queued; ResourceSpace unchanged |
| Full archive | Full inventory/migration/backfill complete | 181-record beta snapshot or limited pilot catalog |
| SSO/production auth | Real IdP/group mapping live and verified | Simulated QA access / beta session |

Any worker adding user-facing copy must prefer the safer beta wording unless the evidence manifest marks the stronger claim green.
