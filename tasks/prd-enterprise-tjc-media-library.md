# PRD: Enterprise TJC Media Library

## Introduction

TJC Stock Media should become a TJC-only governed media library, not a generic stock-photo bucket. The product must preserve the current source-of-truth model:

- Google Shared Drive is the master-original warehouse.
- ResourceSpace is the DAM/search/review truth.
- The portal is a role-aware policy workbench and safe delivery surface.
- Approved Public/Internal folders are delivery shelves, not the full archive.
- Source media is never renamed, moved, deleted, or mutated by the portal.
- Every imported asset defaults to `Needs Review / Do Not Publish`.
- Public-use approval requires reviewer, review date, usage scope, and notes.
- AI may suggest descriptive tags, but humans approve rights, doctrine, minors, and public reuse.

This PRD converts the deep research report, repo audit, meeting notes, and agent audit lanes into an enterprise-ready implementation plan. It intentionally separates teammate beta readiness from production internal launch and full-archive-capable infrastructure.

## Evidence Base

Inputs reviewed:

- `/Users/halim4pro/Downloads/deep-research-report.md`
- `PRODUCT.md`
- `DESIGN.md`
- `tasks/prd-approved-library-pilot.md`
- `tasks/prd-premium-enterprise-dam-architecture.md`
- `docs/metadata-schema.md`
- `docs/resourcespace-integration.md`
- `docs/import-runbook.md`
- `docs/data-engineering-playbook.md`
- `docs/runs/dam-10-10-ceo-cto-audit-2026-06-11.md`
- Obsidian Stock Media notes under `/Users/halim4pro/Desktop/Obsidian_Vault/MVP-Intern/20 Projects/Stock Media/`

Meeting-note reconciliation:

- The May 29 and June 2 notes favored no-spend V1, Google Photos/Drive first, and DAM only after inventory/search/access proved need.
- The current repo has moved beyond that exploratory posture into a ResourceSpace-backed DAM pilot.
- The enterprise path should still preserve the meeting-note caution: no broad spending by default, no source mutation, no blind migration, short stakeholder presentation language, and tiered launch gates.

## Goals

- Let a TJC worker find a rights-safe approved media asset in under 60 seconds.
- Make every role see what is safe, what is blocked, what evidence exists, and what the next operating move is.
- Make doctrine, hymn rights, minors/consent, testimony sensitivity, and preservation status first-class fields.
- Keep ResourceSpace as the authoritative DAM layer while adding production-grade sidecars only where the current beta needs durable state.
- Prove beta, production, and archive readiness through executable checks, not stale docs.
- Preserve provenance and duplicate membership for every imported source album/folder.
- Prevent collections, packages, brand hubs, thumbnails, and download links from bypassing item-level policy.

## Non-Goals

- No public SaaS, marketplace, billing, pricing, or unauthenticated gallery.
- No replacement of ResourceSpace as the DAM source of truth.
- No replacement of Google Shared Drive as master-original custody.
- No bulk import of every church file.
- No deletion, move, rename, or mutation of source media.
- No fake ResourceSpace writeback, fake ZIP/package delivery, fake S3 delivery, or fake public approval.
- No AI final approval of rights, doctrine, minors, testimony sensitivity, or public-safe status.

## Launch Ladder

### Stage 1: Teammate Beta

Purpose: prove the governed workbench with limited seed media and honest blockers.

Required gates:

- Local and hosted beta smokes pass.
- Browser QA covers Viewer, Contributor, Reviewer, DAM Admin, desktop, tablet, and mobile.
- Viewer payloads redact source paths, original filenames, checksums, private URLs, and ResourceSpace internals.
- Unsafe downloads stay blocked.
- Review decisions either queue pending writes or sync live with explicit proof.
- Admin readiness labels SSO, ResourceSpace writeback, durable storage, and S3 as beta/staging/production truthfully.
- Sensitive/youth/copyright-risk seed media is excluded unless a reviewer explicitly approves beta visibility.
- Stop testing immediately if a Viewer sees private paths, source originals, checksums, unapproved media as usable, or if testers confuse beta role switching with production auth.

### Stage 2: Production Internal

Purpose: private church staff/team use with real identity, durable state, and operational ownership.

Required gates:

- Production SSO or Cloudflare Access is live; query/body role switching is disabled.
- ResourceSpace field map is verified in staging.
- Live ResourceSpace writeback smoke passes on a staging record.
- Durable pending writes, package drafts, saved searches, feedback, audit, and usage events are configured.
- Backup automation exists and latest backup includes database, filestore, configs, manifests, and exports.
- Clean-host restore proof exists and includes app boot, login/access, search, blocked unsafe download, and approved-copy download.
- Production launch stops if restore fails, SSO smoke fails, beta query roles override trusted identity, backup target is not separate, ResourceSpace writeback overclaims success, or private delivery leaks to Viewer/Contributor.

### Stage 3: Full-Archive-Capable

Purpose: long-term DAM/archive operations across photos, video, audio, publications, graphics, and historical media.

Required gates:

- Archive custody audit reconciles source count, checksum, master path, ResourceSpace ref, duplicate group, and review state.
- Duplicate provenance preserves every source album/folder/path.
- S3 or equivalent derivative delivery supports signed approved-copy links.
- Preservation and derivative manifests tie masters to previews/access copies without overwriting originals.
- Doctrine, hymn, minors/consent, testimony, channel, territory, notice, and withdrawal fields are required where applicable.
- Ongoing monitoring covers backups, disk, ResourceSpace health, writeback failures, pending queue age, derivative failures, denied downloads, and audit export.
- Full archive launch means the infrastructure can ingest, preserve, search, review, and tier archive media. It does not mean every file is approved for public use.

## User Stories

### US-001: Production Identity Decision

**Description:** As the CEO/CTO, I need the production identity provider and role map decided so agents do not guess auth architecture.

**Acceptance Criteria:**
- [ ] Choose identity provider: Cloudflare Access is the current production-supported trusted-header path; Google Workspace SSO, church-host proxy headers, or another provider require an approved adapter before headers are trusted.
- [ ] Document group-to-role mapping for Viewer, Contributor, Reviewer, and DAM Admin.
- [ ] Document which role can access internal-only assets.
- [ ] Document emergency admin access and offboarding flow.
- [ ] Human decision recorded before implementation.

### US-002: Enforce Production Identity Mode

**Description:** As a DAM Admin, I want production routes to ignore beta query/body roles so users cannot spoof permissions.

**Acceptance Criteria:**
- [ ] Production mode requires trusted identity headers or server session.
- [ ] Query/body `role` is accepted only in local beta mode.
- [ ] Viewer cannot access review/admin/mutation routes by passing `role=DAM Admin`.
- [ ] `make portal-sso-smoke` passes in trusted-header mode.
- [ ] `make api-identity-guard` passes.

### US-003: Download Gate Ticket

**Description:** As a security reviewer, I want approved-copy downloads to require a short-lived gate ticket so direct GET cannot bypass usage attestation.

**Acceptance Criteria:**
- [ ] `POST /api/download/[id]` records terms, channel, reason, actor, role, asset, and source.
- [ ] POST returns a short-lived, single-use ticket or equivalent signed token bound to asset, actor/role, variant, and gate audit ID.
- [ ] `GET /api/download/[id]` requires the valid ticket for approved-copy delivery.
- [ ] Direct GET without ticket returns `403` even for an approved asset.
- [ ] Thumbnail `variant=download` cannot serve download-grade derivative without the same ticket or is removed from public image URL maps.
- [ ] `imageUrls.download` does not expose a reusable download derivative URL in role payloads.
- [ ] Audit records connect the allowed download to the preceding gate event and include usage channel/reason.
- [ ] Add smoke coverage: direct approved GET before POST fails, POST with `termsAccepted=false` fails, POST with terms returns ticket, ticket GET succeeds once, ticket reuse fails, thumbnail download variant fails without ticket, blocked assets remain blocked.

### US-004: TJC-Native ResourceSpace Schema

**Description:** As a ResourceSpace integrator, I want schema fields that represent TJC-specific doctrine, rights, privacy, and archive rules.

