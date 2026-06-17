# Team Beta Demo Script

Last updated: 2026-06-16

## June 15 Safety Override

Do not use this script to invite testers or imply hosted beta is ready. Current posture is **NO-GO** per `docs/runs/evidence/2026-06-15/11-friday-readiness-report.md`.

Query role URLs like `?role=Reviewer` are no longer authority. Hosted demo must use trusted beta session/SSO proof when approved. Local QA should use protected trusted-header mode, not query-role spoofing.

Use `BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe` for non-mutating hosted checks. Do not run hosted mutation unless `PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1` and `PORTAL_HOSTED_SMOKE_APPROVED_BY` are set.

## June 16 Internal Demo Readiness

This script is approved for owner-led internal demo or presentation on `http://localhost:4867`.

Say this clearly:

> We have a real internal DAM beta demo: photo-only, governed, source-truth honest, review-first, six-admin scope. Production/public/cloud automation/writeback/video-audio are roadmap gates, not claims today.

If hosted ResourceSpace is green, show hosted DAM behavior. If hosted setup is not stable, show local DAM behavior and say hosted setup is still in progress. The current hosted proof is read-only protection probing only; it does not prove hosted persona access, durable hosted state, live ResourceSpace writeback, or public launch readiness.

Audience: church-internal teammates, reviewers, and ministry operators.

Goal: seven-minute beta walkthrough that proves TJC Stock Media as a TJC-only church media library, not a generic stock-photo bucket, without overclaiming production readiness.

Source notes reviewed: `docs/beta-readiness-command-center.md`, `docs/teammate-test-guide.md`, `docs/teammate-beta-invite-pack.md`, `docs/demo-script.md`, `STAKEHOLDER_DEMO.md`, `TUESDAY_DEMO_SCRIPT.md`, `prd.json`, `tasks/prd-enterprise-tjc-media-library.md`, `docs/screenshots/qa/browser-qa-report.json`, latest QA notes in `docs/runs/final-polish-after-latest-screenshots.md`, and `/Users/halim4pro/Downloads/deep-research-report.md`. A YC one-pager now exists at `docs/yc-internal-dam-one-pager.md`.

## Demo Positioning

This is not a public launch demo. This is a privacy-first, rights-first internal beta for a TJC-only church media library.

Core message:

> TJC Stock Media helps ministry teammates find media, understand whether it is stock-safe, context-safe, or archive-only, request review, and keep ResourceSpace/Google Shared Drive as the source-of-truth system instead of making private or sensitive media easier to misuse.

Proof points to use:

- Google Shared Drive remains the master-original warehouse.
- ResourceSpace remains the DAM/search/review truth.
- The portal is the role-aware workbench for search, doctrine/sacrament review, hymn rights/channel clearance, minors/RE consent, testimony sensitivity, feedback, and readiness.
- Latest June 15 evidence shows isolated local protected smokes and browser QA passing, hosted read-only probes denying/redirecting anonymous query-role attempts, and hosted mutating smokes intentionally blocked without owner approval.
- Latest browser QA covers the DAM route set across desktop, tablet, and mobile widths and must report zero failures, zero warnings, zero console errors, and zero network failures before presentation.
- Current seed supports preview-only workflow testing. It has zero portal-ready/downloadable assets, so downloads should remain blocked unless a reviewer explicitly approves a safe download test later.

Do not imply:

- Production SSO is live.
- ResourceSpace writeback is live.
- Any media is broadly approved for reuse.
- Original/master access is granted by this portal.
- Public launch is ready.
- AI or the app makes final rights, doctrine, minors, or sensitivity decisions.

## Seven-Minute Run Of Show

### 0:00-0:45 Opening Pain

Start on Library as Viewer:

`http://localhost:4867/`

Say:

> Today the problem is not that the church has no media. TJC already has sermons, testimonies, hymns, publications, RE materials, event photos, livestreams, and ministry graphics. The problem is that a teammate can find a useful item and still not know: Is this stock-safe, context-safe, or archive-only? Does it need doctrine/sacrament review? Are hymn rights cleared for this channel? Are minors or RE students visible? Is this testimony pastorally sensitive? Am I looking at a preservation master or an approved derivative?

Say:

> This beta is a safer front door for a TJC-only church media library. It does not replace ResourceSpace or Google Shared Drive. It helps normal ministry teammates search, understand trust, and ask for review without exposing originals or pretending approval happened.

