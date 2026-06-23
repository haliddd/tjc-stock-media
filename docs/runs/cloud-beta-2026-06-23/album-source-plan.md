# Album Source Plan

Use albums as source/provenance collections, not public approval truth.

## What The Screenshot Shows

Visible album total is about 4,162 items, with one very large `Open Album` at 1,852 items. That is larger than the current ResourceSpace/admin baseline of 2,290 assets, so expect duplicates, unimported backlog, or albums outside the MVP import set.

## Recommended Data Source Model

| Layer | Source | Rule |
| --- | --- | --- |
| Original custody | Google Shared Drive / Google Photos export path | Master copy stays here; do not expose originals through portal |
| DAM/search/review | ResourceSpace cloud/staging | Source of truth for metadata, review state, thumbnails/previews |
| Portal front door | `https://tjc-stock-media.vercel.app` | Reads ResourceSpace API or honestly labeled cloud export snapshot |
| Beta workflow state | KV/Postgres/private storage | Feedback, queued writes, upload intake, audit |

Do not make the Vercel app read Google Photos albums directly. Use albums to seed ResourceSpace collections and `source_album` metadata.

## Album Priority

| Priority | Albums | Use |
| --- | --- | --- |
| P0 beta seed | `MVP 2024` (181) | Keep as first cloud beta sample because it matches existing local beta evidence |
| P1 structured backlog | `MVP 2021 - Albert Tan`, `Andrew Yu`, `Clara Tsai`, `Louise Chan`, `Michelle Lin`, `Piers Chiou` | Good provenance; import as named source albums with contributor/date metadata |
| P1 high-volume contributor batches | `Leanne Chu` (404), `Philemon Tsen` (330), `Gabriel Shen` (110), `Derrick Hwang` (93), `Paulina Tse` (89), `Ling Chen` (73) | Import in batches after checksum/duplicate audit |
| P2 year albums | `2007`, `2009`, `2010`, `2011`, `2012`, `2013`, `2014` | Useful for broad nature/travel coverage; still Needs Review by default |
| P2 small contributor batches | `Anthony Lin`, `Christopher Chen`, `Jackie Yu`, `Jason Chong`, `Jeffrey Lin`, `Jonathan Chen`, `Jonathan Chu`, `Joseph Kim`, `Liliana Chan Ventura`, `Melissa Wu`, `Michelle Lee`, `Samuel Kuo` | Import when contributor/source metadata can be recorded |
| Hold/split first | `Open Album` (1,852) | Too broad for beta; manifest and split by event/source/rights before import |
| Empty placeholders | `MVP 2021 - Sydney Chao`, `MVP 2025` | Keep as future placeholders; no import work |

## Minimum Album Manifest Fields

```csv
album_title,item_count,source_owner,year_or_event,source_url,source_path,import_priority,rights_status,people_risk,duplicate_audit_status,rs_collection_id,beta_include
```

Every imported album defaults to `Needs Review / Do Not Publish`. Exact duplicates can be linked by checksum, but keep every album membership and source path.

## Cloud Beta Data Source Call

For first real cloud team beta, use:

1. ResourceSpace cloud/staging API if ready.
2. If API is not ready, a ResourceSpace cloud export snapshot labeled with timestamp/source.
3. No direct Google Photos/Drive browser reads.
4. No `Open Album` bulk launch until it is split and audited.
