# Google Photos / Google Drive-Style ResourceSpace Portal PRD

Version: v0.1
Status: superseded as product canon; reference evidence only
Repo baseline: `beta-limited-2026-06-16`
Current decision: superseded by Slim Atlas ResourceSpace portal cleanup

Superseded by `docs/product/PRD-slim-atlas-resourcespace-portal-cleanup.md` and `docs/START_HERE.md`. Use this file only for visual/workflow reference. Do not treat beta, production, package/distribution, admin/governance, or enterprise DAM language here as current Slim Atlas truth.

## 1. Product Thesis

TJC Stock Media should use ResourceSpace as the backend DAM, review system, and source-of-truth record. The custom portal should be the friendly front door that makes ResourceSpace feel as simple as Google Photos and Google Drive for normal church media users.

The portal does not replace Google Shared Drive as the master archive. It does not rename, move, delete, or mutate source media. It helps Viewers find safe media, helps Contributors send media for review, and helps Reviewers/Admins keep approval, rights, consent, source truth, and audit evidence strict.

The product goal is simple: people should be able to find or contribute church media without needing to understand DAM operations, while every asset still answers the safety question: "Can I use this?"

## 2. Target Users

### Viewer

Goal: find approved media for church work and know whether it can be reused.

Common tasks:

- Search by event, theme, person, ministry, date, or media type.
- Browse albums, collections, folders, or timeline groups.
- Open a large preview.
- Save assets to a collection.
- Request reuse or download.
- Download only approved copies when allowed.

What they should see:

- Search-first home.
- Photo grid, albums, collections, folders, timeline, and previews.
- Clear labels such as `Ready to use`, `Needs review`, `Request approval`, or `Restricted`.
- Simple reasons when download is blocked.
- Reference codes when needed for support.

What they should not see:

- Source/original file paths.
- ResourceSpace admin language.
- Raw workflow fields.
- Writeback state, launch gates, or backend implementation details.
- Direct source/original download links.

### Contributor

Goal: upload event photos or batches without training and understand what happens next.

Common tasks:

- Drag and drop event photos.
- Add event name, date, ministry, location, and simple notes.
- Add optional captions and suggested tags.
- Submit for review.
- Track batch status.

What they should see:

- Simple upload wizard.
- Batch description fields.
- Clear `Submitted`, `Needs more info`, `In review`, `Approved`, or `Held` states.
- Friendly guidance that upload does not publish media.

What they should not see:

- ResourceSpace admin forms.
- DAM field mapping complexity.
- Source archive paths.
- Approval controls.
- Public publishing controls.

### Reviewer / Joanna

Goal: decide whether submitted or imported assets can be used publicly, internally, archived, held, or blocked.

Common tasks:

- Review uploaded and imported assets.
- Check rights, consent, minors, worship/sacrament sensitivity, copyright, and usage scope.
- Request evidence.
- Approve for public or internal use.
- Reject, hold, or keep as `Needs Review / Do Not Publish`.

What they should see:

- Review queue.
- Evidence checklist.
- Asset preview and submitted context.
- Required approval fields: title, visible tags, TJC terms, quality status, rights status, publish status, usage scope, reviewer, review date, and approval notes.
- Safe pending-write truth when ResourceSpace live writeback is not approved.

What they should not see:

- Unclear "one click publish" flows.
- Claims that queued review equals ResourceSpace sync.
- Download bypasses.
- Bulk approval without mixed-status warnings.

### DAM Admin

Goal: keep the system honest, traceable, and ready for launch.

Common tasks:

- Monitor import/source truth.
- Manage users, roles, and permissions.
- Manage taxonomy and field mapping.
- Audit downloads, review actions, and pending writes.
- Check launch readiness.

What they should see:

- ResourceSpace/source truth status.
- Google Shared Drive custody notes.
- Import and audit state.
- Role gates.
- Taxonomy and metadata coverage.
- Durable storage and download-ticket readiness.

