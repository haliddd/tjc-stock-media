# Upload Intake Batch Redesign

Date: 2026-06-16

## Summary

Redesign the upload/intake experience from a reviewer-heavy metadata wizard into a batch-first DAM intake flow. Contributors should be able to upload photos, upload a folder of photos where the browser supports folder selection, or paste a Google Drive/source link with minimal manual entry. The DAM then prepares a review packet automatically.

The page becomes `Create intake batch`.

Core promise:

> Drop photos, folders, or paste a Drive link. The DAM will prepare the review packet automatically.

The contributor creates a batch. They do not approve assets, set public usage rights, confirm consent, generate approved derivatives, or change ResourceSpace truth. Every submitted batch remains `Needs Review / Do Not Publish` until a reviewer approves item-level reuse.

## Goals

- Make upload feel like a professional DAM intake flow while requiring Google Photos/Drive-level contributor effort.
- Accept photos, folders, and source links as batch inputs.
- Use folder names and file metadata to infer event/date/source details.
- Replace contributor-required rights/consent/proof/audit fields with reviewer/admin tasks.
- Preserve upload safety gates, role gates, audit logging, large-media routing, and ResourceSpace truth boundaries.
- Keep mobile and 320px layouts clean with no horizontal overflow.

## Non-Goals

- Do not make uploaded media public.
- Do not grant usage scope from contributor input.
- Do not treat AI or system suggestions as approved metadata.
- Do not expose reviewer/admin-only decisions to Viewer or Contributor roles.
- Do not mutate, delete, rename, or move source media.
- Do not implement ResourceSpace writeback unless the existing production-safe write path is actually configured.
- Do not broaden the product into a full import pipeline beyond the upload/intake redesign.

## Product Model

The workflow is:

```text
Contributor uploads media
System detects metadata, flags, duplicates, previews, and suggested tags
Contributor confirms basic batch identity
Batch enters Needs Review / Do Not Publish
Reviewer approves usage scope later
```

Role split:

| Role | Responsibility |
|---|---|
| Contributor | Drop photos/folder/link, confirm event/date/source. |
| System | Parse folder, read file metadata, detect duplicates, suggest tags, flag risks. |
| Reviewer | Confirm rights, people/youth, sensitive content, usage scope, approval, and derivative readiness. |
| DAM Admin | Manage import jobs, ResourceSpace sync, derivatives, field mapping, checksum status, duplicate groups, and audit. |

The UI remains DAM-grade by showing custody, review state, policy flags, confidence, and audit readiness. The contributor experience stays low-friction because only batch identity blocks submission.

## UI Structure

The flow has three steps:

```text
Create intake batch

Step 1: Add media
Step 2: Confirm batch
Step 3: Submit review packet
```

The existing right-side `Submission rules` panel is renamed to `What happens next`.

`What happens next` copy:

```text
1. This batch enters Needs Review.
2. The DAM prepares previews and metadata.
3. Reviewers confirm rights, people/youth, and usage scope.
4. Only approved copies become downloadable.
```

Safety messaging remains present but should not repeat scary compliance text throughout the page.

## Step 1: Add Media

Title:

```text
Add media batch
```

Dropzone copy:

```text
Drop photos, folders, or paste a Google Drive folder link.
We will detect event info, dates, file types, duplicates, and review tasks.
```

Primary inputs:

- Folder/photo upload.
- Google Drive folder or source link.
- Optional `This batch came from...` quick source selector.

Supported actions:

- Upload photos.
- Upload folder where browser supports it.
- Paste Drive folder link.
- Paste existing ResourceSpace/import source link.

Folder upload should use browser-supported folder selection when the browser exposes it. It should preserve the source folder name for detection and reviewer handoff. If browser folder paths are unavailable, the UI should still accept regular multi-file upload and let the user confirm batch identity in step 2.

After media is added, show a scan summary immediately:

```text
Batch scan
128 files detected
126 photos · 2 HEIC · 0 video/audio
Folder name: 2026-06-16 - Youth Service - Elizabeth NJ - John
Detected date: Jun 16, 2026
Possible event: Youth Service
Possible location: Elizabeth NJ
Possible photographer/source: John
Duplicates: checking
Large media: none
```

Use confidence labels:

- `High confidence`
- `Needs confirmation`
- `Reviewer task`

Validation:

