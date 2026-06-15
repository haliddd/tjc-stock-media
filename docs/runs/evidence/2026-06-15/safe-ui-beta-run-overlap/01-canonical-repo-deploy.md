# 01 Canonical Repo And Deploy - 2026-06-15

## Scope

This doc records repo/deployment alignment for the isolated safe UI beta-proof run.

## Evidence Captured

| Item | Value |
|---|---|
| Source checkout | `/Users/halim4pro/Desktop/MVP/tjc-stock-media` |
| Isolated worktree | `/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run` |
| GitHub remotes found | `origin=https://github.com/Hali0321/tjc-stock-media.git`; `haliddd=https://github.com/haliddd/tjc-stock-media.git` |
| Canonical GitHub repo owner/name | BLOCKED: two remotes exist; Hali confirmation needed |
| Canonical branch | BLOCKED: isolated branch is proof branch, not confirmed beta branch |
| Branch | `codex/safe-ui-beta-proof-2026-06-15` |
| Start commit | `a22497e96004024928128990f432806b768930a6` |
| Current HEAD commit | `a22497e96004024928128990f432806b768930a6` |
| Hali intended beta repo/branch | BLOCKED: not confirmed |
| Vercel project name | BLOCKED: not available from local repo without account/env access |
| Hosted beta URL | historical docs mention `https://tjc-stock-media.vercel.app`; read-only probe reached beta-login surface |
| Hosted URL points to recorded commit | BLOCKED: read-only probe did not prove deployed commit |
| Local BASE_URL | `http://localhost:4871` |
| Local install command | `npm --prefix frontend install` if dependencies missing; node_modules already present in this worktree |
| Local dev/start command | protected proof used `cd frontend && SSO_TRUSTED_HEADERS=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0 npx next dev --port 4871` |
| Secrets redacted | yes |

## Command Inventory

Make targets available:

```text
init, up, down, restart, logs, smoke, tag-search-static-smoke, import-audit,
import-mvp-batch, approve-mvp-batch, heic-derivatives, polish-mvp-ui,
lm-photos-zip-inventory, lm-photos-stream-run, lm-photos-run-report,
video-manifest, export-metadata, backup, restore-test, launch-readiness,
live-dam-surface-guard, api-identity-guard, api-audit-guard,
api-payload-guard, private-source-guard, public-env-guard,
git-hygiene-guard, storage-honesty-guard, frontend-dev, frontend-check,
demo-check, portal-api-smoke, portal-sso-smoke, portal-usage-smoke,
portal-delivery-smoke, portal-download-ticket-smoke,
portal-writeback-guard-smoke, portal-package-smoke,
portal-saved-search-smoke, portal-feedback-smoke, portal-beta-rehearsal,
portal-hosted-smoke, portal-browser-qa
```

Frontend npm scripts:

```text
dev, build, start, typecheck, test, check
```

Missing expected smoke/guard targets:

```text
none found from the uploaded prompt's expected command list
```

Required env var names observed in templates/code, values redacted:

```text
BASE_URL, BETA_AUTH_ENABLED, BETA_FEEDBACK_ENABLED, BETA_ROLE_OVERRIDE_ENABLED,
BETA_SESSION_SECRET, BETA_TASK_MODE_ENABLED, BLOB_READ_WRITE_TOKEN,
DOWNLOAD_GATE_ALLOW_DEMO_ROLES, GOOGLE_APPLICATION_CREDENTIALS,
GOOGLE_SHARED_DRIVE_ID, KV_REST_API_TOKEN, KV_REST_API_URL,
NEXT_PUBLIC_BETA_FEEDBACK_ENABLED, NEXT_PUBLIC_BETA_TASK_MODE_ENABLED,
NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH, PORTAL_ALLOW_BETA_ROLE_OVERRIDE,
PORTAL_QA_TRUSTED_HEADERS, PORTAL_USAGE_LOGGING,
PRODUCTION_REQUIRE_TRUSTED_IDENTITY, RESOURCESPACE_API_KEY,
RESOURCESPACE_API_MAX_PAGES, RESOURCESPACE_API_PAGE_SIZE,
RESOURCESPACE_API_USER, RESOURCESPACE_BASE_URL, RESOURCESPACE_ENABLE_WRITEBACK,
RESOURCESPACE_FIELD_MAP_JSON, RESOURCESPACE_WRITEBACK_MODE, RS_API_KEY,
RS_API_USER, RS_BASE_URL, RUNTIME_STORE, S3_ACCESS_ROLE, S3_BUCKET,
S3_REGION, SSO_CLIENT_ID, SSO_PROVIDER, SSO_ROLE_MAP_JSON,
SSO_TRUSTED_HEADERS, USAGE_ANALYTICS_DB_PATH, USAGE_ANALYTICS_DSN
```

## Worktree Isolation

Long-running build/dev/smoke/UI work ran in the isolated worktree only. User reported two sibling sessions were active, so the shared checkout stayed out of the long-running lane.

Sibling/session context recorded in `12-safe-30-40h-ui-run.md`:

- `019ec981-e816-70d0-bac1-759bb7792a12`
- `019ec84d-5d83-7010-9393-f7df3739e4d9`

## Canonical Deployment Status

Canonical hosted deployment was not changed or freshly proven by this run.

Open items:

- Confirm exact canonical repo and branch.
- Confirm Vercel project and stable alias target.
- Confirm hosted deployment commit matches intended code.
- Confirm hosted env values without exposing secrets.
- Confirm no preview URL is used for tester-facing beta.

## Decision

Local worktree proof is valid for local regression safety only. Canonical deployment remains unresolved, so broader beta send remains NO-GO.

## Proof Record

| Field | Value |
|---|---|
| Date | 2026-06-15 |
| Commit SHA | `a22497e96004024928128990f432806b768930a6` |
| Repo/branch | `codex/safe-ui-beta-proof-2026-06-15` |
| Environment | isolated local worktree |
| Base URL | `http://localhost:4871` |
| Role/persona | operator |
| Command or manual step | `git remote -v`, `git branch --show-current`, `git rev-parse HEAD`, `cat Makefile`, `cat frontend/package.json`, env-name scan |
| Expected | canonical repo/deploy locked or documented as blocker |
| Actual | local repo/branch/commands recorded; canonical hosted deploy remains unproven |
| Result | BLOCKED for beta readiness |
| Evidence path | this file |
| Secrets redacted | yes |
| Follow-up | Hali confirms canonical repo, hosted URL, Vercel project, and deployment commit |
