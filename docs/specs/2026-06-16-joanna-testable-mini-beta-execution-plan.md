# Joanna-Testable Mini Beta Execution Plan

Date: 2026-06-16
Source of truth: June 16 Stock Media meeting and transcript notes
Status: Execution plan, not public launch approval
Decision target: Tuesday, 2026-06-23, 11:00 AM-12:00 PM

## Mission

Prepare a hosted, Joanna-testable photo-only DAM mini beta. This is not a public launch, not a broad team beta, and not a full archive import. The beta exists so Joanna can open one shared URL, log in, upload or manage a limited photo batch, browse/search, review metadata, and give content-manager feedback.

Expected honest outcome: **Beta ready with limitations**.

## Scope Guard

### In Scope

- Photo-only DAM beta.
- One hosted beta URL reachable outside localhost.
- Limited MVP 2024 or previous MVP sample, roughly 50-200 photos.
- Primary tester: Joanna as content approver/content manager.
- Viewer, Contributor, Reviewer/Joanna, and Admin role paths.
- Minimal upload metadata.
- Search, filters, asset detail, upload, review queue, approve/reject/archive, rights flags.
- One-page upload/naming/tagging guide.
- Short content policy draft.
- Technical runbook for host/start/stop/restart/backup/restore/data locations.
- Final beta-readiness report.

### Out Of Scope

- Public launch.
- Broad internal beta.
- Full 2,000+ photo archive import.
- Video/audio import.
- Product redesign.
- New complex backup automation unless needed for mini beta safety.
- Live ResourceSpace writeback unless field mapping is already proven.
- Production/prd data overwrite.
- Paid services, DNS changes, credential changes, or public publishing without Hali approval.

## Success Criteria

- Joanna can access one hosted beta URL from her own machine.
- Joanna can log in with a Reviewer/Content Manager role.
- Contributor account can upload photos or create real pending-review records.
- Uploaded assets default to `Needs Review / Do Not Publish`.
- Search returns real sample or uploaded test photos.
- Asset detail shows enough real metadata for date, event/source, contributor, usage, and rights.
- Review queue is connected to persisted state, not mock-only UI.
- Approve, reject, archive, rights-flag, and metadata edit actions persist locally/hosted for the beta scope or clearly queue/fail closed.
- Normal users do not see admin-only noise or secret/source fields.
- No credentials, tokens, private URLs, or source media files are committed.
- Final report ends with exactly one decision: `Beta ready`, `Beta ready with limitations`, or `Not beta ready`.

## Architecture Decision

Use the existing TJC portal plus ResourceSpace-backed/export-backed data model. Do not rebuild the product. Use the smallest hosted path that lets Joanna test real workflows.

Preferred host order:

1. Azure Student VM if credit-backed and no spending-limit change is required.
2. Oracle Free Tier only if capacity is available and no paid upgrade is required.
3. Existing protected Vercel portal plus reachable ResourceSpace/export path if already configured.
4. ResourceSpace cloud only as a paid-option note, not default.

Stop before paid prompts, card charges, DNS changes, public publishing, source-media mutation, or production env mutation.

## Implementation Phases

### Phase 0: Scope Freeze And Evidence Baseline

Goal: make the June 16 meeting the current PM source and prevent drift back to broad beta.

#### Task 0.1: Create mini-beta source-of-truth packet

**Description:** Record the narrowed Joanna mini-beta scope and link it to transcript notes.

**Acceptance criteria:**
- [ ] This plan exists under `docs/specs/`.
- [ ] It names Joanna-only mini beta as the current target.
- [ ] It explicitly supersedes broad six-person/team-beta invite goals for this week.

**Verification:**
- [ ] `rg -n "Joanna-testable|mini beta|not a public launch" docs/specs docs/runs/beta-meeting-2026-06-16`

**Dependencies:** None.

**Files likely touched:**
- `docs/specs/2026-06-16-joanna-testable-mini-beta-execution-plan.md`
- `docs/runs/beta-meeting-2026-06-16/stock-media-meeting-2026-06-16-notes.md`

**Estimated scope:** XS.

