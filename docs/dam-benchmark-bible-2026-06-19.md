# DAM Benchmark Bible

Date: 2026-06-19

This document turns the DAM benchmark findings into implementation requirements for the TJC Stock Media beta. It is not vendor copy. It records observed product patterns, repeated user pain, and the practical rules this repo must follow before the portal can be trusted by teammates.

## 1. Platforms Studied

The benchmark set covered enterprise, mid-market, nonprofit-friendly, and lightweight DAM tools:

- Bynder
- Brandfolder
- Canto
- PhotoShelter
- Acquia DAM / Widen
- Adobe Experience Manager Assets
- Frontify
- Cloudinary
- MediaValet
- Aprimo
- Orange Logic
- OpenText
- Air
- ResourceSpace
- Stockpress

The useful comparison point is not which platform has the most features. The useful comparison point is which recurring patterns reduce search confusion, rights risk, duplicate drift, upload friction, and admin complexity.

## 2. Sources/Categories Reviewed

The findings came from public product documentation, help center workflows, product UI screenshots where available, official demos, feature pages, pricing/packaging signals, support articles, and user-review themes. Vendor marketing pages were treated as tone evidence only. Real app UI, docs screenshots, and support workflows were weighted more heavily than hero pages or promotional mockups.

The categories reviewed were:

- Search, filters, saved views, and asset-bank browsing.
- Metadata schemas, custom fields, taxonomy, and AI suggestions.
- Upload, intake, contributor workflows, and bulk import patterns.
- Review, comments, approvals, task queues, and workflow states.
- Rights, DRM, expiration, consent, download gates, and audit.
- Collections, portals, packages, share links, and delivery outputs.
- Renditions, derivatives, versioning, duplicate detection, and original access.
- Roles, permissions, SSO, API, connectors, analytics, and admin controls.

## 3. Best DAM Features By Platform

Bynder sets a strong pattern for asset-bank browsing, permission-dependent actions, selected-state bulk controls, asset detail with metadata/rights/action rails, versions, related files, and governed download options.

Brandfolder is strongest as a self-service brand library: clear collection-local search, sections/labels, pinned or saved searches, sparse card actions, upload packets, and asset detail focused on preview plus governed download.

Canto is useful for a friendly library model: visual grid, albums, portals, simple sharing, and approachable metadata tools that do not feel like an engineering console.

PhotoShelter contributes event and photography workflows: galleries, proofing, contributor delivery, controlled public presentation, and high-volume image review.

Acquia DAM / Widen is strong on collections, portals, share pages, metadata-driven search, visible result controls, and enterprise governance without making every user an admin.

Adobe AEM Assets is strongest for enterprise-grade asset operations: facets, schemas, renditions, properties, permissions, folders, metadata panels, versioning, and workflow depth. Its density belongs in reviewer/admin areas, not default viewer screens.

Frontify contributes brand-governance patterns: guidelines, asset usage context, brand portals, approval language, and controlled self-service for non-DAM specialists.

Cloudinary contributes derivative, transformation, media optimization, API, CDN, and rendition thinking. Its technical model is useful after asset truth and rights are settled.

MediaValet contributes library, taxonomy, permissions, portals, and enterprise adoption patterns with a focus on searchability and team enablement.

Aprimo contributes content-operations seriousness: rules, workflow, compliance, approvals, campaign context, and metadata governance. It is more useful as an admin/workflow reference than a viewer layout reference.

Orange Logic and OpenText contribute large-enterprise governance patterns: complex security, workflow, records, permissions, integrations, and audit requirements.

Air and Stockpress contribute lightweight team workflows: fast upload, comments, review, simple sharing, and visual collaboration. Their best ideas are speed and clarity, not rights authority.

ResourceSpace is the most directly relevant system boundary for this app. It supports metadata/custom fields, collections, permissions, workflows, API access, derivatives, and uploads/writes. For TJC, it remains the DAM truth layer and admin/support-zone boundary.

## 4. Repeated User Complaints