- Contributor can continue if `files.length > 0` or `sourceLink` exists.
- Do not block this step on rights, consent, tags, proof, attribution, or usage scope.

Custody panel:

```text
Source custody
Originals stay restricted
Approved derivatives are generated later
Submission creates a review packet only
```

## Step 2: Confirm Batch

Title:

```text
Confirm batch details
```

Subtitle:

```text
We filled this from folder name and file metadata. Edit only what is wrong.
```

Required contributor fields:

- Batch/event name.
- Date.
- Ministry/team.
- Source/photographer/uploader.

If the system detects these values, it should prefill them. The contributor only edits incorrect or missing values.

Example source folder:

```text
2026-06-16 - Youth Service - Elizabeth NJ - John
```

Detected fields:

```text
Event: Youth Service
Date: 06/16/2026
Location: Elizabeth NJ
Source: John
```

Optional fields:

- Location.
- Collection.
- Language.
- Notes.
- Intended use.
- Tags.

Requested use remains DAM-style but is not approval. Label it `Requested use`.

Options:

- Website.
- Social.
- Newsletter.
- Slides.
- Print.
- Internal training.
- Public external use.
- Archive only.

Required copy:

```text
Requested use helps reviewers prioritize. It does not approve publishing.
```

The contributor-required flow removes these fields:

- Owner/license status.
- Proof document.
- Attribution requirement.
- Copyright notes.
- Expiration date.
- Consent/release attached.
- Approved derivative.
- Audit note.

Instead, show automatic explanation cards:

```text
Rights assumption
TJC-created media / reviewer verifies before public use.

People/youth
System will flag likely people or youth. Reviewer confirms before approval.

Consent/release
Not required to submit. Required before public/external approval when people/youth appear.
```

Folder naming helper:

```text
Best folder name:
YYYY-MM-DD - Event Name - Church/Location - Photographer

Example:
2026-06-16 - Youth Service - Elizabeth NJ - John

Any folder name works. Better names improve auto-fill.
```

The naming pattern is encouraged, not required.

## Automation Layer

The upload process should feel automated because the DAM prepares the review packet in the background.

### Folder-Name Parser

Structured input:

```text
2026-06-16 - Youth Service - Elizabeth NJ - John
```

Output:

```text
date: 2026-06-16
eventName: Youth Service
location: Elizabeth NJ
source: John
confidence: high
```

Messy input:

```text
youth service john june
```

Output:

```text
eventName: Youth Service
source: John
date: needs confirmation
confidence: medium
```

The parser should prefer deterministic text and date parsing over AI. Ambiguous values become `Needs confirmation`, not hidden assumptions.

### File Inventory

Auto-detect where available:

- File count.
- File types.
- Extensions.
- File sizes.
- Dimensions.
- Capture date.
- Folder path or folder name.
- Original filenames.

### Duplicate Detection

At minimum, detect or prepare hooks for:

- Same filename.
- Same size.
- Same checksum when available.
- Similar timestamp.

Duplicate findings create reviewer tasks, not contributor blockers.

### Metadata Suggestions

Suggest:

- Visible tags.
- TJC terms.
- Event terms.
- Collection candidates.
- Media type.
- Orientation.
- Possible website hero candidates.

All suggestions must be labeled:

```text
Suggested by system
Reviewer must approve before search/taxonomy changes become final.
```

### People, Youth, And Sensitive Flags

Initial detection can use simple text signals from folder names, filenames, tags, source link, or contributor notes.

Keywords include:

- youth
- RE
- children
- baptism
- testimony
- communion
- footwashing
- choir
- hymn
- livestream

Possible flags:

- Possible youth/minors.
- Possible doctrine/sacrament review.
- Possible music/hymn rights review.
- Possible pastoral sensitivity.

Flags never approve or reject assets. They route the batch for review.

### Large Media Routing

If a file is video/audio or over the browser limit:

- Route to admin intake.
- Do not upload through the normal browser photo path.
- Keep the source in Drive/admin import path.

Copy:

```text
Video/audio and large files are accepted through admin intake so originals stay protected and imports do not fail in the browser.
```

## Step 3: Submit Review Packet

Title:

```text
Review packet summary
```

The summary should show confident DAM cards, not a long contributor evidence checklist.

Card 1: Media

```text
128 files
126 photos
2 HEIC
0 video/audio
4 possible duplicates
```

Card 2: Detected metadata

