# 24h Enterprise DAM Autonomous Run Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launch and coordinate one 24-hour autonomous Codex run that makes TJC Stock Media closer to a premium enterprise DAM while preserving all source-truth and safety rules.

**Architecture:** One orchestrator thread owns timing, branch hygiene, worker status, integration QA, and final handoff. Five worker threads operate on isolated worktrees from `premium-ui/tjc-enterprise-dam-workbench`, each owning one enterprise DAM lane: metadata/taxonomy, review/rights, discovery/search, delivery/packages, and premium UX/QA. Workers produce narrow commits; the orchestrator integrates only passing slices and leaves production blockers visible.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind v4, Vitest, Playwright, ResourceSpace API/export adapters, local JSON/SQLite beta sidecars, shell smoke scripts, Codex thread/worktree tools.

---

## Source Spec

Approved design:

`docs/superpowers/specs/2026-06-13-24h-enterprise-dam-autonomous-run-design.md`

## Branch And Worktree Rules

- Base all worker worktrees on `premium-ui/tjc-enterprise-dam-workbench`.
- Do not inherit unrelated dirty files.
- Do not merge to `main`.
- Do not force push.
- Do not deploy or publish.
- Do not mutate source media.
- Do not commit church media files.
- Stage only files owned by each worker lane.

## Created Or Modified Files

### Orchestrator-Owned

- Create: `docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md`
  - Purpose: hourly run ledger, branch list, status, QA evidence, blocked items, final handoff.
- Modify when evidence exists: `docs/premium-enterprise-ui-backlog.md`
  - Purpose: close or add small P2/P3 polish entries based on real run output.

### Worker 1: Metadata Schema And Taxonomy

- Modify: `frontend/lib/enterprise-metadata.ts`
  - Purpose: durable enterprise field metadata and role-visible schema rows.
- Modify: `frontend/lib/resourcespace-schema.ts`
  - Purpose: ResourceSpace field-map facts and schema readiness helpers.
- Modify: `frontend/lib/taxonomy.ts`
  - Purpose: canonical labels, aliases, deprecated terms, forbidden terms, and ministry-sensitive mappings.
- Modify: `frontend/components/dam/enterprise/AdminPage.tsx`
  - Purpose: Admin schema/taxonomy console.
- Test: `frontend/lib/production-hardening.test.ts`
  - Purpose: verify normal roles do not receive private schema/source details.

### Worker 2: Review Evidence And Sensitive Ministry Workflow

- Modify: `frontend/lib/review-evidence.ts`
  - Purpose: required evidence, missing labels, disabled reasons, sensitive ministry conditions.
- Modify: `frontend/lib/review-action-workflow.ts`
  - Purpose: review action state and lock reasons.
- Modify: `frontend/lib/workflow-policy.ts`
  - Purpose: workflow state/risk mapping.
- Modify: `frontend/components/dam/enterprise/ReviewPage.tsx`
  - Purpose: risk grouping, evidence locks, reviewer next actions.
- Modify: `frontend/app/api/review/route.ts`
  - Purpose: server enforcement remains aligned with UI locks.
- Test: `frontend/lib/review-workbench.test.ts`
  - Purpose: prove approvals fail without required evidence.

### Worker 3: Trust-Aware Search And Discovery

- Modify: `frontend/lib/catalog-discovery.ts`
  - Purpose: deterministic intent expansion, suggested filters, zero-result recovery.
- Modify: `frontend/lib/catalog-search-request.ts`
  - Purpose: request parsing for intent and filters.
- Modify: `frontend/lib/catalog-summaries.ts`
  - Purpose: discovery summaries and ranking explanations.
- Modify: `frontend/lib/usage-analytics.ts`
  - Purpose: query/filter/asset-open/blocked-intent usage events.
- Modify: `frontend/components/dam/enterprise/LibraryPage.tsx`
  - Purpose: visible discovery packet and clickable suggested filters.
- Modify: `frontend/app/api/assets/search/route.ts`
  - Purpose: role-safe search response metadata.
- Test: `frontend/scripts/portal-context-presenters.test.cjs`
  - Purpose: prove public-facing discovery copy stays safe and clear.

