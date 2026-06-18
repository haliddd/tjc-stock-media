# Admin Runbook

## Local Mac Reference

Start ResourceSpace and frontend:

```bash
make up
make frontend-dev
```

ResourceSpace:

```text
http://localhost:8088
```

Frontend:

```text
http://localhost:3008
```

## Admin Boundary

Use ResourceSpace for:

- metadata field definitions
- user groups
- permissions
- workflow configuration
- plugins
- storage
- backup/restore
- bulk imports
- delete/purge
- API secrets

Use TJC Stock Media frontend for:

- searching approved media
- viewing safety/usage details
- contributor upload intake
- reviewer queue demo
- approved-copy download path

## Secrets

Never commit `.env`, `.runtime`, database files, filestore files, API keys, or media.

## Weekend Beta Admin Checks

Before any next beta batch, DAM Admin or tech owner verifies names only, never values:

- `BETA_AUTH_ENABLED`
- `BETA_SESSION_SECRET`
- `BETA_VIEWER_PASSWORD`
- `BETA_CONTRIBUTOR_PASSWORD`
- `BETA_REVIEWER_PASSWORD`
- `BETA_ADMIN_PASSWORD`
- `BETA_FEEDBACK_ENABLED`
- `BETA_TASK_MODE_ENABLED`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- `BLOB_READ_WRITE_TOKEN` only if attachment policy is approved
- `RESOURCESPACE_ENABLE_WRITEBACK`
- `RESOURCESPACE_WRITEBACK_MODE`
- `DOWNLOAD_GATE_ALLOW_DEMO_ROLES`

Hosted beta expectations:

- `BETA_SESSION_SECRET` is explicit and random; do not rely on persona-password-derived signing.
- Feedback is either durable through KV or clearly unavailable. Hosted KV failure must not claim feedback was saved.
- Feedback attachments stay disabled for wider beta unless a private/gated attachment policy is approved.
- `RESOURCESPACE_ENABLE_WRITEBACK=0` and `RESOURCESPACE_WRITEBACK_MODE=queued`.
- `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0`.
- Normal Viewer/Contributor beta is photo-only and hides fixture/demo records.

## Emergency Hide / Takedown

If an asset is unsafe, withdrawn, expired, or reported for takedown:

1. Pause reuse of the affected asset or distribution set.
2. In ResourceSpace, set or request the appropriate withdrawal/takedown/review state. Do not delete source media.
3. In the portal, verify the asset no longer appears Portal Ready for Viewer/Contributor.
4. Verify package/distribution set export is blocked if the asset is included.
5. Verify approved-copy download is blocked.
6. Preserve safe evidence: role, route, asset reference, timestamp, expected, actual. Do not capture source paths, original URLs, private people/minors evidence, or secrets in screenshots.
7. Route the issue to the domain owner: rights, RE/minors, doctrine/sacrament, hymn/music, testimony/pastoral, source/provenance, or DAM admin.
8. Record resume/hold/no-go decision in the incident runbook.