What they should not see:

- Hidden writes that pretend to be synced.
- Public launch controls before gates are passed.
- Source media mutation tools.
- Any flow that can delete or move source archive media.

## 3. Core User Journeys

### Viewer: Find Approved Media

1. Viewer opens the portal and lands on search-first home.
2. Viewer searches a term such as `Bible`, `family service`, or an event name.
3. Portal returns a photo grid with clear status labels.
4. Viewer filters to approved or ready-to-use media.
5. Viewer opens a result and sees whether it can be used.
6. If approved-copy download is allowed, Viewer accepts terms and downloads the approved copy.
7. If not allowed, Viewer sees the blocker and can request reuse or review.

Acceptance outcome: Viewer can find an approved photo in under 30 seconds and cannot download unsafe media.

### Viewer: Browse Albums / Collections

1. Viewer opens Albums or Collections.
2. Portal shows event, ministry, or curated groupings with cover thumbnails and counts.
3. Viewer opens an album.
4. Portal shows safe counts, mixed-status warnings, and filter chips.
5. Viewer opens assets, saves useful ones, or requests approval.

Acceptance outcome: album browsing feels like Google Photos while keeping item-level approval visible.

### Viewer: Preview Asset

1. Viewer opens an asset from grid, album, timeline, or saved collection.
2. Portal shows large preview, title, date/event context, status, usage scope, and primary action.
3. Portal answers `Can I use this?` before download actions.
4. Source/original files remain hidden by default.

Acceptance outcome: Viewer understands the reuse decision without reading admin metadata.

### Viewer: Request Reuse / Download

1. Viewer opens asset detail.
2. If media is not approved for the desired use, Viewer clicks request.
3. Viewer chooses use case: web, slides, social, print, internal archive, or other.
4. Viewer adds short note and submits.
5. Portal queues request for Reviewer and shows status.

Acceptance outcome: blocked download becomes a clear next step, not a dead end.

### Viewer: Download Approved Copy Only

1. Viewer opens an asset that is portal-ready and approved for the requested scope.
2. Portal requires terms and records audit context.
3. Portal issues approved-copy download only.
4. Source/original/master access stays request-only.

Acceptance outcome: no source file, private URL, original path, checksum, or ResourceSpace secret appears in browser payloads.

### Viewer: Save / Add To Collection

1. Viewer selects one or more assets.
2. Viewer adds them to an existing collection or creates a saved collection.
3. Portal preserves item-level status inside the collection.
4. Mixed-status collections show safe counts and blockers.

Acceptance outcome: collections help planning without weakening rights rules.

### Contributor: Upload Event Photos

1. Contributor opens Upload.
2. Contributor drags photos into the upload zone.
3. Portal asks for event name, event date, ministry, location, contributor name, and notes.
4. Contributor can add simple tags and captions.
5. Contributor submits.
6. Portal marks every uploaded asset `Needs Review / Do Not Publish`.

Acceptance outcome: Contributor can upload without training and cannot accidentally publish.

### Contributor: Track Status

1. Contributor opens My Uploads.
2. Portal shows batches with status, counts, and reviewer requests.
3. Contributor adds missing context or evidence when asked.
4. Portal keeps them informed without showing admin internals.

Acceptance outcome: Contributors know whether a batch is submitted, in review, approved, held, or needs more info.

### Reviewer: Review Submitted / Uploaded Assets

1. Reviewer opens Review Queue.
2. Reviewer filters by upload batch, rights unclear, missing consent, minors, worship/sacrament, or requested reuse.
3. Reviewer opens an item and sees preview, submitter context, ResourceSpace reference, and evidence checklist.
4. Reviewer approves public/internal use only when required evidence is complete.
5. Reviewer requests evidence, rejects, or holds when uncertain.

Acceptance outcome: approval remains evidence-locked and auditable.

### Admin: Monitor Source Truth And Launch Readiness