### Worker 4: Delivery, Packages, Brand Governance, Original Requests

- Modify: `frontend/lib/media-delivery.ts`
  - Purpose: approved-copy delivery policy and no-master-leak decisions.
- Modify: `frontend/lib/derivative-index.ts`
  - Purpose: derivative/readiness manifest facts.
- Modify: `frontend/lib/download-tickets.ts`
  - Purpose: ticket records and actor-aware audit.
- Modify: `frontend/lib/package-governance.ts`
  - Purpose: package preview/share/publish readiness.
- Modify: `frontend/lib/brand-kit-governance.ts`
  - Purpose: brand kit readiness and blockers.
- Modify: `frontend/components/dam/enterprise/PackageBuilderPage.tsx`
  - Purpose: package health panel and blocked publish/share/download copy.
- Modify: `frontend/app/api/download/[id]/route.ts`
  - Purpose: preserve blocked unsafe downloads and ticket behavior.
- Modify: `frontend/app/api/packages/route.ts`
  - Purpose: recompute governance before save/list.
- Modify: `frontend/app/api/brand-kits/[id]/route.ts`
  - Purpose: role-safe brand readiness packet.
- Test: `frontend/lib/production-hardening.test.ts`
  - Purpose: prove delivery/package/brand flows do not leak private storage or master data.

### Worker 5: Premium UX Polish And Browser QA

- Modify: `frontend/app/dam-enterprise.css`
  - Purpose: dense enterprise polish, selects, badges, empty states, mobile spacing.
- Modify: `frontend/components/dam/enterprise/AdminPage.tsx`
  - Purpose: Admin readiness clarity.
- Modify: `frontend/components/dam/enterprise/AssetDetailPage.tsx`
  - Purpose: trust record hierarchy.
- Modify: `frontend/components/dam/enterprise/LibraryPage.tsx`
  - Purpose: compact search/results polish.
- Modify: `frontend/components/dam/enterprise/ReviewPage.tsx`
  - Purpose: workbench density.
- Modify: `frontend/components/dam/shell/DamCommandHeader.tsx`
  - Purpose: premium command surface.
- Modify: `frontend/components/dam/shell/DamShell.tsx`
  - Purpose: navigation and mobile shell fit.
- Modify: `scripts/portal-browser-qa.mjs`
  - Purpose: screenshot/proof assertions where needed.

---

## Task 1: Orchestrator Boot

**Files:**
- Create: `docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md`

- [ ] **Step 1: Confirm repo state**

Run:

```bash
pwd
git branch --show-current
git status --short
git log --oneline -3
```

Expected:

```text
/Users/halim4pro/Desktop/MVP/tjc-stock-media
premium-ui/tjc-enterprise-dam-workbench
```

Dirty files are allowed only if they are pre-existing. Do not stage them.

- [ ] **Step 2: Create run ledger**

Create `docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md` with:

```markdown
# 24h Enterprise DAM Autonomous Run - 2026-06-13

## Guardrails

- No source media mutation.
- No production deploy.
- No force push.
- No main merge.
- No credential or external account changes.
- No unrelated dirty-file staging.
- ResourceSpace remains DAM truth.
- Google Shared Drive remains master-original custody.
- Sidecars are beta support only.

## Threads

| Role | Thread ID | Branch | Status | Last Check |
|---|---|---|---|---|
| Orchestrator | pending | codex/24h-enterprise-dam-orchestrator | booting | 2026-06-13 |
| Metadata/Taxonomy | pending | codex/24h-metadata-taxonomy-console | pending | 2026-06-13 |
| Review/Rights | pending | codex/24h-review-rights-workflow | pending | 2026-06-13 |
| Discovery/Search | pending | codex/24h-trust-aware-discovery | pending | 2026-06-13 |
| Delivery/Packages | pending | codex/24h-delivery-package-governance | pending | 2026-06-13 |
| Premium UX/QA | pending | codex/24h-premium-ux-browser-qa | pending | 2026-06-13 |

## Hourly Ledger

| Hour | Summary | Commands | Risks | Next |
|---:|---|---|---|---|
| 0 | Booted run. | preflight, git status | none yet | launch workers |

## Final Evidence

- Branches:
- Commits:
- Tests passed:
- Tests failed:
- Tests not run:
- Screenshots:
- Deferred risks:
- PR order:
```

