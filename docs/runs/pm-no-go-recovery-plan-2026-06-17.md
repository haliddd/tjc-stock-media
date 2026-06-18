# PM NO-GO Recovery Plan - 2026-06-17

## Sprint Goal

Move TJC Stock Media from local-only proof to a controlled hosted Joanna mini beta decision, without weakening audit, rights, source-custody, or invite-code safety.

## Duration

One focused recovery sprint: 3 working days.

## Capacity Assumption

Capacity is limited because engineering, PM, deployment, and QA are concentrated in one operator plus Hali owner decisions. Reserve 25% buffer for hosted/runtime surprises.

Committed work: 5 stories.

## Definition Of Done

Joanna or any teammate invite remains NO-GO until all required gates below are true:

1. Hosted URL proves current June 17+ build through `/api/beta-auth/session`.
2. Real Viewer, Contributor, Reviewer/Joanna, and Admin auth paths work without QA shims.
3. Real content counts are verified read-only against current beta source.
4. Hosted download/audit/upload/review state either persists durably or fails closed with explicit tester instructions.
5. Hali renews owner signoff with tester list, send owner, stop-test owner, and feedback triage owner.

## Execution Update - 2026-06-17 15:29 EDT

Current execution status: partial recovery complete; Joanna/team invite remains **NO-GO**.

Completed:

- Story 1: Decision docs reconciled so local proof, Joanna mini beta, teammate invite, and production launch do not imply the same readiness state.
- Story 2: Conservative default applied in docs: hosted approved-copy downloads stay intentionally fail-closed for Joanna unless Hali separately approves durable audit/ticket storage and hosted download-ticket proof.
- Story 3 protection half: read-only hosted probes passed for anonymous/query-role protection without running hosted mutating smokes.

Blocked:

- Story 3 current-build proof: `https://tjc-stock-media.vercel.app/api/beta-auth/session` returned 401 unauthenticated session JSON without the June 17+ `build.readinessContract` marker, so the stable hosted URL is protected but not proven current.
- Story 4 real auth/invite proof: requires private Viewer, Contributor, Reviewer/Joanna, Admin credentials and real church/location invite codes outside Git/logs/chat.
- Story 5 content/persistence proof: requires read-only current beta content-count access plus hosted persistence proof or explicit fail-closed tester instructions for upload/review/feedback/download state.
- Final signoff: requires Hali renewed owner decision after hosted/current, auth, content, persistence/fail-closed, tester list, send owner, stop-test owner, and feedback triage owner gates close.

## Execution Update - 2026-06-17 16:04 EDT

Owner permission received to complete hosted proof work. Current execution status: hosted/current and real beta-auth gates improved, but Joanna/team invite remains **NO-GO** because hosted content is still demo fallback, not the expected beta source.

Completed:

- Story 3: Stable production URL `https://tjc-stock-media.vercel.app` was redeployed and aliased to Vercel deployment `dpl_DSakz1GSaViJGeyBxVwAwB9HkFND`.
- Story 3: `/api/beta-auth/session` now exposes `build.readinessContract: small-team-beta-readiness-2026-06-17`, commit `63474a70e930`, branch `codex/merge-recommended-set-2026-06-17`, home page `EnterpriseLibraryPage`, and upload page `EnterpriseUploadPage`.
- Story 3: Anonymous/query-role hosted read-only probes remain protected and redirect/deny to beta login without privileged payloads.
- Story 4: Beta-only Viewer, Contributor, Reviewer, and DAM Admin persona passwords plus a church/location invite code were rotated into Vercel production env. Values are not in Git, docs, terminal output, screenshots, or chat. Local owner handoff file is `.runtime/beta-credentials-2026-06-17.env` with mode `600`.
- Story 4: Hosted real beta-session login passed for Viewer, Contributor, Reviewer, and DAM Admin. Contributor and above used the church/location invite-code path.
- Story 5 partial: Hosted feedback POST persisted enough for DAM Admin inbox visibility. Viewer feedback inbox denial passed. Hosted Viewer blocked download failed closed with `503 audit-required` and no source/original/private/checksum leak.

Still blocked:

- Story 5 content source: Hosted Reviewer content-count proof returned `sourceAdapter: demo-fallback`, `rawTotal: 16`, `approvedRaw: 12`, `needsReview: 2`, `archive: 1`, `portalReady: 1`. This is an exact delta from the expected 181 approved photos plus pending/unapproved beta content; real beta content is not configured on hosted.
- Story 5 upload/review persistence: Hosted feedback and download fail-closed boundaries are proven. Hosted upload intake and review decision persistence were not separately proven against real beta content.
- Final signoff: Hali signoff cannot honestly move to Joanna/team GO until the hosted content source is configured or Hali explicitly scopes Joanna to demo-fallback workflow testing only.

