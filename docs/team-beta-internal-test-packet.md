# Team Beta Internal Tester Packet

Last updated: 2026-06-15

## June 15 Safety Override

Current status: **NO-GO for sending teammate invites.** Use this packet as a draft only until `docs/runs/evidence/2026-06-15/11-friday-readiness-report.md` blockers close and Hali renews approval.

Reason: June 15 local proof fixed a P0 query-role elevation class, but hosted authenticated protection, canonical deployment, ResourceSpace scope, Google Drive custody, durable/fail-closed hosted state, and renewed tester approval remain unresolved.

Do not send hosted `?role=` links. Query roles are not authority. Hosted beta must use `/beta-login` or trusted SSO after approval. `portal-hosted-smoke` is mutating and requires `PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1` plus `PORTAL_HOSTED_SMOKE_APPROVED_BY`; use `portal-hosted-readonly-probe` for non-mutating hosted checks.

Use this packet only after the pre-send gates below are renewed and signed. This is a draft packet for a tiny internal Team Beta workflow test of the TJC internal DAM portal. It is not approval for production launch, public sharing, source media changes, live ResourceSpace writeback, public downloads, or broad archive reuse.

Internal beta access update: when `BETA_AUTH_ENABLED=true`, testers must use `/beta-login` and the assigned persona password from Vercel env vars. Role-query URLs are legacy QA shortcuts for beta-off/local rehearsals only and must not be sent as hosted access.

Current beta-auth handoff: `docs/free-internal-beta-handoff-2026-06-12.md`

Canonical beta URL:

`https://tjc-stock-media.vercel.app`

Supporting docs:

- `docs/team-beta-go-no-go-packet.md`
- `docs/team-beta-signoff-record.md`
- `docs/beta-readiness-command-center.md`
- `docs/team-beta-seed-media-signoff.md`
- `docs/team-beta-hosted-access-proof.md`
- `docs/team-beta-feedback-incident-runbook.md`
- `docs/teammate-beta-invite-pack.md`
- `docs/teammate-test-guide.md`
- `docs/team-beta-rights-playbook.md`
- `docs/team-beta-qa-matrix.md`
- `docs/team-beta-research-synthesis.md`
- Research source: `/Users/halim4pro/Downloads/deep-research-report.md`

## Current Send Status

Packet status: draft / blocked after June 15 P0.

Invite status: NO-GO until hosted/canonical/custody/durable gates close and Hali renews tester approval.

Mature DAM beta boundaries after Phases 0-7:

- ResourceSpace remains the metadata, search, and review source of truth.
- Google Shared Drive remains master-original custody.
- Approved folders, approved copies, packages, saved views, and collections are delivery/readiness workflows, not permission truth.
- Viewer and Contributor paths must not expose originals, source paths, master paths, checksums, signed URLs, ResourceSpace internals, reviewer evidence, or private notes.
- Viewer downloads are approved-copy gated only. Original/master access remains a separate request-only workflow and is not enabled by this beta.
- Metrics, readiness, audit, package, and usage summaries are diagnostics/accountability evidence only. They do not approve rights, consent, doctrine, minors, hymn/music, public use, or portal readiness.
- AI/smart suggestions are review debt. Humans approve rights, consent, people/minors, doctrine/sacrament, hymn/music clearance, sensitivity, and public reuse.
- Brandfolder-inspired search, collections, packages, and saved views are translated into governed TJC workflows: route to review, explain blockers, and never bypass per-asset review.
- Local JSON/runtime storage, queued review writes, and beta analytics are beta-only unless production-durable storage and live ResourceSpace sync are separately configured and proven.

| Gate | Required signoff | Owner | Timestamp | Decision |
|---|---|---|---|---|
| Seed/media safety | Rights/media reviewer confirms preview-only beta visibility is safe, or seed is scrubbed/hidden before invites. | Enoch Liu primary; Hali Ding backup | pending renewed June 15 approval | NO-GO |
| Access and private URL | Access owner confirms the invite list is internal only, only the stable unlisted URL is shared, and no Vercel preview URL is shared. | Enoch Liu | pending canonical hosted proof | NO-GO |
| Hosted writeback env | Tech owner confirms `RESOURCESPACE_ENABLE_WRITEBACK=0`, `RESOURCESPACE_WRITEBACK_MODE=queued`, `BETA_FEEDBACK_ENABLED=1`, and `BETA_TASK_MODE_ENABLED=1`. | Hali Ding | pending hosted env/durable proof | NO-GO |
| Feedback triage | First-batch triager confirms they will watch Admin -> Feedback Inbox, classify P0/P1/P2/P3, export agent-ready JSON, and decide next-batch status. | Hali Ding primary; Enoch Liu backup | pending renewed send window | NO-GO |
| Stop-test response | Incident lead confirms they can pause testing, notify testers, preserve safe evidence, and decide resume/no-resume. | Hali Ding primary; Enoch Liu backup | pending renewed incident owner approval | NO-GO |

