# PRD: TJC Stock Media Beta-Proof Run

## Introduction

This run proves whether TJC Stock Media can safely support a tiny named internal teammate beta during June 15-20, 2026. The work is evidence-first and safety-first. A precise no-go is a successful outcome if access, real data, durable state, or custody cannot be proven.

## Goals

- Prove canonical repo, branch, commit, deployment, and local command surface.
- Prove hosted access is protected before treating the hosted app as beta-ready.
- Prove real ResourceSpace read behavior, or explicitly label the beta as non-real rehearsal.
- Prove demo/fallback data cannot appear as real teammate data.
- Prove Google Shared Drive remains the source/original custody boundary.
- Prove normal roles cannot see source/original/private/admin fields.
- Prove blocked downloads remain blocked.
- Prove beta-critical state is durable or fails closed.
- Produce a complete teammate beta packet and final GO, CONDITIONAL-GO, or NO-GO recommendation for Hali.

## User Stories

### US-001: Canonical Surface And Dependency Ledger

**Description:** As a beta operator, I want the repo, branch, commit, deployment, local commands, env names, and Hali-owned dependencies recorded so readiness evidence is tied to the correct surface.

**Acceptance Criteria:**
- [ ] Create `docs/runs/evidence/2026-06-15/00-hali-dependencies.md`.
- [ ] Create `docs/runs/evidence/2026-06-15/01-canonical-repo-deploy.md`.
- [ ] Record repo owner/name, current branch, commit SHA, remotes, Vercel project name, hosted URL if known, local install/start commands, actual or blocked `BASE_URL`, env var names only, Makefile targets, npm scripts, unavailable expected commands, and repo/branch ambiguity.
- [ ] Mark unknown or human-owned items as blockers, not passing results.
- [ ] Typecheck passes or is recorded as not run with reason.

### US-002: Local Baseline Command Proof

**Description:** As a beta operator, I want safe local checks inventoried and run when possible so local readiness claims have command evidence.

**Acceptance Criteria:**
- [ ] Create `docs/runs/evidence/2026-06-15/02-local-baseline-checks.md`.
- [ ] Record all available baseline commands and expected smoke/guard targets.
- [ ] Run only commands safe in the current shared checkout, or mark blocked by concurrent sessions.
- [ ] Record exact pass, fail, blocked, not available, or not run status.
- [ ] Typecheck passes or is recorded as not run with reason.

### US-003: Hosted Protected Access Proof

**Description:** As a beta operator, I want hosted protected access proven or blocked so anonymous access and role spoofing cannot be waved through.

**Acceptance Criteria:**
- [ ] Create `docs/runs/evidence/2026-06-15/03-hosted-access-proof.md`.
- [ ] Record hosted URL, Vercel project name if known, deployment commit status, beta auth env names, and protection status.
- [ ] Do not run hosted mutating smoke without Hali approval.
- [ ] Record anonymous access, invalid session, persona login, and role spoofing proof as PASS/FAIL/BLOCKED/NOT RUN.
- [ ] Typecheck passes or is recorded as not run with reason.

### US-004: ResourceSpace Real Read And Demo Honesty Proof

**Description:** As a beta operator, I want real DAM reads and fallback behavior proven so demo data cannot masquerade as real teammate data.

**Acceptance Criteria:**
- [ ] Create `docs/runs/evidence/2026-06-15/04-resourcespace-read-proof.md`.
- [ ] Create `docs/runs/evidence/2026-06-15/05-real-vs-demo-proof.md`.
- [ ] Record ResourceSpace env names, adapter paths, field map status, and read-only credential availability without values.
- [ ] Prove real ResourceSpace or export-backed data appears, or mark real read proof blocked.
- [ ] Prove unavailable/fallback state is honest.
- [ ] Typecheck passes or is recorded as not run with reason.

### US-005: Google Shared Drive Custody Proof

**Description:** As a beta operator, I want source custody documented so Google Shared Drive remains master-original storage and portal actions cannot mutate originals.

**Acceptance Criteria:**
- [ ] Create `docs/runs/evidence/2026-06-15/06-google-drive-custody-proof.md`.
- [ ] Define sanitized custody manifest requirements.
- [ ] Record whether Hali supplied sanitized custody proof.
- [ ] Verify or block proof that normal roles cannot see source paths, checksums, original URLs, or custody internals.
- [ ] Confirm no source media files were touched.
- [ ] Typecheck passes or is recorded as not run with reason.

### US-006: Redaction And Download Safety Proof

**Description:** As a beta operator, I want role payloads and download gates proven so normal users cannot see private fields or download blocked media.

**Acceptance Criteria:**
- [ ] Create `docs/runs/evidence/2026-06-15/07-redaction-and-download-safety-proof.md`.
- [ ] Test or document blockage for Viewer, Contributor, Reviewer, and DAM Admin payload differences.
- [ ] Prove Viewer and Contributor payloads hide source/original/private/admin fields.
- [ ] Prove blocked and missing-derivative downloads fail closed.
- [ ] Record any leak as P0 NO-GO.
- [ ] Typecheck passes or is recorded as not run with reason.

### US-007: Durable Beta State Proof