Do not say:

- "This is production-ready."
- "This is our new public media library."
- "Everything visible here is safe to download."
- "This is generic Christian stock."

### 0:45-2:00 Viewer Search And Trust

In Library, search `Bible`. Open one result.

Say:

> The Viewer job is simple: find something useful and decide whether it can be used. Search is ministry-language friendly, but the most important part is the trust layer around the result.

Point to status, use guidance, source redaction, role-safe details, and any "Can I use this?" or blocked state.

Say:

> Notice the product does not treat "found" as "approved." Search helps discovery. Reuse still depends on evidence: rights basis, approved channels, people/minors consent, doctrine/sacrament review, testimony sensitivity, and the difference between preservation masters and safe derivatives.

Say:

> The reuse language should be plain: stock-safe means broad cross-ministry reuse is cleared; context-safe means reuse is limited to the original church, event, series, or approved channel; archive-only means preserve it, but do not treat it as reusable media.

Say:

> For beta, the role switch is simulated so teammates can test workflows. Production access will require real identity or SSO before any wider internal launch.

Do not say:

- "Approved Public always means portal-ready."
- "The portal knows all rights automatically."
- "Viewer can see source folders or originals."

### 2:00-3:00 Block Unsafe Download

On the asset detail page, try the download path or show the blocked download panel.

Say:

> This is the most important demo moment. A normal user should not be able to turn uncertainty into a file download. If an asset is not portal-ready, the app blocks the download and explains the next step.

Say:

> The current beta seed has zero portal-ready downloadable assets. That is intentional for this test: we are proving the workflow and safety gates before we invite broader reuse.

Say:

> This is a rights-first and preservation-first product. Ordinary users should receive approved derivatives, not preservation masters. Masters stay in controlled custody; derivatives carry the approved size, channel, notice, and source relationship.

Do not say:

- "Downloads are ready for all approved assets."
- "This bypasses ResourceSpace."
- "Original access is available here."
- "A derivative can replace the master."

### 3:00-4:30 Reviewer Decision Queue

Switch to Reviewer:

`http://localhost:4867/review`

Open one review item. Try or describe approval without evidence, then show checklist/note requirements and queued decision truth.

Say:

> Reviewers are not rubber-stamping a status label. They are recording evidence: source, rights, people/minors, usage scope, derivative confidence, sensitive context, credit or attribution, expiration or re-review, proof link, and notes.

Say:

> For TJC media, the review questions are native to church work. Doctrine/sacrament review covers baptism, Holy Spirit, footwashing, Holy Communion, Sabbath, prayer-in-the-Spirit, and church identity. Hymn rights/channel clearance covers hymn number, rights basis, territory, approved channel, and required notice. Minors/RE consent covers identifiable children, Religious Education settings, and whether consent or a documented exception exists. Testimony sensitivity covers healing, illness, visions, spiritual battle, family conversion, and other pastoral details that may be context-safe or archive-only, not stock-safe.

Say:

> If evidence is missing, approval stays blocked. If evidence is complete, the beta records a pending write honestly. It does not claim ResourceSpace was updated unless live writeback is configured and verified.

Do not say:

- "The app updates ResourceSpace live today."
- "Reviewers can approve without notes."
- "AI can approve rights."
- "A sacrament or hymn asset can skip specialized review."

### 4:30-5:40 Admin Command Center

Switch to DAM Admin:

`http://localhost:4867/admin`

Show the Admin launch state, integration readiness, feedback inbox, and blockers.

Say:

> This screen is the honesty layer. It tells us what is green for beta and what still blocks production: private access policy, real SSO, ResourceSpace writeback, durable storage, S3 delivery, seed safety, rights-review coverage, doctrine/sacrament review coverage, hymn rights/channel clearance, minors/RE consent, testimony sensitivity, and preservation master/derivative governance.

Say:

> The beta command center has strong local mechanical evidence: protected local smokes pass, unsafe downloads stay blocked, writeback guard stays honest, browser QA has zero failures across desktop, tablet, and mobile widths, and hosted read-only probes do not return privileged JSON.

Say:

> But the answer is still not "send invites." The answer is "finish hosted protection, canonical deploy, ResourceSpace/Drive custody, durable state, and renewed tester approval first."

Do not say:

- "Admin score means we are launched."
- "Warnings are cosmetic."
- "Hosted beta is safe to share broadly."

