# Durable State Proof Plan - 2026-06-14

## Goal

Feedback, packages, saved searches, download tickets, audit events, pending writeback queue, and usage analytics must be durable in hosted mode before teammates rely on them.

## Current Hardening

This run changed hosted feedback behavior:

- `betaFeedbackStorageUnavailableError()` returns 503 in hosted runtime when KV config is missing.
- `createBetaFeedback`, `listBetaFeedback`, and `patchBetaFeedback` throw durable-storage errors in hosted runtime when KV is missing or failing.
- Feedback API routes return explicit 503 instead of falling back to local/memory.

This run also changed generic runtime honesty:

- `durableRuntimeStoreConfigured()` returns `false`.
- `runtimeStoreDiagnostics()` says Vercel KV is implemented for beta feedback only, not audit logs, tickets, package drafts, saved searches, or pending write queues.
- Production runtime file writes still fail closed through `assertRuntimeWriteAllowed()`.

## State Matrix

| State | Current store | Env vars | Local fallback | Hosted behavior | Fail-closed behavior | Backup/export | Admin visibility | Smoke test |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Feedback | KV if configured, otherwise local JSON | `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `BETA_FEEDBACK_ENABLED` | Yes, local/private only | 503 if KV missing/fails | Yes after this run | Export route if storage readable | Admin feedback inbox | `make portal-feedback-smoke` local; hosted needs approval if mutating |
| Feedback attachments | Blob future/current optional | `BLOB_READ_WRITE_TOKEN` | No durable proof | Not proven | Should reject/disable attachments if Blob missing | Provider export needed | Admin readiness | Hosted attachment smoke after approval |
| Saved searches | Local JSON | Future durable store env | Yes | Production write blocked by runtime guard | Yes for production local-file writes | Manual local file only | Admin readiness says local | `make portal-api-smoke`, saved-search smoke if available |
| Packages/distribution drafts | Local JSON | Future durable store env | Yes | Production write blocked by runtime guard | Yes for production local-file writes | Manual local file only | Admin readiness says local | `make portal-package-smoke` |
| Download tickets | Runtime filesystem | Future durable ticket store env | Yes | Production write blocked without generic durable adapter | Required audit/ticket failure blocks delivery | None proven | Admin delivery status | `make portal-download-ticket-smoke` |
| Audit events | Runtime JSONL | Future audit store env | Yes | Production writes blocked for required audit, non-required events drop safely | Downloads fail closed if required audit cannot persist | Local JSONL only | Admin audit readiness | `api-audit-guard`, download smoke |
| Pending writeback queue | Runtime/local file | ResourceSpace writeback env + future durable queue | Yes | Production write blocked without durable adapter | Queued state cannot claim sync | Local file only | Admin pending writeback module | Review workflow smoke |
| Usage analytics | Local/events if enabled | `PORTAL_USAGE_LOGGING`, `USAGE_ANALYTICS_DSN` | Local only | Not durable | Must not report zero-success as production metric | None proven | Admin readiness | Future analytics smoke |

## Hosted Rule

Hosted Vercel must never say "saved", "queued", "ticketed", "audited", or "submitted" as durable success if the corresponding durable store is unavailable.

## Required Durable Adapter Work

Short-term:

- Keep KV for feedback.
- Keep local JSON fallback local-only.
- Mark saved searches/packages/tickets/audit as not hosted-durable.

Next implementation:

- Add `RuntimeStateAdapter` interface for JSON docs and JSONL events.
- Implement Redis/KV or database-backed adapter.
- Add export/restore command.
- Add hosted write/read smoke with test namespace.
- Add admin status per store with last checked timestamp.

## Launch Blockers

- KV not configured for hosted feedback.
- Generic durable store not implemented for tickets/audit/packages/saved searches/pending writes.
- Restore proof missing.
- Hosted mutating smoke not approved/run.