**Acceptance Criteria:**
- [ ] Add `metadata_record_version` and ResourceSpace field-map v2 while preserving old aliases.
- [ ] Add required or mapped fields for `reuse_tier`, `sensitivity_class`, `rights_basis`, `approved_channels`, `rights_territory`, `required_notice`, `consent_release_id`, `withdrawal_status`, `doctrine_theme`, `testimony_theme`, `hymn_number`, `hymn_rights_basis`, `master_format`, `transcript_status`, and `alt_text_status`.
- [ ] Missing fields become readiness warnings, not inferred truth.
- [ ] `docs/metadata-schema.md` and ResourceSpace field-map diagnostics match.
- [ ] Backward-compatible parsing preserves current exports.
- [ ] `usage_terms` and `approved_channels` are separated so usefulness does not equal legal/channel clearance.
- [ ] Existing approved assets with blank new fields degrade to `Needs Review`/readiness debt until backfilled.
- [ ] Typecheck and field-map guard pass.

### US-005: Three-Tier Reuse Model

**Description:** As a Viewer, I need to know whether an asset is stock-safe, context-safe, or archive-only.

**Acceptance Criteria:**
- [ ] `reuse_tier` supports `Stock-safe`, `Context-safe`, and `Archive-only`.
- [ ] Portal Ready requires `Stock-safe` or policy-approved internal equivalent.
- [ ] Context-safe assets show allowed original/event/channel scope.
- [ ] Archive-only assets cannot download through normal Viewer flows.
- [ ] Collections/packages cannot override item-level reuse tier.
- [ ] `Approved Public` no longer implies stock-safe when `reuse_tier` is blank or context-safe.

### US-006: Doctrine And Sacrament Review Gate

**Description:** As a reviewer, I want doctrine/sacrament media routed through explicit review before public release.

**Acceptance Criteria:**
- [ ] Assets tagged baptism, footwashing, Holy Communion, Sabbath, Holy Spirit, prayer-in-Spirit, or church identity require doctrine review before public release.
- [ ] Public approval is blocked when doctrine review evidence is missing.
- [ ] Review UI shows doctrine blocker and required reviewer type.
- [ ] Audit records reviewer, date, scope, notes, and reason for approval/hold.

### US-007: Hymn Rights And Channel Clearance

**Description:** As a music rights steward, I want hymn assets to track channel, territory, hymn number, and required notice before export.

**Acceptance Criteria:**
- [ ] Hymn assets store hymn number/title, rights basis, territory, approved channels, required notice, and source edition.
- [ ] Public livestream/social/export is blocked when required channel clearance is missing.
- [ ] Hymn 470-525 style risk is represented as a configurable rule, not hardcoded UI copy.
- [ ] Required notice appears in approved-copy guidance and package export.
- [ ] Music/hymn assets have a rights-steward review path.
- [ ] `usage_terms` remains search/usefulness metadata and cannot satisfy `approved_channels`.

### US-008: Minors, Consent, And Sensitive Context Gate

**Description:** As a rights reviewer, I want people/minor and sensitive-context controls to block unsafe public reuse.

**Acceptance Criteria:**
- [ ] Identifiable people require people visibility classification.
- [ ] Possible minors default to restricted until consent/release or documented exception exists.
- [ ] Pastoral, prayer, testimony, sacrament, counseling, illness, grief, private-setting, and location-sensitive contexts require sensitivity review.
- [ ] Public approval is blocked when required consent/sensitivity evidence is missing.
- [ ] Viewer copy stays plain and non-alarming while Reviewer/Admin see exact blockers.
- [ ] `Possible Minors` is treated as people/release fact, not the primary workflow state.

### US-009: Conditional Review Evidence

**Description:** As a reviewer, I want review checklist requirements to change based on asset risk, not one generic checklist.

**Acceptance Criteria:**
- [ ] Review evidence rules are generated from asset type, reuse tier, doctrine flags, hymn flags, people/minors, sensitivity, and requested channel.
- [ ] Missing evidence labels are explicit enough for junior agents and reviewers.
- [ ] Approve Public requires reviewer, date, scope, note, rights, people/minors, derivative, and conditional risk evidence.
- [ ] Incomplete approval returns `400` and never claims ResourceSpace sync.
- [ ] Typecheck, API smoke, and review workflow smoke pass.

### US-010: ResourceSpace Field-Map Verifier

**Description:** As a ResourceSpace integrator, I need a staging verifier that proves required field refs exist before live writeback.

**Acceptance Criteria:**
- [ ] Verifier checks approval, reviewer, review date, notes, rights basis, usage scope, reuse tier, sensitivity, consent, and channel fields.
- [ ] Verifier distinguishes default export aliases from explicit live writeback refs.
- [ ] Admin readiness shows configured/missing/invalid field-map state.
- [ ] Launch readiness fails production mode when required live refs are missing.