1. DAM Admin opens Admin.
2. Portal shows ResourceSpace connection/read status, import counts, review state counts, pending writes, audit health, and durable storage state.
3. Admin can trace each asset to ResourceSpace/source truth.
4. Reviewer/support can see what blocks safe use. Production launch blocking belongs outside current Slim Atlas canon.

Acceptance outcome: Admin can prove no unsafe download path, route identity regression, or source-truth claim has slipped.

## 4. Google-Like UX Requirements

The portal should copy the useful patterns from Google Photos and Google Drive, not their source-file assumptions.

- Search-first home: one obvious search field, recent albums, useful filters, and quick access to Upload.
- Photo grid: fast thumbnail scanning, stable tile sizes, status labels, and clear hover/selection states.
- Timeline/date browsing: year, month, event, and day grouping where metadata supports it.
- Albums/collections: cover thumbnail, title, date/event context, safe count, total count, and mixed-status warning.
- Folder/event grouping: simple event/folder hierarchy for users who think in Drive terms.
- Large preview: big image area, simple title/context, reuse decision, and one primary action.
- Multi-select: checkboxes or selection mode with stable selected count.
- Bulk action bar: add to collection, request review, request download, export reference list, or clear selection.
- Drag/drop upload: obvious drop zone, file list, progress state, retry state, and batch metadata form.
- Simple share/request links: internal request links only until public sharing is explicitly approved.
- Clear permission labels: `Ready to use`, `Needs review`, `Rights unclear`, `Restricted source`, `Approved internal`, `Approved public`, and `Do not publish`.
- Empty states: explain next action in one sentence.
- Loading states: preserve layout and avoid jumpy grids.
- Error states: say what failed and what the user can do next.

## 5. DAM-Specific Safety Layer

This portal is not normal Google Photos or Drive. It is a church media safety layer on top of ResourceSpace.

Every asset must answer:

```text
Can I use this?
```

The answer comes from portal reuse checks, not raw visual appeal and not raw ResourceSpace approval alone.

Required states:

- `Approved Public`: may be publicly reusable only after source, rights, people/minors, reviewer/date, usage scope, and approved-copy checks pass.
- `Approved Internal`: may be internally reusable only after required checks pass.
- `Needs Review`: default state for uncertainty.
- `Rights Unclear`: blocked until rights evidence exists.
- `Restricted Source`: source/original cannot be exposed by default.
- `Do Not Publish`: blocked for reuse.

Safety requirements:

- Source/original files are never exposed by default.
- Download requires audit.
- Hosted downloads may remain fail-closed until durable audit/ticket storage exists.
- ResourceSpace ID/reference is visible to Reviewer/Admin and may appear as a sanitized reference code for Viewer support.
- Item evidence decides reuse/download.
- Mixed-status bulk actions must be partial and safe.
- Multi-select cannot turn a blocked item into a downloadable item.
- Public-use approval must include reviewer, review date, usage scope, and notes.
- Unknown people, children, sacrament, worship, sermon, music, or unclear contributor media stays `Needs Review` until rights review approves.

## 6. MVP / Beta Scope

### Already Beta-Ready

- Browse/search.
- ResourceSpace/source-truth visibility.
- Historical photo-only beta scope; not current Slim Atlas readiness claim.
- Review states.
- Local gated download proof.
- Protected hosted URL.
- Upload/review paths prepared.
- Viewer unsafe download remains blocked.
- Reviewer approval without evidence remains blocked.
- Reviewer approval with evidence returns honest queued/pending-write state when live writeback is disabled.

### Next V2 Scope

- Viewer/contributor simplified front door.
- Album/collection UX.
- Multi-select and bulk action polish.
- Clearer asset preview centered on `Can I use this?`.
- Simple upload status tracking.
- Role-aware navigation.
- Request/share flow for internal review and reuse.

### Out Of Scope For Now

