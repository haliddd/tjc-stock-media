# Cloud Beta Evidence

## Preflight Output Summary

- `make cloud-beta-preview-preflight-test`: PASS.
- `make cloud-beta-preview-preflight`: NO-GO.
- Guard now fails closed on missing cloud ResourceSpace env and unimplemented durable adapter claims.

## Env Checklist Status

- Vercel Preview env checklist created.
- `.env.example` updated with missing cloud-preflight safety keys.
- No `.env` or `.env.team-beta.local` values committed.
- No secrets printed.

## ResourceSpace Staging Status

- Local ResourceSpace container is running on `http://localhost:8088`.
- No HTTPS cloud/staging ResourceSpace URL is configured or proven.
- No restricted cloud API user/API key is available.
- No cloud API read was run.

## Vercel Preview Status

- Vercel CLI is not installed.
- No `.vercel` project link exists in this checkout.
- Old hosted beta URL selected by Hali: `https://tjc-stock-media.vercel.app`.
- `curl -I -L https://tjc-stock-media.vercel.app` reached Vercel and redirected anonymous root to `/beta-login`.
- `curl https://tjc-stock-media.vercel.app/api/beta-auth/session` returned beta auth enabled with build marker `small-team-beta-readiness-2026-06-17`.
- `BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe` passed at `2026-06-23T14:24:48.988Z`; no POST/writeback/env mutation, no privileged JSON shape, and query-role admin/review/asset/download probes redirected to beta login.
- That hosted URL is usable as the stable beta front door only after current branch/cloud env are redeployed and re-proved.
- Production deploy was not run.

## Storage Durability Status

| Surface | Current evidence |
| --- | --- |
| Pending review writes | Local files exist; KV adapter implemented if Vercel KV env exists; Postgres adapter not implemented |
| Upload intake | Local runtime batches exist; hosted file intake blocks without durable adapter; Postgres adapter not implemented |
| Feedback | Local JSON/KV path exists; durable hosted feedback requires Vercel KV in current branch; Postgres adapter not implemented |
| Audit/runtime writes | Generic durable runtime adapter not implemented |
| Private upload files | No S3/R2/Blob/ResourceSpace intake proof |

## Upload/Review/Download/Feedback Tests

- Hosted upload persistence: NOT RUN, no ResourceSpace cloud/durable upload adapter.
- Hosted review pending-write persistence: NOT RUN, no cloud KV/env proof.
- Hosted feedback persistence: NOT RUN, no cloud KV/env proof.
- Hosted download gate: NOT RUN for current branch/cloud env.
- Role gates against hosted URL: anonymous root redirect/session checked only; full role QA not run.

Previous local package docs record local safety behavior, but those do not prove cloud beta readiness.

## No Source/Original Exposure Proof

Cloud proof not run because preview does not exist. The required proof remains:

```bash
curl -s "$BASE_URL/api/assets/search?limit=12" > /tmp/cloud-search.json
curl -s "$BASE_URL/api/admin/readiness" > /tmp/cloud-readiness.json
```

Then inspect JSON/browser network payloads for source/original URLs. Any source/original exposure is CLOUD TEAM BETA NO-GO.

## Screenshot Folder

No cloud screenshot folder created. Existing local QA-deferred folder remains:

`docs/screenshots/team-beta-ui-ux-final-2026-06-23/`
