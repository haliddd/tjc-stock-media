# Production Runbook

## Purpose

Move from a local prototype to a church-owned PC/NAS launch without copying hidden local state blindly.

## Launch Migration

Use:

```text
Fresh install + restore verified backup
```

Do not use:

```text
Copy local runtime directly
```

Why:

- Proves the local prototype machine is not required.
- Proves backup and restore work.
- Avoids carrying prototype passwords and local paths into launch.
- Creates a repeatable recovery path.

## Weekend Beta Rollback

Hosted beta rollback is allowed only by the human owner. Agents may prepare instructions but must not deploy, merge, change env, or run hosted mutating smoke without approval.

Rollback steps:

1. Pause affected beta tasks or the whole tiny beta batch.
2. Roll Vercel back to the previous known-good deployment.
3. Restore prior env values from Vercel history or password manager. Do not print values into docs, logs, or tickets.
4. Confirm `RESOURCESPACE_ENABLE_WRITEBACK=0`, `RESOURCESPACE_WRITEBACK_MODE=queued`, and `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0`.
5. If feedback storage is unsafe, disable feedback temporarily or mark it unavailable; do not claim records are saved if hosted KV is failing.
6. Keep attachments disabled unless private/gated storage is approved.
7. Rerun local guards. Hosted mutating smokes require explicit approval.
8. Record incident, evidence, owner, and resume/no-go decision.

## Clean Host Setup

1. Install Docker and Docker Compose.
2. Clone repo.
3. Create production `.env` from `.env.production.example`.
4. Change all `change-me` values.
5. Start ResourceSpace with official Docker path.
6. Restore database, filestore, config, metadata exports, manifests, and run reports.
7. Run launch readiness checks.
8. Configure Cloudflare Tunnel and Cloudflare Access.
9. Verify ResourceSpace over HTTPS.
10. Turn off the local prototype machine and verify church host still works.

## Backup Must Include

```text
MariaDB database dump
ResourceSpace filestore volume
ResourceSpace config.php / config files
custom metadata field configuration
plugin configuration
docker-compose.yml
production .env template without secrets
metadata CSV exports
batch manifests
checksum manifests
run reports
Cloudflare tunnel setup notes
Google Vision/API setup notes
```

Local command:

```bash
make backup
make restore-test
```

Current backup outputs:

```text
database.sql
filestore-config.tgz
launch-artifacts.tgz
```

`launch-artifacts.tgz` includes docs, scripts, Docker Compose file, production env template without secrets, audits, manifests, run reports, and metadata exports.

## Cost And Health Sentinels

Stop and escalate before launch or next batch if any sentinel fails:

| Sentinel | Stop condition |
|---|---|
| Oracle account | Paid upgrade, paid database, paid object storage, or unapproved card/billing prompt. |
| Oracle volume | Photo runtime, DB, previews, and backups do not fit Always Free plan with headroom. |
| Disk free | Less than 20 percent free after import/restore. |
| Backup fit | Backup target is not separate or cannot fit DB/filestore/config/artifacts. |
| ResourceSpace health | Admin login, cron, preview generation, or sample search fails. |
| Vercel proxy | Preview route cannot reach ResourceSpace derivative safely, or leaks backend URL/path. |
| KV feedback | Hosted KV read/write fails and UI still says saved. |
| Blob attachments | Public attachment URLs are possible for beta feedback. |
| Writeback | Live ResourceSpace writeback enabled without explicit proof and re-read confirmation. |

Never commit:

```text
database passwords
Cloudflare tunnel token
Google API keys
ResourceSpace admin password
SMTP credentials
```

## Restore Acceptance

A backup is valid only if a clean host can be restored and:

- admin login works
- user login works
- sample approved asset is searchable
- sample approved asset downloads
- `Needs Review` asset is still not approved
- metadata fields exist
- collections exist
- filestore assets display
- backup timestamp and restore date are documented

## Operating Owners

| Responsibility | Owner |
|---|---|
| Host uptime, OS updates, Docker updates | Church IT/admin |
| ResourceSpace fields, groups, exports | DAM admin |
| Public/internal approval | Appointed ministry reviewers |
| Contributor support | DAM admin or trained media lead |
| Backup review and restore test | Church IT/admin plus one backup admin |
