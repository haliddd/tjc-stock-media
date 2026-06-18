# Team Beta QA Matrix

Last updated: 2026-06-18

## June 18 ORCH Final Override

Current decision is **NO-GO for hosted teammate invites**.

Current local QA evidence is better than the older June 15/17 notes: `docs/screenshots/qa/browser-qa-report.json` passed at `2026-06-18T06:14:20.205Z` with 20 pages, 6 viewport widths, 32 screenshots, 0 failures, 0 console errors, 0 network failures, and 3 expected denied console entries.

This green local browser QA does not create Team Beta GO. Hosted 181-record catalog proof is still missing, hosted durable audit/ticket storage is not proven, and Hali/Enoch owner signoff is not recorded.

## June 15 Safety Override

Current decision is **NO-GO for hosted teammate invites** until the June 15 evidence packet blockers are resolved. The old six-person GO language below is historical and superseded by `docs/runs/evidence/2026-06-15/11-friday-readiness-report.md`.

Hosted mutating smoke is not read-only. `portal-hosted-smoke` now requires `PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1` and `PORTAL_HOSTED_SMOKE_APPROVED_BY` before any non-local POST. Use `portal-hosted-readonly-probe` for unauthenticated hosted read-only checks.

This matrix separates automated proof from manual teammate beta checks and remaining risks. It is scoped to internal beta demo readiness only. It does not approve production launch, public publishing, source media changes, ResourceSpace live writeback, or source/original downloads.

Internal beta access update: hosted beta should use `/beta-login` when `BETA_AUTH_ENABLED=true`. Persona passwords come from Vercel env vars, and beta sessions override query/localStorage role spoofing. Query-role links are retired for hosted access; protected local QA uses trusted beta session/SSO headers or the trusted-header smoke helper.

## Current Decision

**Demo QA: NO-GO for hosted teammate invite/send until June 15 blockers close. PASS only for isolated local safety/UI proof. NO-GO for production launch, public media library, wider tester batch, live ResourceSpace writeback, production analytics, durable public package sharing, or source/original downloads.**

Code and app proof is broad locally, but no longer enough for hosted invites by itself: June 15 local rehearsal, protected smokes, browser QA, and hosted read-only probes passed, while authenticated hosted protection, canonical deploy, ResourceSpace/Drive custody, durable hosted state, and approved tester list remain unresolved.

Wider-batch blockers remain human/ops gates:

- Rights/media reviewer must re-approve seed visibility before any wider batch or real sensitive production media.
- Beta owner must keep private URL sharing limited to named testers.
- Tech owner must keep hosted ResourceSpace writeback disabled or queued: `RESOURCESPACE_ENABLE_WRITEBACK=0`, `RESOURCESPACE_WRITEBACK_MODE=queued`.
- Current seed has zero portal-ready/downloadable assets, so beta remains preview-only workflow testing.
- Production SSO, durable analytics/audit/package sharing, S3 derivative delivery, and live ResourceSpace writeback are not proven by this beta.

## Automated Proof Versus Manual Beta Matrix

