# Weekend Beta To Launch Report - 2026-06-13

Status: weekend hardening evidence report. This document does not approve public launch, wider rollout, deployment, live ResourceSpace writeback, production query-role trust, public sharing, or source/original delivery.

Mission sentence: this weekend is not for making the app bigger; it is for making the beta safer, clearer, more testable, more recoverable, and more honest.

## Executive Recommendation

Recommendation: hold next batch.

Tiny internal beta may continue only for already named testers if the human owner confirms current hosted safety boundaries still hold, feedback works, ResourceSpace writeback stays queued/disabled, attachments are disabled or not exposed, and P0/P1 findings remain contained. Wider church rollout and production/internal launch remain NO-GO until production SSO, durable storage, live ResourceSpace writeback proof, production derivative delivery, full rights/media review, church-host backup/restore, and real DAM workflow gates are proven.

No deployment, merge, env change, hosted mutating smoke, beta widening, or ResourceSpace writeback was approved by this run.

## Scope Truth

Current weekend scope is photo-only hosted ResourceSpace beta hardening.

| Layer | Authority | Weekend rule |
|---|---|---|
| Source truth | Google Shared Drive master custody and ResourceSpace DAM record/export/API | Authoritative for original custody, DAM metadata, review state, and ResourceSpace identity. |
| Portal-computed truth | Next.js policy/read model | May compute Portal Ready, blockers, derivative missing, role-safe payloads, and diagnostics. Cannot mutate ResourceSpace unless writeback is proven. |
| Beta-runtime truth | Feedback, task mode, saved views, packages, pending writes, local audit | Beta-local unless durable external storage is proven. Must not be presented as final DAM truth. |
| Suggestion truth | AI tags, smart rules, similar assets, taxonomy suggestions | Suggestions route and flag only. They never approve reuse. |
| Fixture/demo truth | Fallback data, QA records, generated images | Hidden from normal photo beta or clearly Admin QA-only. Must never look like real church media. |

Photo-only means normal Viewer/Contributor beta surfaces must not show audio/video records, fixture labels, `@example` creators, or generated fallback media as real church assets.

## Thread Status

| Lane | Thread | Branch | Status | Launch relevance |
|---|---|---|---|---|
| QA baseline | `019ebf36-c571-7270-b634-4adc66db2008` | detached baseline | stopped | Baseline guards passed except launch-readiness failed on Brand Hub guard; frontend deps were initially missing. |
| Security/privacy | `019ebf38-2fda-72a2-8b5e-0dcdf22ba994` | `hardening/weekend-security-privacy-review` | ready-for-review, needs clean packaging | Fixed hosted feedback attachment disable, hosted KV fail-closed behavior, explicit hosted `BETA_SESSION_SECRET`, and beta login throttle. Branch worktree contains unrelated dirty files, so PR must use narrow path adds only. |
| Frontend launch guard | `019ebf52-b375-76b0-8a52-9a026538f19c` | `hardening/weekend-frontend-ux-p0p1` | QA done | Brand Hub guard/browser QA now expect redirect to Policy Center, not a live DAM surface. |
| Media delivery | `019ebf4b-eb83-7aa2-977c-73e656fed24b` | `hardening/weekend-media-delivery-p1` | QA done | Blocks hosted/prod generated `demo-fallback` approved-copy downloads. |
| Truth/scope/fixture | `019ebf6a-9295-7d22-8612-7d3c867954c5` | `hardening/weekend-truth-scope-fixture-p1` | QA done | Viewer/Contributor normal payloads are photo-only and exclude `demo-fallback` rows. |
| Media architecture audit | `019ebf75-c067-7ab1-bb1e-cdcdebfffb57` | read-only | done | Found P1 docs gaps: one DAM catalog ADR and source/original vocabulary cleanup. |
| QA SEC-002 validation | `019ebf36-c571-7270-b634-4adc66db2008` | `hardening/weekend-security-privacy-review` | done | SEC-002 scoped QA passed; launch-readiness fails inherited Brand Hub guard in contaminated worktree. Direct KV-throttle failure test remains P2. |

## P0/P1 Findings

