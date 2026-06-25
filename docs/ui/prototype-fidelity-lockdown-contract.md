# Prototype Fidelity Lockdown Contract

Date: 2026-06-25

Status: binding contract before any next UI coding pass

## Canonical Design Spec

The canonical source of truth for the next UI pass is:

- `/Users/halim4pro/Downloads/atlas_dam_10_10_full_prototype(4).html`
- `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_09 AM (1).png`
- `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_09 AM (2).png`
- `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_09 AM (3).png`
- `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_10 AM (4).png`
- `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_10 AM (5).png`
- `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_10 AM (6).png`
- `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_10 AM (7).png`
- `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_10 AM (8).png`
- `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_11 AM (9).png`
- `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_11 AM (10).png`

These files override prior visual direction documents when there is conflict, including `docs/ui/v2-archive-workbench-style-contract.md`.

The current product concept name is Archive One / Atlas DAM. The next UI pass must produce a connected enterprise Digital Asset Management experience for modern brand, marketing, creative, and legal teams that need control, rights safety, brand consistency, and secure distribution at scale.

## Non-Negotiable Rule

Match prototype structure, density, spacing, sidebar, topbar, cards, inspector, typography, and visual rhythm. Do not introduce a different layout because it seems safer, clearer, more beta-honest, more TJC-specific, or more polished.

Safety constraints stay in behavior, gate state, disabled actions, short helper copy, and redaction. Safety constraints do not justify new trust strips, diagnostic cards, beta banners, or alternate shell architecture.

The phrase "10/10 UI" means prototype-faithful execution, not design novelty. Additive product surfaces may fill gaps not shown in the ten PNGs, but they must borrow the prototype shell, card geometry, typography, density, and status language.

## Allowed Adaptation

- Product name may become TJC-specific where required.
- Public/product concept surfaces may use Archive One / Atlas DAM where the prototype does.
- Role names, rights states, and download gate copy may remain TJC-specific.
- Unsafe features must stay disabled or gated.
- Source paths, private URLs, checksums, signed URLs, original filenames, and fake approvals remain forbidden.
- New screens requested by the broader concept brief may be specified, but their visual system must derive from the prototype.

Everything else should match the prototype.

## Banned Drift

- No new trust strips.
- No extra diagnostic cards.
- No new beta proof/status panels.
- No repeated source-truth panels.
- No large customer-status cards.
- No replacing prototype rail/sidebar with another nav system.
- No changing app shell proportions.
- No changing topbar rhythm.
- No adding page hero bands to app screens.
- No adding marketing explanation inside app chrome.
- No "better" layout unless the prototype shows it.

## Core Shell Contract

Match these prototype values unless a smaller viewport triggers the prototype responsive rules:

- Outer body background: warm neutral radial/linear surface, not green/teal shell.
- `.prototype-shell`: `height:100vh`, `padding:22px`, `overflow:hidden`.
- `.app`: max width `1820px`, centered, 3-column grid.
- Desktop grid: `214px minmax(760px,1fr) 356px`.
- App surface: translucent white, 1px white border, `border-radius:28px`, soft shadow, hidden overflow.
- Sidebar: 214px, top brand, scroll nav, bottom user card.
- Workspace: topbar plus scroll view.
- Inspector: 356px right rail with 76px header and scroll body.
- Topbar: 76px high, 3 columns: page label, centered search `310-480px`, action cluster.
- Main view padding: `18px 24px 30px`.
- Main content max width: `1240px`.
- Mobile below 880px: sidebar hidden, single-column app, topbar becomes 1 column, view padding 14px, grids collapse.

## Typography Contract

- Font stack: `-apple-system`, `BlinkMacSystemFont`, `Inter`, `SF Pro Display`, `Segoe UI`, `Roboto`, `Arial`, sans-serif.
- Body letter spacing follows prototype: slightly tight, around `-.018em`.
- Page h1 in topbar: 24px, tight line-height, strong negative display tracking.
- App page h2: 23px, tight tracking.
- Nav items: 13px.
- Body/helper text: 12-13px.
- Table headers: 10px uppercase with letter spacing.
- Chips: 11.5px.
- Avoid heavier/larger typography than prototype.

## Color And Surface Contract

Use prototype token family:

- `--bg:#efede8`
- `--canvas:#f7f6f2`
- `--panel:#fffefa`
- `--panel-2:#faf8f3`
- `--ink:#151514`
- `--muted:#716b62`
- `--soft:#9a9288`
- `--line:#e2ddd4`
- `--line-2:#d4cec4`
- `--black:#111111`
- Status colors: prototype green, amber, red, blue, purple only.

