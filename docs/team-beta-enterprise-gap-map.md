# Team Beta vs Enterprise Readiness Gap Map

Date: 2026-06-11
Scope: PM/CTO readiness map for TJC Stock Media. This distinguishes a narrow, honest Team Beta wedge from enterprise/production readiness.

## PM/CTO Verdict

June 15 safety update: this map is historical PM/CTO context, not current send approval. TJC Stock Media is locally credible as a governed media workbench, but teammate invite posture is **NO-GO** until the June 15 evidence blockers close: canonical deployment, hosted authenticated protection, ResourceSpace scope, Google Drive custody, durable/fail-closed hosted state, and renewed tester approval.

It is not enterprise-production ready. Production blockers should not be hidden. Keep the story narrow: local proof improved, hosted send is blocked, and the product must not claim live SSO, live ResourceSpace writeback, signed S3 delivery, durable audit/compliance storage, clean-host restore, or full archive scale.

## Evidence Read

- `AGENTS.md`: Shared Drive remains master, ResourceSpace remains DAM/search/review layer, source media cannot be mutated, all imports default to `Needs Review / Do Not Publish`.
- `tasks/prd-enterprise-tjc-media-library.md`: launch ladder separates Team Beta, production internal, and full-archive-capable infrastructure.
- `tasks/prd-approved-library-pilot.md`: pilot is normal-user Approved Library plus governance mode, with no production SSO or live writeback as explicit non-goals.
- `docs/beta-readiness-command-center.md`: June 15 local gates are green, but invites remain NO-GO until hosted/canonical/custody/durable/tester gates close.
- `docs/resourcespace-integration.md`: ResourceSpace reads/writeback/S3/SSO/durable analytics are truthfully staged, with no fake live claims.
- `docs/metadata-schema.md`, `docs/data-engineering-playbook.md`, `docs/rights-workflow.md`: canonical metadata, rights, provenance, and AI-human approval boundaries are clear.
- `docs/backup-restore-runbook.md`, `docs/production-runbook.md`, `docs/launch-plan.md`: production requires separate backup target, clean-host restore, access protection, and church IT ownership.
- `docs/screenshots/qa/browser-qa-report.json`: latest QA covers 17 pages, six viewport widths, 23 screenshots, with zero failures, warnings, console errors, or network failures.
- `docs/runs/dam-10-10-ceo-cto-audit-2026-06-11.md`: current 10/10 gap is confidence orchestration, not more screens.

## Scoring

Risk scores: 5 = high, 1 = low.

