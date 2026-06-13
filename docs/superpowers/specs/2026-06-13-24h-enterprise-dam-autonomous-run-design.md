# 24h Enterprise DAM Autonomous Run Design

Date: 2026-06-13
Project: TJC Stock Media
Branch observed: `premium-ui/tjc-enterprise-dam-workbench`
Design approval: user approved defaults in chat on 2026-06-13.

## Purpose

Run one 24-hour autonomous Codex swarm that makes TJC Stock Media feel closer to
a premium enterprise DAM without weakening existing safety rules.

The run should improve enterprise depth, operator confidence, and product
finish. It must not mutate source media, deploy production, broaden beta access,
fake live ResourceSpace writeback, or make local/demo storage look
production-grade.

## Scope Call

This is a large autonomous coding run. It needs one orchestrator and several
focused worker threads, with isolated branches, staged QA gates, and a final
handoff. It is too broad for a single ad hoc coding session.

Default path:

1. Keep this design as the approved spec.
2. Convert it into an implementation plan with `writing-plans`.
3. If autonomous execution is launched, run PRD/Ralph style orchestration around
   the worker prompts below.

## Approaches Considered

### Recommended: Beta-Safe Enterprise Maturity Run

Make the product more enterprise-grade by deepening metadata governance, trust
aware search, review evidence, audit/analytics, derivative/package governance,
and premium UX evidence.

Pros:
- Matches current repo posture and gap map.
- Preserves ResourceSpace and Google Shared Drive truth boundaries.
- Produces visible product improvement plus stronger safety evidence.
- Fits 24 hours with parallel threads.

Cons:
- Does not solve production SSO, durable enterprise audit, or live writeback.
- Requires disciplined integration because several lanes touch shared UI/API
  surfaces.

### Alternative: Broad Premium UI Redesign

Spend most of the run on visual polish and interface expansion.

Pros:
- Most visible to stakeholders.
- Can make the app feel more expensive quickly.

Cons:
- Current docs say safety, clarity, recoverability, and honesty matter more than
  more screens.
- High risk of churn, regressions, and source-truth overclaiming.

### Alternative: Production Infrastructure Push

Focus on SSO, durable storage, ResourceSpace writeback, signed delivery, backup,
and hosted proof.

Pros:
- Moves toward real production.

Cons:
- Needs external account and infrastructure decisions.
- Risky for an autonomous no-ask run.
- Can create fake confidence if proofs are incomplete.

## Design Decision

Use the recommended beta-safe enterprise maturity run.

The run improves enterprise DAM behavior inside the existing local/codebase
boundary. It leaves production blockers visible, not hidden.

## Non-Negotiable Guardrails

- Do not delete, rename, move, or mutate source media.
- Do not commit church media files.
- Do not deploy, publish, force push, or change external accounts.
- Do not enable live ResourceSpace writeback unless existing local test config
  already supports it safely.
- Do not claim production SSO, durable compliance audit, signed S3 delivery, or
  clean-host restore are complete unless executable proof exists.
- Do not weaken RBAC, private-source redaction, download gates, or review
  evidence locks.
- Do not stage unrelated dirty files.
- Do not merge to `main` autonomously.

## Thread Topology

One orchestrator plus five worker threads.

### Orchestrator: 24h Enterprise DAM Run Captain

Responsibilities:
- Create and maintain the run ledger.
- Launch workers on clean worktrees from the current accepted base branch.
- Keep hourly status.
- Enforce guardrails and branch hygiene.
- Pull worker summaries, inspect diffs, run integration QA, and prepare final
  handoff.
- Prefer narrow integration over broad merges.
- Stop any worker that touches source media, production deployment, credentials,
  or unrelated dirty files.

Branch:
- `codex/24h-enterprise-dam-orchestrator`

Run ledger:
- `docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md`

### Worker 1: Metadata Schema And Taxonomy Console

Goal:
Make Admin metadata governance feel enterprise-grade.

