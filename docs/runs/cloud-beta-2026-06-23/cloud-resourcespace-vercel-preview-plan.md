# Cloud ResourceSpace + Vercel Preview Beta Plan

Date: 2026-06-23
Branch: `beta/cloud-resourcespace-vercel-preview`
Baseline branch: `beta/local-team-workflow-ready-overnight`
Baseline commit: `1bd8846`

Status: PLAN READY / CLOUD EXECUTION BLOCKED UNTIL Hali provides cloud host, DNS, database/storage choice, and Vercel environment access.

This is not production. Do not deploy production, merge to `main`, send invites, expose public sharing, enable live ResourceSpace writeback, or commit secrets.

## Decision

Use this beta architecture:

```text
Team users
  -> Vercel Preview Portal
    -> Next.js API routes
      -> ResourceSpace Cloud/Staging API over HTTPS
      -> durable beta store for feedback, pending writes, upload intake
      -> approved-copy download gate
      -> private upload staging or ResourceSpace intake upload

ResourceSpace Cloud/Staging
  -> ResourceSpace app
  -> MariaDB/MySQL
  -> persistent filestore
  -> thumbnails/previews
  -> backups
  -> restricted admin/API user
```

Do not run ResourceSpace on Vercel. Vercel hosts the Next.js portal only.

## Phase 0 Baseline

Local beta baseline:

| Item | Value |
| --- | --- |
| Local portal | `http://localhost:4885` |
| Local ResourceSpace | `http://localhost:8088` |
| Local data source | ResourceSpace metadata export |
| Local status | GO for local rehearsal |
| Asset count | 2,290 admin readiness / 2,061 search total |
| Collection count | 19 |
| Sample asset | `367` / Bee |
| Sample collection | `album:mvp-2024-first-batch` |
| Screenshot folder | `docs/screenshots/team-beta-local-readiness-2026-06-23/` |

Known local limitations:

- Cloud storage is not configured.
- ResourceSpace writeback is queued, not live.
- Share links are local beta only.
- Team feedback/upload intake must move from local runtime to durable storage for Vercel preview.

## Phase 1 Cloud ResourceSpace Choice

Preferred fastest path:

- Managed ResourceSpace hosting or managed VM/container provider.

Self-host path:

- Ubuntu 24.04 VM.
- Docker Compose or ResourceSpace-supported install.
- Managed MariaDB/MySQL preferred.
- Persistent disk for filestore.
- HTTPS through Cloudflare, Caddy, Nginx, or managed load balancer.
- Daily snapshots/backups.

Recommended staging name:

- `dam-staging.tjc.org`

Do not use production domain until Hali approves.

## Phase 2 Provision ResourceSpace Cloud

Minimum VM:

- 2-4 vCPU
- 8 GB RAM
- 80-200 GB persistent disk, adjusted to initial media size
- daily snapshots

Database:

- MariaDB/MySQL
- daily backups
- network restricted to ResourceSpace host

Filestore:

- persistent disk or private object-storage-backed mount
- no public bucket access
- backup/restore tested

HTTPS/security:

- TLS certificate
- HTTP redirects to HTTPS
- strong admin password
- dedicated portal API user
- optional admin IP allowlist

ResourceSpace checks:

- login
- search assets
- open asset
- preview thumbnail
- collection/album membership
- upload permission if using ResourceSpace intake
- no public original/source access

## Phase 3 Migrate Or Seed Data

Steps:

1. Export local ResourceSpace DB.
2. Copy ResourceSpace filestore.
3. Restore DB to cloud DB.
4. Attach/copy filestore to cloud ResourceSpace.
5. Regenerate or recheck thumbnails if needed.
6. Verify asset count and collections.
7. Verify representative thumbnails.
8. Verify permissions.

Minimum checks:

```bash
curl -I https://dam-staging.tjc.org
curl -s https://dam-staging.tjc.org/api/health-or-equivalent
```

## Phase 4 Portal API Account

Create ResourceSpace user:

```text
portal-beta-api
```

Allowed:

- read metadata
- search resources
- read thumbnails/previews
- read collections/albums
- optional upload into intake collection
- later: write selected review fields only after proof

Denied:

- unrestricted original/source download
- destructive admin actions
- permission widening
- bulk publish/approve

