# Connected Admin Cockpit Readiness - 2026-06-14

## Goal

DAM Admin must be able to see whether the system is truly connected and what blocks teammate beta.

## Current Implementation

`frontend/lib/dam-readiness-integrations.ts` already builds modules for:

- ResourceSpace metadata source.
- ResourceSpace live API.
- ResourceSpace field map.
- ResourceSpace preview proxy.
- ResourceSpace review writeback.
- Runtime state durability.
- Pending review writes.
- Audit log.
- Real authentication / SSO.
- Role gates.
- Google Shared Drive master originals.
- Amazon S3 derivative delivery.
- Approved copy delivery.
- Media Library UI.
- Usage analytics.
- Beta feedback storage.
- Saved search storage.
- Package draft storage.
- Brand kit collections.
- Package publishing.

## Required Module Contract

Each Admin module must show:

- Status.
- Evidence.
- Last checked or generated state when available.
- Action link or next step.
- Launch blocker yes/no.

## Current Readiness Table

| Module | Status | Evidence | Last checked | Action link | Launch blocker |
| --- | --- | --- | --- | --- | --- |
| ResourceSpace mode | Implemented | `metadata-source`, `resourcespace-live-api` | Runtime request | Admin Integrations | Yes until hosted read proof |
| Data source mode live/export/fallback | Implemented | `MediaSourceStatus.adapter` and SourcePill | Runtime request | Admin Integrations | Yes if fallback |
| Drive custody manifest | Documented, env-detected | `master-originals` | Runtime env check only | Custody docs | Yes |
| Durable store status | Implemented truth, blocked | `runtime-state-store` | Runtime request | Admin System Health | Yes |
| Approved derivative delivery | Implemented local proof | `approved-copy-delivery` | Runtime request | Admin Integrations | Yes until real derivative/durable ticket proof |
| Download ticket status | Implemented in gate/store | Required audit/ticket path | Local smoke | Download smoke | Yes for hosted production |
| Feedback store status | Implemented | `beta-feedback-storage` | Runtime request | Feedback inbox | Yes until KV hosted proof |
| Package store status | Implemented | `package-draft-storage` | Runtime request | Package drafts | Yes |
| Audit store status | Implemented local truth | `audit-log` | Runtime request | Audit section | Yes |
| Pending writeback status | Implemented | `pending-review-writes`, `review-writes` | Runtime request | Review queue/Admin | Warning/yes if live writeback claimed |
| Vercel hosted readiness | Documented | Env/setup docs | Not checked | Vercel docs/runbook | Yes |
| SSO/origin protection | Implemented shim | `auth` | Runtime env check | Admin Access | Yes |
| Backup/restore proof | Scripts/docs only | `make backup`, `make restore-test` planned | Not run in this phase | Ops docs | Yes |
| Photo-only beta scope | Implemented in policy/docs | Media type/search policy | Runtime routes | Beta packet | Warning |

## Role Boundary

Admin diagnostics must not leak to Viewer/Contributor. Normal roles receive `sourceForRole()` media-library labels and role-safe payloads.

## Gaps

- Last-checked timestamps should be stored per integration after real hosted smoke.
- Runtime store modules need per-store durable adapter status, not only generic local-filesystem truth.
- Vercel protection/env status needs dashboard proof.
- Backup/restore needs external destination and restore evidence.
