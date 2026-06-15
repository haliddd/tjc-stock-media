# Senior Staff UI/UX Audit: Enterprise DAM Hardening

Date: 2026-06-15

Scope: screenshot review across Help Center, Library, Collections, Distribution Set Draft, Send Media for Review, Review Inbox, and Governance/Admin in 320, 390, and desktop layouts.

North star: True Jesus Church users should be able to find, trust, request, or review ministry media without mistaking demo state, collection membership, or raw ResourceSpace status for final reuse permission.

## Executive summary

The product already has the right enterprise DAM concepts: ResourceSpace truth, portal-ready gates, role-aware surfaces, review queues, governed collections, and source/original restrictions. The screenshots still exposed prototype-level presentation issues: inconsistent page density, duplicated controls, overly long mobile flows, empty-state dead ends, and governance content that read as a report rather than an operations console.

A final CSS hardening layer was added after the existing enterprise CSS. It unifies tokens, app shell, cards, CTAs, status colors, grids, empty states, and mobile order without changing data contracts, RBAC, ResourceSpace writeback behavior, or download gates.

## P0 product and trust issues

1. **Library default shows zero assets.** The Library screenshots show no visible assets even though the DAM should have ResourceSpace-backed records or a clear data-source fallback. This must be treated as a data/default-filter issue, not just an empty state. Default Library should either show role-safe recent records or explain exactly why the source is unavailable.

2. **Collection approval can be misread as asset approval.** Collection rows show approved states while the detail panel says zero ready references. Enterprise copy must keep repeating: collection/package approval never overrides asset-level rights, consent, people/minors, source, and derivative gates.

3. **Review mobile buries the current asset.** The mobile Review flow shows queue/navigation before the active record and evidence. Reviewer workflow should prioritize current item, next required evidence, sticky decision actions, then queue context.

4. **Governance reads as beta/reporting.** `Beta No-Go` is accurate but too prototype-coded for enterprise users. It should be styled and framed as `Production readiness: Blocked` or `Launch readiness: Blocked` with evidence and next action.

5. **Empty states lack operational recovery.** Library, Distribution Set Draft, and Collections empty states need actionable recovery: reset filters, check ResourceSpace source, add approved references, or open review queue.

## P1 usability bugs

- Sidebar labels and route names are inconsistent with the role model. Preferred IA: `Find and Use`, `Collections`, `Distribution Sets`, `Send media for review`, `Review Inbox`, `Requests`, `Governance`, `Metadata Health`, `Policy`.
- Mobile pages are too long because secondary reference panels are stacked above the action path.
- Desktop grids leave large gray empty regions on Library, Collections, and Distribution Set Draft.
- The Library intent explainer exposes implementation logic instead of user-facing saved views.
- Search placeholders truncate on 320 and 390 px widths.
- Buttons and chips have inconsistent radii, heights, and emphasis.
- Red/warning styles are used too often; serious blockers should be red, missing evidence should be amber.
- Some review status labels truncate, making approval state ambiguous.
- Disabled actions do not always explain the unlock requirement nearby.
- Right rails are sometimes too wide and compete with the primary work area.

## Redesign decisions implemented

### Enterprise visual system

- Navy shell, teal active states, white surfaces, soft blue-gray background.
- Calm green for approved/ready, amber for missing evidence/review, red for blocked/critical only.
- Unified card radius, borders, shadows, focus states, and button sizing.
- Added missing alias tokens used by existing CSS, including `--ed-green`, `--ed-orange`, `--ed-red`, `--ed-info`, and `--ed-surface`.

### Shell and navigation

- Desktop rail widened to 216 px for enterprise labels.
- Active navigation now has a clear teal left rule and calmer background.
- Header search receives consistent focus treatment.
- Content width and app shell offsets are normalized at desktop sizes.

### Library

- Rebalanced facet/results/inspector grid.
- Reduced empty-state height so the page no longer becomes a blank canvas.
- Removed secondary zero-result pagination from the visual layer.
- Saved-view/intent chips styled as enterprise filters rather than prototype algorithm output.

### Review Inbox

- Restored a proper three-column reviewer station at desktop.
- Prevented the right rail from dropping below too early.
- On tablet/mobile, current asset canvas now appears before queue list.
- Re-enabled critical detail/preview/check sections that earlier mobile CSS hid.
- Sticky decision/footer treatment is calmer and clearer.

### Send media for review

- Reduced hero height and made the intake path visible earlier.
- Kept summary/packet needs sticky on desktop.
- Standardized category cards, form cards, focus states, and action sizing.

### Collections and Distribution Sets

- Standardized draft/package surfaces and reference empty states.
- Reduced excessive empty-canvas height.
- Reinforced the pattern that distribution set actions remain blocked until approved references exist.

### Governance/Admin

- Rebalanced left navigation, main content, and right rail.
- Governance queues and launch evidence now use calmer enterprise blocking styles.
- Tables and stats receive more consistent density.
- Admin mobile collapses into one-column operational sections with better touch targets.

### Help Center

- Help Center gets the same enterprise surface language as the rest of the DAM.
- Review request card becomes sticky on desktop.
- Safe-copy guidance is visually promoted without looking like a marketing banner.

## QA checklist for next run

Run these after pulling the new commits:

```bash
cd frontend
npm run check
npm run dev
```

Then capture and compare:

- `/` Library at 320, 390, 768, 1280, 1440.
- `/help` Help Center at 320, 390, desktop.
- `/upload` or Send media route at 320, 390, desktop.
- `/review` Review Inbox at 320, 390, desktop.
- `/collections` Collections at 320, 390, desktop.
- `/packages` or Distribution Sets at 320, desktop.
- `/admin` Governance at 320, 390, desktop.

Pass criteria:

- No horizontal scroll at 320 px.
- First mobile viewport shows the page title and next meaningful action.
- Library default never looks broken; it either shows role-safe assets or an operational recovery message.
- Collection/package approval copy cannot be mistaken for item-level reuse permission.
- Reviewer can see current asset, next evidence, and primary decision without hunting through queue taxonomy first.
- All disabled actions state the unlock condition within the same card or adjacent rail.
