# V3-06 Storage + Identity Reality

Date: 2026-06-18

## Product Call

Local DAM prototype: 5/10 current usefulness.
Target: 8/10 local prototype honesty.
Team Beta: HOLD.
Production: HOLD.

Do not use beta-ready wording. Do not deploy, push, mutate hosted state, change env or credentials, mutate source media, write back to ResourceSpace, weaken download/review gates, send public invites, or claim production readiness.

## Storage Reality Matrix

| Surface | State | Reality | Remaining blocker |
|---|---|---|---|
| Audit logs | local-only | Runtime JSONL accountability evidence only. | Append-only durable audit store, actor integrity, backup, restore proof. |
| Download tickets | local-only | Runtime JSON ticket mint/consume; production writes fail closed without durable store. | Durable expiring ticket store with one-time consume proof. |
| Review decisions | local-only | Portal decisions can queue locally; ResourceSpace remains truth. | Durable decision store and verified ResourceSpace sync handoff. |
| Pending ResourceSpace writes | blocked | Live writeback disabled unless explicit env, field map, smoke proof, and owner approval exist. | Durable sync queue, retry/conflict states, and live writeback proof. |
| Package drafts | local-only | Local JSON drafts do not grant share permission. | Durable package/share draft store with audit, expiry, recipients, and revocation. |
| Intake batches | local-only | Browser intake creates review packets only; no source media mutation. | Durable intake storage or admin/Drive intake path for production. |
| Saved searches | local-only | Local JSON saved views are prototype convenience. | User/team-scoped durable profile storage. |
| Feedback | local-only | Local JSON supports rehearsal triage; KV/Blob need proof before wider testing. | Durable feedback, attachments, owner/status audit trail, export proof. |
| Usage events | local-only | Local SQLite events must not be reported as success metrics. | Durable event store for search/view/download/package analytics. |

## Identity Reality Matrix

| Identity path | State | Reality | Remaining blocker |
|---|---|---|---|
| Demo role | local-only | Client-selected role is not authentication. | Verified user identity required. |
| Prototype login | prototype-login | Signed role cookie supports rehearsal only, not IdP-backed accounts. | Real accounts, lifecycle, groups, expiry, actor proof. |
| Query/body/script override | ignored in production | Overrides are disabled in production and require explicit local env. | No production authority from client role strings. |
| SSO headers | header-shim | Mapping code exists; hosted IdP proof is missing. | Hosted assertion, group claims, role map, smoke evidence. |
| Production trusted identity | not proven | Missing trusted headers fail closed to Viewer. | IdP assertion, groups, actor integrity, expiry, no override authority. |

## Admin Surface Changes

- Shows `Local prototype only. Not beta-ready. Durable state missing. Identity not production-proven. Hosted proof missing.`
- Replaces release/go framing with local rehearsal/pass/hold wording.
- Adds storage truth table to Admin Storage.
- Adds identity truth table to Admin Users & Access.
- Keeps blockers intact for hosted 181 proof, durable/fail-closed boundary, and owner signoff.

## Verification

Commands run:

```bash
npm --prefix frontend run typecheck
node scripts/storage-honesty-guard.mjs
node scripts/api-identity-guard.mjs
node scripts/storage-honesty-guard-test.mjs
```

Result:

- Typecheck passed.
- Storage honesty guard passed.
- API identity guard passed for 19 routes.
- Storage honesty guard self-test passed.
