# Team Beta Rights Playbook

Last updated: 2026-06-11

This playbook is for internal church beta testing only. ResourceSpace remains the rights source of truth. Google Shared Drive remains master-original custody. Portal review decisions may queue as pending writes and are not final until ResourceSpace confirms them.

Research source: `/Users/halim4pro/Downloads/deep-research-report.md`.

## Core Rule

When unsure, keep the asset in `Needs Review / Do Not Publish`. Do not use AI tags, preview quality, collection membership, public website presence, or raw `Approved Public` status as final reuse approval.

## Exact Rights States

| State | Meaning | Teammate action | Public/external use |
|---|---|---|---|
| `Draft Intake` | Contributor is building a packet. Nothing is approved. | Add source, owner, event, people/minors, rights, consent, proof, and reviewer notes. Use harmless beta samples only. | No. |
| `Needs Review / Do Not Publish` | Default import state or unresolved evidence state. | Do not publish. Reviewer checks source, rights, people/minors, usage scope, sensitive context, derivative, reviewer/date, and note. | No. |
| `Request More Info` | Reviewer needs contributor or source-owner context. | Contributor supplies missing source, permission, consent, event, ministry, proof link, or restriction details. | No. |
| `Possible Minors` or `People/minors unknown` | Children/youth may be visible or people visibility is not confirmed. | Treat as restricted. Reviewer needs consent/release basis or a documented exception before broad reuse. | No unless explicit reviewed exception exists. |
| `Sensitive ministry context` | Worship, baptism, footwashing, Holy Communion, sermon, music, prayer, pastoral/private, illness, grief, or private-setting context may be present. | Route to reviewer with the right domain owner: rights, doctrine/sacrament, music, RE, or pastoral sensitivity. | No until that review is documented. |
| `Approved Internal` | ResourceSpace says internal ministry use is approved. | Use only inside the stated internal scope and channel. Do not post publicly or treat as stock-safe. | No. |
| `Approved Public` | Raw ResourceSpace approval status. It is traceability, not automatic portal reuse. | Check portal blockers, usage guidance, reviewer/date, people/minors, rights, approved channels, required notices, and approved-copy availability. | Only if the portal also says `Portal Ready` and scope allows it. |
| `Needs Portal Review` or `Batch Approved With Blockers` | Raw approval exists, but portal policy still sees missing rights, people/minors, source, derivative, reviewer/date, channel, notice, or sensitive-context evidence. | Demo the blocker clearly. Do not download or reuse. Reviewer must resolve evidence first. | No. |
| `Portal Ready` | Computed portal state: source, rights, people/minors, reviewer/date, usage scope, sensitive context, approved channels, and approved-copy checks pass. | Accept download terms, record channel/reason, and use only within visible guidance. | Yes, within stated scope. |
| `Internal Ready` | Computed portal state for internal use. | Use only for internal ministry channels and within visible guidance. | No. |
| `Stock-safe` | Reuse tier for broad cross-ministry reuse after doctrine, rights, privacy, channel, and sensitivity checks pass. | Use as reusable library media within approved channels. | Yes if channel and territory allow. |
| `Context-safe` | Reuse tier for original event, church, series, audience, or channel only. | Keep tied to original context. Request review before repurposing. | Only for approved context/channel. |
| `Searchable Archive`, `Archive - Not Promoted`, `Archive Only`, or `Archive-only` | Traceable reference media, not promoted for reuse. | Searchable for history/context. Request review if someone needs reuse. | No. |
| `Do Not Use` | Rights, privacy, safety, doctrine, pastoral, or mission-alignment block. | Do not download, publish, package, or promote. Report immediately if UI makes it look usable. | No. |
| `Pending Review Write` | Portal queued a decision for ResourceSpace follow-up. | Treat as work-in-progress. Verify queued/synced/failed wording is honest. | No new use until source-of-truth state is confirmed. |
| `Sync Failed` or `Discrepancy Open` | Portal and source-of-truth state disagree, or writeback failed. | DAM Admin or reviewer resolves before reuse. | No. |

## Teammate QA Scenarios

### Viewer

1. Search for `Bible`.
2. Open one asset.
3. Say out loud whether it is usable, what scope is allowed, and what blocks reuse.
4. Try the download path on a blocked or `Needs portal review` asset.

Expected result: blocked assets explain the reason and do not download. `Approved Public` alone must not read as automatic permission.

### Contributor

1. Open Upload with harmless sample files or a safe source link.
2. Add photos, a folder, or a source link.
3. Confirm event name, date, ministry/team, and source/uploader. Optional requested use and suggested tags help reviewers prioritize but do not approve publishing.
4. Submit and confirm the response says `Needs Review / Do Not Publish`.

Expected result: upload never publishes and never claims reviewer approval.

