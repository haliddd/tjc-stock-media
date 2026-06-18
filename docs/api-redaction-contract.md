# API Redaction Contract

Last updated: 2026-06-18

Purpose: define fields and claims that normal roles must not receive from APIs, UI props, exports, or evidence artifacts.

## Forbidden For Viewer And Contributor

| Field/category | Examples |
|---|---|
| Source paths | Google Drive folder path, local import path, Shared Drive absolute path, album export path |
| Originals/master files | original URL, master URL, preservation copy URL, signed source URL |
| Checksums/private ids | SHA-256, exact duplicate checksum, private storage key, raw ResourceSpace internal ids unless converted to safe reference code |
| Admin/private evidence | private notes, reviewer-only evidence, incident internals, writeback config |
| Secrets/env | API keys, ResourceSpace keys, invite codes, Vercel env values, credential filenames |
| Private custody metadata | raw EXIF/GPS/private source context unless reviewed and explicitly safe |

## Allowed For Normal Roles

| Safe field | Notes |
|---|---|
| `asset_ref` or reference code | Non-sensitive stable reference for support/request flow |
| Redacted title/description/tags | Must not reveal private people/minors/source paths |
| Trust/reuse labels | Stock-safe, context-safe, archive-only, needs review |
| Blocker reason | Plain-language reason without private source details |
| Preview derivative | Only if safe and source path is not exposed |
| Request/package draft ids | Sanitized refs only |

## Reviewer/Admin Handling

- Reviewer/Admin may see operational summaries needed for governance, but generic exports still avoid raw source paths, signed URLs, secrets, and checksums unless explicitly approved for an ops-only artifact.
- Admin views must distinguish local JSON/snapshot from durable production storage.
- ResourceSpace ids should be labeled as admin/source-of-truth references, not user-facing approval.

## Required Guards

- `node scripts/api-payload-guard.mjs`
- `node scripts/private-source-guard.mjs`
- role-specific browser QA where practical
- tests for any new presenter/helper that transforms custody, refs, packages, saved searches, or downloads
