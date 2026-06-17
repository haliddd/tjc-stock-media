import { decideAccess } from "@/lib/access-decisions";
import { assetNeedsRightsReview } from "@/lib/asset-governance";
import { normalizeAssetTitle, usageLabel, shortStatusLabel } from "@/lib/display";
import { canReview } from "@/lib/permissions";
import { statusToUserLabel, usageScopeToUserLabel } from "@/lib/resourcespace-schema";
import { buildReuseDecision, canPreviewAsset, metadataConfidence } from "@/lib/reuse-policy";
import { missingReviewFields, reviewRiskFlags } from "@/lib/workflow-policy";
import type { DemoRole, StockMediaAsset } from "@/lib/types";

function redactRestrictedMetadata(asset: StockMediaAsset, hideResourceSpaceId = false): StockMediaAsset {
  const {
    checksumSha256: _checksumSha256,
    fileSizeBytes: _fileSizeBytes,
    masterDrivePath: _masterDrivePath,
    originalFilename: _originalFilename,
    sourceAlbumPath: _sourceAlbumPath,
    sourcePath: _sourcePath,
    ...safeAsset
  } = asset;
  if (!hideResourceSpaceId) return safeAsset;
  const { resourceSpaceId: _resourceSpaceId, ...viewerSafeAsset } = safeAsset;
  return viewerSafeAsset;
}

export function imageUrlForRole(url: string | undefined, role?: DemoRole) {
  if (!url || !role) return url;
  const hashIndex = url.indexOf("#");
  const base = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : url.slice(hashIndex);
  const [pathname, query = ""] = base.split("?");
  const params = new URLSearchParams(query);
  params.set("role", role);
  return `${pathname}?${params.toString()}${hash}`;
}

function assetMetadataForRole(asset: StockMediaAsset, role: DemoRole): StockMediaAsset {
  if (decideAccess(role, "viewOriginalMetadata", asset).allowed) return asset;
  return redactRestrictedMetadata(asset, role === "Viewer");
}

export function assetWithRoleImageUrls(asset: StockMediaAsset, role: DemoRole): StockMediaAsset {
  const roleSafeAsset = assetMetadataForRole(asset, role);
  const reuseDecision = buildReuseDecision(asset);
  if (!canPreviewAsset(asset, role)) {
    return {
      ...roleSafeAsset,
      reuseDecision,
      thumbnail: "",
      preview: undefined,
      imageUrls: undefined
    };
  }
  return {
    ...roleSafeAsset,
    reuseDecision,
    thumbnail: imageUrlForRole(asset.thumbnail, role) || asset.thumbnail,
    preview: imageUrlForRole(asset.preview, role),
    imageUrls: asset.imageUrls
      ? {
          small: imageUrlForRole(asset.imageUrls.small, role) || asset.imageUrls.small,
          card: imageUrlForRole(asset.imageUrls.card, role) || asset.imageUrls.card,
          collection: imageUrlForRole(asset.imageUrls.collection, role) || asset.imageUrls.collection,
          detail: imageUrlForRole(asset.imageUrls.detail, role) || asset.imageUrls.detail
        }
      : undefined
  };
}

export function cardImageUrl(asset: StockMediaAsset, role?: DemoRole) {
  if (role && !canPreviewAsset(asset, role)) return undefined;
  return imageUrlForRole(asset.imageUrls?.card || asset.preview || asset.thumbnail, role);
}

export function collectionImageUrl(asset: StockMediaAsset, role?: DemoRole) {
  if (role && !canPreviewAsset(asset, role)) return undefined;
  return imageUrlForRole(asset.imageUrls?.collection || asset.preview || asset.thumbnail, role);
}

export function detailImageUrl(asset: StockMediaAsset, role?: DemoRole) {
  if (role && !canPreviewAsset(asset, role)) return undefined;
  return imageUrlForRole(asset.imageUrls?.detail || asset.preview || asset.thumbnail, role);
}

