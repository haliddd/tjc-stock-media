# TJC Stock Media Context

## Domain

TJC Stock Media is an internal church media system for finding, reviewing, and safely reusing photos, videos, and audio.

## North Star

A TJC user can find a rights-safe asset for a real communication need in under 60 seconds.

## Core Terms

- **Source export**: downloaded copy of media from Google Photos or another legacy source. It is intake evidence, not the long-term library.
- **Selected master original**: an original file selected for the stock media system and staged for `TJC Stock Media Library` Google Shared Drive without renaming or metadata mutation.
- **Master warehouse**: `TJC Stock Media Library` Google Shared Drive. It stores selected master originals by year/source album.
- **Approved delivery copy**: curated output copy, shortcut, or derivative placed in Approved Public/Internal folders after review. It is not the only master record.
- **DAM**: Digital Asset Management system. ResourceSpace is the DAM layer for tags, search, previews, rights review, and approved downloads.
- **True Jesus Church Media Library**: user-facing portal name for the church media library experience. It is the friendly front door over ResourceSpace-backed DAM truth. New or touched user-facing UI copy should use this name, but code symbols and old documents do not need a repo-wide rename.
  _Avoid_: Archive One, Atlas
- **Hosted DAM instance**: cloud-hosted ResourceSpace runtime for metadata, previews, review workflow, and approved-copy delivery during controlled beta. It is not master-original custody; Google Shared Drive remains the master warehouse.
- **Operational DAM behavior**: user-facing DAM workflow behavior such as search, asset inspection, review request, intake, review, and visible safety gates against a current photo sample. It does not imply production readiness, public launch, or live writeback.
- **Demo rehearsal**: presenter-led walkthrough used to prove product behavior before users receive access. It may use local fallback and is not a team beta.
- **Role rehearsal**: local demo rehearsal mode for switching simulated roles with an explicit local flag or trusted local header. It is not production authentication, SSO, real user impersonation, or permission delegation.
- **Controlled team beta**: named internal users performing role-specific DAM tasks against a hosted portal and Hosted DAM instance after access, source-truth, and safety gates pass. Local supervised use remains a demo rehearsal, not a controlled team beta.
- **Admin observer**: beta participant allowed to view governance readiness, blockers, and redacted operational status. Admin observer access does not grant configuration, secret access, source custody, or mutation authority.
- **Beta operator**: named person allowed to configure hosted beta operations and DAM integration settings. Beta operator authority is narrower than production ownership and does not grant source media mutation or public launch approval.
- **Beta photo sample**: bounded subset of imported photos approved for beta visibility, capped under the current beta media limit. It excludes video, audio, and sensitive, youth-identifiable, private, or unclear-rights media unless a rights reviewer explicitly approves beta visibility.
- **Beta visibility approval**: rights reviewer decision that a beta tester may see an asset preview or metadata during the controlled team beta. It does not grant reuse, publication, or download rights.
- **Reuse approval**: rights reviewer decision that an asset may be used or downloaded for a defined scope. Beta visibility approval never becomes reuse approval by itself.
- **Media source session**: one request-time view of the active media source, including whether the portal is reading ResourceSpace live, ResourceSpace export, local fixture fallback, or role-safe media-library copy. It is the portal's way to keep source truth honest without exposing operational details to roles that should not see them.
- **Source system**: where media originally came from, such as Google Photos, old Drive folders, IA DME folders, or local downloads.
- **Source album**: original Google Photos album name. It is provenance and collection context, not the whole taxonomy.
- **Collection**: ResourceSpace grouping used for source albums, run batches, and curated sets. Collections do not replace metadata/status fields.
- **Saved view**: named portal search perspective for a recurring media job, such as website heroes, no-people assets, or children/youth review. It is a workflow shortcut, not a separate collection.
- **Brand kit**: curated ministry guidance and downloadable ResourceSpace collection mapping for one campaign or identity use case. Editorial copy can live in the portal; downloadable media remains ResourceSpace-backed.
- **Package draft**: portal-local curation object for assembling a ministry toolkit. It stores section names and ResourceSpace references only; asset records, approval state, and rights truth remain in ResourceSpace.
- **Public portal preview**: local demo view that renders a collection as an external-style page using Portal Ready assets only. It is not a persisted share link, access token, public URL, analytics record, or distribution artifact.
  _Avoid_: Public share link, live portal, distribution link
- **Portal readiness diagnostics**: local/operator-facing explanation of why a collection has zero or fewer Portal Ready assets, derived from existing source/export fields. It guides review work only and does not approve assets, create public links, send recipients, or grant downloads.
- **10/10 DAM depth run**: autonomous maturity pass after the visual redesign issues are already passing. It closes product-depth gaps such as public portal preview, download center, rights-safe explanations, review evidence, permission inheritance, governance cleanup, search intelligence, and final demo evidence.
  _Avoid_: Visual redesign redo
