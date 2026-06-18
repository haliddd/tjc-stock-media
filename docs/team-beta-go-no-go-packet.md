# Team Beta GO/NO-GO Packet

Last updated: 2026-06-18

Purpose: one canonical decision packet for the TJC Stock Media internal Team Beta test round. This packet is the final place to check whether the current build is ready for owner-led dry run, teammate invite batch, or production launch.

This packet does not approve public launch, production SSO, live ResourceSpace writeback, public downloads, broad archive reuse, source media mutation, staging, commits, deploys, or external communications.

## June 18 ORCH Final Override

Current ORCH evidence supersedes stale June 17 browser-QA language below.

Current call:

- Local DAM prototype: improved for local rehearsal only.
- Owner-led local dry run: PASS on local browser QA after ORCH product fixes; not hosted invite approval.
- Team Beta invite/send: NO-GO.
- Enterprise beta: NO-GO.
- Production: NO-GO.

Verified June 18 evidence:

- Local browser QA passed at `2026-06-18T06:14:20.205Z`: 20 pages, 6 viewport widths, 32 screenshots, 0 failures, 0 console errors, 0 network failures, 3 expected denied console entries.
- Hosted read-only probe passed protected/redacted safety shape, and `/api/beta-auth/session` exposed build marker `small-team-beta-readiness-2026-06-17` with commit `7320d1643801`.
- Hosted 181-record catalog proof is not established because protected hosted API/content routes redirect through beta auth.
- Hosted durable audit/ticket storage is not proven; hosted downloads must remain fail-closed unless owner-approved durable storage proof exists.
- Hali/Enoch final owner signoff and invite/send approval are not recorded.

## Decision

| Scope | Decision | Reason |
|---|---|---|
| Owner-led internal dry run | PASS local route/auth/browser QA only | June 18 ORCH local browser QA is green after product fixes. This is not hosted invite approval. |
| Joanna mini beta | NO-GO until hosted snapshot proof, hosted persistence/fail-closed boundary, and owner signoff close | Hosted current marker passes protected session shape, but authenticated 181-record count proof and durable hosted audit/ticket proof are missing. |
| Tiny teammate invite batch | NO-GO until hosted/current gates close and renewed owner signoff exists | Teammate invites require hosted 181 proof, named tester list, send owner, stop-test owner, feedback triage owner, and explicit invite/send approval. |
| Production/internal launch | NO-GO | Production SSO, durable storage, live ResourceSpace writeback, full rights review, production delivery, and full archive readiness are not proven. |

Current gap audit: `docs/team-beta-gap-audit-2026-06-18.md`.

## Gap Sort

| Bucket | Current Call |
|---|---|
| Must fix before beta | Hosted 181-record count proof, hosted runtime/download persistence boundary, production-mode browser QA contract, DB-capable backup/restore or explicit read-only scope, hosted env confirmation, renewed owner signoff, and live ResourceSpace/Docker smoke or explicit snapshot-only scope. |
| Can wait | Live ResourceSpace writeback, Google Drive connector/sync, full archive import, video/audio, production SSO, public downloads/sharing, broad analytics, and clean-machine production DR drills. |
| Demo polish | UI overflow/copy, empty/loading states, search wording, sample task wording, and screenshot polish. |

## What Is Ready

