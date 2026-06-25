# Issue #1 Portal UI QA

Checked: 2026-06-25T13:40:56.326Z

Scope: local UI proof for issue #1 internal beta portal cleanup. No deploy, no ResourceSpace writeback, no public launch, no fake approvals, no fake public links, no fake downloads, and no source media mutation.

## Evidence

- Concept inspected: `docs/screenshots/concepts/issue-1-portal-command-concept.png`
- Desktop screenshot inspected: `docs/screenshots/qa/issue-1-portal-ui-desktop.png`
- Mobile screenshot inspected: `docs/screenshots/qa/issue-1-portal-ui-mobile.png`
- Machine proof: `docs/screenshots/qa/issue-1-portal-ui-proof.json`

## Render QA

- Method: Playwright Chromium fallback against local `http://localhost:4881`; Browser/IAB tool was not available in active tools.
- Desktop: 1440x980, `Reviewer`, `x-tjc-role: Reviewer`
- Mobile: 390x844, `Viewer`, `x-tjc-role: Viewer`
- Console errors: 0
- Console warnings: 0
- Real failed requests: 0
- Ignored Next RSC navigation aborts: 1
- Horizontal overflow: 0
- Required text checks: pass

## Validation

- `git diff --check`: pass
- `npm --prefix frontend run typecheck`: pass
- `npm --prefix frontend test -- lib/public-portal-role-controls.test.ts lib/rights-safe-search.test.ts lib/download-center.test.ts lib/beta-auth.test.ts lib/beta-route-access.test.ts`: pass, 24 tests

## Fidelity Ledger

- Brand and source truth: implementation shows `True Jesus Church Media Library`, `Internal beta`, `ResourceSpace source truth`, and `Google Drive originals`.
- Safety boundary: implementation shows approved-copy only, blocked-until-clear, no public links, no ZIP export, and no ResourceSpace writeback success.
- Customer reuse question: desktop and mobile show `Can I use this?` plus record-level verdict and inspector next action.
- Desktop fit: command row stays one line with inspector open; proof records header action height 44px and no overflow.
- Mobile fit: duplicate role-control panel removed, floating beta QA controls hidden below 640px, and fixed bottom nav no longer covers first search card content in proof screenshot.

## Remaining Boundaries

- Local demo only.
- Viewer mobile currently has zero role-safe records in this local fixture, which is honest beta behavior under current role gates.
- ResourceSpace writeback, hosted beta proof, public links, ZIP export, and original/master downloads remain intentionally unavailable.
