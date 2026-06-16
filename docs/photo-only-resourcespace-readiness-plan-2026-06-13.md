# Photo-Only ResourceSpace Readiness Plan - 2026-06-13

Status: dry-run plan only. No infra, env, ResourceSpace, Google Drive, storage, billing, DNS, or production data changes.

## Scope

- Current hosted beta remains photo-only.
- Google Shared Drive remains master-original custody.
- ResourceSpace remains DAM/search/review source of truth.
- Portal remains governed workbench/read model.
- Writeback remains queued/dry-run until human proof.
- Derivative delivery must use approved copies only; originals stay out of normal UI.

## Dry-Run Inventory

Run locally or in a reviewed CI context:

```bash
node scripts/photo-only-resourcespace-readiness.mjs
```

The script prints env names and set/missing status only. It must never print values.

Unsafe states that fail the dry run:

- `RESOURCESPACE_ENABLE_WRITEBACK=1` with `RESOURCESPACE_WRITEBACK_MODE=live`
- production runtime with `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=1`
- feedback attachments enabled without attachment storage policy/token

## Migration Checklist

| Gate | Required proof | Status |
| --- | --- | --- |
| ResourceSpace read API | Paginated read proof, failure-safe partial-page handling, no public secrets | Human proof required |
| Photo-only scope | Normal roles see photo-only hosted beta; video/audio remains future architecture | PR evidence required |
| Field map | Server-only field map; no public env secrets | Human proof required |
| Approved derivatives | Portal serves approved copies/thumbnails only; no originals or private URLs | Local + hosted read-only proof required |
| Download gate | Blocked/non-portal-ready media cannot download | Local + hosted proof required |
| Writeback | Queued/dry-run unless live API update plus re-read confirmation is proven | NO-GO for live |
| Backup/restore | ResourceSpace DB/files, metadata exports, runtime evidence, and rollback path documented | Human proof required |
| Cost sentinel | Oracle/Vercel/Upstash/Blob usage and limits reviewed before wider beta | Human proof required |

## Duplicate Candidate Report Plan

Safe dry-run only:

- Use ResourceSpace export fields or API metadata, not source media bytes.
- Compare ResourceSpace refs, source album membership, title, dimensions, file size, and checksum only if checksum is already part of admin-only export.
- Report candidates to Admin/Reviewer only.
- Do not delete, merge, rename, move, or relink anything automatically.
- Preserve every source album membership and source path in ResourceSpace/Shared Drive custody records.

## Vercel Preview Proxy Contract

Allowed:

- Request approved derivative by portal asset id.
- Validate content type by bytes before returning.
- Return `Cache-Control: private` or `no-store` depending on preview/download path.
- Return generic unavailable/blocked copy without backend URL.

Not allowed:

- Return original/master/source file bytes.
- Return ResourceSpace private URL, signed URL, Blob URL, S3 URL, file path, checksum, or source path.
- Treat generated demo fallback as real hosted approved delivery.
- Add public CDN/embed/share controls.

## Rollback Notes

- Vercel rollback: previous deployment only after human approval.
- Env rollback: revert env values by name from reviewed inventory; never commit values.
- Feedback rollback: disable beta feedback if durable store is unhealthy.
- Writeback rollback: keep queued/dry-run; do not enable live mode during incident.
- Delivery rollback: disable approved-copy download gate if leakage is suspected.

## Recommendation

Hold next batch. Tiny named beta may continue only while P0/P1 remain zero and feedback remains durable/reviewed. Wider church rollout remains NO-GO until SSO/origin protection, durable storage, ResourceSpace writeback proof, production derivative delivery, rights/media review, and backup/restore gates are proven.
