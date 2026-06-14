# Cloud Account Readiness Map - 2026-06-14

## Purpose

This map identifies every account or cloud service needed before TJC Stock Media can be treated as a production-like internal DAM for named teammates. It records account status without creating accounts, accepting terms, entering payment information, deploying, or changing external systems.

Source links checked during this run:

- Vercel pricing and included Hobby/Blob limits: https://vercel.com/pricing
- Vercel deployment protection: https://vercel.com/docs/deployment-protection
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Upstash Redis pricing: https://upstash.com/pricing/redis
- Oracle Cloud Free Tier: https://www.oracle.com/cloud/free/
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- AWS S3 pricing and free storage program: https://aws.amazon.com/s3/pricing/ and https://aws.amazon.com/free/storage/
- Google shared drives: https://support.google.com/a/users/answer/7212025
- ResourceSpace API and install requirements: https://www.resourcespace.com/knowledge-base/api/ and https://www.resourcespace.com/knowledge-base/systemadmin/general_requirements

## Summary

| Service | Purpose | Current account exists | Free tier | Card/payment required | 2FA required | Secrets needed | Human action required | Agent automation allowed | Risk | Gate status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GitHub `haliddd/tjc-stock-media` | Canonical code custody and draft PR | Yes, remote present | Yes for public/private repo baseline | No for current repo work | Unknown, account policy outside repo | `GH_TOKEN` or logged-in CLI, no values in repo | Only if push/PR auth fails | Read repo, list PRs, push only to `haliddd` after checks | Medium: wrong remote would fork truth | Ready for code proof |
| Vercel project | Temporary Next.js portal host | Unknown from local repo | Hobby plan exists; usage limits/cost rules apply | Unknown for account; paid upgrade forbidden | Unknown | `BETA_*`, `RESOURCESPACE_*`, `KV_*`, `BLOB_READ_WRITE_TOKEN`, `SSO_*`, no values | Login/2FA/env values/project create confirmation | Open dashboard, inspect non-secret project settings | High: public exposure/env leakage | Blocked until human dashboard proof |
| Vercel deployment protection / preview access | Named teammate access boundary | Unknown | Protection features vary by plan | Unknown | Deployment protection settings, beta passwords | Login/2FA/settings confirmation | Navigate to protection page, document settings | High: unprotected preview URL | Blocker for teammate beta |
| Upstash Redis/KV or equivalent | Durable feedback first; future runtime state if adapter exists | Unknown | Upstash has free plan options, current terms must be verified in dashboard | Unknown | `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Account/project create/env copy by human | Open pricing/dashboard page, stop before create confirmation | Medium: current code only uses KV for feedback | Blocked for hosted feedback durability |
| Vercel Blob or current attachment store | Feedback attachments and future governed files | Unknown | Vercel pricing lists included Blob usage | Unknown | `BLOB_READ_WRITE_TOKEN` | Human dashboard/env setup | Inspect docs/dashboard only | Medium: attachment storage can leak files if public | Blocked until configured and smoke tested |
| Oracle Cloud Always Free | Possible ResourceSpace host | Unknown | Always Free services exist; Oracle requires card for identity verification | Yes, card required per Oracle FAQ | Likely account MFA; unknown until dashboard | OCI keys, VM credentials, DB password, no repo values | Signup/login/card/terms/VM create | Open official pages only; no signup completion | High: card, terms, resource cost | Human-gated, not current beta proof |
| Cloudflare R2 | Future approved derivative object storage option | Unknown | R2 free tier exists for Standard storage | Unknown, billing/account status dashboard-only | Unknown | R2 account ID, access key, secret, bucket | Account/bucket/API token by human | Inspect docs/dashboard before final create | Medium: object storage can become public if misconfigured | Future only |
| AWS S3 | Future approved derivative object storage option | Unknown | AWS free storage program exists, but cost risk remains | AWS accounts normally require payment method | Unknown | S3 bucket/region/IAM role or access key | Account/bucket/IAM by human | Docs only unless approved | High: billable resources/public bucket risk | Future only |
| Google Shared Drive | Master-original custody | Unknown from repo; product truth says yes conceptually | Depends on Google Workspace edition | Workspace billing outside this run | Workspace policy unknown | `GOOGLE_SHARED_DRIVE_ID`, `GOOGLE_APPLICATION_CREDENTIALS` | Confirm Shared Drive ID, service access, custody owner | Docs/checklist only; no Drive mutation | High: source media mutation/leak | Blocked until manifest proof |
| Google Workspace / SSO future | Real identity and origin access | Unknown | Workspace plans are paid; current org status unknown | Existing org billing outside this run | Usually required by policy | `SSO_PROVIDER`, `SSO_CLIENT_ID`, `SSO_ROLE_MAP_JSON`, trusted headers | IdP/app/protection setup by human | Document header contract only | High: auth bypass if misconfigured | Production blocker |
| Domain/DNS / Cloudflare future | Stable hostname and origin protection | Unknown | Cloudflare has free options; DNS changes are external | Domain ownership/billing unknown | Unknown | DNS zone/API token, no values | Domain/DNS changes require human | Docs/checklist only | High: public exposure | Future blocker |
| Email notification provider future | Feedback/review notices | Unknown | Provider-dependent | Unknown | SMTP/API key | Human account/env setup | Docs only | Medium: notification privacy | Future, not beta blocker |
| Monitoring/logging future | Operational alerts and audit export | Unknown | Provider-dependent | Unknown | Provider token/DSN | Human tool choice/env setup | Docs only | Medium: data retention/privacy | Production blocker |
| Backup/restore location | Drive, ResourceSpace DB/files, portal state export | Unknown | Depends on chosen storage | Unknown | Storage credentials | Human chooses destination and restore owner | Docs only | High: data loss | Production blocker |

## Env Name Checklist

No values belong in docs, chat, git history, screenshots, or PR body.

- ResourceSpace read: `RESOURCESPACE_BASE_URL`, `RESOURCESPACE_API_USER`, `RESOURCESPACE_API_KEY`, `RESOURCESPACE_API_PAGE_SIZE`, `RESOURCESPACE_API_MAX_PAGES`
- ResourceSpace field map/writeback: `RESOURCESPACE_FIELD_MAP_JSON`, `RESOURCESPACE_ENABLE_WRITEBACK`, `RESOURCESPACE_WRITEBACK_MODE`
- Beta auth: `BETA_AUTH_ENABLED`, `BETA_SESSION_SECRET`, `BETA_VIEWER_PASSWORD`, `BETA_CONTRIBUTOR_PASSWORD`, `BETA_REVIEWER_PASSWORD`, `BETA_ADMIN_PASSWORD`
- Feedback durable store: `BETA_FEEDBACK_ENABLED`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `BLOB_READ_WRITE_TOKEN`
- Runtime state future: `RUNTIME_STORE`, `PORTAL_RUNTIME_STORE`
- Google Drive: `GOOGLE_SHARED_DRIVE_ID`, `GOOGLE_APPLICATION_CREDENTIALS`
- SSO/origin: `SSO_PROVIDER`, `SSO_CLIENT_ID`, `SSO_TRUSTED_HEADERS`, `SSO_ROLE_MAP_JSON`, `PRODUCTION_REQUIRE_TRUSTED_IDENTITY`
- Future object storage: `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_ROLE`, `AWS_ACCESS_KEY_ID`, `S3_PREVIEW_PREFIX`, `S3_ORIGINAL_PREFIX`

## Production Gate Status

Code can prove local role gates, payload redaction, ticketed approved-copy delivery, and fail-closed hosted feedback behavior. It cannot prove production-like teammate beta until Vercel access protection, real ResourceSpace read source, durable feedback state, and Google Drive custody manifest are externally verified.
