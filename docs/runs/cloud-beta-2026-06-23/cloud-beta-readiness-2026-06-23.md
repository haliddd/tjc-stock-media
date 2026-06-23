# Cloud Beta Readiness

CLOUD TEAM BETA STATUS: NO-GO

Local team beta is GO after final local QA, but cloud beta remains blocked.

| Field | Value |
| --- | --- |
| ResourceSpace Cloud URL | Missing / not proven |
| Vercel Preview URL | Old hosted front-door candidate: `https://tjc-stock-media.vercel.app` |
| Data source | Local ResourceSpace/export baseline only |
| Asset count | 2,290 admin / 2,061 search-visible |
| Collection count | 19 |
| Upload storage | Missing; private provider not configured/proven |
| Pending writes storage | Local files currently; KV adapter exists but cloud env not proven |
| Feedback storage | Local JSON currently; KV adapter exists but cloud env not proven |
| Writeback mode | Queued required; live writeback not allowed for first cloud beta |
| Download gate | Proven locally; not proven on current cloud preview |
| Role gates | Proven locally; not proven on current cloud preview |
| Preflight result | Self-test PASS; real cloud preflight NO-GO |
| API smoke result | PASS locally; not run against current ResourceSpace cloud preview |
| Browser QA result | PASS locally; not run against current ResourceSpace cloud preview |

## Current Hosted Findings

- Old URL `https://tjc-stock-media.vercel.app` works as a stable front-door candidate.
- Old URL build marker remains `small-team-beta-readiness-2026-06-17`, so it is not current branch/cloud proof.
- Latest preview observed earlier was `READY`, but Vercel Authentication blocked public access.
- Latest preview API source was `media-library`, `live=false`, total `163`, which is not ResourceSpace cloud.
- Latest preview thumbnails were generated local beta SVGs, not ResourceSpace thumbnails.

## Known Blockers

- No HTTPS ResourceSpace staging URL.
- No restricted ResourceSpace API credentials.
- No ResourceSpace field map or staging collection IDs.
- Vercel Preview env is not configured/proven for current branch.
- No durable upload intake proof.
- No private upload storage proof.
- No cloud pending-write/feedback storage proof.
- Upload-to-ResourceSpace intake provider is not implemented/proven.
- Current cloud preview has not passed API smoke, browser QA, role gates, download gate, upload persistence, review persistence, feedback persistence, or no-source/original payload checks.

## Safety Call

Do not deploy production. Do not merge. Do not invite the team based on cloud.

Cloud GO requires ResourceSpace staging HTTPS + restricted API read, Vercel Preview env, durable upload intake, private upload storage, durable pending writes/feedback, role gates, download gate, no source/original exposure, and browser/API QA against that preview.
