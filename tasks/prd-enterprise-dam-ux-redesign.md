# PRD: Enterprise DAM UX Redesign

## 1. Summary

Redesign TJC Stock Media from a policy-heavy prototype into a real enterprise DAM workspace. The app must lead with assets, rights, approved derivatives, review work, distribution readiness, and audit history.

This PRD converts the desktop and mobile UX critique into an implementation plan. It covers Library, Upload / Intake, Review Queue, Collections, Distribution Sets, Governance / Admin, Help Center, navigation, responsive behavior, shared status language, and reusable DAM components.

## 2. Contacts

| Name | Role | Comment |
| --- | --- | --- |
| Hali | Product owner / operator | Final decision maker for product direction and beta readiness. |
| Rights reviewer | Human approval owner | Approves public/internal use, consent, minors, doctrine, hymn rights, and sensitive context. |
| DAM admin | System owner | Owns ResourceSpace, Google Shared Drive custody, roles, metadata health, audit, and integrations. |
| Contributor | Upload owner | Adds assets, metadata, rights evidence, and source context. |
| Viewer | Media user | Searches and downloads only approved derivatives allowed for their role and usage scope. |

## 3. Background

Current app has strong governance ideas, but screens feel like an internal policy simulator rather than an enterprise DAM. The product explains policy often, but does not yet make asset identity, use permission, derivative availability, review state, evidence, and bulk work obvious.

The critique found these high-risk issues:

- Mobile screens are squeezed, clipped, or too long.
- Library shows no visible assets and an empty inspector.
- Review Queue uses placeholder-like records and unclear decision hierarchy.
- Upload starts with education cards instead of upload work.
- Governance / Admin is one long dense page instead of operator-focused screens.
- Collections and Distribution Sets use confusing terms and disconnected actions.
- Status terms are inconsistent across screens.
- Operational app pages repeat marketing-style footer text.

Project rules still stand:

- Google Shared Drive is the master copy.
- ResourceSpace is the DAM, search, and review layer.
- Approved Public / Internal folders are delivery outputs, not archive truth.
- Source media must not be deleted, renamed, moved, or mutated.
- Every imported asset defaults to `Needs Review / Do Not Publish`.
- Public-use approval requires reviewer, date, usage scope, and notes.
- Humans approve rights. AI only suggests tags.

## 4. Objective

Make the app feel like a controlled, rights-aware enterprise DAM where users can quickly answer:

- What asset is this?
- Who owns it?
- Can I use it?
- Where can I use it?
- Which approved derivative can I download?
- What evidence or approval blocks it?
- What changed, who changed it, and when?

### Key Results

| KR | Target |
| --- | --- |
| KR1: Asset-first Library | At least 12 realistic visible asset records appear in default Library across desktop and mobile. |
| KR2: Status consistency | All screens use one shared status taxonomy and no mixed labels such as `Beta No-Go`, `Smoke Blocked`, or unstructured `Needs Review - Do Not Publish` badges. |
| KR3: Mobile usability | Library, Upload, Review, Collections, Distribution Sets, Governance, and Help pass 320px and 390px screenshot QA with no horizontal clipping. |
| KR4: Workflow clarity | Upload, Review, and Distribution Set screens each expose one primary action and a clear next step. |
| KR5: Rights safety | No collection, package, distribution set, or download flow can bypass item-level asset approval. |
| KR6: Enterprise density | Operational screens use tables, filters, saved views, inspectors, drawers, sticky action bars, and bulk actions where records are involved. |
| KR7: Trust | Placeholder/test labels are removed from user-facing records. Empty states explain filters, permission, or sync status. |

## 5. Market Segments

### Primary: Church media operators

They need to find, review, approve, package, and distribute church media without leaking restricted originals or using media without permission.

### Secondary: Contributors

They need a simple intake path for files, metadata, ownership, consent, and usage scope. They should not need to understand every policy rule before uploading.

### Secondary: Rights reviewers

They need a dense work queue, evidence checklist, preview, decision panel, audit history, and clear blockers.

### Secondary: DAM admins

They need readiness dashboards, metadata health, policy controls, integration status, audit logs, and reports.

## 6. Value Propositions

### For media users

Find safe, approved media quickly. Download the correct derivative without touching source files.

### For reviewers

Review assets faster with evidence, policy result, decision controls, and audit history in one workspace.

### For admins

See operational health: missing evidence, expiring rights, blocked assets, sync health, metadata debt, and risky queues.

