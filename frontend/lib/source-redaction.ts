import { canReview } from "@/lib/permissions";
import { containsOperationalText, containsScaffoldText, safePublicList } from "@/lib/public-text-safety";
import type { CatalogCollection, DemoRole, MediaSourceStatus, SavedViewSummary, SearchResult, StockMediaAsset } from "@/lib/types";

function canSeeOperationalSource(role: DemoRole) {
  return canReview(role);
}

function canSeePrivateSourceFiles(role: DemoRole) {
  return role === "DAM Admin";
}

export const sourceCustodyAssetKeys = [
  "checksum",
  "checksum_sha256",
  "checksumSha256",
  "duplicateGroup",
  "duplicateRole",
  "masterDrivePath",
  "originalFilename",
  "source_album",
  "source_path",
  "sourceFolder",
  "sourceAlbumMemberships",
  "sourceAlbumPath",
  "sourcePath"
] satisfies ReadonlyArray<keyof StockMediaAsset>;

export const publicHiddenAssetKeys = [
  "approvalRecheckDate",
  "church",
  "consentExpirationDate",
  "controlledVocabularySource",
  "doctrineSacramentTheme",
  "duplicateSimilarityHint",
  "embargoDate",
  "expirationDate",
  "fileSizeBytes",
  "hymnNumberOrTitle",
  "importBatch",
  "language",
  "masterCustodyPathStatus",
  "pendingReviewWrite",
  "publicationTitle",
  "publishDate",
  "region",
  "religiousEducationLevel",
  "resource_space_id",
  "resourceSpaceId",
  "review_status",
  "reviewedBy",
  "reviewed_by",
  "reviewedAt",
  "reviewed_at",
  "reuseDecision",
  "reviewer",
  "rights_status",
  "rightsExpirationDate",
  "sermonTitle",
  "source_album",
  "sourceAlbum",
  "sourceAccount",
  "sourcePlatform",
  "sourceSystem",
  "syncSource",
  "sync_source",
  "suggestedTags",
  "testimonyTheme",
  "versionOrEdition",
  "withdrawalStatus",
  "approvedForPublic",
  "approved_for_public",
  "approvedForInternal",
  "approved_for_internal",
  "lastSyncedAt",
  "last_synced_at",
  "workflowState"
] satisfies ReadonlyArray<keyof StockMediaAsset>;

function omitAssetKeys(asset: StockMediaAsset, keys: ReadonlyArray<keyof StockMediaAsset>): StockMediaAsset {
  const payload = { ...asset };
  for (const key of keys) {
    delete payload[key];
  }
  return payload;
}

function omitDownloadImageUrl(asset: StockMediaAsset): StockMediaAsset {
  if (!asset.imageUrls || !("download" in asset.imageUrls)) return asset;
  const { download: _download, ...imageUrls } = asset.imageUrls;
  return { ...asset, imageUrls };
}

function safeSavedViewText(value: string) {
  return safeNormalRoleBrowseText(value)
    .replace(/ResourceSpace-approved/gi, "Library-approved")
    .replace(/ResourceSpace publish status/gi, "approval state")
    .replace(/ResourceSpace ID/gi, "reference code")
    .replace(/API mapping/gi, "review setup")
    .replace(/launch gate/gi, "readiness check")
    .replace(/metadata health/gi, "record readiness")
    .replace(/raw totals?/gi, "library totals")
    .replace(/diagnostics?/gi, "readiness notes")
    .replace(/source[- ]of[- ]truth/gi, "record source")
    .replace(/field refs?/gi, "required details")
    .replace(/source path/gi, "restricted access")
    .replace(/master drive/gi, "media library")
    .replace(/master\/original path/gi, "protected-file access")
    .replace(/master files?/gi, "protected files")
    .replace(/original filename/gi, "file reference")
    .replace(/checksum/gi, "file check")
    .replace(/exported/gi, "recorded")
    .replace(/metadata/gi, "details")
    .replace(/derivatives?/gi, "approved copies")
    .replace(/renditions?/gi, "approved copies");
}

export function safeNormalRoleBrowseText(value = "") {
  return value
    .replace(/ResourceSpace/gi, "media library")
    .replace(/Shared Drive/gi, "media library")
    .replace(/source[- ]system/gi, "review system")
    .replace(/pending writes?/gi, "review queue")
    .replace(/writeback/gi, "review update")
    .replace(/\b(synced|syncing|sync)\b/gi, "review update")
    .replace(/\b(published|publishing|publish)\b/gi, "shared")
    .replace(/publication(s)?/gi, "bulletin$1")
    .replace(/downloadable/gi, "copy-ready")
    .replace(/downloaded|downloading|downloads?/gi, "copy request")
    .replace(/Approved Public/gi, "Ready with permission")
    .replace(/public[- ]approved/gi, "permission-checked")
    .replace(/Public Use/gi, "Church-wide use")
    .replace(/Public safe/gi, "Permission checked")
    .replace(/public[- ]use/gi, "church-wide use")
    .replace(/\bpublic\b/gi, "church-wide");
}

const publicSavedViewIds = new Set([
  "approved-church-wide",
  "batch-approved-blockers",
  "website-hero",
  "sermon-slides",
  "newsletter",
  "social-media",
  "no-people",
  "people-unknown",
  "children-youth-review",
  "recently-approved",
  "needs-review",
  "archive-only"
]);

function canExposeSavedView(role: DemoRole, view: SavedViewSummary) {
  if (canSeeOperationalSource(role)) return true;
  if (role === "Contributor" && view.id === "internal-ministry") return true;
  return publicSavedViewIds.has(view.id);
}

