import {
  assetHasRenditionGap,
  assetHasTaxonomyDrift,
  assetIsApproved,
  assetIsDuplicateCandidate,
  assetIsPortalReady,
  assetMetadataHealth,
  assetNeedsAiEnrichment,
  assetNeedsReview,
  assetNeedsStaleApprovalReview,
  buildDuplicateGroupCounts
} from "@/lib/asset-governance";
import {
  collectionDefinitions,
  includesAny,
  matchesCatalogQuery,
  savedViewDefinitions
} from "@/lib/catalog-language";
import { collectionImageUrl } from "@/lib/presentation";
import { canReview } from "@/lib/permissions";
import { assetForRolePayload } from "@/lib/source-redaction";
import type { CatalogCollection, DemoRole, MetadataHealthSummary, OperationalInsight, SavedViewSummary, StockMediaAsset, ZeroResultInsight } from "@/lib/types";

export function buildSavedViews(assets: StockMediaAsset[]): SavedViewSummary[] {
  return savedViewDefinitions.map((view) => ({
    id: view.id,
    label: view.label,
    description: view.description,
    reason: view.reason,
    count: assets.filter(view.match).length
  }));
}

function dateRangeFor(assets: StockMediaAsset[]) {
  const dates = assets
    .flatMap((asset) => [asset.eventDate, asset.capturedDate, asset.reviewedDate, asset.importDate])
    .filter(Boolean)
    .sort() as string[];
  if (!dates.length) return "Date not available";
  const first = dates[0]?.slice(0, 4);
  const last = dates.at(-1)?.slice(0, 4);
  return first && last && first !== last ? `${first}-${last}` : first || "Recently updated";
}

function approvalSummary(assets: StockMediaAsset[]) {
  const approved = assets.filter(assetIsApproved).length;
  const internal = assets.filter((asset) => asset.status === "Approved Internal").length;
  const review = assets.filter(assetNeedsReview).length;
  if (!assets.length) return "0 approved / 0 review";
  if (review) return `${approved} approved / ${review} review`;
  if (internal) return `${approved} approved / ${internal} internal`;
  return `${approved} approved assets`;
}

export function buildCollections(assets: StockMediaAsset[], role: DemoRole): CatalogCollection[] {
  const approvedOrInternal = assets.filter(assetIsApproved);
  return collectionDefinitions.map((definition) => {
    const matching = approvedOrInternal.filter((asset) => includesAny(asset, definition.terms));
    const warning = matching.some((asset) => asset.peopleRisk === "Possible minors")
      ? "Contains children/youth review items"
      : matching.some((asset) => asset.peopleRisk === "Adults visible")
        ? "People visible in some assets"
        : undefined;
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      count: matching.length,
      countLabel: `${matching.length.toLocaleString()} asset${matching.length === 1 ? "" : "s"}`,
      dateRange: dateRangeFor(matching),
      ministry:
        canReview(role)
          ? matching.find((asset) => asset.eventName)?.eventName || definition.description
          : definition.description,
      approvalSummary: approvalSummary(matching),
      peopleWarning: warning,
      searchQuery: definition.searchQuery,
      viewId: definition.id,
      images: matching
        .slice(0, 5)
        .map((asset) => {
          const payload = assetForRolePayload(role, asset);
          return { src: collectionImageUrl(payload, role), alt: payload.thumbnailAlt || "Media preview" };
        })
        .filter((image): image is { src: string; alt: string } => Boolean(image.src))
    };
  });
}

export function buildMetadataHealth(assets: StockMediaAsset[]): MetadataHealthSummary {
  const health = assets.map(assetMetadataHealth);
  const averageScore = health.length ? Math.round(health.reduce((sum, item) => sum + item.score, 0) / health.length) : 0;
  return {
    averageScore,
    complete: health.filter((item) => item.state === "Complete").length,
    needsSource: health.filter((item) => item.missing.includes("source")).length,
    needsPeople: health.filter((item) => item.missing.includes("people")).length,
    needsRights: health.filter((item) => item.missing.includes("rights")).length,
    needsUsage: health.filter((item) => item.missing.includes("usage")).length,
    reviewPending: health.filter((item) => item.missing.includes("review")).length
  };
}

