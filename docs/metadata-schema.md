# Metadata Schema

This schema is the canonical asset metadata contract described in
`docs/data-engineering-playbook.md`. ResourceSpace stores the authoritative
asset record and review state; Google Shared Drive stores selected master
originals; the portal renders role-safe read models; AI fields are suggestions
only.

## Contract Rules

- Preserve provenance before improving search.
- Keep original/master custody fields separate from portal-facing fields.
- Keep visible content tags separate from TJC/church-context terms.
- Keep AI suggestion fields separate from human-approved fields.
- Treat missing metadata as readiness debt, not as permission to infer.
- Add fields in a backward-compatible way; use aliases or field-map migration for
  renames.
- Portal code validates this contract. Missing required identity/provenance,
  approval, or derivative fields degrade readiness; AI suggestion fields never
  become final human-approved metadata by inference.
- Portal audit events are accountability evidence only. ResourceSpace remains
  the authoritative metadata/review record, and local `.runtime` audit JSONL is
  not production-durable storage.

## Source / Provenance

| Field | Purpose |
|---|---|
| `canonical_asset_id` | Stable ID for the same asset across manifest, ResourceSpace, and exports. |
| `source_platform` | High-level source, such as Google Photos or Google Drive. |
| `source_system` | Google Photos, Google Drive, IA DME folder, local copy, etc. |
| `source_account` | Source account, such as `lm.photo@tjc.org`. |
| `source_folder` | Shared Drive or source-system folder boundary when album is not enough. |
| `source_album` | Google Photos album or source folder name. |
| `source_album_path` | Local/export folder for this album during import. |
| `source_album_memberships` | All source albums this exact asset appeared in. |
| `source_path` | Original path or source link. |
| `source_paths_all` | All known source paths for exact duplicate appearances. |
| `original_filename` | Filename before import. |
| `original_extension` | Original file extension before import. |
| `original_file_size_bytes` | Original byte size before import. |
| `checksum_sha256` | Proves whether two copies are the same file. |
| `import_batch` | Batch name, such as `MVP 2024 First Batch`. |
| `import_manifest_row_id` | Row ID from batch manifest. |
| `import_date` | Date imported or audited. |
| `master_drive_path` | Intended or verified Google Shared Drive master path. |
| `master_custody_path_status` | Verified, planned, missing, or not exported. Portal uses this as custody evidence without exposing the path to Viewers. |
| `master_drive_paths_all` | All Shared Drive master paths for exact duplicate album appearances. |
| `resourcespace_ref` | ResourceSpace resource ID for cross-checking exports. |
| `duplicate_group` | Group ID for exact or near duplicates. |
| `duplicate_role` | Canonical, exact duplicate source, near duplicate, crop, edited version, etc. |
| `duplicate_similarity_hint` | AI or hash/visual hint for reviewer/admin duplicate workflow only. It never deletes or canonizes automatically. |

## Description / Search

| Field | Purpose |
|---|---|
| `media_type` | Photo, video, audio, graphic, document. |
| `event_name` | Church event or album context when known. |
| `event_series` | Repeating event series, such as Sabbath Service, Evangelical Service, or Student Spiritual Convocation. |
| `event_date` | Event date when known. |
| `captured_date` | Capture date from Google Photos details or file metadata. |
| `captured_date_source` | Google Photos UI, EXIF, filename, album range, or unknown. |
| `camera_make` | Camera make when available. |
| `camera_model` | Camera model/device when available. |
| `image_dimensions` | Width x height. |
| `file_format` | Original file format, such as JPG, HEIC, TIF, ARW. |
| `visible_content_tags` | Generic visual tags, such as Bible, plant, fountain. |
| `TJC_terms` | Church-context tags, such as baptism, fellowship, worship. |
| `brand_terms` | Usage/brand feel such as warm, welcoming, hopeful, real. |
| `usage_terms` | Where this asset may be useful, such as newsletter, poster, social, report. |
| `human_title_final` | Human-approved searchable title. |
| `human_tags_final` | Human-approved final tag list. |
| `people_visible` | Yes, no, unknown. |
| `minors_visible` | Yes, no, unknown. |
| `sensitive_context` | Prayer counseling, private moment, sacrament, minors, music rights, etc. |
| `location` | City/church/location when known. |
| `church` | Local church when known. |
| `region` | Region or district when known. |
| `publication_title` | Publication, newsletter, sermon series, or design source when applicable. |
| `hymn_number_or_title` | Hymn number/title when music, lyric, choir, accompaniment, or service media includes hymn content. |
| `sermon_title` | Sermon title when media is tied to a sermon or sermon clip. |
| `religious_education_level` | RE/youth class or level when applicable. |
| `language` | Language of visible text, captions, audio, or publication. |
| `version_or_edition` | Version, edition, translation, or template version. |