| ID | Severity | Owner | Status | Evidence | Next action |
|---|---|---|---|---|---|
| SEC-001 | P0 | Security/Privacy | Fix ready, not merged/deployed | Feedback attachment path could create public Blob URLs; security patch rejects hosted attachments and returns empty hosted attachment upload. | Package as narrow PR, QA final, deploy only after human approval. |
| SEC-003 | P1 | Security/Infra | Fix ready, not merged/deployed | Hosted feedback could fall back to local/memory when KV failed; patch fails closed for hosted KV read/write. | Package as narrow PR; keep tests for KV read/write failure. |
| SEC-004 | P1 | Security/Infra | Fix ready, not merged/deployed | Hosted beta could derive session signing secret from persona passwords; patch requires explicit `BETA_SESSION_SECRET` on hosted/prod. | Package as narrow PR; confirm Vercel env name exists without recording value. |
| SEC-002 | P1 | Security/Privacy | Scoped QA done, not merged/deployed | Login route now uses throttle helper and focused tests for wrong-password lockout/no cookie/generic response/valid login. | Package as narrow PR; add direct hosted KV throttle storage failure test as P2. |
| MED-001 | P1 | Media delivery | QA done | Hosted/prod generated demo-fallback approved-copy downloads blocked. | PR-ready after narrow path staging. |
| FIX-001 | P1 | Fixture/Data Truth | QA done | Viewer/Contributor normal search returns no fixture/example/private tokens and no non-photo records. | PR-ready after narrow path staging. |
| UX-001 | P1 | Frontend UX/QA | QA done | Brand Hub route treated as Policy Center redirect; launch-readiness passes on scoped branch. | PR-ready after narrow path staging; security branch should rebase/validate after this lands. |
| ARCH-001 | P1 docs | Product/Docs | Documented here | `PRODUCT.md` glossary conflates master original and ResourceSpace filestore per architecture audit. | Backlog docs PR: split master original vs ResourceSpace original/DAM file. |
| ARCH-002 | P1 docs | Product/Docs | Documented here | One DAM catalog with media-specific derivative pipelines is supported but scattered. | Add ADR before launch-candidate signoff. |
| INF-001 | P1 | Infra/ResourceSpace | Open | Vercel-to-hosted ResourceSpace preview proxy network path is not proven with production evidence. | Human infra owner must prove ResourceSpace preview derivative path before launch. |
| OPS-001 | P1 | QA/Infra/Human owner | Open | Hosted mutating smokes not run by policy. No fresh hosted evidence after branches. | Human approval required before hosted smoke/writeback guard smoke. |

## P2/P3 Backlog

| Priority | Item | Owner | Acceptance |
|---|---|---|---|
| P2 | Environment-scoped runtime/KV namespace | Infra/Security | Runtime keys include environment namespace or storage matrix documents isolation/fail-closed behavior. |
| P2 | Direct KV throttle fail-closed test | Security/QA | Hosted/prod KV throttle storage client/read/write/clear failure has direct focused test returning fail-closed 503. |
| P2 | Trusted SSO/header origin protection | Security/Infra | Production trusted headers only allowed behind Cloudflare Access or equivalent origin lock. |
| P2 | Package refs exposed to normal roles | Security/ResourceSpace | Normal users see opaque media references only; ResourceSpace raw refs stay Reviewer/Admin where needed. |
| P2 | Hardcoded reviewer identity | Rights/Frontend | Review evidence uses real identity source or clearly beta-local placeholder. |
| P2 | Feedback UI visibility/copy | Frontend UX | Report issue remains visible; attachment copy warns against unsafe screenshots. |
| P2 | Emergency hide/takedown checklist | Docs/Ops | Operator steps block reuse/download/package export without deleting source media. |
| P2 | Cost/health sentinel matrix | Infra/Ops | One checklist covers Oracle, ResourceSpace, Vercel, KV, backup, and disk sentinels. |
| P2 | Tagging/taxonomy foundation | Metadata/Product | Controlled/freeform/suggested/system classes and statuses are documented; suggestions do not approve. |
| P2 | Smart rules policy | Product/Rights | Rules suggest/route/flag only; no approval, download, writeback, or Portal Ready mutation. |
| P3 | Positive fixture QA data | QA | Local Viewer/Contributor proof verifies allowed photo rows, not only absence of leakage. |
| P3 | Full browser QA setup | QA | Local review role/data runtime is stable enough for full browser QA without false route/setup failures. |

