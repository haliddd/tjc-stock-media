# TJC Stock Media DAM Portal

North Star: a TJC user can find, trust, request, or review a ministry media asset without confusing demo state with final ResourceSpace truth.

This repo sets up a local ResourceSpace DAM prototype and a private TJC-facing Next.js portal for True Jesus Church ministry media governance. Google Shared Drive remains the master-original warehouse. ResourceSpace is the source of truth for assets, metadata, search, rights review, and approval fields. The Next.js portal is the governed workbench for Library, Intake, Review, Collections, Asset Detail, and Governance; it does not replace ResourceSpace or become a second DAM.

Data engineering posture: use a lightweight canonical asset metadata catalog, not
a separate data platform. See `docs/data-engineering-playbook.md` for source
boundaries, idempotent imports, data quality contracts, schema drift, AI
suggestion rules, and the trigger points for adding heavier infrastructure.

```text
Legacy sources
Google Photos / old Drive folders / IA DME folders
        |
        | manual selected batch import for MVP
        v
TJC Stock Media Library Shared Drive
master warehouse / selected originals / organized storage
        |
        | manual import now
        | Phase 2: Google Drive connector or StaticSync-style workflow
        v
ResourceSpace local prototype
DAM index / tags / search / review / downloads
        |
        v
Metadata exports + approved sample exports back to Shared Drive
Controlled launch target: church PC/NAS + Cloudflare Access + fresh install/restore.
Approved Public/Internal folders are delivery shelves, not the archive.
Portal-ready reuse is computed separately from raw ResourceSpace approval.
```

## Clone And Local Setup

Clone the repo and install dependencies:

```bash
git clone https://github.com/Hali0321/tjc-stock-media.git
cd tjc-stock-media
```

Create a local environment file from the example:

```bash
cp .env.example .env
```

Start the ResourceSpace stack:

```bash
make up
make smoke
```

Start the portal:

```bash
cd frontend
npm install
npm run dev
```

By default the dev portal runs at `http://localhost:4867`. If that port is busy, run a different port:

```bash
npx next dev --port 3029
```

Local-only files are intentionally not committed:

- `.env`
- `.runtime/` ResourceSpace filestore, database, exports, backups, pending review writes
- imported church media files
- generated PNG screenshots
- `frontend/node_modules/` and `.next/`

This means a fresh clone has the full project code, docs, scripts, Docker config, ResourceSpace helpers, portal frontend, and safe fallback demo data. Each local environment still needs its own `.env`, ResourceSpace runtime data, or metadata export for full-fidelity media/search behavior.

## Launch Plan

Combined launch plan:

`docs/launch-plan.md`

Key launch wording:

```text
4-6 weeks to launch full-archive-capable infrastructure,
with tiered archive import and partial human review.
```

Launch is blocked until a church-owned PC/NAS can run ResourceSpace independently, Cloudflare Access protects the site, backups restore on a clean host, large media has an admin intake path, and unreviewed assets cannot be mistaken for approved media.

## First Batch

Source folder:

`/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Imported/MVP 2024`

Current inventory:

- 181 files
- 480 MB
- 142 JPG, 3 JPEG, 18 PNG, 18 HEIC

Current import status:

- ResourceSpace collection: `MVP 2024 - First Batch`
- Imported active resources: 181
- Raw ResourceSpace review state: 181 imported for controlled prototype review; not public launch, broad reuse approval, or publication proof
- Portal reuse state: 0 portal-ready until rights, people/minors, reviewer/date, and derivative evidence pass policy
- Batch approved with blockers: 181
- Files with stored binaries: 181
- HEIC result: 18 originals preserved, 2 previewed natively, 16 have attached JPG derivative alternatives for preview/use
- HEIC front preview: derivative JPG thumbnails promoted for ResourceSpace cards while original HEIC files remain preserved
- Featured collection: `MVP 2024 - First Batch`
- Demo metadata: 77 resources seeded with visible/TJC tags
- Search checks: Bible 23, Plant 34, Fountain 6
- Latest approval audit: `.runtime/audits/approval-audit-20260604-165722.csv`
- Latest UI polish audit: `.runtime/audits/ui-polish-audit-20260604-171229.csv`
- Latest metadata export: `.runtime/exports/resourcespace-metadata-20260604-193852.csv`
- Local acceptance note: `docs/runs/local-prototype-acceptance-2026-06-04.md`

## Where Imported Files Are

ResourceSpace imported files live in:

`/Users/halim4pro/Desktop/MVP/tjc-stock-media/.runtime/filestore`

Finder hides `.runtime` because the folder starts with a dot. For a visible Finder entry, use:

`/Users/halim4pro/Desktop/MVP/Stock Media/02_Imported Into ResourceSpace`

That folder contains links to the filestore, database, metadata exports, and LM Photos batch report. They are pointers, not duplicate copies.