export function sourceForRole(role: DemoRole, source: MediaSourceStatus): MediaSourceStatus {
  if (canSeeOperationalSource(role)) return source;
  return {
    adapter: "media-library",
    label: "Media library",
    detail: "Use approved copies and request review when a media record is not cleared.",
    readOnly: true
  };
}

export function assetForRolePayload(role: DemoRole, asset: StockMediaAsset): StockMediaAsset {
  const downloadSafeAsset = omitDownloadImageUrl(asset);
  if (canSeePrivateSourceFiles(role)) return downloadSafeAsset;
  const roleSafeAsset = omitAssetKeys(downloadSafeAsset, sourceCustodyAssetKeys);

  if (canSeeOperationalSource(role)) {
    return roleSafeAsset;
  }

  const safeAsset = omitAssetKeys(roleSafeAsset, publicHiddenAssetKeys);
  const {
    collection,
    eventName,
    rightsNotes,
    tags,
    thumbnailAlt,
    title,
    tjcTerms,
    usageTerms
  } = safeAsset;

  return {
    ...safeAsset,
    title: containsScaffoldText(title) || containsOperationalText(title) ? "Media record" : title,
    thumbnailAlt: containsScaffoldText(thumbnailAlt) || containsOperationalText(thumbnailAlt) ? "Media preview" : thumbnailAlt,
    collection: containsScaffoldText(collection) || containsOperationalText(collection) ? "Media library" : collection,
    eventName: containsScaffoldText(eventName) || containsOperationalText(eventName) ? undefined : eventName,
    tags: safePublicList(tags),
    tjcTerms: safePublicList(tjcTerms),
    usageTerms: safePublicList(usageTerms),
    rightsNotes: containsOperationalText(rightsNotes) ? undefined : rightsNotes
  };
}

export function savedViewForRolePayload(role: DemoRole, view: SavedViewSummary): SavedViewSummary {
  if (canSeeOperationalSource(role)) return view;
  return {
    ...view,
    label: safeNormalRoleBrowseText(view.label),
    description: safeSavedViewText(view.description),
    reason: safeSavedViewText(view.reason)
  };
}

export function savedViewsForRolePayload(role: DemoRole, views: SavedViewSummary[]): SavedViewSummary[] {
  return views.filter((view) => canExposeSavedView(role, view)).map((view) => savedViewForRolePayload(role, view));
}

export function catalogCollectionForRolePayload(role: DemoRole, collection: CatalogCollection): CatalogCollection {
  if (canSeeOperationalSource(role)) return collection;
  return {
    ...collection,
    name: safeNormalRoleBrowseText(collection.name),
    description: safeNormalRoleBrowseText(collection.description),
    countLabel: safeNormalRoleBrowseText(collection.countLabel),
    dateRange: safeNormalRoleBrowseText(collection.dateRange),
    ministry: safeNormalRoleBrowseText(collection.ministry),
    approvalSummary: safeNormalRoleBrowseText(collection.approvalSummary),
    peopleWarning: collection.peopleWarning ? safeNormalRoleBrowseText(collection.peopleWarning) : undefined,
    searchQuery: safeNormalRoleBrowseText(collection.searchQuery)
  };
}

export function catalogCollectionsForRolePayload(role: DemoRole, collections: CatalogCollection[]): CatalogCollection[] {
  return collections.map((collection) => catalogCollectionForRolePayload(role, collection));
}

export function catalogDiscoveryForRolePayload(role: DemoRole, discovery: SearchResult["discovery"]): SearchResult["discovery"] {
  if (canSeeOperationalSource(role)) return discovery;
  return {
    ...discovery,
    summary: safeNormalRoleBrowseText(discovery.summary),
    matchedIntent: discovery.matchedIntent ? {
      ...discovery.matchedIntent,
      label: safeNormalRoleBrowseText(discovery.matchedIntent.label),
      description: safeNormalRoleBrowseText(discovery.matchedIntent.description),
      safetyNote: safeNormalRoleBrowseText(discovery.matchedIntent.safetyNote)
    } : undefined,
    intentPresets: discovery.intentPresets.map((preset) => ({
      ...preset,
      label: safeNormalRoleBrowseText(preset.label),
      description: safeNormalRoleBrowseText(preset.description)
    })),
    suggestedFilters: discovery.suggestedFilters.map((filter) => ({
      ...filter,
      label: safeNormalRoleBrowseText(filter.label)
    })),
    noResultHelp: discovery.noResultHelp ? {
      ...discovery.noResultHelp,
      title: safeNormalRoleBrowseText(discovery.noResultHelp.title),
      guidance: safeNormalRoleBrowseText(discovery.noResultHelp.guidance),
      querySuggestions: discovery.noResultHelp.querySuggestions.map((term) => safeNormalRoleBrowseText(term)),
      filters: discovery.noResultHelp.filters.map((filter) => ({
        ...filter,
        label: safeNormalRoleBrowseText(filter.label)
      })),
      savedViews: discovery.noResultHelp.savedViews.map((view) => ({
        ...view,
        label: safeNormalRoleBrowseText(view.label)
      }))
    } : undefined,
    scoreHint: safeNormalRoleBrowseText(discovery.scoreHint),
    rankingExplanation: discovery.rankingExplanation.map((item) => ({
      label: safeNormalRoleBrowseText(item.label),
      detail: safeNormalRoleBrowseText(item.detail)
    })),
    safetyNote: safeNormalRoleBrowseText(discovery.safetyNote)
  };
}