Do not shift the product to sage/teal/blue-green unless matching a prototype status state.

## Controls Contract

- Buttons: 38px high, 12px radius, 13px text, subtle border.
- Small buttons: 31px high, 10px radius, 12px text.
- Segmented controls: 13px radius shell, 31px segments, black active state.
- Search: 40px high, 12px radius, 1px border, white panel.
- Filter pills: 35px high, full pill shape only for filters/chips.
- Chips: compact 6px vertical padding, small text, muted fills.
- Hover lift and shadow are subtle, not decorative.

## Card And Media Contract

- Cards use warm panel, 1px line, 18px radius, subtle shadow.
- Asset cards: 14px radius, 11px grid gap.
- Asset grid: `repeat(auto-fill,minmax(188px,1fr))`.
- Asset thumb height: 142px in library cards.
- Asset metadata is compact: title, one metadata line, small chips only where prototype has them.
- Selection check is small top-left square, not large checkbox rows.
- Quick actions appear top-right on hover, not as persistent large action rows.

## Inspector Contract

Library inspector must match prototype right rail:

- 356px desktop rail.
- Header: `Asset inspector`, small subtitle.
- Body: 16px padding.
- Preview image: 190px high, 16px radius.
- Title row with selected asset status chip.
- Four compact action tiles in a 4-column grid.
- Tabs: Details, Metadata, Rights, Activity.
- Metadata rows: label left, value right, 9px vertical row padding.

Safety gates must appear as disabled actions, short blocked reasons, rendition rows, or rights rows. Do not add a separate giant verdict card unless the prototype surface has that card.

## Surface Mapping

- PNG 1: marketing overview. Use only for product story tone, not as app shell replacement.
- PNG 2: primary app shell and Collections grid/detail rail.
- PNG 3: external collection portal. Use for portal-only route, not internal app shell.
- PNG 4: search intelligence page with left sidebar and right contextual rail.
- PNG 5: asset detail with download drawer.
- PNG 6: asset detail full record with left detail column and right rights/compliance card.
- PNG 7: brand kit overview grid.
- PNG 8: audit/compliance table with KPI row and right rail.
- PNG 9: distribution sets list with right detail rail.
- PNG 10: integrations/settings two-column card grid.

## Required Product Surface Inventory

The implementation plan must cover these connected surfaces. The first ten map directly to canonical PNGs; the remaining five are additive surfaces and must reuse the same shell, density, and control language.

1. Marketing landing page: premium product story with embedded app mockup, role cards, and feature row. Must not pollute internal app shell with landing-page trust strips.
2. Library / asset grid: dense image-heavy cards, filters, selection checkboxes, hover quick actions, selected card outline/glow, sticky bulk action bar.
3. Search Intelligence: query "outdoor hero images", explainable AI tags, visual similarity, saved search, result safety explanation.
4. Asset detail page: "Mountain Lake Hero.jpg", large preview, metadata, renditions, right tabs, rights/release record, region matrix, documents, timeline.
5. Download Center: slide-over drawer with rendition availability, restricted Original, reason text, request elevated access, metadata/release toggles, logged download note.
6. Collections page: card/grid collection browser with right inspector, sorting, saved views, owner filter, rights-safe filter, bulk operations.
7. Public collection portal: "Spring Campaign 2024" external route with editorial hero, floating access card, usage notes, rights-safe asset grid.
8. Distribution Sets: table/list with selected-row details panel, share URL, performance cards, expiration risk, recipient engagement, revoke/audit controls.
9. Brand Kit page: "Acme Corporate Brand Kit", overview/assets/guidelines/templates/activity tabs, colors, typography, rules, enforcement, analytics.
10. Audit Log & Compliance: KPI cards, compliance table, incidents rail, posture donut, remediation actions.
11. Integrations & Settings: ResourceSpace, SSO, storage, webhooks/API, metadata sync, taxonomy sync, notifications, health, sync timeline.
12. Upload & ingest workflow: upload zone, queue, duplicates, AI tags, metadata extraction, rights/release checklist, brand matching, approval routing, ingest intelligence rail.
13. Review & approvals: asset preview, annotation pins, comments, version comparison, decision buttons, review checklist, queue, history, SLA and role permission states.
14. Roles & access: permissions matrix for Viewer, Contributor, Reviewer, Brand Manager, Legal, Admin, risky permission warnings, inheritance indicators, simulate role view.
15. Mobile viewer: phone-frame responsive companion showing search, grid, detail bottom sheet, rights-safe badge, quick download, saved views, bottom navigation.

