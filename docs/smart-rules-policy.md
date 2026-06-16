# Smart Rules Policy

Status: deterministic suggestion and routing policy. Rules are not approval.

## Allowed Rule Actions

Rules may:

- suggest tags
- suggest collections or saved views
- flag blockers
- route assets to review queues
- generate metadata health warnings
- explain why an asset is not Portal Ready

Rules may not:

- approve rights
- approve consent
- approve minors
- approve doctrine/sacrament
- approve hymn/music
- approve testimony/pastoral sensitivity
- mark Portal Ready
- enable downloads
- mutate ResourceSpace directly
- claim queued writeback is synced

## Initial Rule Set

| Rule | Trigger examples | Action |
|---|---|---|
| People/minors review | children, youth, Religious Education, RE, classroom, minors unknown | Add system tag `possible-minors`, route to RE/minors review, block public-ready until consent basis exists. |
| Hymn/music review | hymn, choir, music, Hymns of Praise, worship audio/video | Add `hymn-music-review-needed`, require rights basis/channel/notice. |
| Doctrine/sacrament review | baptism, Holy Communion, footwashing, Holy Spirit, sermon, Sabbath | Add doctrine/sacrament context review route. |
| Testimony/pastoral sensitivity | testimony, illness, healing, grief, counseling, private prayer | Add testimony/pastoral sensitivity review route. |
| Approved-copy missing | public candidate or approved scope without approved-use derivative | Add `approved-copy-missing`; block download. |
| Source/provenance missing | missing source account/folder/album/checksum/custody status | Add `source-provenance-missing`; block Portal Ready. |
| HEIC technical route | HEIC original with JPEG derivative | Suggest technical tags while preserving original custody. |
| Orientation | dimensions indicate landscape/portrait/square | Suggest technical orientation tag. |

## Evidence Language

Use "suggested," "flagged," "needs review," "blocked," or "queued." Do not use "approved," "cleared," "synced," "safe," or "ready" unless human evidence and policy gates support that state.

## Review Ownership

| Risk | Human owner |
|---|---|
| Minors/consent | RE/minors reviewer |
| Doctrine/sacrament | Doctrine reviewer |
| Hymn/music | Music-rights reviewer |
| Testimony/pastoral | Pastoral sensitivity reviewer |
| Source/provenance | DAM/source reviewer |
| Derivative readiness | DAM reviewer |
| Taxonomy | Taxonomy manager |

## Acceptance Before Implementation

- Rule tests prove suggestions route/flag only.
- No rule can set `Portal Ready`.
- No rule can mint download tickets.
- No rule can write to ResourceSpace.
- Reviewer/Admin UI distinguishes suggestions from accepted tags.
- Viewer/Contributor never receive source/original/private data through rule explanations.