- Public launch.
- Full archive import.
- Unrestricted source access.
- Hosted production downloads without durable storage.
- Video/audio.
- Automatic public publishing.
- Live ResourceSpace writeback without explicit approval and proof.
- Google Drive connector/sync.
- Source media deletion, rename, move, or mutation.

## 7. Feature Stories

### 1. Viewer Home / Search

User: Viewer
Goal: find useful approved media quickly.

Acceptance criteria:

- Home page opens with search as the primary action.
- Viewer can search by keyword.
- Results show thumbnail, title/context, date when known, and reuse status.
- Default result view does not expose source paths, admin metadata, or raw writeback state.
- Empty search gives a useful next step.

Safety notes:

- Viewer cannot self-serve download from search cards unless the asset is portal-ready.
- Browser payload does not expose original URLs or source custody details.

### 2. Library Grid / Timeline

User: Viewer
Goal: browse media visually by grid and date.

Acceptance criteria:

- Library supports grid view.
- Timeline/date grouping is available when date metadata exists.
- Tiles have stable dimensions and clear selected/focused states.
- Filters can narrow by status, collection, date, event, and ministry where data exists.

Safety notes:

- `Approved Public` from ResourceSpace is not enough to show `Ready to use`.
- Blocked items remain request/review-only.

### 3. Albums / Collections

User: Viewer
Goal: browse event and curated media groups.

Acceptance criteria:

- Albums show cover, title, date/event context, safe count, total count, and status mix.
- Collection detail shows grid plus simple summary.
- Viewer can save assets to a personal or working collection.
- Mixed-status albums clearly show that not all items are reusable.

Safety notes:

- Album approval never overrides item-level asset approval.
- Bulk download is blocked unless every selected item passes approved-copy checks.

### 4. Multi-Select / Bulk Actions

User: Viewer or Contributor
Goal: act on several assets without losing safety context.

Acceptance criteria:

- User can enter selection mode and select multiple assets.
- Bulk action bar shows selected count.
- Actions include add to collection, request review, request download, and clear selection.
- Mixed-status selection shows partial-safe behavior and explains blocked items.

Safety notes:

- Blocked assets are skipped or sent to request flow, not downloaded.
- Bulk action audit records selected references and allowed/blocked counts.

### 5. Asset Detail: "Can I Use This?"

User: Viewer
Goal: understand reuse permission at the asset level.

Acceptance criteria:

- Asset detail centers a large preview.
- Primary panel answers `Can I use this?`.
- Status, usage scope, approved-copy availability, and blockers are readable in plain language.
- Primary action is download approved copy, request review, or request reuse based on status.

Safety notes:

- Source/original access stays request-only.
- Viewer sees sanitized references only.

### 6. Contributor Upload Wizard

User: Contributor
Goal: upload event photos without training.

Acceptance criteria:

- Upload supports drag and drop.
- Contributor can describe batch with event name, date, ministry, location, and notes.
- Contributor can add simple captions and suggested tags.
- Submit creates a review batch and defaults assets to `Needs Review / Do Not Publish`.
- Upload page states that upload does not publish.

Safety notes:

- No upload can become public without Reviewer approval.
- Large video/audio remains Shared Drive Incoming or admin intake, not portal self-serve for this scope.

### 7. Upload Status Tracking

User: Contributor
Goal: know what happened after upload.

Acceptance criteria:

- Contributor can see My Uploads.
- Batch status shows submitted, in review, needs more info, approved, held, or rejected.
- Reviewer requests for evidence are visible to the contributor.
- Contributor can add missing notes/evidence when requested.

Safety notes:

- Status copy must not imply approval before review is complete.
- Contributor cannot change approval state.

### 8. Request Reuse / Download

User: Viewer
Goal: request safe use when direct download is blocked.

Acceptance criteria:

- Blocked download panel offers request flow.
- Viewer chooses intended use and adds a note.
- Request queues for Reviewer.
- Viewer receives confirmation and can track request state.

