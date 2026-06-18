# PRD: Premium Enterprise DAM Architecture

## Introduction

Make TJC Stock Media feel and behave like a premium enterprise DAM by deepening the modules that decide reuse safety, review evidence, route source truth, and beta readiness. The product must preserve the accepted operating model: Google Shared Drive is the master warehouse, ResourceSpace is the DAM layer, source filenames stay intact, AI only suggests, and humans approve rights.

## Goals

- Concentrate portal reuse state, preview/download gates, and Viewer/Reviewer answers behind one deep module.
- Concentrate review evidence rules, labels, checklist defaults, missing evidence, and Pending Review Write packets behind one deep module.
- Keep media source session truth consistent across route responses without exposing operational details to Viewer.
- Keep private beta readiness facts synchronized across command line, Admin, and teammate docs.
- Preserve existing safety gates while making the interface easier for future agents and teammates to navigate.

## 2026-06-15 Safe UI / Beta-Proof Update

Status from isolated worktree `codex/safe-ui-beta-proof-2026-06-15`:

- P0 query-role elevation fixed as a bug class. Query/body `role` no longer grants Reviewer/Admin power unless explicit server-only local override or trusted identity/session exists.
- Trusted SSO headers now hydrate server-rendered UI role state through the same trusted-header policy, so protected browser QA can exercise Contributor/Reviewer/Admin UI without reopening query/localStorage trust.
- Library maturity pass fixed `Quick lookSelected`, improved row density, bigger thumbnails, title wrapping, grouped blockers, and visible disabled-download lock reasons.
- Review Queue maturity pass improved next-action hierarchy and made preview redaction intentional with a role-safe derivative notice.
- Protected-mode safety proof passed: guards, typecheck, 86 tests, build, `portal-api-smoke`, and `portal-download-ticket-smoke`. Current self-owned `portal-browser-qa` is PASS at `2026-06-16T13:37:58.461Z` with 20 pages, six viewports, 32 screenshots, 0 failures, 0 console errors, 0 network failures, and 0 warnings.
- Readiness remains NO-GO until hosted protection, canonical deployment/env, ResourceSpace scope, Google Drive custody, hosted redaction/download proof, and durable/fail-closed state are proven.

## User Stories

### US-001: Deepen Portal reuse decision
**Description:** As a DAM maintainer, I want one reuse decision module so that Viewer, Reviewer, detail, thumbnail, and download surfaces agree on reuse safety.

**Acceptance Criteria:**
- [ ] Add one portal reuse decision module that returns role-aware reuse, preview, download, original request, blocker, and viewer verdict facts.
- [ ] Existing `reuse-policy`, `access-decisions`, and `viewer-verdict` callers continue to compile through compatibility exports.
- [ ] Download and thumbnail routes still block unsafe access.
- [ ] Typecheck passes.
- [ ] Build passes.

### US-002: Deepen Review evidence
**Description:** As a rights reviewer, I want UI checklist locks and backend review evidence checks to use the same rules so that decisions do not drift.

**Acceptance Criteria:**
- [ ] Add one review evidence module that owns checklist items, labels, defaults, required fields, missing labels, completion rows, and disabled reason.
- [ ] Existing `review-decision` and `review-decision-presenter` callers continue to compile through compatibility exports.
- [ ] `Approve Public` still requires source, rights, people/minors, usage scope, derivative, sensitive context, credit, attribution, expiration/re-review, proof link, and review note.
- [ ] Typecheck passes.
- [ ] Build passes.

### US-003: Deepen route session response
**Description:** As a portal maintainer, I want route modules to share request identity, media source session, role-safe payload, audit, and usage helpers so that source truth and redaction stay consistent.

**Acceptance Criteria:**
- [ ] Add a request/session response module without changing ADR-0005 media source session.
- [ ] At least asset detail, search, thumbnail, download, and review routes use the shared module for source envelope or role-safe response helpers.
- [ ] Viewer payloads still hide original/master metadata.
- [ ] Typecheck passes.
- [ ] Build passes.

