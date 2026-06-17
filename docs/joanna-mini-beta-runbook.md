# Joanna Mini Beta Runbook

Status: small-team beta not ready; hosted/team beta remains NO-GO until production-mode browser QA/download audit behavior is explicitly accepted as hosted fail-closed or durable storage is proven, current hosted URL exposes the June 17+ build marker, real login/invite codes work, real content counts are verified, and durable hosted runtime state or fail-closed tester instructions are documented.

## June 17 Override

Latest local proof is `docs/runs/evidence/2026-06-17/small-team-beta-readiness-pass.md`.

- Local trusted-header route/browser-surface smoke passed on `http://localhost:4871`.
- Local route, upload, review, library, download-ticket, invite-smoke, typecheck, tests, and build passed.
- Latest production-mode local browser QA report is red on 2 download audit probes because audit writes fail closed without durable runtime storage.
- Hosted protected URL was rechecked read-only on 2026-06-17, but `/api/beta-auth/session` did not expose the June 17 build readiness contract, so hosted/current proof failed.
- Real beta login/invite-code flow was not proven without trusted headers.
- Real expected content counts, including 181 approved photos plus pending/unapproved media, were not proven.
- Hosted runtime persistence was not proven.

June 17 16:04 EDT update:

- Hosted/current proof now passes after Vercel production deployment `dpl_DSakz1GSaViJGeyBxVwAwB9HkFND`.
- Real beta-session login now passes for Viewer, Contributor, Reviewer, and DAM Admin. Contributor and above use the church/location invite-code path.
- Private owner credential handoff is `.runtime/beta-credentials-2026-06-17.env`; do not commit or paste those values.
- Hosted feedback persistence/Admin visibility passes.
- Hosted blocked download fails closed with `503 audit-required`; this is the intended Joanna default unless durable audit/ticket storage is later approved and proven.
- Hosted content remains demo fallback: 16 total records, 12 raw approved, 2 needs review, 1 archive, 1 portal ready. This is not the expected 181 approved photos plus pending/unapproved beta content.

Do not send Joanna or team invites from this runbook until those hosted gates are renewed.

## Scope

Photo-only Joanna mini beta. Not public launch. Not broad internal beta. Not full archive import.

## Hosted Location

- Candidate hosted URL: `https://tjc-stock-media.vercel.app`
- Selected no-cash path: existing protected Vercel portal.
- Cost dependency: existing/free unless Hali changes hosting. No paid VM, DNS, or ResourceSpace Cloud action approved.
- Current caveat: hosted URL is protected and current, but hosted content source is demo fallback rather than the expected real beta content.
- Hosted approved-copy downloads require durable audit/ticket storage. Without that storage, production download fails closed with `audit-required`.
- Recovery default: hosted downloads stay intentionally disabled/fail-closed for Joanna unless Hali approves durable hosted storage and the hosted download-ticket smoke passes. Tester instructions must call this out plainly.

## Local Start

```bash
cd frontend
SSO_TRUSTED_HEADERS=1 PORTAL_ALLOW_BETA_ROLE_OVERRIDE=0 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=0 DOWNLOAD_GATE_ALLOW_DEMO_ROLES=0 npm run dev
```

Then open `http://localhost:4871` unless a run-specific command says otherwise.

Local dev mode allows `.runtime/` audit/ticket writes for private beta testing. Use this for download workflow proof.

## Local Production Start

```bash
PORTAL_ALLOW_BETA_ROLE_OVERRIDE=1 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=1 npm --prefix frontend run start -- --port 4869 --hostname 127.0.0.1
```

Then open the port chosen by the run-specific command.

Production mode blocks local filesystem stateful writes unless durable runtime storage is configured. Browse/search/detail should work; download ticket mint/consume will fail closed without durable audit/ticket storage.

## Build Note

Standard build:

```bash
npm --prefix frontend run build
```

Local clean builds on Next 15.5.19 may need a temporary generated-chunk mirror while building because the server runtime can request root `frontend/.next/server/*.js` chunks that are generated under `frontend/.next/server/chunks/`.

## Local Stop

Stop dev server with `Ctrl-C` in its terminal.

## Local Restart

Stop, then run start command again.

## Docker ResourceSpace

```bash
make up
make down
make restart
```

Use only for local ResourceSpace MVP testing. Do not mutate production/prd data.

## Runtime State

- Upload/review/audit beta files: `.runtime/`
- Audit JSONL: `.runtime/audits/`
- Runtime exports: `.runtime/exports/`
- Runtime filestore previews/derivatives: `.runtime/filestore/`
- Frontend build output: `frontend/.next/`

These are ignored and must not be committed.

## Manual Backup

```bash
make backup
```

Current limitation: local backup/restore proof may exist, but hosted durable backup/restore is not proven for Joanna mini beta unless Hali confirms hosted storage.

## Restore Check

```bash
make restore-test
```

Do not run destructive restore against production/prd or shared source media.

## Access Roles

- Viewer: browse/search/detail.
- Contributor: upload/intake only; requires church invitation code.
- Reviewer/Joanna: review queue and metadata decisions; requires church invitation code.
- Admin: readiness/status without secrets; requires church invitation code.

Contributor/reviewer/admin access must come from protected beta auth or trusted identity. No public open signup. For beta-auth login, Contributor and above also require a location-issued code from `BETA_CHURCH_INVITE_CODES_JSON`; Viewer remains view-only and never receives contributor controls. Invite code authorizes beta entry for that church location only; existing role gates remain authoritative.

Invite code config uses a JSON map:

```bash
BETA_CHURCH_INVITE_CODES_JSON='{"Queens NY":"<QUEENS_INVITE_CODE>","Brooklyn NY":"<BROOKLYN_INVITE_CODE>"}'
```

Do not commit real invite codes.

## What Not To Do Without Hali Approval

- Paid hosting, card charges, spending-limit changes.
- DNS changes.
- Production env changes.
- Public publishing.
- Hosted mutating smokes.
- Live ResourceSpace writeback.
- Source media rename/move/delete/edit.
- Push to GitHub remote.

## Known Limitations

- Hosted durable state not independently proven in this run.
- ResourceSpace export/API unavailable in June 16 count report; local fallback data may stand in.
- Review writeback is queued/pending, not live ResourceSpace truth.
- LM Photos from `lm.photo@tjc.org` are treated as TJC-owned/public-ready locally by runtime overlay; about 10% remain status holdouts for test rounds.
- Approved derivative download works in local dev with audit/ticket storage. Hosted/production download fails closed until durable audit/ticket storage is configured.