- [ ] **Step 3: Commit ledger**

Run:

```bash
git add docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md
git commit -m "docs: start 24h enterprise DAM run ledger"
```

Expected: commit succeeds with only the run ledger staged.

---

## Task 2: Launch Worker Threads

**Files:**
- Modify: `docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md`

- [ ] **Step 1: Create metadata worker**

Create a Codex project worktree thread from base branch `premium-ui/tjc-enterprise-dam-workbench` with this prompt:

```text
You are Worker 1 in a 24-hour autonomous run for TJC Stock Media.

Branch: create and work on codex/24h-metadata-taxonomy-console.

Goal: make Admin metadata governance feel enterprise-grade while preserving ResourceSpace truth, Shared Drive master custody, RBAC, redaction, and beta honesty.

Read AGENTS.md, README.md, PRODUCT.md, DESIGN.md, docs/superpowers/specs/2026-06-13-24h-enterprise-dam-autonomous-run-design.md, frontend/lib/enterprise-metadata.ts, frontend/lib/resourcespace-schema.ts, frontend/lib/taxonomy.ts, and frontend/components/dam/enterprise/AdminPage.tsx.

Deliver:
- Admin schema/taxonomy console for field key, controlled values, required flag, role visibility, clearance effect, and intake requirement.
- Taxonomy health summary with canonical labels, aliases, deprecated terms, forbidden terms, sensitive/ministry mappings, and owner notes.
- Tests or guards proving Viewer/Contributor do not see private schema/source internals.

Do not mutate source media. Do not deploy. Do not stage unrelated dirty files. Commit narrow changes. Run git diff --check and npm --prefix frontend run typecheck. Report changed files, tests, risks, and next step.
```

- [ ] **Step 2: Create review worker**

Create a Codex project worktree thread from base branch `premium-ui/tjc-enterprise-dam-workbench` with this prompt:

```text
You are Worker 2 in a 24-hour autonomous run for TJC Stock Media.

Branch: create and work on codex/24h-review-rights-workflow.

Goal: make rights review feel like a serious enterprise governance workbench.

Read AGENTS.md, PRODUCT.md, DESIGN.md, docs/rights-workflow.md, docs/superpowers/specs/2026-06-13-24h-enterprise-dam-autonomous-run-design.md, frontend/lib/review-evidence.ts, frontend/lib/review-action-workflow.ts, frontend/lib/workflow-policy.ts, frontend/components/dam/enterprise/ReviewPage.tsx, and frontend/app/api/review/route.ts.

Deliver:
- Sensitive ministry evidence model in review: children/youth, sacrament, worship, music/teaching, testimony/private moments, and re-review required.
- Review queue grouping by risk, missing evidence, stale review, derivative gap, and pending write.
- Clear disabled reasons for approval actions.
- Tests proving approve/public decisions remain locked when evidence is missing.

Do not mutate source media. Do not deploy. Do not stage unrelated dirty files. Commit narrow changes. Run git diff --check, npm --prefix frontend run typecheck, and focused review tests. Report changed files, tests, risks, and next step.
```

- [ ] **Step 3: Create discovery worker**

Create a Codex project worktree thread from base branch `premium-ui/tjc-enterprise-dam-workbench` with this prompt:

```text
You are Worker 3 in a 24-hour autonomous run for TJC Stock Media.

Branch: create and work on codex/24h-trust-aware-discovery.

Goal: make Library search feel intelligent and premium without paid AI, unsafe semantic indexing, or permission overclaiming.

Read AGENTS.md, PRODUCT.md, DESIGN.md, docs/dam-tagging-and-search-plan.md, docs/superpowers/specs/2026-06-13-24h-enterprise-dam-autonomous-run-design.md, frontend/lib/catalog-discovery.ts, frontend/lib/catalog-search-request.ts, frontend/lib/catalog-summaries.ts, frontend/lib/usage-analytics.ts, frontend/components/dam/enterprise/LibraryPage.tsx, and frontend/app/api/assets/search/route.ts.

Deliver:
- Query intent presets for website hero, slide background, newsletter, social, no people, youth review, worship, music, and internal-only.
- Discovery packet with expanded terms, suggested filters, zero-result recovery, and ranking explanation.
- Usage analytics events for query, zero-result, filter click, asset open, and blocked download intent with actor identity where available.
- Tests proving discovery suggestions never become permission truth.

Do not mutate source media. Do not deploy. Do not stage unrelated dirty files. Commit narrow changes. Run git diff --check, npm --prefix frontend run typecheck, and a search/API smoke if practical. Report changed files, tests, risks, and next step.
```

