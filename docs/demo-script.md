# Stakeholder Demo Script

## Product Story

This is not a DAM setup demo. It is a proof that a TJC user can find, review, and safely reuse media.

North Star: a TJC user can find a rights-safe asset for a real communication need in under 60 seconds.

## Demo Steps

1. State the problem.

   Media is scattered across Google Photos, old Drive folders, IA DME folders, and local machines. People cannot easily tell what exists, what is safe to use, or where the approved version lives.

2. State the system.

   Google Shared Drive is the master library. ResourceSpace is the searchable review layer. Originals are not moved or deleted during MVP.
   Use the featured `MVP 2024 - First Batch` collection as the demo album/folder.

3. State the safety rule.

   Every new imported asset starts as `Needs Review` and `Do Not Publish`.
   For the current MVP 2024 prototype batch, reviewer signoff allowed controlled prototype review only. Do not describe this as public launch, broad reuse approval, or publication.

4. Search real terms.

   - `Bible`
   - `Plant`
   - `Fountain`
   - `MVP 2024`
   - `Needs Review`

   Current seeded search checks:

   - `Bible`: searchable records
   - `Plant`: searchable records
   - `Fountain`: searchable records
   - `Needs Review`: records waiting for controlled review

5. Open one reviewed asset.

   Show tags, review status, reviewed by, review date, and usage guidance. Do not expose source paths to normal viewers.

6. Show HEIC handling.

   Open a HEIC asset. Show that the card/preview displays a JPG derivative so normal users are not confused. Then show the original HEIC remains preserved as the master file; only qualified admin/designer retrieval should handle originals, while normal users use the approved derivative when cleared.
   Local check: Hali confirmed this HEIC behavior looks good for the prototype on 2026-06-04.

7. Show approval metadata.

   - Review status
   - Usage guidance
   - Reviewer/date evidence

   Current review state: MVP 2024 records are for controlled prototype review only.

8. Export metadata CSV.

   Show that the system can leave with its metadata. Current export: `.runtime/exports/resourcespace-metadata-20260604-171242.csv`.

9. Show delivery-output boundary.

   Show approved output, not source mutation.

10. Show original untouched.

   The source folder still exists and files are not renamed or deleted.

## Final Ask

Should we continue from 181 assets to the next 500 assets using the same workflow?

## Five-Minute Launch Demo

1. Show ResourceSpace login is protected.
2. Search for an approved asset.
3. Download an approved use copy.
4. Upload one normal photo as a contributor.
5. Show the upload enters `Needs Review / Do Not Publish`.
6. Approve one sample as reviewer with reviewer/date/notes.
7. Show a large video uses admin intake, not browser upload.
8. Explain Google Shared Drive is the master warehouse and ResourceSpace is the review/search/download front door.
