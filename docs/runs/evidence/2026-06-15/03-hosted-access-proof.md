# Hosted Access Proof

Date: 2026-06-15  
Commit SHA: a22497e96004024928128990f432806b768930a6  
Repo/branch: `architecture/production-like-connected-dam-readiness-proof`  
Environment: hosted read-only checks only; no Vercel env/deploy mutation  
Base URL: `https://tjc-stock-media.vercel.app`  
Role/persona: anonymous only; no beta passwords used  
Result: PARTIAL PASS / PERSONA PROOF BLOCKED  
Secrets redacted: yes

## Read-Only Hosted Checks

| Probe | Result | Evidence |
|---|---:|---|
| `GET /` unauthenticated | PASS | HTTP `307` to `/beta-login?returnTo=%2F`; no asset/source marker in body. |
| `GET /api/beta-auth/session` unauthenticated | PASS | HTTP `401`; JSON shape includes `enabled: true`; no assets. |
| `GET /api/assets/search?limit=1` unauthenticated | PASS | HTTP `307` to beta login; no asset/source marker in body. |
| `GET /admin` unauthenticated | PASS | HTTP `307` to beta login; no asset/source marker in body. |

## Not Proven

| Proof | Result | Reason |
|---|---:|---|
| Viewer login | BLOCKED | No beta passwords requested or used. |
| Contributor login | BLOCKED | No beta passwords requested or used. |
| Reviewer login | BLOCKED | No beta passwords requested or used. |
| DAM Admin login | BLOCKED | No beta passwords requested or used. |
| Hosted env values | BLOCKED | No Vercel dashboard/env mutation approval. |
| Deployment commit match | BLOCKED | No Vercel dashboard/deployment metadata proof. |
| Hosted mutating smoke | NOT RUN | Separate approval required; not approved. |

## Decision Impact

Data-before-login proof passed for anonymous hosted access. Full beta-auth persona proof remains blocked until Hali approves Vercel env/dashboard proof and provides secret-safe persona testing path.

## Current Guard Contract

| Field | Value |
|---|---|
| Result | PARTIAL PASS read-only / BLOCKED |
| Secrets redacted | yes |
| Touched forbidden surfaces | no |
| Open blocker ID | hosted-access-protection |
| Open blocker ID | vercel-env-confirmation |
| Follow-up | Hali confirms canonical hosted URL/protection, deployment commit, env |

Latest hosted read-only summary timestamp: `2026-06-16T14:22:04.520Z`

| Guard | Status | Notes |
|---|---:|---|
| `make hosted-readonly-probe-guard` | REQUIRED | Read-only probe must stay summary-only and fail-closed on unsafe response shapes. |
| `make hosted-smoke-mutation-guard` | REQUIRED | Hosted mutating smokes require explicit owner approval before non-local POST/PATCH/DELETE. |
| hosted mutating smokes intentionally not run | BLOCKED | No approval to mutate hosted beta surfaces. |
| fail-closed exit on forbidden or privileged response shapes | REQUIRED | Anonymous/unauthenticated checks must fail on asset/source/private/admin payload exposure. |
| authenticated hosted roles/env/deployment still unproven | BLOCKED | No Vercel env/dashboard proof or secret-safe persona run. |
