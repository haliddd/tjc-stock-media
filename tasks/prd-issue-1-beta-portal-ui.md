# PRD: Issue #1 Beta Portal UI Cleanup

## Introduction

Improve the True Jesus Church Media Library portal so internal beta customers can understand safe media reuse quickly, while preserving ResourceSpace as source truth and Google Drive as master-original custody. This is a product-app polish and safety-honesty pass, not hosted beta approval or public launch.

## Goals

- Make the first viewport feel premium, calm, and trustworthy for ministry teammates.
- Make `Can I use this?` visible through clear reuse verdicts, approved-copy state, blocked actions, and next action.
- Reduce fake/dead-action feel by labeling unavailable downloads, shares, public links, ZIPs, and writeback honestly.
- Keep beta truth visible: internal beta, not production SSO, ResourceSpace source truth, Google Drive originals.
- Preserve role gates, download gates, review gates, and source/original redaction.

## User Stories

### US-001: Portal Chrome And Beta Truth Strip

**Description:** As a teammate, I want the app chrome to clearly say True Jesus Church Media Library and explain beta/source-truth boundaries so I trust what I am seeing.

**Acceptance Criteria:**
- [ ] Sidebar brand uses `True Jesus Church Media Library`.
- [ ] Library first viewport shows `Internal beta`, `Not production SSO`, `ResourceSpace source truth`, and `Google Drive originals`.
- [ ] Copy does not claim public launch, production SSO, live ResourceSpace writeback, or public sharing.
- [ ] Typecheck passes.
- [ ] Verify in browser using Playwright fallback.

### US-002: Customer-Satisfying Library First Viewport

**Description:** As a normal ministry user, I want the Library to look like a polished media portal with clear search, role, thumbnails, safe actions, and first-selected asset trust state.

**Acceptance Criteria:**
- [ ] Library first viewport has top search, role persona indicator, safe reuse summary, media results, and right-side trust panel when an asset is selected.
- [ ] The right-side panel distinguishes approved copy, blocked download, review request, source/original restriction, and next action.
- [ ] Disabled or blocked actions explain the blocker instead of looking broken.
- [ ] Mobile and desktop have no horizontal overflow.
- [ ] Typecheck passes.
- [ ] Verify in browser using Playwright fallback.

### US-003: Overlay Hygiene For Customer Demo

**Description:** As a demo operator, I want task/report overlays to stay out of the way unless explicitly enabled so the portal itself remains the focus.

**Acceptance Criteria:**
- [ ] Task mode and report issue controls remain available only when env flags enable them.
- [ ] When enabled, controls use compact lower-priority placement and do not cover Library primary content at desktop or mobile widths.
- [ ] Feedback copy still warns against sensitive media, source paths, private URLs, and live writeback.
- [ ] Typecheck passes.
- [ ] Verify in browser using Playwright fallback.

### US-004: Evidence And Finish Gates

**Description:** As Hali, I want proof that the improved UI keeps safety gates intact and is not a fake hosted beta claim.

**Acceptance Criteria:**
- [ ] `git diff --check` passes.
- [ ] `npm --prefix frontend run typecheck` passes.
- [ ] Targeted frontend tests pass for touched safety helpers.
- [ ] Rendered desktop and mobile screenshots are saved under `docs/screenshots/qa/`.
- [ ] QA report states local UI proof only, no deploy, no ResourceSpace writeback, no public launch.

## Functional Requirements

1. FR-1: The portal UI must use the user-facing name `True Jesus Church Media Library`.
2. FR-2: The UI must keep normal roles away from source paths, private URLs, checksums, signed URLs, original filenames, and ResourceSpace internals.
3. FR-3: Download/share/writeback actions must use backend gates or honest blocked states.
4. FR-4: The UI must not invent approvals, public links, ZIP exports, analytics, ResourceSpace sync, or download success.
5. FR-5: Browser QA must cover desktop and mobile first viewport.

## Non-Goals

- No deploy.
- No public launch.
- No hosted beta approval.
- No credential/env changes.
- No ResourceSpace writeback.
- No source media mutation.
- No fake approvals, links, downloads, package ZIPs, or public distribution.

## Success Metrics

- First viewport answers: where am I, what can I search, what can I use, why is download blocked, what should I do next.
- Desktop and mobile screenshots look polished enough for customer demo.
- Safety proof remains explicit and local.

