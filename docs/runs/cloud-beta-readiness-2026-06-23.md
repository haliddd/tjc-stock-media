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
| Cloud preview env preflight | `make cloud-beta-preview-preflight` fails closed unless ResourceSpace staging, durable DB/queues, private upload storage, beta auth, queued writeback, and download gates are configured |

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

## ResourceSpace Cloud/Staging Deployment Runbook

This is the execution plan for moving from local rehearsal to a safe 10-person cloud beta. It is intentionally staging-only.

### 1. Choose host

Preferred fast path: managed ResourceSpace hosting if Hali can approve it, because the vendor owns the long-running DAM stack, DB, filestore, thumbnails, and operational patching.

Self-host path:

- Ubuntu 24.04 VM or managed container host.
- 2-4 vCPU, 8 GB RAM minimum for beta thumbnail generation.
- 80-200 GB persistent disk for initial filestore, sized after approved media seed.
- Daily VM snapshots.
- Restricted SSH/admin access.
- DNS target such as `dam-staging.tjc.org`.

### 2. Install ResourceSpace stack

ResourceSpace officially supports a LAMP-style stack with a MySQL-compatible database, Apache, and PHP. Official Docker setup notes call out MariaDB as the database host inside Docker setup rather than `localhost`.

Self-host Docker shape:

```text
ResourceSpace web container
  -> MariaDB/MySQL database
  -> persistent ResourceSpace filestore volume
  -> persistent ResourceSpace config volume
  -> HTTPS reverse proxy
```

Required staging controls:

- HTTPS only; redirect HTTP to HTTPS.
- No public bucket/filestore access.
- ResourceSpace admin account for Hali/admins only.
- Separate `portal-beta-api` user for portal API calls.
- Backups cover VM image or equivalent, DB, config, and all resource files.

### 3. Seed data

1. Freeze approved local seed source.
2. Export local ResourceSpace DB or use approved metadata export snapshot.
3. Copy ResourceSpace filestore without renaming/mutating source media.
4. Restore DB/config/filestore into staging.
5. Run ResourceSpace thumbnail/regeneration checks if needed.
6. Verify:
   - Resource count.
   - Album/collection membership, especially `MVP 2024 First Batch`.
   - Representative thumbnails: flower/bee, plant/leaf, book, fountain/bowl, beach/ocean, flowers, Bible/rings.
   - Viewer cannot download source/original.
   - Admin can inspect but not accidentally publish.

### 4. Portal API user

Create ResourceSpace user:

```text
portal-beta-api
```

Minimum permissions:

- Search/read resources the beta should expose.
- Read safe metadata fields.
- Read previews/thumbnails.
- Read collections/albums.
- Optional upload into intake-only collection/status.
- No unrestricted original/source download.
- No destructive admin permissions.
- No live writeback for first beta.

Record field map privately:

- Resource ID field.
- Approval/status field.
- Usage scope field.
- Rights/consent fields.
- Source/album fields.
- Thumbnail/preview route behavior.
- Denied source/original fields.

### 5. Durable beta state

Vercel filesystem is not a durable team beta store. Before Vercel Preview invites, configure one durable store for:

- feedback/issues
- pending review writes
- upload intake metadata
- audit events

Approved options:

- Vercel Postgres / Neon / Supabase Postgres
- Upstash/Vercel KV for simple queues if code adapters are implemented
- another Hali-approved durable DB

Current code state: diagnostics exist, but generic pending-write/upload-intake durable adapters are not implemented. Cloud beta remains NO-GO until adapter proof exists.

Schema starter artifact:

```text
docs/runs/cloud-beta-durable-schema-2026-06-23.sql
```

It creates staging tables for `beta_feedback`, `pending_review_writes`, `upload_intake`, and `beta_audit_events`. It stores portal workflow state only; it does not store ResourceSpace source/original media.

### 6. Private upload storage

For first cloud beta, choose one:

Option A: ResourceSpace intake upload

- Portal uploads to ResourceSpace intake collection/status.
- Every asset defaults to Needs Review / Do Not Publish.
- Reviewer queue reads intake collection/status.

Option B: private staging bucket first

- Portal uploads files to private R2/S3 or approved private object store.
- Portal stores metadata in durable `upload_intake`.
- Admin imports into ResourceSpace later.
- Nothing is public.

Do not use public-read buckets. Do not use Vercel serverless filesystem for uploaded media.

### 7. Vercel Preview connection

Set env only for Vercel Preview first:

```env
RESOURCESPACE_BASE_URL=https://dam-staging.tjc.org
RESOURCESPACE_API_USER=portal-beta-api
RESOURCESPACE_API_KEY=...
RESOURCESPACE_ENABLE_WRITEBACK=0
RESOURCESPACE_WRITEBACK_MODE=queued
BETA_DATABASE_URL=...
PENDING_WRITES_STORE=postgres
UPLOAD_INTAKE_STORE=postgres
UPLOAD_STORAGE_PROVIDER=r2
UPLOAD_STORAGE_PUBLIC_READ=0
```

After env changes, redeploy the Preview branch. Do not promote to production.

Before inviting testers, run:

```bash
make cloud-beta-preview-preflight
```

The preflight prints only redacted `set` / `missing` state and env names. It must return `GO` before any Preview team invite. In the current local shell it correctly returns `NO-GO` because cloud ResourceSpace, durable DB/queues, upload storage, auth, and download-gate env are not configured.

### 8. Preview validation

Run against Vercel Preview:

```bash
export BASE_URL=https://<vercel-preview-url>
make cloud-beta-preview-preflight
make portal-api-smoke
PORTAL_BROWSER_QA_FULL=1 PORTAL_BROWSER_QA_SCREENSHOT_DIR=docs/screenshots/cloud-beta-2026-06-23 make portal-browser-qa
```

Required proof:

- `/api/admin/readiness` says ResourceSpace staging/export, not fallback demo.
- Asset search/detail/thumbnails work.
- No source/original URLs in JSON payloads.
- Download gate blocks source/original and unapproved media.
- Upload persists durably or fails closed.
- Review missing evidence blocks.
- Valid review creates durable pending write or confirmed live sync.
- Feedback persists durably.
- Browser QA has no primary route crashes, no console errors, no mobile overflow.

## GO Criteria

CLOUD TEAM BETA GO only when:

- `make cloud-beta-preview-preflight` returns GO against Vercel Preview env.
- Vercel Preview reads ResourceSpace staging or honestly labeled cloud export snapshot.
- Upload intake persists durably or fails closed with a clear message.
- Review decisions queue durably or sync truthfully.
- Feedback persists durably.
- Download gates block source/original access.
- Admin readiness reports source health, durable storage, pending writes, upload intake, blockers, and role gates.
- Browser QA has 0 failures on primary routes.

Current status stays NO-GO for cloud team beta because external ResourceSpace staging credentials and durable storage are not configured in this workspace.

## Official References Checked

- ResourceSpace Docker install: https://www.resourcespace.com/knowledge-base/systemadmin/install_docker
- ResourceSpace general requirements: https://www.resourcespace.com/knowledge-base/systemadmin/general_requirements
- ResourceSpace backup guidance: https://www.resourcespace.com/knowledge-base/systemadmin/backup
- ResourceSpace API overview: https://www.resourcespace.com/knowledge-base/api/
- ResourceSpace permissions overview: https://www.resourcespace.com/knowledge-base/developers/all-user-permissions
- Vercel environments: https://vercel.com/docs/deployments/environments
- Vercel environment variables: https://vercel.com/docs/environment-variables
