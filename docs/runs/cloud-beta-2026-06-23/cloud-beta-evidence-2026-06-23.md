# Cloud Beta Evidence

CLOUD TEAM BETA STATUS: NO-GO

Local final QA passed, but cloud beta evidence is still incomplete.

## Local Evidence Snapshot

- Local browser QA passed at `2026-06-23T08:33:52.265Z`.
- Local command gate passed on 2026-06-23:
  - `make smoke`
  - `BASE_URL=http://localhost:4885 make portal-api-smoke`
  - `cd frontend && npm run typecheck`
  - `cd frontend && npm run build`
  - `cd frontend && npm run test`
- Local portal URL: `http://localhost:4885`
- Local ResourceSpace URL: `http://localhost:8088`
- Local data source: ResourceSpace metadata export.
- Local counts: 2,290 admin / 2,061 search-visible / 19 collections.

Local evidence does not prove cloud beta.

## ResourceSpace Staging Status

- No HTTPS ResourceSpace cloud/staging URL is configured or proven.
- No restricted cloud API user/API key is available.
- No ResourceSpace cloud API read was run.
- No cloud thumbnails/previews were proven.

## Vercel Preview Status

- Old hosted beta URL: `https://tjc-stock-media.vercel.app`.
- Old URL is a stable front-door candidate only after current branch/cloud env are redeployed and re-proved.
- Old URL build marker remains `small-team-beta-readiness-2026-06-17`; do not claim current cloud readiness from it.
- Latest preview observed earlier returned fallback/source mode `media-library`, `live=false`, total `163`, not ResourceSpace cloud.
- Latest preview thumbnails observed earlier were generated local beta SVGs, not ResourceSpace thumbnails.
- Production deploy was not run.

## Storage Durability Status

| Surface | Current evidence |
| --- | --- |
| Pending review writes | Local runtime records; KV adapter exists if cloud env is configured |
| Upload intake | Local runtime intake only; cloud durable upload intake not proven |
| Feedback | Local JSON/KV path exists; cloud durable feedback not proven |
| Private upload files | No S3/R2/Blob/ResourceSpace intake proof |
| Source/original storage | Must remain restricted; no cloud proof yet |

## Cloud Tests Not Yet Passed

- ResourceSpace cloud reachability.
- ResourceSpace restricted API read.
- Vercel Preview env verification.
- Portal API smoke against cloud preview.
- Upload persistence after serverless restart.
- Review pending-write persistence after serverless restart.
- Feedback persistence after serverless restart.
- Download gate against cloud preview.
- Role gates against cloud preview.
- No source/original exposure check against cloud preview.
- Browser QA against cloud preview.

## Required Cloud Proof Commands

Run only after ResourceSpace staging and Vercel Preview env exist:

```bash
BASE_URL=<vercel-preview-url> make portal-api-smoke
curl -s "$BASE_URL/api/assets/search?limit=12" > /tmp/cloud-search.json
curl -s "$BASE_URL/api/admin/readiness" > /tmp/cloud-readiness.json
curl -I "$BASE_URL/api/assets/thumbnail/<real-id>"
```

Any source/original URL in JSON/browser network payloads is CLOUD TEAM BETA NO-GO.

## Screenshot Folder

No cloud screenshot folder exists.

Local final QA screenshots: `docs/screenshots/team-beta-ui-ux-final-2026-06-23/`