## Command And Test Evidence

| Branch/scope | Evidence | Result |
|---|---|---|
| Baseline | Node guard scripts | Passed: private-source, public-env, api-identity, api-payload, api-audit, storage-honesty, git-hygiene. |
| Baseline | `make launch-readiness` | Failed on inherited Brand Hub live-surface guard before frontend guard branch. |
| Frontend guard | typecheck, build, live surface guard, privacy/env/payload/storage/git/identity guards, `make launch-readiness`, targeted local redirect proof | Passed with warnings for missing `.env`, `.runtime/audit-log`, `.runtime/backups`. |
| Truth/scope/fixture | focused hardening tests, full frontend tests, typecheck, build, tag static smoke, guards, `make launch-readiness`, optional local Viewer/Contributor API proof | Passed; API proof returned no fixture/private/non-photo tokens. |
| Media delivery | scoped QA from release lane | Passed; hosted/prod generated demo approved-copy fallback blocked. |
| Security feedback/auth | focused tests, build, post-build typecheck, guards | Passed: focused tests 12/12, build, post-build typecheck, private-source, public-env, api identity/payload/audit, storage honesty, git hygiene. |
| Security branch | `make launch-readiness` | Fails inherited Brand Hub guard in contaminated worktree; classify outside SEC-002 scope and rebase/validate after frontend branch. |

Skipped:

- Hosted mutating smokes were not run. They can write beta feedback storage or review/pending-write evidence and require human approval.
- No Vercel, Upstash, Blob, ResourceSpace, Cloudflare, DNS, billing, or production env settings were changed.
- No PR was merged or deployed.

## Manual QA Status By Role

| Role | Current status | Required before next batch |
|---|---|---|
| Viewer | Scope/fixture branch proves no fixture/non-photo/private tokens in normal payloads; blocked download guards pass. | Hosted proof after deployment, plus positive allowed-photo row proof. |
| Contributor | No P0/P1 found in weekend code lanes. | Upload/intake copy must keep Needs Review / Do Not Publish and avoid video/audio enablement claims. |
| Reviewer | Review writeback remains queued/disabled by policy. | Evidence lock and real reviewer identity need production identity plan; queued must not say synced. |
| DAM Admin | Feedback/admin readiness paths covered by existing docs and guards. | Confirm hosted feedback durable KV, attachment policy, and owner watch cadence before next batch. |
| Ops/Infra | Oracle Always Free plan exists, production runbook exists, backup runbook thin. | Prove Vercel-to-ResourceSpace preview proxy path, backup/restore on target, cost sentinels, rollback. |

## Production URL List

| URL | Use | Run status this weekend |
|---|---|---|
| `https://tjc-stock-media.vercel.app/` | Hosted beta portal | No mutating smoke run without human approval. |
| `https://tjc-stock-media.vercel.app/api/beta-feedback/export?role=DAM%20Admin&status=agent-ready` | Admin feedback export | Existing backlog says 0 agent-ready records; do not save raw hosted payload until reviewed. |
| `https://tjc-stock-media.vercel.app/api/assets/thumbnail/:id` | Browser-stable thumbnail/preview route | Hosted ResourceSpace preview proxy proof still open. |
| Hosted ResourceSpace URL | DAM backend | Not recorded in repo; network path not proven in this run. |

## Production Env Inventory Without Values

Never commit values. Verify names only.