Likely files:
- `frontend/lib/enterprise-metadata.ts`
- `frontend/lib/resourcespace-schema.ts`
- `frontend/lib/taxonomy.ts`
- `frontend/components/dam/enterprise/AdminPage.tsx`
- `docs/metadata-schema.md`
- `docs/tagging-taxonomy-policy.md`

Deliverables:
- Durable schema display for field key, controlled values, required flag, role
  visibility, clearance effect, and intake requirement.
- Taxonomy health summary: canonical terms, aliases, deprecated terms, forbidden
  terms, sensitive/ministry mappings, and owner notes.
- Tests or guards proving Viewer/Contributor do not see private schema/source
  internals.

Branch:
- `codex/24h-metadata-taxonomy-console`

### Worker 2: Review Evidence And Sensitive Ministry Workflow

Goal:
Make rights review feel like a serious governance workbench.

Likely files:
- `frontend/lib/review-evidence.ts`
- `frontend/lib/review-action-workflow.ts`
- `frontend/lib/workflow-policy.ts`
- `frontend/components/dam/enterprise/ReviewPage.tsx`
- `frontend/app/api/review/route.ts`
- `docs/rights-workflow.md`

Deliverables:
- Sensitive ministry model surfaced in review: children/youth, sacrament,
  worship, music/teaching, testimony/private moments, and re-review required.
- Review queue grouping by risk, missing evidence, stale review, derivative gap,
  and pending write.
- Clear disabled reasons for approval actions.
- Tests proving approve/public decisions remain locked when required evidence is
  missing.

Branch:
- `codex/24h-review-rights-workflow`

### Worker 3: Trust-Aware Search And Discovery

Goal:
Make Library search feel more intelligent without paid AI or unsafe semantic
indexing.

Likely files:
- `frontend/lib/catalog-discovery.ts`
- `frontend/lib/catalog-search-request.ts`
- `frontend/lib/catalog-summaries.ts`
- `frontend/lib/usage-analytics.ts`
- `frontend/components/dam/enterprise/LibraryPage.tsx`
- `frontend/app/api/assets/search/route.ts`

Deliverables:
- Query intent presets for website hero, slide background, newsletter, social,
  no people, youth review, worship, music, and internal-only.
- Discovery packet with expanded terms, suggested filters, zero-result recovery,
  and ranking explanation.
- Search analytics events for query, zero-result, filter click, asset open, and
  blocked download intent, with actor identity where available.
- Tests proving discovery never turns suggestions into permission truth.

Branch:
- `codex/24h-trust-aware-discovery`

### Worker 4: Delivery, Packages, Brand Governance, And Original Requests

Goal:
Make distribution workflows enterprise-safe and premium without leaking masters.

Likely files:
- `frontend/lib/media-delivery.ts`
- `frontend/lib/derivative-index.ts`
- `frontend/lib/download-tickets.ts`
- `frontend/lib/package-governance.ts`
- `frontend/lib/brand-kit-governance.ts`
- `frontend/components/dam/enterprise/PackageBuilderPage.tsx`
- `frontend/app/api/download/[id]/route.ts`
- `frontend/app/api/packages/route.ts`
- `frontend/app/api/brand-kits/[id]/route.ts`

Deliverables:
- Clear derivative/readiness manifest view: thumbnail, preview, approved web
  copy, approved print copy, original restricted.
- Package health panel that blocks publish/share/download unless every item is
  portal-ready for the chosen use.
- Brand Hub or brand kit route keeps disabled/hidden beta behavior honest while
  exposing governance readiness where role-appropriate.
- Original access request flow remains a request object/email draft, not Drive
  membership or master-path exposure.
- Tests or smokes covering download ticket, package, delivery privacy, and
  storage honesty.

Branch:
- `codex/24h-delivery-package-governance`

### Worker 5: Premium UX Polish And Browser QA

Goal:
Make the app feel more premium, dense, calm, and finished across core roles.

Likely files:
- `frontend/app/dam-enterprise.css`
- `frontend/components/dam/enterprise/*`
- `frontend/components/dam/shell/*`
- `frontend/components/CommandPalette.tsx`
- `frontend/components/StatusBadge.tsx`
- `scripts/portal-browser-qa.mjs`