### For TJC leadership

Protect people, rights, doctrine, worship context, and source custody while still making media usable for ministry work.

## 7. Solution

### 7.1 UX Direction

Design read: enterprise DAM app redesign for church media operators, with serious B2B workflow language and dense operational surfaces.

Design-taste-frontend note: this skill is not the default for dashboards, tables, or wizards. Apply it only as a taste filter: avoid templated cards, fake data, decorative labels, weak copy, inconsistent status color, and untested mobile layouts. Use product UI patterns instead of landing-page patterns.

Target design dials:

| Dial | Value | Reason |
| --- | --- | --- |
| Design variance | 3 | Enterprise operators need predictable layouts. |
| Motion intensity | 2 | Motion should clarify state changes, not decorate workflow. |
| Visual density | 8 | DAM users need tables, filters, bulk actions, and inspectors. |

Preferred app layout:

- Desktop: sidebar navigation, sticky page header, dense content table/grid, right inspector where useful.
- Tablet: two-pane layouts, drawers for inspectors.
- Mobile: top app bar, bottom navigation, filter drawer, detail bottom sheets, one task per screen.

### 7.2 Information Architecture

Recommended navigation:

| Group | Items |
| --- | --- |
| Media | Library, Collections, Distribution Sets, Recent Uploads |
| Workflow | Upload / Intake, Review Queue, Requests, My Tasks |
| Governance | Rights & Consent, Metadata Health, Policy Center, Audit Log |
| Admin | Users & Roles, Taxonomy, Integrations, Settings |
| Support | Help Center |

Mobile navigation:

- Top app bar with logo, search, and menu.
- Bottom navigation: Library, Upload, Review, Collections, Help.
- Governance and Admin reachable through menu for authorized roles.

### 7.3 Canonical Object Model

| Object | Definition |
| --- | --- |
| Asset | Media record users search, view, and reuse. |
| Source file | Original file. Restricted by default. |
| Derivative | Approved downloadable copy for a specific use. |
| Rights evidence | Consent, ownership, license, release, or usage proof. |
| Review request | Workflow item asking for approval or evidence review. |
| Collection | Curated group of assets for ministry use. |
| Distribution set | Governed package prepared for delivery or export. |
| Policy | Rule that determines use, download, share, and source access. |
| Audit event | Immutable record of decision, change, upload, approval, or access. |

### 7.4 Canonical Status Taxonomy

| Status | Meaning |
| --- | --- |
| Draft | Not submitted. |
| Submitted | Waiting for review. |
| Needs Evidence | Required proof missing. |
| In Review | Reviewer assigned. |
| Approved Internal | Safe for internal use. |
| Portal Ready | Approved derivative available. |
| Restricted | Source or derivative access limited. |
| Blocked | Cannot use until issue is resolved. |
| Expiring Soon | Rights or approval nearing expiry. |
| Expired | Use no longer allowed. |
| Archived | Hidden from normal workflows. |

Semantic color rules:

| Meaning | Treatment |
| --- | --- |
| Approved / Portal Ready | Green |
| Draft / In progress | Slate or blue |
| Needs Review / Needs Evidence | Amber |
| Blocked / Rejected / Expired | Red |
| Internal only | Gray |
| Expiring soon | Orange |
| Source restricted | Purple or locked gray |

### 7.5 Shared Components

Build or standardize these components:

- Asset thumbnail
- Status badge
- Rights badge
- Usage-scope badge
- Saved view tabs
- Filter drawer
- Bulk action toolbar
- Asset inspector
- Evidence checklist
- Review decision panel
- Collection readiness panel
- Distribution readiness panel
- Audit timeline
- Permission notice
- Empty state
- Mobile bottom action bar

### 7.6 User Stories

### US-001: Global Enterprise Navigation

**Description:** As any user, I need navigation that separates media, workflow, governance, admin, and support so I can understand where work belongs.

**Acceptance Criteria:**

- [ ] Desktop uses grouped sidebar navigation.
- [ ] Mobile uses top app bar plus bottom navigation for Library, Upload, Review, Collections, and Help.
- [ ] Authorized Governance / Admin screens are accessible through menu.
- [ ] Global app footer is removed from operational pages.
- [ ] Navigation labels match the new IA.
- [ ] Browser QA covers 1440px, 390px, and 320px.

### US-002: Shared Status System

**Description:** As a DAM user, I need one status language across the product so approval and safety state are clear.

**Acceptance Criteria:**

