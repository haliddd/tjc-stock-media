# Slim Atlas Command Matrix

Status: canonical for `codex/atlas-thin-resourcespace-portal`
Date: 2026-06-24

`launch-readiness`, package smoke, beta packet, dashboard, and command-center checks are historical enterprise gates. They are not canonical for Slim Atlas cleanup.

## Canonical Gates

| Purpose | Command |
| --- | --- |
| Typecheck | `cd frontend && npm run typecheck` |
| Unit tests | `cd frontend && npm test` |
| Production build | `cd frontend && npm run build` |
| Git/media/env hygiene | `make slim-hygiene` |
| Core Four smoke | `make core-four-smoke` |
| Diff hygiene | `git diff --check` |

## Slim Hygiene

`make slim-hygiene` preserves safety boundaries without asserting enterprise product truth:

- live thin portal routes stay mounted;
- API identity, audit, payload, private-source, public-env, and git hygiene guards pass;
- source originals, env, secrets, runtime files, private URLs, signed URLs, source paths, checksums, and original filenames stay out of public/client payloads and Git.

## Core Four Smoke

Run against a local portal server when feasible:

- Library/search and asset detail usage verdicts.
- Collections/open albums, not package/distribution truth.
- Requests/review access and ResourceSpace-first write policy.
- Upload/intake with `Needs Review / Do Not Publish` default.

Use focused smoke evidence over broad beta/production claims. Hosted mutation, production deploy, public publishing, credentials, paid services, source media changes, resets, and force-pushes remain separate approval gates.