- [ ] **Step 4: Create delivery worker**

Create a Codex project worktree thread from base branch `premium-ui/tjc-enterprise-dam-workbench` with this prompt:

```text
You are Worker 4 in a 24-hour autonomous run for TJC Stock Media.

Branch: create and work on codex/24h-delivery-package-governance.

Goal: make delivery, packages, brand readiness, and original requests enterprise-safe without leaking masters or faking production delivery.

Read AGENTS.md, PRODUCT.md, DESIGN.md, docs/large-media-policy.md, docs/superpowers/specs/2026-06-13-24h-enterprise-dam-autonomous-run-design.md, frontend/lib/media-delivery.ts, frontend/lib/derivative-index.ts, frontend/lib/download-tickets.ts, frontend/lib/package-governance.ts, frontend/lib/brand-kit-governance.ts, frontend/components/dam/enterprise/PackageBuilderPage.tsx, frontend/app/api/download/[id]/route.ts, frontend/app/api/packages/route.ts, and frontend/app/api/brand-kits/[id]/route.ts.

Deliver:
- Derivative/readiness manifest view for thumbnail, preview, approved web copy, approved print copy, and original restricted.
- Package health panel blocking publish/share/download unless every item is portal-ready for the chosen use.
- Role-safe brand readiness packet and honest disabled beta behavior.
- Original access remains a request flow, never a master-path leak or Drive membership shortcut.
- Tests or smokes covering download ticket, package, delivery privacy, and storage honesty.

Do not mutate source media. Do not deploy. Do not stage unrelated dirty files. Commit narrow changes. Run git diff --check, npm --prefix frontend run typecheck, node scripts/storage-honesty-guard.mjs, and package/download smokes if practical. Report changed files, tests, risks, and next step.
```

- [ ] **Step 5: Create premium UX worker**

Create a Codex project worktree thread from base branch `premium-ui/tjc-enterprise-dam-workbench` with this prompt:

```text
You are Worker 5 in a 24-hour autonomous run for TJC Stock Media.

Branch: create and work on codex/24h-premium-ux-browser-qa.

Goal: make the app feel more premium, dense, calm, and finished across core roles while preserving safety and beta honesty.

Read AGENTS.md, PRODUCT.md, DESIGN.md, docs/premium-enterprise-ui-backlog.md, docs/superpowers/specs/2026-06-13-24h-enterprise-dam-autonomous-run-design.md, frontend/app/dam-enterprise.css, frontend/components/dam/enterprise/AdminPage.tsx, frontend/components/dam/enterprise/AssetDetailPage.tsx, frontend/components/dam/enterprise/LibraryPage.tsx, frontend/components/dam/enterprise/ReviewPage.tsx, frontend/components/dam/shell/DamCommandHeader.tsx, frontend/components/dam/shell/DamShell.tsx, and scripts/portal-browser-qa.mjs.

Deliver:
- Better empty states, badge density, native select polish, command header, mobile 320/390 fit, and Admin/Review/Library density.
- No marketing hero, fake production confidence, fake media, or source-truth overclaiming.
- Browser QA assertions or screenshot proof where useful.

Do not mutate source media. Do not deploy. Do not stage unrelated dirty files. Commit narrow changes. Run git diff --check, npm --prefix frontend run typecheck, npm --prefix frontend run build if practical, and targeted browser QA. Report changed files, tests, risks, and next step.
```

- [ ] **Step 6: Update ledger with thread IDs**

