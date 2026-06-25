# Live Slim Atlas Surface Codemap

Date: 2026-06-24
Status: canonical for `codex/atlas-thin-resourcespace-portal`

## Decision

Slim Atlas is a thin UI portal over ResourceSpace. Live route work should support ResourceSpace-backed library/search, asset usage detail, collections/open albums, requests/review, and upload/intake. ResourceSpace remains the DAM/search/review layer. Google Shared Drive remains master-original custody.

The current code may still reuse `frontend/components/dam/EnterpriseDamPages.tsx` export names while UI/API workers trim the surface. Those implementation names are not product claims.

## Live Canon Routes

- `/` -> Library/search home alias.
- `/library` -> Library/search.
- `/assets/[id]` -> Asset usage detail.
- `/collections` -> ResourceSpace collections/open albums.
- `/collections/[collectionId]` -> Collection/open album detail.
- `/requests` -> User requests and review/support requests.
- `/requests/[requestId]` -> Request detail alias.
- `/review` -> Reviewer queue and evidence workflow.
- `/upload` -> Intake/share photos.

## Non-Canonical Routes

These routes and modules are historical reference or implementation debt for this branch unless a later accepted product doc re-canonicalizes them:

- `/packages`
- `/distribution-sets`
- `/brand-hub`
- `/insights`
- `/admin`
- `/governance`
- broad dashboard, beta readiness, production readiness, command-center, package/distribution, or enterprise DAM replacement surfaces

## Safety Expectations

- Source media is never deleted, renamed, moved, or mutated by the portal.
- Normal user payloads never expose source paths, checksums, private URLs, signed URLs, or original filenames.
- Review writes must update ResourceSpace first and confirm by post-write re-read. Fallback local state is pending work, not truth.
- Approved Public/Internal folders are delivery outputs, not archive truth.

## Guard Focus

`scripts/live-dam-surface-guard.mjs` guards the canonical slim route set plus private-source legacy import quarantine. It should not require packages, dashboards, admin/governance, brand hub, insights, or beta readiness routes as current product truth.