- [ ] Shared status enum maps all current labels to canonical statuses.
- [ ] No user-facing screen shows `Smoke`, `Beta No-Go`, `No-Go evidence`, or unstructured compound badges.
- [ ] Status badges never look like action buttons.
- [ ] Status colors follow the semantic color rules.
- [ ] Tests cover canonical status mapping.

### US-003: Realistic DAM Seed Records

**Description:** As a user evaluating the DAM, I need realistic asset records so the product does not feel broken or fake.

**Acceptance Criteria:**

- [ ] Replace test-sounding asset names with realistic church media records.
- [ ] Default Library shows visible records unless filters truly exclude everything.
- [ ] Each record includes asset ID, title, type, collection, rights status, usage scope, owner, last updated, and thumbnail.
- [ ] Review Queue records include evidence state and decision history.
- [ ] Seed data does not include real sensitive media unless explicitly approved.

### US-004: Enterprise Library

**Description:** As a Viewer or Reviewer, I want an asset-first Library with search, filters, saved views, table/grid modes, and an inspector.

**Acceptance Criteria:**

- [ ] Header says `Library`.
- [ ] Global search supports title, tag, ministry, event, speaker, filename, and asset ID.
- [ ] Saved views include Portal Ready, Needs Review, People / Minors, Expiring Soon, and Internal Only.
- [ ] Filter bar includes Type, Ministry, Rights, People, Date, Collection, and Usage scope.
- [ ] Table mode is default for enterprise roles.
- [ ] Grid mode remains available.
- [ ] Right inspector shows preview, title, asset ID, approved derivative, source access request, rights status, allowed use, people/minors signal, collections, audit history, and related assets.
- [ ] Empty state explains filters, permission, or sync state and offers Clear filters, Request access, and View recent uploads.

### US-005: Upload / Intake Wizard

**Description:** As a Contributor, I want upload to start with files and guide me through metadata, rights, usage scope, and review.

**Acceptance Criteria:**

- [ ] Upload screen starts with drag/drop, folder upload, and source link options.
- [ ] Wizard steps are Files, Metadata, Rights & Consent, Usage Scope, Review & Submit.
- [ ] File step shows validation, duplicate detection, batch count, and upload progress.
- [ ] Metadata step captures title, ministry, event, date, location, speaker/people, tags, collection, and description.
- [ ] Rights step captures owner/license, consent release, minors/youth, public use, internal-only, expiry, and proof link/document.
- [ ] Usage step supports Website, Social, Newsletter, Slides, Print, Archive only, Internal training, and Not for distribution.
- [ ] Review step shows uploaded files, missing required fields, rights warnings, duplicate warnings, and final submit.
- [ ] Primary action is `Submit for review`.
- [ ] Submission copy states once that submission does not publish assets.

### US-006: Review Queue Console

**Description:** As a Reviewer, I want a three-pane console for queue triage, asset review, and decision controls.

**Acceptance Criteria:**

- [ ] Desktop layout has left worklist, center asset review, and right decision panel.
- [ ] Worklist supports queue filters, SLA, assigned reviewer, status, priority, and bulk actions.
- [ ] Center pane includes preview, asset title, metadata, rights evidence, source/derivative relationship, comments, and audit history.
- [ ] Decision panel includes required checklist, missing evidence, policy result, recommended action, and final decision controls.
- [ ] Actions are Approve derivative, Request evidence, Restrict use, Reject, Escalate, and Save decision.
- [ ] Sticky action bar remains available without hiding content.
- [ ] Next asset respects active filters.
- [ ] Queue counts match navigation badges.
- [ ] Mobile shows queue list first, then detail, with sticky decision actions.

### US-007: Evidence Checklist

**Description:** As a Reviewer, I need evidence requirements to show state, owner, and blocker clearly.

**Acceptance Criteria:**

- [ ] Checklist rows include requirement, state, and owner.
- [ ] Requirements include owner/license evidence, people/minors consent, usage scope, public use policy, and approved derivative.
- [ ] Checklist state uses Missing, Needs review, Complete, Blocked, and Not generated where applicable.
- [ ] Public approval remains blocked when required evidence is missing.
- [ ] Checklist is shared between Review Queue, asset inspector, and Distribution readiness.

### US-008: Collections Cabinet

**Description:** As a ministry user, I want Collections to behave like curated groupings, not packages or approval layers.

**Acceptance Criteria:**

