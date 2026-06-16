import { canReview } from "@/lib/permissions";
import { containsOperationalText, containsScaffoldText, safePublicList } from "@/lib/public-text-safety";
import type { DemoRole, MediaSourceStatus, SavedViewSummary, StockMediaAsset } from "@/lib/types";

function canSeeOperationalSource(role: DemoRole) {
  return canReview(role);
}

function canSeePrivateSourceFiles(role: DemoRole) {
  return role === "DAM Admin";
}

export const sourceCustodyAssetKeys = [
  "checksumSha256",
  "duplicateGroup",
  "duplicateRole",
  "masterDrivePath",
  "originalFilename",
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
  "resourceSpaceId",
  "reuseDecision",
  "reviewer",
  "rightsExpirationDate",
  "sermonTitle",
  "sourceAlbum",
  "sourceAccount",
  "sourcePlatform",
  "sourceSystem",
  "suggestedTags",
  "testimonyTheme",
  "versionOrEdition",
  "withdrawalStatus",
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
  return value
    .replace(/ResourceSpace-approved/gi, "Library-approved")
    .replace(/ResourceSpace publish status/gi, "approval state")
    .replace(/ResourceSpace ID/gi, "reference code")
    .replace(/ResourceSpace/gi, "media library")
    .replace(/Shared Drive/gi, "media library")
    .replace(/pending writes?/gi, "review queue")
    .replace(/API mapping/gi, "review setup")
    .replace(/launch gate/gi, "readiness check")
    .replace(/metadata health/gi, "record readiness")
    .replace(/raw totals?/gi, "library totals")
    .replace(/diagnostics?/gi, "readiness notes")
    .replace(/source[- ]of[- ]truth/gi, "record source")
    .replace(/field refs?/gi, "required details")
    .replace(/source path/gi, "source access")
    .replace(/master drive/gi, "media library")
    .replace(/master\/original path/gi, "source-file access")
    .replace(/master files?/gi, "source files")
    .replace(/original filename/gi, "file reference")
    .replace(/checksum/gi, "file check")
    .replace(/exported/gi, "recorded")
    .replace(/metadata/gi, "details")
    .replace(/derivatives?/gi, "approved copies")
    .replace(/renditions?/gi, "approved copies");
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
    description: safeSavedViewText(view.description),
    reason: safeSavedViewText(view.reason)
  };
}

export function savedViewsForRolePayload(role: DemoRole, views: SavedViewSummary[]): SavedViewSummary[] {
  return views.filter((view) => canExposeSavedView(role, view)).map((view) => savedViewForRolePayload(role, view));
}
