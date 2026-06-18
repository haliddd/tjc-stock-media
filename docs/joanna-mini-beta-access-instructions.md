# Joanna Mini Beta Access Instructions

Status: prepared, do not send until Hali confirms hosted env and role credentials.

## URL

Candidate hosted URL: `https://tjc-stock-media.vercel.app`

## Roles To Test

- Viewer: browse/search/open detail only.
- Contributor: upload or submit a source-link intake packet; cannot review/admin; requires church invitation code.
- Reviewer/Joanna: review queue, approve/reject/archive/rights flag, metadata/tag edits where enabled; requires church invitation code.
- Admin: system status only; no secrets or source paths shown; requires church invitation code.

## Credential Handling

- No passwords, tokens, private URLs, API keys, or secret values belong in this repo.
- Hali should send Joanna role password and church invitation code through a private channel.
- Viewer credentials do not grant upload, review, admin, package draft, or recent-upload access.
- Contributor and above require a location-issued invite code from `BETA_CHURCH_INVITE_CODES_JSON`; this code authorizes beta entry for that location, but role gates still decide permissions.
- `.env.example` may list variable names and placeholders only.
- Real `.env` stays ignored.

## Joanna Test Path

1. Open candidate URL.
2. Log in as Reviewer/Joanna.
3. Search for Bible, worship, fellowship, nature/negative-space.
4. Open asset detail and inspect date/event/source/usage/rights.
5. Review pending queue.
6. Try approving only if evidence is sufficient; otherwise reject, archive, or flag rights issue.
7. Log out or switch role only if Hali provided separate role credentials.

## Do Not Do

- Do not forward URL or credentials.
- Do not upload video/audio.
- Do not treat approval as public launch approval.
- Do not use source/original download for normal roles.
- Do not paste credentials into feedback.
