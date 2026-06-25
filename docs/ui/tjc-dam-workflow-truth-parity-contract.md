# TJC DAM Workflow Truth + Prototype Parity Contract

Date: 2026-06-25
Status: supersedes visual-only prototype fidelity guidance for current product-wide pass

## Goal

Rebuild the TJC Stock Media DAM into one real, workflow-truthful TJC + ResourceSpace DAM that matches the uploaded Archive One / Atlas prototype family without using Archive/Atlas/Acme placeholder identity in TJC-facing copy.

## Canonical Inputs

- `/Users/halim4pro/Downloads/atlas_dam_10_10_full_prototype(4).html`
- `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_09 AM (1).png` through `(10).png`
- Chrome QA audit screenshots in `docs/screenshots/qa/chrome-portal-audit-2026-06-25/`
- Latest user direction: workflow truth outranks visual-only parity.

## Superseding Decisions

- Authenticated app must fill the browser viewport naturally. No outer app screenshot frame, no app-wide rounded border, no app-wide drop shadow, no padded edge canvas.
- Internal panels, cards, drawers, sidebars, inspectors, and public portal hero/cards may keep prototype-native radius, border, and soft shadow.
- TJC-facing copy must use True Jesus Church/TJC Media Library language. Avoid visible `Archive One`, `Atlas`, `Acme`, `Taylor Morgan`, `Jordan Kim`, `aone.io`, `Okta`, `Amazon S3`, and fake enterprise metrics.
- ResourceSpace and Google Shared Drive truth must be explicit: ResourceSpace is DAM/review/search layer; Google Shared Drive/source systems remain master custody; local portal actions do not claim writeback unless confirmed by readback.
- Prototype family still controls density, typography, sidebar/topbar rhythm, cards, chips, right rails, tables, drawers, and warm neutral palette.

## Product Truth Requirements

The app must behave like one coherent DAM, not stitched mock screens:

1. Library is the center: populated media-first grid, designed fallbacks for broken thumbnails, inspector, Browse/Ops modes, status chips, filters, saved views, rights-safe toggle, and selected states.
2. Collections are real product surfaces: populated cards, right inspector, permissions, collaborators, readiness, and role-aware actions.
3. Upload creates downstream work: valid Contributor intake creates a local request/review item and never mutates source media or claims ResourceSpace writeback.
4. Reviewer workbench is operational: queue, submitted intake visibility, selected record preview, metadata/rights/people-youth checks, decision actions, status history, and pending-write truth.
5. Public portal is TJC-facing: no placeholder company/person names, visible request/share/download states, rights-safe item readiness, and honest disabled download copy.
6. Governance/settings pages are honest: ResourceSpace read status, local demo activity, pending writeback, missing rights, review queues, and integration readiness without fake external infrastructure.
7. Visible interactions are required: filters, saved views, rights-safe toggle, share, download, request asset, check readiness, selected cards, and role-aware actions must visibly change UI state or explain restriction.
8. Role experience must be coherent: Viewer, Contributor, Reviewer, and DAM Admin use one shell with different powers.

## Acceptance Evidence

Before claiming this product-wide pass complete, capture and inspect:

- Admin Library: populated grid, right inspector, no outer frame.
- Admin Collections: populated cards, selected inspector, TJC copy.
- Public portal: TJC-facing, no placeholder copy, visible request/share/download states.
- Contributor Upload: successful submit creates visible request/review work.
- Reviewer Workbench: submitted intake shown, queue/actions present, pending ResourceSpace messaging clear.
- Distribution, Audit, Settings: honest TJC/local/ResourceSpace status.
- Mobile: no horizontal overflow or clipped controls.

Required commands:

```bash
git diff --check
npm --prefix frontend run typecheck
npm --prefix frontend test -- upload-intake public-portal-preview dam-shell-nav-access
```

Use Playwright or Chrome screenshots under `docs/screenshots/qa/product-wide-parity-YYYY-MM-DD/`. Browser/IAB is preferred when available; Playwright fallback is acceptable when Browser/IAB is unavailable.

## Non-Goals

- No deploy, public publishing, or PR push without explicit approval.
- No ResourceSpace writeback unless live writeback is implemented and confirmed by readback.
- No source media mutation.
- No fake approvals, public links, downloads, SSO, storage claims, analytics, recipients, or enterprise integrations.