## Information Architecture Contract

Internal app navigation must preserve the prototype sidebar rhythm while covering this IA:

- Core: Library, Collections, Brand Kits, Metadata & Brand Governance, Shared with me, Favorites, Recent, Trash.
- Governance: Metadata & Brand Governance, Audit Log & Compliance.
- Distributions: Distribution Sets, Share Links, Published Portals.
- Settings: General, Integrations, Security, Roles & Access, API & Webhooks.
- Saved views: Campaign 2024, Website, Product shots, Need review, Expiring soon, Rights issues, Top performing, External sharing.

The topbar must preserve the prototype 76px rhythm and include brand/product identity, global search placeholder "Search assets, tags, collections...", command hint, filters, saved views, rights-safe toggle enabled by default, system status/notifications, and user profile where the prototype layout allows.

## Governance Visibility Contract

Every relevant surface must make these questions answerable without leaving the local context:

1. Is this asset approved?
2. Can I legally use it?
3. Where can I use it?
4. When does it expire?
5. Which brand rules apply?
6. Who touched it recently?
7. How can I safely share or download it?

Use prototype-native chips, rows, tables, drawers, right rails, disabled states, and short helper copy. Do not create new explanatory banners, trust strips, diagnostic cards, or giant verdict panels.

## Interaction Contract

The implementation backlog must account for these interactions:

- Command palette opens with Command-K.
- Asset cards have hover states and keyboard focus states.
- Selecting an asset updates the inspector.
- Rights-safe toggle changes visible results.
- Download opens the Download Center drawer.
- Share opens a distribution modal.
- Create share link flow includes access, expiration, watermark, password, and recipients.
- Expiring license warnings are clickable and route to remediation context.
- Compliance incidents can be remediated by request rights, revoke link, assign metadata fix, escalate violation, or export audit pack.
- Brand rules surface inline on affected assets, collections, review, ingest, and distribution screens.
- Empty, loading, error, and permission-denied states are required for each route family.
- Keyboard accessibility and visible focus states are required before visual QA can pass.

## Data Model Contract

Mock/demo data must stay coherent across screens and use the same entities, not isolated decorative examples.

- Assets: `asset_id`, `filename`, `type`, `size`, `dimensions`, `color_profile`, `approval_status`, `rights_status`, `license_type`, `license_id`, `expiration_date`, `allowed_channels`, `allowed_regions`, `brand_kit`, `collection`, `tags`, `ai_tags`, `photographer`, `owner`, `uploader`, `created_at`, `updated_at`, `downloads`, `views`, `activity`.
- Collections: `title`, `owner`, `status`, `asset_count`, `description`, `allowed_channels`, `region`, `expiration`, `collaborators`, `permissions`, `public_private_state`.
- Distribution sets: `title`, `type`, `access`, `recipients`, `views`, `downloads`, `expiration`, `watermark`, `password_protection`, `audit_history`.
- Brand kits: `logos`, `colors`, `typography`, `icons`, `templates`, `rules`, `usage_analytics`, `governance_owner`, `version`.
- Compliance events: `timestamp`, `user`, `action`, `asset`, `policy_result`, `severity`, `status`, `remediation_action`.

Required sample entities include Acme Inc., Taylor Morgan, Jordan Kim, Riley Anderson, Casey Nguyen, Spring Campaign 2024, Mountain Lake Hero.jpg, Product Skincare Line.jpg, Architecture Curve.jpg, Profile Portraits Set.jpg, Canyon Light.jpg, and Acme Corporate Brand Kit.

## Acceptance Gates

Each implementation slice must include:

- Screenshot comparison against the relevant PNG(s).
- Desktop 1448x1086 or nearest practical viewport comparison.
- Mobile 390px comparison when route is mobile-relevant.
- `git diff --check`.
- `npm --prefix frontend run typecheck`.
- Focused tests for touched behavior only.
- Browser proof: no console errors, no horizontal overflow, primary controls reachable.
- Written fidelity ledger: prototype evidence, current screenshot evidence, mismatch fixed or intentionally deferred.
- Accessibility proof for touched routes: visible focus, keyboard path for primary controls, non-color-only status meaning, and accessible names for icon-only controls.
- State proof for touched routes: empty, loading, error, and permission-denied states where relevant.
- Interaction proof for touched routes: hover, selected, disabled, drawer/modal, and rights-safe filtering behavior.

Functional tests do not prove visual fidelity.

## Current Drift Ledger