## Quick Start

```bash
cp .env.example .env
make up
make smoke
make import-audit
make frontend-dev
```

Open ResourceSpace:

`http://localhost:8088`

Open TJC Stock Media portal:

`http://localhost:4867`

## Current Frontend State

Latest UI pass: 2026-06-08 enterprise DAM architecture pass over the launch-polish baseline.

The portal now targets a hybrid ministry DAM model: enterprise metadata/permission/audit spine, ResourceSpace companion truth layer, private media operations shell, role-aware Library results, governed internal Collections, contributor Intake sessions, Review workbench, Asset Detail trust record, Governance/Ops console, command palette, unified state/toast primitives, and user-facing Guide flows.

Safety remains unchanged: ResourceSpace is still source of truth, Google Shared Drive keeps master originals, pending review writes are local/not final, uploads stay `Needs Review / Do Not Publish`, unsafe Viewer downloads remain blocked, and original/master access remains restricted.

Current hardening pass:

- Production client role overrides are ignored globally. Without trusted SSO headers, privileged routes fail closed.
- Local beta role switch is QA convenience only; it is not production auth, SSO, impersonation, or permission delegation.
- ResourceSpace live reads use paginated search and fail safely instead of silently capping archive reads at 1,000 records.
- Review writeback returns ResourceSpace success only after live API update and post-write confirmation. Otherwise it remains queued, failed, or conflicted sidecar state.
- `.runtime` JSON/JSONL remains local beta storage. Production stateful features require durable runtime storage or fail closed.
- Approved Public is not automatically portal-ready; rights, people/minors, reviewer/date, schema, and derivative evidence still gate reuse.

Still blocked for real production until church host, trusted SSO, durable runtime storage, backup/restore evidence, large-media intake, and ResourceSpace field map/writeback are configured and verified.

Refreshed screenshots live under `docs/screenshots/`, including desktop plus 320/390 mobile captures and primitive proofs under `docs/screenshots/primitive-proof/`. Latest `portal-browser-qa` checked 15 routes across 1440/1280/1024/768/390/320, refreshed 20 required page screenshots, and reported zero failures, zero warnings, zero console errors, and zero network failures from a local QA server.

Current local prototype login:

- URL: `http://localhost:8088`
- Credentials file: `.runtime/local-admin-credentials.txt` (ignored by Git)

If you rebuild from scratch and see the ResourceSpace setup page, use:

- Database host: `mariadb`
- Database name: `resourcespace`
- Database user/password: values from `.env`

## Demo Flow

Do not demo "ResourceSpace is running." Demo the product behavior:

1. Search `Bible`, `Plant`, `Fountain`, `MVP 2024`, `website hero`, and `public safe`.
2. Open a result.
3. Show raw ResourceSpace status separately from portal reuse state.
4. Explain every new import starts as `Needs Review / Do Not Publish`.
5. Explain `Approved Public` means ResourceSpace-approved, not automatically portal-reusable.
6. Show current batch-approved assets as `Needs portal review` when rights/people/derivative evidence is incomplete.
7. Show Viewer download blocked for non-portal-ready assets.
8. Show Reviewer actions require note and checklist, then queue a `Pending Review Write` rather than faking ResourceSpace persistence.
9. Show Sabbath collection navigation uses a stable collection ID and returns 23 assets.
10. Show `/admin` diagnostics for data source, API read/write config, field refs, pending queue, and launch blockers.
11. Show original source files remain untouched.

## Commands

```bash
make up              # bootstrap official ResourceSpace Docker repo and start local app
make smoke           # local health checks
make import-audit    # generate source manifest with checksums
make import-mvp-batch # import first batch into ResourceSpace
make approve-mvp-batch # guarded batch approval only after explicit portal-ready confirmation
make heic-derivatives # attach JPG derivatives to HEICs that failed preview
make polish-mvp-ui    # feature MVP collection and promote HEIC JPG thumbnails to front previews
make lm-photos-zip-inventory # inventory remaining LM Photos album ZIPs
make lm-photos-stream-run # dry-run one-album-at-a-time ZIP processing plan
make lm-photos-run-report # summarize LM Photos streaming audits into Markdown
make video-manifest # manifest/checksum Samuel Kuo video intake without importing
make export-metadata # export current ResourceSpace MVP metadata CSV
make backup          # dump database and archive filestore/config
make restore-test    # non-destructive backup restore check
make launch-readiness # local launch documentation/config guardrail check
make frontend-dev # run Next.js portal locally at http://localhost:4867
make frontend-check # typecheck/build frontend and scan for media/secrets/runtime files
make demo-check # frontend checks plus demo/doc guardrails
make portal-api-smoke # API contract smoke for access/search/review/upload/admin
make portal-browser-qa # Playwright browser QA across desktop/tablet/mobile
make down            # stop local containers
```

