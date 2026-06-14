# Human-Assisted Cloud Setup Runbook - 2026-06-14

## Rules

This runbook is for a human-assisted browser session. The agent may navigate and record non-secret dashboard status, but must stop before credentials, 2FA, OAuth consent, payment card, legal terms, paid plan selection, DNS changes, production env values, destructive actions, or public deployment promotion.

Do not capture secrets in screenshots. Do not paste secrets into docs, chat, terminal logs, PRs, or GitHub comments.

## Evidence Policy

- Good evidence: service name, project name, plan label, protection setting label, env variable names, non-secret status text, date checked, account owner initials.
- Forbidden evidence: passwords, tokens, API keys, recovery codes, card numbers, account billing addresses, private Drive paths, private media filenames, screenshots with secrets.
- If a screenshot is needed, crop/redact before saving and store only in an approved evidence location. No screenshots were created in this run.

## Service Steps

### 1. GitHub

Link: https://github.com/haliddd/tjc-stock-media

Agent may:

- Confirm `haliddd/tjc-stock-media` exists.
- Confirm open PR list.
- Push checked branch to `haliddd` only after local checks.

Human must:

- Reauthenticate GitHub CLI if auth expires.
- Approve merge, retargeting, or branch deletion.

Cancel/rollback:

- Do not push to `origin` because it points to `Hali0321`.
- Close draft PR if wrong base/repo appears.

### 2. Vercel Project

Links:

- Dashboard: https://vercel.com/dashboard
- New project: https://vercel.com/new
- Deployment protection docs: https://vercel.com/docs/deployment-protection
- Environment variables docs: https://vercel.com/docs/environment-variables

Agent may:

- Open dashboard.
- Check whether logged in.
- Navigate to project import screen.
- Record project name, connected Git repo, plan label, and env variable names visible on settings pages.

Human must:

- Log in and complete 2FA.
- Choose/import project.
- Confirm free/Hobby plan only.
- Enter env values.
- Enable deployment protection or equivalent preview access restriction.
- Confirm no production deploy/promotion.

Stop before:

- Creating project if page implies billable plan.
- Promoting preview to production.
- Entering secrets.

Cancel/rollback:

- Delete only with explicit human confirmation.
- Disable public previews if protection was not enabled.

### 3. Upstash Redis/KV

Links:

- Pricing: https://upstash.com/pricing/redis
- Console: https://console.upstash.com/

Agent may:

- Open pricing/console.
- Record whether a free Redis database option is visible.
- Navigate to create page before final confirmation.

Human must:

- Log in/2FA/OAuth consent.
- Create database if free and approved.
- Copy `KV_REST_API_URL` and `KV_REST_API_TOKEN` into Vercel env manually.

Stop before:

- Paid plan selection.
- Region choice if it changes compliance/cost assumptions.

### 4. Vercel Blob

Links:

- Docs: https://vercel.com/docs/storage/vercel-blob
- Pricing: https://vercel.com/pricing

Agent may:

- Inspect docs/dashboard.
- Record whether Blob store exists and plan label.

Human must:

- Create store if approved.
- Copy `BLOB_READ_WRITE_TOKEN` manually.

Stop before:

- Creating paid storage or enabling public attachment behavior.

### 5. Oracle Cloud Always Free for ResourceSpace

Links:

- Free Tier: https://www.oracle.com/cloud/free/
- ResourceSpace general requirements: https://www.resourcespace.com/knowledge-base/systemadmin/general_requirements
- ResourceSpace Ubuntu install: https://www.resourcespace.com/knowledge-base/systemadmin/install_ubuntu

Agent may:

- Open official pages.
- Record Always Free availability and ResourceSpace LAMP requirements.
- Draft VM/container checklist.

Human must:

- Sign up/log in.
- Accept terms.
- Provide card for Oracle identity verification if continuing.
- Create VM/network/storage only after cost guard review.

Stop before:

- Card entry.
- Terms acceptance.
- VM creation.
- Firewall/domain/SSL production changes.

### 6. Cloudflare R2 or AWS S3

Links:

- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- AWS S3 pricing: https://aws.amazon.com/s3/pricing/
- AWS free storage: https://aws.amazon.com/free/storage/

Agent may:

- Open docs/pricing.
- Compare private bucket and signed URL models.

Human must:

- Create account/bucket/API token/IAM role.
- Confirm free-tier/cost guard.

Stop before:

- Bucket creation.
- Public bucket toggle.
- API token creation.

### 7. Google Shared Drive

Link: https://support.google.com/a/users/answer/7212025

Agent may:

- Document custody manifest format and access checklist.

Human must:

- Confirm Shared Drive ID.
- Confirm manager/content manager roles.
- Grant service account access if future automation is approved.

Stop before:

- Moving, deleting, copying, renaming, sharing, or changing Drive media.

## Beta Env Entry Checklist

Human enters values in Vercel only:

- `BETA_AUTH_ENABLED=true`
- `BETA_SESSION_SECRET`
- `BETA_VIEWER_PASSWORD`
- `BETA_CONTRIBUTOR_PASSWORD`
- `BETA_REVIEWER_PASSWORD`
- `BETA_ADMIN_PASSWORD`
- `RESOURCESPACE_BASE_URL`
- `RESOURCESPACE_API_USER`
- `RESOURCESPACE_API_KEY`
- `RESOURCESPACE_ENABLE_WRITEBACK=0`
- `RESOURCESPACE_WRITEBACK_MODE=queued`
- `BETA_FEEDBACK_ENABLED=1`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`
- Optional attachments: `BLOB_READ_WRITE_TOKEN`
- `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0`
- `NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0`

## Rollback

- Remove tester access and rotate beta passwords.
- Disable `BETA_FEEDBACK_ENABLED` if durable store fails.
- Remove ResourceSpace API env values if live reads expose incorrect data.
- Keep `RESOURCESPACE_ENABLE_WRITEBACK=0` until live writeback proof is explicitly approved.
- Do not delete external resources without human confirmation.