```text
Event: Youth Service
Date: Jun 16, 2026
Ministry: Youth / RE
Source: John
Confidence: Medium
```

Card 3: Reviewer tasks

```text
People/youth: Needs reviewer confirmation
Rights: TJC-created assumption, reviewer verifies
Consent: Required only if people/youth are approved for public use
Derivatives: Generate after review
```

Card 4: Submission state

```text
Status after submit:
Needs Review / Do Not Publish

Download:
Blocked until reviewer approval

Originals:
Restricted
```

Main button:

```text
Submit batch for DAM review
```

After submit, show:

```text
Batch submitted
Your media is safely in the DAM review queue.

Nothing is public yet.
Reviewers will confirm rights, people/youth, usage scope, and approved copies.
```

Next actions:

- View batch status.
- Upload another batch.
- Copy batch reference.

The current detailed evidence checklist should move to reviewer-facing surfaces. Contributors see `Reviewer tasks created: N`.

Reviewer-facing checklist:

- Owner/license evidence.
- Copyright proof.
- Attribution requirement.
- Consent/release.
- People/minors visibility.
- Usage scope.
- Expiration date.
- Approved derivative.
- Source restriction confirmed.
- Audit note.

## Reviewer And Admin Handoff

Reviewers should see batches first, then assets.

Example batch queue row:

```text
Batch: 2026-06-16 Youth Service
128 files
84 likely safe detail/no-people photos
32 people visible
12 possible youth
4 duplicates
6 missing metadata tasks
```

Reviewer actions:

- Open batch.
- Bulk approve safe no-people assets.
- Hold possible youth assets.
- Request more info from uploader.
- Archive duplicates.
- Send to domain reviewer.
- Generate approved derivatives.
- Approve selected assets for website/social/slides.

Each asset gets a review packet:

- Source.
- File metadata.
- Detected tags.
- Suggested TJC terms.
- People/youth flag.
- Rights assumption.
- Requested use.
- Derivative status.
- Duplicate status.
- Audit history.

Reviewer final decisions:

- Approve public.
- Approve internal.
- Needs more info.
- Archive only.
- Do not publish externally.
- Do not use.

DAM Admin sees:

- Import source.
- ResourceSpace sync state.
- Derivative generation.
- Checksum status.
- Duplicate groups.
- Pending writes.
- Field map readiness.
- Audit log.

## Backend Behavior

The upload API should separate:

```text
contributorRequired
reviewerTasks
systemWarnings
adminTasks
```

Contributor blockers:

- No files and no source link.
- No batch/event identity after detection or manual input.
- No source/uploader if not inferable.
- Unsupported or unsafe file batch.

Reviewer tasks:

- Rights unknown.
- People unknown.
- Minors unknown.
- Consent missing.
- Noncanonical tags.
- Duplicate candidates.
- Sensitive-context flags.

Admin tasks:

- Derivative missing.
- Large media admin intake.
- ResourceSpace sync pending.
- Field map readiness.
- Checksum or duplicate group processing.

Noncanonical tags should become taxonomy reviewer tasks instead of contributor blockers where this is safe. They should remain clearly marked as suggestions and never become approved final tags automatically.

Existing safety behavior must remain:

- Preserve `canUpload` role gate.
- Preserve `Needs Review / Do Not Publish` defaults.
- Preserve large media routing.
- Preserve audit logging.
- Preserve production runtime write restrictions.
- Preserve private source path redaction for Viewer payloads.
- Preserve ResourceSpace as the authoritative approval/review record.

## Intake Batch Shape

Conceptual type:

```ts
type IntakeBatch = {
  id: string;
  status: "draft" | "submitted" | "processing" | "needs-review";
  defaultAssetStatus: "Needs Review";
  defaultUsageScope: "Do Not Publish";

  source: {
    kind: "browser-upload" | "folder-upload" | "drive-link" | "admin-import";
    sourceLink?: string;
    folderName?: string;
    uploader: string;
  };

  detected: {
    eventName?: string;
    eventDate?: string;
    ministry?: string;
    location?: string;
    photographer?: string;
    confidence: "high" | "medium" | "low";
  };

  mediaInventory: {
    fileCount: number;
    photoCount: number;
    videoCount: number;
    audioCount: number;
    heicCount: number;
    totalBytes: number;
    largeMediaCount: number;
  };

  suggestions: {
    tags: string[];
    tjcTerms: string[];
    collections: string[];
    requestedUse: string[];
  };

  riskFlags: string[];
  reviewerTasks: string[];
  adminTasks: string[];
};
```