| Area | Automated proof already present | Manual beta test needed | Untested risk / demo note | Demo gate |
|---|---|---|---|---|
| Build and launch readiness | `make frontend-check`; `make launch-readiness` pass per `docs/beta-readiness-command-center.md`. Launch readiness still reports `.env` and `.runtime/backups` warnings. | Confirm demo operator uses intended env values and stable URL. | Missing env/backups can confuse production-readiness story. Demo should state beta, not launch. | PASS local, NO-GO for production |
| Hosted beta URL | June 15 `BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe` partial PASS: anonymous/query-role probes redirected or denied without privileged JSON. Mutating hosted smoke was not run and is approval-gated. | Open stable URL from tester network only after owner approves hosted proof scope and canonical deployment. | Private access policy, authenticated hosted protection, and deployed commit are not signed off. Stable unlisted URL is not same as real auth. | NO-GO for invite/send |
| Roles and access model | `portal-sso-smoke` covers trusted-header role behavior; `portal-api-smoke` covers backend role gates; browser QA records expected 403s for denied Viewer/Reviewer calls. | Each beta tester uses trusted beta session/SSO identity and confirms beta-only role copy is visible. | SSO is not live; role switch is simulated. Production auth cannot be inferred from local role controls. | PASS local |
| Viewer search and asset trust | June 15 protected local rehearsal passes Viewer search, asset open, source redaction, blocked download, and no-review access in isolated worktree. | Viewer searches `Bible`, opens result, decides whether page clearly says if media can be used after renewed hosted proof is approved. | Seed visibility still needs renewed human reviewer signoff. Viewer-visible records are not portal-ready. | PASS local, NO-GO for hosted invite/send |
| Download gate | `portal-download-ticket-smoke` covers direct GET denial, explicit terms, one-use ticket mint/consume/reuse block, concurrent consume one-wins, thumbnail download block, hidden payload URL, and audit persistence. Local rehearsal confirms unsafe Viewer download returns 403. | Tester tries unsafe download path and confirms block/explanation. If approved-copy test is added, run it only as a recorded temporary exception. | No real approved-download flow exists in current seed because zero assets are portal-ready/downloadable. Keep `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0`. | PASS local for blocked-download demo, NO-GO for reuse/download demo |
| Reviewer workflow | `portal-beta-rehearsal` proves queue load, incomplete approval blocks with evidence errors, complete decision returns `202` queued/pending-write truth. `portal-writeback-guard-smoke` proves no-live ResourceSpace writeback claims locally. | Reviewer switches queues, changes rows per page, tries approval without evidence, then completes evidence plus note and verifies queued/synced/blocked copy is honest. | Live ResourceSpace writeback is not proven and should remain disabled/queued. Pending writes are portal evidence, not source truth. | PASS local |
| Contributor intake/upload | `portal-api-smoke` and browser QA cover upload/intake surfaces and role gates. Browser QA includes upload desktop, 320 px, and 390 px screenshots. | Contributor steps through Upload with harmless sample files only; confirms no publish claim and no sensitive media. | Real large media intake and Shared Drive incoming flow are outside this beta. Human testers can accidentally upload sensitive files unless instructions are repeated. | PASS local with strict test-data warning |
| DAM Admin readiness | `portal-beta-rehearsal` proves Admin readiness opens; `portal-api-smoke` covers readiness payload shape and redaction; command center lists integration readiness states. | DAM Admin opens Admin modules, checks module content changes, identifies top launch blockers. | Admin data is partly readiness/dashboard evidence, not proof that integrations are production-configured. | PASS local |
| Feedback path | Local `portal-feedback-smoke` covers feedback submission, unsafe link/route/text sanitization, missing severity validation, non-admin denial, Admin list, triage update, and agent-ready export. Hosted feedback POST was not rerun on June 15 because it mutates hosted state. | Testers use in-app Report issue button only after hosted durable state and approval scope are confirmed. Use template only if app unavailable. | Vercel KV/Blob storage is preferred for hosted persistence; local fallback is JSON. Confirm hosted storage before any tester group. | NO-GO for hosted invite/send |
| Devices and responsive UI | `portal-browser-qa` report checked 17 pages, viewports 1440/1280/1024/768/390/320, 23 screenshots, zero failures, zero warnings, zero console errors, zero network failures. | At least one human mobile pass around 390 px for Viewer, Reviewer, and DAM Admin workflows; check tap targets and copy clarity. | Automated screenshots do not prove human comprehension or touch ergonomics. | PASS local with manual mobile spot check still useful |
| Packages and collections | `portal-package-smoke` covers Viewer denial, Contributor sanitized ResourceSpace refs, Reviewer listing, local-json storage mode, and Admin readiness warning that wider rollout needs durable storage. Phase 6 package governance blocks export/share unless every item passes item-level reuse/channel/derivative/lifecycle checks. | Contributor/Reviewer inspect Package Builder and confirm ResourceSpace references are clear, originals are not copied, and one blocked item blocks package export/share. | Package drafts are beta affordances unless backend storage/publishing/share links are connected. Collection/package membership is curation, not permission. | PASS local for draft-only demo |
| Saved searches | `portal-saved-search-smoke` covers Viewer denial, Contributor sanitized search state, Reviewer listing, local-json storage mode, and Admin readiness warning. Phase 3 saved views are query definitions only. | Tester saves/loads one benign search if this is part of demo script. | Saved views are beta affordances until durable backend storage is connected. They cannot bypass role/policy filtering. | PASS local for draft-only demo |
| Usage analytics, metrics, and Insights | `portal-usage-smoke` covers event logging when `PORTAL_USAGE_LOGGING=1` and Admin analytics payload redaction. Phase 7 metrics summarize blocked assets, stale lifecycle, package/share blockers, audit/download coverage, and unavailable data honestly. | Viewer opens Insights and common use-case cards; DAM Admin checks readiness and metrics copy. | Metrics/readiness are diagnostics only, not permission truth. Missing analytics/storage must read unavailable or stale, never zero success. | PASS local diagnostics, NO-GO for production analytics |
| Delivery privacy and source custody | `portal-delivery-smoke`, `portal-api-smoke`, and browser QA redaction checks cover no private/source/original/signed URL leakage in browser-facing payloads. | Tester verifies UI language does not imply original/master access. | S3 derivative delivery and Google Shared Drive master-original integration are not configured for production. | PASS local for privacy demo, NO-GO for production delivery |
| Seed/media safety | Read-only seed scrub in command center: 2,290 records, 181 Viewer-visible, 0 portal-ready/downloadable, 181 rights/copyright-review flags, 0 obvious sensitive/youth/private flags. | Rights/media reviewer must sign off preview-only visibility or scrub seed. | Mechanical scan cannot replace rights/people/minors review. This is top invite blocker. | NO-GO until signed off |

