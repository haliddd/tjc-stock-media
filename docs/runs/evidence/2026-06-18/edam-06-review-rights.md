# EDAM-06 Review/Rights Evidence

Status: DONE

Branch: `codex/edam-06-review-rights`

Runtime: target 60 minutes; actual under 60 minutes in this Codex turn. Finished early because lane acceptance checks passed, relevant tests/guards passed, evidence was written, and remaining local endpoint smoke was blocked by project safe-lane guard rather than product uncertainty.

## Changes

- Added server-side approval evidence gate in `frontend/lib/review-evidence-packet.ts`.
  - `Approve Public` and `Approve Internal` now require reviewer name, review date, usage scope, reviewer note, and existing checklist/domain evidence.
  - Public approval scope must be `Public` or `Public and Internal`.
  - Internal approval scope must be `Internal` or `Public and Internal`.
  - Queued audit fields expose reviewer/date/scope as primitive safe fields.
- Wired `/api/review` body parsing in `frontend/lib/review-action-workflow.ts` for reviewer/date/scope.
- Removed hardcoded reviewer identity from enterprise review UI.
- Added reviewer/date/scope controls to classic and enterprise review pages.
- Added UI lock messaging so approval buttons explain missing reviewer/date/scope evidence.
- Added publish status, rights status, and usage scope split in classic selected review summary.
- Added AI/taxonomy governance copy: suggestions are non-authoritative until human accept/edit/reject.
- Improved triage strip scanability by showing up to three risk chips per asset.
- Added packet tests proving public approval blocks without reviewer/date/scope and passes with valid evidence.

## Sensitive Workflow Coverage

- Doctrine/sacrament, worship/private, hymn/music, RE/minors, and testimony/pastoral-sensitive signals remain routed through the existing `sensitiveMinistryEvidenceModel`.
- Enterprise review rail now keeps those sensitive evidence rows adjacent to approval evidence.
- AI suggestions remain suggestion-only; UI warns reviewers not to rely on AI tags/title/minor flags/duplicate hints until human decision.
- ResourceSpace writeback remains queued/disabled unless runtime config explicitly enables it; this lane did not enable live writeback.

## Contract Freeze Alignment

| Freeze item | EDAM-06 alignment |
|---|---|
| Review state machine | Preserves default `Needs Review / Do Not Publish`, pending-write state, blocked/incomplete evidence state, queued decision state, and no live ResourceSpace truth until confirmed writeback/re-read. |
| Role-action matrix | Reviewer/DAM Admin review role gate remains in `/api/review`; Viewer/Contributor cannot approve. UI copy stays reviewer-focused and does not expose approval controls to non-reviewers. |
| Redaction contract | Audit/event details added by this lane are primitive safe fields only: reviewer name, review date, approval scope. Tests continue checking no source paths, master paths, original filenames, checksums, or private custody fields leak. |
| Overclaim ban list | UI/evidence keeps queued portal decisions separate from ResourceSpace truth, separates raw publish status from rights status and usage scope, and states AI suggestions do not approve rights/minors/doctrine/public use. |
| Success matrix | Evidence-backed approval blocks without reviewer/date/scope/note/checklist/domain evidence; complete reviewer evidence can queue a decision honestly; guards pass; live writeback remains disabled/queued. |

## P0 Gate Impact

- Strengthens P0 rights gate: public/internal approval cannot proceed through UI or API without reviewer, review date, usage scope, notes, and required evidence.
- Strengthens P0 source-truth gate: queued portal review decisions remain pending writes and are not described as ResourceSpace truth.
- Strengthens P0 redaction gate: added audit fields are primitive approval metadata, not source custody or private evidence.
- Strengthens P0 AI boundary: AI suggestions stay non-authoritative and cannot satisfy rights, people/minors, doctrine, sensitivity, or public-use approval.
- Does not close hosted/live-writeback P0 gates because no live ResourceSpace writeback, hosted mutation, deploy, credential change, or production durability proof was attempted.

## Lane Score Recommendation

Recommended score: 3.

Reason: lane added server-side approval enforcement, UI decision safety, review queue scanability, sensitive-domain evidence adjacency, AI non-authoritative copy, tests, API guards, and evidence. Remaining limitation is environment-level: local endpoint writeback smoke was blocked by safe-lane guard in this Codex worktree, while self-test coverage passed.

## Validation

PASS:

```bash
npm --prefix frontend run test -- review-evidence-packet
npm --prefix frontend run typecheck
npm --prefix frontend run test
node scripts/api-audit-guard.mjs
node scripts/api-payload-guard.mjs
make portal-writeback-guard-smoke-test
git diff --check
```

NOT RUN:

```bash
BASE_URL=http://localhost:4871 make portal-writeback-guard-smoke
```

Reason: local dev server startup through `npm --prefix frontend run dev` failed closed with safe-lane guard:

```text
run dev-server only inside expected checkout /Users/halim4pro/Desktop/MVP/tjc-stock-media; got /Users/halim4pro/.codex/worktrees/1944/tjc-stock-media
```

No bypass attempted.

## Cross-Lane Notes

- Shared review/writeback contract files changed:
  - `frontend/lib/review-evidence-packet.ts`
  - `frontend/lib/review-action-workflow.ts`
- EDAM-09 should preserve reviewer/date/scope approval evidence when editing writeback contracts.
- Preexisting dirty/untracked files were not modified by this lane:
  - `AGENTS.md`
  - `.hermes/`
  - `.superpowers/`

## Rerun Commands

```bash
npm --prefix frontend ci
npm --prefix frontend run typecheck
npm --prefix frontend run test
node scripts/api-audit-guard.mjs
node scripts/api-payload-guard.mjs
make portal-writeback-guard-smoke-test
```