Draft send rule, inactive until renewed approval:

- Send only to Jackie Yu, Alan Yu, Enoch Liu, Hali Ding, Joanna Chou, and Richard Pang.
- Use only `https://tjc-stock-media.vercel.app`; do not share Vercel preview URLs.
- Feedback watch window is the first 24 hours after invite.
- Next-batch review time is 24 hours after first invite.
- Do not claim production launch, public launch, public downloads, broad reuse, live ResourceSpace writeback, source media mutation, staging, commits, deploys, or external communications.

## Final Invite Copy

Subject: TJC Stock Media tiny internal beta test

Hi team,

We are running a tiny internal beta test of the TJC internal DAM portal, a TJC-only media library workbench for safer search, review, and reuse decisions.

This is not a production launch and not a public media library. Google Shared Drive remains master-original custody. ResourceSpace remains the DAM/search/review source of truth. The portal helps us test whether ministry teammates can find media, understand whether it is portal-ready, context-safe, archive-only, or blocked, and report unclear or unsafe states.

If beta auth is enabled, open:

`https://tjc-stock-media.vercel.app/beta-login`

Select your assigned persona and enter the password provided by the beta coordinator. This is internal beta access for QA testing only. It is not production SSO, not real church member auth, and not impersonation.

Role entry paths after trusted beta session/SSO:

- Viewer: `/`
- Contributor: `/upload`
- Reviewer: `/review`
- DAM Admin: `/admin`
- Guide: `/guide`

Important boundaries:

- Do not forward these links outside the named test group.
- Do not upload sensitive, private, unreleased, youth-identifiable, copyrighted, source, master, or personal media.
- Use harmless sample files only if your task asks you to test Upload.
- Do not treat any visible seed media as reusable or downloadable.
- Do not treat raw `Approved Public` as final reuse approval.
- Do not treat metrics, readiness cards, package membership, collection membership, saved views, or AI suggestions as permission.
- Do not publish, repost, download around gates, or move any source media.
- Role switch is simulated for beta QA only; it is not production authentication.
- ResourceSpace writeback is queued/disabled for this beta.
- Queued review decisions are portal evidence, not ResourceSpace success.

Stop testing and report immediately if you see any P0 issue:

- A blocked, Needs Review, Possible Minors, archive-only, or Do Not Use asset downloads.
- A page says ResourceSpace was updated when a decision only queued locally.
- Sensitive, private, youth-identifiable, unreleased, copyrighted, source, or master media appears exposed.
- Original/master paths, private URLs, checksums, or source custody details appear to Viewer or Contributor roles.
- Hymn, worship, sacrament, sermon, RE/minors, testimony, or contributor-uncertain media appears reusable without documented review.
- AI suggestions appear to approve rights, people/minors, doctrine, sensitivity, or reuse.

Use the in-app Report issue button in Task Mode. Include your role, route/page, task, device, expected behavior, actual behavior, severity, and screenshot/link when safe.

Thank you for helping us test whether the safest path is also the easiest path.

## Role Expectations

Viewer:

- Search and inspect media using TJC terms and ministry context.
- Decide whether the asset clearly says if it is portal-ready, context-safe, archive-only, or blocked.
- Confirm unsafe downloads stay blocked and approved-copy language does not imply original/master access.
- Report trust copy, search recovery, metrics, or package language that feels like permission truth.

Contributor:

- Test Upload/intake with harmless sample files only.
- Confirm upload never claims publish, approval, or broad reuse.
- Confirm source, event, people/minors, rights, consent/restrictions, and reviewer-note prompts make sense.
- Inspect collections/packages as draft/reference workflows only.
- Do not upload real church media, youth media, sensitive media, copyrighted third-party files, source files, or masters.

Reviewer:

