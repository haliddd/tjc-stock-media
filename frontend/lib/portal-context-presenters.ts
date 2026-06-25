import { assetRecordRef, assetType, displayTitle, formatBytes, recordIdLabel, sourceTruthLabel } from "@/lib/enterprise-display";
import type { EnterpriseStatus } from "@/lib/enterprise-status";
import { assetEnterpriseStatus } from "@/lib/enterprise-status";
import { metadataValue, rightsRestrictionRows, type MetadataRow } from "@/lib/enterprise-metadata";
import type { BrandKitGovernance } from "@/lib/brand-kit-governance";
import type { PackageGovernancePacket } from "@/lib/package-governance";
import { buildPortalReuseDecision, type PortalReuseDecisionPacket } from "@/lib/portal-reuse-decision";
import type { DemoRole, MediaSourceStatus, ReuseState, StockMediaAsset } from "@/lib/types";

export type AssetCardPresenter = {
  approvalLabel: string;
  betaVisibilityLabel: string;
  reuseAnswerLabel: string;
  sourceLabel: string;
  tagLabels: string[];
};

export type AssetDetailPresenter = {
  packet: PortalReuseDecisionPacket;
  approved: boolean;
  status: EnterpriseStatus;
  canUseTitle: string;
  canUseSummary: string;
  canUseReason: string;
  primaryActionLabel: string;
  requestReviewLabel: string;
  summaryFacts: string[];
  sourceRows: MetadataRow[];
  confidenceRows: MetadataRow[];
  rightsRows: MetadataRow[];
  objectRows: AssetTruthObjectRow[];
  renditionRows: AssetTruthObjectRow[];
};

export type ReviewPresenter = {
  nextAction: string;
  nextDetail: string;
  betaVisibility: string;
  reuseAnswer: string;
  detailRows: MetadataRow[];
  evidenceTableRows: Array<[string, string, string, string]>;
};

export type AssetDetailPresenterOptions = {
  relatedCount?: number;
};

export type AssetTruthObjectRow = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "ready" | "review" | "restricted" | "info";
};

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function compactValue(value?: string) {
  return value && !/^(not provided|unknown|none|n\/a)$/i.test(value.trim()) ? value : "";
}

function safeCollection(asset: StockMediaAsset) {
  return compactValue(asset.collection) || "Media library";
}

export function betaVisibilityLabel(assetOrAllowed?: StockMediaAsset | boolean | null) {
  if (typeof assetOrAllowed === "boolean") return assetOrAllowed ? "Visible in beta" : "Hidden from beta";
  if (!assetOrAllowed) return "Visibility unknown";
  if (assetOrAllowed.visibilityTier === "archive" || assetOrAllowed.status === "Do Not Use") return "Hidden from beta";
  return "Visible in beta";
}

export function reuseAnswerLabel(state: ReuseState) {
  if (state === "portal-ready" || state === "internal-ready") return "Reuse approved";
  if (state === "blocked-archive" || state === "blocked-do-not-use") return "Blocked from reuse";
  return "Needs review before reuse";
}

function cardApprovalLabel(state: ReuseState) {
  return reuseAnswerLabel(state);
}

function useSummary(packet: PortalReuseDecisionPacket, reuse = packet.reuse) {
  if (reuse.state === "portal-ready") return "Approved copy is ready for scoped derivative use.";
  if (reuse.state === "internal-ready") return "Reuse is approved for internal ministry scope.";
  if (reuse.state === "blocked-archive") return "Kept for reference; not for public delivery.";
  if (reuse.state === "blocked-do-not-use") return "Not available for reuse.";
  return "Reviewer action needed before reuse or download.";
}

function useReason(packet: PortalReuseDecisionPacket, reuse = packet.reuse) {
  if (reuse.state === "portal-ready" || reuse.state === "internal-ready") return "Use approved copies and keep source files protected.";
  if (reuse.summary) return reuse.summary;
  return packet.viewerVerdict.reason;
}

export function presentAssetCardContext(asset: StockMediaAsset, role: DemoRole): AssetCardPresenter {
  const packet = buildPortalReuseDecision(asset, role);
  const tagLabels = unique([
    betaVisibilityLabel(asset),
    reuseAnswerLabel(packet.reuse.state),
    compactValue(asset.usageScope),
    compactValue(asset.peopleRisk),
    ...(asset.tjcTerms || []),
    ...(asset.tags || [])
  ]).filter((tag) => !/stock media candidate|mvp 2024|unknown/i.test(tag)).slice(0, 3);

  return {
    approvalLabel: cardApprovalLabel(packet.reuse.state),
    betaVisibilityLabel: betaVisibilityLabel(asset),
    reuseAnswerLabel: reuseAnswerLabel(packet.reuse.state),
    sourceLabel: safeCollection(asset),
    tagLabels
  };
}

