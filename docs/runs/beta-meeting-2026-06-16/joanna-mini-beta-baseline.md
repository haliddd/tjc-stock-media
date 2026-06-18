# Joanna Mini Beta Baseline

Date: 2026-06-16
Scope: Joanna-testable photo-only mini beta, not public launch and not broad team beta.

## Git

- Branch: `codex/final-stock-media-canonical-2026-06-15`
- Remotes:
  - `haliddd` -> `https://github.com/haliddd/tjc-stock-media.git`
  - `origin` -> `https://github.com/Hali0321/tjc-stock-media.git`
- Wrong-remote risk: do not push without explicit Hali confirmation of target remote.
- `prd.json`: present; not overwritten.
- Unrelated dirty files: preserved. Worktree was already dirty before Joanna mini-beta changes.

## Dirty Worktree At Baseline

`git status --short` showed many existing modified docs, frontend files, scripts, and untracked Joanna/run files. Notable pre-existing dirty groups:

- `AGENTS.md`
- `docs/runs/evidence/2026-06-15/*`
- `docs/specs/2026-06-16-demo-week-1-beta-plan.md`
- `docs/team-beta-*`
- `frontend/app/*`
- `frontend/components/*`
- `frontend/lib/*`
- `scripts/*`
- deleted `docs/superpowers/*`
- untracked `docs/runs/beta-meeting-2026-06-16/`
- untracked `docs/specs/2026-06-16-joanna-testable-mini-beta-execution-plan.md`
- untracked `frontend/lib/dam-filenames.*`

No unrelated dirty files were reverted.

## Baseline Commands

| Command | Result |
|---|---|
| `rg -n "Joanna-testable\|mini beta\|not a public launch" docs/specs docs/runs/beta-meeting-2026-06-16` | PASS. Plan exists and names Joanna mini beta / not public launch. |
| `npm --prefix frontend run typecheck` | Initial FAIL before build. Stale `.next/types` entries were referenced by `frontend/tsconfig.json`. |
| `npm --prefix frontend test` | PASS. 11 files, 104 tests. |
| `npm --prefix frontend run build` | PASS. Next build regenerated `.next/types` and completed type validation. |
| `npm --prefix frontend run typecheck` after build | PASS. |

## Hosted URL Assumptions

- Existing candidate URL from prior docs: `https://tjc-stock-media.vercel.app`
- Prior hosted read-only probes indicated anonymous traffic redirected/denied to beta login/session.
- No hosted mutating smoke is approved in this run.
- Hosted access is not Joanna-send-ready until read-only recheck, account/password provisioning, and Hali approval to share.

## Current Blockers

- Hosted durable/fail-closed state still needs owner confirmation for Joanna testing.
- Azure Student VM / Oracle Free Tier account actions require human-owned browser/account steps and must stop before paid prompts.
- Live ResourceSpace writeback remains out of scope unless separately proven.
- Current local portal uses ResourceSpace/export-backed model or demo fallback where export/API is unavailable.
