# Cloud Preflight Result

Checked at: 2026-06-23T13:39:22Z

## Commands

| Command | Result |
| --- | --- |
| `make cloud-beta-preview-preflight-test` | PASS |
| `make cloud-beta-preview-preflight` | NO-GO |

## Tool/Access State

| Check | Result |
| --- | --- |
| Branch | `beta/local-team-workflow-ready-overnight` |
| Starting package commit | `d64c926` |
| Vercel CLI | Not installed: `vercel not found` |
| Vercel auth | Not available because CLI is missing |
| `.vercel` project link | Not present |
| Old hosted beta URL | `https://tjc-stock-media.vercel.app` reachable; anonymous root redirects to beta login |
| Old hosted build marker | `/api/beta-auth/session` reports `small-team-beta-readiness-2026-06-17`; not current branch proof |
| Hosted read-only probe | PASS at `2026-06-23T14:24:48.988Z`; no privileged JSON leak |
| Docker | Present |
| Local ResourceSpace containers | `tjc-resourcespace` and `tjc-resourcespace-db` running |
| SSH | Present |
| rsync | Present |

## Env File Classification

No secret values were printed.

| File | Cloud-relevant state |
| --- | --- |
| `.env` | `RESOURCESPACE_BASE_URL` is non-HTTPS local host; beta auth/writeback names set locally |
| `.env.team-beta.local` | Local beta auth/writeback names set; no cloud ResourceSpace URL printed |
| `.env.example` | Updated with missing cloud-preflight safety keys and safe placeholders |

## Real Preflight NO-GO Failures

- `RESOURCESPACE_BASE_URL` missing for cloud/staging HTTPS.
- `RESOURCESPACE_API_USER` missing.
- `RESOURCESPACE_API_KEY` missing.
- `RESOURCESPACE_FIELD_MAP_JSON` missing.
- `RESOURCESPACE_DEFAULT_COLLECTION_ID` missing.
- `RESOURCESPACE_UPLOAD_COLLECTION_ID` missing.
- `RESOURCESPACE_REVIEW_COLLECTION_ID` missing.
- `RESOURCESPACE_WRITEBACK_MODE` not set to `queued`.
- Durable beta DB URL missing.
- `PENDING_WRITES_STORE` missing.
- `UPLOAD_INTAKE_STORE` missing.
- `BETA_FEEDBACK_ENABLED` not set to `1`.
- KV durable feedback env missing for current branch.
- Private upload storage provider missing.
- Beta auth and persona passwords missing from shell env.
- Local role switch/download gate/source original safety env missing from shell env.

## Additional Guard Tightening

The preflight self-test now proves the guard fails closed when env shape looks complete but current branch adapters are not implemented:

- `UPLOAD_INTAKE_STORE=postgres` remains NO-GO because hosted upload intake adapter is not implemented.
- `PENDING_WRITES_STORE=postgres` remains NO-GO because current durable pending-write adapter is KV only.
- `BETA_FEEDBACK_STORE=postgres` remains NO-GO because current durable feedback adapter is KV only.
- `UPLOAD_STORAGE_PROVIDER=resourcespace-intake` remains NO-GO until upload-to-ResourceSpace intake is implemented/proven.
