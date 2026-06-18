# TJC DAM Beta Teammate Test Guide

Last updated: 2026-06-15

## Test URL

- Hosted beta URL: `https://tjc-stock-media.vercel.app`
- Draft invite pack: `docs/teammate-beta-invite-pack.md`
- Local QA URL used for latest protected proof: `http://localhost:4871`
- Beta readiness command center: `docs/beta-readiness-command-center.md`
- Read-only hosted probe command: `BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe`
- Hosted mutating smoke is blocked unless `PORTAL_HOSTED_SMOKE_ALLOW_MUTATION=1` and `PORTAL_HOSTED_SMOKE_APPROVED_BY` are set.

This is a beta test deployment, not a production launch. ResourceSpace remains the source of truth. Review decisions may queue as portal pending-write evidence unless live writeback is explicitly enabled. Do not upload sensitive, private, unreleased, youth-identifiable, or copyrighted media for this test round.

Current status: **NO-GO for sending teammate invites.** The June 15 local safety proof is useful, but hosted/canonical/ResourceSpace/Drive/durable/tester approval gates still block teammate send. Do not send hosted `?role=` links; Reviewer/Admin access must come from trusted beta session or trusted SSO, not URL query params.

Use `docs/team-beta-rights-playbook.md` as the rights-state script for Viewer, Contributor, Reviewer, and DAM Admin testing.

## Roles

- Viewer: searches approved media, opens asset details, confirms blocked unsafe downloads.
- Contributor: tests upload/intake clarity without sensitive media.
- Reviewer: tests review queue, evidence checklist, and queued decision truth.
- DAM Admin: tests governance/admin setup clarity.

Use only trusted beta session or trusted SSO for hosted role testing. Current production SSO proof requires Cloudflare Access assertion/email plus mapped groups. Local role switch and local trusted-header shims are simulated QA access only and are not production auth, SSO, real user impersonation, or permission delegation.

## Role Entry Paths

- Viewer: beta session/SSO -> `/`
- Contributor: beta session/SSO -> `/upload`
- Reviewer: beta session/SSO -> `/review`
- DAM Admin: beta session/SSO -> `/admin`
- Guide: beta session/SSO -> `/guide`

Task Mode opens an in-app checklist, quick links, beta limits, and a Report issue button. Reports are stored through `/api/beta-feedback` and visible to DAM Admins in Admin → Feedback Inbox.

## Test Tasks

1. Viewer: search for `Bible`, open an asset, and decide whether the page clearly says if you can use it.
2. Viewer: open a Needs Review or blocked asset and try an unsafe download path; confirm the app blocks or explains the download gate.
3. Viewer: open Insights and click common use-case cards. Confirm they route to useful library searches.
4. Contributor: open Upload and step through the packet using only harmless sample files.
5. Contributor: inspect Collections and Package Builder. Confirm ResourceSpace references are clear and originals are not copied.
6. Reviewer: open Review Queue, switch queue tabs, and change rows per page.
7. Reviewer: try Approve without completing evidence and a note. Confirm it stays blocked.
8. Reviewer: complete evidence and note, queue a decision, and confirm the message says queued/synced/blocked honestly.
9. DAM Admin: open Admin modules and verify each module heading/content changes.
10. Any role: test Brand Hub actions, Help Guide clarity, and one mobile pass around 390px width.

## Search Quality Tasks

Run these as Viewer first, then repeat any confusing cases as Reviewer. Grade each task as pass, partial, or fail in the issue report.

1. Search `scripture`, then `Bible`. Confirm both return similar useful results and the asset detail stays honest about reuse.
2. Search `sermon slides`, `website hero`, and `newsletter`. Confirm each returns a useful set or explains why metadata/review is missing.
3. Search `fellowship`, `baptism`, and `communion`. Confirm sensitive or sacrament-related results do not imply public reuse without reviewer evidence.
4. Search `children`, `youth`, `no people`, and `people unknown`. Confirm children/youth routes toward review and unknown/no-people states are not treated as public-safe.
5. Search an event/date/person phrase you expect from church memory. Confirm zero-result help suggests saved views, broader ministry terms, or review request instead of sounding empty or broken.
6. Apply `Approved public`, `No people`, `Landscape`, and `Portal ready` filters where available. Confirm counts, empty states, and download gates stay consistent.

Search beta success target:

- 90% of seeded use-case searches produce either useful results or useful recovery guidance.
- 0 unsafe downloads from search results.
- 0 cases where unknown people/minors, unknown rights, or missing reviewer/date reads as public-safe.
- 80% of testers can find one usable approved asset or understand why none is ready in under 3 minutes.
- Every failed search report includes query, role, expected asset/use case, actual count, and whether suggested filters helped.

## TJC-Native Search Smoke Appendix

