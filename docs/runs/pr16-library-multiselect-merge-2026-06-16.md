# PR #16 Library multi-select merge note

Date: 2026-06-16

## Decision

`main` is frozen as the stable **beta ready with limitations** baseline plus UI-v2-1 Library multi-select.

Final decision remains:

```text
Beta ready with limitations
```

## Baseline and merge

- Protected beta tag: `beta-limited-2026-06-16`
- Tag target: `9a0591cb67616a2726f79b7c96612880d2fe081a`
- Previous main freeze-note baseline: `663f62845b427ea56acd2ed3f7098acf6ee035c7`
- PR: `#16` — `Add enterprise Library multi-select and bulk actions`
- PR head merged: `97fd1428a524559bcfec0055df4892d6205a73e2`
- Squash merge / main HEAD after merge: `4139508c34305680912d64b7744ad565a907bcfc`

## What PR #16 added

- Grid and table Library multi-select.
- Checkbox selection, Cmd/Ctrl toggle, Shift range selection, Escape clear, and Select all visible.
- Sticky bulk action bar.
- Multi-selection right rail summary.
- Role-aware action visibility.
- Honest bulk-action boundaries.
- Safe client-side CSV metadata export for selected visible role-safe assets only.

CSV export fields are limited to:

```text
id,title,status,type,collection,rights,usage-scope,reference
```

## Safety boundaries preserved

PR #16 does **not** add:

- bulk ResourceSpace writeback
- source/original download
- public links
- ZIP export
- copied originals
- unsafe bulk approved-copy download
- reviewer/admin controls for Viewer
- approval/rejection outside existing review workflow

Unsafe or unimplemented bulk actions remain disabled with helper copy.

## Verification after merge

Checks passed on `main` after PR #16 merge:

- `git diff --check`
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend test` — 69 passed
- `npm --prefix frontend run build`
- `api-identity-guard`
- `api-payload-guard`
- `private-source-guard`
- `public-env-guard`
- `storage-honesty-guard`
- `live-dam-surface-guard`
- `git-hygiene-guard`
- `launch-readiness.sh` — failures `0`, warnings `3`

Launch-readiness warnings:

- `.env missing`
- `.runtime/audit-log missing`
- `.runtime/backups missing`

Local Playwright proof passed:

- reviewer grid selection
- reviewer table selection
- sticky bulk bar
- Export metadata enabled
- unsafe bulk actions disabled
- multi-select rail
- Viewer has no reviewer/admin bulk controls
- no console errors

Proof files from local run:

- `/tmp/main-pr16-visual-proof.json`
- `/tmp/main-pr16-reviewer-grid.png`
- `/tmp/main-pr16-reviewer-table.png`
- `/tmp/main-pr16-viewer-grid.png`

## Open work intentionally left open

- PR `#4`: open draft, broad integration/reference track.
- PR `#14`: open draft, broad premium UI reference track.
- PR `#15`: open draft, connected/cloud proof track.
- Issue `#1`: open beta limitation/follow-up. Library bulk-action honesty improved through PR #16, but the issue remains open for full beta persona/dead-action verification across the app.

## External systems

No hosted mutating tests were run. No manual deploy, branch delete, source-media change, `prd.json` overwrite, env change, ResourceSpace/Drive/Cloudflare/DNS/billing/S3 change, or Hali0321 write was performed as part of this merge verification.

## Next branch

Start UI-v2-2 from current `main`:

```text
design/library-polish-v2
```

Scope UI-v2-2 to Library polish only: grid density, right rail polish, mobile/overflow cleanup, and empty/preview states.
