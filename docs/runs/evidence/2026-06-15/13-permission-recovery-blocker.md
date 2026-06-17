# Permission Recovery Blocker

Date: 2026-06-16

Lane: isolated proof/evidence lane only.

Worktree intended:

```text
/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run
```

Main checkout:

```text
/Users/halim4pro/Desktop/MVP/tjc-stock-media
```

## Status

Current process cannot read existing files in either the isolated worktree or the main checkout. New files created by this process remain readable, but pre-existing repository files and Git metadata fail with:

```text
Operation not permitted
```

Observed protected metadata:

```text
com.apple.provenance
```

on both:

```text
/Users/halim4pro/Desktop/MVP/tjc-stock-media
/Users/halim4pro/Desktop/MVP/tjc-stock-media-safe-ui-beta-run
```

## Safe Actions Taken

- Rechecked port `4871`: no listener found.
- Rechecked main checkout read-only posture: no content edits attempted.
- Rechecked isolated worktree path: directory exists but old files are unreadable.
- Tried read-only file probes with `/bin/test`, `/bin/cat`, and `git -C`; all old-file/Git probes failed with permission errors.
- Tried non-content metadata repair on isolated worktree and main checkout with `xattr` and `chmod`; both failed with `Operation not permitted`.
- Did not run build, dev server, runtime smokes, browser QA, ResourceSpace writeback, hosted mutation, production deploy, Google Drive mutation, DNS, billing, tester invites, or public launch.

## Commands And Results

| Check | Result |
|---|---|
| `lsof -nP -iTCP:4871 -sTCP:LISTEN` | PASS, no listener |
| `test -r .../tjc-stock-media-safe-ui-beta-run/Makefile` | FAIL, not readable |
| `test -r .../tjc-stock-media-safe-ui-beta-run/scripts/portal-api-smoke.sh` | FAIL, not readable |
| `test -r .../tjc-stock-media/Makefile` | FAIL, not readable |
| `git -C .../tjc-stock-media-safe-ui-beta-run status --short` | FAIL, `Unable to read current working directory: Operation not permitted` |
| `git -C .../tjc-stock-media status --short` | FAIL, `Unable to read current working directory: Operation not permitted` |
| `xattr -c .../tjc-stock-media-safe-ui-beta-run` | FAIL, `Operation not permitted` |
| `chmod -R u+rwX .../tjc-stock-media-safe-ui-beta-run` | FAIL, `Operation not permitted` |

## Decision Impact

Current local proof lane cannot honestly claim fresh launch-readiness, build, smoke, or browser QA results until repo readability is restored or Hali provides a fresh isolated checkout outside the protected path.

Overall verdict remains:

```text
Not beta ready
```

## Safe Recovery Needed

One of these must happen before continuing build/smoke/browser work:

1. Hali restores file access to both repo paths, for example via macOS privacy/full-disk access or removing the provenance restriction outside this agent.
2. Hali provides a fresh isolated clone/worktree path that this agent can read and write.
3. Hali explicitly points this proof lane at another already-isolated checkout that is readable.

Do not use the shared checkout for build/dev/smoke work while sibling sessions remain active.