## Research-Derived Manual QA Appendix

Research source: `/Users/halim4pro/Downloads/deep-research-report.md`, read for TJC-specific beta gates around doctrine/sacrament review, hymn and channel rights, RE/minors consent, testimony sensitivity, native TJC search taxonomy, stock-safe/context-safe/archive-only reuse tiers, and master-versus-derivative protection.

These scenarios are manual beta checks because current automated smoke tests prove generic access, redaction, queues, feedback, and download gates, but they do not prove TJC-specific ministry correctness.

| Scenario | Test objective | Starting conditions | Role | Steps | Expected outcome | Demo gate |
|---|---|---|---|---|---|---|
| Doctrine and sacrament review | Confirm sacrament/doctrine assets cannot be treated as generic reusable media. | Seed or fixture asset has doctrine/sacrament theme such as baptism, Holy Spirit, footwashing, Holy Communion, or Sabbath. | Reviewer or DAM Admin | Open asset; inspect review fields; attempt stock-safe/public approval without doctrine reviewer evidence. | App keeps item in review, requires doctrine/sacrament reviewer evidence, and does not imply generic Christian reuse. | NO-GO if sacrament item can become stock-safe without review |
| Worship decorum and doctrine context | Confirm worship-service clips/images have context review before public channel use. | Asset depicts worship service, prayer, sacrament, or Sabbath context. | Reviewer | Review use-status copy and approved channels; try to approve broad public reuse without ministry/context note. | Approval requires context note or reviewer rationale; public copy stays careful and does not turn worship content into casual stock. | NO-GO if broad reuse approved without context |
| Hymn and channel rights | Confirm music/hymn assets require channel, territory, and notice logic. | Asset or package references hymn, choir, accompaniment, lyric slide, livestream, or public video channel. | Reviewer or Music rights steward surrogate | Inspect rights fields; attempt export/package/share for public livestream or social channel without hymn clearance. | Export/share remains blocked or marked not cleared until rights basis, approved channel, territory, and required notice are present. | NO-GO if uncleared hymn can be exported for public channel |
| Hymn 470-525 caution | Confirm high-risk hymn range is not treated as automatically livestream-safe. | Test data or manual note references hymn 470-525. | Reviewer | Search/package hymn item; check guide/copy; attempt public/livestream use. | System or tester checklist requires channel-specific rights validation before public/livestream use. | NO-GO if treated as normal public-domain asset |
| RE/minors consent | Confirm Religious Education and child/youth media default restricted until consent is confirmed. | Asset shows RE class, student event, child/youth, or minor-identifying caption. | Reviewer | Open asset; check minors/consent fields; attempt public approval or package inclusion. | Public approval blocked until minors-present and consent basis are reviewed; captions should avoid exposing child identity. | NO-GO if minor/RE item becomes public without consent review |
| Testimony sensitivity | Confirm testimonies require pastoral sensitivity review before broad reuse. | Asset is testimony text/audio/video or references illness, healing, vision, spiritual battle, family conversion, or personal details. | Reviewer | Open review flow; try stock-safe approval or public package use without sensitivity note. | Asset remains context-safe or archive-only unless pastoral sensitivity review explicitly approves broader use. | NO-GO if sensitive testimony becomes stock-safe by default |
| TJC-native search taxonomy | Confirm search uses TJC terms and aliases, not generic church vocabulary only. | Search UI available with seed data. | Viewer | Search `RE`, `Religious Education`, `Sabbath`, `Holy Spirit`, `speaking in tongues`, `testimony`, and `Hymns of Praise`. | Related terms connect where appropriate; `RE` finds Religious Education; doctrine terms remain distinct and useful; no confusing generic "weekend service" framing. | GO if gaps are logged; NO-GO if demo depends on missing taxonomy |
| Reuse tier clarity | Confirm stock-safe, context-safe, and archive-only meanings are visible enough for testers. | Asset detail or package builder shows use status. | Viewer, Contributor, Reviewer | Open one safe-looking asset, one review-needed asset, and one blocked/archive-like asset; ask tester to classify whether it can be reused. | Tester can tell broad reuse, original-context-only, and archive/no-reuse apart within task flow. | NO-GO if testers cannot distinguish reuse tiers |
| Collection/package permission truth | Confirm collection or package membership does not override resource-level restrictions. | Package/collection includes mixed readiness items or blocked refs. | Contributor or Reviewer | Add restricted/needs-review item to package; attempt share/export. | Package stays draft/blocked for public sharing; restricted item does not become visible/downloadable through package. | NO-GO if package bypasses item permission |
| Master versus derivative download | Confirm ordinary roles receive only approved derivatives and never masters/originals. | Asset has preview/derivative and master/source metadata, or blocked asset with no approved derivative. | Viewer, Contributor, Reviewer | Inspect asset detail, API/download behavior, and package export; try source/original/master download paths. | Viewer/Contributor/Reviewer cannot download masters; blocked derivative returns 403; UI says original/master remains restricted. | NO-GO if master/source URL or original path leaks |
| Derivative provenance | Confirm public/member derivative keeps parent/master provenance without exposing private source details. | Approved derivative or preview exists. | DAM Admin | Inspect detail/admin readiness and feedback/export payload. | Derivative can be traced for audit by authorized role, but browser-facing viewer payload omits source path, checksum, original filename, and private storage location. | NO-GO if private provenance leaks to normal user |
| Archive-only protection | Confirm preservation/archive value is not confused with stock-safe value. | Historical, raw, internal, governance, testimony, or sacrament-sensitive asset exists. | DAM Admin or Reviewer | Search/open archive-like item; attempt public reuse or package inclusion. | Item remains archive-only or restricted unless reopened for review; tester sees preservation status is not reuse approval. | NO-GO if archive-only item can be shared as stock |

