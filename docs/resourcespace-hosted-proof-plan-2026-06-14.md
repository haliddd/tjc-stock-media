# ResourceSpace Hosted Proof Plan - 2026-06-14

## Goal

Prove the portal can read real ResourceSpace records without mutating ResourceSpace and without presenting local fallback as real DAM data.

## Current Code Status

- `frontend/lib/media-source/index.ts` reads in this order: ResourceSpace API, local ResourceSpace CSV export, demo fallback.
- `frontend/lib/media-source/resourcespace-api.ts` uses `resourceSpaceSearchAll` and records pagination diagnostics.
- `frontend/lib/resourcespace-client.ts` signs server-side API calls; credentials are never `NEXT_PUBLIC`.
- `frontend/lib/source-redaction.ts` redacts source custody and operational details for Viewer/Contributor.
- Writeback is disabled unless `RESOURCESPACE_ENABLE_WRITEBACK=1`, `RESOURCESPACE_WRITEBACK_MODE=live`, field map is valid, API smoke passes, and record confirmation succeeds.

## Env Checklist

No values in docs:

- `RESOURCESPACE_BASE_URL`
- `RESOURCESPACE_API_USER`
- `RESOURCESPACE_API_KEY`
- `RESOURCESPACE_API_PAGE_SIZE`
- `RESOURCESPACE_API_MAX_PAGES`
- `RESOURCESPACE_FIELD_MAP_JSON`
- `RESOURCESPACE_DEFAULT_COLLECTION_ID`
- `RESOURCESPACE_ENABLE_WRITEBACK=0`
- `RESOURCESPACE_WRITEBACK_MODE=queued`

Legacy accepted names:

- `RS_BASE_URL`
- `RS_API_USER`
- `RS_API_KEY`

## Oracle Always Free Suitability

Oracle Cloud Always Free can be considered for a ResourceSpace host, but setup requires human account access and may require card verification. The agent must not create OCI resources or accept terms.

ResourceSpace still needs:

- Linux VM/container host.
- PHP/Apache or supported web stack.
- MySQL/MariaDB.
- Persistent file storage for originals/previews.
- SSL/TLS.
- Backup/restore plan for DB and filestore.
- Admin/API account with read-only proof first.

## Read-Only Smoke Plan

Local read-only smoke:

```bash
npm --prefix frontend test -- production-hardening.test.ts
BASE_URL=http://localhost:4868 make portal-api-smoke
```

Hosted read-only smoke after human env confirmation:

```bash
BASE_URL=https://<vercel-preview-url> scripts/portal-hosted-smoke.sh
```

Expected evidence:

- Admin readiness says `ResourceSpace API` when live read succeeds.
- ResourceSpace pagination diagnostics are complete.
- Viewer search payload uses "Media library" source language.
- Viewer/Contributor payloads contain no source path, checksum, original filename, private URL, or admin-only ResourceSpace details.
- Review/writeback UI says queued/pending, not final truth.

## Fallback Detection

Fallback is present when:

- API credentials missing or ResourceSpace read fails.
- No local export exists.
- `media-source/index.ts` returns `demoFallbackStatus`.

Rules:

- Admin may see fallback/export/live diagnostics.
- Normal teammates must not be told fallback is a real DAM connection.
- Hosted fallback cannot count as durable beta success.

## Thumbnail/Preview Strategy

Current preview delivery:

- Backend thumbnail route and local derivative index.
- Placeholder states for missing derivatives.
- No original/master delivery through normal routes.

Future proof needed:

- ResourceSpace preview URL/proxy or derivative export manifest.
- Browser QA confirms preview renders without leaking original/source paths.

## Writeback Policy

Default:

- `RESOURCESPACE_ENABLE_WRITEBACK=0`
- `RESOURCESPACE_WRITEBACK_MODE=queued`

Live writeback remains blocked until a separate approved run proves:

- Field map to real ResourceSpace field refs.
- API smoke before write.
- Read-before-write conflict detection.
- Write result confirmation.
- Rollback/manual repair plan.

## Backup and Restore

Before teammate beta depends on hosted ResourceSpace:

- Nightly DB backup location identified.
- Filestore backup location identified.
- Restore drill owner assigned.
- Test restore documented.
- No portal launch claim without restore evidence.

## Rollback

- Remove ResourceSpace API env from Vercel if live read is wrong or unsafe.
- Keep portal in unavailable/export mode rather than fallback success.
- Keep writeback disabled.
