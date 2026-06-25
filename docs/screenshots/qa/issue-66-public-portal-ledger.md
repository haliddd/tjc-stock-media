# Issue 66 External Portal Fidelity Ledger

## Canonical Input

- PNG 3 External Collection Portal: `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_09 AM (3).png`

## Implemented Fidelity Contract

- Public portal route renders outside the internal DAM app shell.
- Top header uses Archive One brand and a share collection control.
- Hero uses full-width campaign imagery, campaign title, approved collection badge, and campaign copy.
- Floating access card includes brand, allowed channels, region, expiration, contact, and portal actions.
- Below-hero content includes About this collection, Usage notes, and a dense approved asset grid.
- Mobile stacks hero, access card, usage notes, and grid without horizontal overflow.

## Guardrails

- Local demo only; no deploy.
- No ResourceSpace writeback.
- No public launch claim.
- No fake package/ZIP download.
- Access card actions are disabled and explicitly do not create links, requests, packages, or downloads.

## Evidence

- `docs/screenshots/qa/issue-66-public-portal-desktop-1448.png`
- `docs/screenshots/qa/issue-66-public-portal-mobile-390.png`
- `docs/screenshots/qa/issue-66-public-portal-qa.json`

## QA Notes

- QA JSON reports `hasAppShell: false`.
- QA JSON reports floating access card present.
- QA JSON reports all portal action buttons disabled.
- Mobile capture reports no horizontal overflow.
