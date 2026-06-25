# PRD: True Jesus Church Media Library Demo Readiness Follow-Up

Status: agent-ready issue plan
Date: 2026-06-25
Previous run: `tasks/prd-true-jesus-church-media-library-10-10-dam-depth-run.md`, GitHub issue `#45`

## Introduction

The 10/10 DAM depth run completed the core local-demo surfaces, but the final runbook still records three demo-readiness gaps: role proof depends on local rehearsal mechanics, deeper review evidence is summarized instead of stored as separate fields, and public portal preview can show an honest empty state without an operator path to make a collection Portal Ready.

This follow-up run keeps ResourceSpace as the DAM/source truth and improves the product app without inventing approvals, assets, share links, metadata, analytics, or download/rendition truth.

## Goals

- Consolidate local role rehearsal into an honest product-app entry surface without weakening backend gates.
- Store richer review evidence as local pending-write evidence without claiming ResourceSpace sync.
- Improve public portal empty/readiness handling so operators can see why no assets are Portal Ready and what review evidence is missing.
- Keep every slice issue-backed, acceptance-backed, and evidence-backed.

## User Stories

### US-001: Role Rehearsal Entry And Truth Labels

**Description:** As a demo operator, I want one safe local entry surface for role rehearsal so I do not need ad hoc query parameters or hidden header knowledge during product review.

**Acceptance Criteria:**
- [ ] Inspect current role routes/components before changing behavior.
- [ ] Add or refine a product-app role rehearsal entry surface that clearly labels local role selection as rehearsal-only, not production auth or SSO.
- [ ] Viewer remains the default public/local role.
- [ ] Viewer and Contributor cannot access reviewer/admin controls through the normal app surface.
- [ ] Download, review, source, and admin gates continue to use existing backend decisions.
- [ ] Remove or reduce runbook dependence on undocumented query/header mechanics where a visible rehearsal path can safely replace it.
- [ ] Do not add passwords, credentials, env changes, public publishing, or production auth claims.
- [ ] Run `git diff --check`.
- [ ] Run `npm --prefix frontend run typecheck`.
- [ ] Run targeted tests if helper/source logic changes.
- [ ] Verify desktop and mobile browser proof if UI changed.

### US-002: Review Evidence Field Persistence

**Description:** As a reviewer, I want deeper evidence fields stored with the pending review decision so the queued decision packet preserves what I checked without claiming ResourceSpace writeback.

**Acceptance Criteria:**
- [ ] Inspect current review route/components and pending-write helpers before changing behavior.
- [ ] Persist separate local pending-write evidence fields for brand guidelines, model release, property release, usage rights, location/talent permission, legal review, and alt text where applicable.
- [ ] Existing note/checklist requirements remain required for approve, request changes, restrict, and block actions.
- [ ] Pending-write copy continues to say ResourceSpace remains unchanged until sync confirms.
- [ ] No fake ResourceSpace write confirmation, live writeback, annotation backend, or compare backend is introduced.
- [ ] Add focused tests for evidence packet shape and required-field behavior.
- [ ] Run `git diff --check`.
- [ ] Run `npm --prefix frontend run typecheck`.
- [ ] Run targeted review/evidence tests.
- [ ] Verify desktop and mobile browser proof if UI changed.

### US-003: Public Portal Readiness Diagnostics

**Description:** As a demo operator, I want public portal preview to explain why a collection has zero Portal Ready assets and guide review work without fabricating public links or approvals.

**Acceptance Criteria:**
- [ ] Inspect current public portal route/components and Portal Ready helper logic before changing behavior.
- [ ] When a collection has zero Portal Ready assets, show safe readiness diagnostics based on existing backend/export fields.
- [ ] Diagnostics distinguish missing reviewer/date, rights/consent, people/minors, approved-copy derivative, usage scope, and blocked/unknown publish state when data exists.
- [ ] Provide safe navigation to the relevant review/search queue where an existing route supports it.
- [ ] Keep public-facing copy free of ResourceSpace internals, source paths, checksums, private URLs, raw IDs, or original filenames.
- [ ] Do not create fake public links, copied-link success, analytics, recipients, approvals, assets, or download success.
- [ ] Add focused tests for empty/readiness diagnostics.
- [ ] Run `git diff --check`.
- [ ] Run `npm --prefix frontend run typecheck`.
- [ ] Run targeted public portal/readiness tests.
- [ ] Verify desktop and mobile browser proof if UI changed.

## Functional Requirements

1. FR-1: Each issue must update `tasks/true-jesus-church-media-library-demo-readiness-follow-up.json` with pass/fail notes and evidence paths.
2. FR-2: Each issue must comment GitHub evidence before moving to the next issue.
3. FR-3: UI surfaces must use **True Jesus Church Media Library** for new user-facing product copy.
4. FR-4: Local rehearsal surfaces must never claim production auth, SSO, live approval, ResourceSpace writeback, or public publishing.
5. FR-5: Public portal readiness diagnostics must derive from current backend/export fields or explicitly mark the information unavailable.
6. FR-6: Pending review evidence may be local queued evidence only unless ResourceSpace writeback is confirmed by readback.

## Non-Goals

- No production deploy or public publishing.
- No credential, password, SSO, Vercel, DNS, or external account changes.
- No ResourceSpace live writeback.
- No source media mutation.
- No fake assets, counts, approvals, metadata, analytics, share links, download success, AI tags, or rendition truth.
- No repo-wide rename from older Atlas code symbols.
- No full route marathon or production build unless release/merge confidence is explicitly requested.