| Area | Evidence | Status |
|---|---|---|
| Core local readiness | `make launch-readiness` currently passes with `failures=0`, `warnings=1`; warning is `.env` placeholder values. | PASS local proof / env warning remains |
| Type safety | `npm --prefix frontend run typecheck` passes. | PASS local |
| API payload safety | `node scripts/api-payload-guard.mjs` passes. | PASS local |
| API audit coverage | `node scripts/api-audit-guard.mjs` passes. | PASS local |
| Storage honesty | `node scripts/storage-honesty-guard.mjs` passes. | PASS local |
| Browser QA | `docs/screenshots/qa/browser-qa-report.json` covers 20 pages, 6 viewport widths, and 32 screenshots. Latest ORCH report checked at `2026-06-18T06:14:20.205Z` has 0 failures, 0 console errors, 0 network failures, and 3 expected denied console entries. | PASS local |
| June 17 readiness pass | `docs/runs/evidence/2026-06-17/small-team-beta-readiness-pass.md` records local route, upload, review, library, invite-smoke, typecheck, test, and build proof. It also records browser QA red on download audit probes. | PARTIAL local / hosted gates open |
| Hosted current marker | `curl https://tjc-stock-media.vercel.app/api/beta-auth/session` after deployment `dpl_DSakz1GSaViJGeyBxVwAwB9HkFND` returns 401 unauthenticated session JSON with `build.readinessContract: small-team-beta-readiness-2026-06-17`. | PASS hosted/current |
| Real beta auth/invite | Hosted smoke passed beta-session login for Viewer, Contributor, Reviewer, and DAM Admin. Contributor and above used a church/location invite code. Values stay in Vercel env and `.runtime/beta-credentials-2026-06-17.env`, not Git/docs/logs/chat. | PASS private proof |
| Hosted content counts | Current code adds a sanitized `bundled-beta-catalog` fallback with 181 MVP 2024 LM Photos records, no source paths/checksums, and search anchors for Bible, Plant, and Fountain. Last stable hosted proof before this code still returned demo fallback: 16 total. | PARTIAL / redeploy and hosted count probe required |
| Hosted persistence/fail-closed | Hosted feedback POST/Admin visibility passed. Hosted blocked download failed closed with `503 audit-required` and no source/original/private/checksum leak. Upload/review persistence still needs scoped proof against real beta content. | PARTIAL |
| Local backup/restore | `make backup` wrote `.runtime/backups/20260617-201323`; `make restore-test` passed archive restore and wrote a restore marker. Docker daemon was unavailable, so database dump was skipped. | PARTIAL local / DB proof still open |
| Local beta rehearsal | `.runtime/beta-rehearsals/20260615T064029Z-43364/summary.json` passes Viewer search/open/download-block/review-block, Reviewer evidence lock, honest queued write, and Admin readiness. | PASS local |
| Seed/media signoff packet | `docs/team-beta-seed-media-signoff.md` includes counts, sample searches, fail conditions, research-derived categories, and signoff text. | Signed for preview-only tiny internal beta |
| Hosted access/env packet | `docs/team-beta-hosted-access-proof.md` defines required hosted env, private URL policy, smoke safety, fail conditions, and owner signoff text. | Signed for queued/disabled writeback |
| Feedback/incident runbook | `docs/team-beta-feedback-incident-runbook.md` defines P0/P1/P2/P3, watch cadence, export path, stop-test triggers, and tester notices. | Primary and backup assigned |
| Tester packet | `docs/team-beta-internal-test-packet.md` contains draft invite copy, beta-login path, tasks, boundaries, feedback questions, stop-test policy, and pre-send checklist. | Draft only; NO-GO for send until renewed approval |
| Signoff record | `docs/team-beta-signoff-record.md` is the human-owned place to fill owner, timestamp, evidence, and decision fields. | Current June 15 record is NO-GO pending renewed approval |
| Research alignment | `docs/team-beta-research-synthesis.md`, `docs/team-beta-rights-playbook.md`, and `docs/team-beta-qa-matrix.md` cover TJC-only positioning, reuse tiers, doctrine/sacrament review, hymn/channel rights, RE/minors consent, testimony sensitivity, taxonomy, masters vs derivatives, and AI limits. | PASS local / policy coverage |

## Closed Human Gates

These gates were historically closed only for the six-person tiny internal Team Beta batch named below. June 15 P0 findings supersede that historical send approval until renewed proof and owner approval exist.

| Gate | Required owner | Required evidence | Current status |
|---|---|---|---|
| Seed/media safety | Enoch Liu primary; Hali Ding backup | Historical preview-only visibility accepted; renewed June 15 approval still required. | NO-GO pending renewed approval |
| Access/private URL | Enoch Liu | Named tester list and stable URL policy are historical; canonical hosted protection/deploy proof still required. | NO-GO pending canonical hosted proof |
| Hosted env/writeback | Hali Ding | Historical env values exist; June 15 run did not verify hosted env/durable state/authenticated redaction/download. | NO-GO pending hosted proof |
| Feedback triage | Hali Ding primary; Enoch Liu backup | Historical triage assignment exists; renewed send window still required. | NO-GO pending renewed approval |
| Stop-test response | Hali Ding primary; Enoch Liu backup | Stop-test rule exists; renewed incident owner approval still required before invite. | NO-GO pending renewed approval |

Signed invite scope:

- Named testers: Jackie Yu, Alan Yu, Enoch Liu, Hali Ding, Joanna Chou, Richard Pang.
- Project owners: Hali Ding and Enoch Liu.
- Stakeholders/supervisors: Jackie, Alan, Joanna, Richard.
- Stable URL only: `https://tjc-stock-media.vercel.app`.
- Do not widen beyond these testers without a new signoff record.

## Research-Derived No-Go Checks

Teammate invite returns to NO-GO if any of these are violated or not explicitly covered in the owner review:

| Risk | Required beta behavior |
|---|---|
| Doctrine/sacrament | Baptism, Holy Spirit, footwashing, Holy Communion, Sabbath, prayer, and worship-context media require domain review before broad reuse. |
| Hymn/music | Hymns of Praise, choir, lyric slides, public livestream, public video, and hymn 470-525 use require channel, territory, rights basis, and notice validation. |
| RE/minors | Religious Education, youth, children, student events, and minor-identifying captions default restricted until consent/release basis is documented. |
| Testimony/pastoral | Illness, healing, visions, family conversion, spiritual battle, grief, prayer requests, and pastoral/private details default context-safe or archive-only unless explicitly reviewed. |
| Reuse tiers | Stock-safe, context-safe, and archive-only are separate states; found does not mean approved. |
| Masters/derivatives | Ordinary roles see previews or approved derivatives only; masters, originals, source paths, checksums, private URLs, and source custody details stay restricted. |
| AI | AI may suggest tags only; AI cannot approve rights, people/minors, doctrine, sensitivity, public reuse, or internal reuse. |

## What To Tell Testers After Gates Close

Use `docs/team-beta-internal-test-packet.md` as the send packet. Keep this framing:

- This is a tiny internal Team Beta workflow test.
- This is not production and not a public media library.
- Google Shared Drive remains the master-original warehouse.
- ResourceSpace remains the DAM/search/review source of truth.
- Current seed is preview-only unless a human reviewer signs otherwise.
- Do not upload real church media, youth media, sensitive media, copyrighted media, source files, or masters.
- Stop testing immediately for any P0 privacy, source-truth, unsafe-download, writeback-honesty, minors/RE, hymn/sacrament/testimony, or source-custody issue.

## Verification Commands

June 18 override: current decision is **Team Beta NO-GO**. Production-mode local browser QA is now green, but hosted teammate invites remain **NO-GO** until hosted 181-record proof, hosted persistence or explicit fail-closed hosted download instructions, and owner approval are proven.

Hosted download behavior for this recovery pass: use the conservative default from `docs/runs/pm-no-go-recovery-plan-2026-06-17.md`. Hosted approved-copy downloads stay intentionally fail-closed for Joanna unless Hali separately approves and proves durable audit/ticket storage. No audit-required behavior may be loosened to make tests pass.

June 15 override remains historical context; prior GO signoff text below is superseded for send/invite decisions.

Run these before posting a final send decision:

```bash
git diff --check
npm --prefix frontend run typecheck
node scripts/api-payload-guard.mjs
node scripts/api-audit-guard.mjs
node scripts/storage-honesty-guard.mjs
make launch-readiness
BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe
```

Recommended before widening beyond owner-led dry run:

```bash
BASE_URL=http://localhost:4871 make portal-feedback-smoke
BASE_URL=http://localhost:4871 make portal-beta-rehearsal
BASE_URL=http://localhost:4871 make portal-browser-qa
```

Do not run hosted mutating smokes without owner approval. `portal-hosted-smoke` writes beta feedback storage, and `portal-writeback-guard-smoke` posts review decisions.
`portal-hosted-smoke` now requires `PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1` plus `PORTAL_HOSTED_SMOKE_APPROVED_BY` for non-local targets.

## Final Signoff Block

Do not convert this block to GO or use it for teammate invite send until the June 17 hosted/current beta gates, 181-record snapshot proof, and Hali approval close. `docs/team-beta-signoff-record.md` is the source of truth:

```text
Decision: NO-GO
Decision timestamp: 2026-06-15T07:29:52Z
Decision owner: Codex safety evidence update, pending Hali + Enoch renewed approval
Seed/media reviewer: Enoch Liu primary; Hali Ding backup
Access coordinator: Enoch Liu
Tech/env owner: Hali Ding
Primary feedback triager: Hali Ding
Backup feedback triager: Enoch Liu
Incident lead: Hali Ding primary; Enoch Liu backup
Named tester list: Jackie Yu, Alan Yu, Enoch Liu, Hali Ding, Joanna Chou, Richard Pang
Stable URL only confirmed: Yes - stable URL is protected and exposes the June 17 build marker
Preview URL sharing blocked: Yes
Seed/media preview-only visibility approved: Pending renewed approval
Hosted writeback disabled/queued confirmed: Yes for env posture; hosted downloads remain fail-closed unless durable audit/ticket storage is configured and proven
Task Mode and Report issue enabled: Yes
Download demo-role bypass disabled: Yes
Stop-test rule sent to testers: Yes
Feedback watch window: Pending renewed invite decision; proposed first 24 hours after invite
Next-batch review time: Pending renewed invite decision; proposed 24 hours after first invite
Notes: Tiny internal Team Beta only. Production, public launch, public downloads, broad reuse, live ResourceSpace writeback, deploys, commits, staging, source media mutation, and external communications remain out of scope.
```

For fastest completion, use the fast final reply template in `docs/team-beta-signoff-record.md` and keep `docs/team-beta-internal-test-packet.md` as the invite copy source.

Do not claim invite GO while hosted/current URL, 181-record beta snapshot proof, hosted persistence/fail-closed instructions, and owner approval remain blank, stale, or unproven.

Current final call: **NO-GO for teammate invite batch until the 181-record hosted snapshot is redeployed/probed and owner gates close.**
