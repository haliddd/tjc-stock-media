# V2 Archive Workbench Style Contract

Date: 2026-06-18

Status: initial contract for UI-00 to refine.

## Design Read

This app is a church media archive workbench for ministry teammates and DAM reviewers. It should feel quiet, real, operational, and safe. It should not feel like a generic AI SaaS dashboard.

## Core Rules

- Media first. Photos and previews carry the interface.
- One main truth per screen. Do not repeat the same safety boundary in many panels.
- Labels over explainers. Help text only where decisions need context.
- Rows, dividers, and tables before decorative cards.
- Neutral surfaces before teal/blue brand saturation.
- Muted status colors. Safety is clear, not loud.
- Typography uses normal, medium, semibold. `font-black` is rare.
- Default radius is `6px`. No bubble UI.
- Shadows are exceptional. Use borders and spacing first.
- Cards are only for actual selectable media, modal surfaces, or true framed tools.

## Banned Patterns

- gradient hero blocks
- tubelight nav as primary personality
- glowing pills
- pill stacks
- more than one status chip per asset card
- repeated trust/source/beta panels on one screen
- marketing copy in app chrome
- huge dashboard hero panels
- teal/blue startup shell as dominant language
- rounded-full buttons everywhere
- shadow-heavy cards
- uppercase micro-label spam
- giant `font-black` titles
- screenshots that show `Internal Server Error`

## Typography

- Page title: medium/semibold, smaller than V1.
- Section headings: semibold.
- Body and helper text: regular/medium.
- Labels: medium, not uppercase unless table header.
- Numbers: tabular, quiet.
- Avoid using type weight to solve hierarchy. Prefer layout and spacing.

## Color

- Base: neutral archive surface.
- Primary action: one restrained accent.
- Status: muted green / amber / red only when state matters.
- Do not use teal/blue as decorative fill across the product.
- Do not use gradients for brand energy.

## Radius And Shadow

- Default radius: `6px`.
- Media thumbnail radius: `4px`.
- Dialog/shell radius: `8px` max unless existing component requires more.
- No pill buttons as default.
- No decorative card shadows. Use border/divider.

## Library

Target:

- compact search and view controls
- persistent filter rail on desktop
- large media grid or dense list in center
- inspector only when selected
- photo dominates card
- one primary status chip
- one small metadata line
- no badge stacks
- no giant trust panel

## Asset Detail

Target:

- image/preview first
- decision state second
- metadata as clean table
- one action bar
- one source boundary note
- download/review/request gates remain fail-closed

## Review Queue

Target:

- queue list left
- preview and key metadata middle
- evidence form right
- dense rows and dividers
- muted operational status
- no landing-page copy
- reviewer/date/scope/notes requirements preserved

## Admin

Target:

- readiness checklist
- blockers table
- feedback table
- evidence links
- storage/runtime state
- no hero dashboard
- no decorative metric cards
- no hidden blockers

## Copy Rules

Use shorter labels:

- `Needs review` instead of `Needs review before reuse`
- `Download unavailable` instead of long enterprise trust phrasing
- `Review queue` instead of `Review and governance cockpit`
- `Readiness` instead of `Operational readiness dashboard`
- `Draft package` instead of `Beta-safe delivery package`

Keep one boundary note per screen. Do not repeat source/download/AI warnings in every panel.

## Safety Rules

Visual simplification must not weaken:

- `Needs Review / Do Not Publish`
- reviewer/date/scope/notes requirements
- fail-closed downloads
- private/source redaction
- ResourceSpace writeback honesty
- Google Shared Drive original custody
- human rights approval requirement

## Screenshot Acceptance

At 320, 390, 768, and 1440 px:

- no horizontal overflow
- search usable
- filter controls usable
- action bars do not cover content
- review form usable
- admin tables readable or intentionally scrollable
- no status chip wrap soup
- no giant heavy titles
- no `Internal Server Error` screenshots

## AI Tell Removal Evidence

Final evidence must include concrete examples or counts for:

- `font-black` removed or reduced
- rounded-full / pill patterns removed
- gradients removed
- repeated trust/source/beta panels removed
- cards converted to rows, tables, browser panels, or simpler media cards
- copy shortened
- screenshots accepted or rejected

Passing tests is not enough for this pass. If screenshots still look AI-generated, the pass remains partial.