Across DAM products, users repeatedly complain about inconsistent search, missing or weak metadata, confusing filters, hard-to-understand permissions, duplicate and version confusion, upload friction, slow UI, poor mobile behavior, onboarding complexity, admin setup burden, migration pain, metadata loss, and AI results that need human correction.

The most important lesson for TJC: users do not trust a DAM because it has many features. They trust it when search results explain themselves, unsafe actions are clearly blocked, metadata is visible enough to guide decisions, and the system never implies an asset is usable before rights are reviewed.

## 5. Repeated User Praise

Users praise DAMs when they make assets easy to find, keep filters understandable, expose rights and expiration clearly, reduce duplicate work, support saved searches and collections, make sharing controlled but quick, keep upload forms predictable, provide useful previews and renditions, and give admins clear audit trails.

They also praise systems that separate everyday browsing from admin complexity. The best products let normal users search and request assets without seeing schema names, API references, source paths, original filenames, or backend workflow internals.

## 6. Top Workflow Patterns

The strongest workflow pattern is asset-bank discovery followed by item-level trust. A user starts with search, filters, saved views, or collections, then opens an asset detail page that answers: what is this, can I use it, for which channel, what is missing, and what is the next safe action?

The second pattern is intake before publishing. Uploads create review work, not approved media. The contributor supplies context, rights hints, people/minor status, source type, intended usage, and notes. A reviewer decides status later.

The third pattern is review queues with evidence lanes. Reviewers need grouped work for missing metadata, rights concern, people/minors, sensitive context, expired approval, duplicate/version conflict, derivative gap, and pending write.

The fourth pattern is delivery through collections, portals, packages, or share links. These surfaces are outputs and workspaces, not permission truth. Every export still checks item-level approval, rights, channel, consent, lifecycle, and approved-copy readiness.

The fifth pattern is admin support tooling. Admins need connectors, field maps, sync health, audit, duplicate resolution, and readiness checks. Normal users should not see those internals.

## 7. Top UI/UX Patterns

Top DAM UIs use a stable shell, a strong search bar, visible result counts, filter chips, left or collapsible filter rails, sortable grids, quick preview, asset cards with restrained metadata, and a detail page with a large preview plus a right-side decision rail.

Good DAM UIs keep the main viewer experience quiet. They show asset title, thumbnail/preview, basic tags, event or collection context, rights state, reuse tier, and one next action. They do not expose backend custody details or make the viewer decode DAM terminology.

Admin and review screens can be denser. They need tables, queues, side inspectors, metadata panels, workflow states, audit facts, and field-level evidence. Density is acceptable when the user is deciding rights or operating the system.

Mobile weakness is a repeated complaint, so core viewer flows must remain usable on small screens: search, preview, rights state, request action, and blocked-action explanation.

## 8. Top Metadata/Taxonomy Patterns

Metadata must be structured, role-safe, and separated by purpose:

- Provenance metadata: source system, source account, source album/folder, import batch, custody status, checksum, original filename, ResourceSpace reference.
- Discovery metadata: title, media type, event, date, location, visible content tags, TJC terms, brand/use terms, language, church/region.
- Rights metadata: rights status, rights basis, consent, people/minors, usage scope, approved channels, required notice, expiration/recheck, reviewer, review date, notes.
- Sensitivity metadata: sacrament, worship, doctrine, minors/youth, testimony, pastoral/private, music/hymn, internal governance.
- Operational metadata: duplicate group, version, derivative readiness, workflow state, pending write state, audit events.
- AI metadata: suggestions only, always separate from human-approved fields.

TJC taxonomy must support church-specific discovery without overclaiming rights. Terms such as baptism, Holy Communion, footwashing, Sabbath, worship, sermon, choir, RE, youth, testimony, and Hymns of Praise should route review or improve search, but they must not approve public use by themselves.

## 9. Rights/Permissions Model

Rights must be item-level, evidence-based, and role-aware. Public use requires reviewer, review date, usage scope, notes, rights basis, approved channel, people/minors decision, consent evidence when needed, domain reviewer when sensitive, current lifecycle dates, and approved-copy readiness.