## Must-Run Commands After Integrated Changes

Run these after all integrated changes land and before demo QA signoff:

```bash
make frontend-check
make launch-readiness
BASE_URL=http://localhost:4871 make portal-api-smoke
BASE_URL=http://localhost:4871 make portal-download-ticket-smoke
BASE_URL=http://localhost:4871 make portal-writeback-guard-smoke
BASE_URL=http://localhost:4871 make portal-package-smoke
BASE_URL=http://localhost:4871 make portal-saved-search-smoke
BASE_URL=http://localhost:4871 make portal-feedback-smoke
BASE_URL=http://localhost:4871 make portal-beta-rehearsal
BASE_URL=http://localhost:4871 make portal-browser-qa
BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe
# Mutating hosted smoke requires explicit approval:
# PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1 PORTAL_HOSTED_SMOKE_APPROVED_BY=<owner-or-ticket> BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-smoke
```

Run environment-specific smokes with matching server flags:

```bash
BASE_URL=http://localhost:4871 make portal-sso-smoke
BASE_URL=http://localhost:4871 make portal-usage-smoke
BASE_URL=http://localhost:4871 make portal-delivery-smoke
```

Server expectations:

- Start SSO rehearsal server with `SSO_TRUSTED_HEADERS=1` or `SSO_PROVIDER=cloudflare-access`.
- Start usage rehearsal server with `PORTAL_USAGE_LOGGING=1`.
- Keep hosted beta download reuse disabled for preview-only batch: `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0`.
- Keep hosted ResourceSpace writeback disabled/queued unless explicitly approved: `RESOURCESPACE_ENABLE_WRITEBACK=0`, `RESOURCESPACE_WRITEBACK_MODE=queued`.

