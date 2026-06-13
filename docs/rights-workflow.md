# Rights Workflow

## Default State

Every imported asset starts as:

- `rights_status = Unknown`
- `publish_status = Needs Review`
- `public_safe = Unknown`
- `usage_scope = Do Not Publish`
- `quality_status = Unreviewed`
- source provenance captured when available: source folder/account, import batch,
  checksum, original filename, and master custody status

This default also applies to bulk intake and large video/audio admin intake.
Intake may route work to reviewers, but it never publishes media.

## Roles

| Role | Can do |
|---|---|
| Uploader | Submit or provide context for media. |
| Tagger | Add descriptive and TJC-context tags. |
| Rights reviewer | Approve public/internal/restricted status. |
| DAM admin | Manage fields, users, exports, and system setup. |

## Approval Rules

| Rule | Reason |
|---|---|
| Every import defaults to Do Not Publish. | Prevents accidental use. |
| Only reviewer changes public/internal approval. | Separates upload from approval. |
| Approval requires reviewer, date, usage scope, and notes. | Creates accountability. |
| Public approval requires extra confidence. | Public church media has higher reputational risk. |
| Unknown people or children default to Needs Review. | Consent risk. |
| No asset goes to Approved Public without metadata. | Prevents looks-fine approvals. |
| Portal review action is not ResourceSpace truth until live writeback is confirmed by re-read. | Prevents queued sidecar state from masquerading as DAM state. |
| `public safe` means Portal Ready, not raw `Approved Public`. | Portal Ready requires rights, people/minors, review, derivative, and lifecycle evidence. |
| AI suggestions stay separate from human-approved fields. | AI cannot decide rights, consent, minors, doctrine, hymn clearance, reviewer identity, or public approval. |
| Smart routing creates review reasons only. | Routing never auto-publishes. |

## Smart Routing Boundaries

Smart routing is an assignment aid. It may label intake or assets with review
reasons such as doctrine/sacrament, music-rights, minors/consent, source
provenance, rendition readiness, taxonomy review, large-media admin intake, or
AI suggestion review. Each reason explains why a reviewer should look next.

Routing does not write ResourceSpace approval, does not change public/internal
status, does not clear rights or consent, and does not turn `Approved Public`
into Portal Ready. TJC recognition terms such as baptism, Holy Communion, Hymns
of Praise, sermon, testimony, RE, doctrine, language, or version/edition route
to safer review queues only.

## Domain Evidence Gates

Public approval must be blocked, or degraded back to review, when domain evidence
is missing or expired:

| Domain | Required evidence before public/channel reuse |
|---|---|
| Minors/youth | Consent/release record or documented exception, people/minors review, and `domain_reviewer = RE/minors`. |
| Doctrine/sacrament | Sensitive-context evidence and `domain_reviewer = doctrine`. |
| Hymn/music | Rights basis, approved channel, required notice when applicable, rights/credit evidence, and `domain_reviewer = music-rights`. |
| Testimony/pastoral | Sensitive-context evidence, audit-safe reviewer note, and `domain_reviewer = pastoral-sensitivity`. |
| Lifecycle | Approval, rights, consent, embargo, withdrawal, and recheck dates must be current. |
| AI/smart suggestions | Human accept/edit/reject decision before suggestions can influence final metadata. |

These checks block portal reuse and public review actions. They do not write
ResourceSpace approval by themselves, and they do not turn pending portal writes
into authoritative ResourceSpace truth.

Review workbench grouping now treats enterprise governance work as first-class
lanes:

| Lane | Purpose |
|---|---|
| Risk triage | Children/youth, sacrament, worship/private context, music/teaching, testimony/private moments, or other sensitive ministry signals. |
| Missing evidence | Approval-critical source, rights, people/minors, usage, reviewer note, consent, or metadata evidence gaps. |
| Stale review | Expired lifecycle evidence, due re-review, embargo/withdrawal/takedown, or older approval that needs recheck. |
| Derivative gap | Missing approved copy, preview/detail derivative, dimensions, or download-ready rendition evidence. |
| Pending write | Portal decision queued; ResourceSpace remains unchanged until sync succeeds or media-team follow-up completes. |

Public approval remains locked while any sensitive ministry evidence lane has a
required blocker. Disabled action reasons must name the missing evidence in
plain reviewer language, such as `Consent/release record missing`,
`Music/teaching rights basis missing`, or `Lifecycle/re-review evidence
expired`.

## Search And Saved-View Boundaries

Search, filters, saved views, collections, package sections, and discovery
suggestions are navigation aids. They cannot override per-asset rights, consent,
domain review, lifecycle, derivative, redaction, or download gates.

When a coworker searches for `public safe`, the portal must return Portal Ready
records only. Raw `Approved Public` records with missing rights basis, consent,
domain reviewer, approved channel, derivative, or current lifecycle evidence stay
in review/debt views instead of broad reuse views.

## Audit / Accountability Boundary

Portal audit events explain who attempted or completed governed actions. They
are accountability evidence, not ResourceSpace approval truth and not a
permission source.

Audit should cover asset views, sensitive asset views, download gates,
approved-copy downloads, blocked downloads, review changes, ResourceSpace write
attempts/success/failure, package decisions, original-access decisions,
rendition requests, duplicate review, taxonomy review, and saved-search signals
as those workflows become real. Future workflows must record blocked/denied
decisions as clearly as approved decisions.