**Description:** As a beta operator, I want beta-critical state classified as durable, disabled, local-only, forbidden, or blocked so hosted workflows do not silently lose state.

**Acceptance Criteria:**
- [ ] Create `docs/runs/evidence/2026-06-15/08-durable-state-proof.md`.
- [ ] Classify audit log, download tickets, feedback, pending review/write queue, saved searches, and package drafts.
- [ ] Prove durable store where available, or prove fail-closed/disabled behavior.
- [ ] Record local/session-only workflows as not beta-ready.
- [ ] Typecheck passes or is recorded as not run with reason.

### US-008: Teammate Beta Packet

**Description:** As a beta operator, I want a complete honest teammate packet so Hali can approve or reject a tiny internal beta without sending invites prematurely.

**Acceptance Criteria:**
- [ ] Create `docs/runs/evidence/2026-06-15/09-beta-packet.md`.
- [ ] Include placeholder tester matrix until names are supplied.
- [ ] Include role-specific tasks, invite copy, feedback process, triage labels, stop conditions, limitations, and no sensitive uploads rule.
- [ ] State ResourceSpace is private admin software, Google Shared Drive keeps originals, packages/tags/collections do not grant permission, and blocked downloads are expected when rights are unclear.
- [ ] Do not send invites.
- [ ] Typecheck passes or is recorded as not run with reason.

### US-009: Final QA Summary And Readiness Report

**Description:** As Hali, I want final evidence summarized into a clear GO, CONDITIONAL-GO, or NO-GO recommendation with blockers and next steps.

**Acceptance Criteria:**
- [ ] Create `docs/runs/evidence/2026-06-15/10-final-qa-summary.md`.
- [ ] Create `docs/runs/evidence/2026-06-15/11-friday-readiness-report.md`.
- [ ] Reconfirm repo, branch, commit, deployment, local `BASE_URL`, and command results.
- [ ] Classify failures as blocker, acceptable beta limitation, follow-up, not applicable, not run: missing access, not run: command unavailable, or not run: unsafe without approval.
- [ ] Choose exactly one decision recommendation: GO, CONDITIONAL-GO, or NO-GO.
- [ ] Typecheck passes or is recorded as not run with reason.

## Functional Requirements

1. FR-1: The run must create evidence notes under `docs/runs/evidence/2026-06-15/`.
2. FR-2: Every proof note must include date, commit SHA, repo/branch, environment, base URL, role/persona, command/manual step, expected, actual, result, evidence path, secrets redacted, and follow-up.
3. FR-3: The run must never record secret values, private media, sensitive paths, API keys, tokens, or credential-derived values.
4. FR-4: Hosted mutating checks require Hali approval before execution.
5. FR-5: Google Drive source media, ResourceSpace production data, Vercel production env, DNS, Cloudflare, and public publishing must not be mutated.
6. FR-6: Missing access must be recorded as blocker documentation, not simulated success.
7. FR-7: Demo/fallback data must be labeled honestly and must not count as real ResourceSpace proof.
8. FR-8: All normal-role payload proof must check source path, checksum, original URL, private admin notes, internal ResourceSpace fields, and custody internals.
9. FR-9: Critical state must be durable, disabled, forbidden, blocked, or fail closed in hosted beta.
10. FR-10: Final report must leave invite approval with Hali.

## Non-Goals

- No broad new features.
- No UI polish unless required to fix a P0 proof blocker.
- No full archive import.
- No AI rights approval.
- No public launch, public sharing, CDN setup, or embeds.
- No ResourceSpace live writeback without explicit approval.
- No Google Drive source media mutation.
- No tester invites.
- No root `prd.json` overwrite while concurrent sessions are active in the shared checkout.

## Technical Considerations

- Current shared checkout has active sibling sessions; prefer docs-only proof unless ownership is reconciled.
- Local frontend scripts use port `4867`; several smoke scripts default to older ports unless `BASE_URL` is supplied.
- Vercel project name is available locally as `tjc-stock-media`, but dashboard protection and deployment commit require human/dashboard proof.
- Existing docs mention `https://tjc-stock-media.vercel.app`, but hosted commit/protection must be re-proven for this run.
- Existing local `.env` inspection must report names only, not values.

## Success Metrics

- Every P0 safety and truth gate has PASS, FAIL, BLOCKED, or NOT RUN status with evidence.
- Hali can make a decision from the evidence bundle without trusting implied success.
- No secrets, private media, sensitive paths, or source media are exposed or mutated.
- Final recommendation is exactly GO, CONDITIONAL-GO, or NO-GO.

## Open Questions

- Which GitHub repo and branch is canonical for the June 15-20 beta proof: `Hali0321/tjc-stock-media`, `haliddd/tjc-stock-media`, or another remote/branch?
- Is `https://tjc-stock-media.vercel.app` the intended hosted beta URL for this proof run?
- Does the Vercel deployment point to the recorded commit?
- Are Vercel protection and beta auth enabled for the hosted URL?
- Are ResourceSpace read-only API credentials available for local or hosted proof?
- What durable store should be considered approved for hosted beta state?
- What sanitized Google Drive custody proof can Hali provide?
- Who are the named testers and their intended roles?
