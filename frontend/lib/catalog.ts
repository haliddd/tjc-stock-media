import { decideAccess } from "@/lib/access-decisions";
import {
  assetHasRenditionGap,
  buildDuplicateGroupCounts,
  assetIsApproved,
  assetNeedsReview,
  countAssetGovernance
} from "@/lib/asset-governance";
import {
  assetHaystack,
  collectionDefinitions,
  includesAny,
  intentDefinitions,
  matchesCatalogFilter,
  normalizeCatalogSort,
  savedViewDefinitions,
  viewAliases
} from "@/lib/catalog-language";
import { scopedCatalogAssetsForRole } from "@/lib/catalog-scope";
import {
  buildCollections,
  buildMetadataHealth,
  buildOperationalInsights,
  buildSavedViews,
  buildZeroResultInsights
} from "@/lib/catalog-summaries";
import { assetResourceRef } from "@/lib/asset-refs";
import { buildCatalogDiscovery, discoveryScore, matchesDiscoveryQuery } from "@/lib/catalog-discovery";
import { getActiveMediaSource } from "@/lib/media-source";
import { listPendingReviewWrites } from "@/lib/pending-review-writes";
import { safeBoundedInt } from "@/lib/persisted-record-safety";
import { assetWithRoleImageUrls } from "@/lib/presentation";
import { assetMatchesReviewQueue, missingReviewFields, reviewQueues, reviewRiskFlags, type ReviewQueueId } from "@/lib/workflow-policy";
import type { DemoRole, SearchResult, StockMediaAsset } from "@/lib/types";

export function normalizeSavedViewId(view?: string) {
  if (!view) return undefined;
  return viewAliases.get(view) || view;
}

export function isKnownSavedViewId(view?: string) {
  const normalized = normalizeSavedViewId(view);
  return Boolean(normalized && savedViewDefinitions.some((item) => item.id === normalized));
}

export function isKnownCollectionId(collection?: string) {
  return Boolean(collection && collectionDefinitions.some((item) => item.id === collection));
}

function matchSearchIntent(query: string) {
  const normalized = query.trim().toLowerCase().replace(/\s+/g, " ");
  if (!normalized) return undefined;
  for (const intent of intentDefinitions) {
    if (intent.terms.some((term) => normalized === term)) {
      return { rawQuery: query, matchedView: intent.view, confidence: intent.confidence };
    }
  }
  return { rawQuery: query, confidence: "none" as const };
}

function matchesFilters(asset: StockMediaAsset, filters: string[]) {
  return filters.every((filter) => matchesCatalogFilter(asset, filter));
}

function statusWeight(asset: StockMediaAsset) {
  if (asset.status === "Approved Public") return 0;
  if (asset.status === "Approved Internal") return 1;
  if (asset.status === "Needs Review") return 2;
  if (asset.status === "Possible Minors") return 3;
  if (asset.status === "Searchable Archive") return 4;
  return 5;
}

function sortCatalogAssets(assets: StockMediaAsset[], sort?: string) {
  const normalized = normalizeCatalogSort(sort);
  const sorted = [...assets];
  if (normalized === "A-Z") {
    return sorted.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, {
        numeric: true,
        sensitivity: "base"
      })
    );
  }
  if (normalized === "Newest") {
    return sorted.sort((a, b) => (b.capturedDate || b.importDate || b.id || "").localeCompare(a.capturedDate || a.importDate || a.id || "", undefined, { numeric: true }));
  }
  if (normalized === "Recently approved") {
    return sorted.sort((a, b) => (b.reviewedDate || "").localeCompare(a.reviewedDate || ""));
  }
  sorted.sort((a, b) => statusWeight(a) - statusWeight(b) || curatedWeight(b) - curatedWeight(a) || a.title.localeCompare(b.title));
  return diversifyAssets(sorted);
}

function curatedWeight(asset: StockMediaAsset) {
  const terms = assetHaystack(asset);
  let score = 0;
  if (asset.tags?.length || asset.tjcTerms?.length) score += 8;
  if (terms.includes("bible")) score += 28;
  if (terms.includes("worship")) score += 18;
  if (terms.includes("fellowship")) score += 16;
  if (terms.includes("flower")) score += 14;
  if (terms.includes("plant")) score += 12;
  if (terms.includes("fountain")) score += 12;
  if (terms.includes("water")) score += 8;
  if (terms.includes("stage")) score += 8;
  return score;
}

function diversityKey(asset: StockMediaAsset) {
  const haystack = assetHaystack(asset);
  if (haystack.includes("bible") || haystack.includes("scripture")) return "bible";
  if (haystack.includes("flower") || haystack.includes("plant") || haystack.includes("seasonal")) return "details";
  if (haystack.includes("fellowship") || haystack.includes("welcome")) return "fellowship";
  if (haystack.includes("graphic") || haystack.includes("slide") || haystack.includes("stage")) return "graphics";
  if (haystack.includes("water") || haystack.includes("fountain")) return "water";
  return asset.collection || asset.mediaType;
}

