# Beta Readiness Command Center

Last updated: 2026-06-15

## June 15 Safety Override

Current recommendation is **NO-GO for teammate invites or hosted mutation** until the June 15 evidence packet blockers are resolved. Use `docs/runs/evidence/2026-06-15/11-friday-readiness-report.md` as the current readiness source.

Reason: the June 15 run fixed a P0 query-role elevation class locally, added protected local smokes, and added hosted read-only probes, but canonical deployment, hosted authenticated protection, ResourceSpace scope, Google Drive custody, durable/fail-closed hosted state, and tester approval remain unresolved.

Do not run the mutating hosted smoke without explicit owner approval. That script now hard-stops on non-local targets unless `PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1` and `PORTAL_HOSTED_SMOKE_APPROVED_BY` are set. Use `BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe` for non-mutating hosted proof.

Use this page before inviting teammates. The goal is a controlled beta test, not production launch. ResourceSpace remains source of truth, Google Shared Drive remains master-original warehouse, and TJC Stock Media remains the role-aware workbench.

## Go / No-Go

Current recommendation: **NO-GO for sending or widening Team Beta on hosted URL until the June 15 P0 evidence packet blockers are resolved. Production, public sharing, public downloads, live ResourceSpace writeback, broad reuse, source media mutation, staging, commits, deploys, and external communications remain out of scope.**

Status split:

- **Local code/test gate: PASS for isolated June 15 local proof.** Query-role elevation is fixed locally and protected smokes/browser QA pass on `http://localhost:4871`.
- **Invite/send gate: NO-GO pending June 15 blockers.** Prior June 11 signoff is superseded for hosted invites until canonical deployment, hosted protection, ResourceSpace/Drive custody, durability, and tester approval are renewed.
- **Production launch gate: NO-GO.** Production SSO, durable storage, full rights review, live ResourceSpace writeback, and full archive launch are not proven.

Signoff packets now prepared:

- `docs/team-beta-go-no-go-packet.md` - canonical final decision packet and signoff block.
- `docs/team-beta-signoff-record.md` - fillable human owner/signoff record for invite GO.
- `docs/team-beta-internal-test-packet.md` - canonical tester invite, task, stop-test, and feedback packet.
- `docs/team-beta-seed-media-signoff.md` - rights/media reviewer packet for preview-only seed visibility.
- `docs/team-beta-hosted-access-proof.md` - deployment/env owner packet for hosted settings and private URL proof.
- `docs/team-beta-feedback-incident-runbook.md` - triage, export, stop-test, and incident-response runbook.

Local dry run may continue when these pass:

- [x] `make frontend-check`
- [x] `make launch-readiness`
- [x] `BASE_URL=http://localhost:4871 make portal-api-smoke`
- [x] `BASE_URL=http://localhost:4871 make portal-sso-smoke` against `SSO_TRUSTED_HEADERS=1` local server
- [x] `BASE_URL=http://localhost:4871 make portal-usage-smoke` against `PORTAL_USAGE_LOGGING=1` local server
- [x] `BASE_URL=http://localhost:4871 make portal-delivery-smoke`
- [x] `BASE_URL=http://localhost:4871 make portal-download-ticket-smoke` against local beta server
- [x] `BASE_URL=http://localhost:4871 make portal-writeback-guard-smoke` against no-live-writeback local server
- [x] `BASE_URL=http://localhost:4871 make portal-package-smoke`
- [x] `BASE_URL=http://localhost:4871 make portal-saved-search-smoke`
- [x] `BASE_URL=http://localhost:4871 make portal-beta-rehearsal`
- [x] `BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe` June 15 partial read-only PASS
- [ ] Mutating hosted smoke NOT RUN June 15; requires `PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1` and `PORTAL_HOSTED_SMOKE_APPROVED_BY`
- [x] `BASE_URL=http://localhost:4871 make portal-browser-qa`
- [x] Viewer unsafe download stays blocked.
- [x] Reviewer approval without evidence stays blocked.
- [x] Reviewer approval with evidence returns honest queued/pending-write state.

Invite a tiny internal Team Beta batch only when these are also true:

