# PRD: Prototype Fidelity Lockdown

Date: 2026-06-25

Parent: prototype fidelity reset after current UI drift

Canonical contract: `docs/ui/prototype-fidelity-lockdown-contract.md`

## Problem

The current UI drifted away from the canonical Archive One / Atlas DAM 10/10 prototype. Safety content and beta honesty were implemented as new visual structures: trust strips, diagnostic cards, enlarged status panels, and altered shell proportions. That is unacceptable for this pass.

The next implementation must return the visual shell to the prototype exactly while keeping safety behavior and copy honest.

## Canonical Inputs

- `/Users/halim4pro/Downloads/atlas_dam_10_10_full_prototype(4).html`
- Ten PNGs from `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_09 AM (1).png` through `(10).png`
- The expanded Archive One / Atlas DAM brief for a 15-screen enterprise DAM concept covering marketing, app shell, governance, distribution, ingest, approvals, access control, and mobile viewer.

## Product Rule

Prototype fidelity wins over local redesign taste. Do not add a "better" layout unless the prototype shows it.

The intended product experience is a premium, calm, editorial enterprise DAM for brand, marketing, creative, and legal teams that need control. "10/10" means high-fidelity execution of the prototype language: warm off-white canvas, soft beige panels, black primary actions, forest-green compliance states, amber warnings, muted red violations, subtle blue/purple secondary states, rounded cards, thin borders, elegant shadows, dense but readable enterprise UI, and asset imagery as the emotional anchor.

## Safety Rule

Keep fail-closed behavior, role gates, source redaction, ResourceSpace writeback honesty, and blocked unsafe actions. Express them inside prototype-native controls, rows, disabled states, chips, and drawers.

Do not express safety as new shell structure.

## Issue Slices

1. #61: Contract and audit.
2. #62: Shell reset.
3. #63: Library, Collections, and Search Intelligence fidelity.
4. #64: Asset Detail and Download fidelity.
5. #65: Brand, Governance, Distribution, Settings fidelity.
6. #68: Marketing landing page fidelity.
7. #66: External Portal fidelity.
8. #69: Upload and ingest fidelity.
9. #70: Review and approvals fidelity.
10. #71: Roles and access fidelity.
11. #72: Mobile viewer fidelity.
12. #73: Interaction, state, and accessibility pass.
13. #67: Final visual QA pack.

## Required Surfaces

1. Marketing landing page with hero headline "A beautiful DAM for teams that need control.", subcopy, embedded app mockup, role cards, and feature row.
2. Library / asset grid with image-heavy cards, filters, hover actions, selected state, inspector updates, and sticky bulk action bar.
3. Search Intelligence for query "outdoor hero images" with result count, explainability tags, visual similarity, saved search, suggestions, and rights-safe explanation.
4. Asset detail for "Mountain Lake Hero.jpg" with large preview, metadata, renditions, rights/release tabs, region matrix, documents, and timeline.
5. Download Center slide-over with restricted Original, available web/social renditions, reason text, request elevated access, sidecar/release toggles, and download logging note.
6. Collections page with card/grid browser, selected inspector, sorting, saved views, owner filter, rights-safe filter, and bulk operations.
7. Public collection portal for "Spring Campaign 2024" with editorial hero, approved collection badge, floating usage card, notes, and asset grid.
8. Distribution Sets with share links/published portals, analytics, expiration risk, recipient engagement, watermark/password controls, revoke access, and audit trail.
9. Brand Kit page for "Acme Corporate Brand Kit" with logos, colors, typography, templates, rules, enforcement, missing assets, analytics, and apply-to-collection action.
10. Audit Log & Compliance dashboard with KPI cards, table, incidents rail, posture donut, and remediation actions.
11. Integrations & Settings with ResourceSpace, SSO, storage, webhooks/API, metadata sync, taxonomy sync, notifications, health score, logs, and retry controls.
12. Upload & ingest workflow with upload zone, queue, duplicate detection, AI tags, metadata extraction, rights checklist, brand matching, approval routing, and Ingest Intelligence rail.
13. Review & approvals workspace with preview, annotation pins, comments, version comparison, decision buttons, checklist, queue, history, SLAs, and role-based permissions.
14. Roles & access permissions matrix with role simulation.
15. Mobile viewer with phone frame, search, grid, detail bottom sheet, rights-safe badge, quick download, saved views, and bottom navigation.

## Interaction And State Requirements

- Command palette opens with Command-K.
- Hover and focus states exist on asset cards and primary controls.
- Selected asset updates inspector.
- Rights-safe toggle changes visible results.
- Download opens the Download Center drawer.
- Share opens distribution modal.
- Create share link flow includes access, expiration, watermark, password, and recipients.
- Expiring license warnings are clickable.
- Compliance incidents can be remediated.
- Brand rules surface inline where relevant.
- Empty, loading, error, and permission-denied states are included.
- Keyboard accessibility and visible focus states are part of acceptance.

## Shared Demo Data

Use coherent sample data across surfaces:

- Companies/people: Acme Inc., Taylor Morgan, Jordan Kim, Riley Anderson, Casey Nguyen.
- Collections/campaigns: Spring Campaign 2024.
- Assets: Mountain Lake Hero.jpg, Product Skincare Line.jpg, Architecture Curve.jpg, Profile Portraits Set.jpg, Canyon Light.jpg.
- Brand kit: Acme Corporate Brand Kit.

## Acceptance

- Each slice references the exact prototype PNG(s) it must match.
- Each slice includes screenshot comparison and a fidelity ledger.
- Each slice runs `git diff --check` and `npm --prefix frontend run typecheck`.
- No slice weakens safety behavior.
- No slice adds trust strips, extra diagnostic cards, or non-prototype status slabs.
- Each additive surface derives shell, density, typography, color, cards, table rhythm, drawers, and right rails from the canonical prototype.
- State and accessibility proof are required before final visual QA.

## Non-Goals

- Hosted beta deployment.
- ResourceSpace writeback.
- Public launch.
- New DAM capabilities beyond matching the prototype.
- New visual concepts.
- Hosted beta scope, unless a fresh `/askmatt` or `/grill-with-docs` explicitly expands the risk boundary.
