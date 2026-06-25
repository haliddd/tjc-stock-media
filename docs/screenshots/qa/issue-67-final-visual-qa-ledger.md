# Issue 67 Final Visual QA Pack

## Decision

Hali visual review can start for the prototype fidelity stack.

This is not a public launch approval and not a hosted beta approval. It is a current-HEAD local visual QA pack for the canonical prototype surfaces, with safety-preserving deviations recorded below.

## Method

- Accepted design spec: `/Users/halim4pro/Downloads/atlas_dam_10_10_full_prototype(4).html` and PNG 2 through PNG 10.
- Render method: Playwright Chromium fallback on local `http://127.0.0.1:4871`; Browser/IAB was unavailable in this toolset.
- Desktop viewport: `1448 x 1086`.
- Mobile viewport: `390 x 844` for mobile-relevant surfaces.
- Proof JSON: `docs/screenshots/qa/issue-67-final-visual-qa-pack.json`.

## Matrix

| PNG | Prototype surface | Current route/state | Screenshot evidence |
| --- | --- | --- | --- |
| 2 | Primary app shell / library rhythm | `/library` | `docs/screenshots/qa/issue-67-png2-library-shell-desktop-1448.png`, `docs/screenshots/qa/issue-67-png2-library-shell-mobile-390.png` |
| 2 | Collections grid + detail rail | `/collections` | `docs/screenshots/qa/issue-67-png2-collections-desktop-1448.png`, `docs/screenshots/qa/issue-67-png2-collections-mobile-390.png` |
| 3 | External public portal | `/public-portal/spring-campaign-2024` | `docs/screenshots/qa/issue-67-png3-public-portal-desktop-1448.png`, `docs/screenshots/qa/issue-67-png3-public-portal-mobile-390.png` |
| 4 | Search intelligence | `/library`, query `outdoor hero images` | `docs/screenshots/qa/issue-67-png4-search-intelligence-desktop-1448.png` |
| 5 | Asset detail | `/assets/1` | `docs/screenshots/qa/issue-67-png5-asset-detail-desktop-1448.png`, `docs/screenshots/qa/issue-67-png5-asset-detail-mobile-390.png` |
| 5 | Download Center drawer | `/assets/1`, download drawer open | `docs/screenshots/qa/issue-67-png5-download-drawer-desktop-1448.png` |
| 6 | Asset rights/release record | `/assets/1` | `docs/screenshots/qa/issue-67-png6-asset-rights-record-desktop-1448.png` |
| 7 | Brand Kit | `/brand-hub` | `docs/screenshots/qa/issue-67-png7-brand-kit-desktop-1448.png`, `docs/screenshots/qa/issue-67-png7-brand-kit-mobile-390.png` |
| 8 | Audit Log & Compliance | `/governance/audit-log` | `docs/screenshots/qa/issue-67-png8-audit-compliance-desktop-1448.png` |
| 9 | Distribution Sets | `/distribution-sets` | `docs/screenshots/qa/issue-67-png9-distribution-sets-desktop-1448.png` |
| 10 | Integrations & Settings | `/governance/integrations` | `docs/screenshots/qa/issue-67-png10-integrations-settings-desktop-1448.png` |

## Automated Proof Summary

- Captures: 16.
- Horizontal overflow: 0 failures.
- Console warnings/errors: 0 captures with issues.
- Real failed requests: 0 captures with issues.
- Route selector proof: 0 failures.
- Ignored requests: three `_rsc` `net::ERR_ABORTED` navigation aborts from Next.js client transitions; no asset/API failure.

## Comparison Points

1. Shell geometry: internal routes preserve the prototype sidebar, topbar, workspace, and right-rail model instead of reverting to beta trust strips or diagnostic cards.
2. Density and spacing: app screens keep compact filters, cards, tables, rows, and inspector/action rails rather than the earlier oversized safety panels.
3. Governance visibility: selected assets/collections still expose approval/reuse state, rights/channel/region data, expiration/review context, and safe download/share states in local context.
4. Control reachability: primary controls are present and readable across matrix routes, including search, filters, saved views, rights-safe toggle, drawer close, collection actions, distribution actions, and settings cards.
5. Mobile behavior: library, collections, public portal, asset detail, and brand kit stack at `390px` without horizontal overflow.
6. Download safety: Download Center opens from asset detail and keeps original/source access elevated while approved-copy/rendition rows run through gate language.
7. Public portal separation: external portal renders outside the internal app shell, matching the PNG 3 portal-only contract.

## Above-The-Fold Copy Diff

Accepted prototype copy is represented by equivalent current route copy. TJC-specific product naming is intentionally retained where project rules require it:

- `Archive One` concept shell becomes `Atlas DAM / Media portal` inside protected TJC routes.
- `Mountain Lake Hero.jpg` concept asset becomes current local fixture asset `01 Sabbath Worship Sample`.
- `Spring Campaign 2024` concept collection/portal remains present on marketing/public/distribution surfaces; local collection routes use current catalog collection names where ResourceSpace-derived data is authoritative.

No unapproved trust strip, beta diagnostic slab, public launch claim, fake hosted link, fake ZIP/download, fake approval, or ResourceSpace writeback claim was found in the captured matrix.

## Intentional Deviations

- Current local library/collection/asset routes use role-safe preview placeholders when the fixture does not expose images to the current role. This preserves source/original/media safety and avoids committing church media.
- Current local DAM data uses TJC/Atlas fixture records where ResourceSpace-derived/local catalog truth exists; investor-demo Acme imagery remains on prototype/product surfaces that own it.
- Download Center copy is stricter than the PNG wording: original/source access stays elevated, approved renditions are request/gate-driven, and no fake `Download 8 files` success is shown.
- Some route screenshots are lower visual richness than the prototype PNGs because source media previews are restricted in the local role context. This is a safety-preserving deviation, not a UI shell deviation.

## Remaining Risk

- This pack proves local visual readiness only. It does not prove hosted protected beta, Vercel protection, live ResourceSpace availability, or production SSO.
- Full accessibility state audit for every interaction in #69-#73 remains separate from this screenshot matrix.
- Open stacked PRs still need review/merge order resolution before these screenshots represent merged `main`.

## Validation

- `git diff --check`
- `npm --prefix frontend run typecheck`
- Focused route screenshot matrix captured by Playwright Chromium.
