# Joanna Mini Beta UI And Download Triage

Date: 2026-06-16

## Summary

Current hosted URL is not proven to contain this local portal state. Local triage used `http://127.0.0.1:4867` for local-dev workflow proof and `http://127.0.0.1:4869` for production-mode read/fail-closed proof.

The Joanna mini beta can still be content-manager testable, but the real limitations are sharper than the first readiness report implied:

- LM Photos assets from `lm.photo@tjc.org` / LM Photos source labels are treated as TJC-owned and public-ready by a runtime-only overlay.
- About 90% of LM Photos records are `Approved Public` / `Public and Internal`; about 10% remain deterministic holdouts across other statuses for filter/review test rounds.
- Viewer and Reviewer can browse approved LM Photos records with thumbnails/previews.
- Approved-copy download works locally in dev through one-time tickets and audit logging.
- Production-mode local/hosted download fails closed without durable audit/ticket storage.
- Download client calls were sending role in the POST body, which the gate treats as a client role override. Local role transport was patched to use query/header role and no body role.
- Normal asset detail exposed filename automation/original-filename wording. Normal roles now hide that block.

## Real UI Issues

1. Hosted URL is stale relative to local portal.
   - Probe: hosted read-only check passed, but it was not proven to include LM Photos overlay, role-transport fixes, or middleware dependency reduction.
   - Impact: Joanna should not receive hosted link until redeploy is confirmed.

2. Asset detail is too operational for normal users.
   - Evidence: QA flagged original filename / ResourceSpace wording on normal asset detail.
   - Change made: `frontend/components/dam/enterprise/AssetDetailPage.tsx` hides Filename automation from non-admin roles.

3. Collections and distribution-set pages have table/action clipping in saved QA screenshots.
   - Evidence: `docs/screenshots/collections-desktop.png`, `docs/screenshots/packages-mobile-320.png`.
   - Impact: not central to Joanna first test unless she uses collections/package workflows.
   - Recommended fix: make collections/package action rows wrap into card/mobile actions and avoid wide table overflow.

4. Some old browser QA failures are test-noise.
   - `upload-viewer ... viewer upload block missing` is stale: local `/upload?role=Viewer` now shows the Contributor-required block.
   - ResourceSpace shell assertions are broader than Joanna mini beta.

## Download Workflow Findings

1. Local dev approved-copy download works.
   - Probe: `POST /api/download/367?role=Viewer` with `x-tjc-local-beta-role: Viewer` and accepted terms.
   - Result: `200`, ticket minted, audit id returned.
   - Probe: ticketed `GET /api/download/367?...ticket=...`.
   - Result: `200 image/jpeg`, 252700 bytes.

2. Original/source download remains blocked.
   - Probe: `GET /api/download/367?role=Viewer&variant=original`.
   - Result: `403`, `reasonCode: original-request-only`.

3. Production-mode download fails closed without durable runtime storage.
   - Probe: `POST /api/download/367?role=Viewer` on `http://127.0.0.1:4869`.
   - Result: `503`, `reasonCode: audit-required`.
   - Cause: `NODE_ENV=production` blocks local filesystem audit/ticket writes unless durable runtime storage is configured.

4. Production-mode read path shows LM Photos release overlay.
   - Probe: `GET /api/assets/search?limit=120` with Reviewer role on `http://127.0.0.1:4869`.
   - Result: `total: 2061`, first 120 all `Approved Public`, 120 downloadable by policy, asset `367` rights basis `TJC-owned`.

5. `make portal-download-ticket-smoke` passes locally.
   - Command: `BASE_URL=http://127.0.0.1:4867 make portal-download-ticket-smoke`.
   - Result: PASS, including ticket minted, one-time consume, reuse denied, concurrent consume one-wins, original blocked, required audit persisted.

## Changes Made

- `frontend/components/GatedDownloadButton.tsx`
  - POSTs to `/api/download/:id?role=<role>`.
  - Sends `x-tjc-local-beta-role`.
  - Removes `role` from JSON body.

- `frontend/components/dam/useDamApi.ts`
  - Same download gate role transport for enterprise detail/review surfaces.

- `scripts/portal-download-ticket-smoke.sh`
  - Adds `x-tjc-local-beta-role: Reviewer` to reviewer probes.

- `frontend/components/dam/enterprise/AssetDetailPage.tsx`
  - Hides Filename automation block from non-admin roles.

- `frontend/lib/media-source/index.ts`
  - Applies runtime-only LM Photos public-release overlay with deterministic 10% status holdouts.

- `frontend/lib/portal-reuse-decision.ts`
  - Treats `lm.photo@tjc.org` as trusted TJC-owned source, matching the user's stated source.

- `frontend/lib/beta-auth.ts`
  - Removes heavy permissions/governance import from middleware auth path; production middleware shrank from about 407 kB to about 35 kB and no longer crashes on Edge `eval`.

- `frontend/next.config.mjs`
  - Disables Next webpack build worker to avoid local build-worker chunk race.

## Verification

- `npm --prefix frontend test`: PASS, 110 tests.
- `npm --prefix frontend run typecheck`: PASS.
- `npm --prefix frontend run build`: PASS after generated chunks existed; clean build may need temporary chunk mirror workaround due local Next 15.5.19 server chunk path issue.
- `BASE_URL=http://127.0.0.1:4867 make portal-download-ticket-smoke`: PASS.

## Recommended Next Fixes

1. Redeploy before sharing hosted URL.
   - Hosted URL currently not proven to include latest local portal changes.

2. Decide hosted download path.
   - Configure durable audit/ticket storage if Joanna must test hosted downloads.
   - Otherwise keep hosted download fail-closed and let Joanna test download locally or skip download this round.

3. Fix clean build artifact issue.
   - Temporary local workaround mirrors `frontend/.next/server/chunks/*.js` to `frontend/.next/server/*.js` during build.
   - Long-term fix should pin/upgrade Next or remove workaround once Next server chunk paths are stable.

4. Fix collections/package responsive clipping before broad internal beta.
