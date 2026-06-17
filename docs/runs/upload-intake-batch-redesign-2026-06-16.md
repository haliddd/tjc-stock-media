# Upload intake batch redesign - 2026-06-16

## Scope

Redesigned `/upload` from a contributor evidence checklist into `Create intake batch`.

Goal: make upload feel close to Google Photos/Drive for contributors while preserving DAM custody, review state, policy flags, and audit readiness.

## Product behavior

New flow:

1. Add media
2. Confirm batch
3. Submit review packet

Contributor can add photos, a browser folder, or a source link. The system scans media, parses folder/source names, suggests metadata, flags risks, and creates reviewer/admin tasks.

Required contributor fields are only batch/event name, date, ministry/team, and source/uploader.

## Safety invariant

Every submitted batch defaults to:

```text
Needs Review / Do Not Publish
```

Upload does not publish media, grant downloads, approve rights, approve consent, approve tags, generate approved derivatives, or write ResourceSpace approval truth.

## Automation added

- Deterministic folder/source-name parser.
- Media inventory for file count, type counts, HEIC, large media, extensions, total bytes, folder name, and original filenames.
- Duplicate hints by filename, size, and similar timestamp.
- Risk flags for youth/minors, doctrine/sacrament, hymn/music rights, and pastoral sensitivity.
- Reviewer/admin task separation in upload API response.

## Storage/custody

Local/private beta records can persist under `.runtime/intake-batches/<batchId>`.

Stored records redact source links and avoid exposing private local paths in API payloads. Production browser file upload is blocked without durable storage rather than pretending persistence exists. Source-link-only intake can return `source-link-only`.

Large video/audio routes to admin intake tasks and does not create approved media.

## Files changed

- `frontend/components/dam/enterprise/EnterpriseDamRedesign.tsx`
- `frontend/app/dam-enterprise.css`
- `frontend/lib/upload-intake-detection.ts`
- `frontend/lib/upload-intake-detection.test.ts`
- `frontend/lib/intake-batch-store.ts`
- `frontend/lib/upload-intake.ts`
- `frontend/lib/upload-intake.test.ts`
- `frontend/lib/runtime-file-store.ts`
- `frontend/app/api/upload/route.ts`
- `scripts/portal-api-smoke.sh`
- `scripts/portal-browser-qa.mjs`
- `scripts/api-payload-guard.mjs`
- `docs/joanna-mini-beta-upload-guide.md`

## Verification

Passed:

- `npm run typecheck`
- `npm run test`
- `npm run build`
- `SAFE_LANE_EXPECTED_WORKTREE=/Users/halim4pro/Desktop/MVP/tjc-stock-media-upload-intake-batch-redesign make frontend-check`
- `node scripts/api-payload-guard.mjs`
- `node scripts/storage-honesty-guard.mjs`
- `SAFE_LANE_EXPECTED_WORKTREE=/Users/halim4pro/Desktop/MVP/tjc-stock-media-upload-intake-batch-redesign BASE_URL=http://localhost:4872 SSO_TRUSTED_HEADERS=1 make portal-api-smoke`
- Focused Playwright upload probe at 1440, 390, and 320 px: no horizontal overflow; file/source-link intake advanced to review packet; `Needs Review / Do Not Publish` visible.

Notes:

- One parallel standalone build failed when it collided with a simultaneous `frontend-check` build deleting/recreating `.next`. Rerun standalone build passed.
- Full `make portal-browser-qa` still reports broader existing failures in package/library/request/admin proof expectations. Upload-specific fixes were patched afterward and verified with the focused upload probe. The generated report is `docs/screenshots/qa/browser-qa-report.json`.

## Remaining intentional limits

- No production ResourceSpace writeback.
- No public approval from upload.
- No original/master download.
- No full reviewer batch queue beyond explicit response/handoff data in this slice.
- Production durable storage still required before real browser file intake launch.