Roles must stay distinct:

- Viewer can search redacted assets, preview safe read models, see trust state, request reuse, and draft packages where enabled.
- Contributor can submit intake packets and source context, but cannot approve, publish, mutate source media, or claim live DAM writeback.
- Reviewer can decide internal/public/hold states only with required evidence and notes.
- DAM Admin can operate readiness, feedback, audit, integrations, and field mapping, but cannot declare beta readiness without owner signoff.

Downloads require approved-copy gates. Original/master access remains request-only. Collections, saved searches, and packages never override item-level rights.

## 10. Upload/Contributor Model

Contributor upload is intake, not publication. The contributor-facing flow should ask for the smallest set of useful fields: title/name, event or source context, contributor, rights/source type, usage intent, people/minors visible, and notes. Date may default from EXIF or export metadata when reliable, but wrong dates should be flagged for correction.

Large video/audio and complex source batches should route to Shared Drive Incoming or admin intake. Browser upload should focus on light photos/graphics and review-ready packets.

Every submitted asset defaults to Needs Review / Do Not Publish. Upload success should say the intake packet was received or queued for review. It must not say the asset was imported into ResourceSpace, written back, approved, public, or download-ready unless a live authoritative confirmation exists.

## 11. Review/Admin/Support-Zone Model

Reviewers need a workbench that groups risk and missing evidence. Required lanes are risk triage, missing evidence, stale review, derivative gap, duplicate/version issue, taxonomy/AI review, and pending write.

Admins need a support zone for readiness, source health, ResourceSpace status, audit state, field maps, connector status, feedback, launch blockers, and backup/restore evidence. The support zone may show operational summaries and references needed to troubleshoot. It must still avoid casual exposure of raw custody paths, checksums, signed URLs, secrets, and private evidence.

Reviewer and admin screens may mention ResourceSpace when needed. Viewer and contributor screens should speak in product language: review status, request reuse, approved copy, missing rights, or needs evidence.

## 12. Church/Media-Specific Requirements

Church media has higher risk than generic brand photography. The system must treat people, minors, sacrament, worship, sermon, music, testimony, pastoral/private moments, member-sensitive media, and internal governance as first-class review domains.

Public approval must be blocked or degraded back to review when consent, rights basis, approved channel, required notice, domain reviewer, reviewer note, lifecycle dates, withdrawal status, or approved-copy evidence is missing.

Hymn/music media needs rights basis, approved channels, required notice when applicable, and a music-rights reviewer. Youth/minor media needs consent/release evidence or a documented exception and RE/minors review. Sacrament/doctrine media needs doctrine review. Testimony or pastoral-sensitive media needs a reviewer who understands the context.

Approved Public is not enough by itself. The portal should expose Portal Ready only when all required evidence is current.

## 13. ResourceSpace Truth Boundary

ResourceSpace is the DAM truth layer for asset records, metadata/custom fields, collections, permissions, workflows, derivatives, and confirmed API writes. The portal renders role-safe read models and workflow affordances around that truth.

For this app, ResourceSpace remains an admin/support-zone boundary. Contributor and public-facing surfaces must never expose source paths, master paths, checksums, original filenames, ResourceSpace API details, field IDs, field refs, pending write internals, signed URLs, private notes, or claims that queued state is authoritative.

Portal audit, local JSONL, package drafts, browser upload packets, and queued write attempts are accountability or intake state. They do not approve media, grant permission, replace ResourceSpace, or prove writeback. A ResourceSpace write is truth only after the live API confirms it and the record can be re-read.

Upload intake is not ResourceSpace writeback. The UI, tests, and docs must keep that sentence true.

## 14. Current Repo Gaps

The current repo has strong policy language and many guardrails, but the beta gap is proof and polish, not feature imagination.

Current gaps to close:

- Hosted content proof for the intended beta source is still required. Local sanitized catalog proof is not the same as hosted authenticated proof.
- Durable audit/download behavior is unsettled. Downloads must either use real durable ticket/audit storage or stay intentionally fail-closed with tester instructions.
- ResourceSpace/local Docker smoke is not fully proven when Docker or live services are unavailable.
- Backup/restore proof is incomplete for any live database-backed beta state.
- Production environment posture still needs a redacted owner-confirmed record.
- Owner signoff remains the final GO/NO-GO gate.
- Viewer/contributor copy must stay free of source-system internals, ResourceSpace field language, and writeback overclaims.
- Search and filter polish still matters: results need clear counts, facets, empty states, saved-view language, and no confusing permission shortcuts.
- Package and collection flows must keep item-level approval visible and avoid implying package-level approval.

## 15. Beta-Now Implementation List

Implement or verify these before a teammate beta:

- Redacted hosted library with authenticated proof of the intended beta source and record count.
- Library search with visible result count, simple facets, filter chips, sort, empty state, and no source-field leakage.
- Asset detail with preview, human title/tags, event/source context in safe language, trust state, reuse tier, missing evidence, and next safe action.
- Contributor intake packet with required context fields and clear Needs Review / Do Not Publish result.
- Review workbench with risk lanes, missing evidence, stale review, derivative gap, duplicate/version issue, AI/taxonomy review, and pending write state.
- Rights gate that blocks public/download/package export without reviewer, date, usage scope, notes, rights basis, channel, consent where needed, lifecycle, and derivative readiness.
- Download behavior that is either durable and audited or explicitly blocked as audit-required.
- Package builder that checks every item and cannot export unsafe assets.
- Role-safe shell that shows current role, beta boundary, and blocked-action next steps.
- Admin readiness page with hosted proof, audit status, storage mode, backup/restore evidence, ResourceSpace status, and owner signoff status.
- Source redaction tests for viewer/contributor API payloads and UI copy.
- Writeback wording guard: no queued portal state may claim ResourceSpace truth.

## 16. Post-Beta Roadmap

After beta, build toward production DAM maturity:

- Live ResourceSpace connector/sync with confirmed writeback and re-read verification.
- Google Shared Drive connector/sync as Phase 2 master-custody integration.
- Durable identity-backed audit, ticket, feedback, package, request, and review storage.
- Clean backup/restore drills for all production state.
- SSO/RBAC integration and admin user lifecycle.
- AI tagging/search after human-review policy and suggestion-review queues are stable.
- Duplicate/version resolution with checksum and visual-similarity support.
- Advanced saved searches, portals, expiring share links, and package delivery.
- Approved derivative storage/CDN pipeline with rendition rules.
- Analytics for search misses, blocked downloads, review throughput, stale approvals, and package safety.
- Mobile refinement for search, preview, request, and contributor intake.
- Full archive import/review tiering without implying all assets are approved.

## 17. Page-By-Page Redesign Requirements

Shell/navigation: show role, beta boundary, primary workflows, and safe next action. Hide routes that a role cannot use. Use plain product language instead of backend nouns.

Library/Find: provide search-first browsing, visible result count, sort, grid/list where useful, clear facets, selected filter chips, saved-view affordance, and empty states that suggest safe next searches.

Asset Detail/Media Record: center the preview and title. Use a decision rail for trust state, reuse tier, usage scope, approved channels, missing evidence, request/download action, and blocked reasons. Admin-only provenance stays out of viewer detail.

Upload/Send: use a step flow for context, people/rights, files/source, and review packet. End with intake received/queued, never published/imported/writeback language.

Review Queue: show lanes, selected item inspector, evidence checklist, notes, hold/release decisions, reviewer/date/scope requirements, and disabled actions with exact missing evidence.

Requests/My Tasks: show user-owned requests, review state, requested use, next step, and blocked reason. Do not expose admin evidence or original access internals.

Collections/Packages: show curated groups, preview mosaics, item counts, readiness counts, blocked items, and per-item safety. Package export remains blocked until every item passes.

