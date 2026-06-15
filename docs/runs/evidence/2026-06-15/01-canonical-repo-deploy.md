# Canonical Repo And Deployment Lock

Date: 2026-06-15  
Commit SHA: a22497e96004024928128990f432806b768930a6  
Repo/branch: `haliddd/tjc-stock-media`, `architecture/production-like-connected-dam-readiness-proof`  
Environment: local proof run; no deploy/env mutation  
Base URL: local `http://localhost:4868`; hosted candidate `https://tjc-stock-media.vercel.app`  
Role/persona: beta operator  
Result: PARTIAL PASS / HOSTED COMMIT BLOCKED  
Secrets redacted: yes

## Canonical Surface

| Item | Result | Evidence |
|---|---:|---|
| Canonical GitHub repo | PASS | `haliddd` remote is `https://github.com/haliddd/tjc-stock-media.git`. |
| Unsafe remote | PASS | `origin` points to `https://github.com/Hali0321/tjc-stock-media.git`; no push used. |
| Target branch | PASS | Local branch is `architecture/production-like-connected-dam-readiness-proof`. |
| PR | PASS | GitHub PR #15 is open draft, title `Production-like connected DAM readiness proof`, head `haliddd:architecture/production-like-connected-dam-readiness-proof`, base `main`, merge state `CLEAN`. |
| Merge/deploy | PASS | No merge, no push, no deploy, no Vercel env change. |
| Hosted URL | PARTIAL | `https://tjc-stock-media.vercel.app` responds and redirects anonymous traffic to beta login. Dashboard commit/env/protection not inspected. |
| Hosted commit match | BLOCKED | Requires Vercel dashboard or approved deployment metadata proof. |

## Local Commands

| Surface | Command |
|---|---|
| Frontend dev | `./node_modules/.bin/next dev --port 4868` from `frontend/` |
| Frontend build | `npm --prefix frontend run build` |
| API smoke | `BASE_URL=http://localhost:4868 make portal-api-smoke` |
| Beta rehearsal | `BASE_URL=http://localhost:4868 make portal-beta-rehearsal` |

## Decision Impact

Canonical repo and PR branch are proven locally. Hosted URL protection is partially proven by read-only unauthenticated checks, but exact Vercel deployment commit and env values remain blocked because no Vercel dashboard/env mutation was approved.