Grounding: `/Users/halim4pro/Downloads/deep-research-report.md` identifies native TJC language and risk gates for Sabbath Service, Religious Education/RE, Evangelical Service, Testimony, Hymns of Praise, doctrine/sacrament themes, church/region/language hierarchy, reuse tiers, minors, and hymn rights.

Run these probes as Viewer, then repeat failed or confusing probes as Reviewer.

| Probe | Expected honest behavior | Failure threshold |
|---|---|---|
| `Sabbath Service` | Matches worship/service media or gives a saved-view/taxonomy recovery path. Does not treat generic weekend media as TJC-safe. | P1 if no recovery guidance. P0 if non-Sabbath content appears public-safe without review. |
| `Religious Education`, `RE` | `RE` behaves as an alias for Religious Education and flags minors/class context as restricted until consent is clear. | P1 if alias misses. P0 if RE/minor media can be downloaded publicly without consent/review. |
| `Evangelical Service` | Finds evangelism/service assets or routes to evangelism/public collection guidance. | P2 if only generic campaign language appears. P1 if zero state gives no TJC-native recovery. |
| `Testimony` | Results show pastoral/context caution and avoid broad stock-safe reuse unless explicitly approved. | P0 if sensitive testimony is presented as stock-safe. P1 if no pastoral-sensitivity cue. |
| `Hymns of Praise`, `hymn rights`, `projection-ready` | Music/hymn results require channel, territory, and notice clarity before public/livestream/projection use. | P0 if hymn download/export appears cleared without rights basis. P1 if rights state is invisible. |
| `baptism` | Routes to doctrine/sacrament review when approval is not explicit. | P0 if baptism media reads stock-safe without doctrine review. |
| `Holy Spirit`, `speaking in tongues` | Terms cross-link and keep prayer-in-the-Spirit clips context-safe unless senior review clears public reuse. | P1 if aliases do not connect. P0 if casual public reuse is implied. |
| `footwashing`, `Holy Communion` | Shows sacrament-sensitive handling, not generic symbolism. | P0 if stock-safe/public-safe is implied without doctrine review. |
| `church`, `region`, `language`, plus one real local church or language phrase | Results or facets separate church, region/country, and language instead of mixing them as loose keywords. | P1 if church/region/language are indistinguishable. P2 if recovery copy is generic. |
| `stock-safe`, `context-safe`, `archive-only` | Reuse tier language is clear; archive-only never looks like reusable stock. | P0 if archive-only can be downloaded as approved reuse. P1 if tiers are unclear. |
| `children`, `youth`, `minors`, `RE class` | Results default to review/restricted states unless consent and usage scope are explicit. | P0 if public download is allowed for unresolved minors. |
| `choir`, `livestream`, `hymn 470`, `hymn 525` | Hymn/channel probes require rights steward or reviewer clearance for livestream/choir use. | P0 if channel-specific hymn rights are bypassed. |

## Known Limits

- Deployment-specific Vercel preview URLs may require Vercel login. Do not share `https://tjc-stock-media.vercel.app` for teammate testing until hosted/canonical/custody/durable gates close and Hali renews approval.
- ResourceSpace writeback should remain queued/disabled unless explicitly approved.
- Hosted beta env should keep `BETA_FEEDBACK_ENABLED` and `BETA_TASK_MODE_ENABLED` enabled, either by omitting them or setting each to `1`; setting either to `0` disables that beta feature.
- Hosted beta env should include `RESOURCESPACE_ENABLE_WRITEBACK=0` and `RESOURCESPACE_WRITEBACK_MODE=queued` unless live ResourceSpace writeback has explicit approval and proof.
- Keep `DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0` for this preview-only hosted batch. If approved-copy download testing is added before SSO, set it to `1` only as a recorded temporary Team Beta exception.
- Vercel KV/Blob env comes from Vercel storage integrations; local development falls back to `data/runtime/beta-feedback.json`.
- Package drafts, saved views, and favorites are local beta affordances unless backend storage is connected. Invite copy remains draft-only; hosted invite links are not sent while current NO-GO blockers remain open.
- SSO is not live; beta role switch simulates access.
- Current seed has zero portal-ready/downloadable assets, so Team Beta is preview-only workflow testing until a rights reviewer approves reusable seed media.
- Static S3-only hosting is not enough for this app because Next API routes are required.

## Feedback Format

Use the in-app Report issue button during Task Mode. Use `docs/teammate-feedback-template.md` only if the app is unavailable. Include role, route, device, expected behavior, actual behavior, screenshot, and severity.

Severity labels:

- P0: security, privacy, source-truth, writeback honesty, or download gate issue.
- P1: workflow blocked or broken route.
- P2: confusing UX that slows testing.
- P3: visual polish or wording preference.

Triage rule: fix all P0 before continuing testing. Fix P1 or document as a known limit. Batch P2/P3 for post-test cleanup unless they affect core test tasks.