Viewer and Contributor audit read models must not expose source paths, master
paths, checksums, ResourceSpace IDs or internals, signed URLs, original
filenames, import batches, private evidence, or private notes. Reviewer and DAM
Admin views may include operational summaries needed for governance, but generic
exports still avoid custody paths, signed URLs, checksums, and private evidence.

Local `.runtime` audit JSONL is useful for private beta accountability only.
Production requires durable identity-backed audit storage, retention policy,
restore proof, and export/redaction review before audit can be called
production-ready.

## Quality vs Rights vs Publishing

Do not use one field to mean everything.

| Field | Question |
|---|---|
| `quality_status` | Is this useful stock media? |
| `rights_status` | Do we know the source/use rights? |
| `usage_scope` | Where may it be used? |
| `publish_status` | What should users do with it operationally? |
| `reuse_tier` | Is it stock-safe, context-safe, or archive-only? |
| `visibility_tier` | Which roles may discover or preview it? |
| `approved_channels` | Which channels are cleared, such as website, livestream, projection, print, social, or archive only? |
| `sensitivity_class` | Which TJC-specific review domain owns the risk? |

Low-use but safe media should be `Archive - Not Promoted`, not `Do Not Use`. Reserve `Do Not Use` for rights, safety, privacy, or mission-alignment problems.

## Portal Ready Rules

An asset is Portal Ready only when all required evidence is current:

- ResourceSpace status is `Approved Public`.
- Reuse tier is stock-safe or legacy evidence clearly supports broad public use.
- Usage scope allows public or public/internal use.
- Rights basis is known and not internal-only.
- Approved channels allow the intended public use.
- People/minors state is reviewed.
- Children/youth risk has consent/release evidence and RE/minors domain review.
- Sacrament-sensitive media has doctrine review.
- Testimony/pastoral-sensitive media has pastoral sensitivity review.
- Hymn/music media has music-rights review, channel clearance, and required
  notice.
- Reviewer, review date, and notes exist.
- Approved derivative/download copy exists.
- Approval is not expired, embargoed, withdrawn, takedown-requested, or due for
  recheck.

Context-safe assets can be requested for original context or selected channels,
but they are not stock-safe. Archive-only assets are preserved for history and
review, not normal reuse.

## Rendition And Original Access Rules

Approved-copy downloads are governed derivatives. They are not original/master
access. Thumbnail, card, collection, detail, and preview derivatives support
discovery or review only and must not be used as download-grade approved copies.

Approved-copy delivery requires the download gate, terms acceptance, short-lived
ticket, single consume, and audit record. Missing approved-copy/download
derivative evidence blocks Portal Ready and normal reuse.

Original/master access remains request-only. A request must name the purpose,
approver, expiry, audit record, and revocation path before any future workflow
may grant access. Current portal primitives may record request/blocked/pending,
expired, or revoked states, but they do not grant live source-file access.

Viewer and Contributor experiences must never expose source paths, master paths,
original filenames, checksums, signed URLs, EXIF/private source context,
ResourceSpace internals, admin evidence, or private notes.

## Collections And Packages

Collections and packages help organize media for ministry work. They do not
approve media, grant rights, or override item-level policy. A public-approved
collection still blocks package export when any asset in it is not Portal Ready.

A package export/share decision must check every item for source/ref resolution,
rights basis, approved channel, required notice, people/minors consent,
sensitivity/domain review, current lifecycle, withdrawal/takedown state, and
approved-copy derivative readiness. One blocked item blocks package export.

Package output must exclude originals and masters. Normal package export is
approved-copy only and still relies on the approved-copy download gate for file
delivery. Original/master requests stay in the separate request-only workflow.

Local package draft storage and audit events are accountability/readiness
evidence only. Durable share links require future production storage, identity,
expiry, revocation, audit, and per-item permission checks before they can be
enabled.

## Review States

```text
Needs Review
   |
   +--> Approved Internal
   |
   +--> Approved Public
   |
   +--> Searchable Archive
   |
   +--> Archive - Not Promoted
   |
   +--> Do Not Use
```

## Sensitive Media

Keep these in `Needs Review` until a reviewer approves:

- baptism
- footwashing
- holy communion
- worship footage
- sermons
- music or hymns
- minors/children
- unknown people
- volunteer-created media
- third-party design assets
- expired, embargoed, withdrawn, or takedown-requested assets
- context-safe assets requested for broad public use

## Archive Tiers

| Tier | Meaning |
|---|---|
| Approved Stock | Reviewed, tagged, and approved public/internal assets. |
| Searchable Archive | Indexed and traceable, but not publishable until reviewed. |
| Cold Archive / Do Not Use | Duplicate, low-value, restricted, risky, or unreviewed assets. |

Full archive launch should use tiers. Do not promise that every imported archive file is fully reviewed and usable.

## AI And Vocabulary Boundary

AI may suggest titles, OCR, tags, quality hints, duplicate hints, people/minors
risk hints, sensitivity hints, translations, and captions. These suggestions
must stay in `ai_*` or suggestion fields until a human reviewer accepts, edits,
or rejects them. Suggested tags should come from approved historical TJC
vocabulary when possible; sparse or drifting vocabulary creates review tasks
instead of final free-form taxonomy.

## Duplicate And Similarity Boundary

Exact checksum duplicates, near-duplicate hints, crop/derivative hints, and
similarity candidates are reviewer/admin workflow signals. They may help choose
a canonical record, but they never delete, hide, move, or rewrite source media
automatically.