- Test review queues, evidence requirements, and pending-write honesty.
- Confirm approval without evidence and note stays blocked.
- Confirm a completed beta decision says queued/synced/blocked honestly.
- Confirm doctrine/sacrament, hymn/music, RE/minors, testimony/pastoral, lifecycle, approved-copy, and package blockers route to review instead of bypassing review.
- Do not treat portal queueing as ResourceSpace truth.

DAM Admin:

- Inspect Admin readiness, blockers, integration states, and Feedback Inbox.
- Confirm source custody details stay hidden from Viewer/Contributor roles.
- Confirm metrics/readiness/audit/package summaries are diagnostic and do not claim production analytics, durable sharing, durable audit storage, SSO, or live ResourceSpace writeback.
- Triage reports and export agent-ready JSON after the test.
- Keep launch claims conservative.

## Test Tasks

Run only the tasks for your role unless the coordinator asks you to help with another role.

Viewer tasks:

1. Open your Viewer link.
2. Search `Bible`, open one asset, and decide whether the page clearly says if you can use it.
3. Search `scripture`, then `Bible`; confirm both lead to useful results or useful recovery guidance.
4. Search `Sabbath Service`, `Religious Education`, `RE`, `Hymns of Praise`, `baptism`, `Holy Communion`, `testimony`, and `children`.
5. Confirm doctrine/sacrament, hymn/music, RE/minors, testimony, and archive-only results do not look stock-safe without reviewer evidence.
6. Open a Needs Review or blocked asset and try the download path; confirm it blocks or explains the gate.
7. Open Insights and common use-case cards; confirm routes lead to useful searches and metrics read as diagnostics, not approval.
8. On one mobile pass around 390 px, check nav, Guide, Task Mode, feedback button, and text fit.

Contributor tasks:

1. Open your Contributor link.
2. Walk through Upload using harmless sample files or safe dummy details only.
3. Confirm the default state is `Needs Review / Do Not Publish`.
4. Confirm no screen says upload publishes, approves, or clears public use.
5. Inspect Collections and Package Builder.
6. Confirm ResourceSpace references are clear, every package item still needs item-level clearance, and originals/masters are not copied or exposed.
7. Report any copy that makes collection, package, saved view, or Brand Hub membership feel like permission.

Reviewer tasks:

1. Open your Reviewer link.
2. Switch review queue tabs and change rows per page.
3. Try to approve a review item without evidence and note; confirm it stays blocked.
4. Complete evidence and note, queue a decision, and confirm the result is honest about queued/synced/blocked status.
5. Check that TJC-specific risks are visible where relevant: doctrine/sacrament review, hymn rights/channel clearance, minors/RE consent, testimony/pastoral sensitivity, reuse tier, and master/derivative separation.
6. Confirm `Approved Public` alone does not become `Portal Ready`.
7. Report any path that makes AI, package membership, collection membership, saved views, metrics, or raw approval look like final rights clearance.

DAM Admin tasks:

1. Open your DAM Admin link.
2. Inspect Admin modules and confirm each module heading/content changes.
3. Check launch blockers: production SSO, live ResourceSpace writeback, durable storage, durable analytics/audit/package sharing, S3 derivative delivery, seed safety, rights review, doctrine/sacrament review, hymn rights/channel clearance, minors/RE consent, testimony sensitivity, and master/derivative governance.
4. Open Feedback Inbox, classify at least one test report, and export agent-ready JSON if reports exist.
5. Confirm Admin readiness does not overclaim production launch, public downloads, live writeback, or broad archive approval.

## Feedback Questions

Answer these after the test, using the in-app Report issue button when possible:

1. Could you tell within 60 seconds whether a found asset was stock-safe, context-safe, archive-only, or blocked?
2. Did the blocked download feel clear and trustworthy, or did it feel broken?
3. Which words were confusing: Approved Public, Portal Ready, Needs Review, queued, stock-safe, context-safe, archive-only, derivative, original/master?
4. As a Viewer, did you know what to do next when an asset was not downloadable?
5. As a Contributor, did Upload make it clear that test submissions do not publish?
6. As a Reviewer, did the evidence checklist match real TJC risks?
7. As a DAM Admin, did the command center make launch blockers obvious?
8. Did anything expose too much private source, path, people, youth, testimony, hymn-rights, consent, checksum, or source-custody information?
9. Did search feel TJC-native for terms like Sabbath Service, Religious Education/RE, Evangelical Service, Hymns of Praise, baptism, Holy Communion, Holy Spirit, testimony, children/youth, and archive-only?
10. What one thing must be fixed before inviting another internal tester batch?
11. Did anything make the beta look more production-ready than it is?

