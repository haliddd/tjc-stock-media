# ResourceSpace Integration Status

Last updated: 2026-06-10

## Data Flow

Data engineering posture: follow `docs/data-engineering-playbook.md`. The
current system is a canonical asset metadata catalog over Google Shared Drive,
ResourceSpace, portal read models, metadata exports, audit logs, and future AI
sidecars. Do not add a warehouse, lake, vector database, or custom canonical
database until the playbook trigger points are met.

```txt
Google Shared Drive / Amazon S3
        ↓
ResourceSpace
        ↓
True Jesus Church Media Library UI
```

ResourceSpace is the canonical source for asset records, metadata, review state, collections, previews, and permissions. Google Shared Drive remains master-original custody. Amazon S3 remains the intended approved derivative and preview delivery layer. The Media Library UI must consume backend API routes only.

Backend routes expose a Media source session envelope so every portal surface reports source truth the same way:

```json
{
  "source": "...role-safe source status...",
  "sourceStatus": "...same status for older callers...",
  "sourceKind": "resourcespace | fallback-fixtures | media-library",
  "live": true
}
```

Reviewer/Admin responses may show operational ResourceSpace/export details. Viewer/Contributor responses receive role-safe media-library copy where operational source truth would leak custody or setup details.

## What Works Now

- Read-only ResourceSpace metadata export search through `/api/assets/search`.
- Read-only asset detail through `/api/assets/:id`.
- Backend thumbnail route with explicit unavailable/failure states.
- Backend download gate checks with audit logging.
- Viewer download denial for unsafe/unapproved access.
- Portal pending-sync review events when ResourceSpace writeback is not configured.
- Disconnected fallback mode, visibly labeled as fixture fallback.

## What Is Read-Only

- ResourceSpace CSV/export records.
- Review queue decisions. Reviewer actions create portal pending-sync events and do not mutate ResourceSpace truth.
- Package builder. Drafts store ResourceSpace IDs in local UI state; publishing is blocked unless all visible refs are approved and share-link infrastructure is wired.

## What Does Not Work Yet

- Live ResourceSpace API reads require server-only credentials. The portal has a signed API adapter and falls back to export mode when credentials or endpoints fail.
- Live ResourceSpace review writeback is gated by `RESOURCESPACE_ENABLE_WRITEBACK=1`, `RESOURCESPACE_WRITEBACK_MODE=live`, a valid field map, and a ResourceSpace API smoke check. Otherwise decisions remain pending-sync.
- ResourceSpace collection endpoint reads for Brand Hub are backend-gated and report setup/error states when collection IDs or credentials are missing.
- Google Shared Drive ingest automation.
- S3 derivative generation and signed delivery.
- SSO-backed identity and group claims. A trusted-header shim is available, but production IdP headers still need verification.
- Durable external audit/event analytics storage. Local SQLite usage analytics is available when `PORTAL_USAGE_LOGGING=1`; external analytics remains pending.

## Required Server-Only Env Vars

```txt
RESOURCESPACE_BASE_URL=
RESOURCESPACE_API_USER=
RESOURCESPACE_API_KEY=
RESOURCESPACE_FIELD_MAP_JSON=
RESOURCESPACE_DEFAULT_COLLECTION_ID=
RESOURCESPACE_ENABLE_WRITEBACK=0
RESOURCESPACE_WRITEBACK_MODE=queued

S3_BUCKET=
S3_REGION=
S3_ACCESS_ROLE=
S3_PREVIEW_PREFIX=
S3_ORIGINAL_PREFIX=

GOOGLE_SHARED_DRIVE_ID=
GOOGLE_APPLICATION_CREDENTIALS=

SSO_PROVIDER=
SSO_CLIENT_ID=
SSO_TRUSTED_HEADERS=0
SSO_ROLE_MAP_JSON=
PORTAL_USAGE_LOGGING=0
USAGE_ANALYTICS_DSN=
USAGE_ANALYTICS_DB_PATH=

BRAND_KIT_MVP_2024_COLLECTION_ID=
BRAND_KIT_LOGO_COLLECTION_ID=
BRAND_KIT_SOCIAL_TEMPLATES_COLLECTION_ID=
```

Legacy `RS_BASE_URL`, `RS_API_USER`, and `RS_API_KEY` are still accepted. Do not expose ResourceSpace, S3, or Drive secrets with `NEXT_PUBLIC_`.

## Field Map

`RESOURCESPACE_FIELD_MAP_JSON` should map portal field names to ResourceSpace field refs or export column names. Unknown ResourceSpace IDs should stay documented rather than hardcoded.

Minimum required mapping keys:

```json
{
  "title": "title",
  "approvalStatus": "publish_status",
  "usageRights": "usage_terms",
  "licenseType": "license_type",
  "territory": "territory",
  "modelRelease": "model_release",
  "propertyRelease": "property_release",
  "categories": "tjc_terms",
  "keywords": "visible_content_tags",
  "usageChannels": "usage_terms"
}
```

## Preview And Download Rules

- Preview UI must never substitute generated prototype imagery for missing real previews.
- Missing preview shows an explicit unavailable/failure/unsupported state.
- Approved-copy download must use backend gate first.
- Private originals, private S3 URLs, ResourceSpace secrets, and uncontrolled Drive links must not reach browser payloads.

## Brand Hub Mapping

Brand Hub editorial content can exist in the portal. Downloadable assets must come from ResourceSpace collection/source mappings.

Current route: `/api/brand-kits/mvp-2024`
Current registry: `frontend/lib/brand-kits.ts`

If `BRAND_KIT_MVP_2024_COLLECTION_ID` is missing, the UI shows setup state and disables downloads. If it is configured but no export records match collection/source membership, the UI reports that mismatch instead of inventing files.