function objectToneFromReady(ready: boolean, fallback: AssetTruthObjectRow["tone"] = "info") {
  return ready ? "ready" : fallback;
}

function sourceFileLabel(asset: StockMediaAsset, role: DemoRole) {
  if (role === "DAM Admin" && asset.originalFilename) return "Source file recorded";
  if (role === "DAM Admin") return "Source file not exported";
  return "Restricted source/master";
}

function sourceFileDetail(asset: StockMediaAsset, role: DemoRole) {
  if (role === "DAM Admin" && asset.originalFilename) return asset.originalFilename;
  if (role === "DAM Admin") return "Original filename is not present in the current asset payload.";
  return "Original/master access stays request-only and audited.";
}

function releaseValue(asset: StockMediaAsset) {
  if (asset.consentReleaseRecordId) return "Release evidence on file";
  if (asset.peopleRisk === "No people") return "Not required by people status";
  return "Needs review";
}

function releaseDetail(asset: StockMediaAsset, role: DemoRole) {
  if (asset.consentReleaseRecordId && role !== "Viewer") return `Release reference ${asset.consentReleaseRecordId}`;
  if (asset.consentReleaseRecordId) return "Release record exists; private evidence stays hidden.";
  if (asset.peopleRisk === "No people") return "No visible people are recorded for this asset.";
  return "Attach or verify consent/release evidence before public reuse.";
}

function buildAssetObjectRows(asset: StockMediaAsset, role: DemoRole, source?: MediaSourceStatus | null, relatedCount = 0): AssetTruthObjectRow[] {
  const reuse = asset.reuseDecision;
  const canUse = reuse?.state === "portal-ready" || (role !== "Viewer" && reuse?.state === "internal-ready");
  const hasPreview = Boolean(asset.thumbnail || asset.preview || asset.imageUrls?.card || asset.imageUrls?.detail);
  const hasFileDetails = Boolean(asset.fileExtension || asset.imageDimensions || asset.fileSizeBytes);
  const collection = safeCollection(asset);
  return [
    {
      id: "asset",
      label: "Asset",
      value: displayTitle(asset),
      detail: `${asset.status} / ${asset.usageScope}`,
      tone: canUse ? "ready" : "review"
    },
    {
      id: "file",
      label: "File",
      value: hasFileDetails ? [assetType(asset), asset.imageDimensions, formatBytes(asset.fileSizeBytes)].filter((item) => item && item !== "Not provided").join(" / ") : "File details not exported",
      detail: asset.capturedDate || asset.eventDate || asset.importDate || "Date not recorded in current export.",
      tone: objectToneFromReady(hasFileDetails)
    },
    {
      id: "version",
      label: "Version",
      value: asset.pendingReviewWrite ? "Pending review write" : "Current record",
      detail: asset.pendingReviewWrite ? `Queued state: ${asset.pendingReviewWrite.syncState}` : "Version history is not exported in this local detail payload.",
      tone: asset.pendingReviewWrite ? "review" : "info"
    },
    {
      id: "rendition",
      label: "Rendition",
      value: reuse?.state === "portal-ready" || reuse?.state === "internal-ready" ? "Approved copy gate ready" : hasPreview ? "Preview only" : "Request/export needed",
      detail: reuse?.allowedRenditions?.length ? `Allowed approved copy: ${reuse.allowedRenditions.join(", ")}` : "No approved downloadable rendition is exposed to this role.",
      tone: reuse?.downloadable ? "ready" : hasPreview ? "review" : "restricted"
    },
    {
      id: "crop",
      label: "Crop",
      value: asset.damFilenames?.social || asset.damFilenames?.thumb ? "Crop filename reserved" : "No crop exported",
      detail: asset.damFilenames?.social || "Create social/story/thumbnail crops through approved export workflow when needed.",
      tone: asset.damFilenames?.social || asset.damFilenames?.thumb ? "info" : "review"
    },
    {
      id: "source-file",
      label: "Source file",
      value: sourceFileLabel(asset, role),
      detail: sourceFileDetail(asset, role),
      tone: role === "DAM Admin" && asset.originalFilename ? "info" : "restricted"
    },
    {
      id: "related-file",
      label: "Related file",
      value: relatedCount ? `${relatedCount.toLocaleString()} related` : "None exposed",
      detail: relatedCount ? "Related assets are role-filtered from the same media source." : "No related role-visible assets are exported for this record.",
      tone: relatedCount ? "info" : "restricted"
    },
    {
      id: "release",
      label: "Release form",
      value: releaseValue(asset),
      detail: releaseDetail(asset, role),
      tone: asset.consentReleaseRecordId || asset.peopleRisk === "No people" ? "ready" : "review"
    },
    {
      id: "collection",
      label: "Collection membership",
      value: collection,
      detail: "Membership groups discovery only; it never grants approval by itself.",
      tone: collection ? "info" : "review"
    },
    {
      id: "distribution",
      label: "Distribution artifact",
      value: canUse ? "Approved-copy request available" : "Not generated",
      detail: canUse ? "Download still goes through the approved-copy gate and audit ticket." : "No public link, package, or distribution artifact exists until review clears it.",
      tone: canUse ? "ready" : "restricted"
    },
    {
      id: "record-source",
      label: "Record source",
      value: sourceTruthLabel(source),
      detail: role === "Viewer" ? "Backend details are hidden in the public portal." : metadataValue(assetRecordRef(asset)),
      tone: "info"
    }
  ];
}

