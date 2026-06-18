# EDAM-07 Delivery / Packages Evidence

## Result

PARTIAL: delivery/package workflow improved and safety checks passed. Portal package/saved-search smoke Make targets were blocked by safe-lane checkout guard because this worker ran in `/Users/halim4pro/.codex/worktrees/0f66/tjc-stock-media`, while the guard only permits `/Users/halim4pro/Desktop/MVP/tjc-stock-media`.

## Changes

- Package builder now separates draft, review request, and reviewer-cleared request states.
- Package readiness action marks a local draft `pending-review` without creating ZIPs, public links, downloads, source copies, external shares, or DAM writeback.
- Requests, My Tasks, and Recent Uploads are role-scoped for Viewer, Contributor, Reviewer, and DAM Admin.
- Empty states now explain what is clear for the current role and that requests/tasks do not approve public use or grant file access.
- Asset actions copy public asset ids for non-ops users; ResourceSpace refs remain limited to ops views.
- Added focused Vitest coverage for package draft refs, saved search criteria, and public copy refs.

## Contract Freeze Alignment

- Role-action matrix: Viewer sees request/context work only; Contributor sees intake and derivative request drafting; Reviewer and DAM Admin see review, blocker, and triage lanes.
- State machine: package draft stays draft-safe; `pending-review` means reviewer readiness packet only.
- API redaction contract: package and saved-search payloads use sanitized refs/criteria; non-ops copy actions use public asset ids.
- Overclaim ban: package membership never grants approval, download rights, public links, source access, ZIPs, external shares, or ResourceSpace writeback.
- Success matrix: lane improves operator clarity, workflow depth, governance, role fit, and evidence.

## P0 Gate Impact

P0 gate impact: no gate loosening. Delivery/download/source-access gates remain closed. This lane removes overclaim risk by replacing share/download-approved wording with request/review wording and keeps packages, requests, tasks, and saved searches draft-safe/sanitized.

Lane score recommendation: 2. Useful beta improvement with role-fit workflow and safety evidence. Recommend score 3 only after orchestrator can run guarded portal package/saved-search smokes from expected checkout or updates safe-lane guard for worker worktrees.

## Validation

PASS:

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run test
node scripts/api-payload-guard.mjs
node scripts/storage-honesty-guard.mjs
node scripts/api-identity-guard.mjs
node scripts/private-source-guard.mjs
git diff --check
```

Focused test also passed:

```bash
npm --prefix frontend run test -- --run lib/delivery-packages.test.ts
```

Blocked:

```bash
BASE_URL=http://localhost:4871 make portal-package-smoke
BASE_URL=http://localhost:4871 make portal-saved-search-smoke
```

Both failed at `scripts/safe-lane-headroom-guard.mjs` with:

```text
run portal-smoke only inside expected checkout /Users/halim4pro/Desktop/MVP/tjc-stock-media; got /Users/halim4pro/.codex/worktrees/0f66/tjc-stock-media
```

Direct smoke scripts against this worktree's own Next dev server on port 4881 hit the same guard and were not bypassed.

Blocked:

```bash
npm --prefix frontend run build
```

Build preflight failed because an existing process is listening on port 4871:

```text
Dev server build guard failed:
- Port 4871 is listening on 127.0.0.1; stop dev server before production build.
```

## Safety Notes

- No source media touched.
- No hosted mutation, deploy, credential/env change, force push, or public publishing.
- Local dev server started on 4881 for smoke attempt and stopped.
- `npm ci --prefix frontend` installed local dependencies so validation could run; lockfile unchanged.
- Pre-existing unrelated dirty files left untouched: `AGENTS.md`, `.hermes/`, `.superpowers/`.
