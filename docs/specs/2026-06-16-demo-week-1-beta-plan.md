# June 16 Demo + Week-1 Controlled Team Beta Plan

Date: 2026-06-15
Status: Approved design for implementation planning
Audience: Core TJC media team demo on Tuesday, 2026-06-16

Approved as: demo + controlled team beta plan.
Not approved as: production launch, public launch, church-wide rollout, paid cloud deployment, or production readiness claim.

## Summary

TJC Stock Media needs a real-feeling DAM demo tomorrow and a controlled team beta this week. The selected approach is a two-lane plan:

1. Use the current local ResourceSpace-backed portal with the existing 181-photo MVP batch as the fallback demo path.
2. Build a hosted ResourceSpace instance on Azure Student credit, connect the hosted portal to it, import a small photo-only sample under 10GB, and use it for team beta if verification passes.

This design keeps the demo credible without risking source media, public exposure, or June cash spend. It treats hosted ResourceSpace as the DAM/search/review source of truth and keeps Google Shared Drive as master-original custody.

This spec outcome is the June 16 demo plus Week-1 controlled team beta plan. Do not call this a production launch, public launch, or church-wide rollout.

## Goals

- Let the core TJC media team see a real DAM workflow on Tuesday, June 16, 2026.
- Show that a team member can search, open, request, upload, review, and understand photo reuse safety.
- Host ResourceSpace in cloud so the portal can view real ResourceSpace photos and previews.
- Keep the first beta photo-only with a couple hundred assets at most.
- Leave visible room for future video and audio intake without importing video or audio now.
- Use Azure Student credit only. Do not create any cash charge in June.

## Non-Goals

- No public church rollout.
- No public launch.
- No production launch.
- No production SSO claim.
- No broad archive migration.
- No video or audio import before this demo/beta.
- No source media rename, move, delete, or mutation.
- No public original/master downloads.
- No live ResourceSpace writeback unless field mapping and smoke proof pass.
- No paid cloud plan or out-of-credit spend in June.

## Selected Approach

Use Approach B: Azure hosted ResourceSpace with local fallback.

### Why This Approach

The team wants to see and use a real hosted DAM, not only a local prototype. Azure Student is active and provides credit without immediate cash spend. A single VM is a better fit than free app platforms because ResourceSpace needs a LAMP-style host, MariaDB/MySQL, PHP extensions, local filestore, and media tooling.

Local ResourceSpace remains the fallback because cloud setup, DNS, imports, previews, API keys, and field mapping can fail close to demo time. The demo should not depend on a brand-new VM being perfect by tomorrow.

### Failover Order

1. Azure Student VM: primary.
2. Oracle Always Free: backup only if Azure blocks setup and Oracle capacity is available.
3. DigitalOcean via GitHub Student Pack: backup only if Azure and Oracle fail and no June charge risk exists.

Oracle is not primary because Always Free capacity can be unavailable and boot volumes are larger than the intended media cap. App platforms such as Render, Railway, Fly.io, and Koyeb are rejected for this pass because persistent storage and server requirements are a poor match for ResourceSpace.

## Architecture

```text
Browser
  -> Hosted TJC Stock Media portal
  -> Server-side ResourceSpace adapter
  -> Hosted ResourceSpace API or export
  -> ResourceSpace metadata, previews, review fields, and filestore
  -> Google Shared Drive master-original custody
```

For Tuesday, the same portal workflows can run against local ResourceSpace if hosted ResourceSpace is not verified.

## Cloud Hosting Design

### Azure Student VM

The VM hosts:

- Ubuntu Linux.
- Apache or equivalent web server.
- PHP runtime and required extensions.
- MariaDB/MySQL.
- ResourceSpace application.
- ResourceSpace filestore and generated derivatives.

The initial sample stays below 10GB of media. The VM disk can be larger if Azure image defaults require it, but imported media must remain bounded. The operator must check Azure credit/billing status before setup and after setup.

### Cost Guard

Implementation must stop before any step that risks a June cash charge.

No Azure paid upgrade, no removed spending limit, no paid June charge. If Azure requires a paid plan, stop and use local demo fallback.

Required checks:

- Confirm Azure Student subscription is active.
- Confirm available credit.
- Confirm no paid plan upgrade is required.
- Confirm Azure spending limit remains in place and has not been removed.
- Confirm VM size and disk choice fit within credit.
- Add a budget or cost alert if Azure permits it for the subscription.
- Record the expected June cost as credit-backed, not card-backed.

If any step requires card spend or non-credit payment, stop and ask Hali.

Do not overwrite `prd.json`. Do not mutate source media.

## ResourceSpace Data Scope

Use the existing MVP photo batch first:

- Photo-only.
- Couple hundred assets at most.
- No video/audio import.
- Preserve filenames and provenance.
- Keep source media untouched.
- Use ResourceSpace as source of truth for metadata, workflow state, review fields, and previews.

Every imported asset must remain safe by default. "Found" must not mean "approved." Collection membership, package membership, saved views, AI suggestions, and raw approval labels must not become permission truth.

## Portal Integration

The hosted portal should read hosted ResourceSpace through server-side configuration only. ResourceSpace API credentials must never be exposed to the browser.

The portal must support:

- Search over hosted ResourceSpace data or exported metadata.
- Asset detail with raw ResourceSpace status and portal reuse state separated.
- Thumbnail and preview derivatives from ResourceSpace.
- Honest no-preview states when derivatives are missing.
- Download gating.
- Upload/intake for Contributor workflow.
- Review workflow for Reviewer.
- Admin readiness and blocker visibility for DAM Admin.

If hosted ResourceSpace read integration is not green before the demo, the portal uses the local ResourceSpace fallback and the demo states hosted setup is in progress.

The beta portal and Admin screen should show this internal limitation text:

```text
Controlled photo-only beta. Not public. No video/audio import yet. Source files remain protected. Approved derivatives only.
```

## Writeback Policy

The long-term target is live ResourceSpace writeback because the team wants a real hosted DAM. Live writeback is disabled until field mapping smoke proves reviewer, review date, usage scope, notes, and review/publish state map correctly. If mapping is not proven, decisions queue as pending writes and the demo says so clearly.

Required mapped fields:

- Review status or publish status.
- Reviewer identity.
- Review date.
- Usage scope.
- Reviewer notes.
- Rights or restrictions field, if the current ResourceSpace configuration has one.

Required behavior:

- Approval without required evidence remains blocked.
- A successful live write must be confirmed by reading ResourceSpace back.
- If live writeback fails, the portal must queue a pending write and clearly say it is not ResourceSpace truth.
- The UI must never claim ResourceSpace updated unless confirmation succeeds.

For the Tuesday demo, queued writeback is acceptable if live mapping is not proven.

## Team Roles

### Viewer

- Search photo library.
- Open asset detail.
- Understand whether a photo is portal-ready, internal-only, review-needed, archive-only, or blocked.
- Try approved and blocked download paths.
- Request review when use is unclear.

### Contributor

- Submit harmless sample/photo intake.
- Add source, event, rights, people/minors, and usage context.
- Confirm upload never publishes or approves.
- Follow large-media guidance for future video/audio.

### Reviewer

- Review a small queue, ideally 25-50 assets first.
- Approve internal or public use only with evidence.
- Hold or block risky media.
- Confirm children/youth, worship/sacrament, music/hymn, testimony/pastoral, and unclear-rights cases stay governed.

### DAM Admin

- Watch Admin readiness, pending writes, feedback, field mapping, and blockers.
- Stop the test on any P0 issue.
- Keep hosted/local/source-of-truth boundaries clear.

## Tuesday Demo Script

Primary story: "The team can do real photo DAM work while safety gates stay visible."

Demo order:

1. Library search: `Bible`, `Plant`, `Fountain`, and `website hero`.
2. Asset detail: show "Can I use this?" and source-truth separation.
3. Download gate: show blocked asset cannot download.
4. Upload: show Contributor intake defaults to review.
5. Review: show evidence checklist, approve/hold behavior, and writeback or pending-write honesty.
6. Admin: show launch honesty, hosted state, blockers, and what remains before wider beta.
7. Close: this week is photo-only, named-role team beta.

If hosted ResourceSpace is green, we show hosted DAM behavior.
If hosted setup is not stable, we show local DAM behavior and explain hosted setup is still in progress.

## Verification

Before the demo, verify:

- Azure credit/no-charge status checked.
- VM reachable if using hosted path.
- ResourceSpace login works.
- Sample import count is known.
- Portal reads the expected ResourceSpace source.
- Search, asset detail, thumbnail/preview, download gate, upload intake, review action, and Admin route smoke checks pass.
- Screenshot fallback exists.
- Current limitations are visible in Admin or demo script.

Before team beta, also verify:

- Hosted portal and hosted ResourceSpace point to the same tested instance.
- ResourceSpace access is protected.
- API credentials are server-side only.
- Live writeback either confirms ResourceSpace updates or stays queued/disabled.
- Feedback and incident stop-test path are ready.
- Named testers and roles are confirmed.

## Stop Conditions

Stop implementation or beta if any of these occur:

- Azure setup requires cash payment in June.
- Blocked media can download.
- Viewer or Contributor sees original/master source paths, private URLs, checksums, or admin-only fields.
- UI says ResourceSpace updated when only portal/local state changed.
- Hosted portal uses fallback/demo data while presenting it as real ResourceSpace.
- ResourceSpace API secrets appear in browser payloads.
- Import or preview generation risks data loss or source media mutation.
- Cloud disk or local disk pressure threatens completion or safety.

## Success Criteria

Tuesday demo succeeds if the core TJC media team believes:

- This can support real photo search/review tasks this week.
- The system is honest about what is approved, blocked, pending, or not production-ready.
- ResourceSpace is the DAM layer and the portal is the safer team workflow layer.
- Google Shared Drive remains master-original custody.
- The next step is a named, controlled, photo-only team beta, not public launch.

Week-1 beta succeeds if:

- Named users can complete Viewer, Contributor, Reviewer, and DAM Admin tasks.
- The team can search and inspect the sample photo library.
- Review decisions are either confirmed in ResourceSpace or clearly queued.
- No unsafe download, private source exposure, or source-truth overclaim occurs.
- Hali can decide the next beta batch from evidence, not impressions.