- [ ] Header says `Collections`.
- [ ] Collection list uses table/list with collection name, ministry, use case, asset count, ready assets, needs review, owner, last updated, status, and actions.
- [ ] Detail panel shows summary, asset readiness, approved derivatives, blocked assets, create distribution set, and open collection media.
- [ ] Confusing actions are renamed: `Create distribution set`, `Create package`, `View details`, `Open collection`, and `Review asset readiness`.
- [ ] Copy makes clear collections do not override item-level approval.
- [ ] Mobile uses collection cards, no side-by-side inspector.

### US-009: Distribution Set Builder

**Description:** As a communications teammate, I want a readiness-driven package builder that only includes approved derivatives.

**Acceptance Criteria:**

- [ ] Top summary shows draft name, destination/channel, owner, status, readiness percentage, blockers, and last saved.
- [ ] Layout includes sections, asset references table, and readiness inspector.
- [ ] Asset references table includes thumbnail, asset title, required flag, approved derivative, rights status, source restricted, blockers, section, and actions.
- [ ] Primary action is `Add approved assets`.
- [ ] Secondary actions include Run readiness check, Generate package, and Export manifest.
- [ ] Export is disabled until blockers are resolved.
- [ ] Empty section copy says `Add approved assets to the Cover section` and explains source files remain restricted.
- [ ] Governance recomputes item-level readiness before save/export.

### US-010: Governance Dashboard Split

**Description:** As a DAM Admin, I need governance split into focused screens rather than one long audit dump.

**Acceptance Criteria:**

- [ ] Add Governance Dashboard with approval health, missing evidence, expiring rights, blocked assets, SLA, and recent policy changes.
- [ ] Add Rights & Consent screen for evidence records, missing consent, expiring licenses, and minors/youth review.
- [ ] Add Metadata Health screen for required fields, taxonomy drift, duplicate candidates, and orphaned records.
- [ ] Add Policy Center for download gates, public use rules, source restrictions, and role permissions.
- [ ] Add Audit Log with immutable activity feed, reviewer decisions, downloads, access requests, and policy changes.
- [ ] Add Integrations screen for ResourceSpace, portal, storage, identity provider, and sync health.
- [ ] Rename internal labels: Release readiness, Blocking evidence, Integration health, Approval gates, Source custody model.

### US-011: Help Center Integration

**Description:** As any user, I want help to be contextual and connected to workflow, not the main way to understand product status.

**Acceptance Criteria:**

- [ ] Help Center keeps its stronger visual structure.
- [ ] Help includes role-based cards, My open requests, Recently viewed help, policy search, Request access, and Report rights issue.
- [ ] Operational screens can open contextual help in a side drawer.
- [ ] Help footer may remain on Help pages only.
- [ ] Product screens explain status and next action without sending users to Help first.

### US-012: Mobile Navigation And Layout Reliability

**Description:** As a mobile user, I need every main screen to be usable without compressed desktop panes.

**Acceptance Criteria:**

- [ ] Mobile uses single-pane layouts.
- [ ] Filters open in drawers.
- [ ] Detail appears as a page or bottom sheet.
- [ ] Sticky bottom CTA appears where one primary action exists.
- [ ] No page has horizontal overflow at 320px or 390px.
- [ ] Buttons do not wrap awkwardly or overlap text.
- [ ] Tables convert to cards or scrollers with clear column priority.

### US-013: Button And Action Hierarchy

**Description:** As a user, I need actions to clearly distinguish primary commands, secondary commands, tertiary links, statuses, disabled states, and destructive actions.

**Acceptance Criteria:**

- [ ] One primary action per page or major workflow state.
- [ ] Secondary actions are outlined or low-emphasis.
- [ ] Tertiary actions are text buttons.
- [ ] Status labels are never styled as buttons.
- [ ] Disabled actions are visibly disabled and include a reason when blocked.
- [ ] Destructive actions require confirmation.
- [ ] Primary action labels use the recommended verbs: Upload files, Submit for review, Approve derivative, Add approved assets.

### US-014: Enterprise Visual System

**Description:** As a user, I need operational screens to feel serious, scannable, and trustworthy.

**Acceptance Criteria:**

- [ ] Operational typography uses neutral enterprise sans-serif and 13-14px table body text.
- [ ] Large expressive headings are limited to Help or onboarding.
- [ ] Page padding follows 24px desktop, 16px tablet, 12-16px mobile.
- [ ] Table row height is 48-56px.
- [ ] Inspector width is 360-420px on desktop.
- [ ] Cards are used for summaries and inspectors, not every record list.
- [ ] Repeated item records use tables, dense rows, or well-scoped cards.
- [ ] Shadows and radius are restrained.
- [ ] No operational screen uses marketing-style hero blocks.