#### Task 0.2: Establish current technical baseline

**Description:** Run non-mutating local checks and list current blockers before implementation.

**Acceptance criteria:**
- [ ] Current branch, remotes, dirty files, and hosted URL assumptions are recorded.
- [ ] Existing local build/test status is recorded.
- [ ] No unrelated dirty files are reverted.

**Verification:**
- [ ] `git status --short`
- [ ] `git remote -v`
- [ ] `npm --prefix frontend run typecheck`
- [ ] `npm --prefix frontend test`
- [ ] `npm --prefix frontend run build`

**Dependencies:** Task 0.1.

**Files likely touched:**
- `docs/runs/beta-meeting-2026-06-16/joanna-mini-beta-baseline.md`

**Estimated scope:** S.

### Phase 1: Hosted Access Path

Goal: Joanna can reach a private beta URL that is not localhost.

#### Task 1.1: Select no-cash hosted path

**Description:** Decide the temporary host using the preferred host order and document the reason.

**Acceptance criteria:**
- [ ] Host option is selected or blocked with reason.
- [ ] Cost status is documented as free, credit-backed, or blocked.
- [ ] Any human-owned account steps are listed without exposing credentials.
- [ ] No paid resource is created without approval.

**Verification:**
- [ ] Host decision added to runbook.
- [ ] If hosted URL already exists, read-only access probe recorded.

**Dependencies:** Task 0.2.

**Files likely touched:**
- `docs/runs/beta-meeting-2026-06-16/joanna-mini-beta-hosting-decision.md`
- `docs/joanna-mini-beta-runbook.md`

**Estimated scope:** S.

#### Task 1.2: Prepare protected beta roles

**Description:** Confirm Viewer, Contributor, Reviewer/Joanna, and Admin access paths.

**Acceptance criteria:**
- [ ] Anonymous access cannot enter protected beta workflows.
- [ ] Viewer can browse/search/open details.
- [ ] Contributor can access upload but not review/admin.
- [ ] Reviewer/Joanna can access review queue and metadata actions.
- [ ] Admin can see system status without exposing secrets.
- [ ] Contributor/reviewer/admin access is not public open signup.

**Verification:**
- [ ] Role route matrix passes locally.
- [ ] Hosted access proof recorded when URL exists.

**Dependencies:** Task 1.1.

**Files likely touched:**
- `frontend/lib/beta-route-access.test.ts`
- `frontend/lib/dam-route-identity.ts`
- `frontend/components/dam/shell/damShellNav.ts`
- `docs/joanna-mini-beta-runbook.md`

**Estimated scope:** M.

#### Task 1.3: Produce access instructions

**Description:** Create safe test-account instructions with names/roles only, no passwords committed.

**Acceptance criteria:**
- [ ] Access doc names the roles Joanna should use.
- [ ] Real passwords/secrets are excluded.
- [ ] `.env.example` contains env var names only where needed.
- [ ] Real `.env` stays ignored.

**Verification:**
- [ ] `rg -n "password|token|secret|api[_-]?key|credential" docs frontend scripts .env.example`
- [ ] `git status --short .env .env.example`

**Dependencies:** Task 1.2.

**Files likely touched:**
- `docs/joanna-mini-beta-access-instructions.md`
- `.env.example`

**Estimated scope:** S.

### Phase 2: Data Scope And Metadata

Goal: load a limited, useful photo sample without mutating source media.

#### Task 2.1: Select Joanna test sample

**Description:** Choose a 50-200 photo MVP 2024 or previous MVP sample with representative church-specific content and a small curated nature subset.

**Acceptance criteria:**
- [ ] Sample source is documented.
- [ ] Photo-only sample size is between 50 and 200 assets unless blocked.
- [ ] No video/audio included.
- [ ] No source media committed to Git.
- [ ] Source media is not renamed, moved, deleted, or mutated.

**Verification:**
- [ ] Import manifest or sample manifest exists without media blobs.
- [ ] `git status --short` shows no media files staged/added.

**Dependencies:** Task 0.2.

