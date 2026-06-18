# Real-vs-Demo DAM Proof Matrix - 2026-06-14

## Reading Rules

- "Real now" means code path exists and is honest locally.
- "Hosted proven" means proven on Vercel with real env/account state. Most rows are not hosted-proven in this run.
- "Fallback/mock" must be visible only as diagnostic/admin truth, not teammate-facing fake success.

| Capability | Real now | Local only | Hosted proven | Fallback/mock | User visible | Role safe | Durable | Proof | Next proof | Launch blocker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ResourceSpace search | Partly: API-first route exists | Export and fallback local paths exist | No | Demo fallback records exist when API/export absent | Yes as media library | Yes via redaction | No | `media-source/index.ts`, ResourceSpace pagination tests | Hosted read-only ResourceSpace smoke | Yes |
| Asset detail | Yes for role-safe read model | Works locally | No | Same fallback source if no real data | Yes | Yes via `assetForRolePayload` | Read-only | Asset route, payload guards | Hosted role QA | Yes until real source proven |
| ResourceSpace data source status | Yes for Admin | Yes | No | Admin can see fallback/export/live | Admin diagnostic only; normal sees media library | Yes | N/A | `DamSourceStatus`, `dam-readiness-integrations.ts` | Hosted Admin readiness screenshot/check | Yes |
| Thumbnail/preview | Yes for backend preview route and placeholder states | Local filestore/export | No | Placeholder/fallback thumbnails may exist | Yes | Yes | No | `media-delivery.ts`, thumbnail guards | Real ResourceSpace or derivative manifest smoke | Warning |
| Approved derivative delivery | Yes for ticketed approved-copy gate | Local derivative/fallback proof only | No | Generated fallback approved copies exist for smoke IDs | Yes when allowed | Yes | Ticket/audit local only | `approved-delivery-gate.ts`, `download-tickets.ts` | Durable ticket store + real derivative storage | Yes |
| Original/master denial | Yes | Yes | No hosted proof | No original delivery mock | Yes as request-only language | Yes | Audit local only | Gate denies original-like variants | Hosted redaction/download smoke | Yes |
| Upload/intake | Intake packet exists; review flow only | Local queue | No | No live import to Drive/ResourceSpace | Contributor/Reviewer | Role gated | Local only | `upload-intake.ts`, API guards | Durable intake queue and ResourceSpace import mapping | Yes for production, warning for beta |
| Review queue | Yes as governed portal queue | Local pending writes | No | No fake writeback | Reviewer/Admin | Yes | Local only | `review-action-workflow.ts`, pending writes | Real ResourceSpace read and writeback disabled proof | Warning |
| Feedback | Yes, now fails closed in hosted runtime without KV | Local JSON fallback only when not hosted | No | Local JSON for local/private beta | Yes | Role/session gated | KV only when configured | `beta-feedback.ts` hardening tests | Configure KV and run hosted feedback smoke | Yes |
| Saved searches | Yes | Local JSON only | No | Local JSON | Contributor+ | Creator sanitized for normal roles | No | `saved-search-store.ts` | Durable profile/team store | Yes for teammate promise |
| Package/distribution draft | Yes as governed draft | Local JSON only | No | Local JSON | Contributor+ | Yes | No | `package-store.ts`, governance copy | Durable package store | Yes for teammate promise |
| Admin readiness | Yes | Local/Admin | No | Admin sees fallback/local truth | Admin only | Yes | N/A | `dam-readiness-integrations.ts` | Hosted Admin check | Yes |
| Audit log | Yes as local JSONL accountability evidence | Local only | No | None as production audit | Admin/Reviewer where exposed | Normal payload sanitized | No | `audit-log.ts`, `appendRequiredAuditEvent` | Durable identity-backed audit store | Yes |
| Backup/restore | Scripts/docs exist | Local only | No | No fake backup | Admin/docs | N/A | Not proven | `make backup`, `make restore-test` planned | Real backup destination and restore drill | Yes |
| Hosted Vercel env | Env names documented | N/A | No | Must not silently fallback | Login page/readiness only | Depends on env | Not until KV/durable store | `.env.production.example`, docs | Dashboard proof + hosted smokes | Yes |
| SSO/origin protection | Trusted-header shim exists | Local smoke possible | No | Beta passwords only | Beta login visible | Production ignores client role override | N/A | `request-identity.ts`, tests | Real IdP/origin protection | Yes |
| Google Drive custody | Documented model only | No real manifest committed | No | No source media in repo | Admin docs only | Must be Admin-only | Depends on Drive | AGENTS, docs | Sanitized custody manifest and owner signoff | Yes |
| Future S3/R2 | Env/design only | No live storage | No | No bucket/mock as real | Admin docs only | N/A | No | `hasS3DeliveryConfig`, object seam doc | Provider choice and private signed URL smoke | No for current beta if local derivative proof accepted; yes for production |
| Browser QA | Scripts exist | Local if server runs | No | N/A | N/A | N/A | N/A | `portal-browser-qa.mjs` | Run local/hosted read-only QA | Warning |
| Teammate packet | Created in this run | Docs | No | Honest blockers listed | Yes | N/A | N/A | `teammate-real-dam-beta-packet` | Human fills URL/roles after env proof | Yes |

## Bottom Line

The portal has strong honesty guards and role-safe local proof, but the chain is not teammate-ready as a real DAM until live/export ResourceSpace data, Vercel protection, and durable hosted beta state are proven. Fallback/local/mock paths must never be described to teammates as real DAM success.
