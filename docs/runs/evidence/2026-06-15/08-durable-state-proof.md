# Durable State Proof

Date: 2026-06-15
Commit SHA: e88c5722f8e547b24f054633854e36391d670d42
Repo/branch: `codex/safe-ui-beta-proof-2026-06-15`
Environment: local runtime proof; hosted durability not mutated
Base URL: `http://localhost:4871`
Role/persona: local beta roles
Result: LOCAL PASS / HOSTED DURABLE STORE BLOCKED
Secrets redacted: yes

## State Classification

| Workflow | Local proof | Hosted beta status | Notes |
|---|---:|---:|---|
| Feedback | PASS | BLOCKED | `portal-feedback-smoke` passed locally; hosted KV/env not proven. |
| Package drafts | PASS | BLOCKED | `portal-package-smoke` passed locally; generic durable store not proven. |
| Saved searches | PASS | BLOCKED | `portal-saved-search-smoke` passed locally; generic durable store not proven. |
| Audit log | PASS local | BLOCKED hosted | `portal-writeback-guard-smoke` verified sanitized audit lines; hosted durable audit store not proven. |
| Pending review/write queue | PASS local | BLOCKED hosted | Queued only; no live ResourceSpace writeback. |
| Download tickets | PASS local | BLOCKED hosted | `portal-download-ticket-smoke` passed locally; hosted durable ticket store not proven. |
| Download ticket smoke self-test | PASS local | BLOCKED hosted | `portal-download-ticket-smoke-test` proves the local runtime smoke keeps one-use ticket, spoof denial, private URL rejection, blocked asset denial, and local audit persistence checks. It does not prove hosted durable ticket storage. |

## Fail-Closed Proof

- `node scripts/storage-honesty-guard.mjs`: PASS.
- Test suite includes production hardening coverage.
- `make launch-readiness`: PASS with `failures=0`, `warnings=2`; warnings classified below.
- Hosted mutating smokes were not run because separate approval was not given.

## Decision Impact

Local state behavior is acceptable for proof. Hosted beta critical state remains blocked until Vercel KV/generic durable store is configured/proven or workflows are explicitly disabled/fail-closed.

## Current Durable-State Contract

| Field | Value |
|---|---|
| Result | BLOCKED |
| Secrets redacted | yes |
| Touched forbidden surfaces | no |
| Open blocker ID | durable-hosted-state |
| Follow-up | Hali chooses durable store or disables/fail-closes critical hosted workflows |

Durability remains NO-GO. hosted durable/fail-closed state remains unproven until a real durable store is configured and smoke-proven, or every critical hosted workflow is explicitly disabled/fail-closed.

## Current Guard Proof

| Check | Result | Notes |
|---|---:|---|
| `make storage-honesty-guard` | PASS | Normal guard behavior unchanged. |
| `make storage-honesty-guard-test` | PASS | Proves durability overclaims, silent write success, unbounded runtime writes, tracked runtime artifacts, and missing fail-closed diagnostics fail. |
| Backup/restore proof was not run | BLOCKED | No `.runtime/backups` proof exists in the recreated isolated lane. |
| Missing durable config | BLOCKED | Current isolated lane has no `.env` and no `.runtime/resourcespace-config.php`. |

Creating fake env/config files would weaken the proof. Do not fabricate `.env`, ResourceSpace config, backups, durable stores, or hosted write paths to silence readiness checks.

Warning classification:

| Warning | Classification | Decision |
|---|---|---|
| `.env missing` | blocker for hosted/durable beta proof | Keep NO-GO for hosted durability/env proof. |
| `.runtime/backups missing` | blocker for backup/restore proof | Keep NO-GO for backup/restore and durable recovery proof. |
| `local free disk below 10 GiB` | operational follow-up for long local lane | Historical warning; recorded `df -g .` observation reports 24 GiB free, but the warning remains classified as operational if it recurs. |
| Current browser QA | local browser-readiness proof passed | Current browser QA report records 20 pages, six viewports, 32 screenshots, 0 failures, and 0 console/network/warnings at `2026-06-16T16:43:07.114Z`. |

## Safe Local Runtime Boundaries

- `make safe-lane-disk-report` is report-only and deletes nothing.
- `make safe-lane-disk-report-test` proves shared-checkout refusal.
- `make safe-lane-headroom-guard-test` proves heavy local dev/build/start/browser/bootstrap/docker paths fail closed.
- `SAFE_LANE_HEADROOM_OVERRIDE_REASON` is required before lowering default headroom.
- Historical note: safe isolated cleanup may not be enough to restore the default 10 GiB headroom when the machine is genuinely low on disk. Current lane has enough free disk, but this boundary stays documented.