## Frontend Portal

The portal lives in `frontend/`.

```text
Browser -> Next.js portal -> server-side media-source adapter -> ResourceSpace API/export -> ResourceSpace backend
```

Current data source priority:

1. ResourceSpace API when signed API credentials and field mapping are configured.
2. Latest local ResourceSpace metadata CSV export under `.runtime/exports`.
3. Temporary safe fallback data only if ResourceSpace data is unavailable.

Current Mac reference uses exported ResourceSpace metadata for search/detail/review queue and a dev-only thumbnail proxy for individual ResourceSpace preview derivatives. Review decisions are queued locally under `.runtime/pending-review-writes/` until ResourceSpace API write field mapping is configured. Pending writes are operational retry/audit records, not final ResourceSpace truth.

Normal users can only download portal-ready approved use copies. Original/master files stay restricted.

Current portal governance model:

- `Approved Public`: raw ResourceSpace status. It is traceability, not automatic public-safe reuse.
- `Portal Ready`: computed state. Source/provenance, rights/consent, people/minors, reviewer/date, usage scope, and derivative checks all pass.
- `Batch Approved With Blockers`: ResourceSpace-approved asset missing one or more portal reuse requirements. User-facing label: `Needs portal review`.
- `Pending Review Write`: local queued review decision that has not yet been written to ResourceSpace.

Current search and collection behavior:

- `website hero`, `hero`, `banner`, and `header` map to `view=website-hero`.
- `public safe` and `safe for web` map to `view=portal-ready`, not raw approved assets.
- `children`, `youth`, and `minors` map to the children/youth review queue.
- `needs review` and `review` map to the review queue.
- Sabbath collection navigation uses `collection=sabbath` and currently returns 23 assets.

Current UI and workflow notes:

- Primary navigation is `Library`, `Collections`, `Intake`, and `Review`; `Govern` appears for DAM Admin role.
- Navigation uses a maintained `AppNav` component with a restrained role-aware workflow surface; command palette, Guide, ResourceSpace, and Governance links remain utility/role-aware.
- `Cmd/Ctrl+K` opens a command palette for library search, saved DAM views, governed collections, review queues, ResourceSpace ID lookup, intake sessions, guide, and governance diagnostics.
- The frontend now uses Tailwind v4 through PostCSS, a small token/base layer in `frontend/app/globals.css`, Inter + Noto Sans TC via `next/font/google`, and existing `lucide-react` icons.
- Review includes isolated GSAP motion for desktop reviewer workflow only; reduced-motion disables the pin/scale effects.
- Library is now a table-first DAM command workspace: compact search, saved views, facets, operational lanes, list/table results by default, and optional grid browsing.
- Asset rows/cards show workflow, distribution, rights, people/release, availability, source, review, ResourceSpace reference, and action health without treating one vague badge as the whole truth.
- Assets without exported preview derivatives show honest restricted/pending preview states with safe media type and collection context instead of broken thumbnails. This is a ResourceSpace/export readiness signal, not fake media.
- Display titles are normalized for presentation only; original filenames stay visible in asset detail metadata.
- Detail pages keep approved-copy download visually separate from original/master restriction and add a trust matrix, usage guidance, source/review/technical provenance, and request history.
- Asset detail and Review workspaces use maintained `DropdownActionMenu` / `AssetActionsMenu` for secondary copy/open actions. Viewers and Reviewers can copy ResourceSpace ID and portal link; DAM Admin can open the ResourceSpace source-of-truth link when configured.
- Asset detail and Review inspector use maintained `DamTabs` with real tab semantics, arrow-key movement, and verified `aria-controls` targets.
- Request original access, request review, and ask-media-coworker actions open `ReuseRequestDialog` first. The dialog explains that email drafts do not grant original access, update ResourceSpace, or create pending writes.
- Review uses `HoldReleaseButton` for high-risk `Archive only` and `Do not publish externally` decisions after evidence is complete, so accidental clicks do not queue those pending writes.
- Intake is now a low-friction `Create intake batch` flow: contributors add photos, folders, or a source link, confirm event/date/ministry/source, and submit a review packet. Rights, consent, people/youth, taxonomy, derivatives, and ResourceSpace approval remain reviewer/admin tasks.
- Review is a role-gated three-pane workbench with queue groups, compact queue rows, selected-asset workspace, evidence checklist, decision lock panel, audit preview, and local pending-write copy. Mobile keeps selected review workspace before queue items.
- `/admin` is DAM Admin-only Governance/Ops and shows launch gate, data source, API read/write readiness, required field refs, pending write queue, role matrix, production blockers, audit signals, and DataTables for backlog, integration readiness, field mapping, and vocabulary.
- `MediaPreviewPanel` supports image, video, audio, document, restricted, and unknown-file modes. The current export contains photo records, so document/video/audio proof is safe shell behavior until production export includes role-safe rows.
- `tjc-toasts` centralizes Sonner feedback for upload, draft, share/copy, review, pending-write, blocked-download, and save-failure events. Toasts supplement persistent safety banners and panels.
- Safe-download logic uses the portal reuse policy, not raw ResourceSpace approval alone.
- Theme toggle is deferred until dark-mode safety labels and contrast can be fully designed and verified.