- **Import batch**: a selected group of files imported into ResourceSpace for review.
- **Rights reviewer**: person allowed to approve public/internal/restricted use.
- **Quality status**: whether an asset is useful for stock media, such as `Hero Candidate`, `Useful`, `Context Only`, `Low Use`, or `Reject`.
- **Rights status**: whether use rights are known, such as `Unknown`, `TJC-Owned`, `Permission Confirmed`, or `Rights Concern`.
- **Publish status**: operational status for use, such as `Needs Review`, `Approved Public`, `Approved Internal`, `Archive - Not Promoted`, or `Do Not Use`.
- **Approved Public**: raw ResourceSpace status indicating ResourceSpace approval. It is not automatically portal-reusable unless portal reuse policy also passes.
- **Approved Internal**: safe inside TJC, not public.
- **Portal Ready**: computed portal state where source, rights/consent, people/minors, reviewer/date, usage scope, and derivative checks all pass.
- **Portal reuse state**: computed user-facing answer to whether an asset can be reused now, previewed only, or blocked for source/rights/people/derivative reasons. It does not replace ResourceSpace approval fields.
- **Batch Approved With Blockers**: raw ResourceSpace-approved asset that still lacks one or more portal reuse requirements. User-facing label: `Needs portal review`.
- **Review evidence depth**: structured reviewer evidence fields for rights, consent, releases, usage scope, legal/brand review, and alt text that can be queued with a Pending Review Write. It is review evidence, not ResourceSpace source truth until confirmed writeback exists.
- **Pending Review Write**: local queued review decision that has not yet been written to ResourceSpace; audit evidence and retry state, not source of truth.
- **Confirmed ResourceSpace write**: review decision written to ResourceSpace and verified by reading the ResourceSpace record back. Until this exists, the portal must describe the decision as queued or pending, not synced.
- **Needs Review**: default state for imported assets.
- **Do Not Publish**: default usage scope until reviewed.
- **Exact duplicate**: same SHA-256 checksum. ResourceSpace should keep one canonical asset while preserving all source album memberships and source paths.
- **AI suggestion**: machine-generated title/tag/quality hint. It is audit evidence, not final metadata until accepted by human/rule workflow.

## Current First Batch

- Source: `/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Imported/MVP 2024`
- Size: about 480 MB
- Count: 181 image files
- Goal: prove search, tags, review, metadata export, and approved-copy workflow.

## Current Portal Product Surface

- **Library**: find and reuse workspace with compact search, desktop saved-view/browse rail, quiet right filter drawer, count truth, collection entry points, pagination, and contact-sheet asset records.
- **Command palette**: `Cmd/Ctrl+K` utility for search, stable saved views, collections, upload, review queues, ResourceSpace ID lookup, guide, and admin diagnostics.
- **Collections**: album-oriented browsing by stable collection ID, compact thumbnail rails, selected collection inspector, source/count/date facts, and one `Open Library results` action. Sabbath language is used instead of Sunday language.
- **Asset detail**: trust record for raw ResourceSpace status, portal reuse state, blockers, source/provenance, reviewer/date, rights, people/minors confidence, files, safe derivative comparison panel, related assets, and download/original restrictions.
- **Media preview panel**: app-native image/video/audio/document/restricted/unknown wrapper. Image/restricted modes are proven with current export data; document/video/audio modes are implemented as safe shells until ResourceSpace exports role-safe rows of those media types.
- **Request dialog**: focused dialog for original access, review request, or media coworker help. It opens an email draft only; it does not update ResourceSpace, approve reuse, grant original access, or create a pending review write.
- **Upload**: contributor intake workflow with autosave checkpoint, selected-file count, selected-file preview/remove controls, taxonomy tag input, reviewer packet, and bottom action bar. New media remains blocked as `Needs Review / Do Not Publish` until review.
- **Upload preview**: selected files are previewed as filename/type/size evidence; large video/audio over 100 MB is routed to Shared Drive Incoming guidance.
- **Review**: governance workbench with queue tabs, queue toolbar, xl desktop DataTable, risk/missing metadata triage, contact-sheet strip, `Overview / Metadata / Usage / AI Insights / Pending write` inspector tabs, required checklist, note field, audit preview, local pending-write queue, and a load-more gate for long queues.
- **Review load-more gate**: explicit `Show more review items` control that keeps mobile reviewers near the inspector/action area without changing review queue truth.
- **Guide**: secondary searchable editorial help with anchor nav, uncertainty callout, row icons, Do/Avoid rules, download decisions, children/youth, source/credit, and large-media intake.
- **Guide mobile jump nav**: wrapping chip navigation for Guide sections. It keeps all controls inside the viewport at 320/390/768 instead of relying on offscreen horizontal scrolling.
- **TjcStatusBadge**: shared status primitive for raw ResourceSpace status, portal reuse state, rights, review, visibility, and download eligibility. Semantic wrappers keep status text, icon, and tone consistent without relying on color alone.
- **DataTable**: shared Admin/Review table primitive with search, sort, page-size control, pagination, and mobile cards. It is read-only UI over existing export/API data.
- **Toast feedback**: shared Sonner helpers for upload, draft, copy/share, review queued, pending write, blocked download, and save failure events. Safety truth also stays visible inline.
- **Admin audit log**: read-only Admin section that surfaces integration readiness, pending-write queue state, and top backlog items as audit signals; it does not claim ResourceSpace persistence.
- **No-preview state**: if ResourceSpace export lacks a derivative for the current role, the portal labels the tile as a restricted/pending policy state with safe media type and collection context; it does not invent or commit media.

## Current LM Photos Completion Source

- Source ZIP folder: `/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Incoming/lm-photo`
- Count: 31 Google Photos album ZIP files
- Size: about 8.3 GB compressed
- ZIP inventory observed: about 3,963 files, mostly JPG plus HEIC, PNG, JPEG, TIF, and one ARW
- Constraint: local disk is tight, so process album ZIPs one at a time and delete a ZIP only after that album is imported, audited, staged, and verified.
- Imported LM Photos binaries live in `/Users/halim4pro/Desktop/MVP/tjc-stock-media/.runtime/filestore`. Finder-visible links live in `/Users/halim4pro/Desktop/MVP/Stock Media/02_Imported Into ResourceSpace`.

## Current Video Intake

- Source ZIP: `/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Videos/Incoming/Samuel Kuo/Samuel Kuo-3-001.zip`
- Size: about 9.9 GB compressed
- ZIP inventory observed: 18 files, including 11 MP4 and 7 JPG
- Uncompressed estimate: about 10.6 GB
- Status: parked for next video stock workflow. Do not extract until disk space and video import plan are confirmed.
