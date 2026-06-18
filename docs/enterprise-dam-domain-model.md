# Enterprise DAM Domain Model

Last updated: 2026-06-18

Purpose: freeze canonical language and field ownership for the Team Beta hardening run. This is a beta contract, not a claim that production DAM infrastructure is complete.

## System Boundary

| System | Role | Authority |
|---|---|---|
| Google Shared Drive | Master-original warehouse | Source custody, source folders, large media intake, preservation originals |
| ResourceSpace | DAM/search/review layer | DAM metadata/search/review reference, read-only beta source unless writeback is explicitly approved |
| Portal | Governed beta workbench | Role-filtered discovery, intake, review queue, package drafts, feedback, evidence views |
| Approved Public/Internal folders | Delivery outputs | Approved derivatives only, never complete archive/source custody |

## Core Records

| Record | Required fields | Notes |
|---|---|---|
| Asset | `asset_ref`, title, ministry/event, date or date status, media type, reuse tier, ingest status, rights status, publish status, delivery status, source custody ref, ResourceSpace ref when known | `asset_ref` is the portal-safe id. It must not expose source path or checksum. |
| Source custody ref | storage system, album/folder membership, original filename where permitted, checksum where permitted, restricted access flag | Viewer/Contributor must not receive raw source paths, private URLs, originals, checksums, or master custody internals. |
| Derivative ref | derivative id, rendition type, generated-from asset ref, approval state, delivery URL if safe | Approved derivatives are separate from originals. A derivative does not approve the asset by itself. |
| Review decision | reviewer, review date, usage scope, notes, evidence items, rights status, publish status, queued writeback state | Public/internal approval requires reviewer, date, usage scope, and notes. |
| Package draft | package id, owner, asset refs, purpose, requested scope, item safety state, draft status | Package membership never grants approval or download rights. |
| Reuse request | request id, requester, asset refs, purpose, channel, deadline, reviewer state | Request flow asks for review; it does not grant public reuse. |
| Saved search | saved-search id, owner, role, sanitized criteria, result count | Saved searches use sanitized fields only and respect role filters. |
| Audit event | event id, actor, role, action, target refs, timestamp, storage mode | Audit is evidence, not proof of ResourceSpace writeback. Local JSON is not durable production storage. |
| Feedback/incident | feedback id, severity, owner, state, incident flag, export state | Admin cockpit uses this for beta triage only. |

## Canonical Status Families

Do not collapse these into one label.

| Status family | Question answered | Example values |
|---|---|---|
| Ingest status | Has the portal received an intake packet? | Received, Needs Metadata, Needs Review, Imported Snapshot |
| Rights status | Do we know allowed use? | Unknown, Needs Evidence, Approved Internal, Approved Public, Restricted, Do Not Use |
| Publish status | What should users do now? | Do Not Publish, Needs Review, Internal Only, Public Approved, Archive Only |
| Delivery status | Can a derivative/download be delivered? | Blocked, Ticket Required, Approved Derivative Ready, Expired |
| ResourceSpace sync status | Has ResourceSpace changed? | Read Only, Queued, Disabled, Failed, Confirmed By Re-read |
| Storage durability status | How durable is portal state? | Local JSON, Snapshot, Durable KV/DB, Fail Closed |

## Invariants

- Every new/imported asset starts as `Needs Review / Do Not Publish`.
- Humans approve rights. AI suggestions are non-authoritative.
- Viewer and Contributor payloads must be redacted by default.
- ResourceSpace writeback remains disabled/queued unless Hali explicitly approves live writeback.
- Missing durable audit/ticket storage blocks unsafe downloads instead of allowing demo bypasses.
- Google Shared Drive remains master-original custody even when the portal shows previews or packages.
- No file, UI, API, or doc may claim production readiness, public approval, live ResourceSpace sync, durable archive, or safe download unless evidence proves it.
