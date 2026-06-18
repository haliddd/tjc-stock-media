# EDAM-01 Repo Hygiene Evidence

Date: 2026-06-18
Branch: `codex/edam-01-repo-hygiene`
Base worktree head before local edits: `97d39d6 docs: capture team beta gap audit`

## Mission Result

DONE.

Repo hygiene was tightened without product behavior changes. Public GitHub safety checks pass. Current worktree is intentionally not fully clean because `.hermes/` contains orchestrator-owned plan files that this lane did not claim or ignore.

## Dirty Tree Resolution

- `AGENTS.md` generated memory timestamp drift was normalized back to tracked content. No `AGENTS.md` diff remains.
- `.superpowers/` local output is now ignored through `.gitignore`.
- `.hermes/plans/` remains untracked and visible. Policy: orchestrator owns `.hermes/plans/`; EDAM-01 documents it but does not track or hide it.

## Public GitHub Safety Changes

- `.gitignore` now ignores:
  - `.env.*` except `.env.example` and `.env.production.example`
  - `.superpowers/`
  - `credentials/`, `secrets/`, private key/cert files
  - source media extensions including `webp`, `arw`, and `zip`
  - model/runtime artifacts including `models/`, `ComfyUI/`, `*.safetensors`, `*.ckpt`, `*.pt`, `*.pth`, and `*.onnx`
- `scripts/git-hygiene-guard.mjs` now rejects tracked:
  - `webp`, `arw`, and `zip` media files unless explicitly approved by existing allowlists
  - standalone model weight artifacts
  - credential/key artifacts such as service-account JSON and private key files
- `scripts/git-hygiene-guard-test.mjs` now proves the new failures.

## Branch Divergence

`git rev-list --left-right --count origin/main...HEAD`:

```text
1	46
```

Meaning: this branch head is 1 commit behind `origin/main` and 46 commits ahead of `origin/main` before local uncommitted hygiene edits.

## Tracked Media Audit

`git ls-files | rg -i '\.(jpg|jpeg|png|gif|webp|mp4|mov|zip|heic|tif|tiff)$'` returned only approved screenshots and brand assets:

- `docs/screenshots/free-internal-beta-2026-06-12/*.png`
- `docs/screenshots/primitive-proof/*.png`
- `frontend/public/brand/tjc-logo-english-color.png`
- `frontend/public/brand/tjc-logo-english-white.png`

No tracked `webp`, video, zip, HEIC, TIFF, or source-media files were found.

## Ignore/Untracked Audit

`git ls-files .env .runtime .superpowers` returned 0 files.

`git check-ignore -v` confirmed ignore coverage for:

- `.env`
- `.env.local`
- `.runtime/audit-log/events.jsonl`
- `data/runtime/beta-feedback.json`
- `frontend/node_modules/pkg/index.js`
- `source-media/photo.jpg`
- `source-media/photo.webp`
- `source-media/album.zip`
- `credentials/google-credentials.json`
- `models/model.safetensors`
- `ComfyUI/output/render.png`

## Validation

PASS:

```bash
git status --short --branch
git ls-files .env .runtime .superpowers
git ls-files | rg -i '\.(jpg|jpeg|png|gif|webp|mp4|mov|zip|heic|tif|tiff)$'
node scripts/git-hygiene-guard.mjs
node scripts/public-env-guard.mjs
node scripts/private-source-guard.mjs
node scripts/git-hygiene-guard-test.mjs
git diff --check
```

Final `git status --short --branch` at evidence time:

```text
## codex/edam-01-repo-hygiene
 M .gitignore
 M scripts/git-hygiene-guard-test.mjs
 M scripts/git-hygiene-guard.mjs
?? .hermes/
```

## Runtime

Target runtime: 60 minutes.
Actual runtime: under 60 minutes.
Reason under 60: all lane acceptance criteria passed, guard self-test was expanded, evidence was written, and remaining `.hermes/` ownership belongs to orchestrator lane.

## Blockers and Cross-Lane Dependencies

- Blocker: none for EDAM-01.
- Cross-lane dependency: ORCH-00 should decide whether `.hermes/plans/` is tracked in orchestrator branch or excluded from integration. EDAM-01 intentionally leaves it visible.

## Rerun Commands

```bash
git status --short --branch
git ls-files .env .runtime .superpowers
git ls-files | rg -i '\.(jpg|jpeg|png|gif|webp|mp4|mov|zip|heic|tif|tiff)$'
node scripts/git-hygiene-guard.mjs
node scripts/public-env-guard.mjs
node scripts/private-source-guard.mjs
node scripts/git-hygiene-guard-test.mjs
git diff --check
```
