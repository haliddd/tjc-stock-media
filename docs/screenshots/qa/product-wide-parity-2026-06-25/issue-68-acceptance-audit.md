# Issue 68 Acceptance Audit

Date: 2026-06-25
Issue: #68 Prototype fidelity lockdown: Marketing landing page
Runtime proof: `runtime-proof.json`
Latest proof timestamp: `2026-06-25T23:24:14.858Z`
Screenshot: `marketing-home.png`

## Result

Local runtime proof covers the Marketing landing page acceptance surface.

No push, deploy, commit, fake approval, fake download, public publishing, public-link creation, or ResourceSpace writeback was performed.

## Acceptance Matrix

| Requirement | Evidence |
| --- | --- |
| Marketing composition appears only on landing route | `marketing-home.interactionProof.noAuthenticatedShell`; authenticated routes prove canonical DAM shell separately |
| Internal app routes do not gain landing bands/trust strips | Product-wide proof captures Library, Collections, Upload, Review, Requests, Distribution, Audit, Settings, Roles, Brand Kit, and Asset Detail inside the authenticated shell |
| Hero based on PNG 1 / investor-demo marketing shape | `marketing-home.png` shows left hero copy, CTA row, partner/source strip, large embedded app mockup, role cards, and feature row |
| Headline/subcopy adjusted to TJC truth | Visible copy uses `A church media DAM for teams that need control.` and TJC/ResourceSpace safety copy instead of Archive One/Acme copy |
| Embedded app mockup includes sidebar, topbar/search, rights-safe toggle, grid, selected inspector, and download/share controls | `marketing-home.interactionProof.embeddedMockupVisible` |
| Role cards: Viewer, Contributor, Reviewer, Admin | `marketing-home.interactionProof.roleCardsVisible` |
| Feature row: Rights-safe search, Smart approvals, Metadata governance, Brand consistency, Secure distribution | `marketing-home.textSample` includes all feature labels |
| App mockup follows prototype rhythm | Screenshot shows warm off-white canvas, soft panels, rounded cards, dense sidebar/topbar, inspector, status chips, and black primary action |
| Safety claims stay demo-honest | `marketing-home.interactionProof.resourceSpaceTruthVisible`; visible copy references ResourceSpace truth and pending reviewer gate |
| No banned prototype/company/person copy | Runtime banned-copy scan passes across captured routes |

## Intentional Identity Replacement

The issue body names the Archive One headline from the accepted prototype. Later product-wide direction requires TJC-facing runtime copy and bans Archive One/Atlas/Acme/Taylor-style visible copy. The route therefore preserves the prototype composition and product shape while replacing commercial prototype copy with TJC Media Library, church media, ResourceSpace truth, and reviewer-gated language.

## Proof Aggregate

- Routes captured: 15
- Missing required proofs: 0
- Banned-copy failures: 0
- Outer-frame failures: 0
- Horizontal-overflow failures: 0
- Failed-request routes: 0
- Console issue routes: 0
- Populated-grid warnings: 0
- Interaction failures: 0

## Validation

Latest validated commands:

```bash
node scripts/product-wide-parity-proof.mjs
node scripts/product-wide-parity-proof-test.mjs
git diff --check
npm --prefix frontend run typecheck
npm --prefix frontend test -- upload-intake public-portal-preview dam-shell-nav-access review-workbench
```

## Remaining Boundaries

- Local demo only.
- Landing CTAs route into the local DAM; no production demo booking, public publishing, public URL, fake approval, fake download, or ResourceSpace writeback.
- Issue #68 remains open because local work has not been committed, pushed, or attached to a PR in this pass.
