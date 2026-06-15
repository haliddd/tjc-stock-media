# Real Vs Demo Proof

Date: 2026-06-15  
Commit SHA: a22497e96004024928128990f432806b768930a6  
Repo/branch: `architecture/production-like-connected-dam-readiness-proof`  
Environment: local runtime plus hosted anonymous read-only checks  
Base URL: local `http://localhost:4868`; hosted `https://tjc-stock-media.vercel.app`  
Role/persona: anonymous hosted; local Viewer/Reviewer/Admin simulation  
Result: LOCAL PASS / HOSTED REAL DATA BLOCKED  
Secrets redacted: yes

## Proof

| Case | Result | Evidence |
|---|---:|---|
| Hosted data-before-login | PASS | Anonymous `/`, `/api/assets/search`, and `/admin` redirect to beta login; no asset markers. |
| Local Viewer payload safety | PASS | `portal-api-smoke`, `portal-delivery-smoke`, and `portal-beta-rehearsal` passed. |
| Local fallback/demo honesty | PASS | Admin/source status remains diagnostic; normal-role payload uses safe media-library language. |
| Real hosted ResourceSpace records | BLOCKED | Oracle VM capacity blocked; no hosted ResourceSpace install/API. |
| Fixture/mock shown as real DAM | NOT OBSERVED | Local proof does not show unauth or normal-role fake live ResourceSpace success. |

## Decision Impact

Local proof supports beta workbench safety. It does not prove real hosted ResourceSpace-backed teammate data. Any public or teammate-facing claim must say hosted ResourceSpace is blocked until the Oracle capacity gate is resolved.