export function assetDisplayTitle(asset: StockMediaAsset) {
  return normalizeAssetTitle(asset.title, asset.originalFilename, asset);
}

export function provenanceSummary(asset: StockMediaAsset, role: DemoRole) {
  const opsView = canReview(role);
  const source = asset.sourceAccount || (opsView ? asset.sourceSystem : undefined) || asset.collection || (opsView ? "ResourceSpace" : "Media archive");
  const origin = asset.eventName || asset.sourcePlatform || asset.collection;
  const adminDecision = decideAccess(role, "viewOriginalMetadata", asset);
  return {
    source,
    origin,
    publicLabel: [source, origin].filter(Boolean).join(" - "),
    technicalPath: adminDecision.allowed ? asset.sourcePath || asset.masterDrivePath || "Source path not exported" : undefined
  };
}

export function downloadState(asset: StockMediaAsset, role: DemoRole) {
  const approved = decideAccess(role, "downloadApprovedCopy", asset);
  const original = decideAccess(role, "downloadOriginal", asset);
  const reuse = buildReuseDecision(asset);
  return {
    approvedCopy: approved,
    originalMaster: original,
    cardLabel: approved.allowed ? "copy" : "blocked",
    panelLabel: approved.allowed ? approved.label || "Download approved web copy" : approved.reason || reuse.summary || "Not downloadable yet.",
    reuse
  };
}

export function guidanceFacts(asset: StockMediaAsset, role: DemoRole) {
  const canDownload = decideAccess(role, "downloadApprovedCopy", asset).allowed;
  const context = Array.from(new Set([...(asset.usageTerms || []), ...(asset.tjcTerms || []), ...(asset.tags || [])])).slice(0, 3).join(", ") || asset.collection;
  return [
    {
      label: "Best used for",
      value: canDownload ? bestUseCopy(asset) : "Reference only until a reviewer approves public or internal ministry use."
    },
    {
      label: "Please avoid",
      value:
        asset.peopleRisk === "Possible minors"
          ? "Do not post publicly, crop tightly, or share on social before children/youth visibility is reviewed."
          : "Do not crop in a way that removes worship, ministry, or event context."
    },
    { label: "Caption suggestion", value: `${assetDisplayTitle(asset)}${context ? ` - ${context}` : ""}` },
    {
      label: "Credit requirement",
      value: asset.rightsNotes?.toLowerCase().includes("credit") ? asset.rightsNotes : "Credit not required unless noted by reviewer."
    },
    {
      label: "Ministry sensitivity",
      value:
        asset.peopleRisk === "Possible minors"
          ? "Review before public sharing if children/youth are visible."
          : unknownReviewCopy(asset.sensitiveContext) === "Unknown - reviewer should confirm before public use"
            ? "Unknown - reviewer should confirm ministry sensitivity before public use."
            : asset.sensitiveContext || "Use respectfully and keep ministry context intact."
    }
  ];
}

function unknownReviewCopy(value?: string) {
  if (!value || value === "Unknown") return "Unknown - reviewer should confirm before public use";
  return value;
}

export function confidenceStates(asset: StockMediaAsset) {
  const confidence = metadataConfidence(asset);

  return [
    {
      key: "source",
      label: "Source",
      state: confidence.source === "verified" ? "Source verified" : "Source missing",
      tone: confidence.source === "verified" ? "ok" : "warn"
    },
    {
      key: "people",
      label: "People/minors",
      state:
        confidence.peopleMinors === "children_youth_possible"
          ? "Children/youth possible"
          : confidence.peopleMinors === "reviewed"
            ? "People/minors reviewed"
            : "Unknown - reviewer should confirm before public use",
      tone: confidence.peopleMinors === "reviewed" ? "ok" : "warn"
    },
    {
      key: "rights",
      label: "Rights",
      state:
        confidence.rights === "approved"
          ? "Rights approved"
          : confidence.rights === "review_required"
            ? "Rights review required"
            : "Unknown - reviewer should confirm before public use",
      tone: confidence.rights === "approved" ? "ok" : "warn"
    },
    {
      key: "usage",
      label: "Usage",
      state: confidence.usageGuidance === "present" ? "Usage guidance present" : "Usage guidance missing",
      tone: confidence.usageGuidance === "present" ? "ok" : "warn"
    },
    {
      key: "review",
      label: "Review",
      state: confidence.review === "complete" ? "Review complete" : "Review pending",
      tone: confidence.review === "complete" ? "ok" : "warn"
    }
  ] as const;
}