function buildRenditionRows(asset: StockMediaAsset, role: DemoRole): AssetTruthObjectRow[] {
  const reuse = asset.reuseDecision;
  const canDownloadApproved = reuse?.state === "portal-ready" || (role !== "Viewer" && reuse?.state === "internal-ready");
  return [
    {
      id: "preview",
      label: "Preview",
      value: asset.imageUrls?.detail || asset.preview || asset.thumbnail ? "Role-safe preview" : "Preview unavailable",
      detail: "Preview may be restricted when review or people/youth evidence is incomplete.",
      tone: asset.imageUrls?.detail || asset.preview || asset.thumbnail ? "info" : "restricted"
    },
    {
      id: "web",
      label: "Web approved copy",
      value: canDownloadApproved ? "Available through gate" : "Request/export needed",
      detail: canDownloadApproved ? "Uses download API gate, never direct source URL." : reuse?.summary || "Reviewer approval required before web export.",
      tone: canDownloadApproved ? "ready" : "review"
    },
    {
      id: "social",
      label: "Social crop",
      value: asset.damFilenames?.social ? "Filename reserved" : "Not exported",
      detail: asset.damFilenames?.social || "Future export preset; current local demo does not create a fake crop.",
      tone: asset.damFilenames?.social ? "info" : "restricted"
    },
    {
      id: "print",
      label: "Print copy",
      value: asset.damFilenames?.print ? "Filename reserved" : "Request required",
      detail: asset.damFilenames?.print || "Print-grade delivery remains reviewer/admin workflow.",
      tone: asset.damFilenames?.print ? "info" : "restricted"
    },
    {
      id: "source",
      label: "Source/original",
      value: "Restricted",
      detail: "Original/master access is separate from approved-copy download.",
      tone: "restricted"
    }
  ];
}

export function presentAssetDetailContext(asset: StockMediaAsset, role: DemoRole, source?: MediaSourceStatus | null, options: AssetDetailPresenterOptions = {}): AssetDetailPresenter {
  const packet = buildPortalReuseDecision(asset, role);
  const reuse = asset.reuseDecision || packet.reuse;
  const approved = reuse.state === "portal-ready" || (role !== "Viewer" && reuse.state === "internal-ready");
  const sourceRows: MetadataRow[] = [
    ["Record source", sourceTruthLabel(source)],
    ["Collection", metadataValue(safeCollection(asset))],
    [recordIdLabel(source), metadataValue(assetRecordRef(asset))]
  ];
  const fileRows: MetadataRow[] = [
    ["File type", assetType(asset)],
    ["File size", formatBytes(asset.fileSizeBytes)],
    ["Dimensions", metadataValue(asset.imageDimensions)],
    ["Capture date", metadataValue(asset.capturedDate || asset.eventDate)]
  ];

  return {
    packet: { ...packet, reuse },
    approved,
    status: approved ? "Approved" : packet.viewerVerdict.tone === "unavailable" ? "Restricted" : assetEnterpriseStatus(asset),
    canUseTitle: reuseAnswerLabel(reuse.state),
    canUseSummary: useSummary(packet, reuse),
    canUseReason: useReason(packet, reuse),
    primaryActionLabel: approved ? "Download approved copy" : packet.viewerVerdict.primaryAction,
    requestReviewLabel: approved ? "Review usage notes" : "Request DAM review",
    summaryFacts: unique([
      betaVisibilityLabel(asset),
      reuseAnswerLabel(reuse.state),
      packet.access.downloadOriginal.label || "Source file restricted",
      assetType(asset)
    ]),
    sourceRows: [...sourceRows, ...fileRows],
    confidenceRows: [
      ["Source", packet.metadataConfidence.source],
      ["Rights", packet.metadataConfidence.rights],
      ["People/minors", packet.metadataConfidence.peopleMinors],
      ["Review", packet.metadataConfidence.review]
    ],
    rightsRows: rightsRestrictionRows({ ...asset, reuseDecision: reuse }),
    objectRows: buildAssetObjectRows({ ...asset, reuseDecision: reuse }, role, source, options.relatedCount),
    renditionRows: buildRenditionRows({ ...asset, reuseDecision: reuse }, role)
  };
}

