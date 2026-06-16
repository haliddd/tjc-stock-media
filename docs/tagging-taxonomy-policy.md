# Tagging And Taxonomy Policy

Status: v1 policy for photo-only hosted beta. This does not enable AI approval, live writeback, or a second DAM.

## Rules

- ResourceSpace remains metadata/search/review source of truth.
- The portal may render role-safe read models and suggestions.
- Tags do not approve reuse.
- AI suggestions do not approve anything.
- Smart rules do not approve anything.
- Humans approve rights, consent, people/minors, doctrine/sacrament, hymn/music, testimony/pastoral sensitivity, and public/internal reuse.
- Suggested/system tags can route review, flag blockers, and improve search.
- Viewer/Contributor payloads must not expose source paths, original filenames, checksums, master paths, private URLs, signed URLs, or ResourceSpace admin internals.

## Tag Classes

| Class | Meaning | Counts as official search/facet truth |
|---|---|---|
| Controlled | Official TJC-approved taxonomy term. | Yes when accepted or locked. |
| Freeform | Human-entered descriptive term. | Yes only after accepted or locked. |
| Suggested | AI, rule, import, or reviewer suggestion. | No until accepted. |
| System | Derived status such as possible minors, derivative missing, source incomplete. | Policy/routing evidence only, not approval. |

## Tag Status

| Status | Meaning |
|---|---|
| `suggested` | Awaiting review. |
| `accepted` | Human accepted for metadata/search use. |
| `rejected` | Human rejected. |
| `locked` | Official term or governance tag protected from casual edits. |

Only `accepted` and `locked` non-system tags may count as official search/facet terms. Suggested tags should remain visually distinct for Reviewer/Admin.

## V1 Taxonomy Groups

| Group | Initial terms |
|---|---|
| Ministry/Event | Sabbath Service, Evangelical Service, Religious Education, Fellowship, Youth, Choir, Sermon / Teaching, Testimony, Baptism, Holy Communion, Footwashing, Prayer, Church Life |
| Content/Subject | Bible, Hymn, Worship, Scripture, Fellowship meal, Church exterior, Classroom, Nature, Flowers, People, No people |
| Usage/Channel | Website, Slides, Newsletter, Social, Print, Internal only, Public candidate |
| Rights/Governance | Needs rights review, Consent confirmed, Consent missing, Possible minors, Doctrine review needed, Hymn/music review needed, Testimony sensitivity review, Approved copy missing, Source/provenance missing, Archive only, Do not use |
| Technical | Photo, Landscape, Portrait, Square, High resolution, Preview available, Derivative missing, HEIC original, JPEG derivative |

## Search And Facet UX

Library filters may include:

- media type
- clearance
- people/minors
- rights
- usage channel
- ministry/event
- TJC terms
- orientation
- derivative status
- source status
- review blocker
- collection
- expiration/recheck date

Normal-user search copy should use church/user language: "Search title, topic, event, collection, or reference ID." Avoid ResourceSpace internals for Viewer/Contributor.

## Tag Health Metrics

Track:

- missing accepted tags
- overused freeform tags
- suggested tags awaiting review
- assets with possible minors
- assets with source/provenance blockers
- assets with rights, doctrine, hymn/music, testimony, or pastoral review blockers
- assets missing preview or approved-use derivative

Metrics are diagnostics only. Missing data is unavailable or review debt, not permission.

## Similar Assets V1

Allowed:

- metadata/tag-based similarity using collection, accepted tags, title, dimensions, date, source album, usage, and ministry terms

Not allowed in v1:

- vector visual similarity
- face identity matching
- AI approval
- automatic public/internal publishing

## Acceptance Before Wider Beta

- Viewer can filter/search by accepted safe tags.
- Reviewer/Admin can see suggestions separately from accepted terms.
- Suggested tags are visibly not approval.
- System tags can route review queues but cannot make Portal Ready.
- No AI approval copy appears.
- Guards continue to pass.
