# Team Beta Demo Strategy

June 15 safety update: this remains a demo strategy only, not send approval. Current teammate invite posture is NO-GO until hosted protection, canonical deployment, ResourceSpace scope, Google Drive custody, durable hosted state, and renewed tester approval are proven. Hosted Reviewer/Admin access must come from trusted beta session or trusted SSO role identity, not URL query params.

## PM Verdict

Run a tiny internal Team Beta demo, not a production launch. The sharp wedge is: **church teams can find, trust, request, and review media without exposing unsafe originals or pretending unfinished infrastructure is live.**

This is already a credible beachhead because TJC does not need another pretty folder. It needs a trust layer between scattered church media and everyday ministry work: search, reuse guidance, review evidence, blocked unsafe downloads, and a clear admin gate.

## Demo Narrative

Open with the pain: church media exists, but staff and volunteers hesitate because they do not know what can be used, where it came from, who approved it, whether children or sensitive worship moments are present, or whether downloading will bypass the archive process.

Then show the product answer: TJC Stock Media is the internal operating layer over ResourceSpace and Shared Drive. It does not move or mutate source media. It turns raw archive uncertainty into role-specific decisions:

- Viewers get a clear answer: ready to use, internal only, or ask the media team.
- Contributors can send media without accidentally publishing it.
- Reviewers convert uncertain records into evidence-backed decisions.
- DAM Admin sees beta invite readiness, integration blockers, audit proof, and next actions.

Founder-grade one-liner: **"We are not launching a public media product. We are proving the first trusted workflow that lets TJC reuse church media safely."**

## Smallest 10/10 Demo

Keep the demo to five surfaces:

1. `/` via `EnterpriseLibraryPage`: search `Bible`, show DAM Mission Control, Portal Ready supply, review debt, metadata readiness, and recommended next action.
2. `/assets/[id]` via `EnterpriseAssetDetailPage`: open one ready asset and one blocked/review-required asset; show trust proof, blockers, and backend-gated approved-copy action.
3. `/upload` after trusted Contributor session/SSO via `UploadPage`: show that contributor intake captures rights/people/source context and always lands as Needs Review / Do Not Publish.
4. `/review` after trusted Reviewer session/SSO via `EnterpriseReviewPage`: try approval without evidence, show evidence lock, complete checklist/note, and queue pending-write truth.
5. `/admin` after trusted DAM Admin session/SSO via `EnterpriseAdminPage`: show Beta Command Center, invite blockers, integration status, audit evidence, and feedback export path.

Optional 60-second proof if time remains: `/packages` or `/brand-hub` to show package/kit readiness blocks unsafe delivery. Do not let this become the main story.

## Primary User Jobs

- Viewer: "Find a church media asset I can safely use in under 60 seconds, and know why it is allowed or blocked."
- Contributor: "Send new media with enough source, people, rights, and usage context for reviewers, without publishing it."
- Reviewer: "Decide whether media can be public/internal/restricted using evidence, and prevent weak approvals."
- DAM Admin: "Know whether the beta is safe to invite teammates into, what remains blocked, and what agents should fix next."

## Must-Show Moments

1. **Search becomes operational confidence.** Library Mission Control translates result counts into ready supply, review debt, metadata health, and next actions.
2. **Trust is visible on the asset record.** The detail page answers use scope, approval state, reviewer/date evidence, blockers, and download/request action.
3. **Unsafe originals stay hidden.** Viewer payloads and UI avoid source paths, originals, checksums, private URLs, and ResourceSpace admin details.
4. **Approval is earned, not clicked.** Reviewer approval without checklist/note blocks; completed evidence creates honest queued/pending-sync state.
5. **Admin gate prevents overclaiming.** Beta Command Center shows code gates, invite blockers, ResourceSpace writeback mode, delivery status, audit events, and feedback triage.

## Do-Not-Show Areas

1. Do not claim production SSO or real identity ownership. Role switching is simulated beta QA.
2. Do not claim live ResourceSpace writeback unless explicit live-mode proof exists. Queued means queued.
3. Do not show source originals, master paths, checksums, private storage URLs, or full archive custody paths to normal roles.
4. Do not demo public publishing, public links, ZIP/package export, or signed S3 delivery as finished.
5. Do not imply AI or incomplete metadata can approve rights, children/minors, sacrament, testimony, hymn, or sensitive worship media.

## Wow But Safe Acceptance

- Viewer finds a plausible `Bible` asset and understands use state in under 60 seconds.
- Viewer cannot download unsafe or non-portal-ready media.
- Detail page makes one blocked asset feel useful because the next action is clear.
- Contributor intake clearly says new media never publishes from upload.
- Reviewer approval blocks when evidence is incomplete and queues honestly when evidence is complete.
- DAM Admin can name invite blockers and next owners without opening docs.
- Demo copy says beta, simulated role switch, read-only/queued writeback, and restricted originals clearly.
- No demo path exposes sensitive seed media, youth-identifiable media, copyrighted media, private source paths, originals, checksums, or credentials.
- Package/Brand/Collection surfaces, if shown, reinforce item-level policy instead of bypassing it.
- Feedback capture and export are visible so beta learning turns into agent-ready work.

## Learning Plan

The beta should answer four questions fast:

- Can non-technical teammates find a safe reusable asset without staff explanation?
- Do blocked states build trust or create confusion?
- Do reviewers understand evidence requirements and queued ResourceSpace truth?
- Does the Admin view give Hali enough signal to decide next assignments?

Use the first batch for 3-5 internal testers only. Stop immediately for any privacy/source-truth/unsafe-download/writeback-honesty issue.

## Post-Beta Backlog Ranked By Risk And Value

| Rank | Item | Risk if delayed | Value | Why next |
|---:|---|---|---|---|
| 1 | Production identity provider and role map | Critical | High | Removes beta role spoofing and defines real access boundaries. |
| 2 | Short-lived download gate ticket | Critical | High | Prevents direct approved-copy access from bypassing terms, actor, reason, and audit. |
| 3 | Beta seed scrub and reviewer roster | Critical | High | Makes internal testing safe around children, worship, sacrament, copyright, and privacy. |
| 4 | ResourceSpace field-map verifier | High | High | Stops fake approval/writeback confidence by proving exact field refs and coverage. |
| 5 | Durable audit, feedback, package, saved-search, and pending-write storage | High | High | Converts beta-local evidence into accountable internal operations. |
| 6 | Conditional review evidence for doctrine, hymn, minors, consent, and sensitive context | High | High | Turns TJC-specific safety policy into enforced reviewer workflow. |
| 7 | Staging ResourceSpace writeback smoke and reconciliation | High | Medium | Lets queued decisions become trusted sync only when field map and credentials prove it. |
| 8 | Signed approved-copy derivative delivery decision and implementation | Medium | High | Enables real delivery without exposing originals or private storage. |
| 9 | Clean-host backup/restore proof | High | Medium | Required before production internal launch; proves the system can survive failure. |
| 10 | Archive custody and duplicate provenance workbench | Medium | Medium | Important for full archive operations, but not needed to prove the beachhead. |

## Coordinator Next Assignments

- Demo owner: rehearse the five-surface narrative with one approved and one blocked asset.
- Rights/media reviewer: approve the beta seed set or remove risky media before invites.
- Engineering safety owner: verify hosted writeback mode, direct download blocking, source redaction, and browser QA remain green.
- Admin/workflow owner: prepare first-batch tester list, private URL policy, P0 stop rule, and feedback triage cadence.
- Product owner: after beta, rank tester feedback against the backlog above; do not add broad DAM features until the trust workflow proves demand.