### Reviewer

1. Open Review Queue.
2. Try Approve without evidence and a specific note.
3. Complete the evidence checklist and add a note.
4. Queue a decision.

Expected result: incomplete evidence returns blocked UI/API behavior. Complete evidence queues or syncs honestly. In beta, queued is not final ResourceSpace truth.

### DAM Admin

1. Confirm beta mode says SSO is not production auth.
2. Confirm live ResourceSpace writeback is disabled unless explicitly approved.
3. Confirm seed media is preview-only unless a reviewer signed off.
4. Confirm source paths, originals, checksums, and private URLs are not visible to Viewer/Contributor roles.

Expected result: admin can see readiness blockers; normal users cannot see source custody details.

## Research-Derived Appendix

The deep research report makes the beta rights script more TJC-specific than a generic DAM checklist. It adds these mandatory gates:

| Risk area | Research-derived gate | Product implication |
|---|---|---|
| Hymns 470-525 | No public livestream, upload, package, or export without channel validation, rights territory, and required notice logic. | Add hymn number, rights basis, approved channels, territory, and notice fields before music can become reusable. |
| Hymn and music derivatives | Custom arrangements, choir recordings, lyric decks, score visuals, and sermon clips with background music need source linkage and music-rights review. | Treat music rights as channel-specific, not a single copyright checkbox. |
| Sacrament and doctrine | Baptism, footwashing, Holy Communion, Sabbath, Holy Spirit, prayer in the Spirit, and church-identity assets need doctrine review before public release. | Add doctrine/sacrament theme and doctrine reviewer gate; block stock-safe status until reviewed. |
| Worship decorum | Worship media may require reverence-context review, editorial cropping/redaction, or channel restriction. | Public short-form/social reuse needs stricter review than internal service context. |
| RE and minors | Religious Education, youth, student spiritual convocation, class photos, and child-identifying captions default restricted until consent and visibility are confirmed. | Add RE review path, minors-present flag, consent/release record ID, and caption redaction checks. |
| Testimony and pastoral sensitivity | Testimonies involving illness, visions, intercession, spiritual battle, family conversion, prayer requests, or pastoral notes are not broad stock by default. | Add pastoral sensitivity review, testimony theme, redaction notes, and context-safe/archive-only default. |
| Public/member/internal visibility | Public on a TJC site does not mean all-channel reuse. Member/internal working content and archive custody need separate visibility. | Add public, member/internal, reviewer/admin, and archive visibility tiers. |
| Stock-safe/context-safe/archive-only | Broad reuse, original-context reuse, and preservation value are different states. | Add one required reuse tier before any asset leaves ingest. |
| Collection safety | Collection membership is not a permission boundary. | Evaluate every resource item-level before package, Brand Hub, or collection use. |
| Masters and derivatives | Masters must remain preserved; public/member derivatives must trace to parent masters and strip unsafe metadata. | Ordinary users get approved derivatives; master downloads stay archivist/admin only. |
| AI suggestions | AI may suggest descriptive metadata but cannot finalize rights, minors, doctrine, or sensitivity. | Keep `ai_*` sidecar suggestions separate from human-approved fields. |

## Missing Product Gates

These are still product gaps to track after beta, or before live writeback/public reuse:

1. `reuse_tier` is not yet a first-class required field in the current portal model.
2. Hymn number, hymn-rights basis, territory, approved channels, and required notice are not enforced by server policy.
3. Doctrine/sacrament review is detected through sensitive text and tags, not a typed reviewer workflow.
4. RE/minors consent is represented as people/minors risk and consent notes, not a traceable release record.
5. Testimony/pastoral sensitivity lacks a dedicated review owner and sensitivity taxonomy.
6. Public/member/internal/archive visibility is not fully separate from `publish_status` and `usage_scope`.
7. Review writeback can be enabled from checklist completion without proving all asset-derived blockers are resolved.
8. Production durable intake storage and ResourceSpace import/writeback mapping still need final configuration before live launch.

## Stop-And-Report Triggers

Report as P0 and stop the test if any of these occur:

- Viewer downloads a blocked, `Needs Review`, `Possible Minors`, archive-only, or `Do Not Use` asset.
- UI says ResourceSpace was updated when the decision only queued locally.
- Raw `Approved Public` appears to mean public reuse without portal readiness.
- Hymn 470-525, worship, sacrament, sermon, music, RE/minors, or contributor-uncertain media can be reused without documented review.
- A testimony or pastoral/private item is shown as stock-safe without sensitivity review.
- Original/master paths, private URLs, checksums, or source custody leak to Viewer or Contributor.
- Beta role switching is presented as production authentication.
- AI suggestions are presented as rights, people/minors, doctrine, or public-use approval.