## Manual Beta Minimum

Before widening beyond owner demo, complete these human checks:

| Role | Device | Minimum pass |
|---|---|---|
| Viewer | Desktop and one 390 px mobile pass | Search `Bible`, open asset, understand use status, hit blocked download, report one test issue. |
| Contributor | Desktop | Walk Upload with harmless sample only, inspect Collections/Package Builder, confirm no originals copied and no publish claim. |
| Reviewer | Desktop and one mobile spot check | Switch review queues, incomplete approval blocks, complete evidence queues decision with honest pending-write copy. |
| DAM Admin | Desktop | Open Admin readiness, integration blockers, Feedback Inbox, triage one feedback record to `agent-ready`, export JSON. |
| Any role | Mobile 390 px | Check nav, Task Mode, Guide, feedback button, and no text overlap on core task path. |
| Reviewer or DAM Admin | Desktop | Run research-derived scenarios for doctrine, hymn/channel rights, RE/minors, testimony sensitivity, taxonomy, reuse tier, archive-only status, and master-versus-derivative protection. |

## Coverage Gaps

- Wider-batch human rights/media reviewer signoff for Viewer-visible seed records must be renewed before expanding beyond the named internal batch.
- No manual proof yet that doctrine/sacrament assets route through doctrine review before stock-safe/public use.
- No manual proof yet that hymn/channel rights, territory, required notices, and high-risk hymn ranges block unsafe public export.
- No manual proof yet that RE/minors media cannot become public without consent review.
- No manual proof yet that sensitive testimony assets remain context-safe or archive-only unless pastoral review approves broader use.
- No manual proof yet that TJC search aliases and facets are complete enough for `RE`, `Religious Education`, `Sabbath`, `Holy Spirit`, `speaking in tongues`, testimony themes, and hymn terms.
- No manual proof yet that testers can distinguish stock-safe, context-safe, and archive-only assets in normal task flow.
- No production SSO proof; only local trusted-header shim and beta session/fallback paths are tested. Production SSO role proof now requires Cloudflare Access assertion/email evidence or a future approved adapter.
- No live ResourceSpace writeback proof; correct beta behavior is queued/no-live-writeback.
- No approved-copy real reuse/download demo because zero seed assets are portal-ready/downloadable.
- No production S3 derivative delivery or Google Shared Drive master-original connector proof.
- No broad human mobile ergonomics proof beyond automated screenshots.
- No durable analytics, audit, package, or saved-search backend proof; local-json/runtime beta storage is covered honestly.
- Hosted feedback persistence should be rechecked if Vercel KV/Blob env changes.

## Final QA Call

**Current Team Beta call**: NO-GO. June 18 local browser QA is green, but hosted 181-record proof, hosted durable/fail-closed proof, and Hali/Enoch signoff are missing. Enterprise beta and production are also NO-GO.

**Future GO condition**: Signed six-person internal beta workflow test using stable hosted URL, beta login, Task Mode, blocked downloads, queued review workflow, Admin readiness, diagnostic metrics, feedback inbox/export, packages, and saved searches as beta-only affordances after hosted proof and owner gates close.

**NO-GO**: Public launch, production approval workflow, real download/reuse workflow, live ResourceSpace writeback, production analytics, durable public package sharing, source/original access, or wider teammate invite batch before media safety, private sharing policy, hosted writeback mode, seed ownership, and research-derived manual QA gates are signed off.
