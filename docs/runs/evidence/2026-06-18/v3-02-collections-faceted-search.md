# V3-02 Collections + Faceted Search Evidence

## Scope

- Worker: V3-02 Collections + Faceted Search.
- Product call: local DAM prototype, target stronger local prototype navigation.
- Red lines observed: no deploy, push, hosted mutation, env change, source media mutation, ResourceSpace writeback, download-gate weakening, review-gate weakening, public send, or beta-ready wording.

## Patch Summary

- Added four collection group lanes: Source collections, Ministry collections, Channel collections, Governance collections.
- Added saved search language for Ready to use, Needs review, Missing rights, People/minors, Missing derivative, Duplicate cleanup, and Stale approval.
- Reworked collection cabinet UI into grouped sets with counts, selected inspection, and route-aware filtered opens.
- Replaced demo-chip filters with DAM facet groups: Media type, Status, Rights basis, Usage scope, Approved channel, People/minors, Sensitivity, Date, Format/dimensions, Rendition availability, Duplicate/version state.
- Added optional facet count display beside filter labels when count data is provided.

## Guardrails

- Copy says saved filters are local catalog views and do not edit taxonomy or create durable custom fields.
- Normal filter surface no longer exposes source/custody/checksum fields.
- Collection/toolkit copy keeps item-level approval as governing rule.

## Verification

- Passed: `npm --prefix frontend run typecheck`.
