# PRD: Prototype Fidelity Lockdown

Date: 2026-06-25

Parent: prototype fidelity reset after current UI drift

Canonical contract: `docs/ui/prototype-fidelity-lockdown-contract.md`

## Problem

The current UI drifted away from the canonical Archive One / Atlas DAM 10/10 prototype. Safety content and beta honesty were implemented as new visual structures: trust strips, diagnostic cards, enlarged status panels, and altered shell proportions. That is unacceptable for this pass.

The next implementation must return the visual shell to the prototype exactly while keeping safety behavior and copy honest.

## Canonical Inputs

- `/Users/halim4pro/Downloads/atlas_dam_10_10_full_prototype(4).html`
- Ten PNGs from `/Users/halim4pro/Downloads/ChatGPT Image Jun 25, 2026 at 12_57_09 AM (1).png` through `(10).png`

## Product Rule

Prototype fidelity wins over local redesign taste. Do not add a "better" layout unless the prototype shows it.

## Safety Rule

Keep fail-closed behavior, role gates, source redaction, ResourceSpace writeback honesty, and blocked unsafe actions. Express them inside prototype-native controls, rows, disabled states, chips, and drawers.

Do not express safety as new shell structure.

## Issue Slices

1. Contract and audit.
2. Shell reset.
3. Library and Collections fidelity.
4. Asset Detail and Download fidelity.
5. Brand, Governance, Distribution, Settings fidelity.
6. External Portal fidelity.
7. Final visual QA pack.

## Acceptance

- Each slice references the exact prototype PNG(s) it must match.
- Each slice includes screenshot comparison and a fidelity ledger.
- Each slice runs `git diff --check` and `npm --prefix frontend run typecheck`.
- No slice weakens safety behavior.
- No slice adds trust strips, extra diagnostic cards, or non-prototype status slabs.

## Non-Goals

- Hosted beta deployment.
- ResourceSpace writeback.
- Public launch.
- New DAM capabilities beyond matching the prototype.
- New visual concepts.
