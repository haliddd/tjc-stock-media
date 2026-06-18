# EDAM-09 Integrations/Storage Evidence

## Result

Mission result: DONE with hosted snapshot blocker documented.

Target runtime: 60 minutes.
Actual active runtime: about 35 minutes.
Reason under 60: lane acceptance criteria were implemented or explicitly blocked, full relevant validation passed, and the only remaining hosted 181-record proof requires authenticated hosted beta access that this worker cannot obtain without credential/env changes.

Branch: `codex/edam-09-integrations-storage`.

## Contract Freeze Status

| P0 gate | Status | Evidence | Decision impact |
|---|---:|---|---|
| Hosted 181-record snapshot proof | RED | Hosted `asset-search-viewer` read-only probe redirected to `/beta-login`, so deployed count could not be observed. Local bundled catalog tests prove 181 records locally only, not hosted. | Team Beta remains blocked until an authenticated approved hosted read-only probe observes 181 records on the stable URL. |
| Durable/fail-closed boundary | YELLOW | Code and local production-mode tests prove audit/ticket/local JSON workflows fail closed when generic durable runtime storage is missing. Hosted durable store and hosted mutating fail-closed behavior were not proven because no hosted mutation/env change is allowed. | Safe enough as a code boundary, not enough to claim hosted durability or working hosted downloads. |
| ResourceSpace writeback | GREEN | Live `update_field` is not sent unless switch, live mode, and explicit approval proof names are present; readiness and script output say queued/disabled unless approved. | Review decisions remain queued/pending-sync; no live writeback claim. |
| Secret/env handling | GREEN | Readiness scripts print names/status only; ResourceSpace client redacts signed URL/query details; hosted probe stores bounded summaries only. | No secret/raw env values logged. |
| Local proof versus hosted proof | GREEN | Evidence explicitly separates local test/catalog proof from hosted proof and marks hosted count blocked. | No local proof is treated as hosted proof. |

Lane score recommendation: 2/3. The lane materially improves safety, storage honesty, and evidence, but cannot score 3 while hosted 181 proof is RED.

## Contract Freeze Alignment

Exact ORCH freeze files named "domain model", "role-action matrix", "asset state machine", "API redaction contract", "overclaim ban list", "evidence manifest", and "success matrix" were not present in this worker worktree. I aligned against the local ORCH plan plus the closest checked-in contract sources available here:

| Freeze area | Source used in this worktree | Lane alignment |
|---|---|---|
| Domain model | `docs/real-dam-connection-contract-2026-06-14.md` | Preserves Google Shared Drive as master custody, ResourceSpace as DAM/search/review truth, and portal as role-safe read model/stateful workflow layer. |
| Role-action matrix | `docs/team-beta-qa-matrix.md`, `docs/runs/evidence/2026-06-15/07-redaction-and-download-safety-proof.md` | Keeps Viewer/Contributor redacted, Reviewer/Admin operational, query roles non-authoritative in production, and download route ticket-gated. |
| Asset state machine | `docs/design-system/tjc-stock-media-state-dictionary.md` | Keeps review decisions in pending-write/queued state unless confirmed ResourceSpace writeback succeeds; avoids "written to ResourceSpace" overclaim. |
| API redaction contract | `docs/runs/evidence/2026-06-15/07-redaction-and-download-safety-proof.md` | Uses role-safe source envelopes and bounded hosted probe summaries; no raw source paths, private URLs, checksums, signed URLs, raw headers, or raw bodies captured. |
| Overclaim ban list | `.hermes/plans/2026-06-18_0046-enterprise-dam-10-agent-orchestrator-plan.md`, `docs/real-vs-demo-dam-proof-matrix-2026-06-14.md` | Does not claim production launch, public reuse, hosted durability, live ResourceSpace writeback, or hosted 181 proof. |
| Evidence manifest | `.hermes/plans/2026-06-18_0046-enterprise-dam-10-agent-orchestrator-plan.md` worker output contract | Evidence note records result, runtime, changed files summary, validation commands, blockers, cross-lane deps, and rerun commands. |
| Success matrix | ORCH plan Team Beta/validation gates, `docs/team-beta-qa-matrix.md` | Hosted 181 proof remains RED; durable/fail-closed boundary remains YELLOW; ResourceSpace writeback-disabled boundary is GREEN. |

## What Changed

- ResourceSpace live writeback now requires three server-side conditions before any `update_field` request is sent:
  - `RESOURCESPACE_ENABLE_WRITEBACK=1`
  - `RESOURCESPACE_WRITEBACK_MODE=live`
  - non-empty `RESOURCESPACE_WRITEBACK_APPROVED_BY` and `RESOURCESPACE_WRITEBACK_APPROVAL_TICKET`