function diversifyAssets(assets: StockMediaAsset[]) {
  const buckets = new Map<string, StockMediaAsset[]>();
  assets.forEach((asset) => {
    const key = diversityKey(asset);
    buckets.set(key, [...(buckets.get(key) || []), asset]);
  });
  const keys = [...buckets.keys()].sort((a, b) => (buckets.get(b)?.length || 0) - (buckets.get(a)?.length || 0));
  const diversified: StockMediaAsset[] = [];
  let cursor = 0;
  while (diversified.length < assets.length && keys.length) {
    const key = keys[cursor % keys.length];
    const bucket = buckets.get(key);
    const next = bucket?.shift();
    if (next) diversified.push(next);
    if (!bucket?.length) keys.splice(cursor % keys.length, 1);
    else cursor += 1;
  }
  return diversified;
}

function collectionMatches(asset: StockMediaAsset, collectionId?: string) {
  if (!collectionId) return true;
  const definition = collectionDefinitions.find((item) => item.id === collectionId);
  if (!definition) return false;
  return assetIsApproved(asset) && includesAny(asset, definition.terms);
}

export async function searchAssets({
  role,
  query,
  filters,
  view,
  collection,
  sort,
  limit = 72,
  offset = 0
}: {
  role: DemoRole;
  query: string;
  filters: string[];
  view?: string;
  collection?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}): Promise<SearchResult> {
  const { assets, status } = await getActiveMediaSource();
  const scopedAssets = scopedCatalogAssetsForRole(role, assets, status);
  const safeLimit = safeBoundedInt(limit, { min: 1, max: 120, fallback: 72 });
  const safeOffset = safeBoundedInt(offset, { min: 0, max: Number.MAX_SAFE_INTEGER, fallback: 0 });
  const roleVisible = scopedAssets.filter((asset) => decideAccess(role, "viewAsset", asset).allowed);
  const intent = !view && !collection ? matchSearchIntent(query) : undefined;
  const selectedViewId = normalizeSavedViewId(view) || intent?.matchedView;
  const selectedView = savedViewDefinitions.find((item) => item.id === selectedViewId);
  const selectedCollection = collectionDefinitions.find((item) => item.id === collection);
  const effectiveQuery = intent?.matchedView ? "" : query;
  const visible = roleVisible
    .filter((asset) => (selectedView ? selectedView.match(asset) : true))
    .filter((asset) => collectionMatches(asset, collection))
    .filter((asset) => matchesDiscoveryQuery(asset, effectiveQuery))
    .filter((asset) => matchesFilters(asset, filters));
  const sorted = effectiveQuery.trim()
    ? [...visible].sort((a, b) => discoveryScore(b, effectiveQuery) - discoveryScore(a, effectiveQuery) || statusWeight(a) - statusWeight(b) || a.title.localeCompare(b.title))
    : sortCatalogAssets(visible, sort);

  const counts = countAssetGovernance(roleVisible);
  const pagedAssets = sorted.slice(safeOffset, safeOffset + safeLimit);
  const rendered = pagedAssets.length;
  const rangeStart = sorted.length && rendered ? safeOffset + 1 : 0;
  const rangeEnd = sorted.length && rendered ? safeOffset + rendered : 0;

  return {
    assets: pagedAssets.map((asset) => assetWithRoleImageUrls(asset, role)),
    total: sorted.length,
    pagination: {
      offset: safeOffset,
      limit: safeLimit,
      rangeStart,
      rangeEnd,
      hasPrevious: safeOffset > 0,
      hasNext: safeOffset + rendered < sorted.length,
      previousOffset: Math.max(safeOffset - safeLimit, 0),
      nextOffset: safeOffset + safeLimit
    },
    source: status,
    counts: {
      ...counts,
      rawTotal: scopedAssets.length,
      matching: sorted.length,
      rendered,
      currentlyShown: rendered,
      totalMatching: sorted.length,
      totalRendered: rendered
    },
    metadataHealth: buildMetadataHealth(roleVisible),
    appliedIntent:
      intent || selectedCollection
        ? {
            rawQuery: query,
            matchedView: selectedViewId,
            matchedCollection: selectedCollection?.id,
            confidence: intent?.confidence || (selectedCollection ? "exact" : "none")
          }
        : undefined,
    discovery: buildCatalogDiscovery({
      query: effectiveQuery,
      view: selectedViewId,
      collection,
      filters,
      matchedAssets: sorted,
      availableAssets: roleVisible,
      totalVisible: roleVisible.length
    }),
    zeroResultInsights: buildZeroResultInsights(roleVisible),
    operationalInsights: buildOperationalInsights(roleVisible),
    savedViews: buildSavedViews(roleVisible),
    collections: buildCollections(roleVisible, role)
  };
}

