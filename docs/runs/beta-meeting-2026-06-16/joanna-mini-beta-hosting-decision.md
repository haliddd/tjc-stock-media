# Joanna Mini Beta Hosting Decision

Date: 2026-06-16

## Decision

Selected temporary path: existing protected Vercel portal candidate, `https://tjc-stock-media.vercel.app`, plus export-backed/local beta data until a no-cash VM is available.

Reason: Azure Student and Oracle Free Tier require human-owned cloud account steps. Existing Vercel path already exists, can be probed read-only, and does not require DNS, paid hosting, production data mutation, or source media mutation.

## Cost Status

- Vercel candidate: free/existing, pending Hali account/env confirmation.
- Azure Student VM: credit-backed only if Hali confirms available credit and no spending-limit change.
- Oracle Free Tier: blocked unless capacity exists and no paid upgrade/card-charge path is required.
- ResourceSpace cloud: paid-option note only, not selected.

## Human-Owned Account Steps

Hali or deployment owner must confirm without sharing secrets:

1. Stable URL is the intended test URL.
2. Hosted env has beta auth enabled and no public open signup.
3. `RESOURCESPACE_ENABLE_WRITEBACK=0`.
4. `RESOURCESPACE_WRITEBACK_MODE=queued`.
5. Beta passwords are set in host env only, not repo.
6. No `NEXT_PUBLIC_` secret values exist.

## Hosted Checks Allowed Now

Allowed:

```bash
BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-readonly-probe
```

Blocked without explicit Hali approval:

```bash
BASE_URL=https://tjc-stock-media.vercel.app make portal-hosted-smoke
BASE_URL=https://tjc-stock-media.vercel.app make portal-writeback-guard-smoke
```

## Status

Hosted path selected with limitations. Do not send Joanna link until Checkpoint B read-only access proof and role credentials are confirmed.