Implementation can map this shape onto existing upload intake types incrementally. The boundary that matters is behavioral: contributor blockers are narrow; reviewer/admin work is explicit.

## Frontend Implementation Targets

Likely files:

- `frontend/components/UploadPage.tsx`
- `frontend/components/UploadFileDropzone.tsx`
- `frontend/components/dam/DamFormFlow.tsx`
- Upload wizard CSS in `frontend/app/globals.css` and/or `frontend/app/dam-enterprise.css`
- Upload-related docs

Design changes:

- Rename page to `Create intake batch`.
- Reduce wizard from five steps to three steps.
- Make Add media the primary visual surface.
- Add folder upload where browser support allows it.
- Add batch scan summary and confidence chips.
- Rename side panel to `What happens next`.
- Replace disabled-submit mystery with clear missing requirement chips.
- Autosave draft fields to browser-local storage for Contributor users. The UI must label this as a local draft, not durable DAM storage. Selected files do not need to persist across reloads.
- Keep dense DAM styling but reduce repeated compliance copy.

## Backend Implementation Targets

Likely files:

- `frontend/app/api/upload/route.ts`
- `frontend/lib/upload-intake.ts`
- `frontend/lib/intake-routing.ts`
- `frontend/lib/workflow-policy.ts`
- `frontend/lib/request-validation.ts`
- Upload/intake tests
- Browser QA scripts that touch upload

Behavior changes:

- Add deterministic folder/source name parsing.
- Add media inventory summary.
- Add detected metadata confidence.
- Change required validation to narrow contributor blockers.
- Convert rights/consent/proof/audit gaps into reviewer/admin tasks.
- Convert noncanonical tags into taxonomy tasks when safe.
- Preserve large-media and video/audio admin routing.
- Return honest upload response that says whether ResourceSpace was written, queued, or only locally/audit logged.

## Error Handling

- Invalid source links show inline field error.
- No files/source link shows a missing requirement chip.
- Missing batch identity shows a missing requirement chip.
- Unsupported video/audio or oversized files show admin-intake routing, not a generic failure.
- API failures should state that no public asset was created.
- Draft save failures should not claim durable storage.

## Testing And QA

Required verification:

- Typecheck.
- Unit tests for folder-name parser and upload intake validation.
- Existing upload/intake tests.
- Build.
- Upload API smoke.
- Browser QA for upload at desktop and mobile widths, including 320px no-horizontal-overflow.

Key scenarios:

- Multi-photo upload with structured folder name.
- Multi-photo upload with messy folder name.
- Source-link-only batch.
- Missing file/link blocked.
- Missing detected/manual batch identity blocked.
- Unknown rights/people/minors submitted as reviewer tasks.
- Noncanonical tags submitted as taxonomy task, not final metadata.
- Video/audio or large files route to admin intake.
- Contributor cannot approve assets or unlock downloads.

## Acceptance Criteria

- Contributor can upload photos/folder or paste Drive link with minimal fields.
- Folder name auto-fills event/date/source when possible.
- Rights/consent/proof/audit are not contributor blockers.
- Submission never publishes media.
- All submissions default to `Needs Review / Do Not Publish`.
- Risk flags become reviewer/admin tasks.
- Large video/audio routes away from normal browser upload.
- Reviewer sees batch-level review packet.
- Admin sees import/derivative/sync readiness.
- Role gates remain unchanged.
- Viewer/Contributor cannot approve assets.
- Download remains blocked until portal-ready policy passes.
- Typecheck, tests, build, upload API smoke, and browser QA pass before shipping.
- Docs explain the contributor-vs-reviewer upload responsibility split.

## Open Implementation Notes

- Browser folder uploads depend on platform/browser support. The fallback is multi-file upload plus manual batch identity confirmation.
- File dimensions and capture dates may need client-side probing for selected images. If not available in the first implementation slice, show `Needs confirmation` and keep the reviewer task explicit.
- Checksums may be expensive for large batches. The first implementation can use filename/size/timestamp duplicate hints and preserve checksum hooks for admin/import processing.
- AI-assisted tag or people detection is optional. Deterministic text and metadata signals are enough for the first version, as long as suggestions remain reviewer-confirmed.
