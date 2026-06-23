# Vercel Env Operator Steps

Use the Vercel dashboard. Vercel CLI is not installed in this workspace.

## Manual Setup

1. Open Vercel project settings.
2. Go to Environment Variables.
3. Select Preview only.
4. Add variables from `vercel-preview-env-checklist.md`.
5. Do not add secrets to Git, shell history, docs, screenshots, or chat.
6. Redeploy the Preview branch after env is set.
7. Do not promote to Production.

## Required Project Safety

- Enable Vercel Deployment Protection or equivalent access control before sharing a preview URL.
- Keep Production env unchanged.
- Keep `RESOURCESPACE_ENABLE_WRITEBACK=0`.
- Keep `UPLOAD_STORAGE_PUBLIC_READ=0`.
- Keep source/original downloads disabled.

## Validation After Env And Preview Exist

From local shell with safe env loaded:

```bash
make cloud-beta-preview-preflight
```

Against the Preview URL:

```bash
BASE_URL=<vercel-preview-url> make portal-api-smoke
curl -s "$BASE_URL/api/admin/readiness" > /tmp/cloud-readiness.json
curl -s "$BASE_URL/api/assets/search?limit=12" > /tmp/cloud-search.json
curl -I "$BASE_URL/api/assets/thumbnail/<real-id>"
```

Verify:

- Readiness identifies ResourceSpace staging or an honestly labeled cloud export.
- Search count is reasonable versus 2,061 search-visible local baseline.
- Thumbnails load.
- No source/original URL appears in JSON.
- Download gate blocks source/original.
- Upload submit persists durably.
- Review pending write persists durably.
- Feedback persists durably.
- Viewer cannot access reviewer/admin actions.
- Contributor cannot approve.
- Reviewer cannot access admin config.

Current branch expected result: NO-GO until durable upload intake adapter is implemented and Vercel Preview is connected to ResourceSpace staging.