## Technical Considerations

- Current live route ownership runs through `frontend/components/dam/prototype/PrototypeDam.tsx` for several surfaces.
- `docs/local-demo-runbook-2026-06-25.md` records local role proof lanes and known limitations from issue `#53`.
- Existing helper tests for public portal, review evidence depth, permissions, governance queues, and search intelligence should be extended instead of duplicated where possible.

## Success Metrics

- Demo operator can rehearse roles through visible product-app controls with truthful labels.
- Pending review decisions preserve deeper evidence fields locally without overstating ResourceSpace state.
- A zero-asset public portal preview tells the operator why it is empty and where to review next, without unsafe details.
- Every issue has exact command/browser evidence in GitHub and the local tracker.

## Open Questions

- None blocking. Production auth, ResourceSpace writeback, and public publishing remain out of scope unless Hali explicitly approves a separate red-line decision.

## Run Checkpoints

```text
Checkpoint: #54 Role rehearsal entry and truth labels done.
Changed: frontend/app/rehearsal/page.tsx, frontend/components/RoleRehearsalPage.tsx, frontend/components/dam/prototype/PrototypeDam.tsx, frontend/app/prototype-dam.css, docs/local-demo-runbook-2026-06-25.md.
Truth kept: existing backend route/download/review/admin gates remain authoritative; `/rehearsal` uses existing local role-switch mechanics and labels role selection as rehearsal-only, not production auth or SSO.
Validation: git diff --check; npm --prefix frontend run typecheck; Playwright desktop/mobile proof at /rehearsal on port 4875.
Evidence: docs/screenshots/qa/issue-54-role-rehearsal-proof.json; docs/screenshots/qa/issue-54-role-rehearsal-desktop.png; docs/screenshots/qa/issue-54-role-rehearsal-mobile.png; GitHub issue #54 comment.
Risks: role switching still intentionally depends on NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=1; Viewer remains default when it is off.
Next: #55 Review evidence field persistence.

Checkpoint: #55 Review evidence field persistence done.
Changed: frontend/lib/types.ts, frontend/lib/review-evidence-depth.ts, frontend/lib/review-evidence-packet.ts, frontend/lib/review-action-workflow.ts, frontend/lib/review-decision.ts, frontend/lib/pending-review-writes.ts, frontend/lib/review-evidence-depth.test.ts, frontend/lib/review-evidence-packet.test.ts, frontend/components/dam/prototype/PrototypeDam.tsx.
Truth kept: review evidence depth is persisted as local pending-write evidence only; ResourceSpace remains unchanged unless live writeback succeeds and is confirmed by readback.
Validation: git diff --check; npm --prefix frontend run typecheck; npm --prefix frontend run test -- review-evidence-depth.test.ts review-evidence-packet.test.ts; Playwright desktop/mobile proof at /review on port 4875 with x-tjc-role: Reviewer.
Evidence: docs/screenshots/qa/issue-55-review-evidence-persistence-proof.json; docs/screenshots/qa/issue-55-review-evidence-persistence-desktop.png; docs/screenshots/qa/issue-55-review-evidence-persistence-mobile.png; GitHub issue #55 comment.
Risks: browser proof uses trusted local Reviewer header because normal Viewer lane must not expose review controls.
Next: #56 Public portal readiness diagnostics.

Checkpoint: #56 Public portal readiness diagnostics done.
Changed: frontend/lib/public-portal-preview.ts, frontend/lib/public-portal-preview.test.ts, frontend/app/public-portal/[collectionId]/page.tsx.
Truth kept: diagnostics use existing export/backend fields only; public page does not expose ResourceSpace internals, source paths, checksums, private URLs, raw IDs, original filenames, fake public links, analytics, recipients, approvals, assets, or download success.
Validation: git diff --check; npm --prefix frontend run typecheck; npm --prefix frontend run test -- public-portal-preview.test.ts; Playwright desktop/mobile proof at /public-portal/sabbath on port 4875.
Evidence: docs/screenshots/qa/issue-56-public-portal-readiness-proof.json; docs/screenshots/qa/issue-56-public-portal-readiness-desktop.png; docs/screenshots/qa/issue-56-public-portal-readiness-mobile.png; GitHub issue #56 comment.
Risks: diagnostics guide review work through existing review queue links; they do not create approvals or public links.
Next: separate final QA issue.

Checkpoint: #57 Final focused QA and evidence pack done.
Changed: docs/demo-readiness-follow-up-final-qa-2026-06-25.md, docs/screenshots/qa/issue-57-demo-readiness-final-qa.json, issue-57 screenshot pack, tasks/true-jesus-church-media-library-demo-readiness-follow-up.json.
Truth kept: final QA stayed focused to touched routes; no production build, deploy, hosted mutation, public publishing, fake links, fake approvals, fake downloads, or source media mutation.
Validation: git diff --check; npm --prefix frontend run typecheck; npm --prefix frontend run test -- public-portal-preview.test.ts review-evidence-depth.test.ts review-evidence-packet.test.ts; Playwright desktop/mobile proof for /rehearsal, /review, and /public-portal/sabbath on port 4875.
Evidence: docs/screenshots/qa/issue-57-demo-readiness-final-qa.json; docs/demo-readiness-follow-up-final-qa-2026-06-25.md; GitHub issue #57 comment.
Risks: review route proof uses trusted local Reviewer header because normal Viewer lane must stay locked out of review controls.
Next: handoff.
```
