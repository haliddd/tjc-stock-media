# V3 DAM Product Spine

Date: 2026-06-18

## Product Call

Current maturity: **5/10**.

Target after V3 maturity work: **8/10 local DAM prototype**.

Release status: **local prototype / toy DAM workbench**.

Team Beta: **NO-GO**.

Enterprise rollout: **NO-GO**.

This target does not mean Team Beta. It means the local product should behave like a credible DAM prototype: asset browser, faceted search, selectable grid, inspector, renditions, versions, review proofing, portal/share drafts, and honest storage/identity blockers. This pass does not claim beta readiness.

## Red Lines

- No deploy.
- No hosted mutation.
- No env or credential change.
- No source media mutation.
- No ResourceSpace live writeback.
- No download gate weakening.
- No review approval weakening.
- No Team Beta GO or beta-candidate wording.
- No public invite or send.

## Spine Contract

The product should open as a DAM browser:

```text
top: search / view / sort / density / selected count
left: collections / saved searches / filters
center: selectable media grid or table
right: selected asset inspector
bottom/overlay: bulk action tray
```

Core objects:

- Asset
- Collection
- Saved search
- Metadata field
- Original
- Derivative
- Rendition
- Version
- Approval
- Review request
- Package
- Portal draft
- Share link draft

## Screen Contracts

Library:

- No hero block.
- No trust strip before grid.
- No use-case cards as primary navigation.
- Asset grid dominates.
- Cards are thumbnail-first with one status marker.
- Inspector shows preview, metadata, rights, renditions, versions, and activity.
- Bulk actions stay draft-safe and role-aware.

Asset Record:

- Preview first.
- Title, record ID, one status, and compact action bar second.
- Tabs: Overview, Metadata, Rights, Renditions, Versions, Activity, Related.
- Right rail: use status, collections, reviewer, dates, rights summary.
- Governance moves into Rights and Activity instead of repeating across panels.

Review:

- Left queue.
- Center proofing preview and comments.
- Right evidence checklist and decision actions.
- No top metrics dashboard.
- No preview sample strip.
- No taxonomy/signal rail overload.

Delivery:

- Package Draft, Internal Portal Draft, Public Portal Draft, Share Link Draft.
- Expiry, password, terms, comment/download permissions visible as draft or disabled controls.
- No public link, ZIP, email, or source copy unless proven and approved.

Admin:

- Readiness checklist.
- Blockers table.
- Storage/identity matrix.
- Integrations table.
- Audit and feedback tables.
- No hero, no decorative KPI wall.

## Acceptance

Pass only if the app feels like a DAM prototype:

- Users can find assets.
- Users can filter assets.
- Users can select assets.
- Users can inspect metadata without leaving Library.
- Users can see renditions and versions as product concepts.
- Users can review/proof assets without dashboard clutter.
- Users can see delivery as portal/share/package drafts.
- Admin makes blockers impossible to miss.

Failure wording:

```text
Local prototype only. Not beta-ready.
```