### US-015: Audit Trail Surfacing

**Description:** As a Reviewer or Admin, I need to see decisions, downloads, access requests, and policy changes near the work they affect.

**Acceptance Criteria:**

- [ ] Asset inspector includes asset audit history.
- [ ] Review Queue center or right pane includes decision history.
- [ ] Distribution readiness shows readiness check history.
- [ ] Governance Audit Log supports filters by actor, asset, event type, date, and status.
- [ ] Viewer-facing audit information remains role-safe.

### US-016: Browser QA And Acceptance Packet

**Description:** As the product owner, I need screenshot and smoke evidence proving the redesigned UX works on desktop and mobile.

**Acceptance Criteria:**

- [ ] Screenshot QA covers Library, Upload, Review, Collections, Distribution Sets, Governance/Admin, and Help.
- [ ] Viewports include 1440px, 390px, and 320px.
- [ ] QA checks horizontal overflow, clipped text, overlapping controls, blank inspectors, missing thumbnails, footer leakage, and confusing disabled actions.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] Existing smoke commands still pass or documented blockers are explicit.

### 7.7 Copy Standards

Use these replacements:

| Current | Replacement |
| --- | --- |
| Approved derivative is the safe copy | Use approved derivatives for distribution |
| Source/original access is restricted by default | Source files require approved access. |
| Send media for review | Upload assets for review |
| Never from Send | Submission does not publish assets. |
| Start toolkit draft | Create distribution set |
| No governed references selected | No approved assets added to this section |
| Ticket Smoke Blocked | Real asset title and ID |
| Beta No-Go | Release readiness blocked |
| Open selected | Open selected collection |

### 7.8 Assumptions

- Current implementation can support a UI-first redesign without changing source custody rules.
- Existing ResourceSpace-backed or seeded records can provide realistic mock data without exposing sensitive media.
- Reusable components can be built incrementally without rewriting every route at once.
- Some Governance / Admin split screens may initially reuse current data modules.
- Mobile usability requires real layout changes, not smaller desktop panes.

## 8. Release

### Phase 1: Foundation

Deliver:

- Canonical object model in UI terms.
- Canonical status system.
- Global navigation and mobile nav.
- Responsive shell breakpoints.
- Realistic DAM seed records.
- Shared asset, status, rights, evidence, inspector, and empty-state components.

Exit criteria:

- Library no longer appears empty by default.
- Mobile nav exists and screens do not squeeze desktop panes.
- Status labels are consistent.

### Phase 2: Core DAM

Deliver:

- Rebuilt Library table/grid.
- Asset inspector.
- Saved views and filter bar.
- Approved derivative download affordance.
- Source access request affordance.

Exit criteria:

- A Viewer can find a Portal Ready derivative and understand allowed use.
- A blocked asset clearly explains why it cannot be used.

### Phase 3: Workflow

Deliver:

- Upload / Intake wizard.
- Review Queue console.
- Evidence checklist.
- Decision history and audit trail.
- Sticky review actions and mobile review detail flow.

Exit criteria:

- A Contributor can submit assets for review without policy confusion.
- A Reviewer can decide, request evidence, restrict, or reject from one workspace.

### Phase 4: Governance And Distribution

Deliver:

- Collections cabinet.
- Distribution Set builder.
- Governance dashboard split.
- Rights & Consent, Metadata Health, Policy Center, Audit Log, and Integrations screens.
- Export/package manifest readiness gate.

Exit criteria:

- A distribution set cannot export with blocked assets.
- DAM Admin can see readiness, metadata health, policy gates, audit, and integration state without one giant page.

### Phase 5: Acceptance And Handoff

Deliver:

- Browser QA screenshots.
- Mobile overflow report.
- Typecheck/build proof.
- UX acceptance scorecard.
- Known limitations and follow-up backlog.

Exit criteria:

- Product feels like a controlled enterprise DAM, not a help portal or policy prototype.
- Every primary screen supports: search assets, verify rights, use approved derivative, request review/access when blocked, build governed collections/distribution sets, and audit everything.

## Ralph Conversion Note

Do not convert this PRD into `prd.json` until autonomous execution is explicitly confirmed. Current repo already has an existing `prd.json` from a prior Ralph run, and overwriting it would change execution state.