Deliverables:
- Tighten empty states, badges, native selects, command header, mobile 320/390,
  and admin/review/library density.
- Preserve current enterprise DAM visual direction: calm, operational,
  role-aware, no marketing hero, no fake production confidence.
- Add browser QA assertions or screenshots where useful.
- Run visual QA on Library, Review, Asset Detail, Admin, Packages, Collections,
  Upload, Guide, and Insights.

Branch:
- `codex/24h-premium-ux-browser-qa`

## Data Flow

Worker changes must keep the same core flow:

```text
Google Shared Drive master originals
  -> manual/import evidence
  -> ResourceSpace DAM records and metadata
  -> Next.js server routes
  -> role-safe portal UI
  -> local sidecars only for beta drafts, pending writes, tickets, feedback,
     audit, and usage events
```

Portal decisions must continue to be computed from source truth, reviewer/date,
rights, people/minors, usage scope, derivative availability, sensitivity, and
role.

Sidecar state can support beta workflows. It cannot become ResourceSpace truth.

## 24-Hour Schedule

### Hour 0.0-0.5: Orchestrator Boot

- Run preflight.
- Confirm branch, dirty state, and current test commands.
- Create run ledger.
- Record guardrails and stop conditions.
- Launch five worker threads with clean worktrees from the accepted base branch.

### Hour 0.5-1.5: Worker Recon

- Each worker reads relevant docs and files.
- Each worker writes a 10-line implementation plan in its first status.
- Orchestrator checks for overlap and assigns ownership boundaries.

### Hour 1.5-5.0: Slice 1 Implementation

- Workers implement low-risk shared modules and tests first.
- Avoid broad UI edits until policy modules compile.
- Orchestrator polls every hour and stops drift.

### Hour 5.0-6.0: QA Gate 1

Each worker runs at minimum:

```bash
git diff --check
npm --prefix frontend run typecheck
```

Workers touching tests run focused tests. Workers touching UI run at least one
targeted browser or smoke check if practical.

### Hour 6.0-10.0: Slice 2 Integration UI

- Wire new modules into role-safe UI/API surfaces.
- Add disabled reasons, readiness panels, table/card polish, and concise copy.
- Keep user-facing copy honest about beta vs production.

### Hour 10.0-11.0: QA Gate 2

Workers run:

```bash
npm --prefix frontend test
npm --prefix frontend run build
```

If build is expensive, orchestrator can run full build centrally while workers
run focused checks.

### Hour 11.0-15.0: Slice 3 Enterprise Depth

- Add secondary enhancements only after core acceptance passes.
- Metadata worker adds schema/taxonomy health.
- Review worker adds risk grouping and disabled reasons.
- Search worker adds zero-result recovery and analytics.
- Delivery worker adds derivative/package/original-request readiness.
- UX worker tightens density and mobile polish.

### Hour 15.0-17.0: Orchestrator Integration

- Orchestrator reads worker summaries and diffs.
- Integrate in this order:
  1. Metadata/taxonomy
  2. Review/evidence
  3. Search/discovery
  4. Delivery/packages
  5. UX/browser QA
- Resolve conflicts by keeping source-truth, RBAC, and safety modules stable.
- Defer conflicted nice-to-have polish instead of forcing risky merges.

### Hour 17.0-19.0: Full Local Validation

Run as much of the required suite as time allows:

```bash
git diff --check
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
node scripts/private-source-guard.mjs
node scripts/public-env-guard.mjs
node scripts/api-identity-guard.mjs
node scripts/api-payload-guard.mjs
node scripts/api-audit-guard.mjs
node scripts/storage-honesty-guard.mjs
make launch-readiness
make portal-api-smoke
make portal-download-ticket-smoke
make portal-package-smoke
make portal-saved-search-smoke
make portal-feedback-smoke
make portal-browser-qa
```

Do not run hosted mutating smokes unless explicitly approved by a human.

### Hour 19.0-21.0: Premium Finish Pass

