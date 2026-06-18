# EDAM-04 Asset Detail / Trust Evidence

Status: DONE

Branch: `codex/edam-04-asset-detail`

Runtime: target 60 minutes; actual about 35 minutes. Finished under target because acceptance checks passed, evidence was written, and remaining smoke was blocked by the repository safe-lane guard in this Codex worktree rather than by an app failure.

## Scope

- Made the enterprise asset detail page put trust, rights evidence, primary blocker, and fail-closed status before download-oriented actions.
- Added a primary reuse cockpit that explains the current gate state and next step by role.
- Kept approved downloads routed through the approved-copy ticket gate and audit flow.
- Added preview URL fail-closed filtering so private/source-like URLs and `/api/download` URLs render a placeholder instead of issuing an image request.
- Improved mobile action layout so primary/secondary CTAs stack full width at 320px and 390px.

## Changed Files

- `frontend/components/dam/enterprise/AssetDetailPage.tsx`
- `frontend/components/MediaPreview.tsx`
- `frontend/app/globals.css`
- `frontend/lib/production-hardening.test.ts`
- `docs/runs/evidence/2026-06-18/edam-04-asset-detail.md`

Shared-file note: `frontend/app/globals.css` is shared styling; edits are scoped under `.enterprise-detail .ed-detail-action-cockpit`. `frontend/components/MediaPreview.tsx` is shared preview infrastructure; the new helper is fail-closed and does not loosen preview or download access.

## Validation

```bash
npm --prefix frontend run typecheck
```

Result: PASS.

```bash
npm --prefix frontend run test
```

Result: PASS. 21 test files, 161 tests.

```bash
node scripts/api-payload-guard.mjs
```

Result: PASS.

```bash
node scripts/private-source-guard.mjs
```

Result: PASS.

```bash
BASE_URL=http://localhost:4872 make portal-download-ticket-smoke
```

Result: BLOCKED by safe-lane guard:

```text
run portal-download-ticket-smoke only inside expected checkout /Users/halim4pro/Desktop/MVP/tjc-stock-media; got /Users/halim4pro/.codex/worktrees/99c0/tjc-stock-media
```

No bypass was attempted.

## Browser Probe

Local server:

```bash
SSO_TRUSTED_HEADERS=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0 npx next dev --port 4872
```

Playwright probe:

```text
390px: /assets/367 rendered h1 "Bee Detail"; cockpit visible; 2 actions; action widths 344px; scrollWidth 390px; no horizontal overflow.
320px: /assets/367 rendered h1 "Bee Detail"; cockpit visible; 2 actions; action widths 274px; scrollWidth 320px; no horizontal overflow.
```

## Acceptance Notes

- Unsafe downloads remain blocked or ticket-gated. Approved-copy CTA calls the existing download gate request path; blocked copy explains the gate reason and required next action.
- Detail payload stays redacted for normal roles. Added production-hardening coverage that Viewer/Contributor asset detail image payloads omit `imageUrls.download`, private paths, source path fields, master path fields, and checksums.
- Users see why an action is blocked and what to do next. The new cockpit surfaces fail-closed status before the preview/download area, and the rail now orders reuse answer, evidence checklist, primary blocker, then action.

## Contract Freeze Alignment

State machine: asset detail uses `presentAssetDetailContext`, which is backed by `buildPortalReuseDecision`. The UI reads `reuse.state`, `viewerVerdict`, `metadataConfidence`, and `access.downloadApprovedCopy` from that packet. It does not create a separate approval state. Visible labels map to the state-machine buckets: `portal-ready` / `internal-ready` => reuse approved; blocked archive / do-not-use => blocked from reuse; all other blocked states => needs review before reuse.

Redaction contract: normal-role asset detail payloads still go through role payload redaction and `assetWithRoleImageUrls`. Viewer/Contributor test coverage confirms no `imageUrls.download`, `sourcePath`, `masterDrivePath`, checksum, or private custody path leaves the detail image payload. Preview rendering also refuses private/source-like URLs and `/api/download` URLs, so bad preview data fails closed to a placeholder rather than leaking a request.

Overclaim ban list: this lane does not claim public launch readiness, hosted mutation, live ResourceSpace writeback, source/original delivery, durable hosted storage, broad archive approval, or final Team Beta GO. Copy says approved copy only after gate check; blocked copy says review required; source-file access remains request-only.

Download gate contract: no gate was loosened. Approved download actions still call the approved-copy gate, which requires terms, policy allow, approved derivative evidence, durable ticket issuance, and required audit persistence before delivery. Original/master delivery remains request-only.

Success matrix:

| Dimension | Result | Evidence |
| --- | --- | --- |
| Operator clarity | PASS | Detail cockpit names gate state, primary blocker, and next safe action before download actions. |
| Workflow depth | PASS | Viewer/Contributor get review request path; Reviewer/Admin get review/action wording without source delivery. |
| Governance | PASS | Rights/source/people/review checklist appears before next action; private/source preview URLs fail closed. |
| Role fit | PASS | Role-aware copy uses Viewer-safe review requests and ops wording for Reviewer/Admin. |
| Mobile utility | PASS | 390px and 320px probes show no horizontal overflow and full-width stacked CTAs. |
| Evidence | PASS with one blocked smoke | Typecheck, full tests, payload guard, private-source guard, and mobile probe passed. Download-ticket smoke blocked by safe-lane guard in Codex worktree. |
| Honesty | PASS | Evidence records smoke blocker and avoids hosted/durable/GO overclaims. |
| Integration | PASS | Keeps ResourceSpace as DAM/search/review layer and Google Shared Drive/source files restricted. |

P0 gate impact: no P0 gate is worsened. This lane strengthens P0 privacy/download gates by making unsafe detail downloads understandable, preserving ticket-gated delivery, and adding preview-source fail-closed behavior. Remaining P0 evidence gap is procedural only: download-ticket smoke must be rerun from `/Users/halim4pro/Desktop/MVP/tjc-stock-media` or another allowed checkout because the guard blocks Codex worktrees.

Lane score recommendation: 3. Enterprise-grade lift across operator clarity, governance, role fit, mobile utility, and evidence, with no gate loosening. Score remains conditional on orchestrator rerunning the download-ticket smoke from the allowed checkout for final P0 packet closure.

## Blockers

- `portal-download-ticket-smoke` cannot run from this Codex worktree because `safe-lane-headroom-guard` requires `/Users/halim4pro/Desktop/MVP/tjc-stock-media`.

## Rerun Commands

```bash
npm --prefix frontend run typecheck
npm --prefix frontend run test
node scripts/api-payload-guard.mjs
node scripts/private-source-guard.mjs
BASE_URL=http://localhost:4871 make portal-download-ticket-smoke
```
