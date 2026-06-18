# Approved Delivery Copy Gate Report - 2026-06-14

## Scope

Implemented one approved-delivery gate for normal approved-copy delivery. No merge, deploy, env file change, public share/CDN behavior, original exposure, or live ResourceSpace writeback.

## Files Changed

- `frontend/lib/approved-delivery-gate.ts`
- `frontend/app/api/download/[id]/route.ts`
- `frontend/lib/audit-log.ts`
- `frontend/lib/download-tickets.ts`
- `frontend/lib/media-delivery.ts`
- `frontend/lib/approved-delivery-gate.test.ts`
- `scripts/api-audit-guard.mjs`
- `scripts/api-identity-guard.mjs`
- `scripts/api-payload-guard.mjs`
- `scripts/storage-honesty-guard.mjs`
- `docs/approved-delivery-copy-gate-report-2026-06-14.md`

Unrelated inherited dirty files were not staged or edited for this slice.

## Old Flow

The download route owned most of the transaction directly:

- resolved role/session and client role override
- fetched asset/source
- checked approved-copy access
- consumed or minted tickets
- checked derivative readiness
- assembled blocked and success JSON
- emitted audit events
- returned source envelope details in download responses

That made the route a shallow module with access, ticket, derivative, source, and audit knowledge spread across transport code.

## New Gate Flow

`frontend/lib/approved-delivery-gate.ts` now owns the full transaction:

- actor and role resolution
- asset lookup safety
- portal reuse/access decision
- requested rendition handling
- original/master hard denial and request-only response
- terms gate
- derivative readiness gate
- ticket mint/consume validation
- reserved gate audit ids for ticket issuance
- non-consuming ticket validation before derivative reads
- safe blocked reason normalization
- safe response packets
- required audit emission
- fail-closed internal/audit errors

The route is transport only:

1. read path param/request
2. call `runApprovedDeliveryGate`
3. convert gate result to `NextResponse`

## Policy Changes

No policy broadening.

Hardening only:

- Original/master-like requests now hard-deny through the approved-copy route before ticket consumption.
- Download JSON responses no longer include source envelopes.
- GET derivative unavailable/missing states now produce a safe audited block.
- Valid tickets are not consumed when the derivative is unavailable.
- Approved-download audit persistence is attempted before marking a ticket consumed.
- Ticket mint failures produce a blocked audit/result instead of an allowed gate audit.
- Route no longer directly knows access, ticket, derivative, source, or audit internals.

## Role Visibility Change

Normal download responses expose less:

- No source envelope in approved or blocked download responses.
- No private URL, source path, checksum, original filename, master path, ResourceSpace admin URL, signed URL, or raw source envelope.
- Approved binary delivery still returns only the approved derivative body and safe attachment headers.

## Route Simplification

`frontend/app/api/download/[id]/route.ts` was reduced from route-owned gate orchestration to a small result adapter around `runApprovedDeliveryGate`.

Static guards now enforce this new shape: the route must delegate to `approved-delivery-gate`, while the gate must own one-time tickets, required audit persistence, media-delivery helpers, and id normalization.

## Tests Added

Added `frontend/lib/approved-delivery-gate.test.ts` covering:

- Viewer cannot receive original/master through normal delivery.
- Reviewer and DAM Admin cannot receive original/master through normal delivery.
- Contributor cannot bypass derivative readiness.
- Missing ticket blocks.
- Expired ticket blocks.
- Asset/ticket mismatch blocks.
- Role/ticket mismatch blocks.
- Missing approved derivative blocks.
- Expired rights/consent/recheck state blocks.
- Blocked responses omit private/source/original delivery material.
- Successful ticket issue audits exactly once.
- Successful delivery audits exactly once.
- Ticket mint failure does not create an allowed gate audit.
- Delivery unavailable after ticket validation does not consume the ticket.
- Approved-download audit failure does not consume the ticket.
- Blocked attempts audit safely.
- Download route stays transport-only.

## Guard Results

Passed:

- `git diff --check`
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend test`
- `npm --prefix frontend run build`
- `node scripts/private-source-guard.mjs`
- `node scripts/api-payload-guard.mjs`
- `node scripts/api-audit-guard.mjs`
- `node scripts/storage-honesty-guard.mjs`
- `BASE_URL=http://localhost:4869 PORTAL_DOWNLOAD_TICKET_KEEP_FIXTURE=1 make portal-download-ticket-smoke`
- `make launch-readiness`

Notes:

- `portal-download-ticket-smoke` passed against local `next dev` on port 4869.
- An earlier `next start` smoke attempt failed before the download gate because production-mode local role overrides are ignored without trusted SSO env. No env file was changed.
- `make launch-readiness` passed with one existing warning: `.env` contains placeholder values.
- Code-review subagent flagged ticket/audit divergence. The gate now covers mint failure, derivative failure, and approved-download audit failure with tests.

## Remaining Risks

- Ticket mint and audit writes are still local-runtime file operations, not one durable database transaction.
- If a consumed-ticket state write failed after an approved-download audit succeeds, local filesystem semantics could still leave a narrow divergence. Production needs durable transactional storage for complete atomicity.
- Ticket material still travels in a short-lived one-time query parameter, matching current smoke contract.
- Local smoke depends on runtime fixtures and local role behavior; hosted/prod requires trusted identity configuration.

## Rollback Notes

Rollback is limited to this slice:

1. Restore the previous download route implementation.
2. Remove `frontend/lib/approved-delivery-gate.ts`.
3. Remove `frontend/lib/approved-delivery-gate.test.ts`.
4. Revert guard script expectations to the previous route-owned gate shape.
5. Revert the `requestedVariant` field addition in `frontend/lib/media-delivery.ts` if no longer needed.
6. Revert reserved audit id helpers in `frontend/lib/audit-log.ts`.
7. Revert non-consuming ticket validation / pre-consume audit callback in `frontend/lib/download-tickets.ts`.

No data migration, env change, ResourceSpace writeback, or media mutation was introduced.