### US-004: Quarantine legacy DAM page family
**Description:** As a developer or agent, I want the live enterprise DAM page family to be obvious so that future work does not edit stale modules.

**Acceptance Criteria:**
- [ ] Audit route imports and live imports for legacy page modules.
- [ ] Extract any still-live primitives out of legacy modules before quarantine.
- [ ] Add a codemap or deprecation note if deletion is not yet safe.
- [ ] No live route imports a quarantined page.
- [ ] Typecheck passes.
- [ ] Build passes.

### US-005: Deepen beta readiness facts
**Description:** As a beta operator, I want one readiness truth packet feeding shell, Admin, and docs so that teammate invite decisions stay honest.

**Acceptance Criteria:**
- [ ] Produce one machine-readable readiness output covering SSO, ResourceSpace writeback, derivatives, private URL, seed data, env warnings, allowlists, browser QA, and Viewer/Reviewer dry-run status.
- [ ] `make launch-readiness` uses or validates the same facts.
- [ ] Admin readiness route exposes the same go/no-go fields.
- [ ] Typecheck passes.
- [ ] Build passes.

### US-006: Add smart discovery search intelligence
**Description:** As a church media user, I want search to understand ministry language, synonyms, and useful follow-up filters so that I can find reusable assets like a premium DAM without knowing exact metadata terms.

**Acceptance Criteria:**
- [ ] Search expands common ministry/DAM terms such as hero, banner, sermon, slides, youth, social, newsletter, and background without calling paid AI.
- [ ] Search results include discovery metadata: summary, expanded terms, suggested filters, and ranking explanation.
- [ ] Library displays smart discovery without hiding source/reuse safety.
- [ ] Suggested filters are clickable and update the search result set.
- [ ] Typecheck passes.
- [ ] Build passes.
- [ ] Verify in browser using dev-browser skill.

### US-007: Deepen package governance
**Description:** As a ministry comms teammate, I want package preview, share, and publish readiness to use the same portal reuse policy as downloads so that a toolkit cannot become a shortcut around rights review.

**Acceptance Criteria:**
- [ ] Add one package governance module that returns can-preview, can-share, can-publish, counts, section blockers, and an audit message.
- [ ] Package Builder uses portal reuse decisions instead of raw `Approved` status for seeded refs and Portal Ready filtering.
- [ ] Publish requires all refs to be `Portal Ready`; internal-only and review-required refs stay visible as blockers.
- [ ] Package UI exposes governance command readiness inline.
- [ ] Typecheck passes.
- [ ] Build passes.
- [ ] Viewer and Reviewer browser QA still pass.

### US-008: Add enterprise insights command center
**Description:** As a DAM operator, I want analytics to recommend next actions rather than only show charts so that review debt, metadata health, usage maturity, and search gaps translate into operating priorities.

**Acceptance Criteria:**
- [ ] Add one insights command-center module that returns score, summary, signals, and prioritized actions from current SearchResult facts.
- [ ] Insights Admin/Reviewer view shows command center without exposing operational diagnostics to Viewer.
- [ ] Signals cover portal readiness, metadata health, analytics maturity, and unresolved warnings.
- [ ] Actions route to review/admin/search surfaces without mutating ResourceSpace.
- [ ] Typecheck passes.
- [ ] Build passes.
- [ ] Browser QA still passes across Insights/Admin/Viewer routes.

### US-009: Deepen Brand Kit governance
**Description:** As a ministry brand owner, I want Brand Hub share/download readiness to use ResourceSpace mapping and portal reuse policy so that brand kits cannot bypass DAM review.

**Acceptance Criteria:**
- [ ] Add one brand kit governance module that returns preview/share/download readiness, counts, blockers, and command rows.
- [ ] Brand kit API returns the governance packet with existing kit/source facts.
- [ ] Brand Hub disables or explains Share Kit and Download Kit when mapped assets are missing or not Portal Ready.
- [ ] Viewer-facing Brand Hub avoids source-file mutation and fake ZIP claims.
- [ ] Typecheck passes.
- [ ] Build passes.
- [ ] Browser QA and targeted Brand Hub role checks pass.