| Env name | Required for | Weekend stance |
|---|---|---|
| `BETA_AUTH_ENABLED` | Hosted beta login | Should be enabled for internal beta. |
| `BETA_SESSION_SECRET` | Beta session signing | Explicit random value required for hosted/prod. |
| `BETA_VIEWER_PASSWORD` | Viewer persona login | Server-only. |
| `BETA_CONTRIBUTOR_PASSWORD` | Contributor persona login | Server-only. |
| `BETA_REVIEWER_PASSWORD` | Reviewer persona login | Server-only. |
| `BETA_ADMIN_PASSWORD` | DAM Admin persona login | Server-only. |
| `BETA_FEEDBACK_ENABLED` | Feedback API | Enabled only when storage posture is known. |
| `BETA_TASK_MODE_ENABLED` | Internal test task mode | Internal beta only. |
| `KV_REST_API_URL` | Vercel KV feedback/throttle storage | Required for durable hosted feedback. |
| `KV_REST_API_TOKEN` | Vercel KV feedback/throttle storage | Secret, server-only. |
| `BLOB_READ_WRITE_TOKEN` | Blob attachment storage | Recommend unset/disabled for wider beta unless private policy exists. |
| `RESOURCESPACE_BASE_URL` | Server ResourceSpace API/proxy | Server-only. |
| `RESOURCESPACE_API_USER` | Server ResourceSpace API | Server-only. |
| `RESOURCESPACE_API_KEY` | Server ResourceSpace API | Secret, server-only. |
| `RESOURCESPACE_FIELD_MAP_JSON` | Field mapping | Server-only; no secrets in public env. |
| `RESOURCESPACE_ENABLE_WRITEBACK` | Writeback gate | Keep `0` for hosted beta. |
| `RESOURCESPACE_WRITEBACK_MODE` | Writeback mode | Keep `queued` unless approved live proof exists. |
| `DOWNLOAD_GATE_ALLOW_DEMO_ROLES` | Demo download bypass | Keep `0`; production override must stay blocked. |
| `SSO_TRUSTED_HEADERS` | Trusted header identity | Keep `0` until origin protection is proven. |
| `SSO_PROVIDER` | SSO integration | Production launch blocker until proven. |
| `SSO_ROLE_MAP_JSON` | SSO group-role mapping | Server-only. |
| `NEXT_PUBLIC_BETA_FEEDBACK_ENABLED` | UI visibility only | Public flag only, no secrets. |

## Dirty File Arbitration

Do not stage protected or unrelated dirty files without explicit owner confirmation.

| Path | Status | Decision |
|---|---|---|
| `AGENTS.md` | Dirty in multiple worktrees | Protected/unrelated. Do not stage. |
| `docs/youtube-transcriptions/` | Untracked | Protected/unrelated. Do not stage. |
| `tasks/prd-mature-dam-governance-roadmap.md` | Untracked | Protected/unrelated. Do not stage. |
| App/UI files on main `codex/hosted-beta-unblocker` | Dirty before orchestration | Treat as separate owner work unless matched to a QA-passed branch. |
| Security worktree broad dirty files | Mixed | PR must use narrow path-based adds for security files only; do not include unrelated UI/nav/middleware changes. |

## PR Queue

Recommended PR order:

1. Frontend launch guard alignment, because it clears the inherited Brand Hub readiness blocker.
2. Media delivery P1, blocking hosted/prod generated demo approved-copy downloads.
3. Truth/scope/fixture P1, gating normal-role photo-only and fixture/demo fallback.
4. Security/privacy hardening split or narrow PR, covering feedback attachments, hosted KV fail-closed, hosted `BETA_SESSION_SECRET`, and beta login throttle. Rebase after the frontend guard PR and rerun launch-readiness.
5. Docs/runbook PR for this report, photo-only runbook, tagging/smart-rule policy, premium UI backlog, env inventory, rollback, and dirty arbitration.

Each PR must include mission/scope, what changed, what did not change, commands and results, manual QA status, safety assertions, remaining risks, human approvals needed, and rollback notes.

## Stop Conditions Still Active

Stop implementation and escalate if any thread finds source/original/private URL/checksum leak, unsafe download, production query-role trust, live/fake ResourceSpace writeback, feedback API private data exposure, hosted smoke failure after change, billing surprise, broad architecture need, merge/deploy/env attempt, or beta widening attempt.

## Final Stance

The beta is safer than baseline in the QA-passed branches, but the launch candidate is not proven until changes are packaged, reviewed, merged by a human, deployed by a human, and hosted evidence is rerun with approval. Hold the next batch. Production/internal launch remains NO-GO.