### US-011: Live ResourceSpace Writeback

**Description:** As a Reviewer, I want approved decisions to sync to ResourceSpace only when live writeback is configured and verified.

**Acceptance Criteria:**
- [ ] Pending write is created before live writeback attempt.
- [ ] Live writeback requires env enablement, live mode, credentials, valid field map, and API smoke success.
- [ ] Successful writeback updates approval and secondary review fields.
- [ ] Failure marks `sync_failed` with retryable error.
- [ ] UI/API never claims ResourceSpace updated unless adapter confirms it.
- [ ] Staging live-writeback smoke passes on a known test record.

### US-012: Writeback Reconciliation

**Description:** As a DAM Admin, I want a report of queued, synced, failed, stale, and superseded review writes.

**Acceptance Criteria:**
- [ ] Admin can see queue state by actor, asset, action, age, sync state, and error.
- [ ] A CLI report emits the same facts.
- [ ] Stale writes are flagged before production launch.
- [ ] Reconciliation never mutates ResourceSpace by itself.

### US-013: Durable Storage Adapter

**Description:** As a CTO, I want beta local stores to switch to production durable stores by environment.

**Acceptance Criteria:**
- [ ] Storage backend decision is documented before implementation.
- [ ] Pending writes, audit, usage analytics, package drafts, saved searches, and beta feedback use a shared adapter seam.
- [ ] Local JSON/SQLite fallback remains available and honestly labeled.
- [ ] Production mode fails readiness when durable storage is required but unavailable.
- [ ] Existing smokes pass in local mode.

### US-014: Durable Audit Ledger

**Description:** As a DAM Admin, I need an audit ledger suitable for operational accountability, not only beta JSONL.

**Acceptance Criteria:**
- [ ] Audit records login/identity, denied access, download gate, approved download, review action, writeback, package/share, admin readiness, feedback, and export events.
- [ ] Audit records actor, role, asset/ref, timestamp, source, action, outcome, and reason.
- [ ] Audit can be exported without private source paths in normal reports.
- [ ] Production audit storage is append-only or tamper-evident enough for internal governance.

### US-015: Archive Custody Audit

**Description:** As an Archivist, I want a command that proves source files, masters, ResourceSpace records, and exports reconcile.

**Acceptance Criteria:**
- [ ] Command checks source count, source path, checksum, master path, ResourceSpace ref, import batch, duplicate group, derivative status, and review state.
- [ ] Exact duplicate source memberships are preserved.
- [ ] Audit fails on missing checksum, missing master path, lost album membership, or orphan ResourceSpace ref.
- [ ] Output is a decision-ready report under `docs/runs/`.
- [ ] No source media is mutated.

### US-016: Duplicate Provenance Workbench

**Description:** As a reviewer, I want exact duplicate media linked by checksum while preserving every source album/folder membership.

**Acceptance Criteria:**
- [ ] Exact duplicates link to canonical ResourceSpace asset or duplicate group.
- [ ] Every source path, album, and import batch remains visible to Reviewer/Admin.
- [ ] Duplicate workbench shows canonical candidate, duplicate role, and source memberships.
- [ ] Reviewer action can mark duplicate as canonical/link/hold without deleting source evidence.

### US-017: ZIP Deletion Ledger

**Description:** As an operator, I want LM Photos ZIP deletion gated by verified import evidence.

**Acceptance Criteria:**
- [ ] ZIP deletion requires extracted count, import or duplicate-link count, audit count, checksum report, ResourceSpace/index proof, and temp cleanup proof.
- [ ] Deletion event writes a ledger row with album, ZIP path, counts, reviewer/operator, date, and verification report.
- [ ] `DELETE_VERIFIED_ZIPS=1` cannot delete if any gate fails.
- [ ] No non-ZIP source media deletion is introduced.

### US-018: S3 Signed Derivative Delivery Decision

**Description:** As CTO/Product, I need an approved derivative delivery architecture before production claims signed delivery.

**Acceptance Criteria:**
- [ ] Decide bucket/provider, prefixes, access role, KMS/retention, CDN, URL TTL, and cost owner.
- [ ] Document master-vs-derivative separation.
- [ ] Human decision recorded before implementation.
- [ ] Admin readiness shows staging/production delivery state truthfully.

