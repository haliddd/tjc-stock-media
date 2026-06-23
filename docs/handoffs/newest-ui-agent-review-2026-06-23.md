# Newest UI Agent Review Handoff

Branch: `codex/prototype-polish-actions-2026-06-23`

Focus: review latest prototype UI and team-beta local readiness changes only. Do not start redesign churn.

## What Changed

- Library controls now perform real local actions:
  - Saved views apply catalog view filters.
  - Filter icon opens catalog suggested filters.
  - Download uses existing safe download gate.
  - Share/Add to collection show truthful gated beta status.
  - More exports role-safe metadata CSV and shows selection action status.
- Imported LM Photos album memberships now appear as portal collections.
- Collections page can switch between imported album-backed collections.
- Sidebar collapse button now works.
- Brand Kits route no longer redirects to Help Center; it uses prototype visual system.
- Beta tooling is quieter:
  - Floating task panel removed.
  - Bottom-right button is now `Report Issues`.
  - Bug icon removed.
- Admin local access is working through beta auth on `http://localhost:4885/admin?role=DAM%20Admin`.
- Local beta startup script added: `scripts/portal-team-beta-local.sh`.

## Safety Notes

- ResourceSpace/exported catalog remains source of truth.
- Source/original download gates remain preserved.
- Query role is not trusted in beta-session mode.
- Upload API contract is unchanged for Contributor-facing public response; beta boundary internals are redacted from Contributor response.
- No media files committed.
- No secrets committed.

## Validate Later Before Team Link

Hali asked not to run full QA now. Before sending beta link:

```bash
cd frontend
npm run typecheck
npm run build
npm run test
```

Also run browser smoke on:

- `/library?role=Viewer`
- `/collections?role=Viewer`
- `/upload?role=Contributor`
- `/review?role=Reviewer`
- `/admin?role=DAM%20Admin`

Check:

- no horizontal overflow
- no console/page errors
- ResourceSpace thumbnails/photo-first cards still render
- safe download/source restriction messages remain visible
- bottom-right `Report Issues` submits feedback
- album-backed collections show imported album membership