export async function getAssetRecordById(id: string, role?: DemoRole) {
  const { assets, status } = await getActiveMediaSource();
  const scopedAssets = role ? scopedCatalogAssetsForRole(role, assets, status) : assets;
  return { asset: scopedAssets.find((item) => item.id === id) || null, source: status };
}

export async function getAssetById(id: string, role?: DemoRole) {
  const { assets, status } = await getActiveMediaSource();
  const scopedAssets = role ? scopedCatalogAssetsForRole(role, assets, status) : assets;
  return { asset: scopedAssets.find((item) => item.id === id) || null, source: status, related: getRelatedAssets(scopedAssets, id) };
}

export function getRelatedAssets(assets: StockMediaAsset[], id: string) {
  const asset = assets.find((item) => item.id === id);
  if (!asset) return [];
  return assets
    .filter((item) => item.id !== id)
    .filter(assetIsApproved)
    .filter((item) => item.collection === asset.collection || includesAny(item, [...(asset.tags || []), ...(asset.tjcTerms || [])].slice(0, 4)))
    .sort((a, b) => statusWeight(a) - statusWeight(b) || curatedWeight(b) - curatedWeight(a))
    .slice(0, 8);
}

export async function getReviewQueue(role: DemoRole, queueId: ReviewQueueId = "pending") {
  const { assets, status } = await getActiveMediaSource();
  const canReview = decideAccess(role, "viewReviewQueue").allowed;
  const duplicateGroupCounts = buildDuplicateGroupCounts(assets);
  const pendingWriteResourceIds = new Set(
    listPendingReviewWrites()
      .filter((record) => !["cancelled", "superseded", "synced_to_resourcespace"].includes(record.syncState))
      .map((record) => record.resourceId)
  );
  const hasPendingReviewWrite = (asset: StockMediaAsset) => pendingWriteResourceIds.has(assetResourceRef(asset));
  const matchesQueue = (asset: StockMediaAsset, id: ReviewQueueId) => assetMatchesReviewQueue(asset, id, duplicateGroupCounts) || (id === "pending" && hasPendingReviewWrite(asset));
  const reviewable = canReview
    ? assets
        .filter((asset) => hasPendingReviewWrite(asset) || reviewQueues.some((queue) => assetMatchesReviewQueue(asset, queue.id, duplicateGroupCounts)))
        .sort((a, b) => reviewRiskFlags(b, duplicateGroupCounts).length - reviewRiskFlags(a, duplicateGroupCounts).length || statusWeight(a) - statusWeight(b) || a.title.localeCompare(b.title))
    : [];
  const selected = reviewable.filter((asset) => matchesQueue(asset, queueId));
  const reviewCounts = countAssetGovernance(reviewable);
  const allCounts = countAssetGovernance(assets);
  return {
    assets: selected.slice(0, 80).map((asset) => assetWithRoleImageUrls(asset, role)),
    allAssets: reviewable.slice(0, 120).map((asset) => assetWithRoleImageUrls(asset, role)),
    source: status,
    governance: {
      pendingReview: reviewable.filter((asset) => matchesQueue(asset, "pending")).length,
      childrenYouth: reviewCounts.childrenYouth,
      missingSource: reviewCounts.missingSource,
      rightsReview: reviewCounts.rightsReview,
      approvedThisMonth: allCounts.approvedThisMonth,
      archiveCandidates: reviewable.filter((asset) => assetMatchesReviewQueue(asset, "archive-candidates", duplicateGroupCounts)).length,
      duplicateCandidates: reviewable.filter((asset) => assetMatchesReviewQueue(asset, "duplicate-candidates", duplicateGroupCounts)).length,
      aiEnrichment: reviewable.filter((asset) => assetMatchesReviewQueue(asset, "ai-enrichment", duplicateGroupCounts)).length,
      taxonomyDrift: reviewable.filter((asset) => assetMatchesReviewQueue(asset, "taxonomy-drift", duplicateGroupCounts)).length,
      renditionGaps: reviewable.filter(assetHasRenditionGap).length,
      staleApprovals: reviewable.filter((asset) => assetMatchesReviewQueue(asset, "stale-approvals", duplicateGroupCounts)).length,
      missingRequiredFields: reviewable.filter((asset) => missingReviewFields(asset).length > 0).length
    },
    queues: reviewQueues.map((queue) => ({
      id: queue.id,
      label: queue.label,
      description: queue.description,
      count: reviewable.filter((asset) => matchesQueue(asset, queue.id)).length
    }))
  };
}