| Rank | Gap | Stage | Beta trust | Learning | Architecture | Future scale | Action |
|---:|---|---|---:|---:|---:|---:|---|
| 1 | Human seed/media safety signoff is still open. | Team Beta must-have | 5 | 4 | 2 | 3 | Rights/media reviewer must confirm no sensitive, private, unreleased, youth-identifiable, or copyrighted media is visible in beta. |
| 2 | Private beta access policy and first tester ownership are still open. | Team Beta must-have | 5 | 3 | 3 | 3 | Beta owner must define who gets the URL, what not to share, and who owns feedback triage/escalation. |
| 3 | Hosted writeback mode must be explicitly disabled or queued. | Team Beta must-have | 5 | 3 | 4 | 4 | Tech owner must verify hosted env uses queued/no-live writeback and run writeback guard smoke against hosted or equivalent config. |
| 4 | Download ticket proof is implemented in code but should be promoted into beta readiness evidence before demoing approved downloads. | Team Beta must-have if downloads are shown | 5 | 3 | 4 | 4 | Run `make portal-download-ticket-smoke` and add it to the invite checklist if demo includes approved-copy download. |
| 5 | Production auth is a trusted-header rehearsal, not real SSO/IdP ownership. | Production blocker | 4 | 2 | 5 | 5 | CTO/product must choose Cloudflare Access, Google Workspace SSO, or church proxy, then disable beta role switching in production. |
| 6 | Durable portal storage is partial and local-first. Package drafts, saved searches, pending writes, tickets, audit, and usage events are local JSON/SQLite except feedback can use Vercel KV/Blob. | Production blocker | 4 | 3 | 5 | 5 | CTO must choose durable storage adapter and owner before production internal launch. |
| 7 | Audit is useful beta evidence but not an enterprise ledger. | Production blocker | 4 | 3 | 5 | 5 | Implement append-only or tamper-evident audit storage with export/retention rules and owner. |
| 8 | ResourceSpace live writeback needs verified field refs and staging record proof. | Production blocker | 4 | 2 | 5 | 4 | DAM admin plus tech owner must approve field map, run staging writeback smoke, and reconcile queued writes. |
| 9 | Backup/restore proof is shape-level, not clean-host operational recovery. | Production blocker | 3 | 2 | 5 | 5 | Church IT must prove clean-host boot, login/access, search, blocked download, approved download, and review queue after restore. |
| 10 | S3 signed derivative delivery is not production-ready. | Enterprise post-beta | 3 | 2 | 4 | 5 | Decide provider/bucket/TTL/KMS/cost owner and add staging signed URL expiry smoke. |
| 11 | Rights schema is good MVP metadata, but enterprise TJC fields are not fully modeled or required yet. | Enterprise post-beta | 4 | 4 | 4 | 4 | Add reuse tier, doctrine/sacrament, hymn rights, minors/consent, sensitivity, approved channels, and reviewer roster. |
| 12 | Large media path is policy-defined but video/audio pilot is incomplete. | Enterprise post-beta | 3 | 3 | 3 | 5 | DAM admin should run 1-2 MP4 pilot through manifest, preview/playback, storage, download, and review checks before broad video import. |
| 13 | Performance/scale evidence is sufficient for tiny beta, not enterprise volume. | Enterprise post-beta | 2 | 3 | 4 | 5 | Add scale smoke around search/export sizes, import batch size, pending queue age, analytics volume, and derivative generation failures. |

## Team Beta Must-Have

These protect trust in a small internal demo/test. They should block teammate invites, but they do not require enterprise infrastructure.

1. Rights/media seed scrub signed off by a human reviewer.
2. Private beta URL sharing policy and first tester roster owned by a beta owner.
3. Hosted writeback disabled/queued proof captured before invites.
4. Feedback triage owner named and export path tested.
5. Stop-test policy visible to testers for P0/Critical privacy, source-truth, writeback, and unsafe download issues.
6. If approved downloads are part of the demo, ticketed download smoke must pass and be listed with beta evidence.

## Beta Should-Have

These improve learning quality and prevent "enterprise theater," but they can follow the first tiny test if scope stays narrow.

1. Curated "Approved Library" seed set with 5-20 clearly reusable assets and plain-language use scope.
2. One scripted wedge: Viewer search/detail/trust, blocked unsafe download, Reviewer evidence lock, Admin readiness.
3. Feedback export packet reviewed after every tester batch.
4. Admin command center copy that separates local proof from hosted invite readiness and production readiness.
5. A small list of learning questions: Can testers find an asset in under 60 seconds? Do they understand why blocked media is blocked? Do reviewers trust pending-write language?

## Enterprise Post-Beta

These should become implementation lanes after beta learning, not demo promises.

1. Production identity provider, group-to-role map, offboarding, and emergency admin path.
2. Durable storage adapter for pending writes, package drafts, saved searches, feedback, audit, usage, and download tickets.
3. ResourceSpace staging field-map verifier and live writeback smoke.
4. TJC-native rights schema v2: reuse tier, doctrine/sacrament, hymn rights, minors/consent, testimony/sensitivity, approved channels.
5. Signed derivative delivery architecture and manifest linking approved copies to masters.
6. Archive custody audit for source count, checksum, master path, ResourceSpace ref, duplicate group, derivative status, and review state.
7. Monitoring for ResourceSpace health, DB/disk, backup age, pending write age, writeback failures, derivative failures, denied downloads, and metadata export freshness.