When ResourceSpace API credentials are configured, Brand Hub uses the ResourceSpace collection endpoint through backend routes and resolves collection resource IDs against ResourceSpace metadata records. If the collection endpoint fails, responses include `collectionStatus` and keep downloads blocked or clearly setup-gated instead of showing fake kit files.

## Writeback Guard

Reviewer decisions create a local pending write record first. Live ResourceSpace updates happen only when all are true:

- `RESOURCESPACE_ENABLE_WRITEBACK=1`
- `RESOURCESPACE_WRITEBACK_MODE=live`
- ResourceSpace API credentials are configured
- the field map contains approval, reviewer, review date, and notes fields
- ResourceSpace API smoke succeeds

If any condition fails, the pending write stays queued or sync-failed and the UI/API must not claim ResourceSpace was updated.

Rehearse the no-live-writeback guard before inviting testers:

```bash
BASE_URL=http://localhost:4871 make portal-writeback-guard-smoke
```

This smoke expects ResourceSpace live writeback to be unavailable. It verifies Admin readiness reports review writeback as non-operational, incomplete reviewer evidence is blocked, complete reviewer evidence returns `202` queued pending-write truth, and pending-write readiness remains visible. Do not run it against a staging server where live ResourceSpace writeback has intentionally been enabled.

## SSO-Ready Shim

Production SSO is deferred. Local rehearsal can map trusted-header shim inputs when `SSO_TRUSTED_HEADERS=1`, but production no longer treats generic `x-tjc-role`, `x-auth-request-email`, or `x-auth-request-groups` as authority. Production trusted SSO currently requires `SSO_PROVIDER=cloudflare-access` plus Cloudflare Access assertion/email headers; role mapping comes from Cloudflare Access groups and optional `SSO_ROLE_MAP_JSON`. Query/form roles are never hosted authority; local overrides require explicit server-only override env and are disabled for protected proof.

Rehearse the trusted-header path before inviting teammates:

```bash
cd frontend
SSO_TRUSTED_HEADERS=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0 TJC_STOCK_MEDIA_ROOT=/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run npm exec next dev -- --port 4871
```

Then run:

```bash
BASE_URL=http://localhost:4871 make portal-sso-smoke
```

The smoke checks that local trusted-header rehearsal personas override beta `role=Viewer` inputs for read, review, package, collection, upload, feedback, and download-gate routes while unsafe downloads remain blocked. This is local proof only; hosted production role proof still requires beta session cookies or Cloudflare Access assertion/email proof.

## Durable Analytics

When `PORTAL_USAGE_LOGGING=1`, the portal records search, asset view, download gate, review action, and Brand Hub view events into local SQLite at `.runtime/analytics/portal-usage.sqlite` or `USAGE_ANALYTICS_DB_PATH`. Insights can replace sample search/asset rows when real event rows exist.

Rehearse local durable analytics before relying on Insights for beta decisions:

```bash
cd frontend
SSO_TRUSTED_HEADERS=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0 PORTAL_USAGE_LOGGING=1 TJC_STOCK_MEDIA_ROOT=/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run npm exec next dev -- --port 4871
```

Then run:

```bash
BASE_URL=http://localhost:4871 make portal-usage-smoke
```

The smoke records search, dynamically selected asset view, dynamically selected blocked download gate, dynamically selected review action, and Brand Hub usage events, then verifies the SQLite database contains those event types with actor identity and a unique search marker.

## Delivery Privacy Smoke

S3 signed delivery is not production-ready until staging credentials, derivative generation, and signed URL expiry behavior are verified. Current beta proof is narrower and intentional: browser-facing Viewer/Contributor payloads and blocked download gates must not expose S3 paths, private bucket URLs, env names, source paths, master-drive paths, checksums, or original filenames.

Rehearse delivery privacy before inviting teammates:

```bash
cd frontend
SSO_TRUSTED_HEADERS=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0 TJC_STOCK_MEDIA_ROOT=/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run npm exec next dev -- --port 4871
```

Then run:

```bash
BASE_URL=http://localhost:4871 make portal-delivery-smoke
```

The smoke checks Viewer/Contributor search and asset payloads, blocked Viewer download, blocked Reviewer download-gate POST, and DAM Admin S3 readiness copy. Admin readiness may report Amazon S3 setup status, but it must not claim production signed delivery until a real staging S3 smoke exists.

## Hosted Beta Smoke

After a Vercel deployment, run:

```bash
BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe
```

The read-only probe checks unauthenticated hosted route protection and query-role denial without POST, hosted writeback, env mutation, raw body/header capture, or tester invite behavior. The mutating hosted smoke checks feedback POST and DAM Admin feedback inbox only after explicit owner approval:

```bash
PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1 PORTAL_HOSTED_SMOKE_APPROVED_BY=<owner-or-ticket> BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-smoke
```

## Feedback Operations Smoke

Before widening teammate testing, rehearse feedback intake and triage against a local or hosted beta server:

```bash
BASE_URL=http://localhost:4871 make portal-feedback-smoke
```

The smoke submits Viewer feedback, proves Viewer cannot open the feedback inbox, verifies DAM Admin can list it, patches severity/status/notes, and confirms Admin readiness reports the feedback storage mode. Local runs use `data/runtime/beta-feedback.json`; hosted runs should use Vercel KV/Blob when configured.

## Next Integration Work

1. Confirm ResourceSpace API signing and collection endpoints.
2. Replace export collection matching with live ResourceSpace collection reads.
3. Verify review status writeback on a staging ResourceSpace field.
4. Add real staging S3 signed derivative delivery smoke test.
5. Wire SSO role claims to existing backend permission decisions.
6. Connect Vercel KV/Blob or Upstash Redis/Blob storage for durable teammate feedback before larger testing.