### US-010: Add governed package draft persistence
**Description:** As a ministry communications teammate, I want package drafts to save through a governed portal store so that curated toolkit work survives a browser session without copying ResourceSpace originals or bypassing review.

**Acceptance Criteria:**
- [ ] Add one package draft store module that persists sanitized ResourceSpace refs only.
- [ ] Add `POST /api/packages` for Contributor/Reviewer/DAM Admin saves and `GET /api/packages` for Reviewer/DAM Admin listing.
- [ ] Server recomputes package governance from current media source session before saving.
- [ ] Package Builder Save draft calls the API and reports storage mode/ref count.
- [ ] Viewer save/list attempts are denied and audited.
- [ ] Typecheck passes.
- [ ] Build passes.
- [ ] Browser QA and targeted package API/UI checks pass.

### US-011: Standardize enterprise identity on mutation routes
**Description:** As a DAM admin, I want upload, batch, and collection mutation previews to resolve role/actor through the same request identity seam as package, review, and admin routes so that trusted SSO headers can govern unsafe actions when enabled.

**Acceptance Criteria:**
- [x] Upload intake uses `requestIdentity` instead of trusting only form role.
- [x] Batch action preview uses `requestIdentity` instead of trusting only body role.
- [x] Collection draft preview uses `requestIdentity` instead of trusting only body role.
- [x] Audit events include resolved actor identity.
- [x] Local beta role fallback still works when trusted SSO headers are disabled.
- [x] Typecheck passes.
- [x] Build passes.
- [x] Browser QA and targeted trusted-header route checks pass.

### US-012: Add actor parity to download audits
**Description:** As a DAM operator, I want approved-copy downloads and download-gate decisions to include the same resolved actor identity as review, upload, batch, package, and admin events so that SSO-backed audit trails remain coherent.

**Acceptance Criteria:**
- [x] Download route audit events include resolved actor identity.
- [x] Download gate audit events include resolved actor identity.
- [x] Admin readiness recent audit summaries include actor identity.
- [x] Trusted SSO identity still resolves through the shared route session.
- [x] Typecheck passes.
- [x] Build passes.
- [x] API smoke passes.

### US-013: Harden beta readiness coverage gates
**Description:** As a beta operator, I want launch readiness and Admin beta readiness to require concrete browser QA coverage and actor-backed audit rehearsal evidence so teammate invite decisions are based on mechanical proof, not stale checklist copy.

**Acceptance Criteria:**
- [x] Launch readiness verifies browser QA has required page, viewport, and proof screenshot coverage.
- [x] Launch readiness checks actor-backed Viewer, Reviewer, and DAM Admin audit rehearsal evidence.
- [x] Admin beta readiness audit fact reports actor-backed audit evidence and covered roles.
- [x] Typecheck passes.
- [x] Build passes.
- [x] Launch readiness passes with only explicit environment warnings.

### US-014: Add trusted-header SSO rehearsal smoke
**Description:** As a DAM operator, I want one repeatable command that proves production-style trusted identity headers override beta role inputs across sensitive portal routes while unsafe downloads remain blocked.

**Acceptance Criteria:**
- [x] Add a `portal-sso-smoke` command that expects a server running with trusted SSO headers enabled.
- [x] SSO smoke proves Reviewer headers override `role=Viewer` for review, package, batch, and download-gate routes.
- [x] SSO smoke proves Contributor headers override `role=Viewer` for collection and upload routes.
- [x] SSO smoke proves DAM Admin headers override `role=Viewer` for readiness and feedback inbox routes.
- [x] Unsafe download gate remains blocked under trusted Reviewer identity.
- [x] Launch readiness validates the SSO smoke script exists.
- [x] Typecheck passes.
- [x] Build passes.
- [x] Launch readiness and SSO smoke pass.

### US-015: Add durable usage analytics rehearsal smoke
**Description:** As a DAM operator, I want one repeatable command that proves portal usage analytics records real SQLite events for search, asset view, download gate, review action, and Brand Hub usage before Insights claims analytics maturity.