Severity labels:

- P0: security, privacy, source-truth, writeback honesty, unsafe download, source custody exposure, minors/RE exposure, hymn/sacrament/testimony misuse.
- P1: workflow blocked, broken route, missing TJC-native recovery guidance, or evidence gate failure.
- P2: confusing UX that slows the mission.
- P3: visual polish, wording, or preference.

## Stop-Test Policy

Stop the test batch for any P0.

P0 examples:

- Viewer downloads a blocked, Needs Review, Possible Minors, archive-only, or Do Not Use asset.
- UI says ResourceSpace was updated when the decision only queued locally.
- Raw `Approved Public` appears to mean public reuse without portal readiness.
- Hymn 470-525, worship, sacrament, sermon, music, RE/minors, testimony, or contributor-uncertain media can be reused without documented review.
- A testimony or pastoral/private item is shown as stock-safe without sensitivity review.
- Original/master paths, private URLs, checksums, or source custody leak to Viewer or Contributor.
- Beta role switching is presented as production authentication.
- AI suggestions are presented as rights, people/minors, doctrine, sensitivity, or public-use approval.

Stop-test response:

1. Stop active testing and do not invite the next batch.
2. Capture role, route, asset id, expected behavior, actual behavior, and screenshot only when safe.
3. Mark the report P0 in Feedback Inbox.
4. Notify the stop-test incident lead and relevant owner.
5. Do not delete, rename, move, or mutate source media.
6. Keep ResourceSpace writeback disabled/queued during triage.
7. Resume only after incident lead records a no-resume or resume decision.

## What Not To Claim

Do not claim:

- Production SSO is live.
- This is production-ready.
- This is a public launch.
- This is a generic stock library.
- Any visible seed media is reusable or downloadable.
- Raw `Approved Public` means stock-safe or Portal Ready.
- ResourceSpace writeback is live.
- Queued means synced.
- Google Shared Drive or ResourceSpace has been replaced.
- The portal owns the archive.
- Original/master access is available to normal roles.
- Package, collection, or Brand Hub membership grants permission.
- AI approved rights, people/minors, doctrine, sensitivity, or reuse.
- Full archive launch means every file is approved.

Use these claims instead:

- This is a church-internal beta, not a production launch.
- This is a TJC-only church media library, not a generic stock bucket.
- Google Shared Drive remains the master-original warehouse.
- ResourceSpace remains the source of truth for DAM search and review.
- The portal is the role-aware workbench.
- Found does not mean approved.
- The default is Needs Review / Do Not Publish.
- Blocked download is a feature, not a bug.
- Current beta is preview-only workflow testing until rights reviewers approve reusable seed media.
- Stock-safe, context-safe, and archive-only are different reuse states.
- Doctrine/sacrament review, hymn rights/channel clearance, minors/RE consent, testimony sensitivity, and master/derivative separation must stay visible.

## Pre-Send Checklist

Before sending:

- [ ] Signoff packets reviewed: seed/media, hosted access/env, and feedback/incident runbook.
- [ ] Seed/media safety owner, timestamp, and decision filled.
- [ ] Access/private URL owner, timestamp, and decision filled.
- [ ] Hosted writeback env owner, timestamp, and decision filled.
- [ ] Feedback triage owner, backup, timestamp, and decision filled.
- [ ] Stop-test incident lead, timestamp, and decision filled.
- [ ] Invite list limited to named internal testers.
- [ ] Stable URL only; no Vercel preview URL.
- [ ] Role assignment chosen for each tester.
- [ ] Testers told not to forward links.
- [ ] Testers told not to upload real or sensitive media.
- [ ] Testers told current seed has zero portal-ready/downloadable assets.
- [ ] P0 stop-test rule included in message.
- [ ] Admin Feedback Inbox owner ready during test window.
- [ ] No claim of production launch, public publishing, live writeback, production SSO, or approved downloads.

After testing:

- [ ] Feedback triager reviews all reports.
- [ ] P0 reports stop the batch.
- [ ] P1 reports are fixed or documented before next batch.
- [ ] P2/P3 reports are batched for cleanup.
- [ ] DAM Admin exports agent-ready JSON.
- [ ] Owner posts next-batch GO/NO-GO with evidence.
