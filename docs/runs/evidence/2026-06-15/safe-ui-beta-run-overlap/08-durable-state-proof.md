# 08 Durable State Proof - 2026-06-15

## Scope

This doc records durable/fail-closed state status for the June 15 isolated lane.

## Local Result

`make launch-readiness` was rerun from the isolated worktree and finished with `failures=0`, `warnings=3`:

- `.env missing`
- `.runtime/backups missing`
- `local free disk below 10 GiB` (latest observed range: 0-2 GiB)

Warning classification:

| Warning | Classification | Rationale |
|---|---|---|
| `.env missing` | blocker for hosted/durable beta proof | Local guards and smokes can run without secrets, but missing runtime env means ResourceSpace, hosted durability, backup, and production parity cannot be proven. |
| `.runtime/backups missing` | blocker for backup/restore proof | Backup/restore cannot be claimed until a real backup archive exists and restore-test proof runs. |
| `local free disk below 10 GiB` | operational follow-up for long local lane | Latest launch-readiness and direct `df -g .` checks ranged 0-2 GiB free. Not an access/source/durability/download/demo/hosted-proof P0 by itself, but long dev/build/start/browser-QA runs need disk headroom; clean only safe local build/runtime artifacts when needed, never shared/source media. Lowering the threshold for a focused safe command requires `SAFE_LANE_HEADROOM_OVERRIDE_REASON`; silent threshold bypass is a guard failure. |

`make safe-lane-disk-report` is report-only and deletes nothing. It refuses the shared checkout, reports isolated candidates such as `frontend/.next`, `.next`, and `.runtime/analytics`, and keeps source media, shared checkout artifacts, hosted/prod surfaces, and evidence screenshots/docs out of cleanup scope unless a replacement proof packet exists. Latest report at `2026-06-15T15:30:11Z` showed only `frontend/.next` (`497M`), `.next` (`4.0K`), and `.runtime/analytics` (`400K`) as isolated cleanup candidates, so safe isolated cleanup alone is not enough to restore the default 10 GiB headroom. The report now states the default 10 GiB heavy-run minimum, whether heavy local reruns are blocked, the blocked scope (`dev/build/start/browser/smoke/bootstrap/docker/import/media/backup`), and the `SAFE_LANE_HEADROOM_OVERRIDE_REASON` requirement. `make safe-lane-disk-report-test` proves shared-checkout refusal, report-only source constraints, and required output boundaries.

`open-blockers-guard` now also rejects stale disk cleanup estimates and missing `SAFE_LANE_HEADROOM_OVERRIDE_REASON` copy in `open-blockers.json`, so the machine-readable NO-GO matrix stays aligned with the disk report. Latest focused rerun passed at `2026-06-15T15:35:21Z`.

`make safe-lane-headroom-guard-test` proves heavy local dev/build/start/browser/bootstrap/docker paths fail closed when free disk is below the configured threshold, when `SAFE_LANE_MIN_FREE_GIB` is invalid, when a lowered threshold lacks `SAFE_LANE_HEADROOM_OVERRIDE_REASON`, when a command is run outside the isolated worktree, or when a command is run from the shared checkout. `npm --prefix frontend run dev`, `npm --prefix frontend run build`, and `npm --prefix frontend run start` run this guard through npm lifecycle hooks; `make frontend-dev`, `frontend-check`, ResourceSpace bootstrap/docker, import/media, backup/restore, local runtime smoke Make targets, and `make portal-browser-qa` run the same guard before writing build/runtime proof artifacts or touching external media/runtime surfaces. Direct shell and Python entrypoints for those risky targets also run the guard before their first runtime write, staging write, or Docker/ResourceSpace action. The browser QA script also runs it before launching Playwright.

Local smokes proved API behavior and download-ticket safety under protected-mode dev server config at `2026-06-15T12:14:57Z`, but this does not prove hosted durability.

Backup/restore proof was not run in this lane because the isolated worktree has no `.env` and no `.runtime/resourcespace-config.php`. `scripts/backup.sh` requires `.env`, and `scripts/restore-test.sh` requires a prior backup with `filestore-config.tgz`. Creating fake env/config files would weaken the proof, so this remains an explicit blocker instead of being papered over.

## Proven Locally