**Files likely touched:**
- `docs/runs/beta-meeting-2026-06-16/joanna-mini-beta-sample-manifest.md`
- `.runtime/exports/` or `.runtime/audits/` ignored runtime files

**Estimated scope:** S.

#### Task 2.2: Map minimal metadata fields

**Description:** Reduce contributor-facing fields while preserving reviewer/admin evidence.

**Acceptance criteria:**
- [ ] Required contributor fields are limited to title/name, event/source, contributor, rights/source type, usage intent, people/minors visible, and notes.
- [ ] Date defaults from EXIF/date metadata when available.
- [ ] Event year/folder is fallback when date metadata is unavailable.
- [ ] Obviously wrong dates can be flagged for correction.
- [ ] Filename remains secondary to ResourceSpace metadata/search tags.
- [ ] Original vs derivative field exists or is documented.

**Verification:**
- [ ] Metadata schema/update doc includes minimal beta field set.
- [ ] Upload UI/API accepts the minimal field set.
- [ ] Tests cover default `Needs Review / Do Not Publish`.

**Dependencies:** Task 2.1.

**Files likely touched:**
- `docs/metadata-schema.md`
- `frontend/lib/upload-intake.ts`
- `frontend/lib/types.ts`
- `frontend/components/UploadFileDropzone.tsx`
- `frontend/components/dam/enterprise/AssetDetailPage.tsx`

**Estimated scope:** M.

#### Task 2.3: Define content policy

**Description:** Draft the content-manager rules Joanna can react to during the test.

**Acceptance criteria:**
- [ ] Policy prioritizes baptism, Bible study, prayer, chapel/group worship from safe angles, church property, TJC ministry context, and design-friendly negative space.
- [ ] Generic/nature photos are allowed only as curated useful content, not unlimited upload volume.
- [ ] Rights/copyright caution covers own photos, church-owned, Canva/Pexels/Unsplash-style external, and uncertain items.
- [ ] Children, sacrament, worship, sermon, music, unknown people, and unclear contributor media stay `Needs Review`.

**Verification:**
- [ ] Policy doc exists and is linked from guide/runbook.

**Dependencies:** Task 2.2.

**Files likely touched:**
- `docs/joanna-mini-beta-content-policy.md`

**Estimated scope:** S.

### Phase 3: Core Workflow Readiness

Goal: the beta flows are real enough for Joanna to test, not a beautiful fake dashboard.

#### Task 3.1: Viewer browse/search/detail proof

**Description:** Verify normal viewer can browse grid/list, search by keyword/tag, filter key fields, and open asset detail.

**Acceptance criteria:**
- [ ] Viewer sees asset grid with sample photos.
- [ ] Search returns sample assets by keyword/tag.
- [ ] Filters include at least event/source, rights/usage, review status, and contributor where available.
- [ ] Asset detail shows date/event/source/usage enough for Joanna to judge content-manager fit.
- [ ] Viewer cannot see admin-only controls, source paths, checksums, original URLs, or secrets.

**Verification:**
- [ ] Browser QA captures viewer library/search/detail.
- [ ] API payload guard passes.

**Dependencies:** Tasks 1.2, 2.2.

**Files likely touched:**
- `frontend/components/dam/enterprise/LibraryPage.tsx`
- `frontend/components/dam/enterprise/AssetDetailPage.tsx`
- `frontend/lib/catalog.ts`
- `frontend/lib/source-redaction.ts`
- `scripts/portal-browser-qa.mjs`

**Estimated scope:** M.

#### Task 3.2: Contributor upload proof

**Description:** Make upload feel close to Google Drive/Google Photos while requiring only necessary fields.

**Acceptance criteria:**
- [ ] Contributor can upload photos or create real pending-review records.
- [ ] Contributor identity is recorded.
- [ ] New uploads default to `Needs Review / Do Not Publish`.
- [ ] Upload flow does not show admin-level noise.
- [ ] Upload rejects video/audio for this beta.
- [ ] Uploaded record appears in search or recent uploads.

**Verification:**
- [ ] Upload smoke passes locally.
- [ ] Browser QA covers contributor upload.
- [ ] Test proves uploaded item is not public-approved.