Edit the run ledger thread table so every worker row has its Codex thread ID.

Run:

```bash
git add docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md
git commit -m "docs: record 24h enterprise DAM worker threads"
```

Expected: commit succeeds with only the ledger staged.

---

## Task 3: Hourly Orchestration Loop

**Files:**
- Modify: `docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md`

- [ ] **Step 1: Poll every worker**

For each worker thread, read recent status and capture:

```text
thread_id:
branch:
changed_files:
commits:
tests_passed:
tests_failed:
blocked:
next_step:
```

- [ ] **Step 2: Send steering message when overlap appears**

Use this exact steering pattern:

```text
Scope adjustment: another worker owns that shared surface. Keep your changes in your lane, preserve RBAC/source-truth/download gates, and switch to focused tests/docs around your feature if the UI/API integration would conflict.
```

- [ ] **Step 3: Update hourly ledger**

Append one row:

```markdown
| HOUR_NUMBER | STATUS_SUMMARY | COMMANDS_OR_CHECKS | RISKS | NEXT_STEP |
```

- [ ] **Step 4: Commit ledger update every 4 hours**

Run:

```bash
git add docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md
git commit -m "docs: update 24h enterprise DAM run ledger"
```

Expected: commit succeeds unless no ledger changes exist.

---

## Task 4: QA Gate 1 At Hour 5

**Files:**
- Modify: `docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md`

- [ ] **Step 1: Require baseline checks from workers**

Each worker must report:

```bash
git diff --check
npm --prefix frontend run typecheck
```

Expected:

```text
No whitespace errors.
Typecheck passes.
```

- [ ] **Step 2: Quarantine failing slices**

Use this message for a failing worker:

```text
QA gate failed. Keep passing commits intact, isolate the failing slice, and report the smallest rollback or fix path. Do not expand scope until typecheck is green.
```

- [ ] **Step 3: Record QA gate**

Add to ledger:

```markdown
## QA Gate 1

| Worker | diff check | typecheck | Focused tests | Status |
|---|---|---|---|---|
| Metadata/Taxonomy | pending | pending | pending | pending |
| Review/Rights | pending | pending | pending | pending |
| Discovery/Search | pending | pending | pending | pending |
| Delivery/Packages | pending | pending | pending | pending |
| Premium UX/QA | pending | pending | pending | pending |
```

Replace `pending` with exact pass/fail/not-run values.

---

## Task 5: Integration Prep At Hour 15

**Files:**
- Modify: `docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md`

- [ ] **Step 1: Collect worker diffs**

For each worker branch, record:

```bash
git log --oneline --max-count=5
git diff --stat BASE_BRANCH...WORKER_BRANCH
```

`BASE_BRANCH` is `premium-ui/tjc-enterprise-dam-workbench`.

- [ ] **Step 2: Rank integration order**

Use this order unless a worker is failing:

```text
1. Metadata/taxonomy
2. Review/evidence
3. Search/discovery
4. Delivery/packages
5. UX/browser QA
```

- [ ] **Step 3: Create integration branch**

Run:

```bash
git checkout premium-ui/tjc-enterprise-dam-workbench
git checkout -b codex/24h-enterprise-dam-integration
```

Expected:

```text
Switched to a new branch 'codex/24h-enterprise-dam-integration'
```

- [ ] **Step 4: Integrate only passing slices**

Use non-destructive commands. Prefer cherry-picking worker commits one worker at
a time:

```bash
git cherry-pick COMMIT_SHA
npm --prefix frontend run typecheck
```

Expected after each worker:

```text
Typecheck passes.
```

If conflict risk exceeds 30 minutes, skip that worker and document the PR order.

---

## Task 6: Full Validation At Hour 17

**Files:**
- Modify: `docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md`

- [ ] **Step 1: Run required static checks**

Run:

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
```

Expected: every command exits 0. If a command fails, record exact command and
failure summary.

- [ ] **Step 2: Run local readiness and smoke checks**

Run as time allows:

```bash
make launch-readiness
make portal-api-smoke
make portal-download-ticket-smoke
make portal-package-smoke
make portal-saved-search-smoke
make portal-feedback-smoke
make portal-browser-qa
```

Expected: all run commands exit 0. Commands not run must be listed under
`Tests not run` with reason.

- [ ] **Step 3: Record validation matrix**

Add:

```markdown
## Full Validation

