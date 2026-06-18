# Google Shared Drive Custody Proof Plan - 2026-06-14

## Goal

Make Google Shared Drive custody real and safe without mutating Drive or committing private paths.

## Ownership

Google Shared Drive owns:

- Master originals.
- Folder/album custody.
- Source inventory.
- Original media retention.
- Backup expectation for master files.

ResourceSpace owns:

- DAM asset record.
- Metadata/search/review state.
- Rights/consent/lifecycle fields.
- ResourceSpace ID and collection membership.

Portal owns:

- Role-safe read model.
- Review/download/package workflow state.
- Beta feedback.
- Admin readiness proof.

## Shared Drive Structure

Recommended high-level layout:

- `Incoming/` for new admin intake and large files.
- `Master Originals/` for canonical retained media.
- `Imported to ResourceSpace/` for batches with ResourceSpace IDs.
- `Do Not Use / Hold / Rights Review/` for blocked source material.
- `Custody Manifests/` for sanitized export artifacts.
- `Backups/` only if approved by Drive owner and backup policy.

Do not expose raw folder paths to normal roles.

## Naming Convention

Use stable, non-secret labels:

- Batch ID: `tjc-rs-import-YYYYMMDD-##`
- Source album reference: `album:<sanitized-slug>`
- Drive file reference: `drive-file:<id>` for Admin-only custody map
- ResourceSpace ref: `rs:<resource_id>`
- Derivative ref: `derivative:<resource_id>:<variant>:<checksum-prefix>`

## Sanitized Custody Manifest

Safe manifest fields:

- `manifest_version`
- `generated_at`
- `batch_id`
- `resource_space_id`
- `portal_asset_id`
- `drive_file_id_admin_only`
- `drive_folder_ref_admin_only`
- `source_album_ref`
- `checksum_sha256_admin_only`
- `file_size_bytes_admin_only`
- `original_filename_admin_only`
- `redacted_source_label`
- `import_status`
- `review_status`

Forbidden in committed docs/fixtures:

- Raw Drive paths.
- Public/unrestricted share links.
- Full private filenames for normal roles.
- Credentials/service account JSON.
- Original media.

## Checksum Strategy

- Compute checksums outside Git.
- Use checksums for duplicate detection and custody proof.
- Viewer/Contributor never see checksum values.
- Reviewer may see duplicate-group review hints if scoped.
- Admin can trace checksum in custody panel/readiness docs.

## ResourceSpace Mapping

Minimum mapping:

- Drive file ID -> ResourceSpace resource ID.
- Source album/folder ref -> ResourceSpace collection/source fields.
- Checksum -> duplicate group.
- Import batch -> audit/log reference.

## Normal User Redaction

Viewer/Contributor must never see:

- `sourcePath`
- `masterDrivePath`
- `sourceAlbumPath`
- `originalFilename`
- `checksumSha256`
- `driveFileId`
- private URL
- raw Google Drive path

Current code proof: `frontend/lib/source-redaction.ts` strips custody keys from normal role payloads.

## Manual Proof Steps

1. Human confirms Shared Drive owner and root folder.
2. Human exports sanitized sample manifest with 3 to 10 records.
3. Admin verifies each record has ResourceSpace ID or import status.
4. Run private-source and payload guards locally.
5. Admin readiness records manifest date, record count, and redaction policy.

## Future Automation

Only after approval:

- Read-only Drive inventory with service account.
- Dry-run manifest validator.
- Checksum inventory job.
- ResourceSpace import correlation report.

Never automate:

- Move/copy/delete/rename source media.
- Public share creation.
- Original delivery to portal.