**Acceptance Criteria:**
- [x] Add a `portal-usage-smoke` command that expects a server running with `PORTAL_USAGE_LOGGING=1`.
- [x] Usage smoke records and verifies search events with a unique query marker.
- [x] Usage smoke records and verifies asset view, download gate, review action, and Brand Hub events.
- [x] Usage smoke verifies recorded usage events include actor identity.
- [x] Launch readiness validates the usage smoke script exists.
- [x] Typecheck passes.
- [x] Build passes.
- [x] Launch readiness and usage smoke pass.

### US-016: Add delivery privacy smoke rehearsal
**Description:** As a DAM operator, I want one repeatable command that proves Viewer/Contributor payloads and blocked download gates do not leak private storage, source custody, or unfinished S3 delivery details before teammate beta.

**Acceptance Criteria:**
- [x] Add a `portal-delivery-smoke` command that can run against any local beta server without S3 credentials.
- [x] Delivery smoke verifies Viewer/Contributor search and asset payloads do not expose S3 paths, private URLs, source paths, master-drive paths, checksums, or original filenames.
- [x] Delivery smoke verifies blocked Viewer and Reviewer download-gate responses do not expose download, signed, original, or private storage URLs.
- [x] Admin readiness keeps S3 delivery honest and does not claim production signed delivery.
- [x] Launch readiness validates the delivery smoke script exists.
- [x] Typecheck passes.
- [x] Build passes.
- [x] Launch readiness and delivery smoke pass.

### US-017: Add private beta rehearsal evidence
**Description:** As a beta operator, I want one repeatable dry-run command that records Viewer, Reviewer, and DAM Admin proof before teammate invites so the decision uses evidence instead of memory.

**Acceptance Criteria:**
- [x] Add a `portal-beta-rehearsal` command that runs against a local beta server.
- [x] Rehearsal proves Viewer search/detail works, unsafe download blocks, and Viewer cannot review.
- [x] Rehearsal proves Reviewer queue loads, incomplete approval blocks, and complete evidence returns honest pending-write/writeback state.
- [x] Rehearsal proves DAM Admin readiness opens and S3 readiness stays honest.
- [x] Rehearsal writes a JSON summary under `.runtime/beta-rehearsals/`.
- [x] Launch readiness validates the rehearsal script exists.
- [x] Typecheck passes.
- [x] Build passes.
- [x] Launch readiness and beta rehearsal pass.

### US-018: Add hosted private beta smoke
**Description:** As a beta operator, I want one post-deploy smoke command for the stable Vercel beta URL so route availability, feedback triage, and blocked downloads can be tested after each deployment.

**Acceptance Criteria:**
- [x] Add a `portal-hosted-smoke` command that defaults to the stable hosted URL and allows `BASE_URL` override.
- [x] Hosted smoke checks Viewer, Contributor, Reviewer, DAM Admin, and Guide pages.
- [x] Hosted smoke checks feedback submission, Viewer feedback inbox denial, and DAM Admin feedback inbox visibility.
- [x] Hosted smoke selects a currently blocked asset before proving Viewer download remains blocked without private URLs.
- [x] Add teammate invite docs with trusted beta session/SSO entry paths, missions, safety copy, and feedback expectations.
- [x] Launch readiness validates the hosted smoke script exists.
- [x] Typecheck passes.
- [x] Build passes.
- [x] Launch readiness and hosted smoke pass against the stable Vercel beta URL.

### US-019: Add beta feedback operations smoke
**Description:** As a beta operator, I want one repeatable command and readiness row for feedback intake, admin triage, storage mode, and actor-backed audit so teammate feedback can become an actionable DAM operating loop.

**Acceptance Criteria:**
- [x] Add a `portal-feedback-smoke` command.
- [x] Feedback smoke submits Viewer feedback and verifies DAM Admin can list it.
- [x] Feedback smoke verifies Viewer cannot open the feedback inbox.
- [x] Feedback smoke patches severity/status/notes through the DAM Admin route.
- [x] Feedback records include actor identity.
- [x] Admin readiness reports beta feedback storage state and record counts.
- [x] Typecheck passes.
- [x] Build passes.
- [x] Feedback smoke passes against a local production server.

