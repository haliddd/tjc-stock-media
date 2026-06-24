# PRD: Slim Atlas ResourceSpace Portal Cleanup

Status: accepted canon for Slim Atlas cleanup
Date: 2026-06-24
Intake: `docs/planning/slim-atlas-cleanup-intake.html`

## Thesis

Atlas is a thin portal UI on top of ResourceSpace. It should look and feel like the prior Atlas DAM prototype, but it must not become a second DAM, launch command center, package system, approval store, or custody layer.

ResourceSpace remains the source of truth for assets, search, collections/open albums, metadata, previews, review status, permissions, upload/import, and supported audit/activity. Google Shared Drive remains master-original custody. Approved Public/Internal folders are delivery outputs, not the archive.

Reference artifacts:

- `/Users/halim4pro/Downloads/atlas_dam_10_10_full_prototype.html`
- Supplied Atlas DAM prototype image set from June 21-22, 2026

## Goals

- Create a clean slim branch from `origin/main`: `codex/atlas-thin-resourcespace-portal`.
- Rebuild Atlas around core ResourceSpace-backed portal workflows:
  - Library/search
  - Asset usage detail
  - ResourceSpace collections/open albums
  - Request/review
  - Upload/intake
- Keep the prior prototype's visual direction: warm off-white shell, left nav, dense asset grid/table, right inspector, compact cards, quiet controls, and mobile companion behavior.
- Keep all source-media, secret, hosted mutation, deploy, reset, force-push, and worktree deletion actions behind explicit separate approval.

## Non-Goals

- Do not build Atlas as an enterprise DAM replacement.
- Do not keep dashboards, command-center UI, packages/distribution sets, broad governance/admin command centers, or beta/production readiness claims as canonical product surfaces.
- Do not make local queue state the truth.
- Do not claim beta-ready or production-ready from local-only evidence.
- Do not delete, rename, move, or mutate source media.

## Product Requirements

### Library/Search

- Show ResourceSpace-backed assets with safe previews, status, key metadata, usage state, and filters.
- Support grid and table-style browsing where useful.
- Normal users must not see source paths, checksums, private URLs, signed URLs, or admin internals.
- Reviewer/admin views may expose ResourceSpace references only when safe and useful.

### Asset Usage Detail

- Answer in the first viewport: can I use this, why or why not, what scope, and what next.
- Separate approved-copy access from original/master access.
- Keep original/source access restricted and auditable.
- Link or reference ResourceSpace truth where appropriate.

### Collections/Open Albums

- Treat ResourceSpace collections/open albums as canonical grouping.
- Atlas may browse and display collections, but must not invent a separate distribution/package truth.
- Collection UI should preserve item-level usage decisions.

### Request/Review

- Provide a simple request path for viewers/contributors.
- Provide a reviewer path for evidence, blockers, decision notes, and status changes.
- Review writes must update ResourceSpace first when configured and must be confirmed by post-write re-read.
- If ResourceSpace write cannot be confirmed, return queued, failed, or conflict state without claiming success.

### Upload/Intake

- Upload/intake must default every asset to `Needs Review / Do Not Publish`.
- Use ResourceSpace upload/import when safe and configured.
- Large video/audio routes to Shared Drive Incoming or admin intake.
- Source media and master originals stay untouched.

## Technical Requirements

- Start from `origin/main` and manually reapply only thin Atlas pieces. Do not bulk cherry-pick enterprise commits.
- Archive dirty worktree state before any cleanup work. Capture branch, HEAD, status, tracked diff, untracked list, and patch bundles.
- Preserve safety code for role checks, redaction, protected ResourceSpace refs, private source fields, and write confirmation.
- Update docs around "local thin portal over ResourceSpace" and remove enterprise overclaim wording from canonical docs.
- Update tests/guards so validation matches slim portal scope.
- De-canonicalize older enterprise DAM, package/distribution, dashboard, command-center, beta-readiness, and production-readiness artifacts as reference evidence only.

## Ralph Issue Slices

1. Create approved PRD and slim cleanup JSON.
2. Archive dirty worktree/worktree state without deletion.
3. Create clean slim branch from `origin/main`.
4. Reapply prototype-style Atlas shell and core ResourceSpace workflows.
5. Remove or de-canonicalize enterprise replacement surfaces.
6. Update docs, tests, and guards for thin portal.
7. Run validation and request explicit cleanup approval.

## Validation

- `git diff --check`
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run test`
- `npm --prefix frontend run build`
- `node scripts/git-hygiene-guard.mjs`
- Focused smoke for `/library`, `/assets/[id]`, `/collections` or open-album route, `/requests` or `/review`, and `/upload`.

## Approval Gates

The following require explicit separate approval at the moment of action:

- Delete old worktrees or folders.
- Delete, move, rename, or mutate source media.
- Force push, reset, or destructive Git action.
- Hosted mutation, production deploy, public publishing, credential change, or paid external usage.

## Acceptance Criteria

- Clean slim branch exists from `origin/main`.
- Atlas UI matches prior prototype direction while remaining ResourceSpace-backed.
- Core portal workflows work or fail closed.
- Docs no longer describe Atlas as a second DAM or enterprise replacement.
- `docs/START_HERE.md`, `docs/command-matrix.md`, and the live DAM surface codemap describe current slim portal canon.
- Validation gates pass or blockers are recorded.
- No source media, secrets, runtime data, or private originals are committed.
