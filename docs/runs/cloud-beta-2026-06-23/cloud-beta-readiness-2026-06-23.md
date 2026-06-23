# Cloud Beta Readiness

CLOUD TEAM BETA STATUS: NO-GO

| Field | Value |
| --- | --- |
| ResourceSpace Cloud URL | Missing |
| Vercel Preview URL | Candidate old hosted beta URL: `https://tjc-stock-media.vercel.app` |
| Data source | Local ResourceSpace/export baseline only |
| Asset count | 2,290 admin / 2,061 search-visible |
| Collection count | 19 |
| Upload storage | Missing; private provider not configured |
| Pending writes storage | Local files currently; KV adapter exists but no cloud env |
| Feedback storage | Local JSON currently; KV adapter exists but no cloud env |
| Writeback mode | Queued required; live writeback not allowed |
| Download gate | Required; shell env missing for real cloud preflight |
| Role gates | Implemented locally; cloud env not configured |
| Preflight result | Self-test PASS; real cloud preflight NO-GO |
| API smoke result | Not run against preview; no preview URL |
| Browser QA result | Not run against preview; no preview URL |

## Known Blockers

- No HTTPS ResourceSpace staging URL.
- No restricted ResourceSpace API credentials.
- No ResourceSpace field map or staging collection IDs.
- Vercel CLI not installed and no `.vercel` project link present.
- Old Vercel URL is reachable and beta-auth protected, but current build marker is old (`small-team-beta-readiness-2026-06-17`) and not proven against this branch/cloud env.
- No durable beta DB configured.
- No private upload storage configured.
- Current branch has KV adapters for pending writes and feedback, but no Postgres adapter for either.
- Current branch has no durable upload-intake adapter; hosted browser file intake remains blocked.
- Upload-to-ResourceSpace intake provider is not implemented/proven.
- Final preview API/browser QA cannot run until ResourceSpace staging and Vercel Preview exist.

## Safety Call

Do not deploy production. Do not merge. Do not invite the team. Do not expose source/original media.

Safe next work:

1. Provision ResourceSpace staging with HTTPS, persistent DB, persistent filestore, thumbnails, backups, restricted API user, source/original denial, and collection/field map IDs.
2. Implement or prove durable upload intake storage before any team upload workflow.
3. Reuse `https://tjc-stock-media.vercel.app` as the stable beta front door after it is redeployed/configured with ResourceSpace staging env.
4. Redeploy Preview and run preflight, API smoke, upload/review/feedback persistence proof, role gates, download gate, and no-source-original payload checks.