### US-025: Fix query-role trust before premium UI proof
**Description:** As a beta safety operator, I want API routes to ignore query/body role elevation unless a trusted beta session, trusted SSO identity, or explicit server-only local override exists, so local and hosted proof cannot be faked by `?role=Reviewer`.

**Acceptance Criteria:**
- [x] Create and use an isolated worktree for the safe 30-40h lane while sibling sessions are active.
- [x] Patch request identity/session resolution so production/hosted query role is never trusted.
- [x] Default unauthenticated local smoke callers to Viewer unless trusted identity/session or explicit server-only local override exists.
- [x] Add guard coverage so localhost query-role trust cannot return.
- [x] Add smoke coverage for reviewer query role, admin query role, Viewer/Contributor redaction, and blocked download behavior.
- [x] Run guard, typecheck, test, build, `portal-api-smoke`, and `portal-download-ticket-smoke` against explicit `BASE_URL`.
- [x] Update evidence docs `00` through `12` plus daily checkpoint with honest NO-GO posture.
- [x] Add safe lane guard so isolated worktree path, branch, ledger, BASE_URL, sibling sessions, and forbidden surfaces stay machine-checked.
- [x] Add runtime isolation guard so `.runtime`, `frontend/.next`, screenshots, hosted summary, and evidence packet proof paths stay inside the isolated worktree.
- [x] Make launch readiness fail if protected local smokes regress to query-role-only curl paths.
- [x] Add repeatable hosted read-only probe command that does not POST, mutate hosted data, or store raw response bodies.
- [x] Require beta role/marker headers to come from a trusted beta session, not caller-supplied headers.
- [x] Add hosted read-only probe guard, hosted smoke mutation guard, and evidence packet guard so proof cannot drift into mutation or false-GO wording.
- [x] Make launch readiness require current Team Beta NO-GO signoff after the June 15 P0 until renewed approval exists.
- [x] Make user-facing invite/demo packets draft-only and block stale hosted query-role links or send-ready claims.
- [x] Make evidence docs record backup/restore as blocked when real `.env`, ResourceSpace config, or backups are absent instead of faking proof.
- [x] Make hosted read-only probe evidence timestamped and guard the docs against stale hosted summary results.
- [x] Make API identity guard fail if route-level `searchParams.get("role")` reads do not feed the identity/session seam directly.

**Notes:** Completed in isolated worktree `codex/safe-ui-beta-proof-2026-06-15` at `/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run`. Local safety proof passed on `BASE_URL=http://localhost:4871`; broader beta remains NO-GO until hosted/canonical/ResourceSpace/Drive/durable gates pass. `make launch-readiness` now checks safe lane guard, runtime isolation guard, trusted-header helper adoption for protected local smokes, hosted read-only probe guard, hosted smoke mutation guard, current Team Beta NO-GO signoff after the June 15 P0, draft-only invite packets, trusted beta session/SSO hosted entry paths instead of query-role invite links, backup/restore blocked because real `.env`/ResourceSpace config/backups are absent, route-level `searchParams.get("role")` identity-seam guard coverage, and evidence packet guard. `make portal-hosted-readonly-probe` provides repeatable anonymous hosted read-only probe evidence without mutation and latest hosted read-only summary is timestamped at `2026-06-16T14:22:04.520Z`; `portal-hosted-smoke` now requires explicit owner approval env before non-local POSTs. Current self-owned browser QA is PASS at `2026-06-16T13:37:58.461Z` with 20 pages, six viewports, 32 screenshots, 0 failures, 0 console errors, 0 network failures, and 0 warnings. Client privileged GET paths no longer append query-role authority for asset detail, review queue, admin readiness, brand kit, or search reads. Beta role/marker headers require a trusted beta session marker, naked caller-supplied headers are ignored, and latest safety proof is 86 tests plus guarded API/download/SSO smokes.

## Functional Requirements

