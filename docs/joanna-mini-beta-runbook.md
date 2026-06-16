# Joanna Mini Beta Runbook

Status: beta ready with limitations pending hosted role confirmation.

## Scope

Photo-only Joanna mini beta. Not public launch. Not broad internal beta. Not full archive import.

## Hosted Location

- Candidate hosted URL: `https://tjc-stock-media.vercel.app`
- Selected no-cash path: existing protected Vercel portal.
- Cost dependency: existing/free unless Hali changes hosting. No paid VM, DNS, or ResourceSpace Cloud action approved.
- Current caveat: hosted URL is not proven to contain the newest local portal changes. Redeploy before sharing with Joanna.
- Hosted approved-copy downloads require durable audit/ticket storage. Without that storage, production download fails closed with `audit-required`.

## Local Start

```bash
npm --prefix frontend run dev -- -H 127.0.0.1 -p 4867
```

Then open `http://localhost:4867`.

Local dev mode allows `.runtime/` audit/ticket writes for private beta testing. Use this for download workflow proof.

## Local Production Start

```bash
PORTAL_ALLOW_BETA_ROLE_OVERRIDE=1 NEXT_PUBLIC_LOCAL_BETA_ROLE_SWITCH=1 npm --prefix frontend run start -- --port 4869 --hostname 127.0.0.1
```

Then open `http://127.0.0.1:4869`.

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
BETA_CHURCH_INVITE_CODES_JSON='{"Queens NY":"private-code","Brooklyn NY":"private-code"}'
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
