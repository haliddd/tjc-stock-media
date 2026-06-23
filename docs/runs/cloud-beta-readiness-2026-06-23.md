# Cloud Beta Readiness

Date: 2026-06-23
Branch: `beta/local-team-workflow-ready-overnight`
Status: CLOUD TEAM BETA NO-GO until ResourceSpace staging credentials, durable beta storage, and private upload storage are configured and smoke-tested.

Do not deploy production. Do not merge. Do not invite testers. Do not enable live ResourceSpace writeback.

## Target Architecture

| Layer | Target |
| --- | --- |
| Portal | Vercel Preview deployment from beta branch |
| DAM source | ResourceSpace Cloud/Staging over HTTPS |
| Runtime state | Durable beta DB for feedback, pending review writes, upload intake metadata, audit trail |
| Upload files | Private staging bucket or ResourceSpace intake collection |
| Writeback | Queued first; live writeback only after field-map proof |
| Downloads | Approved-copy gate only; no source/original exposure |

## Current Code State

| Capability | State |
| --- | --- |
| ResourceSpace API/export reads | Local export snapshot proven; cloud API env supported but not configured in this workspace |
| Upload intake | Safe local runtime storage; production browser file intake blocks without durable storage |
| Review decisions | Safe pending-write queue; live writeback disabled unless explicit env and field map are valid |
| Feedback | Local JSON or Vercel KV path exists for feedback only |
| Generic runtime writes | Local filesystem adapter only; durable DB adapter is not implemented |
| Cloud preview diagnostics | Admin readiness now reports `cloud-preview-beta-storage` truthfully |

## Required Preview Environment

Set these only in Vercel Preview, not Production:

```env
RESOURCESPACE_BASE_URL=https://dam-staging.tjc.org
RESOURCESPACE_API_USER=portal-beta-api
RESOURCESPACE_API_KEY=...
RESOURCESPACE_FIELD_MAP_JSON=...
RESOURCESPACE_ENABLE_WRITEBACK=0
RESOURCESPACE_WRITEBACK_MODE=queued

BETA_DATABASE_URL=...
PENDING_WRITES_STORE=postgres
UPLOAD_INTAKE_STORE=postgres

UPLOAD_STORAGE_PROVIDER=r2
UPLOAD_STORAGE_BUCKET=...
UPLOAD_STORAGE_REGION=auto
UPLOAD_STORAGE_ACCESS_KEY_ID=...
UPLOAD_STORAGE_SECRET_ACCESS_KEY=...
UPLOAD_STORAGE_PUBLIC_READ=0

BETA_AUTH_ENABLED=true
BETA_SESSION_SECRET=...
BETA_VIEWER_PASSWORD=...
BETA_CONTRIBUTOR_PASSWORD=...
BETA_REVIEWER_PASSWORD=...
BETA_ADMIN_PASSWORD=...
BETA_CHURCH_INVITE_CODES_JSON=...

DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0
SOURCE_ORIGINAL_DOWNLOADS_ENABLED=0
```

## Blockers

| Blocker | Why it matters | Safe next step |
| --- | --- | --- |
| ResourceSpace staging not provisioned in this run | Vercel Preview cannot browse real cloud DAM data yet | Hali provisions managed/self-hosted ResourceSpace staging and shares server-side API env names only |
| Durable generic runtime adapter missing | Pending writes/upload intake would not survive serverless restarts if code wrote local filesystem | Implement Postgres-backed stores before cloud team beta write workflows |
| Private upload storage not configured | Browser file uploads cannot persist safely in Vercel filesystem | Configure private R2/S3/Vercel Blob staging; keep public read off |
| Live writeback unproven | Reviewer actions must not mutate wrong fields | Keep queued mode, then prove live writeback on one test resource only |
| Public sharing not approved | Distribution links must not expose originals or public bundles | Keep links local/role-safe until Hali approves |

## Execution Plan

1. Provision ResourceSpace staging on VM/managed host with persistent DB, filestore, thumbnails, TLS, and backups.
2. Seed staging from approved export/filestore snapshot; verify asset count, collection membership, thumbnails, and permissions.
3. Create restricted ResourceSpace API user `portal-beta-api` with metadata/search/thumbnail read access and no unrestricted original download.
4. Configure Vercel Preview env variables. Redeploy Preview after env changes.
5. Implement durable Postgres stores for `pending_review_writes`, `upload_intake`, audit events, and feedback if not using KV.
6. Configure private upload staging bucket. Prove uploaded files are private and receipt says Needs Review / Do Not Publish.
7. Run API smoke against Preview: search, detail, thumbnail, download blocked case, upload submit, review missing evidence, valid queued review, admin readiness.
8. Run browser QA against Preview at 1440, 1280, 1024, 768, 390, and 320.
9. Keep writeback queued for first 10-person beta. Enable live writeback only after field-map proof and rollback plan.

## GO Criteria

CLOUD TEAM BETA GO only when:

- Vercel Preview reads ResourceSpace staging or honestly labeled cloud export snapshot.
- Upload intake persists durably or fails closed with a clear message.
- Review decisions queue durably or sync truthfully.
- Feedback persists durably.
- Download gates block source/original access.
- Admin readiness reports source health, durable storage, pending writes, upload intake, blockers, and role gates.
- Browser QA has 0 failures on primary routes.

Current status stays NO-GO for cloud team beta because external ResourceSpace staging credentials and durable storage are not configured in this workspace.