- [x] Stable unlisted beta URL exists: `https://tjc-stock-media.vercel.app`.
- [ ] Hosted authenticated/mutating smoke is approved and passes with explicit owner approval env: `PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1 PORTAL_HOSTED_SMOKE_APPROVED_BY=<owner-or-ticket> BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-smoke`.
- [x] Test data source is safe fallback/export data, not live writeback.
- [x] Seed/media signoff packet is prepared: `docs/team-beta-seed-media-signoff.md`.
- [x] Rights/media reviewer confirms preview-only seed visibility for this tiny internal beta: Enoch Liu primary, Hali Ding backup.
- [x] AI tagging is disabled for beta by default; any AI run is suggestions-only, cost-capped, and cannot approve rights, people/minors, or public/internal reuse.
- [x] Role switch is clearly labeled beta-only.
- [x] Hosted access/env proof packet is prepared: `docs/team-beta-hosted-access-proof.md`.
- [x] Tech owner confirms hosted ResourceSpace writeback is disabled or queued (`RESOURCESPACE_ENABLE_WRITEBACK=0`, `RESOURCESPACE_WRITEBACK_MODE=queued`): Hali Ding.
- [x] Hosted approved-copy downloads are out of scope for this preview-only batch because current seed has zero portal-ready/downloadable assets. Keep `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0` unless an approved-copy download test is explicitly added before SSO.
- [x] Beta owner confirms private URL sharing policy, Team Beta-only access wording, and seed-data ownership for the first tester batch: Enoch Liu.
- [x] Feedback/incident runbook is prepared: `docs/team-beta-feedback-incident-runbook.md`.
- [x] Feedback triage is assigned for the first 24 hours after invite: Hali Ding primary, Enoch Liu backup.
- [x] P0 stop-test rule is documented for testers.

## Team Beta Ops Runbook

Use this as the one-page launch checklist before sending invite links. Do not invite the next teammate batch until every required confirmation has a named owner and timestamp.

| Gate | Required confirmation | Default owner | Status |
|---|---|---|---|
| Seed data safety | Confirm beta seed/export has no sensitive, private, unreleased, youth-identifiable, copyrighted, source, or master media visible to testers. Record sample search terms checked. | Enoch Liu primary; Hali Ding backup | NO-GO pending renewed June 15 approval |
| Access and private URL | Confirm only the stable unlisted URL is shared, deployment preview URLs are not shared, invite list is internal only, and beta role switch is understood as QA-only. | Enoch Liu | NO-GO pending canonical hosted proof |
| Hosted writeback env | Confirm hosted env keeps `RESOURCESPACE_ENABLE_WRITEBACK=0`, `RESOURCESPACE_WRITEBACK_MODE=queued`, `BETA_FEEDBACK_ENABLED=1`, and `BETA_TASK_MODE_ENABLED=1`; confirm no live ResourceSpace writeback is claimed. | Hali Ding | NO-GO pending hosted env/durable proof |
| Feedback triage | Confirm who watches Admin -> Feedback Inbox, assigns P0/P1/P2/P3, exports agent-ready JSON, and posts next-batch decision. | Hali Ding primary; Enoch Liu backup | NO-GO pending renewed send window |
| Stop-test response | Confirm who pauses testing, notifies invited testers, captures evidence, and decides resume/no-resume for privacy, source-truth, writeback honesty, or unsafe-download reports. | Hali Ding primary; Enoch Liu backup | NO-GO pending renewed incident owner approval |

Tester report response:

1. Sensitive media report: stop the batch, remove the invite link from active sharing, capture role/route/asset id/screenshot if safe, mark feedback P0, and route to the rights/media reviewer. Do not delete, rename, move, or mutate source media.
2. Download oddity report: stop unsafe-download testing, capture role/route/asset id/request result, mark feedback P0 when a restricted item downloads or a browser payload exposes source custody details, and keep ResourceSpace writeback disabled while triage runs.
3. Non-P0 issue: keep testing only if the core mission is not blocked, triage as P1/P2/P3, and document whether it must be fixed before the next batch.

Minimum send decision:

- **NO-GO for teammate invite/send.** Historical six-person approval is superseded by the June 15 P0 evidence packet.
- **PASS local only for Hali-controlled isolated dry run.** Do not convert local proof into hosted invite approval.

## Beta Surface

| Area | Beta expectation | Owner | Status |
|---|---|---|---|
| URL | Stable unlisted Vercel Next.js deployment with API routes; not static S3-only | Hali | Canonical deployment proof still blocked; invite send waits on ops gates |
| Access | Tiny Team Beta only; production SSO not live | Enoch Liu | NO-GO pending June 15 hosted protection proof |
| Data | Safe fallback/export data; no live writeback | Enoch Liu primary; Hali Ding backup | PASS local only; NO-GO for hosted invite until renewed seed approval |
| Viewer | Can search, open records, request review, and see blocked unsafe downloads | Hali | PASS local only |
| Contributor | Can test harmless intake only; uploads never publish | Hali | PASS local only |
| Reviewer | Can test evidence lock and pending-write truth | Hali | PASS local only |
| DAM Admin | Can inspect launch blockers and integration readiness | Hali | PASS local only |
| Feedback | In-app Report issue plus DAM Admin Feedback Inbox; named triager handles first batch | Hali Ding primary; Enoch Liu backup | NO-GO pending durable hosted state and renewed send window |

## Latest Local Rehearsal

Date: historical 2026-06-11 run, superseded by June 15 P0 packet

