# No-Demo Teammate Experience Audit - 2026-06-14

## Goal

Normal teammates should experience a real internal media library, not a fixture demo. Admins still need diagnostic truth about live/export/fallback states.

## Surfaces Audited

| Surface | Finding | Change/status |
| --- | --- | --- |
| Library | Banner could mention beta fixtures when source detail was missing. | Copy now says source connection pending and unavailable media stays marked. |
| Asset Detail | Normal action copy said backend gate. | Copy now says approved-copy gate and audit. |
| Quick Look / Inspector | Copy said backend download-ticket checks. | Copy now says approved-copy ticket checks. |
| Beta Login | Copy said previews/metadata are beta fixtures. | Copy now says records stay unavailable when source connection is not verified. |
| Beta Access Banner | Copy said hosted ResourceSpace media storage pending and metadata may be beta fixtures. | Copy now says live DAM media storage may be pending and unavailable records stay clearly marked. |
| Review Queue | Zoom tooltip said beta fixtures. | Copy now says zoom waits for safe preview tooling. |
| Package/Distribution Sets | Copy already says no ZIP, public link, source-file access, external share, or writeback. | Kept. |
| Brand Hub | Component still contains invite/share UI, but `middleware.ts` redirects `/brand-hub` to `/guide` in this build. | Documented as not v1 teammate surface. Do not remove diagnostics without product decision. |
| Admin | Admin still says backend systems, fallback data, ResourceSpace, Drive, S3. | Kept because Admin cockpit needs diagnostic truth. |
| Fallback data | `demo-fallback.ts` still contains QA fixture records and emails. | Safe only if source redaction and hosted fallback honesty hold. Normal roles must not see QA source identities. |

## Role Language Rules

- Viewer: "Media library", "approved copy", "request review", "source files restricted".
- Contributor: "Submit for review", "draft distribution set", "no final approval from tags/packages".
- Reviewer: "Governance", "evidence", "pending ResourceSpace sync is not final truth".
- DAM Admin: "ResourceSpace API/export/fallback", "Drive custody", "durable store", "writeback disabled", "launch blocker".

## Current Proof

- `frontend/lib/source-redaction.ts` hides source custody keys, ResourceSpace IDs, checksums, original filenames, and operational source labels from Viewer/Contributor payloads.
- `frontend/lib/approved-delivery-gate.ts` blocks original-like requested variants and returns redacted blocked responses.
- `frontend/lib/beta-feedback.ts` fails hosted feedback reads/writes closed when KV is missing or failing.
- `frontend/components/dam/enterprise/*` copy now avoids fixture/demo/backend wording on normal teammate surfaces.

## Remaining Risk

- If hosted Vercel has no ResourceSpace API/export and still shows fallback records as success, that is a blocker.
- If Brand Hub redirect is removed, share/invite wording must be rebuilt as governed internal draft language before teammate exposure.
- Older non-enterprise components still contain some S3/source/backend wording, but current app routes use enterprise pages. Keep guards/browser QA watching actual routes.
