# Team Beta Gap Audit

Date: 2026-06-18

Verdict: not beta-ready. Current build is a strong local rehearsal with beta guardrails, not a real teammate beta. The hard gap is not feature count; it is missing hosted proof, durable runtime boundaries, and renewed human signoff.

## Real Beta Bar

For a real Team Beta, the stable hosted URL must prove these conditions before any invite:

- Current protected build at `https://tjc-stock-media.vercel.app`.
- Beta login works for named Viewer, Contributor, Reviewer/Joanna, and DAM Admin personas.
- Hosted content is above demo scale and matches the scoped beta source, currently the sanitized 181-record MVP 2024 LM Photos snapshot or a live ResourceSpace/export source.
- Normal roles cannot see originals, private URLs, source paths, checksums, secrets, master custody details, or query-role authority.
- Any write path is either durable and auditable, or clearly fail-closed/queued with tester instructions.
- Download behavior is explicit: approved-copy downloads work with durable audit/ticket storage, or hosted downloads are intentionally blocked for this beta round.
- Backup/restore evidence exists for the runtime state being used.
- Owner signoff names testers, roles, triage owner, stop-test owner, evidence, timestamp, and final GO/NO-GO.

## Must Fix Before Beta

| Gap | Current Evidence | Required Close |
|---|---|---|
| Hosted 181-record content proof | Local tests prove `bundled-beta-catalog` returns 181 sanitized records and is chosen before demo fallback. Stable hosted read-only probe proves current build marker, but not authenticated content count. Last known hosted count before this code was demo fallback with 16 records. | Deploy reviewed code to stable URL, then run authenticated or owner-approved read-only content count proof showing `bundled-beta-catalog` or live ResourceSpace/export source, expected counts, and no private fields. |
| Hosted runtime boundary | Hosted feedback/admin visibility passed earlier. Hosted download fails closed with `503 audit-required`. Hosted upload/review persistence against beta content remains unproven. | Decide and document beta behavior: durable runtime store for feedback/review/download tickets, or explicit no-download/queued-review fail-closed Joanna scope. Do not loosen audit-required behavior. |
| Browser QA red on download audit | Latest production-mode browser QA has 2 failures and 3 console errors, both tied to download audit persistence returning `503 audit-required`. | Either make durable audit/ticket storage work in production/hosted mode, or update QA and tester instructions to assert the intentional fail-closed contract. |
| Full backup/restore proof | `make backup` created `.runtime/backups/20260617-201323`; `make restore-test` passed archive restore. Docker daemon was unavailable, so DB dump was skipped and only archive restore is proven. | For any beta state stored in MariaDB/ResourceSpace/local runtime, run backup with DB available and rerun restore test, or explicitly scope beta to stateless/read-only hosted snapshot plus durable external feedback store. |
| Hosted env confirmation | Local `make launch-readiness` still warns `.env` contains placeholder values. Hosted auth marker works, but a redacted env posture record is still owner-owned. | Confirm production env flags without exposing secrets: writeback disabled/queued, beta task mode enabled, demo-role download bypass disabled, durable store decision recorded. |
| Owner signoff | `docs/team-beta-signoff-record.md` remains NO-GO and the guard lists missing gate evidence. | Renew seed/media, access/private URL, hosted env/writeback, feedback triage, stop-test, named testers, roles, timestamp, and final decision. |
| Live ResourceSpace/local Docker smoke | Docker compose config validates. Docker daemon was unavailable during backup, so live ResourceSpace/MariaDB smoke was not proven in this pass. | Either run ResourceSpace/MariaDB smoke with Docker available, or explicitly make this beta a hosted snapshot workflow with ResourceSpace writeback out of scope. |

## Can Wait

- Live ResourceSpace writeback and Google Drive connector/sync.
- Full archive import and full approval of every asset.
- Video/audio import, large media pipeline, and full CDN/public delivery.
- Production SSO and broad internal launch.
- Public downloads, public sharing, ZIP/bulk distribution, and external publishing.
- Brand Hub, packages, analytics, smart rules, and taxonomy expansion beyond the test mission.
- Clean-machine production restore and broader disaster recovery drills after tiny beta scope is settled.

## Demo Polish

- UI overflow and copy polish in collection/package/request/detail paths once safety blockers are closed.
- Better empty/loading states and screenshot-ready first viewport polish.
- Search tuning, tag/category naming, and Joanna-specific sample task wording.
- Less operational language in normal-user detail surfaces.
- Nicer tester/demo script flow and fewer admin-looking labels for non-admin users.

## Closed This Pass

- Hosted-safe content fallback exists locally: ResourceSpace API, then local export, then sanitized `bundled-beta-catalog`, then demo fallback.
- Bundled catalog has 181 records, Bible/Plant/Fountain search anchors, and no source paths/checksums in bundled asset payload tests.
- `scripts/import-audit.sh` extension summary now handles paths safely.
- Local backup/archive restore proof exists, with DB dump explicitly skipped because Docker daemon was unavailable.
- Verification passed: `npm --prefix frontend test`, `npm --prefix frontend run typecheck`, `npm --prefix frontend run build`, `git diff --check`, `make launch-readiness`, `make backup`, `make restore-test`, `node scripts/team-beta-signoff-guard.mjs`, and `node scripts/team-beta-signoff-guard-test.mjs`.

Final sort: must-fix list blocks teammate beta; can-wait list blocks production or broad launch, not a scoped Joanna/team beta; demo polish should not consume focus until hosted proof and owner gates close.