Result: **Historical local proof only. June 15 P0 packet supersedes prior hosted invite approval; current teammate invite/send posture is NO-GO until blockers close.**

Historical checks, retained only as pre-June-15 context:

- `make frontend-check`: pass.
- `make launch-readiness`: pass with one `.env` placeholder warning.
- `BASE_URL=http://localhost:4868 make portal-api-smoke`: pass.
- `BASE_URL=http://localhost:4876 make portal-sso-smoke`: pass against local trusted-header server.
- `BASE_URL=http://localhost:4878 make portal-usage-smoke`: pass against local usage-logging server.
- `BASE_URL=http://localhost:4880 make portal-delivery-smoke`: pass for delivery privacy and honest S3 readiness copy.
- `BASE_URL=http://localhost:4868 make portal-download-ticket-smoke`: pass for direct GET denial, explicit terms, one-use ticket mint/consume/reuse block, thumbnail download block, hidden payload URL, and required audit persistence.
- `BASE_URL=http://localhost:4868 make portal-writeback-guard-smoke`: pass for no-live ResourceSpace writeback guard.
- `BASE_URL=http://localhost:4868 make portal-package-smoke`: pass for package draft role gates, sanitized ResourceSpace refs, and local-json readiness.
- `BASE_URL=http://localhost:4868 make portal-saved-search-smoke`: pass for saved search role gates, sanitization, and local-json readiness.
- `BASE_URL=http://localhost:4880 make portal-beta-rehearsal`: pass; evidence JSON written under `.runtime/beta-rehearsals/`.
- Mutating hosted smoke: historical June 11 hosted run existed; NOT RUN on June 15 because it mutates hosted state and now requires explicit approval env.
- `BASE_URL=http://localhost:4868 make portal-browser-qa`: pass; 17 pages, six viewport widths, 23 screenshots, zero failures, zero warnings, zero console errors, zero network failures.
- Explicit Viewer probe: `Bible` search returned assets, Viewer source payload stayed redacted as `media-library`, asset `368` opened, blocked download returned `403`, Viewer review action returned `403`.
- Explicit Reviewer probe: incomplete evidence returned `400` with evidence blockers; complete evidence returned `202` queued pending-write truth.

## Seed Scrub Evidence

Date: 2026-06-11

Evidence source: `.runtime/exports/resourcespace-metadata-20260604-193852.csv`

Read-only method: latest ResourceSpace CSV export normalized with the same field rules as `frontend/lib/resourcespace-schema.ts`; Viewer visibility checked against the `Approved Public` branch used by `frontend/lib/portal-reuse-decision.ts`; portal-ready/downloadable checked against the blocker rules in `frontend/lib/asset-governance.ts`.

Mechanical counts:

- Total normalized records: 2,290.
- Viewer-visible records: 181.
- Portal-ready/downloadable records: 0.
- Viewer-visible records that still need review before portal-ready/downloadable use: 181.
- Records requiring human review before portal-ready use: 2,290.
- Viewer-visible obvious sensitive flags: 0.
- Viewer-visible obvious youth flags: 0.
- Viewer-visible obvious private/unreleased flags: 0.
- Viewer-visible rights/copyright-review flags: 181.

Seed gate result: **NO-GO for teammate beta if testers are expected to reuse or download seed media.** Current seed can support preview-only workflow testing only if a human reviewer explicitly accepts the visible seed scope.

Remaining human decision: reviewer must either approve preview-only beta visibility for the 181 Viewer-visible `Approved Public` records despite people/minors unknown, rights/consent unclear, and approved-derivative gaps, or update the seed/export so these records are hidden or scrubbed before teammate invites.

Proposed signoff language:

> I reviewed the 181 Viewer-visible seed records in `.runtime/exports/resourcespace-metadata-20260604-193852.csv` and approve them for preview-only teammate beta visibility. No seed records are portal-ready/downloadable. Public or internal reuse remains blocked until people/minors, rights/consent, reviewer/date, and approved-derivative evidence is complete.

## Known Limits To Show Testers

- This is beta, not production.
- Role switch is simulated for QA.
- SSO is not live.
- AI tagging is not a reviewer. AI suggestions, if enabled for a bounded run, cannot approve rights, people/minors, sacred-context suitability, copyright status, or reuse scope.
- ResourceSpace writeback is queued/disabled unless explicitly approved; queued is not synced.
- Package drafts, saved views, favorites, and invites are beta affordances unless backend storage is connected.
- Original/master access is not granted by the portal.
- Do not upload sensitive, private, unreleased, youth-identifiable, or copyrighted media.
- Stop testing for P0/Critical privacy, source-truth, writeback honesty, or unsafe download issues.

## Dry-Run Script

Run the current isolated local production server:

```bash
npm --prefix frontend run build
cd frontend
SSO_TRUSTED_HEADERS=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0 TJC_STOCK_MEDIA_ROOT=/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run npx next start --port 4871
```

In another terminal:

```bash
BASE_URL=http://localhost:4871 make portal-api-smoke
BASE_URL=http://localhost:4871 make portal-sso-smoke
BASE_URL=http://localhost:4871 make portal-usage-smoke
BASE_URL=http://localhost:4871 make portal-delivery-smoke
BASE_URL=http://localhost:4871 make portal-download-ticket-smoke
BASE_URL=http://localhost:4871 make portal-writeback-guard-smoke
BASE_URL=http://localhost:4871 make portal-package-smoke
BASE_URL=http://localhost:4871 make portal-saved-search-smoke
BASE_URL=http://localhost:4871 make portal-beta-rehearsal
BASE_URL=http://localhost:4871 make portal-browser-qa
```

For SSO rehearsal, start the server with `SSO_TRUSTED_HEADERS=1` or `SSO_PROVIDER=cloudflare-access`; otherwise `portal-sso-smoke` should fail because beta role fallback is intentionally not treated as trusted identity.

For usage analytics rehearsal, start the server with `PORTAL_USAGE_LOGGING=1`; otherwise `portal-usage-smoke` should fail because no SQLite events should be recorded when analytics is disabled.

For delivery privacy rehearsal, no S3 credentials are required. The smoke proves private storage and source custody details stay out of browser-facing payloads and that Admin readiness does not overclaim signed S3 delivery.

For download ticket rehearsal, `portal-download-ticket-smoke` uses ignored `.runtime` fixture data when needed. It proves approved-copy GET fails without a ticket, POST requires explicit terms, the ticket works once, reuse fails, thumbnail download variants stay blocked, and required audit events persist.

For writeback guard rehearsal, use a no-live-writeback local server. The smoke proves ResourceSpace review writes stay queued and visible instead of claiming live API success.

For package draft rehearsal, `portal-package-smoke` proves Viewer cannot list/save drafts, Contributor saves only sanitized ResourceSpace refs, Reviewer can list drafts, and Admin readiness reports local-json storage as private beta only.

For saved search rehearsal, `portal-saved-search-smoke` proves Viewer cannot list/save searches, Contributor saves sanitized search state, Reviewer can list saved searches, and Admin readiness reports local-json storage as private beta only.

For private beta rehearsal, `portal-beta-rehearsal` writes a JSON evidence packet to `.runtime/beta-rehearsals/<run-id>/summary.json`. Keep that artifact for local decision evidence; do not treat it as teammate invite approval unless the blocked invite prerequisites above are complete.

For hosted URL rehearsal, run:

```bash
BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe
```

This verifies hosted read-only route protection without POST, writeback, env mutation, raw body capture, or tester invite behavior. Run mutating hosted smoke only after explicit owner approval:

```bash
PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1 PORTAL_HOSTED_SMOKE_APPROVED_BY=<owner-or-ticket> BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-smoke
```

Manual Viewer dry run:

1. Open `/` as Viewer.
2. Search `Bible`.
3. Open one result.
4. Confirm the page says whether it can be used.
5. Try unsafe download path and confirm it blocks.
6. Open Guide and confirm download rules are understandable.

Manual Reviewer dry run:

1. Open `/review` through trusted beta session or trusted SSO Reviewer identity.
2. Switch queue tabs.
3. Select a review item.
4. Try approval without evidence and note; confirm it blocks.
5. Complete checklist and note.
6. Queue decision and confirm pending-write truth is explicit.

## Feedback Triage

Preferred path: use the in-app Report issue button during Task Mode. DAM Admin reviews reports in Admin → Feedback Inbox, sets status, and exports JSON for agents. Use `docs/teammate-feedback-template.md` only when the app is unavailable. Full operating detail is in `docs/team-beta-feedback-incident-runbook.md`.

Agent handoff export: DAM Admin uses Feedback Inbox → Export JSON or calls `/api/beta-feedback/export?status=agent-ready` through trusted beta session or trusted SSO DAM Admin identity. The export packet includes schema, filters, counts, and matching records so agents can distinguish all feedback from agent-ready work.

| Severity | Action |
|---|---|
| P0 | Stop testing. Fix before inviting more teammates. |
| P1 | Fix or document as known limit before next test batch. |
| P2 | Batch for post-test cleanup unless it blocks the core task. |
| P3 | Keep as polish backlog. |

## Beta Pass Criteria

- Viewer can complete find-and-trust task in under 60 seconds.
- Viewer cannot download unsafe/non-portal-ready media.
- Contributor understands send media never publishes.
- Reviewer understands evidence lock and pending-write truth.
- DAM Admin can identify top launch blockers.
- No tester confuses beta state with production state.