## Stories

### 1. Reconcile beta decision docs

Owner: PM / Codex

Outcome: One canonical truth table for local dry run, Joanna mini beta, teammate invite, and production launch.

Acceptance:
- `docs/team-beta-go-no-go-packet.md`, `docs/joanna-mini-beta-readiness-report.md`, and June 17 evidence agree on the same GO/NO-GO language.
- Browser QA status is described consistently: green only if latest report is actually green; otherwise list failures and blocker class.
- Invite decision is not implied by local proof.

Dependency: none.

### 2. Choose hosted download behavior

Owner: Hali / runtime owner

Outcome: Decision on whether hosted beta supports approved-copy download now, or keeps download fail-closed for Joanna round.

Recommended default: fail-closed for Joanna mini beta, unless durable store can be configured quickly and proven.

Acceptance:
- If fail-closed: UI/tester instructions say hosted download is intentionally disabled for this round.
- If durable store: ticket/audit writes persist in hosted production mode; download-ticket smoke passes against hosted or equivalent production runtime.
- No audit-required behavior is loosened to make tests pass.

Dependency: Hali decision.

### 3. Prove hosted/current URL

Owner: deployment owner

Outcome: Stable hosted URL is known current, protected, and safe to hand to Hali for owner testing.

Acceptance:
- `https://tjc-stock-media.vercel.app/api/beta-auth/session` exposes expected readiness contract/build marker.
- Anonymous/query-role probes remain protected.
- No hosted mutating smoke runs without explicit owner approval.

Dependency: deployment access and env visibility.

### 4. Prove real auth and invite path

Owner: Hali / access owner

Outcome: Real role access is proven outside Git and without trusted-header or query-role shortcuts.

Acceptance:
- Viewer, Contributor, Reviewer/Joanna, and Admin can log in through intended beta path.
- Contributor path requires church/location invite code.
- No real codes, hashes, passwords, screenshots, or logs are committed.

Dependency: private credential setup.

### 5. Prove real content and persistence boundary

Owner: DAM/content owner plus runtime owner

Outcome: Current beta data is understandable and safe for Joanna test.

Acceptance:
- Read-only content-count proof confirms expected approved/pending/unapproved numbers, or records exact delta.
- Source/original paths remain hidden from normal roles.
- Upload/review/feedback/download state is either durable or clearly queued/fail-closed.

Dependency: beta data source access.

## Critical Path

Decision docs -> hosted download behavior -> hosted/current proof -> real auth/invite proof -> real content/persistence proof -> Hali signoff.

## Risks And Mitigations

- Durable store takes longer than sprint. Mitigation: ship Joanna hosted browse/review/upload-feedback test with downloads fail-closed.
- Real credentials create leak risk. Mitigation: keep credentials entirely out of Git, logs, screenshots, fixtures, and chat transcripts.
- Local and hosted evidence drift. Mitigation: add one readiness contract/build marker check as first gate.
- Browser QA churn hides product decision. Mitigation: classify each failure as blocker, stale harness, or accepted fail-closed behavior before more polish.
- Rights/content policy scope expands. Mitigation: Joanna beta tests workflow and limited records only; no public approval or broad archive claim.

## Release Ladder

### Step 0 - Current State

Status: NO-GO for teammate invite. Local proof improved, hosted proof incomplete.

### Step 1 - Owner-Led Dry Run

Allowed after docs are reconciled and latest local QA status is explicit.

Scope: Hali only, local or private hosted owner check. No teammate invite.

### Step 2 - Joanna Mini Beta

Allowed after hosted/current URL, real Reviewer/Joanna auth, content counts, and hosted persistence/fail-closed boundary are proven.

Scope: Joanna tests browse/search/upload/review workflow. Downloads may stay disabled if explicitly documented.

### Step 3 - Tiny Teammate Invite Batch

Allowed only after Joanna feedback, renewed owner signoff, named tester list, stop-test owner, and feedback triage owner are locked.

Scope: Named testers only. No production launch.

## Hali Decision Needed

Pick one:

1. Recommended: Hosted Joanna mini beta with downloads fail-closed for this round.
2. Higher work: Configure durable hosted runtime store before Joanna sees hosted beta.
3. Narrower: Hali-only owner dry run first, no Joanna invite yet.
