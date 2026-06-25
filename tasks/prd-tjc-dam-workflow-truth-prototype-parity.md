# PRD: TJC DAM Workflow Truth + Prototype Parity

Status: active product-wide PRD
Date: 2026-06-25
Contract: `docs/ui/tjc-dam-workflow-truth-parity-contract.md`

## Problem

The current app has pieces of the Archive One / Atlas prototype visual shell, but it still behaves like a thin local portal with prototype-looking pages. The product-wide goal is not to finish an upload issue or one visual slice. The goal is one coherent, workflow-truthful TJC + ResourceSpace DAM that looks like the uploaded prototype family and behaves like a mature church media DAM.

## Goals

- Remove the outer authenticated-app frame and make the DAM fill the browser naturally.
- Use one canonical authenticated shell across major app pages.
- Purge placeholder company/person/infrastructure copy from user-facing surfaces.
- Make Library and Collections populated, interactive, role-aware DAM centers.
- Fix upload-to-requests-to-review truth: Contributor intake creates visible downstream work.
- Make Review a real reviewer workbench with submitted intake visibility and pending ResourceSpace writeback truth.
- Make public portal TJC-facing and honest about request/share/download states.
- Make governance/status pages polished but truthful about local/demo/ResourceSpace boundaries.
- Capture product-wide desktop/mobile proof before any done claim.

## Non-Goals

- No production deploy, public launch, or PR push without explicit approval.
- No ResourceSpace writeback unless confirmed by readback.
- No source media deletion, rename, move, or metadata mutation.
- No fake approvals, public links, downloads, SSO, object storage, analytics, recipients, or integration claims.
- No repo-wide code-symbol rename from old Atlas component exports unless needed for user-facing behavior.

## Story Stack

### 1. Global Shell Frame Removal + Canonical Authenticated Shell

Acceptance:
- Authenticated app has no outer rounded border, shadow, or padded screenshot frame.
- App fills viewport with left nav, top search/actions, workspace, optional inspector.
- Sidebar/topbar tokens match prototype family while using TJC copy.
- Every authenticated page in this pass uses the canonical shell or an explicitly documented exception.

### 2. Placeholder Purge + TJC Truth Copy

Acceptance:
- User-facing app copy has no `Archive One`, `Atlas`, `Acme`, `Taylor Morgan`, `Jordan Kim`, `aone.io`, `Okta`, `Amazon S3`, or fake enterprise metrics.
- Replacements use TJC Media Library, Media Team, Ministry Reviewer, Rights Reviewer, DAM Admin, ResourceSpace read status, Shared Drive/source custody, local demo, or pending mapping.
- Automated visible-text scan of major routes reports no banned placeholders.

### 3. Library Real DAM Center

Acceptance:
- Admin Library never renders mostly blank after loading.
- Grid has large media-first cards, designed fallback thumbnails, title, type/size/date if available, approval/rights chips, collection tags, selected state, and inspector.
- Browse/Ops, sort, filters, saved views, and rights-safe toggle visibly change state.
- Broken/403 thumbnails degrade to designed fallback previews.

### 4. Collections Real Page

Acceptance:
- Admin Collections shows populated TJC collection cards, not `0 collections`.
- Covers have real or designed fallback imagery.
- Selected collection inspector shows description, permissions, collaborators, item readiness, source truth, and actions.
- Actions visibly respond with local-demo/readiness messages.

### 5. Upload -> Requests -> Review Workflow Truth

Acceptance:
- Contributor can submit source-link intake with valid date.
- Date normalization accepts `YYYY-MM-DD` and gives field-specific errors for invalid/missing date.
- Successful intake creates a local request record.
- Requests page shows the new intake ticket.
- Review page surfaces submitted intake tickets while clearly stating ResourceSpace remains unchanged.

### 6. Reviewer Workbench

Acceptance:
- Reviewer sees queue list, selected preview, metadata/rights/people-youth checks, decision buttons, status history, and local pending-write truth.
- Submitted intake appears in the workbench.
- Approve/request changes/restrict/block actions remain evidence-gated and do not claim source truth until confirmed.

### 7. Public Portal TJC Facing

Acceptance:
- Public portal uses TJC Media Library/church-safe language.
- No placeholder brand/person/company copy.
- Request asset and share collection link produce visible state.
- Download disabled state explains why.
- Asset cards show item readiness/rights-safe state.

### 8. Governance/Brand/Distribution/Settings Honesty

Acceptance:
- Brand kit, distribution, audit, and settings retain prototype layout density.
- Copy describes TJC media guidance, ResourceSpace read/mapping status, local demo notifications, pending API/webhook/SSO/storage decisions.
- No fake external infrastructure claims.

### 9. Visible Interaction Wiring

Acceptance:
- Filters open visible panels/menus.
- Saved views open and selecting one changes the page.
- Rights-safe toggle changes counts/state.
- Share/download/request/check-readiness buttons show dialogs, drawers, or clear restriction state.
- Selected cards update inspector.
- Role changes alter available actions.

### 10. Product-Wide QA

Acceptance:
- Capture screenshots for Admin Library, Admin Collections, Public Portal, Contributor Upload, Contributor Requests, Reviewer Workbench, Admin Distribution, Admin Audit, Admin Settings, and mobile Library.
- Compare key screenshots against canonical prototype PNGs and Chrome audit.
- Run required commands from the contract.
- Produce a QA ledger with remaining gaps and proof paths.

## Current Implementation Notes

- Current broad branch is `agentos/prototype-upload-ingest-69`, but this PRD is product-wide and must not be treated as issue #69 completion.
- Existing dirty work already starts stories 1, 2, 3, 4, 5, 6, 7, 8, and 9. Completion still requires product-wide proof and review against the contract.
- Existing issue stack #61-#73 maps closely to visual parity, but this PRD adds workflow-truth requirements that must be reflected before claiming product-wide completion.