## Rights / Review

| Field | Purpose |
|---|---|
| `quality_status` | Hero Candidate, Useful, Context Only, Low Use, Reject, Unreviewed. |
| `technical_quality` | Visual/audio technical quality, separate from rights and usefulness. |
| `rights_status` | Unknown, TJC-Owned, Permission Confirmed, Rights Concern. |
| `publish_status` | Needs Review, Approved Public, Approved Internal, Archive - Not Promoted, Do Not Use. |
| `workflow_state` | Intake, Metadata Drafted, Rights Review, Approved, Archived. |
| `public_safe` | Yes, no, unknown. |
| `usage_scope` | Do Not Publish, Public, Internal Only, Archive Only, Limited. |
| `reuse_tier` | Stock-safe, context-safe, archive-only. Required before broad reuse; stock-safe means broad cross-ministry reuse, context-safe means original-context/channel reuse only, archive-only means preservation/reference without reuse. |
| `visibility_tier` | Public, member/internal, reviewer/admin, archive. Separate visibility from approval and reuse. |
| `sensitivity_class` | Public-safe, member-sensitive, sacrament-sensitive, youth-sensitive, testimony-sensitive, internal-governance, archive-restricted. |
| `doctrine_sacrament_theme` | Baptism, Holy Spirit, footwashing, Holy Communion, Sabbath, prayer-in-Spirit, church identity, none. |
| `testimony_theme` | Healing, illness, visions, family conversion, spiritual battle, grief, pastoral/private, none. |
| `rights_basis` | TJC-owned, contributor license, public domain, jurisdiction-limited public domain, hymn license, hymn permission, fair use internal only, unknown. |
| `approved_channels` | Website, livestream, projection, choir upload, print, social, internal training, limited-share link, archive only. |
| `required_notice` | Copyright/license notice required for hymn, publication, third-party, or channel-specific reuse. |
| `rights_territory` | Worldwide, country-specific, jurisdiction-limited, unknown. |
| `consent_status` | Confirmed, not confirmed, not applicable, unknown. |
| `consent_release_record_id` | Traceable consent/release record or documented exception when identifiable people or minors appear. |
| `reviewed_by` | Rights reviewer name/account. |
| `reviewed_date` | Date reviewed. |
| `approval_notes` | Why this asset is safe or restricted. |
| `publish_date` | Date an approved asset or derivative may begin reuse. |
| `embargo_date` | Future date before which reuse remains blocked. |
| `expiration_date` | Date after which reuse expires. |
| `approval_recheck_date` | Date a reviewer must recheck approval. |
| `expiration_or_recheck_date` | Date to revisit rights if needed. |
| `rights_expiration_date` | Date rights basis expires. |
| `consent_expiration_date` | Date consent/release expires if limited. |
| `withdrawal_status` | Active, withdrawn, takedown requested, embargoed, or expired. Withdrawal/takedown blocks reuse without deleting the record. |
| `domain_reviewer` | Doctrine, music rights, RE/minors, pastoral sensitivity, archive, or DAM reviewer responsible for specialized approval. |

## Mature Policy Rules

## Audit / Accountability Primitives

Portal audit records may support accountability for asset views, sensitive
asset views, download gates, approved-copy downloads, blocked downloads, review
changes, ResourceSpace write attempts, package decisions, original-access
requests, rendition requests, duplicate review, taxonomy review, and saved-search
signals.

Audit records do not grant permission, do not approve media, and do not replace
ResourceSpace truth. They must describe whether a decision was allowed, denied,
blocked, queued, or previewed. ResourceSpace write attempts must distinguish
attempt, success, and failure; queued portal writes remain pending until the live
ResourceSpace API confirms and the record can be re-read.

Viewer and Contributor audit read models must redact source paths, master paths,
checksums, ResourceSpace IDs and field internals, signed URLs, original
filenames, import batches, private evidence, and private notes. Reviewer and DAM
Admin views may keep operational summaries and ResourceSpace reference IDs where
needed for governance, but custody paths, signed URLs, checksums, and private
evidence stay out of generic audit exports.

Current portal audit storage is local runtime JSONL under `.runtime`. It is
useful for local accountability and beta rehearsals, but production launch still
requires durable identity-backed storage, retention policy, restore proof, and
admin export rules.

## Intake And Routing Primitives