Safety notes:

- Request link does not generate a public share link.
- Download remains blocked until approved-copy and audit requirements pass.

### 9. Reviewer Queue

User: Reviewer / Joanna
Goal: decide asset readiness with evidence.

Acceptance criteria:

- Queue supports filters for uploads, reuse requests, missing evidence, rights unclear, minors/people, worship/sacrament, and old requests.
- Reviewer sees preview, contributor context, ResourceSpace reference, and evidence checklist.
- Approval requires reviewer, review date, usage scope, and notes.
- Missing evidence blocks approval.
- Queued writeback is labeled honestly when live ResourceSpace writeback is disabled.

Safety notes:

- Reviewer approval cannot bypass source/original restrictions.
- AI suggestions cannot approve rights.

### 10. Role-Aware Sidebar

User: Viewer, Contributor, Reviewer, DAM Admin
Goal: see only relevant navigation.

Acceptance criteria:

- Viewer sees search, library, albums, collections, requests, and guide.
- Contributor sees upload and My Uploads.
- Reviewer sees review queue and evidence work.
- DAM Admin sees readiness, audit, users, taxonomy, and source truth.
- Navigation labels avoid ResourceSpace internals for normal users.

Safety notes:

- Role gates exist in UI and API.
- Viewer cannot access reviewer/admin data by URL guessing.

### 11. Source Truth / Audit Visibility

User: DAM Admin
Goal: trace every asset and every governed action.

Acceptance criteria:

- Admin can see ResourceSpace reference, source truth state, import/source counts, review counts, pending writes, and audit status.
- Download, review, request, and package actions record audit events.
- Admin sees durable storage readiness and launch blockers.
- Admin can identify route identity or unsafe download regressions.

Safety notes:

- Admin tools do not mutate source media.
- Live writeback requires separate approval and proof.

## 8. Prioritized Roadmap

### Phase 1: Viewer / Contributor Friendly Front Door

Build the simplified home, role-aware navigation, Viewer search, and Contributor upload entry points. Make the first screen feel like a media library, not an admin console.

### Phase 2: Library Visual Polish + Albums + Multi-Select

Improve grid, timeline, albums/collections, selected state, and bulk action bar. Keep item-level safety visible through every bulk action.

### Phase 3: Upload / Status Tracking

Complete upload wizard, batch metadata, My Uploads, contributor evidence requests, and status copy.

### Phase 4: Review / Admin Polish

Tune Reviewer queue, evidence checklist, request handling, role-aware admin views, taxonomy visibility, and pending-write truth.

### Phase 5: Hosted Durable Audit / Download Storage

Add production-grade durable storage for download tickets, audit logs, feedback, saved collections, and requests before hosted production downloads are enabled.

## 9. Success Criteria

- Viewer can find an approved photo in under 30 seconds.
- Contributor can upload event photos without training.
- Reviewer can tell what needs evidence.
- DAM Admin can trace every asset to ResourceSpace/source truth.
- No source files are exposed.
- No unsafe download path exists.
- No route identity regression exists.
- Upload never publishes automatically.
- Raw ResourceSpace approval never becomes portal reuse permission without required evidence.
- Mixed-status bulk actions stay partial and safe.

## 10. Open Decisions

- Which users should be in the first v2 usability test: only current six beta testers, or a new Viewer/Contributor-focused group?
- Should Contributors upload directly to ResourceSpace through the portal in v2, or should v2 queue upload batches for manual admin import first?
- Which collection model should ship first: personal saved collections, shared ministry collections, or event albums?
- What exact status labels should normal users see for `Needs Review`, `Rights Unclear`, and `Restricted Source`?
- When should hosted approved-copy downloads move from fail-closed to enabled: after durable audit storage only, or after durable audit plus production SSO?
- Who owns reviewer policy wording for worship, sacrament, sermons, music, minors, and unclear contributor media?