Observed drift to remove before calling visual redesign complete:

- Current portal branch introduced a full-width beta/trust strip above the app workspace. Prototype uses topbar controls and right rails, not a trust strip.
- Current portal branch introduced customer-status/diagnostic cards under the header. Prototype uses filters, cards, rows, and inspector rails; it does not add explanatory safety cards in the first viewport.
- Current portal branch shifted palette toward sage/teal. Prototype uses warm neutral archive surfaces with muted status colors.
- Current portal branch changed app geometry to a full-bleed shell. Prototype uses 22px outer padding, centered app frame, 28px shell radius, and soft shadow.
- Current portal branch widened/rewrapped sidebar brand and changed density. Prototype sidebar is 214px with compact nav and bottom user card.
- Current portal branch turned safety proof into oversized inspector verdict UI. Prototype inspector uses compact action tiles, tabs, and metadata rows.
- Current mobile proof hid beta widgets but then used large spacing workarounds. Prototype mobile collapses the shell directly and does not need extra spacer bands.
- Earlier visual-redesign issues claim completion in comments, but key repo artifacts such as `docs/screenshots/qa/issue-43-final-focused-qa.json` are absent from the current base branch. Completion must be re-proven from current files.

## Issue Slices

Issue number map:

- #61: Slice 0, Contract And Audit.
- #62: Slice 1, Shell Reset.
- #63: Slice 2, Library, Collections, And Search Intelligence Fidelity.
- #64: Slice 3, Asset Detail And Download Fidelity.
- #65: Slice 4, Brand, Governance, Distribution, Settings Fidelity.
- #68: Slice 5, Marketing Landing Page Fidelity.
- #66: Slice 6, External Portal Fidelity.
- #69: Slice 7, Upload And Ingest Fidelity.
- #70: Slice 8, Review And Approvals Fidelity.
- #71: Slice 9, Roles And Access Fidelity.
- #72: Slice 10, Mobile Viewer Fidelity.
- #73: Slice 11, Interaction, State, Accessibility Pass.
- #67: Slice 12, Final Visual QA Pack.

### Slice 0: Contract And Audit

Goal: lock the prototype as the binding source and audit current drift before code.

Deliverables:

- This contract.
- Full 15-surface inventory.
- Shared data model contract.
- Interaction/state/accessibility contract.
- Current UI drift ledger.
- GitHub issue slices linked to parent redesign issue.
- No UI code.

Acceptance:

- Contract references the HTML prototype and all ten PNGs.
- Slices explicitly ban trust strips and diagnostic card drift.
- Slices cover marketing, upload/ingest, review/approvals, roles/access, mobile, and state/accessibility gaps not present in the original seven issues.
- Current open issues are not marked complete unless repo artifacts prove completion.

### Slice 1: Shell Reset

Goal: restore the app shell to prototype proportions and rhythm.

Scope:

- Outer shell/background.
- 214px sidebar.
- 76px topbar.
- 356px inspector rail.
- View padding and max width.
- Typography and token reset.

Out of scope:

- Route-specific layout rewrites.
- New safety UX.

Acceptance:

- Sidebar/topbar/inspector geometry matches PNG 2 and prototype CSS.
- No trust strip or extra status cards.
- Existing safety behavior still gates actions.

### Slice 2: Library And Collections Fidelity

Goal: match PNG 2 and PNG 4 density for library/collections/search surfaces.

Scope:

- Library asset grid/list.
- Collection grid.
- Saved views rail.
- Filter row.
- Search intelligence right rail.
- Inspector selected state.
- Sticky bulk action bar.
- Hover quick actions and selection state.
- AI explainability tags and rights-safe result summary.

Acceptance:

- 3-column desktop cards where prototype shows 3 columns.
- Asset cards use 142px thumbnail rhythm.
- Inspector remains 356px right rail.
- Rights-safe state appears as toggle/filter/chips, not a new banner.
- Bulk actions remain sticky and compact, not a new dashboard card.

### Slice 3: Asset Detail And Download Fidelity

Goal: match PNG 5 and PNG 6.

Scope:

- Asset detail topbar and back link.
- Large image column.
- Metadata/rights card column.
- Download drawer/rendition rows.
- Rights and release tabs.

Acceptance:

- No giant verdict slab.
- Approved-copy/original distinction appears through rendition rows and disabled states.
- Viewer redaction remains intact.

### Slice 4: Brand, Governance, Distribution, Settings Fidelity

Goal: match PNG 7, PNG 8, PNG 9, and PNG 10.

Scope:

- Brand kits.
- Audit/compliance.
- Distribution sets.
- Integrations/settings.
- Admin utility surfaces that map to these patterns.

Acceptance:

- Same card/table/right-rail rhythm as the corresponding PNG.
- No dashboard hero panels beyond prototype KPI cards.
- Safety/admin copy stays short and row-bound.

### Slice 5: Marketing Landing Page Fidelity

Goal: match PNG 1 as a polished investor-demo product story.

Scope:

- Hero headline "A beautiful DAM for teams that need control."
- Subcopy from the product brief.
- Embedded app mockup showing asset grid, selected asset inspector, rights-safe toggle, and download controls.
- Role cards: Viewer, Contributor, Reviewer, Admin.
- Feature row: Rights-safe search, Smart approvals, Metadata governance, Brand consistency, Secure distribution.

Acceptance:

- Landing page uses marketing composition only on the marketing route.
- App mockup matches internal shell geometry, not a separate generic SaaS dashboard.
- No extra trust strip inside app routes.

### Slice 6: External Portal Fidelity

Goal: match PNG 3 for public/collection portal routes only.

Scope:

- Portal top header.
- Full-width hero.
- Floating access card.
- Collection asset grid.

Acceptance:

- Internal app shell is not used for external portal route.
- External portal actions remain gated and honest.
- No ResourceSpace writeback or public launch claim.

### Slice 7: Upload And Ingest Fidelity

Goal: add the requested ingest workflow using prototype-native enterprise density.

Scope:

- Drag-and-drop upload zone.
- Upload queue and progress states.
- Duplicate detection.
- AI tag suggestions.
- Metadata extraction.
- Rights/release checklist.
- Brand kit matching.
- Approval routing.
- Ingest Intelligence right panel.

Acceptance:

- Progress states cover Uploading, Processing, Metadata extracted, Rights check, Needs review, Approved.
- Duplicate and conflict warnings are row/card-bound.
- No source media mutation or fake approval.

### Slice 8: Review And Approvals Fidelity

Goal: add the requested creative review workspace without drifting from the prototype shell.

Scope:

- Large asset preview.
- Annotation pins.
- Comment thread.
- Version comparison.
- Approve, Request changes, Escalate actions.
- Brand/rights/metadata/rendition/collection checklist.
- Reviewer queue and decision history.

Acceptance:

- Approval actions are permission-gated.
- Decision history is visible.
- Reviewer SLA and blocked-by-rights states are compact and row-bound.
- No fake approvals.

### Slice 9: Roles And Access Fidelity

Goal: add the requested admin permissions matrix.

Scope:

- Rows: Viewer, Contributor, Reviewer, Brand Manager, Legal, Admin.
- Columns: View, Download, Upload, Edit metadata, Approve, Share externally, Manage rights, Manage users, Audit logs.
- Inheritance indicators.
- Risk warnings.
- Simulate role view mode.

Acceptance:

- Risky permissions include contextual warning states.
- Matrix is keyboard navigable.
- Simulation affects visible app affordances without changing real permissions.

### Slice 10: Mobile Viewer Fidelity

Goal: add the requested mobile companion view while preserving responsive prototype rules.

Scope:

- Phone-frame presentation for demo surfaces.
- Asset search.
- Asset grid.
- Asset detail bottom sheet.
- Rights-safe badge.
- Quick download.
- Saved views.
- Bottom navigation.

Acceptance:

- Mobile layout has no horizontal overflow at 390px.
- Bottom navigation has no more than five top-level items.
- Rights/download gates remain visible and honest.

### Slice 11: Interaction, State, Accessibility Pass

Goal: prove the product feels connected and production-ready across all implemented surfaces.

Scope:

- Command palette.
- Hover/focus/selected states.
- Rights-safe filtering.
- Download drawer.
- Share/distribution modal.
- Expiration warning remediation.
- Empty/loading/error/permission-denied states.
- Keyboard path and focus management.

Acceptance:

- All primary interactions are reachable by keyboard.
- Focus states are visible and match the design system.
- Disabled/restricted actions explain why and offer allowed recovery where appropriate.
- State fixtures reuse the shared data model.

### Slice 12: Final Visual QA Pack

Goal: prove prototype fidelity across canonical surfaces.

Scope:

- Screenshot matrix for each slice surface.
- HTML prototype screenshot baseline where practical.
- Current implementation screenshots.
- Fidelity ledger.

Acceptance:

- All primary mismatches closed or logged as explicit follow-up issues.
- No horizontal overflow at desktop and mobile.
- Hali visual review can start only after this pack is complete.
