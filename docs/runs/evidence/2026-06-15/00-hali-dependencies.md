# Hali Dependency Ledger

Date: 2026-06-15  
Commit SHA: a22497e96004024928128990f432806b768930a6  
Repo/branch: `haliddd/tjc-stock-media`, `architecture/production-like-connected-dam-readiness-proof`  
Environment: local proof run; no external mutation beyond approved Oracle attempt and cancel  
Base URL: local `http://localhost:4868`; hosted `https://tjc-stock-media.vercel.app`  
Role/persona: beta operator  
Result: BLOCKED ON EXTERNAL PROOF  
Secrets redacted: yes

## Dependencies

| Dependency | Status | Owner | Evidence / note | Blocks real beta? |
|---|---:|---|---|---:|
| Oracle A1 VM capacity | BLOCKED | Human admin | AD-1, AD-2, AD-3 all out of capacity for Always Free A1 2 OCPU / 12 GB. | Yes |
| ResourceSpace hosted install | BLOCKED | DAM admin | No VM exists; install not started. | Yes |
| ResourceSpace read-only API proof | BLOCKED | DAM admin | No hosted ResourceSpace/API user exists. | Yes |
| Canonical repo/PR | PASS | Repo owner | PR #15 open draft on `haliddd` target branch. | No |
| Hosted Vercel anonymous beta gate | PASS | App admin | Root/search/admin redirect to beta login. | No |
| Vercel persona/env/commit proof | BLOCKED | App admin | No dashboard/env/secret path approved. | Yes |
| Durable hosted state | BLOCKED | App admin | Local smokes pass; hosted KV/generic durable store not proven. | Yes |
| Google Shared Drive custody proof | BLOCKED | Drive manager | Sanitized custody manifest not supplied. | Yes |
| Downloadable seed asset | BLOCKED | DAM/app admin | Current seed/export has no reviewer-visible downloadable asset. | Yes for download proof |
| Tester list/invites | BLOCKED | Hali | Invites not approved and not sent. | Yes |

## Guardrails Honored

- No paid Oracle path, no upgrade, no E2.1.Micro real beta fallback.
- No deploy, no Vercel env mutation, no hosted mutating smoke.
- No ResourceSpace writeback.
- No source/original media mutation.
- No Hali0321 write.
