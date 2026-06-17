# ResourceSpace Read Proof

Date: 2026-06-15  
Commit SHA: a22497e96004024928128990f432806b768930a6  
Repo/branch: `architecture/production-like-connected-dam-readiness-proof`  
Environment: Oracle setup blocked; local/export proof only  
Base URL: local `http://localhost:4871`
Role/persona: Viewer, Reviewer, DAM Admin via local QA role simulation  
Result: ORACLE BLOCKED / LOCAL EXPORT PATH PASS  
Secrets redacted: yes

## Oracle / Hosted ResourceSpace

| Item | Result | Evidence |
|---|---:|---|
| VCN | PASS | `tjc-stock-media-vcn-v001` created in Ashburn with public/private subnets. |
| VM | BLOCKED | `VM.Standard.A1.Flex` Always Free, 2 OCPU / 12 GB failed in AD-1, AD-2, AD-3 due capacity. |
| Paid prompt | PASS | No paid prompt accepted; Upgrade link not clicked. |
| ResourceSpace install | NOT STARTED | No VM exists. |
| Photo import to hosted ResourceSpace | NOT STARTED | No ResourceSpace host exists. |
| API `do_search` against hosted ResourceSpace | NOT RUN | No ResourceSpace host/API user exists. |

## Local Source Mode

Local smokes used export/local source behavior, not a live Oracle ResourceSpace VM. `portal-api-smoke` generated a temporary ResourceSpace metadata export fixture for API proof and removed it afterward. Current local runtime evidence can prove mapper/redaction/gate behavior, but it does not satisfy the real hosted ResourceSpace VM gate.

## Writeback

`BASE_URL=http://localhost:4871 make portal-writeback-guard-smoke` passed:

- Review writeback readiness was not live.
- Incomplete evidence was blocked.
- Complete evidence returned queued/pending behavior only.
- Persisted audit lines were sanitized.

## Decision Impact

Real hosted ResourceSpace VM is NO-GO/BLOCKED until Oracle A1 capacity exists or Hali explicitly approves another free-only path. Local/export proof remains useful for portal safety but cannot be sold as real hosted DAM proof.

## Current External-Proof Contract

| Field | Value |
|---|---|
| Result | BLOCKED |
| Secrets redacted | yes |
| Touched forbidden surfaces | no |
| Open blocker ID | resourcespace-scope |
| Follow-up | Hali confirms read-only ResourceSpace endpoint/API user or declares non-real rehearsal scope |

| Requirement | Status |
|---|---|
| Fresh ResourceSpace production read proof was not performed | BLOCKED |
| did not mutate ResourceSpace production data | PASS |
| fresh real ResourceSpace read proof not captured | BLOCKED |

No local export or fixture proof can close real ResourceSpace beta scope. It can only support local portal safety regression checks.
