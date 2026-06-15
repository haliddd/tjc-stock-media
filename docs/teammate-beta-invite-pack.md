# Teammate Beta Invite Pack

Last updated: 2026-06-15

## June 15 Safety Override

Current status: **NO-GO for sending teammate invites.** Use this invite pack as draft copy only until `docs/runs/evidence/2026-06-15/11-friday-readiness-report.md` blockers close and Hali renews approval.

Do not send hosted `?role=` links. Query roles are not authority. Hosted beta must use `/beta-login` or trusted SSO after approval. Current production SSO proof requires Cloudflare Access assertion/email plus mapped groups; local trusted-header shims are not hosted authority.

Use `BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe` for non-mutating hosted checks. Do not run hosted mutation unless `PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1` and `PORTAL_HOSTED_SMOKE_APPROVED_BY` are set.

Use this only after `docs/beta-readiness-command-center.md` marks the Team Beta ops runbook complete again after June 15. This invite pack is for tiny internal Team Beta testing only. Share the stable hosted beta URL, not a deployment-specific Vercel preview URL:

`https://tjc-stock-media.vercel.app`

## Hosted Access Draft

- Primary hosted beta path after approval: `https://tjc-stock-media.vercel.app/beta-login`
- Assigned persona/password comes from beta coordinator only after hosted protection and renewed send approval.

## Role Entry Paths

- Viewer: beta session/SSO -> `/`
- Contributor: beta session/SSO -> `/upload`
- Reviewer: beta session/SSO -> `/review`
- DAM Admin: beta session/SSO -> `/admin`
- Guide: beta session/SSO -> `/guide`

Do not send query-role URLs as hosted access. They are not authority and are not invite links.

## Missions

- Viewer: find `Bible` media, open one asset, and decide whether it is usable for your ministry channel.
- Contributor: submit a harmless intake packet through Upload. Do not upload sensitive, private, unreleased, youth-identifiable, or copyrighted media.
- Reviewer: try to approve a review item without evidence, confirm it blocks, then complete evidence and queue a valid decision.
- DAM Admin: inspect Admin readiness, integration blockers, and Feedback Inbox. Export feedback JSON for agents after testing.

## Safety Copy

- Beta only.
- Tiny internal Team Beta only; do not forward outside the named test group.
- No sensitive, private, unreleased, youth-identifiable, copyrighted, source, or master media uploads.
- Role switch is simulated for QA only.
- Role switch is simulated QA access for beta testing only.
- Role switch is not production auth, not SSO, not real user impersonation, and not permission delegation.
- ResourceSpace writeback is queued/disabled unless explicitly approved.
- Queued review decisions are portal evidence, not ResourceSpace success.
- Original/source media stays restricted; portal downloads must stay behind role and reuse gates.
- Stop testing and notify the triager for any P0 issue.

## Feedback Expectations

Use the in-app Report issue button during Task Mode. Each report should include role, route, task, severity, expected behavior, actual behavior, and screenshot/link when useful.

Severity mapping:

- P0: security, privacy, source-truth, writeback honesty, or unsafe download issue.
- P1: workflow blocked or broken route.
- P2: confusing UX slowing the mission.
- P3: visual polish, wording, or preference.

Stop the test batch for P0 issues. Triage P1 issues before inviting another batch.
