# 05 Real Vs Demo Proof - 2026-06-15

## Scope

This doc records whether local/runtime data can be confused with real approved church media.

## Local Proof

Local tests and smokes used local app runtime paths against `http://localhost:4871`.

Proven locally:

- Viewer payloads remain redacted.
- Contributor payloads remain redacted through existing guard/smoke paths.
- Reviewer/Admin access requires trusted beta session, trusted SSO identity, or explicit server-only local override.
- Query role alone does not unlock privileged API access.
- Blocked downloads remain blocked.
- Premium UI lock states explain blocked actions instead of implying available downloads.

## Demo-Honesty Boundaries

This run did not approve any asset for public/internal reuse. It did not create real rights approval, real custody approval, or real ResourceSpace live writeback evidence.

Required behavior remains:

- Demo/local data must not look like final rights approval.
- `Approved Public` from seed context must not imply portal-ready download.
- Source paths, originals, checksums, private URLs, signed URLs, and master custody details stay restricted.
- Reviewer evidence gates must block incomplete approvals.

## Current Gap

Fresh hosted/non-real rehearsal scope is not proven. A human owner must confirm which dataset is allowed for beta rehearsal and which fields are safe to expose.

## Decision

Local real-vs-demo safety improved, but current packet remains NO-GO for broader beta until hosted data scope and non-real/real rehearsal boundaries are confirmed.

## Negative Test Matrix Status

| Case | Status | Evidence | Notes |
|---|---|---|---|
| Query role cannot make local demo look reviewer-approved | PASS local | `07-redaction-and-download-safety-proof.md` | Query role P0 fixed. |
| Viewer/Contributor payloads remain redacted | PASS local | `02-local-baseline-checks.md`, `07-redaction-and-download-safety-proof.md` | Guards and smokes passed. |
| Demo/fallback hidden from hosted teammate beta | BLOCKED | this file | Hosted data scope not proven. |
| ResourceSpace unavailable state honest | BLOCKED | `04-resourcespace-read-proof.md` | Real read/outage proof needs approved access or explicit rehearsal scope. |

## Proof Record

| Field | Value |
|---|---|
| Date | 2026-06-15 |
| Commit SHA | `a22497e96004024928128990f432806b768930a6` |
| Repo/branch | `codex/safe-ui-beta-proof-2026-06-15` |
| Environment | isolated local worktree |
| Base URL | `http://localhost:4871` |
| Role/persona | Viewer, Contributor, Reviewer, DAM Admin local proof |
| Command or manual step | local guards, API smoke, download-ticket smoke, browser QA evidence review |
| Expected | demo/fallback cannot appear as real beta data |
| Actual | local safety improved; hosted/non-real rehearsal scope not proven |
| Result | BLOCKED |
| Evidence path | this file |
| Secrets redacted | yes |
| Follow-up | Hali labels beta as real ResourceSpace proof or non-real rehearsal and approves matching hosted/data proof |