Browser intake, folder intake, bulk manifests, and large video/audio admin intake
all create review work; they do not create public-ready media. New intake
defaults to `publish_status = Needs Review` and `usage_scope = Do Not Publish`.
Large video/audio and files over the browser limit route to Shared Drive/admin
intake so originals stay under master custody.

### Joanna Mini Beta Required Intake Fields

For the June 16 Joanna-testable mini beta, contributor-facing required fields are
intentionally narrow:

| Field | Maps To |
|---|---|
| Title/name | `human_title_final` draft / intake title |
| Event/source | `event_name` and source context |
| Contributor | `source` or photographer/uploader context |
| Rights/source type | `rights_status`, `rights_basis`, source class note |
| Usage intent | `usage_scope` / requested usage |
| People/minors visible | `people_visible`, `minors_visible` |
| Notes | `approval_notes`, consent/restriction notes, reviewer notes |

Date defaults from EXIF or exported date metadata when available. Event year or
folder context is fallback when metadata is unavailable. Obviously wrong dates
should be flagged for correction. Filename remains secondary to metadata and
approved search tags. Original/master vs derivative/approved-copy distinction
must remain visible in reviewer/admin context.

Smart routing reasons are explainable hints:

| Routing reason | Trigger examples | Review owner |
|---|---|---|
| Doctrine/sacrament review | Baptism, footwashing, Holy Communion, Holy Spirit, doctrine terms. | Doctrine reviewer |
| Music/hymn rights review | Hymns of Praise, choir, music, livestream, worship audio/video. | Music-rights reviewer |
| Minors/consent review | Children/youth, RE, unknown people/minors fields. | RE/minors reviewer |
| Source provenance review | Missing source folder/account, import batch, checksum, original filename, or custody status. | Source reviewer |
| Rendition readiness review | Missing approved copy, derivative URL, or dimensions. | DAM reviewer |
| Taxonomy review | Sparse tags or tags outside approved historical TJC vocabulary. | Taxonomy manager |
| AI suggestion review | AI or suggestion-only metadata exists. | DAM reviewer |

Routing never sets final rights, consent, minors, doctrine, hymn clearance,
public approval, reviewer identity, or Portal Ready state.

## Domain Evidence Enforcement

The portal policy layer treats the mature fields below as ResourceSpace-backed
evidence. Missing values create blockers; they do not let the portal infer truth.

| Evidence | Blocking behavior |
|---|---|
| `consent_release_record_id` | Required for youth/minor public reuse unless consent is documented as not applicable or exception-approved. |
| `domain_reviewer` | Must match the risk domain: RE/minors, doctrine, music-rights, or pastoral-sensitivity. |
| `rights_basis` | Required for public reuse; `unknown` and internal-only fair use are not public-safe. |
| `approved_channels` | Must include the intended public channel; archive-only/internal channels do not make an asset stock-safe. |
| `required_notice` | Required for hymn/music/publication/third-party reuse where notice is needed. |
| `approval_recheck_date`, `rights_expiration_date`, `consent_expiration_date`, `withdrawal_status` | Expired, stale, embargoed, withdrawn, or takedown-requested records degrade to review. |
| `human_ai_decision` | AI and smart suggestions remain review debt until accepted, edited, or rejected by a human. |

## Search Facets And Saved Views

Search facets are read-model filters over ResourceSpace-backed metadata. They
help coworkers find records; they do not create approval truth, permission truth,
or new DAM records.

Supported mature facets include collection/section terms, visible tags, TJC
terms, media type, orientation, file extension, ministry/event terms,
church/region, language, reuse tier, rights basis, approved channels,
sensitivity class, consent state, derivative readiness, review status, and
lifecycle states such as archive, withdrawn, embargoed, expired, or recheck due.

`public safe` must map to Portal Ready. It must not mean raw `Approved Public`.
Saved views such as Portal Ready, consent review, music-rights review,
doctrine/sacrament review, lifecycle review, and archive/preservation are query
definitions only. Each result still passes role visibility, per-asset reuse
policy, redaction, and download gates.

- `public safe` in search or UI means Portal Ready, not raw `Approved Public`.
- Portal Ready requires source/provenance, rights basis, people/minors state,
  reviewer/date, compatible usage scope, approved derivative, current lifecycle,
  and no explicit TJC sensitivity blocker.
- `context-safe` assets may be useful for their original context or channel, but
  they are not stock-safe and must not be treated as broad public reuse.
- `archive-only` assets remain preserved and reviewer/admin searchable, but they
  cannot download as normal approved copies.