**Dependencies:** Tasks 1.2, 2.2.

**Files likely touched:**
- `frontend/app/api/upload/route.ts`
- `frontend/lib/upload-intake.ts`
- `frontend/components/UploadFileDropzone.tsx`
- `frontend/components/dam/enterprise/RecentUploadsPage.tsx`
- `scripts/portal-beta-rehearsal.sh`

**Estimated scope:** M.

#### Task 3.3: Reviewer/Joanna queue proof

**Description:** Ensure Joanna can inspect submitted assets and make content-manager decisions.

**Acceptance criteria:**
- [ ] Reviewer sees pending review queue.
- [ ] Reviewer can approve internal/public when evidence is sufficient.
- [ ] Reviewer can reject.
- [ ] Reviewer can archive old/outdated/unusable photos.
- [ ] Reviewer can flag copyright/rights issues.
- [ ] Reviewer can edit key metadata/tags.
- [ ] Actions persist or clearly queue/fail closed with honest status.

**Verification:**
- [ ] Review API tests pass.
- [ ] Browser QA covers reviewer approval/rejection/archive/rights flag.
- [ ] State persists after reload or limitation is documented.

**Dependencies:** Task 3.2.

**Files likely touched:**
- `frontend/app/api/review/route.ts`
- `frontend/lib/review-workbench.ts`
- `frontend/lib/pending-review-writes.ts`
- `frontend/components/dam/enterprise/ReviewPage.tsx`
- `frontend/components/ReviewActionDialog.tsx`

**Estimated scope:** M.

#### Task 3.4: Download and derivative restriction proof

**Description:** Keep originals restricted and favor approved derivatives.

**Acceptance criteria:**
- [ ] Original/source download is blocked for normal roles.
- [ ] Approved derivative download works only when audit/ticket storage is safe, or fails closed with documented limitation.
- [ ] Asset detail distinguishes original, web, social/Instagram, and print derivatives when present.
- [ ] Download behavior does not leak source/original paths.

**Verification:**
- [ ] `make portal-download-ticket-smoke`
- [ ] `node scripts/api-payload-guard.mjs`
- [ ] Browser QA confirms visible download state.

**Dependencies:** Task 3.3.

**Files likely touched:**
- `frontend/lib/media-delivery.ts`
- `frontend/lib/approved-delivery-gate.ts`
- `frontend/lib/download-tickets.ts`
- `frontend/components/GatedDownloadButton.tsx`

**Estimated scope:** M.

### Phase 4: Simplification And Joanna Test Packet

Goal: remove beta-test friction without redesigning the whole product.

#### Task 4.1: Simplify normal-user UI

**Description:** Hide or remove busy controls and AI-looking copy from normal workflows.

**Acceptance criteria:**
- [ ] Normal users see search, filters, asset grid, asset detail, upload, review queue, requests/rights flags, and help guide.
- [ ] Normal users do not see admin dashboards unless role allows.
- [ ] Upload form asks only minimal fields.
- [ ] Help text is practical and short.
- [ ] No broad visual redesign is attempted.

**Verification:**
- [ ] Browser screenshots reviewed at desktop and mobile widths.
- [ ] No text overlap or horizontal overflow.

**Dependencies:** Tasks 3.1-3.3.

**Files likely touched:**
- `frontend/components/dam/shell/AppSidebar.tsx`
- `frontend/components/dam/enterprise/LibraryPage.tsx`
- `frontend/components/dam/enterprise/ReviewPage.tsx`
- `frontend/components/dam/enterprise/AdminPage.tsx`
- `frontend/app/dam-enterprise.css`

**Estimated scope:** M.

#### Task 4.2: Create one-page upload/naming/tagging guide

**Description:** Give Joanna and contributors a concise guide for testing.

**Acceptance criteria:**
- [ ] Guide explains what to upload and what not to upload.
- [ ] Guide gives minimal naming pattern.
- [ ] Guide explains required tags/metadata.
- [ ] Guide warns rights/copyright uncertainty defaults to review.
- [ ] Guide says found/pretty photo does not mean approved/public.

