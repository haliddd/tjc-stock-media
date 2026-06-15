# Teammate Real DAM Beta Packet - 2026-06-14

## Status

June 15 safety update: this packet is a historical draft only. Current status is **NO-GO for sending teammate invites** until `docs/runs/evidence/2026-06-15/11-friday-readiness-report.md` blockers close and Hali renews approval. Do not send this packet or any hosted URL from it.

## Who Can Test

Named internal testers only:

- Viewer testers.
- Contributor testers.
- Reviewer testers.
- DAM Admin testers.

Do not forward the URL. Do not invite wider church users. This is not public launch.

## URL

`https://<vercel-preview-url-after-human-approval>`

## Login Roles

Use `/beta-login` and the persona password given by the beta coordinator.

- Viewer: search and inspect approved media records.
- Contributor: search, submit review/intake feedback, draft distribution references.
- Reviewer: review evidence and queue decisions.
- DAM Admin: inspect readiness diagnostics and blockers.

This beta login is temporary QA access, not production SSO and not church member authentication.

## What Is Real

- Role-safe media-library UI.
- Clearance status and next-action language.
- Approved-copy gate design.
- Original/source files are restricted.
- Tags help discovery only.
- Collections and distribution sets are curation/draft tools, not permission.
- Review queue can record pending work; ResourceSpace remains final truth.
- Feedback can be real only after durable KV is configured.

## What Is Not Real Yet

- Production SSO.
- Public portal.
- Public share links.
- Public CDN/embed controls.
- Original/master download.
- Live ResourceSpace writeback.
- Durable packages/saved searches/audit/tickets unless a durable adapter is configured and proven.
- Future S3/R2 derivative storage.

## Photo-Only Scope

Treat current beta as photo-only. Audio/video handling is future architecture unless explicitly approved and labeled.

## How To Search

1. Open Library.
2. Search by ministry use, title, keyword, or saved view.
3. Use filters for clearance/review posture.
4. Open record before reuse.

If results look unavailable or disconnected, report it. Do not assume missing data means approval.

## How To Read Clearance Status

Use these rules:

- "Portal Ready" means current record passes portal reuse checks for visible scope.
- "Needs Review" means ask reviewer before reuse.
- "Internal" means do not publish publicly.
- "Do Not Publish" means blocked.
- Tags do not approve.
- AI suggestions do not approve.
- Collection/package membership does not approve.

## Request Review or Download

- Use "Request DAM review" when clearance is missing or use is unclear.
- Use "Download approved copy" only when the record allows it.
- Download still runs approved-copy ticket and audit checks.
- Source/original access requires separate governed request and is not normal UI delivery.

## Report Feedback

Use in-app feedback if enabled:

- Say what role you used.
- Include record reference.
- Say expected result and actual result.
- Mark privacy/source/download issues as high/critical.

Do not upload sensitive production media into feedback attachments unless explicitly approved.

## What Not To Upload

- Children/youth identifiable images.
- Pastoral/private counsel context.
- Sacrament or worship sensitive media.
- Raw originals.
- Private Drive links.
- Copyrighted media from outside TJC without proof.
- Secrets, credentials, or exported env values.

## Known Blockers Before Sending

- Human must confirm Vercel project, protection, and URL.
- Human must configure beta passwords and session secret.
- ResourceSpace live/export read must be proven.
- KV feedback durability must be proven or feedback disabled.
- Hosted fallback must not appear as real DAM success.
- Admin must confirm no public share/CDN/original route is exposed.

## Emergency Rollback Contact

Beta coordinator: `<name/email/phone to fill by human>`

Immediate rollback:

- Remove tester access.
- Rotate beta passwords.
- Disable feedback if storage fails.
- Remove ResourceSpace env if data looks wrong.
- Stop testing if private source/original data appears.

## Feedback Questions

- Could you find a usable photo for your ministry task?
- Was clearance easy to understand?
- Did anything look like a fake demo or placeholder?
- Did any source/private/original data appear?
- Did download/request review behavior match expectations?
- What blocked you from trusting the portal?
