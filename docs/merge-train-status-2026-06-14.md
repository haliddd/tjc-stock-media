# Merge Train Status - 2026-06-14

Generated during the 24h enterprise DAM autonomous run.

Actual inspection timestamp: 2026-06-13 09:36 EDT
Repository inspected: `Hali0321/tjc-stock-media`
Local remotes present:
- `origin` -> `https://github.com/Hali0321/tjc-stock-media.git`
- `haliddd` -> `https://github.com/haliddd/tjc-stock-media.git`

Push and PR mutation are blocked until a human confirms which remote is the
active target. This document is read-only inventory and merge-order guidance.

## Summary

`Hali0321/tjc-stock-media` has PRs #6-#14 open and mergeable. `haliddd/tjc-stock-media`
has only older merged PRs visible from the current inventory.

The open PR train is safety-first and mostly already QA-reported. Do not merge
automatically. Do not deploy. Do not run hosted mutating smokes.

## PR Train

| PR | Title | Branch | Base | Type | Mergeable | Dependencies | QA reported | Missing before merge | Risk | Disposition |
|---:|---|---|---|---|---|---|---|---|---|---|
| #6 | Launch hardening docs and enterprise DAM runbooks | `docs/weekend-enterprise-dam-runbooks` | `main` | docs/runbooks | mergeable | none | diff check, hygiene, private-source, public-env, launch-readiness with clean-worktree local warnings | Human review; confirm broad diff is expected against old `main` | medium because GitHub file diff exceeds 300 files even though PR body scopes docs | Merge first after human approval |
| #7 | Harden beta login throttling | `security/beta-login-throttling` | `main` | auth/security code | mergeable | #6 preferred first | focused beta-auth tests 6/6, typecheck, tests 44/44, build, guards, launch-readiness | Human security review; confirm process-local throttle tradeoff | medium | Merge after #6 |
| #8 | Fail closed on hosted feedback durability and attachment risk | `hardening/feedback-durability-attachments` | `main` | feedback/storage safety | mergeable | #6/#7 preferred first | focused tests 4/4, typecheck, tests 45/45, build, guards, launch-readiness, local feedback smoke | Human review; no hosted mutating smoke without approval | medium | Merge after #7 |
| #9 | Gate fixture data and enforce photo-only beta scope | `hardening/truth-scope-fixture-photo-only` | `main` | source truth/photo-only hardening | mergeable | #6-#8 preferred first | focused tests 7/7, typecheck, tests 43/43, build, guards, tag-search smoke, launch-readiness, local API and download-ticket smokes | Human review; confirm Viewer/Contributor photo-only behavior is intended | high because it touches catalog/API/download/source boundaries | Merge before #11 |
| #10 | Harden media delivery and preview proxy boundaries | `hardening/media-delivery-preview-proxy` | `main` | delivery safety | mergeable | #9 preferred before or close review with #9 | media-delivery tests, typecheck, tests 44, build, guards, launch-readiness, local download-ticket and delivery smokes | Human review; conflict check with #9 and #11 | high because download/media delivery gates are critical | Merge after #9 or after #11 if conflict review says so |
| #11 | Add normal-role redaction crawler | `qa/redaction-crawler` | `hardening/truth-scope-fixture-photo-only` | QA/redaction + small fixes | mergeable | #9 | crawler syntax, focused tests 9, local crawler 27 routes, typecheck, tests 45, build, guards, launch-readiness | Retarget to `main` after #9 lands, or merge stacked after #9 | medium-high because it intentionally changes redaction behavior found by crawler | Merge after #9 |
| #12 | Add governed tagging taxonomy foundation | `feature/governed-tagging-taxonomy-foundation` | `main` | taxonomy foundation | mergeable | #6 preferred first | focused tests 4, typecheck, tests 45, build, guards, launch-readiness | Human product/security review before later UI wiring | low-medium because helper is foundation-only | Merge after safety PRs or in parallel after #6 |
| #13 | Add safe smart-rules dry run | `feature/smart-rules-dry-run` | `feature/governed-tagging-taxonomy-foundation` | smart rules foundation | mergeable | #12 | focused tests 2, typecheck, tests 47, build, guards, launch-readiness | Retarget to `main` after #12 lands; human approval before later worklist/UI routing | medium because smart rules must remain routing-only | Merge after #12 |
| #14 | Photo-only ResourceSpace hosting readiness plan | `infra/photo-only-resourcespace-readiness` | `main` | runbook/script evidence | mergeable | #6 preferred first | script syntax, dry-run command, diff check, private-source, public-env, hygiene, launch-readiness | Human review; no actual env/infra/resource changes | low-medium | Merge after #13 or before premium UI if docs/scripts only |

## Recommended Merge Order

1. #6 docs/runbooks/report.
2. #7 security throttling.
3. #8 feedback durability.
4. #9 truth/photo-only.
5. #11 redaction crawler after #9.
6. #10 media delivery after #9/#11 conflict review.
7. #12 taxonomy foundation.
8. #13 smart-rules dry run after #12.
9. #14 ResourceSpace readiness.
10. Premium UI branch after safety branches settle and full browser QA reruns.

## Retarget Notes

- #11 is stacked on `hardening/truth-scope-fixture-photo-only`; retarget to
  `main` after #9 merges or merge it immediately after #9.
- #13 is stacked on `feature/governed-tagging-taxonomy-foundation`; retarget to
  `main` after #12 merges or merge it immediately after #12.
- Premium UI is not represented as an open PR in the inspected `Hali0321` repo.
  Treat `premium-ui/tjc-enterprise-dam-workbench` as hold until the safety train
  is settled.

## Observed Branch State

Local branch tips of interest:

| Branch | Tip | Note |
|---|---|---|
| `docs/weekend-enterprise-dam-runbooks` | `419be04` | PR #6 |
| `security/beta-login-throttling` | `09c31f4` | PR #7 |
| `hardening/feedback-durability-attachments` | `eb7a1a2` | PR #8 |
| `hardening/truth-scope-fixture-photo-only` | `7383b3f` | PR #9 |
| `hardening/media-delivery-preview-proxy` | `77abe99` | PR #10 |
| `qa/redaction-crawler` | `b8d9b75` | PR #11 |
| `feature/governed-tagging-taxonomy-foundation` | `3811d94` | PR #12 |
| `feature/smart-rules-dry-run` | `edd0204` | PR #13 |
| `infra/photo-only-resourcespace-readiness` | `893f763` | PR #14 |
| `premium-ui/tjc-enterprise-dam-workbench` | `89198ac` | Hold for later integration |

## Integration Risk Notes

- The GitHub diff API reported "diff exceeded maximum number of files" for
  #6, #7, #8, #9, #10, #12, and #14. This is because these branches carry broad
  accumulated history relative to old `main`. Use branch topology, PR bodies,
  and local simulation, not the raw GitHub file diff alone.
- #9/#10/#11 overlap around source truth, redaction, and delivery safety. Source
  truth, RBAC, redaction, and blocked download gates win any conflict.
- #12/#13 must preserve the rule that tags, AI suggestions, and smart rules do
  not approve, mark Portal Ready, enable downloads, or write ResourceSpace.
- Premium UI must not hide blockers or add public share/original delivery
  behavior.

## Human Gates

- Merge approval for every PR.
- Hosted mutating smoke approval.
- Remote target confirmation before push or PR mutation.
- Production SSO/origin protection choice.
- Durable storage adapter choice.
- Live ResourceSpace writeback staging approval.
- Any Vercel, Upstash, Blob, Cloudflare, Google Drive, ResourceSpace production,
  or billing change.
