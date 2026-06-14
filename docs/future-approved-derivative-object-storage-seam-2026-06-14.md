# Future Approved Derivative Object Storage Seam - 2026-06-14

## Goal

Design future object storage for approved derivatives without creating buckets, credentials, public URLs, or live S3/R2 resources.

## Non-Negotiable Boundary

Object storage is for approved delivery objects only:

- Approved web copy.
- Approved print copy.
- Thumbnails/previews if configured.
- Derivative manifests.

Object storage is not:

- Master original custody.
- Public archive.
- Public CDN/embed control surface.
- Normal-route original delivery.

## Provider Comparison

| Provider | Free/cost posture | Private model | Signed URL model | Metadata tags | Adopt when | Risk |
| --- | --- | --- | --- | --- | --- | --- |
| AWS S3 | Free storage program exists, but billing risk remains | Private bucket, block public access, IAM least privilege | Presigned GET via server | Object tags/user metadata | Church already has AWS governance/IAM owner | High cost/public-bucket misconfig risk |
| Cloudflare R2 | Free tier exists for storage/operations; dashboard terms must be verified | Private bucket, API tokens | Signed URLs or Worker-mediated access | Custom metadata | Cloudflare is chosen for origin protection/DNS | Medium; token and public access config risk |
| Vercel Blob | Pricing includes included usage by plan; dashboard proof needed | Store/token model; public/private behavior must be verified for use case | Server-mediated URLs/token usage | Limited object metadata compared with S3/R2 | Small beta attachment/derivative proof, not master | Medium; accidental public blob behavior |

## Object Key Strategy

Use deterministic non-secret keys:

```text
approved-derivatives/{resourceSpaceId}/{derivativeId}/{variant}/{checksumPrefix}.{ext}
manifests/{batchId}/{resourceSpaceId}.json
```

Do not include:

- Original filename.
- Drive path.
- Person names.
- Private folder path.
- Tokens.

## Derivative Manifest

Manifest fields:

- `resource_space_id`
- `portal_asset_id`
- `derivative_id`
- `variant`
- `content_type`
- `byte_size`
- `checksum_sha256`
- `generated_at`
- `review_status_at_generation`
- `approved_channels`
- `usage_scope`
- `object_key_admin_only`
- `storage_provider`
- `takedown_state`

Normal roles receive only role-safe readiness and delivery result, never object key.

## IAM / Token Policy

- No public buckets.
- No wildcard write keys in Vercel if narrower role/token is possible.
- Server reads signed URLs or streams objects.
- Write/generate role separated from read/deliver role.
- Delete/takedown role restricted to DAM Admin/operator process.

## Delivery Flow

1. Portal checks ResourceSpace clearance and portal reuse decision.
2. Portal mints download ticket after terms accepted and required audit persists.
3. Portal resolves derivative manifest.
4. Portal streams approved copy or returns short-lived signed URL only if route policy allows.
5. Portal consumes ticket and records `approved_download`.

## Takedown / Delete

- ResourceSpace lifecycle/rights change triggers derivative takedown queue.
- Object delete is logged.
- Manifest marks `takedown_state`.
- Cached/signed URLs expire quickly.
- No delete of Drive master originals.

## Backup/Restore

- Derivatives can be regenerated from originals plus ResourceSpace metadata where policy allows.
- Manifest backups matter more than object bytes for proof.
- Restore drill must prove selected derivative can be found, verified by checksum, and delivered through ticket gate.

## Current Code Posture

- `frontend/lib/derivative-index.ts` provides local derivative manifest concepts.
- `frontend/lib/media-delivery.ts` reads local approved-copy derivatives.
- `frontend/lib/approved-delivery-gate.ts` centralizes delivery gate.
- `hasS3DeliveryConfig()` detects future S3 env but no live S3 implementation is performed in this run.
