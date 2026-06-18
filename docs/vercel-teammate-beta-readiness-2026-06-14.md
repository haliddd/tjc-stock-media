# Vercel Teammate Beta Readiness - 2026-06-14

## Verdict

Vercel teammate beta is not proven ready in this run. The code has stronger fail-closed behavior, but dashboard/project/env/protection/durable state were not verified because that would require human login, 2FA, and secret entry.

## Project Connection Requirements

- Vercel project must connect to GitHub repo `haliddd/tjc-stock-media`.
- Build root must target the Next.js frontend as configured by repo/project settings.
- Preview access must be restricted to named testers through deployment protection or equivalent origin protection.
- No production deploy or public promotion during this run.

## Required Env Names

No values in docs:

- `BETA_AUTH_ENABLED`
- `BETA_SESSION_SECRET`
- `BETA_VIEWER_PASSWORD`
- `BETA_CONTRIBUTOR_PASSWORD`
- `BETA_REVIEWER_PASSWORD`
- `BETA_ADMIN_PASSWORD`
- `RESOURCESPACE_BASE_URL`
- `RESOURCESPACE_API_USER`
- `RESOURCESPACE_API_KEY`
- `RESOURCESPACE_API_PAGE_SIZE`
- `RESOURCESPACE_API_MAX_PAGES`
- `RESOURCESPACE_ENABLE_WRITEBACK=0`
- `RESOURCESPACE_WRITEBACK_MODE=queued`
- `BETA_FEEDBACK_ENABLED=1`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- Optional: `BLOB_READ_WRITE_TOKEN`
- `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0`
- `NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0`
- `NEXT_PUBLIC_BETA_FEEDBACK_ENABLED=1` only if feedback widget should appear
- `NEXT_PUBLIC_BETA_TASK_MODE_ENABLED=1` only if guided task mode should appear

## Beta Auth

Current code supports password-based beta personas through `/beta-login` and a signed `tjc_beta_session` cookie. This is temporary QA access only:

- Viewer: library browsing, clearance reading, approved-copy request where allowed.
- Contributor: intake and draft workflows without approval authority.
- Reviewer: review queue and evidence checks.
- DAM Admin: diagnostics and readiness cockpit.

Production identity remains blocked until real SSO/origin protection is configured and verified.

## Durable Store Requirements

Hosted success cannot rely on local JSON fallback.

- Feedback: Vercel KV/Redis required. Current hardening returns 503 when hosted runtime lacks KV or KV read/write fails.
- Feedback attachments: Blob required before attachments are accepted as durable proof.
- Saved searches: current store is local JSON only; do not promise team-wide persistence.
- Packages/distribution drafts: current store is local JSON only; do not promise team-wide persistence.
- Download tickets: current store is runtime filesystem; production runtime blocks writes without durable generic adapter.
- Audit log: current store is local JSONL; production audit durability is not proven.

## ResourceSpace Availability

Hosted Vercel needs server-side ResourceSpace API env values or a deliberately uploaded export snapshot process. Normal UI must not present fallback as real DAM. Admin readiness must show live/export/fallback truth.

## Hosted Smoke Plan

Read-only hosted smoke can run after human confirms URL and env:

```bash
BASE_URL=https://<vercel-preview-url> scripts/portal-hosted-smoke.sh
```

Mutating hosted smoke requires human approval:

- Feedback submit.
- Package draft save.
- Saved search save.
- Download ticket mint/consume.

## Rollback

- Rotate beta passwords and session secret.
- Remove tester access in Vercel deployment protection.
- Disable `BETA_FEEDBACK_ENABLED` if KV fails.
- Remove ResourceSpace API env values if reads are wrong or leak data.
- Keep writeback disabled.

## Teammate Test Scope

Allowed after blockers clear:

- Log in as assigned persona.
- Search real ResourceSpace-backed or export-backed photo records.
- Inspect clearance and next action.
- Request review/download through approved-copy gate only.
- Submit feedback if KV is configured.

Not allowed:

- Public sharing.
- Source/original access through normal UI.
- Uploading sensitive production media.
- Treating package/collection membership as permission.
- Treating tags or AI suggestions as approval.
