# Vercel Preview Env Checklist

Use Preview environment only. Do not set these in Production for this beta sprint.

## ResourceSpace

```env
RESOURCESPACE_BASE_URL=https://<dam-staging-url>
RESOURCESPACE_API_USER=<restricted-portal-api-user>
RESOURCESPACE_API_KEY=<secret>
RESOURCESPACE_FIELD_MAP_JSON=<json>
RESOURCESPACE_DEFAULT_COLLECTION_ID=<id>
RESOURCESPACE_UPLOAD_COLLECTION_ID=<id>
RESOURCESPACE_REVIEW_COLLECTION_ID=<id>
RESOURCESPACE_ENABLE_WRITEBACK=0
RESOURCESPACE_WRITEBACK_MODE=queued
```

`RESOURCESPACE_FIELD_MAP_JSON` must be a JSON object. It must map review/status fields explicitly before reviewer actions are trusted.

## Beta Auth

```env
BETA_AUTH_ENABLED=true
BETA_SESSION_SECRET=<long-random-secret>
BETA_VIEWER_PASSWORD=<secret>
BETA_CONTRIBUTOR_PASSWORD=<secret>
BETA_REVIEWER_PASSWORD=<secret>
BETA_ADMIN_PASSWORD=<secret>
BETA_CHURCH_INVITE_CODES_JSON=<json>
PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0
NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0
```

## Download Gate

```env
DOWNLOAD_GATE_REQUIRE_APPROVED_COPY=true
SOURCE_ORIGINAL_DOWNLOADS_ENABLED=0
DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0
```

Never enable source/original downloads for cloud team beta.

## Durable Beta Storage

Target architecture after adapters are implemented:

```env
BETA_FEEDBACK_ENABLED=1
BETA_DATABASE_URL=<postgres-url>
PENDING_WRITES_STORE=postgres
UPLOAD_INTAKE_STORE=postgres
BETA_FEEDBACK_STORE=postgres
```

Current branch reality:

- `PENDING_WRITES_STORE=vercel-kv` is implemented when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set.
- `BETA_FEEDBACK_STORE=vercel-kv` is the implemented durable feedback path.
- `PENDING_WRITES_STORE=postgres` is not implemented.
- `UPLOAD_INTAKE_STORE=postgres` is required for target architecture but not implemented.
- `BETA_FEEDBACK_STORE=postgres` is not implemented.
- Cloud beta remains NO-GO until upload intake persistence is implemented and proven.

Current branch safe durable queue values, still NO-GO for upload intake:

```env
PENDING_WRITES_STORE=vercel-kv
BETA_FEEDBACK_STORE=vercel-kv
KV_REST_API_URL=<secret-url>
KV_REST_API_TOKEN=<secret>
UPLOAD_INTAKE_STORE=postgres
```

## Private Upload Storage

```env
UPLOAD_STORAGE_PROVIDER=<s3|r2|vercel-blob|resourcespace-intake>
UPLOAD_STORAGE_BUCKET=<private-bucket>
UPLOAD_STORAGE_REGION=<region>
UPLOAD_STORAGE_ACCESS_KEY_ID=<secret>
UPLOAD_STORAGE_SECRET_ACCESS_KEY=<secret>
UPLOAD_STORAGE_PUBLIC_READ=0
```

Current guard accepts `s3`, `r2`, `vercel-blob`, and `resourcespace-intake` names but fails `resourcespace-intake` as unimplemented/unproven. Upload storage must stay private.

## Feedback And Admin Label

```env
BETA_FEEDBACK_ENABLED=1
BETA_FEEDBACK_STORE=vercel-kv
NEXT_PUBLIC_BETA_LABEL=Team beta
```

## Never Set For First Team Beta

```env
RESOURCESPACE_ENABLE_WRITEBACK=1
RESOURCESPACE_WRITEBACK_MODE=live
UPLOAD_STORAGE_PUBLIC_READ=1
SOURCE_ORIGINAL_DOWNLOADS_ENABLED=1
DOWNLOAD_GATE_ALLOW_DEMO_ROLES=1
NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=1
```
