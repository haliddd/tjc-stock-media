# ResourceSpace Staging Checklist

Status: CLOUD TEAM BETA NO-GO until a real HTTPS ResourceSpace staging URL and restricted API credentials are available and read-smoked.

## Staging Requirements

- HTTPS URL, for example `https://dam-staging.<domain>`.
- ResourceSpace app running and reachable over HTTPS.
- MariaDB/MySQL persistent DB.
- Persistent ResourceSpace filestore, config, and thumbnails/previews.
- Backups enabled for DB, config, and filestore.
- Admin account locked down.
- Restricted portal API user created.
- Source/original downloads restricted for portal/API user.
- Upload/intake collection configured.
- Review/status fields mapped and recorded in `RESOURCESPACE_FIELD_MAP_JSON`.

Do not claim ResourceSpace staging GO unless the HTTPS URL is reachable and a server-side API read works against the restricted portal API user.

## Minimum VM Path

- Ubuntu VM or managed Linux host.
- Docker and Compose if using containerized ResourceSpace.
- Persistent volume for ResourceSpace filestore.
- Persistent MariaDB/MySQL volume.
- DB backup/snapshot plan.
- Reverse proxy with TLS and HTTP to HTTPS redirect.
- Firewall: only 80/443 public; SSH restricted.
- Admin/API credentials stored in password manager, not repo.
- No public bucket or direct filestore exposure.

## Managed-Host Path

- Prefer ResourceSpace managed/cloud hosting if available.
- Request staging URL, API user, API key, field map, and collection IDs.
- Confirm preview/thumbnail route behavior.
- Confirm source/original access is denied for the portal API user.

## Migration Package Status

No DB dump, filestore copy, or media copy was created in this sprint.

Prepared manifests only:

- `manifests/local-export-files.txt`: requested `.runtime/exports` file list; empty in this checkout.
- `manifests/local-pending-writes.txt`: local pending review write JSON paths.
- `manifests/local-upload-intake.txt`: requested `.runtime/upload-intake` list; directory is absent.
- `manifests/local-intake-batches.txt`: actual local intake batch JSON/manifest paths under `.runtime/intake-batches`.

Source data currently documented from local readiness:

- ResourceSpace metadata/export snapshot source.
- Asset count: 2,290 admin.
- Search-visible count: 2,061.
- Collection count: 19.
- Sample asset ID: `367` (`Bee`).
- Sample collection ID: `album:mvp-2024-first-batch`.
- Local ResourceSpace URL: `http://localhost:8088`.
- Local portal URL noted in readiness docs: `http://localhost:4885`.

Cloud migration must carry:

- DB.
- Filestore.
- Thumbnails/previews.
- Metadata field map.
- Collections/albums.
- User/group permissions needed for restricted beta API access.
