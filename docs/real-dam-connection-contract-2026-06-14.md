# Real DAM Connection Contract - 2026-06-14

## Product Truth

TJC Stock Media must behave like a connected internal DAM only when the chain is real and honest:

Google Shared Drive custody -> ResourceSpace DAM truth -> Next.js portal on Vercel -> durable beta state -> approved derivative delivery -> role-safe UI -> admin readiness proof.

The portal is a governed workbench and read model. It is not the master archive, not a second DAM, not a public portal builder, and not a public share/CDN tool.

## System Ownership

### Google Shared Drive

- Owns master originals.
- Owns folder/album custody and source inventory.
- Can provide checksum/source proof through sanitized manifests.
- Must not expose source paths, private URLs, original filenames, checksums, or folder membership to Viewer or Contributor roles.

### ResourceSpace

- Owns asset record truth, metadata truth, search truth, review states, rights/consent/lifecycle fields, and ResourceSpace ID.
- May own thumbnails/previews if configured.
- Writeback is future/proven only. Current code keeps writeback disabled unless `RESOURCESPACE_ENABLE_WRITEBACK=1` and `RESOURCESPACE_WRITEBACK_MODE=live`, field map is valid, and API smoke passes.

### Portal on Vercel

- Owns role-safe UI, search/read model, review workbench, package/distribution drafts, feedback UI, saved views, download tickets, beta auth, admin readiness, and local proof routes.
- Does not own source truth or approval truth.
- Must fail closed in hosted runtime when durable state is required and unavailable.

### Durable State

- Owns feedback, package drafts, saved searches, audit events, download tickets, pending write queue, and usage analytics only after a durable adapter exists and restore proof passes.
- Current code has Vercel KV feedback support. Generic runtime storage for audit, tickets, packages, saved searches, pending writes, and usage events remains local-filesystem and is blocked in production runtime by `runtime-file-store`.

### Future Object Storage

- Stores approved derivatives/delivery objects only.
- Does not store master originals as the system of record.
- Must use private buckets/objects and signed delivery.
- Must not introduce public bucket, public share, public CDN/embed controls, or normal-route original delivery.

## Seam Contract

| Seam | Data owner | Source of truth | Allowed fields | Forbidden fields | Role permission | Failure mode | Audit event | Current proof | Missing proof |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Drive -> ResourceSpace | Google Shared Drive / DAM Admin | Drive for master custody, ResourceSpace after import for DAM record | Drive file ID, sanitized folder/album ref, checksum hash as Admin-only proof, import batch ID | Raw private path, unrestricted share link, originals in portal payload | Admin-only custody trace; Reviewer duplicate checks if scoped | Import waits/manual review; no portal claim | Import/custody audit future | Docs and env names exist | Sanitized custody manifest and manual import proof |
| ResourceSpace -> Portal API | ResourceSpace | ResourceSpace API or latest CSV export | Asset ID/ref, title, status, rights, consent, lifecycle, approved copy readiness, role-safe thumbnails | API keys, raw source paths to normal roles, writeback success claims | Viewer/Contributor get redacted read model; Reviewer/Admin get ops fields | Live API failure falls to export; no records falls to fallback, visibly diagnostic for Admin | Search/view audit where applicable | `frontend/lib/media-source/index.ts`, pagination tests | Hosted read-only smoke against real ResourceSpace |
| Portal API -> UI | Portal | Portal API response | Role-safe asset payload, source mode label, clearance, next action | Source path, original filename, checksum, private URL, admin-only source status for normal roles | `source-redaction.ts` and backend identity gates | Error/unavailable state, not fake DAM success | Asset view/search signals | Private source and payload guards | Hosted browser QA with real roles |
| Portal -> Download Ticket | Portal | Download ticket store | Ticket ID/token hash, role, actor, asset ID, expiry, terms acceptance | Original URL, source path, raw token in logs | Roles allowed by `buildPortalReuseDecision` | Missing/expired/mismatch blocks | `download_gate_checked`, `denied_download` | `approved-delivery-gate.ts`, tests/guards | Durable ticket adapter for hosted production |
| Download Ticket -> Approved Derivative | Portal / future object store | Approved derivative manifest | Approved-copy derivative bytes, content type, safe filename | Master/original bytes, storage path, public object URL | Normal route only returns approved copy after ticket consume | Missing derivative blocks; required audit failure blocks | `approved_download` | Gate centralization and no-store image response | Real object storage signed delivery smoke |
| Portal -> Feedback Store | Portal | KV/Blob when configured | Feedback record, role, route, severity, optional attachment ref | Secrets, private source data, raw sensitive media | Named beta testers only | Hosted runtime returns 503 if KV missing/fails | `beta_feedback_submitted`, `beta_feedback_triaged` | New fail-closed feedback logic | Vercel KV/Blob dashboard proof and hosted smoke |
| Portal -> Package/Draft Store | Portal | Future durable store | Resource references, sections, governance summary | Source files, ZIP, public link, permission truth | Contributor+ save; Reviewer/Admin list | Production runtime blocks local write | `package_draft_saved`, `package_share_decision` | Local role gates and copy | Durable store adapter and restore proof |
| Portal -> Audit Store | Portal | Future durable audit store | Accountability event, actor, role, safe details | Secrets, private URLs, raw source data to normal roles | Admin/Reviewer audit views only | Required audit failure blocks downloads | Many audit event types | Local JSONL with required audit for delivery | Durable identity-backed audit store |
| ResourceSpace -> Pending Writeback Queue | ResourceSpace / Portal queue | ResourceSpace remains final truth | Pending decision, evidence, reviewer note, target fields | Fake final approval | Reviewer/Admin only | Queued/failed/conflict state; no success claim | `review_pending_write_queued`, `resourcespace_write_*` | Writeback guards and disabled default | Live writeback approval and confirmation smoke |
| Future S3/R2 -> Approved Derivative Delivery | Object store / Portal | Derivative manifest plus ResourceSpace approval | Object key, derivative checksum, signed URL metadata, takedown state | Originals, public bucket URL, source path | Download ticket only | Signed URL creation failure blocks delivery | `approved_download`, `rendition_request_recorded` | Design seam docs/env names | Provider decision, private bucket, signed URL smoke |

## Current Honesty Rules

- Live ResourceSpace means API credentials are present, search succeeds, and pagination completes.
- Export snapshot means latest local ResourceSpace CSV is read-only and approval writes remain queued.
- Fallback means no live/export data; normal teammate UI must not present it as real DAM success.
- Hosted Vercel success cannot rely on local JSON or memory while claiming durability.
- Admin may see source mode diagnostics; Viewer and Contributor see media-library language.