- Download-ticket smoke passed.
- Blocked downloads remained blocked.
- One-use ticket behavior was proven locally.
- Package draft, saved search, feedback, writeback, beta rehearsal, and usage analytics smokes passed locally under protected trusted-header mode.
- Audit guard passed.
- Storage honesty guard passed.
- Browser QA passed without console/network failures.
- `make launch-readiness` passed with three explicit warnings: two durable-state blockers and one local disk follow-up.

## Current Gap

Open durable-state proof needed:

- Hosted feedback storage persists and can be exported.
- Audit trail persists across restart/deploy.
- Download tickets fail closed if storage/session state is missing.
- Backup path exists and restore expectations are documented.
- Isolated or hosted backup exists with real config, then `make restore-test` writes a restore marker.
- Hosted runtime does not silently fall back to unsafe ephemeral state for beta evidence.

## State Classification

| Workflow | Classification | Required beta behavior | Current evidence |
|---|---|---|---|
| Audit log | required durable or fail-closed | Must not silently disappear. | Local audit guard passed; hosted persistence not proven. |
| Download tickets | required durable or fail-closed | Must not issue unsafe/vanishing tickets. | Local download-ticket smoke passed; hosted durability not proven. |
| Feedback | required durable or explicitly disabled | Must not claim submission if lost. | Local/browser QA paths passed previously; hosted store not proven. |
| Pending review/write queue | required durable or disabled | Must not imply live ResourceSpace mutation. | Local smokes prove queued/honest behavior; hosted persistence not proven. |
| Saved searches | optional durable | May be disabled or labeled not beta-ready. | Local smoke passed; hosted durability not proven. |
| Package drafts | optional durable | May be disabled or labeled not beta-ready. | Local smoke passed; hosted durability not proven. |
| Usage analytics | optional durable unless Insights claims maturity | Must not overstate analytics maturity. | Local SQLite smoke passed with explicit isolated `USAGE_ANALYTICS_DB_PATH`; hosted analytics durability not proven. |
| Backup/restore | required before launch or durable beta state claims | Must prove real backup archive and non-destructive restore test. | BLOCKED: isolated `.env` and `.runtime/resourcespace-config.php` are absent, `.runtime/backups` missing. |

## Fail-Closed Decision

Current local proof supports safe local behavior, but hosted beta cannot claim durable state. If no durable hosted store is confirmed, feedback, audit-critical workflows, pending review/write queue, and download-ticket behavior must be disabled or explicitly fail closed before any GO/CONDITIONAL-GO.

Git artifact hygiene is now self-tested: `git-hygiene-guard-test` proves tracked source media, env/runtime files, and model artifacts fail while allowed brand/screenshot PNGs remain permitted. This strengthens local artifact safety only; it does not close hosted durability or backup/restore blockers.

Storage honesty is now self-tested: `storage-honesty-guard-test` proves fixture regressions fail for hosted beta overclaiming local JSON durability, feedback/audit/download-ticket writes silently bypassing durable-store fail-closed checks, unbounded local runtime diagnostics, tracked runtime artifacts, missing fail-closed diagnostics, missing store caps, persistence module drift, timestamp parsing drift, private-source ref rejection drift, and upload source-link audit leakage. This strengthens local durability honesty only; hosted durable/fail-closed state remains unproven.

Fixture self-tests now remove their own temporary directories on exit, and `evidence-packet-guard` fails if a temp-fixture guard test creates `mkdtempSync` directories without an `fs.rmSync` cleanup path. This prevents guard verification from worsening the low-disk lane while still avoiding any cleanup of shared checkout, source media, hosted/prod surfaces, or evidence artifacts.

## Decision

Durability remains NO-GO. Local state behavior is useful regression proof, but hosted durable/fail-closed state is still unproven.

## Proof Record

| Field | Value |
|---|---|
| Date | 2026-06-15 |
| Commit SHA | `a22497e96004024928128990f432806b768930a6` |
| Repo/branch | `codex/safe-ui-beta-proof-2026-06-15` |
| Environment | isolated local worktree |
| Base URL | `http://localhost:4871` |
| Role/persona | Viewer/Reviewer/DAM Admin local smokes |
| Command or manual step | storage honesty guard, audit guard, download-ticket smoke, launch-readiness result review |
| Expected | beta-critical state durable or fail-closed |
| Actual | local safety passed; hosted durability blocked |
| Result | BLOCKED |
| Evidence path | this file |
| Secrets redacted | yes |
| Follow-up | Hali chooses durable store or disables/fail-closes critical hosted workflows |