## Production Blockers

Production internal launch should not proceed until these are closed.

1. Real SSO/Access is live, beta role switching/query roles are disabled, and `portal-sso-smoke` passes in production identity mode.
2. Durable non-local storage is configured for operational state and readiness fails if it is missing.
3. Audit ledger is append-only or tamper-evident enough for internal governance and has export/retention ownership.
4. Live ResourceSpace writeback passes against a staging record with verified field refs, or production clearly remains read-only/queued by policy.
5. Clean-host restore proof includes app boot, access/login, search, blocked unsafe download, approved-copy download, review queue, and metadata export.
6. Backup target is separate from primary storage and has schedule, retention, alert, and owner.
7. Signed approved-copy delivery is verified if the portal claims production download delivery beyond local derivatives.
8. Rights/doctrine/music/minors reviewer roster exists and public-use approvals require reviewer, date, scope, and notes.
9. Large video/audio intake has a tested admin path outside browser upload limits.

## Architecture Risk Notes

- Auth/SSO: `requestIdentity` has a good local trusted-header boundary and now fails closed for generic production header shims. Production currently requires Cloudflare Access assertion/email proof; Google Workspace or church proxy headers would need an approved adapter before they can be trusted.
- Durable storage: local JSON/SQLite is honest and fine for beta; it is not enough for production accountability, multi-user concurrency, retention, or recovery.
- ResourceSpace writeback: pending-write-first design is strong. Live writeback needs field-map verification, staging proof, retries, and reconciliation.
- Audit durability: current JSONL audit is valuable beta evidence. Enterprise needs durable append-only storage, backup inclusion, retention, and export controls.
- Rights workflow: core safety rules are strong. Enterprise TJC use needs conditional evidence by doctrine, hymns/music, minors/consent, testimony sensitivity, territory/channel, and withdrawal status.
- Backup/restore: current restore test validates archive shape. Production needs clean-host operational restore.
- Large media import: policy is correct. Proof needs 1-2 video/audio pilots before broad import.
- Performance/scale: tiny beta can proceed. Enterprise needs scale checks around search, exports, import batches, derivative jobs, and long pending queues.

## Owners Needed

| Owner | Needed decision or proof |
|---|---|
| Beta owner | Invite policy, first tester roster, demo wedge, feedback cadence. |
| Rights/media reviewer | Seed scrub and public/internal-use review signoff. |
| CTO/tech owner | SSO provider, production identity mode, durable storage, writeback staging, signed delivery architecture. |
| DAM admin | ResourceSpace field map, reviewer workflow, pending-write reconciliation, collection/Brand Hub mappings. |
| Church IT/admin | Host, backup target, restore proof, monitoring, storage sizing, access infrastructure. |
| Doctrine/music/minors reviewers | Conditional review roster and policy for sensitive TJC media. |
| QA owner | Browser QA, hosted smoke, writeback guard, download ticket smoke, beta rehearsal evidence. |

## Demo Positioning

Say:

- "This is a controlled internal Team Beta for a governed church media workflow."
- "The app is strongest at safe discovery, reuse decisions, blocked unsafe downloads, review evidence, and honest readiness."
- "Production infrastructure decisions are visible and deliberately not hidden."

Do not say yet:

- "Enterprise production-ready."
- "SSO is live."
- "ResourceSpace writeback is live."
- "Signed S3 delivery is ready."
- "Audit is compliance-grade."
- "Full archive is imported and approved."

Final call: **NO-GO for teammate invite/send under the June 15 packet.** Reconsider only after hosted protection, canonical deployment, ResourceSpace scope, Google Drive custody, durable/fail-closed hosted state, and renewed tester approval are proven. Production internal launch remains NO-GO until SSO, durable storage, live writeback/staging or explicit queued policy, audit durability, clean-host restore, and backup ownership are proven.
