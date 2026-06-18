# EDAM-03 Library/Search Evidence

Status: PARTIAL. Library/search implementation complete and aligned to ORCH-00 contract freeze; browser QA blocked by safe-lane checkout guard in Codex worktree.

Runtime:
- Target: 60 minutes active worker lane.
- Actual: under 60 minutes.
- Reason under target: assigned acceptance criteria passed or were blocked by guard; added focused privacy/unit proof after implementation. Remaining stretch would require editing shared CSS or running guarded browser QA from canonical checkout, both higher conflict/out of lane.

Changed behavior:
- Added `assetLibraryScanSummary` as shared library scan presenter for trust status, reuse tier, rights risk, source custody label, and next action.
- Enterprise library grid cards, mobile cards, and table rows now show next action, rights risk, reuse tier, people/minors state, and role-safe custody label.
- Legacy library cards, viewer list rows, and reviewer/admin rows now expose the same scan signals.
- Filter sidebar labels now map to wired catalog filters instead of demo-only labels, with clearer reuse, rights, people/minors, custody, sensitive review, and channel groups.
- Governance passport source/checksum evidence now redacts raw source paths, original filenames, and checksum slices.
- ORCH-00 contract freeze alignment: normal-role scan labels do not expose source paths, originals, checksums, private custody/admin notes, or ResourceSpace internals; collections/saved views remain discovery aids only; UI copy avoids claiming raw approval or production/public reuse.

Contract freeze mapping:
- Role-action matrix: Viewer sees discovery, trust state, and review/download guidance only; Contributor gets the same source/original restrictions plus contributor-safe actions elsewhere; Reviewer/Admin can see operational source-custody labels without receiving raw paths/checksums from the scan helper.
- Domain model: scan summary separates trust state, reuse tier, rights risk, people/minors risk, source custody, and next action instead of merging rights/publish/quality into one label.
- API redaction contract: UI consumes role-safe search/detail payloads and the shared scan helper now also redacts generic passport evidence/audit rows.
- Overclaim ban list: no final GO, production, public library, live ResourceSpace writeback, raw `Approved Public` reuse, or collection/saved-search permission claim added.
- Success matrix: improves operator clarity, governance, role fit, mobile scan rows, and evidence through tests/guards.

Privacy/governance proof:
- Viewer/Contributor-facing scan summary uses `Source/original restricted` instead of ResourceSpace/source-custody internals.
- `assetGovernancePassport` no longer emits raw `sourcePath`, `sourceAlbumPath`, or checksum prefixes in evidence/audit rows.
- Added `frontend/lib/asset-governance.test.ts` to assert private path, original filename, and checksum text do not appear in serialized scan/passport output.
- Viewer/Contributor scan summary uses `Source/original restricted` and does not mention ResourceSpace internals.

P0 gate impact:
- Positive: this lane reduces P0 privacy/source-custody risk by removing ResourceSpace/source/checksum inference from normal-role scan/passport text.
- Positive: scan wording reinforces that found/collection/saved-view results are not permission and unsafe/uncertain items route to review.
- Remaining: browser QA P0 visual proof could not run from worker worktree because the guard requires the canonical checkout.

Lane score recommendation:
- Recommended score: 2.
- Reason: useful beta improvement across scanability, governance, role fit, and evidence. Not score 3 because browser QA/mobile screenshot proof is blocked in this worktree and CSS/mobile visual polish stayed intentionally unedited to avoid EDAM-02 conflict.

Validation:
- `npm --prefix frontend run typecheck` PASS.
- `npm --prefix frontend run test -- --runInBand` BLOCKED: Vitest 2 rejects Jest-only `--runInBand` with `CACError: Unknown option --runInBand`.
- `npm --prefix frontend run test` PASS: 22 files, 161 tests.
- `node scripts/api-payload-guard.mjs` PASS.
- `node scripts/private-source-guard.mjs` PASS.
- `git diff --check` PASS.
- `BASE_URL=http://localhost:4871 make portal-browser-qa` BLOCKED: `safe-lane-headroom-guard` requires canonical checkout `/Users/halim4pro/Desktop/MVP/tjc-stock-media`, but worker is in `/Users/halim4pro/.codex/worktrees/386e/tjc-stock-media`.

Cross-lane notes:
- No edit to `frontend/app/dam-enterprise.css`; avoided EDAM-02 CSS conflict.
- `frontend/lib/asset-governance.ts` now redacts generic passport source/checksum values. EDAM-04 asset-detail work should use role-gated metadata helpers for admin-only private custody details, not generic passport rows.

Rerun commands:
- `npm --prefix frontend run typecheck`
- `npm --prefix frontend run test`
- `node scripts/api-payload-guard.mjs`
- `node scripts/private-source-guard.mjs`
- `git diff --check`
- From canonical checkout only: `BASE_URL=http://localhost:4871 make portal-browser-qa`
