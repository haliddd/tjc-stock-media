# DAM Product Parity Matrix

Date: 2026-06-18

| DAM capability | Brandfolder / Pics.io / ResourceSpace pattern | Current app gap | V3 beta-safe implementation | Files changed | Risk | Acceptance screenshot |
|---|---|---|---|---|---|---|
| Asset browser | Visual grid, folder/collection rail, faceted search, inspector | Library was shell/policy/card first | Top browser bar, left rail, media grid, right inspector | `frontend/components/dam/enterprise/LibraryPage.tsx`, `EnterpriseShared.tsx`, `frontend/app/dam-senior-staff.css` | Medium: visual refactor only | Browser QA library screenshots |
| Collections | Collections, sections, labels, public/private collections | Collection data exists but feels like demo navigation | Left rail exposes collections as primary DAM navigation | Same as above | Low | Library screenshot |
| Saved searches | Pinned searches and durable saved views | Saved views exist but were secondary | Save view control in browser topbar; saved views remain in rail | `LibraryPage.tsx` | Low: storage still local/draft | Library screenshot |
| Faceted search | Fielded filters for status, rights, type, date, channel, people | Filters were generic and hidden behind panels | Rail groups real DAM facets; mobile filter drawer retained | `EnterpriseShared.tsx`, CSS | Low | Library screenshot |
| Selection | Multi-select and bulk edit/export workflows | Selection existed but was not product spine | Selected count in topbar and bulk command tray remain visible when active | `LibraryPage.tsx`, CSS | Low | Library selected-state screenshot |
| Asset cards | Thumbnail, one status, checkbox, hover actions | Cards acted like miniature policy dashboards | Thumbnail-first card with one status marker and compact metadata | `EnterpriseShared.tsx`, CSS | Medium: visual clarity | Library grid screenshot |
| Inspector | Preview, metadata, rights, collections, renditions, activity | Inspector repeated trust/copy panels | Compact decision list, rendition summary, DAM tabs | `EnterpriseShared.tsx`, `enterprise-metadata.ts` | Low | Library inspector screenshot |
| Asset record tabs | Overview, metadata, rights, renditions, versions, activity | Tabs were keywords/comments/activity shaped | V3 tab names and rendition/version rows | `asset-record-workbench.ts`, `enterprise-metadata.ts` | Low | Detail screenshot |
| Renditions | Original, web, social, thumb, print/video conversion states | Renditions were mostly hidden diagnostics | Inspector and metadata rows show rendition states without enabling unsafe downloads | `EnterpriseShared.tsx`, `enterprise-metadata.ts` | Low | Inspector/detail screenshot |
| Versioning | Version history, duplicate/replacement visibility | Versioning was diagnostic/admin flavored | Versions row model exposes original, derivatives, duplicate group | `enterprise-metadata.ts` | Low | Detail screenshot |
| Review proofing | Queue, preview, comments, evidence, decision | Review opened with dashboard metrics and taxonomy overload | Removed top triage/samples; queue-preview-evidence layout | `ReviewPage.tsx`, CSS | Medium: workflow layout | Review screenshot |
| Delivery | Portals, packages, share links, expiry, password, terms | Package builder still reads like internal draft | Not fully implemented in this slice; remains V3-05 blocker | Not changed | Medium | Pending |
| Admin | Tables/checklists/logs/storage identity truth | Admin still card/KPI heavy | Not fully implemented in this slice; documented as V3-06 blocker | Docs only | Medium | Pending |
| Storage | Durable audit/tickets/packages/searches | Mostly local runtime files or hosted blocked | Architecture blocker documented; no beta claim | `docs/local-prototype-to-beta-architecture.md` | High | Admin/evidence pending |
| Identity | Real users/groups/SSO/audit actor integrity | Demo role and local overrides remain | Architecture blocker documented; no beta claim | Docs | High | Admin/evidence pending |

## Final Call

This run improves the local prototype spine. It does **not** make the app beta-ready.

Required final wording:

```text
Local prototype only. Not beta-ready.
```
