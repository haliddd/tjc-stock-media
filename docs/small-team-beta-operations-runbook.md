# Small-Team Beta Operations Runbook

Status: local/private beta operations only. This is not public launch proof.

## Invite Code Handling

Never put real invite codes in GitHub, Slack screenshots, PR bodies, docs, logs, screenshots, committed fixtures, or support transcripts. Use placeholders such as `<QUEENS_INVITE_CODE>` in written materials.

Invite codes are configured at runtime through `BETA_CHURCH_INVITE_CODES_JSON`. The value maps a church/location label to one or more private codes:

```json
{
  "Church or Location Name": ["<LOCATION_INVITE_CODE>"]
}
```

Viewer login does not require a church/location invite code. Contributor, Reviewer, and DAM Admin login require a configured invite code.

## Create Church-Location Invite Codes

1. Generate a long random code outside the repo.
2. Add it to the runtime secret manager or local `.env` only.
3. Add the church/location label and code to `BETA_CHURCH_INVITE_CODES_JSON`.
4. Restart the app runtime so the new env value is loaded.
5. Run `./scripts/portal-beta-invite-smoke.sh` against the configured runtime.
6. Share the code only through an approved private channel.

## Rotate A Code

1. Generate a replacement code outside the repo.
2. Add the replacement beside the current code for a short overlap window if testers need transition time.
3. Restart runtime.
4. Run invite smoke.
5. Privately notify testers.
6. Remove the old code from runtime config.
7. Restart runtime and rerun invite smoke.

## Revoke One Church Location

1. Remove that church/location entry from `BETA_CHURCH_INVITE_CODES_JSON`.
2. Restart runtime.
3. Run invite smoke for remaining configured locations.
4. Tell affected testers their access is paused.
5. Review recent `beta_auth_login` audit events for unexpected attempts.

## If A Code Leaks

1. Treat the code as revoked immediately.
2. Remove it from runtime config and restart runtime.
3. Generate a replacement if that location should continue testing.
4. Run invite smoke.
5. Check recent auth/audit logs for use after suspected leak time.
6. Do not paste the leaked value into incident notes; refer to it as `<REVOKED_INVITE_CODE>`.

## Operator Checklist

- `BETA_AUTH_ENABLED=1` only when persona passwords and invite codes are configured.
- `BETA_SESSION_SECRET` configured and not derived from placeholder values.
- `BETA_CHURCH_INVITE_CODES_JSON` has expected church/location entry count.
- Admin readiness shows only count/status, never raw invite code values.
- Hosted/current URL verified before sharing with real team members.
- Runtime storage limitations understood before collecting real feedback or review decisions.