**Verification:**
- [ ] Guide exists and is linked from Help or access instructions.

**Dependencies:** Task 2.3.

**Files likely touched:**
- `docs/joanna-mini-beta-upload-guide.md`
- `frontend/components/GuidePage.tsx` or `frontend/app/help/page.tsx`

**Estimated scope:** S.

#### Task 4.3: Create Joanna test script

**Description:** Provide the exact test steps Joanna should run before the June 23 meeting.

**Acceptance criteria:**
- [ ] Steps cover login, browse/search, upload, metadata review, approve/reject/archive, rights flag, and feedback.
- [ ] Feedback questions capture field confusion, upload friction, missing categories, rights uncertainty, and search quality.
- [ ] Test script avoids requiring Saturday/Sunday availability.

**Verification:**
- [ ] Test script exists and is linked from access instructions.

**Dependencies:** Tasks 3.1-3.3.

**Files likely touched:**
- `docs/joanna-mini-beta-test-script.md`

**Estimated scope:** S.

### Phase 5: Security, Secrets, And Runbook

Goal: keep the beta private, recoverable, and honest.

#### Task 5.1: Secret and credential sweep

**Description:** Search repo and docs for credential-like strings, URLs, keys, and secrets.

**Acceptance criteria:**
- [ ] Repo scan checks source, docs, scripts, and env examples.
- [ ] Real secrets are moved to ignored `.env` or removed.
- [ ] `.env.example` keeps only names/placeholders.
- [ ] Any exposed credential-like value is documented for rotation review.
- [ ] Generated transcript redactions remain in place.

**Verification:**
- [ ] `rg -n "password|passwd|token|secret|api[_-]?key|credential|BEGIN .*KEY|client_secret|tdc11355" . --glob '!.git/**' --glob '!node_modules/**' --glob '!.next/**' --glob '!.runtime/**'`
- [ ] `git diff --check`

**Dependencies:** Task 0.2.

**Files likely touched:**
- `.env.example`
- `docs/runs/beta-meeting-2026-06-16/*`
- `docs/joanna-mini-beta-readiness-report.md`

**Estimated scope:** S.

#### Task 5.2: Technical runbook

**Description:** Document host, start/stop/restart, storage, DB, backup, restore, cost, and limitations.

**Acceptance criteria:**
- [ ] Runbook states where app is hosted.
- [ ] Runbook states how to start/stop/restart.
- [ ] Runbook states where uploaded files are stored.
- [ ] Runbook states where DB/state is stored.
- [ ] Runbook states manual backup/export path for beta.
- [ ] Runbook states restore check or limitation.
- [ ] Runbook states cost/free-credit dependency.

**Verification:**
- [ ] Runbook command examples are syntax-valid.
- [ ] Backup/export command is tested locally or marked blocked.

**Dependencies:** Tasks 1.1, 3.2, 3.3.

**Files likely touched:**
- `docs/joanna-mini-beta-runbook.md`
- `docs/backup-restore-runbook.md`

**Estimated scope:** S.

#### Task 5.3: Final beta readiness report

**Description:** Record what works, what is limited, what Joanna should test, and final decision.

**Acceptance criteria:**
- [ ] Report links hosted URL or states blocked.
- [ ] Report lists accounts/access instructions without passwords.
- [ ] Report lists passing and failing checks.
- [ ] Report lists known limitations and risk owners.
- [ ] Report ends with exactly one final decision.

**Verification:**
- [ ] `rg -n "Beta ready|Beta ready with limitations|Not beta ready" docs/joanna-mini-beta-readiness-report.md`

**Dependencies:** Tasks 1.1-5.2.

**Files likely touched:**
- `docs/joanna-mini-beta-readiness-report.md`

**Estimated scope:** S.

## Checkpoints

### Checkpoint A: Plan And Baseline

Required before code changes:
- [ ] New mini-beta plan exists.
- [ ] Local baseline recorded.
- [ ] Dirty worktree reviewed; unrelated changes preserved.
- [ ] No `prd.json` overwrite.

### Checkpoint B: Hosted Reachability