### US-019: S3 Signed Approved-Copy Delivery

**Description:** As a Viewer, I want approved copies delivered through server-authorized signed links without exposing private storage.

**Acceptance Criteria:**
- [ ] Signed URLs are generated server-side only after reuse policy and download ticket pass.
- [ ] Blocked responses expose no bucket, key, private URL, source path, master path, or checksum.
- [ ] URL TTL is verified in smoke.
- [ ] Approved copy cannot be confused with original/master.
- [ ] Delivery smoke passes in staging.

### US-020: Derivative Manifest

**Description:** As media ops, I want every approved derivative tied to its master without overwriting or replacing source originals.

**Acceptance Criteria:**
- [ ] Manifest records parent asset, derivative variant, checksum, format, path/key, created date, generator version, and metadata-stripping status.
- [ ] HEIC/video/audio/document derivatives preserve original/master custody.
- [ ] Missing/failed derivatives become readiness debt.
- [ ] Package/download surfaces use manifest state, not optimistic filenames.
- [ ] Master download remains admin/archivist request-only, not a normal Viewer action.

### US-021: Backup Automation

**Description:** As Church IT, I need scheduled backups with ownership and failure alerts.

**Acceptance Criteria:**
- [ ] Backup includes DB dump, filestore, configs, metadata exports, manifests, audit logs, and launch packet.
- [ ] Backup fails or warns loudly if DB dump is skipped.
- [ ] Backup target is separate from the primary host.
- [ ] Owner, schedule, retention, and restore contact are documented.
- [ ] No source media is deleted or mutated.

### US-022: Clean-Host Restore Proof

**Description:** As CTO, I need restore-test to prove recovery, not only archive shape.

**Acceptance Criteria:**
- [ ] Restore test imports DB dump into clean MariaDB or equivalent.
- [ ] Restored ResourceSpace/app boots.
- [ ] Admin login/access path is verified.
- [ ] Search, approved download, blocked unsafe download, review queue, and metadata export are verified.
- [ ] Launch readiness fails production mode without fresh restore proof.

### US-023: Monitoring And Alerts

**Description:** As DAM Admin, I want health signals for operations that can fail silently.

**Acceptance Criteria:**
- [ ] Monitor ResourceSpace HTTP health, DB health, disk free, backup age/size, DB dump freshness, pending write age, writeback failures, derivative failures, denied downloads, and metadata export freshness.
- [ ] Admin readiness shows owner/action for red signals.
- [ ] Runbook explains who responds and how.

### US-024: Beta-To-Production Gate

**Description:** As the CEO, I want one gate that decides if the system is beta-only, production-internal, or archive-capable.

**Acceptance Criteria:**
- [ ] Gate composes SSO, writeback, durable stores, S3 delivery, backup, restore, browser QA, API smokes, custody audit, and sensitive seed scrub.
- [ ] Gate prints exact blockers, owner, severity, and next command.
- [ ] Gate cannot pass production mode with placeholder env or simulated role switching.
- [ ] Admin UI and CLI use the same facts.

### US-025: Role-Specific 10/10 UX Acceptance

**Description:** As Product Design, I want each role's first screen to answer the right question.

**Acceptance Criteria:**
- [ ] Viewer: can use it, scope, download/request action, reason if blocked.
- [ ] Contributor: intake state, required context, upload does not publish, large media path.
- [ ] Reviewer: priority queue, blocker reason, evidence checklist, next best action, writeback state.
- [ ] DAM Admin: launch gate, integration state, audit, field map, pending writes, owner/action.
- [ ] Mobile 320/390 has no horizontal overflow.
- [ ] Browser QA verifies Library, Detail, Upload, Review, Admin, Collections, Packages, Brand Hub.

### US-026: TJC-Native Search And Taxonomy

**Description:** As a church media worker, I want search/facets that understand TJC language.

**Acceptance Criteria:**
- [ ] Search supports terms such as Sabbath Service, Evangelical Service, Religious Education, RE, Student Spiritual Convocation, Hymns of Praise, testimony, baptism, footwashing, Holy Communion, Holy Spirit, prayer, fellowship, church building, house of prayer, and ministry owner.
- [ ] Visible tags remain separate from TJC context terms.
- [ ] Query expansion is deterministic and testable.
- [ ] Facets include asset type, ministry, event, region/church, language, doctrine, testimony, audience, rights, channels, approval, sensitivity, minors, and reuse tier.