function bestUseCopy(asset: StockMediaAsset) {
  const terms = [...(asset.usageTerms || []), ...(asset.tjcTerms || []), ...(asset.tags || [])].join(" ").toLowerCase();
  if (terms.includes("social")) return "Social media, event recap, and internal ministry updates when approval allows.";
  if (terms.includes("slide") || terms.includes("sermon")) return "Sermon slides, presentation backgrounds, Bible study decks, and worship visuals.";
  if (terms.includes("newsletter")) return "Newsletter, website article, ministry update, and internal recap.";
  if (asset.peopleRisk === "No people") return "Website hero, newsletter, worship slides, and design backgrounds.";
  return "Newsletter, worship slides, website article, internal recap, and ministry reports.";
}

export function trustFacts(asset: StockMediaAsset, role: DemoRole) {
  const provenance = provenanceSummary(asset, role);
  const reuse = buildReuseDecision(asset);
  const opsView = canReview(role);
  return [
    { label: opsView ? "ResourceSpace status" : "Approval state", value: statusToUserLabel(asset.status) },
    { label: opsView ? "Portal reuse state" : "Use guidance state", value: `${reuse.label} - ${reuse.summary}` },
    { label: "Usage scope", value: usageScopeToUserLabel(asset.usageScope) },
    { label: "DAM filename", value: asset.damFilenames?.web || asset.damFilenames?.original || "Generated at delivery" },
    { label: "Source / provenance", value: provenance.publicLabel },
    { label: "Reviewer", value: asset.reviewer && asset.reviewedDate ? `${asset.reviewer} - ${asset.reviewedDate}` : "Review pending" },
    { label: "People/minors", value: unknownReviewCopy(asset.peopleRisk) },
    { label: "Rights", value: assetNeedsRightsReview(asset) ? "Unknown - reviewer should confirm before public use" : unknownReviewCopy(asset.rightsStatus || asset.rightsNotes || "Rights review pending") }
  ];
}

export function reviewFacts(asset: StockMediaAsset) {
  return {
    riskFlags: reviewRiskFlags(asset),
    missingFields: missingReviewFields(asset),
    reviewLine: asset.reviewer && asset.reviewedDate ? `Reviewed ${asset.reviewedDate} by ${asset.reviewer}` : "Review status pending",
    statusHistory: [
      asset.workflowState || "ResourceSpace workflow state pending",
      asset.reviewedDate ? `Reviewed ${asset.reviewedDate}` : "Awaiting reviewer decision",
      asset.status
    ]
  };
}

export function assetPresentation(asset: StockMediaAsset, role: DemoRole) {
  const title = assetDisplayTitle(asset);
  const quickTerms = Array.from(new Set([...(asset.usageTerms || []), ...(asset.tjcTerms || []), ...(asset.tags || [])])).slice(0, 2);
  return {
    title,
    shortStatus: shortStatusLabel(asset.status),
    fullStatus: statusToUserLabel(asset.status),
    usage: usageLabel(asset.usageScope),
    cardSubtitle: asset.eventName || asset.collection,
    quickLabel: quickTerms[0] || asset.peopleRisk || asset.mediaType,
    image: cardImageUrl(asset, role),
    detailImage: detailImageUrl(asset, role),
    download: downloadState(asset, role),
    trustFacts: trustFacts(asset, role),
    confidence: confidenceStates(asset),
    guidanceFacts: guidanceFacts(asset, role),
    reviewFacts: reviewFacts(asset)
  };
}