Record privately:

- API user
- API key
- field map
- allowed writeback fields
- denied source/original fields
- default upload collection ID
- review queue collection/status mapping

Never commit credentials.

## Phase 5 Durable Beta Storage

Vercel serverless filesystem is not durable. Team beta needs one durable store for:

- feedback/issues
- pending review writes
- upload intake metadata
- optional audit events

Accepted options:

- Vercel Postgres
- Neon
- Supabase Postgres
- Upstash Redis/KV for simple queues
- another Hali-approved durable DB

Minimum SQL:

```sql
create table beta_feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  role text not null,
  route text not null,
  asset_id text,
  message text not null,
  severity text default 'normal',
  screenshot_url text,
  status text default 'open'
);

create table pending_review_writes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  resource_id text not null,
  action text not null,
  requested_by text not null,
  payload jsonb not null,
  status text default 'queued',
  resourcespace_sync_state text default 'not_synced',
  error text
);

create table upload_intake (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  submitted_by text not null,
  status text default 'needs_review',
  metadata jsonb not null,
  file_manifest jsonb not null,
  storage_state text default 'pending'
);
```

## Phase 6 Vercel Preview Environment

Set these on Vercel Preview environment only. Env changes require a redeploy.

ResourceSpace:

```env
RESOURCESPACE_BASE_URL=https://dam-staging.tjc.org
RESOURCESPACE_API_USER=portal-beta-api
RESOURCESPACE_API_KEY=<secret>
RESOURCESPACE_FIELD_MAP_JSON=<server-only-json>
RESOURCESPACE_DEFAULT_COLLECTION_ID=<id>
RESOURCESPACE_UPLOAD_COLLECTION_ID=<id-if-implemented>
RESOURCESPACE_REVIEW_COLLECTION_ID=<id-if-implemented>
RESOURCESPACE_ENABLE_WRITEBACK=0
RESOURCESPACE_WRITEBACK_MODE=queued
```

Beta auth:

```env
BETA_AUTH_ENABLED=true
BETA_SESSION_SECRET=<long-random-secret>
BETA_VIEWER_PASSWORD=<secret>
BETA_CONTRIBUTOR_PASSWORD=<secret>
BETA_REVIEWER_PASSWORD=<secret>
BETA_ADMIN_PASSWORD=<secret>
BETA_CHURCH_INVITE_CODES_JSON=<server-only-json>
PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0
NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0
```

Download gate:

```env
DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0
DOWNLOAD_GATE_REQUIRE_APPROVED_COPY=true
SOURCE_ORIGINAL_DOWNLOADS_ENABLED=0
```

Durable beta store:

```env
BETA_DATABASE_URL=<secret>
BETA_FEEDBACK_ENABLED=1
PENDING_WRITES_STORE=postgres
UPLOAD_INTAKE_STORE=postgres
```

Upload storage after Hali configures it:

```env
UPLOAD_STORAGE_PROVIDER=s3-or-r2-or-vercel-blob
UPLOAD_STORAGE_BUCKET=<secret-or-config>
UPLOAD_STORAGE_REGION=<config>
UPLOAD_STORAGE_ACCESS_KEY_ID=<secret>
UPLOAD_STORAGE_SECRET_ACCESS_KEY=<secret>
UPLOAD_STORAGE_PUBLIC_READ=0
```

## Phase 7 Vercel Preview Deploy

```bash
git push origin beta/cloud-resourcespace-vercel-preview
```

Expected:

- Vercel creates Preview deployment.
- Preview uses Preview env, not Production env.
- PR remains draft until Hali approves.

Do not promote to production.

## Phase 8 Cloud API Smoke

Use Vercel preview URL:

```bash
export BASE_URL=https://<vercel-preview-url>
make portal-api-smoke
```

Manual checks:

```bash
curl -s "$BASE_URL/api/admin/readiness"
curl -s "$BASE_URL/api/assets/search?limit=12"
curl -s "$BASE_URL/api/assets/<real-id>"
curl -I "$BASE_URL/api/assets/thumbnail/<real-id>"
```

Must verify:

- readiness says ResourceSpace staging/export, not fallback demo
- asset count matches cloud ResourceSpace/export expectation
- thumbnails load
- asset detail loads
- no source/original URLs in JSON
- download gate blocks unapproved/original
- upload API stores intake durably
- review API blocks missing evidence
- valid review request creates pending write

## Phase 9 Browser QA

Capture to:

```text
docs/screenshots/cloud-beta-2026-06-23/
```

Viewports:

- 1440
- 1280
- 1024
- 768
- 390
- 320

Routes:

- `/library?role=Viewer`
- `/library?role=Contributor`
- `/library?role=Reviewer`
- `/library?role=DAM%20Admin`
- `/assets/<real-id>?role=Viewer`
- `/upload?role=Contributor`
- `/review?role=Reviewer`
- `/collections?role=Viewer`
- `/distribution-sets?role=Viewer`
- `/requests?role=Reviewer`
- `/admin/users?role=DAM%20Admin`
- `/admin/taxonomy?role=DAM%20Admin`
- `/brand-hub?role=DAM%20Admin`
- `/insights?role=DAM%20Admin`
- `/admin/settings?role=DAM%20Admin`

Pass requirements:

- no console errors
- no horizontal overflow
- no unlabeled fallback data
- real thumbnails render
- upload usable
- review usable
- feedback usable
- role gates work
- admin shows source health
- mobile nav works
- no source/original exposure

## Phase 10 Writeback Mode

Initial mode:

```env
RESOURCESPACE_ENABLE_WRITEBACK=0
RESOURCESPACE_WRITEBACK_MODE=queued
```

Reviewer message:

```text
Queued for DAM sync. ResourceSpace remains unchanged until a media admin syncs or writeback is enabled.
```

Live writeback remains blocked until a separate proof confirms:

- test resource only
- exact field map
- before/after ResourceSpace field values recorded
- rollback documented
- no source/original mutation
- no permission widening
- reviewer action updates only allowed metadata/status fields
- error handling verified

## Phase 11 Upload Workflow

Option A: ResourceSpace intake upload.

- Portal uploads to ResourceSpace intake collection/status.
- Resource defaults to Needs Review / Do Not Publish.
- Source/original restricted.

Option B: private staging storage first.

- Portal uploads to private cloud bucket.
- Metadata goes to `upload_intake`.
- Reviewer/Admin imports into ResourceSpace later.
- Nothing public.

Recommendation for first 10-person cloud beta: Option B unless ResourceSpace upload API is already proven.

## Phase 12 Feedback

Feedback must persist durably.

Required fields:

- role
- route
- asset/collection ID if relevant
- message
- severity
- optional screenshot URL

Admin must show feedback count/list.

## Phase 13 GO / NO-GO

GO for 10-person beta only if:

- Vercel preview reads ResourceSpace cloud/export.
- Uploads persist in ResourceSpace intake or private staging.
- Review decisions queue/sync truthfully.
- Download gate enforced.
- Feedback persists.
- Role gates work.
- No source/original exposed.
- No console errors on primary routes.
- Admin shows honest state.
- Hali approves screenshots.

NO-GO if:

- portal falls back to demo data without labeling it
- uploads disappear after deployment restart
- review says synced without proof
- original/source appears in network payload
- feedback is not durable
- team cannot login by role
- ResourceSpace cloud is unreachable
- admin readiness lies or is blank
- any primary route crashes

## Phase 14 Evidence Docs

Create after cloud validation:

- `docs/runs/cloud-beta-2026-06-23/cloud-beta-readiness-2026-06-23.md`
- `docs/runs/cloud-beta-2026-06-23/cloud-beta-evidence-2026-06-23.md`

Final report format:

```text
CLOUD TEAM BETA STATUS: GO
or
CLOUD TEAM BETA STATUS: NO-GO

Branch:
Commit:
Vercel Preview URL:
ResourceSpace Cloud URL:
Data source:
Asset count:
Collection count:
Upload storage:
Writeback mode:
Feedback storage:
Screenshot folder:

Passed:
- ResourceSpace cloud reachable
- Vercel preview reachable
- API smoke
- browser QA
- upload
- review
- download gate
- role gates
- admin readiness
- feedback

Known limitations:
- ...

Morning beta instructions:
1. ...
2. ...
3. ...

Do not deploy production.
Do not merge.
Do not invite team until Hali confirms.
```