### US-027: Launch Packet

**Description:** As a stakeholder, I want a short launch packet that explains what exists, what is blocked, and what decision is needed.

**Acceptance Criteria:**
- [ ] Packet includes plain DAM analogy, current source model, launch stage, costs/owners, risks, and next decisions.
- [ ] Packet keeps meeting-note guidance: short, simple, no-spend unless approved, no source mutation.
- [ ] Packet links to runbooks and verification outputs.
- [ ] Packet does not expose credentials, private paths, or ministry wiki access details.

## Functional Requirements

- FR-1: Portal reuse state must be computed from source, rights, people/minors, reviewer/date, usage scope, sensitivity, and derivative state.
- FR-2: Approved Public/Internal folder membership must not automatically create portal-safe reuse.
- FR-3: Packages, brand kits, collections, saved searches, and thumbnails must obey item-level reuse policy.
- FR-4: Viewer/Contributor API payloads must hide source paths, master paths, original filenames, checksums, private URLs, ResourceSpace admin links, and operational diagnostics.
- FR-5: Production identity must be server-owned; UI hiding is not permission enforcement.
- FR-6: Download delivery must require both reuse authorization and a recent gate/ticket event.
- FR-7: ResourceSpace writeback must be gated by explicit live configuration and verified field map.
- FR-8: Missing metadata must degrade to readiness debt, not inferred approval.
- FR-9: Import, duplicate, derivative, review, download, and ZIP deletion operations must leave audit evidence.
- FR-10: AI fields must remain suggestions until human-approved.
- FR-11: Backups must be restorable and tested on a clean host before production internal launch.
- FR-12: All production claims must map to executable checks or explicit human decisions.

## Design Requirements

- DR-1: Keep the app operational and media-first, not a landing page or generic SaaS hero.
- DR-2: Use compact, role-specific command surfaces instead of explanatory walls.
- DR-3: Use TJC-native vocabulary in filters, search, queue labels, and blocker copy.
- DR-4: Never use fake media, fake generated church people, fake ZIPs, or fake signed URLs.
- DR-5: Make normal-user copy calm: `Ready to use`, `Internal only`, `Ask media team`, `Review required`.
- DR-6: Make reviewer/admin copy precise: field map, ResourceSpace ref, pending write, sync failed, rights blocker, source proof.
- DR-7: Every disabled action should explain the exact blocker and next action.
- DR-8: Mobile layouts must fit at 320px and 390px with no horizontal overflow.

## Technical Requirements

- TR-1: Reuse existing policy seams before adding new abstractions: `portal-reuse-decision`, `asset-governance`, `review-evidence`, `request-identity`, `media-delivery`, `resourcespace-field-map`, and media-source adapters.
- TR-2: Add schema fields backward-compatibly and keep old export aliases during migration.
- TR-3: Use durable sidecar storage for portal state only where ResourceSpace is not the immediate source of truth.
- TR-4: Keep all source media out of Git.
- TR-5: Use deterministic fixtures and scripts for policy tests.
- TR-6: Use browser QA after UI changes and API/smoke guards after route changes.
- TR-7: Do not run production deploys, destructive migrations, credential changes, or paid cloud provisioning without human approval.
- TR-8: Freeze active agents and resolve untracked/imported helpers before merge; no implementation begins from this PRD while the worktree has unresolved active-lane ownership.

## Schema Migration Phases

1. Add `metadata_record_version` and field-map v2. Old exports still parse; new fields show as missing readiness debt.
2. Add explicit `reuse_tier`: `stock-safe`, `context-safe`, `archive-only`. Stop deriving this from `publish_status` plus `usage_scope`.
3. Add doctrine/sacrament fields and route baptism, Holy Spirit, footwashing, Holy Communion, and Sabbath assets through doctrine review.
4. Add hymn rights fields: `contains_hymn`, `hymn_number`, `hymn_rights_basis`, `rights_territory`, `approved_channels`, `required_notice`, `music_rights_review_status`.
5. Split minors/consent from generic people risk: `identifiable_people`, `minors_present`, `consent_basis`, `consent_record_id`, `release_scope`, `privacy_redaction_status`.
6. Add testimony sensitivity fields: `testimony_theme`, `testimony_sensitivity_class`, `pastoral_review_status`, `redaction_level`, `stock_safe_exception_reason`.
7. Formalize preservation and derivative relations: `asset_role`, `parent_asset_id`, `access_derivative_id`, `derivative_purpose`, `derivative_sanitized`, `master_format`, `preservation_status`.

