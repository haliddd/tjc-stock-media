# Team Beta Hosted Access Proof

Last updated: 2026-06-11

Scope: Hosted Env + Private Access Proof lane for the TJC Stock Media Team Beta internal test round.

This proof packet is for owner signoff before teammate invites. It does not approve production launch, public publishing, live ResourceSpace writeback, source media mutation, hosted env changes, deploys, or external account changes.

## Required Hosted Beta Settings

The hosted beta must use these settings for the first internal Team Beta batch:

```bash
RESOURCESPACE_ENABLE_WRITEBACK=0
RESOURCESPACE_WRITEBACK_MODE=queued
BETA_FEEDBACK_ENABLED=1
BETA_TASK_MODE_ENABLED=1
DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0
```

Required interpretation:

- ResourceSpace review decisions may be stored as portal pending-write evidence only.
- The app must not claim a review decision was synced to ResourceSpace unless live writeback has separate explicit approval and proof.
- Feedback and Task Mode must stay enabled for beta testers.
- Approved-copy downloads remain out of scope for this preview-only batch because current seed evidence shows zero portal-ready/downloadable assets.

Code/config evidence:

- `.env.example` and `.env.production.example` include the required beta defaults.
- `frontend/lib/env.ts` only enables live ResourceSpace writeback when `RESOURCESPACE_ENABLE_WRITEBACK === "1"` and `RESOURCESPACE_WRITEBACK_MODE === "live"`.
- `frontend/lib/env.ts` keeps feedback and Task Mode enabled unless the matching env var is set to `0`.
- `frontend/lib/env.ts` only allows demo-role download bypass when `DOWNLOAD_GATE_ALLOW_DEMO_ROLES === "1"`.
- No repo-level `vercel.json` or `.vercel` project config file was found in this worktree during read-only inspection.

## Private URL Policy

Current status: **NO-GO for sharing teammate invite links.** After hosted/canonical/custody/durable gates close and Hali renews approval, use only the owner-approved stable beta URL:

```text
https://tjc-stock-media.vercel.app
```

Do not share deployment-specific Vercel preview URLs. Preview URLs may require Vercel login and should not become tester-facing links. Do not share the stable URL with teammates until the current NO-GO blockers close.

Tester roster policy:

- Invite only named internal Team Beta testers.
- Assign each tester one intended role, then have them enter through trusted beta session or trusted SSO role identity. Current production SSO proof means Cloudflare Access assertion/email plus mapped groups; generic trusted-header shims are local rehearsal only. Do not use role query links as access control.
- Tell testers not to forward links outside the named group.
- Keep the beta role switch framed as QA-only, not production auth.
- Do not invite the next batch until the owner reviews feedback triage and P0/P1 status.

## Hosted Smoke Safety Decision

Do not run mutating hosted smoke as read-only proof without owner approval.

Reason: `scripts/portal-hosted-smoke.sh` posts a new record to `/api/beta-feedback`. That mutates hosted feedback storage.

Do not run `BASE_URL=https://tjc-stock-media.vercel.app make portal-writeback-guard-smoke` without owner approval.

Reason: `scripts/portal-writeback-guard-smoke.sh` posts review decisions to `/api/review`. On a correctly configured hosted beta this should queue pending-write evidence, but it is still hosted data mutation.

Safe read-only checks for owner or tech operator:

```bash
curl -I https://tjc-stock-media.vercel.app/
curl -I "https://tjc-stock-media.vercel.app/beta-login"
BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe
```

Do not paste secrets or full env dumps into proof notes. Keep only the hosted read-only probe summary, not raw headers, raw bodies, or secret-bearing artifacts.

## Manual Proof Checklist

Owner-visible hosted checks:

- Stable URL opens without Vercel login: `https://tjc-stock-media.vercel.app`.
- Beta login opens when beta auth is enabled: `/beta-login`.
- Viewer enters through trusted beta session/SSO and opens `/`.
- Contributor enters through trusted beta session/SSO and opens `/upload`.
- Reviewer enters through trusted beta session/SSO and opens `/review`.
- DAM Admin enters through trusted beta session/SSO and opens `/admin`.
- Guide opens through trusted beta session/SSO at `/guide`.
- Query role URLs are not used as hosted authority.
- Task Mode panel is visible only through the approved beta session/task flow.
- Report issue button is visible.
- Beta copy says role switch is simulated for QA only.
- Beta copy says no live ResourceSpace writeback and queued review is not ResourceSpace success.
- Viewer unsafe download path remains blocked.
- Reviewer incomplete approval remains blocked.
- Reviewer complete decision, if owner chooses to test it, says queued or pending-write rather than synced ResourceSpace success.
- DAM Admin readiness does not mark ResourceSpace review writeback as live or operational.
- No source path, master drive path, checksum, original file URL, signed URL, or secret-like token appears in normal Viewer payloads or UI.

Hosted env proof owner must capture outside repo:

- Screenshot or copied setting names from Vercel Environment Variables, with values redacted except allowed non-secret values.
- Confirm exact values:
  - `RESOURCESPACE_ENABLE_WRITEBACK=0`
  - `RESOURCESPACE_WRITEBACK_MODE=queued`
  - `BETA_FEEDBACK_ENABLED=1`
  - `BETA_TASK_MODE_ENABLED=1`
  - `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0`
- Confirm no `NEXT_PUBLIC_` secret env vars are used for ResourceSpace API credentials, storage tokens, or writeback config.
- Confirm stable alias is the only URL in the invite pack.
- Confirm tester roster is named and internal only.

## Fail Conditions

Stop invites if any condition is true:

- Hosted env has `RESOURCESPACE_ENABLE_WRITEBACK=1` or `RESOURCESPACE_WRITEBACK_MODE=live`.
- App claims live ResourceSpace success for review decisions without separate approved live-writeback proof.
- `BETA_FEEDBACK_ENABLED=0` or Report issue is hidden for trusted beta session/SSO testers.
- `BETA_TASK_MODE_ENABLED=0` or Task Mode is hidden for trusted beta session/SSO testers.
- `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=1` for preview-only beta without a recorded temporary exception.
- Teammate invite uses a Vercel preview URL instead of `https://tjc-stock-media.vercel.app`.
- Tester roster is not named or links are forwarded outside internal Team Beta.
- Viewer can download unsafe, needs-review, source, original, or non-portal-ready media.
- Normal Viewer UI or API payload exposes source paths, master drive paths, checksums, original URLs, signed URLs, or secret-like tokens.
- Rights/media reviewer has not approved preview-only seed visibility or seed has not been scrubbed.

## Smallest Human Owner Action

Name one deployment/env owner and have them perform a Vercel env read-only signoff:

```text
I confirmed the hosted beta env for https://tjc-stock-media.vercel.app on 2026-06-11:
RESOURCESPACE_ENABLE_WRITEBACK=0
RESOURCESPACE_WRITEBACK_MODE=queued
BETA_FEEDBACK_ENABLED=1
BETA_TASK_MODE_ENABLED=1
DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0
Only the stable unlisted URL will be shared with named internal Team Beta testers. No preview URLs will be shared. Live ResourceSpace writeback is not approved for this batch.
Owner:
Timestamp:
```

After that, the remaining invite blockers are the seed/media safety reviewer signoff and access/private URL coordinator signoff recorded in `docs/beta-readiness-command-center.md`.