- `resourceSpaceUpdateField()` now fails closed with HTTP-style `409` before network when writeback is not fully approved.
- ResourceSpace live API source status is described as server-side read-only unless the separate live writeback gate is approved.
- Runtime storage diagnostics now distinguish generic local JSON durability from Vercel KV feedback storage and Blob attachment storage.
- Download ticket issuance and consumption fail closed when production runtime lacks durable ticket storage; ticket consumption checks write permission before approved-download audit callback.
- Hosted read-only probe now includes an `asset-search-viewer` GET and records a bounded `hostedSnapshotProof` summary instead of raw response bodies.
- Storage honesty guard now enforces the new writeback, storage, download, and hosted snapshot proof contracts.
- Photo-only ResourceSpace readiness inventory now names the live-write approval env gates without printing values.

Files changed in lane scope:

- `docs/runs/evidence/2026-06-15/hosted-readonly-probes/summary.json`
- `docs/runs/evidence/2026-06-18/edam-09-integrations-storage.md`
- `frontend/lib/approved-delivery-gate.test.ts`
- `frontend/lib/approved-delivery-gate.ts`
- `frontend/lib/dam-readiness-integrations.ts`
- `frontend/lib/download-tickets.ts`
- `frontend/lib/env.ts`
- `frontend/lib/media-source/resourcespace-api.ts`
- `frontend/lib/production-hardening.test.ts`
- `frontend/lib/resourcespace-client.ts`
- `frontend/lib/runtime-file-store.ts`
- `scripts/photo-only-resourcespace-readiness.mjs`
- `scripts/portal-hosted-readonly-probe.mjs`
- `scripts/storage-honesty-guard.mjs`

Pre-existing/unowned dirty paths still present and intentionally not touched by this lane: `AGENTS.md`, `.hermes/`, `.superpowers/`.

## Hosted Snapshot State

Hosted 181-record snapshot proof is BLOCKED from this unauthenticated worker.

Read-only probe result:

```json
{
  "state": "blocked",
  "expectedRecords": 181,
  "observedRecords": null,
  "sourceAdapter": null,
  "sourceLabel": null,
  "sourceReadOnly": null,
  "sourceLive": null,
  "blocker": "Hosted beta auth redirected asset search to /beta-login before the snapshot count could be read."
}
```

The probe did confirm no forbidden source fields, secret env names, privileged admin/review shapes, raw headers, raw bodies, POSTs, hosted writeback, or env mutation.

Bare command note: `BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe` is blocked in this isolated Codex worktree by `safe-lane-headroom-guard`, which expects `/Users/halim4pro/Desktop/MVP/tjc-stock-media`. The same command passed with `SAFE_LANE_EXPECTED_WORKTREE=/Users/halim4pro/.codex/worktrees/30ee/tjc-stock-media`.

## Validation

Passed:

```bash
npm ci
npm --prefix frontend run typecheck
npm --prefix frontend run test
node scripts/storage-honesty-guard.mjs
node scripts/external-proof-contract-guard.mjs
SAFE_LANE_EXPECTED_WORKTREE=/Users/halim4pro/.codex/worktrees/30ee/tjc-stock-media BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe
make photo-only-resourcespace-readiness
node scripts/hosted-readonly-probe-guard.mjs
node scripts/hosted-readonly-probe-guard-test.mjs
git diff --check
```

Expected local-worktree blocker:

```bash
BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe
```

Result: failed before network because `safe-lane-headroom-guard` requires the canonical checkout path unless `SAFE_LANE_EXPECTED_WORKTREE` is set.

Test count:

- Full frontend test suite: 21 files, 163 tests passed.
- Targeted suite after edits: 4 files, 45 tests passed.

Contract freeze rerun after evidence update:

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run test
node scripts/storage-honesty-guard.mjs
node scripts/external-proof-contract-guard.mjs
node scripts/hosted-readonly-probe-guard.mjs
make photo-only-resourcespace-readiness
git diff --check
```

Result: PASS.

## Safety

- No hosted mutation.
- No credential or env change.
- No live ResourceSpace writeback.
- No deploy.
- No source media mutation.
- No secret or raw env value printed.

## Remaining Blockers

- Authenticated hosted beta access is required to prove the deployed `/api/assets/search` count is 181.
- Bare hosted probe command needs either canonical checkout execution or an explicit `SAFE_LANE_EXPECTED_WORKTREE` override in Codex worktrees.

## Cross-Lane Dependencies

- EDAM-10 or ORCH-00 should rerun hosted read-only snapshot proof from an authenticated/approved hosted beta context.
- EDAM-01/ORCH-00 may decide whether `safe-lane-headroom-guard` should accept Codex worker worktrees by default.

## Exact Rerun Commands

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run test
node scripts/storage-honesty-guard.mjs
node scripts/external-proof-contract-guard.mjs
SAFE_LANE_EXPECTED_WORKTREE=/Users/halim4pro/.codex/worktrees/30ee/tjc-stock-media BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe
make photo-only-resourcespace-readiness
node scripts/hosted-readonly-probe-guard.mjs
node scripts/hosted-readonly-probe-guard-test.mjs
git diff --check
```
