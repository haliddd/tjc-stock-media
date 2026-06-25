# Slim Atlas ResourceSpace Portal

Status: canonical for `codex/atlas-thin-resourcespace-portal`
Date: 2026-06-24

Slim Atlas is a thin church-user portal over ResourceSpace. ResourceSpace remains the DAM/search/review layer and source of truth for asset records, metadata, collections/open albums, review status, permissions, upload/import, and supported audit activity. Google Shared Drive remains master-original custody. Approved Public/Internal folders are delivery outputs, not the complete archive.

## Canon Product Surface

- `/library` and `/` for ResourceSpace-backed search/browse.
- `/assets/[id]` for asset usage, rights, approved-copy, and next-action detail.
- `/collections` for ResourceSpace collections/open albums. Atlas must not create package/distribution truth.
- `/requests` and `/review` for user requests, reviewer evidence, and confirmed ResourceSpace-first review writes.
- `/upload` for intake. Every imported asset defaults to `Needs Review / Do Not Publish`.

## Non-Canonical Reference

Enterprise DAM replacement docs, beta packets, command-center dashboards, package/distribution set designs, governance/admin console surfaces, and production/beta readiness reports are historical reference only unless a later accepted doc explicitly re-canonicalizes them.

## Safety Rules

- Do not delete, rename, move, or mutate source media.
- Do not commit media, env files, runtime state, secrets, private URLs, signed URLs, source paths, checksums, or original filenames.
- ResourceSpace writes must be ResourceSpace-first and confirmed by post-write re-read. If confirmation fails, return queued, failed, or conflict state without claiming success.
- Local state may support pending work only. It is not product truth.
- Do not claim beta-ready or production-ready from local-only evidence.

## Start Commands

Use `docs/command-matrix.md` for current gates. `make launch-readiness` is not the canonical slim-branch gate; use typecheck, tests, build, hygiene guards, and Core Four smoke instead.
