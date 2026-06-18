# Photo-Only Hosted ResourceSpace Runbook

Status: weekend launch-candidate runbook. This does not approve Oracle resource creation, paid services, production deploy, live writeback, public sharing, or wider beta.

## Scope

Current target:

- Photo-only hosted ResourceSpace beta.
- Vercel portal stays as governed workbench/read model.
- ResourceSpace remains DAM/search/review source of truth.
- Google Shared Drive remains master-original custody.
- Normal beta surfaces show photo records only.
- Video/audio remain future architecture only.

Non-goals:

- No video/audio players, transcoding, browser large-media upload, or audio/video review workflows.
- No public CDN/embed links or public share links.
- No live ResourceSpace writeback.
- No original/master delivery through the portal.
- No paid Oracle/Vercel/Upstash/Blob resource without human approval.

## Architecture Boundary

```text
Browser
  -> Vercel Next.js portal
  -> server-side ResourceSpace preview/thumbnail route
  -> hosted ResourceSpace photo derivatives

Google Shared Drive
  -> master-original custody
  -> never normal browser delivery

ResourceSpace
  -> DAM catalog, metadata, review, search, derivative source
  -> backend/admin only for source/original details

Portal
  -> role-aware read model, feedback, review queue, packages/distribution planning
  -> no originals, source paths, checksums, private URLs, signed URLs, or admin internals to Viewer/Contributor
```

## Required Hosted Env Names

Record names only. Never commit values.

| Env name | Requirement |
|---|---|
| `BETA_AUTH_ENABLED` | `true` for hosted beta login gate. |
| `BETA_SESSION_SECRET` | Required explicit random server secret for hosted/prod. |
| `BETA_VIEWER_PASSWORD` | Viewer beta persona password. |
| `BETA_CONTRIBUTOR_PASSWORD` | Contributor beta persona password. |
| `BETA_REVIEWER_PASSWORD` | Reviewer beta persona password. |
| `BETA_ADMIN_PASSWORD` | DAM Admin beta persona password. |
| `BETA_FEEDBACK_ENABLED` | Enabled only when hosted storage behavior is understood. |
| `BETA_TASK_MODE_ENABLED` | Internal beta task mode only. |
| `KV_REST_API_URL` | Durable hosted feedback and throttle storage. |
| `KV_REST_API_TOKEN` | Server-only KV token. |
| `BLOB_READ_WRITE_TOKEN` | Keep unset or attachments disabled unless private attachment policy is approved. |
| `RESOURCESPACE_BASE_URL` | Server-only ResourceSpace endpoint. |
| `RESOURCESPACE_API_USER` | Server-only ResourceSpace user. |
| `RESOURCESPACE_API_KEY` | Server-only ResourceSpace API key. |
| `RESOURCESPACE_FIELD_MAP_JSON` | Server-only field map. |
| `RESOURCESPACE_ENABLE_WRITEBACK` | Keep `0` for hosted beta. |
| `RESOURCESPACE_WRITEBACK_MODE` | Keep `queued` for hosted beta. |
| `DOWNLOAD_GATE_ALLOW_DEMO_ROLES` | Keep `0`. |
| `SSO_TRUSTED_HEADERS` | Keep `0` until origin protection is proven. |

## ResourceSpace Preview Proxy Acceptance

The stable browser URL may stay `/api/assets/thumbnail/:id`, but the server must:

- resolve the role-safe asset record by ResourceSpace reference or portal-safe ID
- verify role and preview permission before fetch
- fetch only ResourceSpace preview derivative or safe web derivative
- enforce content-type allowlist
- enforce response size limit and timeout
- use private/safe cache policy
- return honest unavailable placeholder on failure
- never expose ResourceSpace admin URLs, source paths, original URLs, signed URLs, checksums, master paths, internal server paths, or API secrets

Missing preview copy: say preview proxy unavailable or preview missing.

Missing approved-use copy: block download and say approved copy missing.

ResourceSpace unavailable: show degraded state. Do not substitute fixture fallback as real media.

## Photo Migration Inventory

Before any hosted ResourceSpace migration, produce:

| Report | Rule |
|---|---|
| DB resource count | Count actual DAM records, not filestore/cache files. |
| Exported photo record count | Normal beta target must be photo-only. |
| Original-like file count | Separate from derivative/cache count. |
| ResourceSpace derivative/cache count | Do not report as photo count. |
| Filestore total size | Include ResourceSpace runtime files only. |
| MariaDB dump size | Include restore proof. |
| Missing preview derivative count | Blocks preview completeness claim. |
| Missing approved-copy derivative count | Blocks approved-download readiness. |
| `file_checksum` coverage | Supports duplicate audit only. |
| Exact duplicate groups by checksum | Preserve album/source membership. |
| Near-duplicate candidates | Filename, dimensions, date, source album, title. |
| Source album membership preservation | Do not collapse duplicates automatically. |

Exclude backups, scratch QA files, screenshots except approved evidence, old zip archives, local runtime junk, secrets, `.env`, and video/audio source folders from photo runtime counts.

## Runtime Storage Matrix

| Feature | Local store | Hosted store | Required behavior |
|---|---|---|---|
| Feedback | local JSON/memory | Vercel KV | Hosted KV failure must fail closed, not claim saved. |
| Feedback attachments | local/Blob branch | Blob if enabled | Wider beta should keep attachments disabled unless private/gated. |
| Login throttle | memory local | KV when configured | Hosted KV failure should fail closed when configured. |
| Audit log | local JSONL | durable store not proven | Do not treat missing analytics/audit as zero incidents. |
| Pending writes | local/runtime | durable store not proven | Queued is not synced. |
| Download tickets | local/runtime | durable enough for session required | Fail closed when audit/ticket state is unavailable. |
| Packages/saved views | beta-local unless durable | durable store not proven | References only, never permission truth. |
| Usage analytics | local SQLite optional | external not proven | Unavailable is not zero. |

## Rollback

If a hosted deployment or config change creates safety risk:

1. Pause active beta tasks and tell testers not to retry downloads, uploads, review decisions, or attachment uploads.
2. Roll back Vercel to previous known-good deployment.
3. Restore prior env values from Vercel history or password manager. Do not print values into tickets or docs.
4. Keep `RESOURCESPACE_ENABLE_WRITEBACK=0` and `RESOURCESPACE_WRITEBACK_MODE=queued`.
5. Disable feedback temporarily with `BETA_FEEDBACK_ENABLED=0` only if feedback storage itself is unsafe; otherwise keep feedback available for incident reports.
6. Confirm `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0`.
7. Run local guards and only run hosted mutating smoke after human approval.
8. Record incident in feedback runbook and weekend report.

## No-Go Conditions

Hold or stop if:

- Oracle asks for paid resources or storage.
- ResourceSpace cannot fit in Always Free scope.
- Vercel cannot securely reach ResourceSpace preview derivatives.
- Viewer/Contributor sees source/original/master/private path/checksum/signed URL/admin internals.
- Audio/video appears in normal photo-only beta.
- Fixture data looks like real media.
- Feedback is not durable but UI says saved.
- Live writeback is enabled or claimed without proof.
- Hosted smoke fails after a change.
