# Stock Media Meeting Notes - 2026-06-16

Source audio: `/Users/halim4pro/Downloads/Stock Media Meeting 6-16.m4a`
Transcript generated with `mlx_whisper` after `markitdown` audio conversion failed with `recognition connection failed: [Errno 32] Broken pipe`.
Generated transcript files:

- `stock-media-meeting-2026-06-16.txt`
- `stock-media-meeting-2026-06-16.vtt`
- `stock-media-meeting-2026-06-16.srt`
- `stock-media-meeting-2026-06-16.tsv`
- `stock-media-meeting-2026-06-16.json`

Credential-like text mentioned during the hosted-shell discussion was redacted from generated transcript files.

## Executive Summary

The team aligned around using ResourceSpace as the search, metadata, review, and approval layer, while Google Drive remains the master/archive copy. The immediate path is still a low-cost MVP: manual import for now, limited contributor access, default review before publish, and a small hosted/testable instance so Joanna can try uploading and managing a limited set of photos.

Main concern: the user workflow can be made simple, but backend hosting and long-term maintenance may be too technical for non-CS maintainers unless the deployment is kept very conservative.

## Decisions And Agreements

- File names should stay minimal: date plus useful semantic identifiers are helpful, but ResourceSpace metadata/tags are more important than the filename.
- Event/source can live in ResourceSpace description or tags; an event tag hierarchy is possible if needed.
- ResourceSpace date metadata appears to be available from imported photo metadata, but source albums may not always expose full details.
- Do not spend time correcting every date. Correct only obviously wrong camera dates, such as photos showing decades-old dates due to bad device settings.
- Keep original capture dates when photos were taken outside the event but intentionally submitted to an event album.
- Add a derivative/version descriptor to distinguish originals from resized/cropped/social/web versions.
- Originals can be restricted while derivatives can be made downloadable for intended use cases.
- Google Drive direct import is not MVP-ready because the integration likely needs server-side setup.
- Google Drive backup/export has no native ResourceSpace plugin that works out of the box. Realistic options are ResourceSpace API/webhooks plus Google Drive API, or scheduled `rclone`.
- Amazon S3 would work similarly to Google Drive for backup/storage, but provides storage only, not browsing.
- Cloudflare/domain/hosting needs more research. Local-only instances are not enough for Joanna or other reviewers to test centrally.
- ResourceSpace hosted cloud is an option but likely introduces recurring cost.
- A limited trial should use a prior MVP batch, likely MVP 2024, rather than attempting the full archive.
- Joanna should be the default content approver/project manager, with option to build a review team if workload grows.
- Contributor access should require accounts and a separate church-location invitation code. Viewers should not automatically be contributors and should remain view-only.
- Upload attribution should use real names/church names so contributors can be traced.

## Product Scope Notes

- Focus the archive on media that is hard to get elsewhere: baptism, worship, Bible study, chapel, church life, and TJC-specific visual needs.
- Generic nature photos are still useful for calendars and regular church design work, but the team should decide how large that category should become.
- Canva/Pexels/Unsplash can supply many generic images, but usage rights and license terms still need careful review.
- Music licensing is stricter than stock photos and should not be treated the same way.

## ResourceSpace Demo Feedback

- Hali's customized ResourceSpace UI is more user-friendly than the default interface, but several controls still need wiring and cleanup.
- Default ResourceSpace works out of the box and may be easier to maintain, but it is less polished for normal users.
- Desired user flow: upload like Google Drive or Google Photos, apply required metadata, submit to review, and search easily later.
- Upload forms should show only required fields for normal contributors. Admin/reviewer metadata can stay hidden from normal users.
- Bulk upload/renaming should be supported where possible, especially for team leads uploading hundreds of photos.
- ResourceSpace advanced search can filter by contributor once contributor accounts are set up.

## Risks

- Long-term backend maintenance is the biggest unresolved risk.
- Hosting is unresolved: local machines are not suitable for shared testing or durable production use.
- AI-generated UI work still needs human review because it can create busy layouts, partially wired controls, or regressions.
- Content governance is separate from system building. The team still needs content managers to decide categories, tags, approval rules, and contribution limits.
- Public-use approval must continue to include reviewer, date, usage scope, and notes.

## Action Items

- Hali/Enoch: create or update a centrally accessible test instance for Joanna, using free/credit-backed hosting if possible.
- Hali/Enoch: share the test link in Google Chat when ready.
- Joanna: test upload and management flow with a limited photo batch, then give feedback.
- Team: decide whether to involve Annabella now or after Joanna's first test.
- Team: define a small set of required upload fields and hide nonessential fields from normal contributors.
- Team: draft a one-page upload and naming walkthrough for contributors.
- Team: decide contribution policy for generic nature photos versus TJC-specific media.
- Team: research hosting/maintenance path before committing to a long-term deployment.
- Team: ask Joseph or IT if the project is ready for domain/server guidance.

## Follow-Up

- Next meeting: Tuesday, 2026-06-23, 11:00 AM to 12:00 PM.
- Goal for next meeting: review Joanna's feedback from the limited upload/manage test.

## Transcript Accuracy Notes

Whisper transcript is useful but not perfect. Names such as Hali/Holly/Heli and Annabella/NFL may be misheard in places. Use the timestamped `.vtt` or `.srt` files for review against the source audio when wording matters.
