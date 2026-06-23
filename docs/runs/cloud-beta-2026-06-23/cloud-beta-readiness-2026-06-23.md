# Cloud Beta Readiness

Date: 2026-06-23
Branch: `beta/cloud-resourcespace-vercel-preview`

CLOUD TEAM BETA STATUS: NO-GO

Reason: cloud ResourceSpace staging, durable beta storage, Vercel Preview env, and cloud QA are not provisioned yet.

## Current Baseline

| Item | Value |
| --- | --- |
| Local baseline branch | `beta/local-team-workflow-ready-overnight` |
| Local baseline commit | `1bd8846` |
| Local portal | `http://localhost:4885` |
| Local ResourceSpace | `http://localhost:8088` |
| Local data source | ResourceSpace metadata export |
| Local asset count | 2,290 admin readiness / 2,061 search total |
| Local collection count | 19 |
| Local sample asset | `367` / Bee |
| Local sample collection | `album:mvp-2024-first-batch` |

## Cloud Inputs Needed From Hali

- ResourceSpace cloud path: managed hosting or self-host VM.
- Cloud provider/account and cost approval.
- DNS name for staging, suggested `dam-staging.tjc.org`.
- Database choice: managed MariaDB/MySQL or VM-local DB.
- Filestore size and backup policy.
- Durable beta store choice: Vercel Postgres, Neon, Supabase, Upstash, or other.
- Upload storage choice: ResourceSpace intake or private staging bucket.
- Vercel project access to set Preview env variables.
- Beta passwords and invite code values.

## Prepared Repo Artifacts

| Artifact | Purpose |
| --- | --- |
| `infra/resourcespace-staging/docker-compose.staging.yml` | ResourceSpace + MariaDB staging host compose template. |
| `infra/resourcespace-staging/.env.staging.example` | VM-only ResourceSpace staging env template. |
| `infra/resourcespace-staging/resourcespace-config.php.example` | ResourceSpace config template with no real secrets. |
| `infra/resourcespace-staging/Caddyfile.example` | HTTPS reverse proxy example for `dam-staging.tjc.org`. |
| `infra/vercel/cloud-beta-preview.env.example` | Vercel Preview env template with writeback queued and role override disabled. |
| `scripts/cloud-resourcespace-bootstrap.sh` | Clones official ResourceSpace Docker repo into the staging compose context. |
| `scripts/cloud-beta-env-check.mjs` | Checks cloud beta env posture before preview validation. |
| `scripts/cloud-beta-smoke.sh` | Basic ResourceSpace + Vercel preview smoke and leak check. |
| `make cloud-beta-resourcespace-bootstrap` | One-command official Docker bootstrap. |
| `make cloud-beta-env-check` | One-command cloud beta env check. |
| `make cloud-beta-smoke` | One-command basic cloud preview smoke. |

## Hard Blocks

| Blocker | Status |
| --- | --- |
| ResourceSpace cloud URL | Missing |
| ResourceSpace API account | Missing |
| Vercel Preview URL | Missing |
| Vercel Preview env values | Missing |
| Durable feedback store | Missing |
| Durable pending write store | Missing |
| Durable upload intake store | Missing |
| Cloud API smoke | Not run |
| Cloud browser QA | Not run |
| Actual VM/DNS/Vercel provisioning | Blocked until account credentials and cost approval are available |

## Required Safety Posture

- `RESOURCESPACE_ENABLE_WRITEBACK=0`
- `RESOURCESPACE_WRITEBACK_MODE=queued`
- `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0`
- `PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0`
- `NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0`
- No source/original downloads.
- No public share links.
- No production deployment.

## Final Call

NO-GO for cloud team beta until provisioning and cloud validation complete.