- Fix high-signal UX bugs found by QA.
- Reduce noisy copy.
- Fix overflow at 320/390.
- Ensure status labels are text-plus-color, never color-only.
- Keep Admin/Reviewer density high and Viewer surfaces calm.

### Hour 21.0-22.5: Evidence Packet

Update:
- run ledger
- screenshots/QA manifest if generated
- changed-file summary
- known risks
- deferred work
- exact commands run and results

### Hour 22.5-24.0: Handoff

Final output:
- Integration branch name.
- Worker branch list.
- Commits created.
- Tests passed/failed/not run.
- Screenshots generated.
- Enterprise DAM improvements completed.
- Safety guarantees preserved.
- Recommended PR sequence.
- Any blocked items needing human decision.

## Error Handling

- If a worker hits test failures for more than two hours, it must isolate the
  failing slice, keep passing pieces, and report the blocker.
- If two workers conflict on the same module, orchestrator decides owner and the
  other worker switches to tests/docs/QA.
- If a change risks source media, credentials, deploys, paid services, or public
  publishing, stop and ask.
- If full browser QA fails, fix layout/source-truth regressions before polish.
- If launch-readiness exposes production blockers, document them. Do not hide
  them.
- If integration becomes unsafe, ship worker branches separately with PR order
  rather than one combined branch.

## Acceptance Criteria

The 24-hour run succeeds if it produces:

- One run ledger with hourly status and final evidence.
- At least three merged or PR-ready worker slices that improve enterprise DAM
  maturity.
- No source media mutations.
- No production deploy or external account changes.
- No RBAC, redaction, download, review evidence, or source-truth regression.
- Typecheck and build passing on every included code slice, or explicit
  quarantine of any failing slice.
- Browser QA or targeted screenshot proof for visible UX changes.
- Final handoff with PR order and risks.

Stretch success:

- All five worker lanes integrated.
- Full local suite passes.
- Browser QA passes at 1440, 1280, 1024, 768, 390, and 320 widths.
- Admin readiness shows clearer enterprise proof without hiding production
  blockers.

## Worker Prompt Template

Each worker should start with this shared prefix:

```text
You are one worker in a 24-hour autonomous run for TJC Stock Media.
Follow AGENTS.md. Do not mutate source media. Do not deploy. Do not stage
unrelated dirty files. ResourceSpace remains DAM truth. Google Shared Drive
remains master-original warehouse. Sidecars are beta support only, not source of
truth. Work on a clean branch. Keep scope narrow. Run focused QA. Report status
with changed files, tests, risks, and next step.
```

Then append the worker-specific goal, likely files, deliverables, branch name,
and test expectations from the topology section.

## Orchestrator Prompt

```text
You are the orchestrator for a 24-hour autonomous enterprise DAM maturity run on
/Users/halim4pro/Desktop/MVP/tjc-stock-media.

Goal: coordinate five Codex worker threads to make TJC Stock Media closer to a
premium enterprise DAM while preserving safety, ResourceSpace truth, Shared
Drive custody, RBAC, redaction, blocked unsafe downloads, review evidence locks,
and beta-vs-production honesty.

Use clean worktrees from branch premium-ui/tjc-enterprise-dam-workbench unless a
newer accepted base is explicitly chosen. Do not inherit unrelated dirty files.
Create docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md as the run
ledger. Launch/poll worker threads, keep hourly status, resolve ownership
overlap, integrate only passing slices, and produce a final handoff with PR
sequence and QA evidence. Do not merge to main, force push, deploy, mutate source
media, change credentials, or run hosted mutating smokes.
```

## Default Launch Order

1. Orchestrator.
2. Metadata schema and taxonomy console worker.
3. Review evidence and sensitive ministry workflow worker.
4. Trust-aware search and discovery worker.
5. Delivery/package/brand/original request worker.
6. Premium UX and browser QA worker.

## Review Notes

This run is intentionally "enterprise maturity," not "enterprise production."
It should make the product feel more advanced by increasing trust, governance,
readiness proof, and workflow polish while keeping production blockers visible.
