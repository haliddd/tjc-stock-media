# EDAM-05 Upload Intake Evidence

## Result

DONE.

Actual branch: `codex/edam-05-upload-intake`.

Runtime note: Completed under the 60 minute target because all lane acceptance checks passed, evidence was written, and the remaining safe stretch items in scope were covered by shared policy constants, UI/API assertions, and import-audit wording.

## Changes

- Clarified beta upload boundaries in shared workflow policy and both upload UIs.
- Added explicit allowed and forbidden categories for contributors:
  - Allowed: event photos, ministry graphics, source folders, Drive/source links, focused browser batches, reviewer evidence.
  - Forbidden from browser upload: video/audio, files over 100 MB, source-media mutation, Git media commits, public approval, download enablement, ResourceSpace approval writeback.
- Updated upload dropzones to accept image/light graphics only and route large media to Shared Drive Incoming/admin intake.
- Added API response fields that make intake state explicit: received, Needs Review, Do Not Publish, publishable false.
- Returned review warnings and beta boundaries from upload response so receipts can show governance state without claiming live archive import.
- Updated import audit copy so `make import-audit` remains audit-only and no longer nudges import without operator approval.

## Validation

```bash
npm --prefix frontend run typecheck
```

Passed.

```bash
npm --prefix frontend run test -- upload-intake
```

Passed: 2 files, 11 tests.

```bash
npm --prefix frontend run test
```

Passed: 21 files, 159 tests.

```bash
node scripts/api-audit-guard.mjs
```

Passed.

```bash
node scripts/api-payload-guard.mjs
```

Passed.

```bash
SAFE_LANE_EXPECTED_WORKTREE=/Users/halim4pro/.codex/worktrees/8a22/tjc-stock-media make import-audit
```

Passed. The default command first blocked because the safe-lane guard expects the canonical checkout at `/Users/halim4pro/Desktop/MVP/tjc-stock-media`; this worker is correctly running in `/Users/halim4pro/.codex/worktrees/8a22/tjc-stock-media`. Rerun used explicit expected worktree for this worker lane.

Audit output:

- Source: `/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Imported/MVP 2024`
- Files: 181
- Size: 480M
- Manifest: `.runtime/audits/mvp-2024-manifest-20260617-205957.csv`
- Summary: `.runtime/audits/mvp-2024-summary-20260617-205957.md`
- Safety: audit only; no source media renamed, moved, deleted, or imported.

## Remaining Blockers

- None in this lane.
- `npm ci` reported existing dependency audit warnings after installing locked frontend dependencies; this lane did not change dependency versions.

## Cross-Lane Dependencies

- Review/admin lanes should keep interpreting upload output as review packet evidence only, with `resourceSpaceWritten: false`.
- Integration/storage lanes should preserve Shared Drive as master copy and ResourceSpace as review/search layer.