export function presentReviewContext({
  asset,
  role,
  currentStatus,
  pendingStatus,
  nextBestAction,
  approvalReady,
  queueLabel,
  source
}: {
  asset: StockMediaAsset;
  role: DemoRole;
  currentStatus: string;
  pendingStatus?: string;
  nextBestAction: string;
  approvalReady: boolean;
  queueLabel: string;
  source?: MediaSourceStatus | null;
}): ReviewPresenter {
  const packet = buildPortalReuseDecision(asset, role);
  const nextAction = pendingStatus
    ? "Review pending sync"
    : approvalReady
      ? "Queue decision"
      : nextBestAction.replace(/^Complete evidence: /, "Complete ");
  const nextDetail = pendingStatus
    ? "Pending sync. Review before another decision."
    : packet.viewerVerdict.canDownload
      ? "Reuse-approved copy is already safe within recorded scope."
      : approvalReady
        ? "Evidence checks are complete. Queue decision unless ResourceSpace write mapping is proven."
        : "Required evidence stays incomplete.";

  return {
    nextAction,
    nextDetail,
    betaVisibility: betaVisibilityLabel(asset),
    reuseAnswer: reuseAnswerLabel(packet.reuse.state),
    detailRows: [
      ["Title", displayTitle(asset)],
      ["Reference", assetRecordRef(asset)],
      ["Capture date", metadataValue(asset.capturedDate || asset.eventDate)],
      ["Collection", metadataValue(safeCollection(asset))],
      ["File type", assetType(asset).toUpperCase()],
      ["File size", formatBytes(asset.fileSizeBytes)],
      ["Dimensions", metadataValue(asset.imageDimensions)],
      ["Beta visibility", betaVisibilityLabel(asset)],
      ["Reuse answer", reuseAnswerLabel(packet.reuse.state)]
    ],
    evidenceTableRows: [
      ["Assigned to", queueLabel, "Current status", currentStatus],
      ["Policy", asset.downloadPolicy || "not-downloadable", "Reuse answer", pendingStatus || reuseAnswerLabel(packet.reuse.state)],
      ["Source truth", sourceTruthLabel(source), "Next action", nextAction]
    ]
  };
}

export function presentPackageBuilderContext(governance: PackageGovernancePacket) {
  const hasRefs = governance.totalRefs > 0;
  return {
    readinessState: governance.canPublish ? "Ready" : "Not ready",
    selectedAssetLabel: `${governance.totalRefs.toLocaleString()} asset${governance.totalRefs === 1 ? "" : "s"}`,
    nextStep: hasRefs ? (governance.canPublish ? "Review readiness" : "Resolve restrictions") : "Add approved media references",
    readinessMessage: hasRefs ? "Review every selected reference against package readiness before any delivery handoff." : "0% ready. Add approved media references before readiness review.",
    primaryActionLabel: hasRefs ? "Review readiness" : "Add assets from Library",
    governanceNote: governance.canPublish ? "Readiness checks pass. Source files stay protected." : "Readiness remains locked until approved media references are selected."
  };
}

export function presentBrandKitContext(governance?: BrandKitGovernance, role: DemoRole = "Viewer", configured = false) {
  if (!governance) {
    return {
      nextTitle: configured ? "Readiness loading" : "Connect DAM collection first",
      nextDetail: configured ? "Checking mapped assets." : "No downloadable kit is shown until this Brand Hub maps to real DAM records.",
      nextAction: role === "DAM Admin" ? "View setup details" : "Ask DAM Admin",
      tone: configured ? "review" : "blocked"
    } as const;
  }

  if (governance.deliveryReady) {
    return {
      nextTitle: "Kit readiness packet ready",
      nextDetail: "Every mapped asset is Portal Ready. Live ZIP/share delivery remains disabled in beta.",
      nextAction: "View packet",
      tone: "review"
    } as const;
  }

  return {
    nextTitle: governance.configured ? "Resolve kit restrictions" : "Connect DAM collection first",
    nextDetail: governance.blockers[0] || governance.summary,
    nextAction: governance.configured ? "View blockers" : role === "DAM Admin" ? "View setup details" : "Ask DAM Admin",
    tone: governance.configured ? "review" : "blocked"
  } as const;
}
