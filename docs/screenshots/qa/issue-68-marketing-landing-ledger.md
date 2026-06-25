# Issue 68 Marketing Landing Fidelity Ledger

## Canonical Input

- PNG 1 Marketing Landing: `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_09 AM (1).png`

## Implemented Fidelity Contract

- Landing route renders outside the internal DAM app shell.
- Header matches prototype structure: Archive One mark, centered product navigation, sign-in link, black demo CTA.
- Hero uses the canonical headline and subcopy with a large embedded app mockup as the emotional anchor.
- Embedded app mockup includes sidebar, saved views, global search, filter/saved-view controls, rights-safe toggle, asset grid, selected state, inspector, rights metadata, and download controls.
- Role row includes Viewer, Contributor, Reviewer, and Admin cards in prototype density.
- Feature row includes Rights-safe search, Smart approvals, Metadata governance, Brand consistency, and Secure distribution with compact supporting miniatures.
- Mobile stacks landing content and mockup without horizontal overflow.

## Guardrails

- Local demo only; no deploy.
- No ResourceSpace writeback.
- No fake hosted links, ZIP packages, external shares, or real downloads.
- Internal app routes keep the prototype DAM shell; only `/` escapes the shell.

## Evidence

- `docs/screenshots/qa/issue-68-landing-desktop.png`
- `docs/screenshots/qa/issue-68-landing-mobile.png`
- `docs/screenshots/qa/issue-68-marketing-landing-qa.json`

## QA Notes

- Desktop capture confirms landing shell is not wrapped in `.proto-app-shell`.
- Desktop capture confirms canonical headline, role cards, feature cards, rights-safe toggle, and inspector are present.
- Mobile capture reports no horizontal overflow.

## Comparison Points

1. First viewport composition: left marketing copy, right embedded app mockup, role row visible below fold edge.
2. Header/nav: Archive One brand mark, Product/Solutions/Resources/Pricing/Company nav, Sign in, and black Request a demo CTA match the accepted landing screenshot structure.
3. App mockup anatomy: internal sidebar, saved views, user block, top search, filters, saved views, rights-safe toggle, asset grid, selected card, and right inspector are present in the same visual order.
4. Typography/density: warm neutral canvas, near-black large headline, compact UI chrome labels, dense DAM card rhythm, thin borders, and soft panel shadows follow the canonical prototype rhythm.
5. Governance layer: rights-safe toggle, Approved badge, usage rights rows, expiration row, and download control stay visible in the mock inspector.
6. Downstream sections: Viewer/Contributor/Reviewer/Admin role cards and the five feature columns match the accepted landing screenshot content and order.
7. Responsive behavior: mobile stacks nav, copy, app preview, inspector, role cards, and feature columns without horizontal overflow.

## Above-The-Fold Copy Diff

Allowed accepted copy present:

- `Archive One`
- `Product`
- `Solutions`
- `Resources`
- `Pricing`
- `Company`
- `Sign in`
- `Request a demo`
- `The intelligent DAM for modern teams`
- `A beautiful DAM for teams that need control.`
- `Organize, approve, protect, and distribute brand assets with confidence. Archive One gives your team the clarity and control to get work done-at scale.`
- `Explore the product`
- `Acme Inc.`
- `NORTHWOOD`
- `Vertika`
- `Sonder`
- `LUMEN`

Intentional text-rendering deviation:

- Browser uses an em dash entity in the subcopy (`done-at scale` visually renders as `done—at scale`) to match the prototype screenshot while keeping source text safe.

## Remaining Intentional Deviations

- Photographic thumbnails use existing CSS/remote demo imagery classes instead of committing church media or mutating source media.
- Mockup actions are presentation controls only; no real public links, downloads, writeback, approvals, or hosted portal actions are created.
- Native viewport screenshot is `1512 x 982`, matching the canonical PNG dimensions used for visual comparison; route remains a local demo only.