- FR-1: Preserve ResourceSpace approval state separately from computed portal reuse state.
- FR-2: Preserve Viewer restrictions for original/master metadata and ResourceSpace admin links.
- FR-3: Preserve `403` behavior for unsafe downloads.
- FR-4: Preserve Pending Review Write semantics when live ResourceSpace writeback is not configured.
- FR-5: Use compatibility exports where needed so incremental refactors do not break current dirty UI work.
- FR-6: Keep module interfaces small and implementation-rich.
- FR-7: Keep safety facts persistent inline; never rely on toasts alone.
- FR-8: Package drafts must store ResourceSpace refs only and must not override portal reuse, download, or original-file restrictions.
- FR-9: Analytics should distinguish real usage rows from current-export and sample/fallback panels.
- FR-10: Brand kits must keep editorial guidance separate from ResourceSpace-backed downloadable media readiness.
- FR-11: Package persistence must never store source binaries, copied assets, master paths, or final rights truth.
- FR-12: Mutating or mutation-preview routes must resolve role through one identity seam so production SSO can override beta query/body role safely.
- FR-13: Enterprise audit events for download and mutation gates must include resolved actor identity when the route has access to request identity.
- FR-14: Beta readiness must use mechanical browser QA coverage and actor-backed audit evidence before teammate invite recommendations can be treated as rehearsal-ready.
- FR-15: Production-style trusted-header identity must have a repeatable local smoke path before teammate beta access is treated as identity-ready.
- FR-16: Usage analytics must have a repeatable local smoke path before Insights can be treated as event-backed rather than sample-only.
- FR-17: Delivery privacy must have a repeatable local smoke path before teammate beta payloads can be treated as storage-safe.
- FR-18: Hosted beta launches must have a repeatable post-deploy smoke path and draft-only teammate invite packet using trusted beta session/SSO entry paths before internal testers receive the URL.
- FR-19: Private beta dry-runs must produce machine-readable evidence for Viewer, Reviewer, and DAM Admin before teammate invite decisions.
- FR-20: Beta feedback intake and triage must have a repeatable smoke path before teammate feedback is treated as operational evidence.
- FR-21: Query/body/client role inputs must never grant Reviewer/Admin authority unless trusted beta session, trusted SSO identity, or explicit server-only local override exists; hosted production query role is never trusted.

## Non-Goals

- No source media deletion, movement, renaming, or mutation.
- No production deploy.
- No paid AI/tool calls.
- No fake ResourceSpace writeback or fake approved media.
- No new external storage provider.
- No claim of 100% market superiority without external beta evidence.

## Design Considerations

- Viewer language should be premium and calm: `Ready to use`, `Download approved copy`, `Ask media team`.
- Reviewer/Admin language should stay explicit: blockers, rights, people/minors, derivatives, Pending Review Write, source truth.
- Enterprise DAM polish means fewer leaked implementation details for normal users and more audit depth for operators.

## Technical Considerations

- Current app uses Next 15, React 19, TypeScript, and Make targets.
- `frontend/lib/reuse-policy.ts`, `frontend/lib/access-decisions.ts`, and `frontend/lib/viewer-verdict.ts` are the current shallow reuse family.
- `frontend/lib/review-decision.ts` and `frontend/lib/review-decision-presenter.ts` currently duplicate required evidence logic.
- `frontend/lib/package-drafts.ts` is the portal-local package draft interface; package governance should sit behind it rather than adding button-local policy in the page.
- Existing branch has dirty beta readiness work; preserve it.

## Success Metrics

- `make frontend-check` passes.
- `make launch-readiness` passes or reports only explicit environment warnings.
- Viewer and Reviewer safety dry-runs pass through `make portal-api-smoke`; current `make portal-browser-qa` must return to green before browser-readiness can be claimed.
- Future agents can locate reuse and review evidence truth from one module each.
- No regression in source/master restrictions.

## Open Questions

- Which route-session helpers should become mandatory first: source envelope, redaction, audit, usage, or response shape?
- Should legacy modules be deleted, moved, or marked deprecated after primitive extraction?
- Should beta readiness emit JSON, Markdown, or both?
