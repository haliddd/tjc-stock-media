# Cloud ResourceSpace And Vercel Preview Plan

This is an operator runbook for a safe cloud team beta. It does not authorize Production deploy, merge, or team invite.

## Phase 1: Provision ResourceSpace Staging

1. Choose managed ResourceSpace hosting or a VM/container host.
2. Configure HTTPS DNS, for example `https://dam-staging.<domain>`.
3. Configure persistent MariaDB/MySQL.
4. Configure persistent ResourceSpace filestore, config, and thumbnails/previews.
5. Enable backups/snapshots for DB, config, and filestore.
6. Restrict SSH/admin access; expose only 80/443 publicly.
7. Create restricted API user for portal reads.
8. Deny source/original downloads for portal/API user.
9. Configure intake collection, review queue/status mapping, and default searchable collection.
10. Record non-secret field/collection IDs for Vercel env.

Validation:

```bash
curl -I "$RESOURCESPACE_BASE_URL"
```

Then run a ResourceSpace API read using the restricted API user without printing secrets.

## Phase 2: Prepare Data Migration

Do not copy media until destination and custody path are approved.

Move or restore only through operator-approved path:

- ResourceSpace DB.
- ResourceSpace filestore.
- Thumbnails/previews.
- Metadata field map.
- Collections/albums.
- User/group permissions if needed.

Expected local baseline:

- Asset count: 2,290 admin.
- Search-visible count: 2,061.
- Collection count: 19.
- Sample asset: `367`.
- Sample collection: `album:mvp-2024-first-batch`.

## Phase 3: Implement/Prove Durable Beta State

Current branch is not cloud-GO for uploads because upload intake durable adapter is missing.

Required before invite:

- Pending review writes persist after serverless restart.
- Upload intake metadata persists after serverless restart.
- Upload files stage in private storage only.
- Feedback persists after serverless restart.
- Audit/runtime writes do not depend on Vercel filesystem.

Current branch proof options:

- Pending writes: Vercel KV only.
- Feedback: Vercel KV only.
- Upload intake: no durable cloud adapter implemented.

Schema starter:

`docs/runs/cloud-beta-durable-schema-2026-06-23.sql`

## Phase 4: Configure Vercel Preview

Use the old hosted beta URL as the stable front door:

```text
https://tjc-stock-media.vercel.app
```

Current proof: it is reachable, hosted by Vercel, and anonymous root redirects to `/beta-login`. The session endpoint still reports build marker `small-team-beta-readiness-2026-06-17`, so it is not proof that the latest branch/cloud env are live.

Use Vercel dashboard because CLI is unavailable in this workspace.

1. Add Preview env only from `vercel-preview-env-checklist.md`.
2. Keep Production env untouched.
3. Enable Deployment Protection.
4. Redeploy beta branch preview.
5. Redeploy the current beta branch to this Vercel project when ResourceSpace staging env is ready.
6. Do not promote or invite until the hosted URL proves current build, ResourceSpace staging, and durable storage.

## Phase 5: Validate Preview

Run:

```bash
make cloud-beta-preview-preflight
export BASE_URL=https://tjc-stock-media.vercel.app
make portal-api-smoke
curl -s "$BASE_URL/api/admin/readiness" > /tmp/cloud-readiness.json
curl -s "$BASE_URL/api/assets/search?limit=12" > /tmp/cloud-search.json
curl -I "$BASE_URL/api/assets/thumbnail/367"
```

Verify:

- Vercel Preview URL reachable.
- ResourceSpace staging URL reachable.
- ResourceSpace API read works.
- Asset search uses cloud ResourceSpace/staging export, not unlabeled fallback.
- Thumbnails load.
- Upload submit persists durably.
- Review pending write persists durably.
- Feedback persists durably.
- Download gate blocks source/original.
- Viewer cannot access reviewer/admin actions.
- Contributor cannot approve.
- Reviewer cannot access admin config.
- Admin readiness truthfully shows cloud source and blockers.
- No Production env is used.
- No source/original URL appears in JSON or browser network payload.

## GO/NO-GO Decision

CLOUD TEAM BETA remains NO-GO until every validation item passes or Hali explicitly accepts a narrower, read-only, no-upload/no-review/no-feedback preview scope.

Production deploy, merge, and team invite remain out of scope.