## Human Decisions Needed

1. Production identity provider and role map.
2. Durable storage backend and owner.
3. ResourceSpace live field refs and staging test asset.
4. S3/derivative delivery provider, bucket, TTL, and cost owner.
5. Backup schedule, retention, and restore owner.
6. Rights/doctrine/music/minors reviewer roster.
7. Beta seed scope and sensitive-media scrub approval.
8. Whether to keep no-spend beta only or approve paid/hosted production infrastructure.

## Verification Matrix

Baseline after any implementation slice:

```bash
git diff --check
npm --prefix frontend run typecheck
make frontend-check
make api-identity-guard
make api-payload-guard
make storage-honesty-guard
make private-source-guard
make launch-readiness
```

Targeted checks:

```bash
BASE_URL=http://localhost:4871 make portal-api-smoke
BASE_URL=http://localhost:4871 make portal-browser-qa
BASE_URL=http://localhost:4871 make portal-sso-smoke
BASE_URL=http://localhost:4871 make portal-delivery-smoke
BASE_URL=http://localhost:4871 make portal-writeback-guard-smoke
BASE_URL=http://localhost:4871 make portal-package-smoke
BASE_URL=http://localhost:4871 make portal-saved-search-smoke
BASE_URL=http://localhost:4871 make portal-feedback-smoke
BASE_URL=http://localhost:4871 make portal-beta-rehearsal
BASE_URL=http://localhost:4871 make portal-usage-smoke
BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe
# Mutating hosted smoke requires explicit owner approval:
# PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1 PORTAL_HOSTED_SMOKE_APPROVED_BY=<owner-or-ticket> BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-smoke
```

Production/ops gates:

```bash
docker compose --env-file .env -f docker-compose.yml config
make smoke
make import-audit
make backup
make restore-test
make launch-readiness
```

## Success Metrics

- Viewer finds a safe approved asset in under 60 seconds.
- 100% of public-ready assets have reviewer, date, scope, rights basis, usage guidance, and derivative state.
- 0 blocked Viewer/Contributor payloads expose private source or storage fields.
- 0 direct approved-copy downloads bypass gate/ticket audit in production mode.
- 100% of ResourceSpace writeback attempts have queued/synced/failed evidence.
- 100% of imported assets have checksum and source boundary.
- 100% of exact duplicate source memberships are preserved.
- Latest production launch packet includes restore proof less than 30 days old.

## Recommended Build Order

1. Fix high-priority download gate ticket and thumbnail download variant.
2. Decide identity, durable storage, ResourceSpace field refs, S3 delivery, backup owner, and reviewer roster.
3. Implement production identity mode and trusted-header enforcement.
4. Expand TJC-native schema and field-map diagnostics.
5. Implement conditional review evidence and three-tier reuse.
6. Implement durable pending writes and audit ledger.
7. Implement live ResourceSpace writeback staging smoke.
8. Implement archive custody audit, duplicate provenance, and ZIP deletion ledger.
9. Implement S3 signed derivative delivery and derivative manifest.
10. Harden backup/restore into clean-host proof.
11. Add beta-to-production gate and launch packet.

## Implementation Coordination

Before implementation starts from this PRD:

1. Freeze active coding threads and collect final reports.
2. Resolve untracked imported helper files, especially any file imported by live pages.
3. Run `git status --porcelain=v1 -uall`, `git diff --stat`, and `git diff --check`.
4. Verify exact ownership for large dirty surfaces: enterprise CSS, enterprise pages, `types.ts`, catalog/search modules, package modules, request identity, scripts, and docs.
5. Only then split autonomous work into disjoint lanes.

## Open Questions

- Which exact TJC leaders own doctrine, music rights, minors/consent, and archive review?
- Should `Approved Internal` be visible to all authenticated church workers or only selected internal groups?
- Should production run on church PC/NAS, Vercel plus durable stores, or another private host?
- Which assets are allowed in teammate beta seed after sensitive/youth/copyright scrub?
- Is paid infrastructure approved for production, or should production remain no-spend/self-host first?