| Command | Result | Notes |
|---|---|---|
| git diff --check | pending |  |
| npm --prefix frontend run typecheck | pending |  |
| npm --prefix frontend test | pending |  |
| npm --prefix frontend run build | pending |  |
| private-source-guard | pending |  |
| public-env-guard | pending |  |
| api-identity-guard | pending |  |
| api-payload-guard | pending |  |
| api-audit-guard | pending |  |
| storage-honesty-guard | pending |  |
| make launch-readiness | pending |  |
| make portal-api-smoke | pending |  |
| make portal-download-ticket-smoke | pending |  |
| make portal-package-smoke | pending |  |
| make portal-saved-search-smoke | pending |  |
| make portal-feedback-smoke | pending |  |
| make portal-browser-qa | pending |  |
```

Replace `pending` with pass/fail/not-run.

---

## Task 7: Premium Finish Pass At Hour 19

**Files:**
- Modify: integration branch files changed by workers.
- Modify: `docs/premium-enterprise-ui-backlog.md` only if backlog facts changed.

- [ ] **Step 1: Fix only QA-backed polish defects**

Allowed polish:

```text
320/390 overflow, clipped buttons, unreadable select, duplicate warning copy,
confusing empty state, badge overcrowding, command header density, broken mobile nav.
```

Blocked polish:

```text
new landing page, fake production badge, fake AI approval, fake media, source-path exposure, new external service, broad redesign.
```

- [ ] **Step 2: Re-run focused checks**

Run:

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run build
make portal-browser-qa
```

Expected: all commands exit 0 for integrated UI changes.

---

## Task 8: Final Handoff At Hour 23

**Files:**
- Modify: `docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md`

- [ ] **Step 1: Write final handoff section**

Append:

```markdown
## Final Handoff

### Branches

| Branch | Purpose | Status |
|---|---|---|

### Enterprise DAM Improvements

- Metadata/taxonomy:
- Review/rights:
- Discovery/search:
- Delivery/packages:
- Premium UX/QA:

### Safety Preserved

- Source media untouched:
- RBAC preserved:
- Private source redaction preserved:
- Unsafe downloads blocked:
- Review evidence locks preserved:
- Beta-vs-production blockers visible:

### QA

- Passed:
- Failed:
- Not run:

### Recommended PR Order

1. Metadata/taxonomy if green.
2. Review/evidence if green.
3. Discovery/search if green.
4. Delivery/packages if green.
5. UX/browser QA if green.
6. Integration branch only if all included slices are green.

### Human Decisions Needed

- Production SSO provider:
- Durable storage adapter:
- Live ResourceSpace writeback staging:
- Signed derivative delivery:
- Clean-host restore owner:
```

- [ ] **Step 2: Commit handoff**

Run:

```bash
git add docs/runs/24h-enterprise-dam-autonomous-run-2026-06-13.md
git commit -m "docs: finish 24h enterprise DAM run handoff"
```

Expected: commit succeeds with ledger only staged unless integration evidence
files are intentionally included.

- [ ] **Step 3: Report to user**

Final report shape:

```text
24h run complete.

Integration branch: BRANCH
Worker branches: LIST
Commits: LIST
QA passed: LIST
QA failed/not run: LIST
Best PR order: LIST
Human decisions: LIST
```

---

## Stop Conditions

Stop and ask before:

- deleting, renaming, moving, or mutating source media
- force pushing
- destructive migrations
- bulk vault edits
- credential or secret changes
- paid services or paid API usage
- production deploy or public publishing
- live ResourceSpace writeback against non-test data
- external account changes

## Default Execution Choice

Use Subagent-Driven execution with Codex worktree threads:

1. Orchestrator thread.
2. Metadata/taxonomy worker.
3. Review/rights worker.
4. Discovery/search worker.
5. Delivery/package/brand worker.
6. Premium UX/browser QA worker.

The orchestrator is responsible for keeping the 24-hour run coherent.
