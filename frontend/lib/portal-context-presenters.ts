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
};

export type ReviewPresenter = {
  nextAction: string;
  nextDetail: string;
  betaVisibility: string;
  reuseAnswer: string;
  detailRows: MetadataRow[];
  evidenceTableRows: Array<[string, string, string, string]>;
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
  if (typeof assetOrAllowed === "boolean") return assetOrAllowed ? "Visible in portal" : "Hidden from portal";
  if (!assetOrAllowed) return "Visibility unknown";
  if (assetOrAllowed.visibilityTier === "archive" || assetOrAllowed.status === "Do Not Use") return "Hidden from portal";
  return "Visible in portal";
}

export function reuseAnswerLabel(state: ReuseState) {
  if (state === "portal-ready" || state === "internal-ready") return "Reuse approved";
  if (state === "blocked-archive" || state === "blocked-do-not-use") return "Blocked from reuse";
  return "Needs review before reuse";
}

function cardApprovalLabel(state: ReuseState) {
  return reuseAnswerLabel(state);
}

function useSummary(packet: PortalReuseDecisionPacket) {
  if (packet.viewerVerdict.canDownload) return "Approved copy is ready for scoped derivative use.";
  if (packet.reuse.state === "internal-ready") return "Reuse is approved for internal ministry scope.";
  if (packet.reuse.state === "blocked-archive") return "Kept for reference; not for public delivery.";
  if (packet.reuse.state === "blocked-do-not-use") return "Not available for reuse.";
  return "Reviewer action needed before reuse or download.";
}

function useReason(packet: PortalReuseDecisionPacket) {
  if (packet.viewerVerdict.canDownload) return "Use the approved copy and keep source files protected.";
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

export function presentAssetDetailContext(asset: StockMediaAsset, role: DemoRole, source?: MediaSourceStatus | null): AssetDetailPresenter {
  const packet = buildPortalReuseDecision(asset, role);
  const approved = packet.viewerVerdict.canDownload;
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
    packet,
    approved,
    status: approved ? "Approved" : packet.viewerVerdict.tone === "unavailable" ? "Restricted" : assetEnterpriseStatus(asset),
    canUseTitle: reuseAnswerLabel(packet.reuse.state),
    canUseSummary: useSummary(packet),
    canUseReason: useReason(packet),
    primaryActionLabel: approved ? "Request approved copy" : packet.viewerVerdict.primaryAction,
    requestReviewLabel: approved ? "Review usage notes" : "Request DAM review",
    summaryFacts: unique([
      betaVisibilityLabel(asset),
      reuseAnswerLabel(packet.reuse.state),
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
    rightsRows: rightsRestrictionRows({ ...asset, reuseDecision: packet.reuse })
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
      ["Portal visibility", betaVisibilityLabel(asset)],
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
      nextTitle: configured ? "Readiness loading" : role === "DAM Admin" ? "Connect DAM collection first" : "Connect reviewed media first",
      nextDetail: configured ? "Checking mapped assets." : role === "DAM Admin" ? "No file package is shown until this Brand Hub maps to real DAM records." : "No file package is shown until reviewed media is connected.",
      nextAction: role === "DAM Admin" ? "View setup details" : "Ask DAM Admin",
      tone: configured ? "review" : "blocked"
    } as const;
  }

  if (governance.deliveryReady) {
    return {
      nextTitle: "Kit readiness packet ready",
      nextDetail: "Mapped assets passed kit gates. ZIP/share delivery is still off.",
      nextAction: "View packet",
      tone: "review"
    } as const;
  }

  return {
    nextTitle: governance.configured ? "Resolve kit restrictions" : role === "DAM Admin" ? "Connect DAM collection first" : "Connect reviewed media first",
    nextDetail: governance.blockers[0] || governance.summary,
    nextAction: governance.configured ? "View blockers" : role === "DAM Admin" ? "View setup details" : "Ask DAM Admin",
    tone: governance.configured ? "review" : "blocked"
  } as const;
}