Required before Joanna testing:
- [ ] Shared URL reachable outside localhost.
- [ ] Anonymous access blocked.
- [ ] Role paths work.
- [ ] Access instructions exist with no secrets.

### Checkpoint C: Real Workflow

Required before sending Joanna link:
- [ ] Viewer browse/search/detail works.
- [ ] Contributor upload creates real pending-review asset/record.
- [ ] Reviewer queue/actions persist or fail closed honestly.
- [ ] Sample data is photo-only and bounded.

### Checkpoint D: Safety And Handoff

Required before final report:
- [ ] Secret scan complete.
- [ ] Original/source downloads blocked for normal roles.
- [ ] Runbook complete.
- [ ] Upload guide, content policy, and test script complete.
- [ ] Build/typecheck/tests/browser QA complete or blockers documented.

## Verification Suite

Run as applicable:

```bash
git diff --check
npm --prefix frontend run typecheck
npm --prefix frontend test
npm --prefix frontend run build
node scripts/api-payload-guard.mjs
node scripts/api-audit-guard.mjs
node scripts/storage-honesty-guard.mjs
make launch-readiness
BASE_URL=http://localhost:4867 make portal-api-smoke
BASE_URL=http://localhost:4867 make portal-beta-rehearsal
BASE_URL=http://localhost:4867 make portal-browser-qa
BASE_URL=http://localhost:4867 make portal-download-ticket-smoke
```

Hosted checks:

```bash
BASE_URL=<hosted-beta-url> make portal-hosted-readonly-probe
```

Do not run hosted mutating smokes without explicit Hali approval.

## Day-By-Day Execution

### Tuesday, June 16

- Finalize this mini-beta execution plan.
- Record baseline and current blockers.
- Select sample source candidate.
- Decide hosted path or list exact blocker.

### Wednesday, June 17

- Prepare protected hosted access path.
- Confirm role access locally.
- Start sample import/export path.
- Begin minimal metadata/upload field changes if needed.

### Thursday, June 18

- Complete viewer browse/search/detail proof.
- Complete contributor upload pending-review proof.
- Complete reviewer queue/actions proof.
- Draft content policy and upload guide.

### Friday, June 19

- Run secret scan and local verification suite.
- Finish runbook and Joanna test script.
- Share hosted link/access instructions only if Checkpoints B and C pass.
- If hosted path is blocked, report blocker and fallback recommendation.

### Monday, June 22

- Support Joanna test if link was shared.
- Fix only blocking access/workflow bugs.
- Collect feedback into readiness report.
- Prepare June 23 meeting summary.

### Tuesday, June 23

- Review Joanna feedback.
- Decide next path: continue ResourceSpace mini beta, simplify to default ResourceSpace, or pause for hosting/maintenance decision.

## Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Hosted access requires paid upgrade | High | Stop and ask Hali; use local proof plus blocked-host report. |
| Existing repo changes conflict with implementation | High | Preserve dirty worktree; inspect before editing; touch focused files only. |
| Upload/review state is mock-only or non-durable | High | Fail closed, document limitation, and keep final decision as `Beta ready with limitations` or `Not beta ready`. |
| UI remains too busy for Joanna | Medium | Hide admin noise for normal roles; simplify only test-critical surfaces. |
| Secrets or credential-like text exists in docs/transcripts | High | Redact generated artifacts; move real secrets to ignored env; flag rotation review. |
| Sample photos include sensitive media | High | Keep sample bounded; default all assets to review; no public approvals without reviewer evidence. |
| Generic nature photos overwhelm content strategy | Medium | Curate nature subset; require approver judgment; prioritize TJC-specific content. |

## Open Questions For Hali

- Which hosted path should be attempted first if Azure Student needs account/browser access?
- Which MVP 2024 or previous MVP batch should seed Joanna's sample?
- Should Annabella be invited after Joanna's first test, or kept out of this week's plan?
- Is live ResourceSpace writeback required for Joanna's test, or is queued/persisted portal review state acceptable?

## Final Decision Format

The final report must end with exactly one of:

- `Beta ready`
- `Beta ready with limitations`
- `Not beta ready`
