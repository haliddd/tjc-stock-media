# Team Beta Seed Media Signoff Packet

Last updated: 2026-06-11

Purpose: give a human rights/media reviewer a short packet to decide whether the current beta seed is safe for **preview-only Team Beta visibility**. This does not approve public launch, public reuse, internal reuse, downloads, production SSO, live ResourceSpace writeback, source media mutation, or any final rights decision.

## Decision Needed

Human reviewer must choose one:

| Choice | Meaning | Team Beta effect |
|---|---|---|
| Sign preview-only visibility | Reviewer accepts that the 181 Viewer-visible seed records can be shown to named internal beta testers as previews only. | Seed/media invite gate can close for preview-only testing. Downloads and reuse remain blocked. |
| Hold and scrub/hide | Reviewer does not accept current visible seed scope. | Do not send teammate invites until export/visibility is changed and rechecked. |

Do not mark this gate complete without reviewer name, timestamp, and sample searches checked.

## Evidence Snapshot

Evidence source: `/Users/halim4pro/Desktop/MVP/tjc-stock-media/.runtime/exports/resourcespace-metadata-20260604-193852.csv`

Worktree note: current Codex worktree does not contain `.runtime`; the CSV was inspected read-only from the main project checkout.

Mechanical counts:

| Count | Result |
|---|---:|
| Total normalized records | 2,290 |
| Viewer-visible records (`Approved Public`) | 181 |
| Non-Viewer-visible records (`Needs Review`) | 2,109 |
| Portal-ready/downloadable records | 0 |
| Viewer-visible records still blocked before download/reuse | 181 |
| Records requiring human review before portal-ready use | 2,290 |
| Viewer-visible obvious sensitive/sacrament/youth/private/unreleased text flags | 0 |
| Viewer-visible rights/copyright-review flags | 181 |

Current exact visible/downloadable status:

- Viewer can see 181 `Approved Public` records.
- Viewer cannot safely reuse or download any seed asset.
- All 181 Viewer-visible records are preview-only because people/minors, rights/consent, and approved-copy evidence are incomplete.
- Current seed supports workflow testing only: search, inspect trust state, request/report, blocked unsafe download, reviewer evidence lock, and admin readiness.

Visible blocker counts from policy mirror:

| Blocker on Viewer-visible records | Count |
|---|---:|
| People/minors unknown | 181 |
| Rights/consent unclear | 181 |
| Approved derivatives missing | 181 |

Latest local beta rehearsal evidence:

| Check | Result |
|---|---|
| Run | `20260611T182011Z-71517` |
| Viewer search finds results | Pass |
| Viewer opens asset trust record | Pass |
| Viewer download stays blocked | Pass, `403` |
| Viewer cannot review | Pass, `403` |
| Reviewer incomplete approval blocks | Pass, `400` |
| Reviewer complete decision is honest queued/pending-write behavior | Pass, `202` |
| DAM Admin readiness opens | Pass |

## Sample Searches To Run

Run as Viewer through trusted beta session/SSO at `https://tjc-stock-media.vercel.app/`, then repeat confusing cases as Reviewer through trusted beta session/SSO.

| Search | Expected reviewer check |
|---|---|
| `Bible` | Results may appear. Open at least three. Each must read as preview-only/review-needed unless evidence is complete; no download should succeed. |
| `scripture` | Should behave consistently with `Bible`; no record may appear portal-ready/downloadable. |
| `Sabbath Service` | Doctrine/worship context must not read as generic stock-safe. Zero-result recovery is acceptable if honest. |
| `Religious Education`, `RE`, `children`, `youth`, `minors`, `RE class` | Minors/RE content must default restricted until consent/review is clear. No public download. |
| `baptism`, `Holy Spirit`, `speaking in tongues`, `footwashing`, `Holy Communion` | Sacrament/doctrine content must require reviewer evidence before public/internal reuse. |
| `Testimony` | Pastoral/private testimony content must not become stock-safe without sensitivity review. |
| `Hymns of Praise`, `hymn rights`, `projection-ready`, `choir`, `livestream`, `hymn 470`, `hymn 525` | Music/hymn content must require channel, territory, rights basis, and notice review before public/livestream use. |
| `stock-safe`, `context-safe`, `archive-only` | Reuse-tier wording must be understandable; archive-only must never look downloadable. |

Minimum reviewer sampling:

- Run `Bible` and `scripture`.
- Run at least one doctrine/sacrament search.
- Run at least one RE/minors search.
- Run at least one hymn/music search.
- Run at least one testimony/pastoral search.
- Open at least 10 Viewer-visible records total, including any record that looks people-facing, worship-facing, or ministry-sensitive.
- Try one blocked download path and confirm `403` or blocked UI copy.

## Research-Derived Sensitive Categories

These categories come from `/Users/halim4pro/Downloads/deep-research-report.md` and are summarized in `docs/team-beta-research-synthesis.md`, `docs/team-beta-rights-playbook.md`, and `docs/team-beta-qa-matrix.md`.

| Category | Reviewer rule |
|---|---|
| Doctrine/sacrament | Baptism, Holy Spirit, footwashing, Holy Communion, Sabbath, prayer in the Spirit, and church-identity assets need doctrine/sacrament review before broad reuse. |
| Worship decorum | Worship service, prayer, sermon, sacrament, and Sabbath media need context review before public/social reuse. |
| Hymn/music/channel rights | Hymns, choir, accompaniment, lyric slides, livestream, projection, and public video need rights basis, territory, approved channels, and required notice. |
| Hymn 470-525 caution | Do not treat this range as automatically livestream-safe; require channel-specific validation. |
| RE/minors consent | Religious Education, youth, student spiritual convocation, class photos, and child-identifying captions default restricted until consent/release basis is documented. |
| Testimony/pastoral sensitivity | Illness, healing, visions, spiritual battle, family conversion, grief, prayer requests, and pastoral/private details default context-safe or archive-only unless explicitly reviewed. |
| Public/member/internal visibility | Publicly visible on a TJC site does not mean reusable across every channel. |
| Stock-safe/context-safe/archive-only | Broad reuse, original-context reuse, and preservation-only status are separate decisions. |
| Collection/package safety | Collection or package membership must never override resource-level restrictions. |
| Master/derivative protection | Ordinary users should see approved derivatives only; preservation masters/source paths/checksums stay restricted. |
| AI suggestions | AI may suggest tags, but cannot approve rights, people/minors, doctrine, sensitivity, or public/internal reuse. |

## Fail Conditions

Reviewer must hold signoff if any condition is true:

- Any current seed record is reusable/downloadable, or UI/API allows Viewer download.
- Any visible record exposes source path, master path, checksum, private URL, original custody details, or ResourceSpace admin internals to Viewer/Contributor.
- Raw `Approved Public` reads as `Portal Ready` or stock-safe.
- People/minors unknown, RE/minors, or child/youth media can become public without consent/review.
- Sacrament/doctrine, worship, sermon, music, hymn, testimony, or pastoral/private content appears broadly reusable without domain review.
- A package, collection, saved search, Brand Hub, or role switch bypasses item-level restrictions.
- ResourceSpace queued writeback is described as live/synced without proof.
- AI suggestions appear as rights, people/minors, doctrine, or sensitivity approval.
- Reviewer cannot explain what was sampled, or cannot record name/date/scope.

## Signoff Record

Reviewer fills this before invite send:

- Reviewer name:
- Reviewer role / authority:
- Review timestamp with timezone:
- Export reviewed: `/Users/halim4pro/Desktop/MVP/tjc-stock-media/.runtime/exports/resourcespace-metadata-20260604-193852.csv`
- App URL tested:
- Searches run:
- Number of Viewer-visible records opened:
- Blocked download checked: Yes / No
- Decision: Preview-only visibility approved / Hold and scrub
- Notes:

Exact signoff text if approved:

> I reviewed the current beta seed/export and sample Viewer-visible records. I approve the 181 Viewer-visible `Approved Public` records for preview-only visibility to named internal Team Beta testers. I understand no seed records are portal-ready/downloadable, public or internal reuse remains blocked, and final rights approval still requires people/minors, rights/consent, reviewer/date, usage scope, sensitive-context, and approved-derivative evidence.

Exact hold text if not approved:

> I do not approve the current beta seed for teammate visibility. Hold invites until the listed seed records are hidden, scrubbed, or re-exported and this packet is rechecked.

## AI-Preparable Status

AI-preparable part of the seed/media gate is ready: evidence is gathered, counts are verified, risk categories are listed, sample searches are specified, fail conditions are explicit, and signoff text is ready.

The gate is not finally closed until a human reviewer records name, timestamp, sample checks, and approval decision above.