User-facing approval labels are warmer than backend values:

- `Approved Public` appears as `Approved for church-wide use`
- `Approved Internal` appears as `Internal ministry use only`
- `Needs Review` appears as `Please review before public sharing`
- `Searchable Archive` appears as `Archive only`
- `Do Not Use` appears as `Do not publish externally`
- `Possible Minors` appears as `Contains children/youth`

Latest browser QA checked 1440, 1280, 1024, 768, 390, and 320 px with no horizontal page overflow. Role/API checks confirmed Viewer downloads for non-portal-ready assets return 403, `website hero` maps to 67 assets, `public safe` maps to 0 portal-ready assets, Sabbath collection returns 23 assets, review evidence failures return 400, valid review evidence queues a 202 pending write, command palette opens the Website hero saved view, upload preview shows selected files before submit, and Contributor source-link intake succeeds with fileCount 0 when required review context is present. The durable QA report is `docs/screenshots/qa/browser-qa-report.json`; generated PNG screenshots are ignored by Git.

## HEIC Policy

Keep HEIC originals as the master files. When ResourceSpace cannot preview a HEIC, create an attached metadata-stripped JPG derivative on the same asset record. Normal users can use/download the JPG derivative; admins or designers can still retrieve the original HEIC when Apple-format originals are needed.

## Not Production

This is a local prototype. It does not prove 24/7 uptime, production security, remote access, or full backup policy. Production hosting is a later decision.

## 2026-06-07 UI Tightening

- Asset detail trust panels now use one `TjcStatusBadge` primitive with semantic wrappers for raw ResourceSpace status, portal reuse state, review state, rights, visibility, and download state.
- Admin now includes read-only DataTables plus an Audit log section for integration readiness, pending review writes, and top action backlog items.
- Guide mobile navigation now wraps instead of scrolling offscreen, preserving no-horizontal-overflow QA at 320/390/768.
- AppNav now uses a 320px icon-first label treatment so Admin navigation does not clip on small screens.
- Library 320px now uses a single-column 12-card page for readability; 390px keeps the denser contact-sheet feel.
- Review mobile now uses a compact queue selector and 8 visible queue cards before load-more; desktop/xl keeps a real Review DataTable and load-more workflow.
- `docs/ui-system/21st-primitive-implementation-matrix.md` records the primitive/source-status proof, including auth-gated or unavailable references without source-level overclaiming.
- Fresh QA ran against `http://localhost:3047` with `TJC_STOCK_MEDIA_ROOT` set to the repo root. Required screenshots and primitive proofs were refreshed under `docs/screenshots/`.

## LM Photos Completion

Remaining LM Photos are downloaded as Google Photos album ZIPs under:

`/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Photos/Incoming/lm-photo`

Use streaming mode because local disk is tight:

```bash
make lm-photos-zip-inventory
DRY_RUN=1 make lm-photos-stream-run
DRY_RUN=0 DELETE_VERIFIED_ZIPS=1 make lm-photos-stream-run
```

ZIP deletion is allowed only after an album is extracted, imported or duplicate-linked, audited, verified, and temp extraction is removed. `Open Album` is processed last because it is the largest ZIP.

Each real streaming album now creates:

- a source manifest with SHA-256 checksums
- a Shared Drive-style master path under `.runtime/shared-drive-staging`
- a ResourceSpace import audit
- duplicate-linked rows when an exact checksum already exists

Batch success is not "many files imported." Batch success is that approved media is searchable, rights-aware, traceable, and safe to use.

## Video Intake

Video sources now live separately from photo sources:

`/Users/halim4pro/Desktop/MVP/Stock Media/01_Source Exports/Videos/Incoming`

Current waiting video source:

- `Samuel Kuo/Samuel Kuo-3-001.zip`
- 9.9 GB compressed
- 18 files inside: 11 MP4 and 7 JPG
- About 10.6 GB uncompressed
- Intake note: `docs/runs/video-intake-samuel-kuo.md`

The ZIP has since been extracted locally for inspection. Do not bulk-import the video batch until `make video-manifest` passes and 1-2 MP4 files pass preview/playback/download/storage checks.

Large video/audio files should use Shared Drive Incoming or local admin intake, then be imported/indexed by the DAM admin. Do not force large browser uploads through Cloudflare.