export function buildZeroResultInsights(assets: StockMediaAsset[]): ZeroResultInsight[] {
  const probes = [
    {
      query: "website hero",
      savedViewId: "website-hero",
      recommendation: "Map hero language to the Website hero saved view instead of plain keyword search."
    },
    {
      query: "no people",
      savedViewId: "no-people",
      recommendation: "Require people-risk metadata during intake; otherwise no-people assets cannot be trusted."
    },
    {
      query: "children",
      savedViewId: "children-youth-review",
      recommendation: "Route children/youth terms to the reviewer queue and block public download until approval."
    },
    {
      query: "needs review",
      savedViewId: "needs-review",
      recommendation: "Use review-state fields instead of free text for operational searches."
    },
    {
      query: "public safe",
      savedViewId: "portal-ready",
      recommendation: "Translate public-safe intent to Portal Ready, not raw approval status."
    }
  ];

  return probes
    .map((probe) => {
      const savedView = savedViewDefinitions.find((view) => view.id === probe.savedViewId);
      const rawCount = assets.filter((asset) => matchesCatalogQuery(asset, probe.query)).length;
      return {
        query: probe.query,
        rawCount,
        savedViewCount: savedView ? assets.filter(savedView.match).length : 0,
        savedViewId: probe.savedViewId,
        recommendation: probe.recommendation
      };
    })
    .filter((item) => item.savedViewCount > 0 && (item.rawCount === 0 || item.rawCount < item.savedViewCount));
}

export function buildOperationalInsights(assets: StockMediaAsset[]): OperationalInsight[] {
  const portalReady = assets.filter(assetIsPortalReady).length;
  const peopleUnknown = assets.filter((asset) => !asset.peopleRisk || asset.peopleRisk === "Unknown").length;
  const aiEnrichment = assets.filter(assetNeedsAiEnrichment).length;
  const taxonomyDrift = assets.filter(assetHasTaxonomyDrift).length;
  const renditionGaps = assets.filter(assetHasRenditionGap).length;
  const staleApprovals = assets.filter((asset) => assetNeedsStaleApprovalReview(asset)).length;
  const duplicateGroupCounts = buildDuplicateGroupCounts(assets);
  const duplicateCandidates = assets.filter((asset) => assetIsDuplicateCandidate(asset, duplicateGroupCounts)).length;

  return [
    {
      id: "portal-ready",
      label: "Portal ready",
      value: portalReady,
      detail: "Approved Public assets with strong metadata, no children/youth warning, and required preview/download fields.",
      tone: portalReady ? "ok" : "warn",
      savedViewId: "portal-ready"
    },
    {
      id: "people-unknown",
      label: "People unknown",
      value: peopleUnknown,
      detail: "People/minors visibility is not confirmed. Reviewer should verify before public use.",
      tone: peopleUnknown ? "warn" : "ok",
      savedViewId: "people-unknown"
    },
    {
      id: "ai-enrichment",
      label: "Needs enrichment",
      value: aiEnrichment,
      detail: "Missing useful tags, TJC terms, dimensions, usage guidance, or people visibility metadata.",
      tone: aiEnrichment ? "info" : "ok",
      savedViewId: "ai-enrichment"
    },
    {
      id: "taxonomy-drift",
      label: "Taxonomy drift",
      value: taxonomyDrift,
      detail: "Generic titles or sparse tags that make discovery weaker.",
      tone: taxonomyDrift ? "info" : "ok",
      savedViewId: "taxonomy-drift"
    },
    {
      id: "rendition-gaps",
      label: "Rendition gaps",
      value: renditionGaps,
      detail: "Missing derivative URL or image dimension metadata needed for confident reuse.",
      tone: renditionGaps ? "warn" : "ok",
      savedViewId: "rendition-gaps"
    },
    {
      id: "duplicate-candidates",
      label: "Duplicate cleanup",
      value: duplicateCandidates,
      detail: "Potential duplicates need canonical/derivative decisions.",
      tone: duplicateCandidates ? "info" : "ok",
      savedViewId: "duplicate-candidates"
    },
    {
      id: "stale-approval",
      label: "Stale approval",
      value: staleApprovals,
      detail: "Approved assets reviewed more than 180 days ago.",
      tone: staleApprovals ? "info" : "ok",
      savedViewId: "stale-approvals"
    }
  ];
}
