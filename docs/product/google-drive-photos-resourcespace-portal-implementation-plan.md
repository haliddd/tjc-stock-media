# Google Photos / Drive ResourceSpace Portal Implementation Plan

Version: v0.1
Status: superseded as product canon; reference evidence only
Source PRD: `docs/product/google-drive-photos-resourcespace-portal-prd.md`

Superseded by `docs/product/PRD-slim-atlas-resourcespace-portal-cleanup.md` and `docs/START_HERE.md`. Use this file only for visual/workflow reference. Do not treat beta, production, package/distribution, admin/governance, or enterprise DAM language here as current Slim Atlas truth.

## Planning Constraints

- Documentation pass only.
- Do not edit frontend code in this pass.
- Do not edit backend code in this pass.
- Do not edit `prd.json`.
- Do not touch source media.
- ResourceSpace remains source truth.
- Google Shared Drive remains master archive.
- Approved Public/Internal folders remain delivery outputs, not the full archive.
- No beta-ready or production-ready claim from this plan is canonical for Slim Atlas.

## Phase 1: Viewer / Contributor Friendly Front Door

Goal: make the portal feel like a normal media library for the two primary user groups.

Work:

- Simplify first screen around search, recent albums, and upload.
- Make role-aware navigation prioritize Viewer and Contributor tasks.
- Hide DAM/admin language from normal users.
- Preserve current safety gates and beta limitations.

Acceptance:

- Viewer understands where to search.
- Contributor understands where to upload.
- Reviewer/Admin tools remain available only to those roles.
- Viewer cannot see ResourceSpace internals, source paths, or writeback details.

Recommended first coding PR:

`design/enterprise-dam-ui-v2`: implement role-aware front-door navigation and search-first home for Viewer/Contributor, using existing route guards and existing API contracts.

## Phase 2: Library Visual Polish + Albums + Multi-Select

Goal: make browsing feel closer to Google Photos and Drive.

Work:

- Improve photo grid scanability.
- Add or polish timeline/date grouping.
- Add album/collection cards with cover, count, and status mix.
- Polish multi-select and bulk action bar.
- Add partial-safe behavior for mixed-status selections.

Acceptance:

- Viewer can browse by grid, date, event, and collection.
- Selected assets have clear visual state.
- Bulk request works for mixed selections.
- Bulk download is blocked unless every selected asset passes approved-copy checks.

## Phase 3: Upload / Status Tracking

Goal: make contributor intake understandable without training.

Work:

- Build upload wizard around batch context.
- Support event name, event date, ministry, location, notes, captions, and suggested tags.
- Add My Uploads status view.
- Add reviewer evidence-request loop.

Acceptance:

- Contributor can upload a photo batch and submit it for review.
- Every upload defaults to `Needs Review / Do Not Publish`.
- Contributor can see status and respond to missing info.
- Upload never publishes.

## Phase 4: Review / Admin Polish

Reference goal only: make review/support easier without making broad governance dominate normal UX.

Work:

- Tune Reviewer queue filters for uploads, reuse requests, rights unclear, people/minors, worship/sacrament, and missing evidence.
- Keep evidence checklist required for approval.
- Improve Admin readiness views for audit, source truth, taxonomy, pending writes, and route identity.
- Keep writeback truth explicit.

Acceptance:

- Reviewer knows why an item cannot be approved.
- Admin can trace every asset to ResourceSpace/source truth.
- Pending writes are not described as synced.
- AI suggestions remain suggestions only.

## Phase 5: Hosted Durable Audit / Download Storage

Goal: unblock production-grade hosted approved-copy downloads.

Work:

- Add durable storage for download tickets.
- Add durable storage for audit events.
- Add durable storage for feedback, requests, saved collections, and upload status if needed.
- Prove backup/restore and route identity gates.
- Keep hosted downloads fail-closed until these pass.

Acceptance:

- Approved-copy download requires durable ticket and audit record.
- One-use ticket behavior is proven.
- Source/original paths remain hidden.
- Production SSO and role identity are verified before broad use.

## Risks

- Users may assume `Approved Public` means immediately downloadable. Mitigation: plain-language `Can I use this?` decision on every asset.
- Contributors may think upload publishes media. Mitigation: upload copy and status default to `Needs Review / Do Not Publish`.
- Albums and bulk actions may hide mixed safety states. Mitigation: safe counts, total counts, and partial-safe bulk behavior.
- Hosted downloads may outpace durable audit storage. Mitigation: keep hosted approved-copy downloads fail-closed until durable storage passes.
- ResourceSpace writeback may be misunderstood. Mitigation: label queued/pending-write state honestly and require separate approval for live writeback.
- Viewer UX may become admin-heavy. Mitigation: role-aware navigation and normal-user labels.

## Open Decisions For Hali

- First coding PR scope: search-first home only, or search-first home plus role-aware sidebar?
- First collection model: event albums, personal saved collections, or shared ministry collections?
- Upload v2 backend behavior: direct ResourceSpace upload, portal queue for manual import, or hybrid?
- Hosted downloads enablement rule: durable audit storage only, or durable audit storage plus production SSO?
- First usability testers: current six beta testers or a new Viewer/Contributor-focused group?