- Youth/minors, sacrament, testimony/pastoral, and hymn/music assets require the
  matching domain-review evidence before public reuse.
- Hymn/music assets need rights basis, approved channel, and required notice.
- Expired, embargoed, withdrawn, takedown-requested, or recheck-due assets
  degrade to review or block reuse.

## Derivatives / Format Handling

| Field | Purpose |
|---|---|
| `derivative_status` | Notes whether a preview/use derivative exists, especially for HEIC originals. |
| `alternative_file_count` | Export-only count of attached alternatives, such as generated JPG derivatives. |
| `original_format` | Original format, such as HEIC or JPG. |
| `preview_format` | Preview format ResourceSpace or derivative workflow uses. |
| `conversion_needed` | Whether user-facing preview/download derivative is needed. |
| `conversion_status` | Not evaluated, generated, failed, not needed. |
| `derivative_path` | Local/export path for generated derivative when applicable. |
| `parent_master_asset_id` | Master/source asset this derivative belongs to, when known. |
| `derivative_channel` | Intended derivative channel, such as preview, web, projection, print, internal training, or archive access. |
| `original_preserved` | Yes/no check that original file remains untouched. |

Policy: preserve originals as masters. If HEIC preview fails, attach a metadata-stripped JPG derivative to the same asset record instead of replacing the HEIC or creating an unmanaged duplicate.

## Governed Renditions / Original Access

Renditions are governed outputs, not source files. Thumbnail, card, collection,
detail, and preview derivatives support browsing or review only. They never
satisfy approved-copy download readiness.

Approved-copy download readiness requires a download-grade derivative and the
approved-copy gate: POST request, accepted terms, short-lived ticket, GET
consume, and audit record. Channel-specific future derivatives such as web,
print, projection, social, newsletter, poster, or reviewer watermarked preview
must declare type, parent asset, generated/version evidence, content type, and
permission tier before they can be used in policy.

The local `.runtime` derivative index is a development/private-beta index over
available filestore derivatives. It is not production-durable storage and not a
rendition factory. Missing derivatives block Portal Ready where policy requires
approved-copy readiness.

Original/master access is separate from approved-copy download. It remains
request-only, approver-gated, time-limited, audited, and revocable. The portal
must not issue live original/master access unless a future backend workflow has
durable request storage, verified approver identity, expiry enforcement,
revocation, audit, and source-path redaction. Google Shared Drive remains master
custody.

## Collections / Packages

Collections and packages are curation, readiness, and delivery planning records.
They are not permission truth. Collection membership may help coworkers find or
assemble assets, but every package decision must evaluate each item against the
current ResourceSpace-backed portal policy.

Package export/share decisions require every included asset to be Portal Ready
for the selected purpose/channel, with no missing references, rights gaps,
minors/consent blockers, missing required notice, sensitivity/domain-review
blockers, expired/stale lifecycle, withdrawal/takedown state, or missing
approved-copy derivative. Raw `Approved Public` does not pass by itself.

Package output may include approved-copy derivatives only. Original/master files
stay under Shared Drive custody and use the separate original-access request
workflow. Local package draft JSON is a private-beta readiness record; it is not
durable production share/export storage and does not grant permission.

## AI Suggestions

| Field | Purpose |
|---|---|
| `ai_provider` | AI tool/provider used for suggestions. |
| `ai_model` | Model used for suggestions. |
| `ai_prompt_version` | Prompt version used for repeatability. |
| `ai_run_id` | Run identifier for audit. |
| `ai_cost_estimate` | Estimated or actual cost for the suggestion run. |
| `ai_title_suggestion` | Suggested title, not final title. |
| `ai_visible_tag_suggestions` | Suggested visible tags, not final tags. |
| `ai_tjc_term_suggestions` | Suggested TJC terms, not final terms. |
| `ai_quality_suggestion` | Suggested quality/usefulness status. |
| `ai_people_or_minor_flag` | Suggested people/minor risk flag. |
| `human_ai_decision` | Accepted, edited, rejected, or not reviewed. |
| `suggested_tags` | Suggested tags from intake, reviewer, or AI queue. These are not final taxonomy. |
| `controlled_vocabulary_source` | Whether suggestions came from approved historical TJC vocabulary, reviewer suggestion, or unknown source. |

## Important Rule

Keep `visible_content_tags` separate from `TJC_terms`.

Example: a photo may visibly show `people, table, flowers`, but the TJC context may be `fellowship lunch` or `youth ministry`.

AI fields are suggestion fields only. They must not overwrite `human_title_final`, `human_tags_final`, rights, people, minor, approval, or usage fields without human review.
