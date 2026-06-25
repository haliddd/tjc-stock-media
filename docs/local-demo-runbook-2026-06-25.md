# True Jesus Church Media Library Local Demo Runbook

Status: focused local demo runbook for issue #53 on 2026-06-25.

This runbook is for local product rehearsal only. ResourceSpace remains DAM/source truth. Google Shared Drive remains master-original custody. No step below grants production approval, public publishing, live ResourceSpace writeback, or source-file mutation.

## Start commands

Viewer/default local demo:

```bash
npm --prefix frontend run dev
```

Fresh proof lane used for final viewer-focused QA:

```bash
env SSO_TRUSTED_HEADERS=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0 npx next dev --port 4874
```

Reviewer local proof lane used for deeper review-workbench checks:

```bash
env SSO_TRUSTED_HEADERS=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=1 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0 npx next dev --port 4873
```

Visible local role rehearsal entry:

```text
http://localhost:4873/rehearsal
```

## Key routes

Viewer:
- `http://localhost:4874/`
- `http://localhost:4874/assets/1`
- `http://localhost:4874/public-portal/sabbath`
- `http://localhost:4874/requests`
- `http://localhost:4874/?q=worship&rightsSafe=1`

Reviewer proof:
- `http://localhost:4873/rehearsal`
- Use the visible role rehearsal page to select Reviewer, then open Review.

DAM Admin proof:
- `http://localhost:4874/admin`
  Use the visible role rehearsal page when running with `NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=1`, or trusted local header `x-tjc-role: DAM Admin` for automated/browser-tool proof. Normal browser navigation stays in Viewer lane unless a trusted local role mechanism is supplied.

## Demo flows

1. Viewer search and reuse
   Open Library.
   Turn on rights-safe only.
   Search `worship`.
   Open the asset inspector.
   Show matched-because chips and search intelligence summary.

2. Asset detail and governed download
   Open `/assets/1`.
   Open `Download Center`.
   Show approved web copy, request-needed print row, add-ons, and source/original separation.

3. Rights-safe explanation
   On `/assets/1`, open `Why can I use this?`.
   Show approval, license, channels, release evidence, role permission, and safe blocker text.

4. Public portal preview
   Open `/public-portal/sabbath`.
   Show True Jesus Church Media Library branding and local-demo notice.
   If no Portal Ready assets are present, call out the honest empty state instead of inventing public media.

5. Reviewer workbench
   Open `/rehearsal`, select Reviewer, then open Review.
   Show expanded evidence depth checklist, queued/pending-write truth, and action locks for request changes, archive only, block public use, and approve public.

6. DAM Admin governance
   Open `/admin` with trusted local admin role.
   Show governance cleanup queues and permission inheritance preview.
   Confirm these are read-only previews, not live permission mutation controls.

## Known limitations

- Public portal preview may show an honest empty state when the current source has zero Portal Ready assets for that collection.
- Download Center models approved-copy truth only. Print/social/other renditions remain request-needed unless exported truth exists.
- Rights-safe explanation uses exported fields plus backend reuse decision only. Unknown fields stay review/info.
- Review evidence depth is enforced on the live prototype review surface and summarized into queued notes, but the extra depth fields are not separate persisted schema fields yet.
- Permission inheritance preview is admin-only and read-only. No user/group mutation is wired.
- Search intelligence intentionally marks visual similarity and AI tags as not configured until a real backend source exists.

## Backend and source-truth notes

- ResourceSpace remains metadata/review/download truth.
- Google Shared Drive remains master-original custody.
- Pending review writes are queue records only until ResourceSpace sync confirms them.
- Approved-copy downloads remain gate-backed.
- Source/original files stay restricted and request-only.
- Local trusted headers and query-role proof lanes are rehearsal tools only, not production auth.

## Focused evidence files

- `docs/screenshots/qa/issue-53-final-focused-qa.json`
- `docs/screenshots/qa/issue-46-public-portal-desktop.png`
- `docs/screenshots/qa/issue-47-download-center-desktop.png`
- `docs/screenshots/qa/issue-48-rights-explanation-desktop.png`
- `docs/screenshots/qa/issue-49-review-evidence-desktop.png`
- `docs/screenshots/qa/issue-50-permissions-desktop.png`
- `docs/screenshots/qa/issue-51-governance-queues-desktop.png`
- `docs/screenshots/qa/issue-52-search-intelligence-desktop.png`