### 5:40-6:30 Beta Ask

Return to Library or Guide.

Say:

> The beta ask is narrow. We want a few teammates to test whether the product helps them answer three questions: Can I find useful media? Can I tell whether it is stock-safe, context-safe, or archive-only? Do I know what to do when it is not safe?

Say:

> We are not asking teammates to validate every file in the archive. We are not asking for public downloads. We are testing the governed workflow: Viewer search, blocked unsafe download, Reviewer evidence, Admin readiness, and feedback triage.

Say:

> If this works, the next phase is not "open everything." The next phase is production identity, verified ResourceSpace field mapping, durable state, backup/restore proof, and a curated set of reviewer-approved assets with preservation masters kept separate from approved derivatives.

Do not say:

- "We just need users and then we are done."
- "The archive is ready."
- "We can approve the rest later without process."

### 6:30-7:00 Close

Say:

> This product wins if it makes the safest path the easiest path. It should help ministry teams reuse good media faster while protecting doctrine, worship contexts, hymn rights, children, testimonies, private sources, preservation masters, and the church's long-term archive.

Say:

> My request after this demo: tell me where the trust copy is unclear, where you would hesitate, and whether the blocked states make you feel guided or stuck.

## Exact Phrases To Use

- "This is a church-internal beta, not a production launch."
- "This is a TJC-only church media library, not a generic stock bucket."
- "Google Shared Drive remains the master-original warehouse."
- "ResourceSpace remains the source of truth for DAM search and review."
- "The portal is the role-aware workbench."
- "Found does not mean approved."
- "The default is Needs Review / Do Not Publish."
- "Stock-safe means broad cross-ministry reuse is cleared."
- "Context-safe means reuse is limited to the original church, event, series, or approved channel."
- "Archive-only means preserve it, but do not treat it as reusable media."
- "Doctrine/sacrament review is required for TJC-specific worship and teaching media."
- "Hymn rights/channel clearance must include hymn number, rights basis, territory, approved channel, and required notice."
- "Minors/RE consent must be resolved before public use."
- "Testimony sensitivity can make an asset context-safe or archive-only instead of stock-safe."
- "Preservation masters stay protected; ordinary users receive approved derivatives."
- "Blocked download is a feature, not a bug."
- "Queued means queued; it does not mean ResourceSpace has been updated."
- "This beta is preview-only workflow testing until rights reviewers approve reusable seed media."
- "The app should make the safest path the easiest path."

## Exact Phrases To Avoid

- "Production-ready."
- "Public launch."
- "Generic stock library."
- "All approved media can be downloaded."
- "AI approved this."
- "ResourceSpace is synced now."
- "The portal owns the archive."
- "Original access is available."
- "This replaces Google Drive."
- "This is just a gallery."
- "Anyone with the link can use it."
- "Masters and derivatives are interchangeable."

## Questions To Ask Teammates After Demo

Ask these immediately after the walkthrough:

1. Could you tell within 60 seconds whether a found asset was stock-safe, context-safe, or archive-only?
2. Did the blocked download feel clear and trustworthy, or did it feel like the app was broken?
3. Which words were confusing: Approved Public, Portal Ready, Needs Review, queued, stock-safe, context-safe, archive-only, derivative, original/master?
4. As a Viewer, did you know what to do next when an asset was not downloadable?
5. As a Reviewer, did the evidence checklist match the real TJC risks: doctrine/sacrament review, hymn rights/channel clearance, minors/RE consent, testimony sensitivity, and preservation master/derivative separation?
6. As an Admin, did the command center make launch blockers obvious?
7. Did anything expose too much private source, path, people, youth, testimony, hymn-rights, or consent information?
8. What is the smallest safe group we should invite first?
9. What one thing must be fixed before broader internal testing?
10. Did anything make the beta look more production-ready than it really is?

## Presenter Notes

Keep pace tight. The story is not "look how many screens we built." The story is "the product keeps TJC discovery, review, preservation, and reuse honest."

If the app stumbles, fall back to screenshots and the command-center facts. Do not improvise production claims.

If someone asks why downloads are blocked, answer:

> Because current seed data has not completed portal-ready download evidence. For church media, that is the correct failure mode.

If someone asks what success looks like, answer:

> A Viewer finds a candidate asset quickly, understands the trust state, and cannot accidentally misuse it. A Reviewer can record TJC-specific evidence. An Admin can see what still blocks launch.