Admin/Governance: show hosted source proof, storage posture, audit/ticket behavior, ResourceSpace status, field-map health, backup/restore proof, launch blockers, and signoff status.

Brand Hub/Portals: present approved delivery outputs and guidance only. Never treat a portal, package, or collection as approval truth.

Insights: report operational trends only when data is durable enough to trust. Search misses, stale approvals, blocked downloads, review throughput, and package blockers are higher priority than vanity metrics.

## 18. Component/Design-System Requirements

Required components:

- App shell with role badge, beta boundary, and route-level access.
- Search toolbar with query, result count, sort, view switch, saved-view control, and filter reset.
- Filter rail/drawer with plain labels, counts where reliable, and chips for active filters.
- Asset card with thumbnail, title, basic tags, trust badge, reuse cue, and restrained actions.
- Media preview panel with stable image/video/document states and clear derivative/original distinction.
- Rights/status badge system for Needs Review, Approved Internal, Portal Ready, Do Not Use, expired, blocked, and pending.
- Evidence checklist for reviewer/admin pages.
- Upload dropzone with required context fields, progress, draft state, and queued/review result.
- Review data table with lane grouping, selected inspector, disabled action reasons, and note capture.
- Package item safety list with per-item blocker explanations.
- Dialogs for hold, approve, request access, download terms, and blocked action details.
- Toasts and inline feedback that say what happened, what did not happen, and what to do next.

Design rules:

- Use compact enterprise spacing and stable dimensions.
- Keep viewer pages calm and sparse; keep reviewer/admin pages dense but organized.
- Do not nest cards inside cards.
- Do not let button labels, badges, or blocked reasons overflow on mobile.
- Use consistent language for source, approved copy, request, review, blocked, queued, and ResourceSpace truth.

## 19. Test/Guard Requirements

Required guards:

- Viewer/contributor payloads do not expose source paths, master paths, checksums, original filenames, signed URLs, ResourceSpace internals, private notes, secrets, or field refs.
- Upload intake never claims ResourceSpace writeback or public approval.
- Pending write state never renders as authoritative DAM truth.
- Public/download/package actions fail closed when required rights evidence is missing.
- Approved Public does not equal Portal Ready unless all domain evidence and derivative readiness pass.
- Package export checks every item and fails on one blocked asset.
- AI suggestions cannot set final tags, rights, consent, minors, doctrine, hymn clearance, reviewer identity, or approval.
- Search/filter/saved-view behavior cannot create permission truth.
- Role matrix is enforced at route, action, payload, and visible-copy levels.
- Hosted beta proof validates source count, redaction, build marker, auth, and role behavior.
- Durable audit/download behavior is tested, or fail-closed audit-required behavior is asserted.
- Browser QA covers library search, asset detail, upload intake, review queue, package blocker, admin readiness, and mobile viewer flow.

## 20. Final Exit Gate

Exit to teammate beta only when all of these are true:

- Hosted protected URL is current and proves the intended beta source and record count.
- Named Viewer, Contributor, Reviewer, and DAM Admin personas can log in and see only their allowed surfaces.
- Viewer and contributor surfaces contain no source paths, checksums, original filenames, ResourceSpace internals, private URLs, field refs, or writeback claims.
- Upload creates review intake only and defaults to Needs Review / Do Not Publish.
- Download and package export are either durably audited or intentionally blocked with clear tester instructions.
- Review actions require reviewer, date, usage scope, notes, and domain evidence.
- ResourceSpace remains truth; portal sidecar state is labeled as intake, audit, draft, pending, or queued.
- Backup/restore, environment posture, storage mode, and hosted readiness evidence are recorded.
- Owner signoff names testers, roles, triage owner, stop-test owner, timestamp, evidence, and final GO/NO-GO.
- Tests and guards pass for redaction, role access, rights gates, upload wording, package safety, and hosted beta behavior.

If any gate fails, the correct state is not "almost beta." The correct state is a local rehearsal or fail-closed hosted preview with the blocker named plainly.
