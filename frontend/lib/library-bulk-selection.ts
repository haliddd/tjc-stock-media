import { assetResourceRef } from "@/lib/asset-refs";
import {
  assetIsArchiveOnly,
  assetIsBlocked,
  assetNeedsReview,
  assetNeedsRightsReview
} from "@/lib/asset-governance";
import { assetRecordRef, assetType } from "@/lib/enterprise-display";
import { canAdmin, canContribute, canReview } from "@/lib/permissions";
import { buildPortalReuseDecision } from "@/lib/portal-reuse-decision";
import type { DemoRole, StockMediaAsset } from "@/lib/types";

export type BulkActionId =
  | "add-to-collection"
  | "create-collection"
  | "request-reuse"
  | "send-review"
  | "assign-tags"
  | "mark-internal"
  | "download-approved"
  | "export-metadata"
  | "approve"
  | "reject"
  | "archive";

export type LibraryBulkAction = {
  id: BulkActionId;
  label: string;
  visible: boolean;
  enabled: boolean;
  eligibleCount: number;
  totalCount: number;
  statusLabel: string;
  disabledReason?: string;
  warning?: string;
};

export type LibrarySelectionSummary = {
  count: number;
  statusBreakdown: Array<[string, number]>;
  typeBreakdown: Array<[string, number]>;
  rightsBreakdown: Array<[string, number]>;
  sharedTags: string[];
  references: string[];
  resourceSpaceIds: string[];
  warnings: string[];
  actions: LibraryBulkAction[];
};

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function countBy<T>(items: T[], label: (item: T) => string | undefined) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = label(item) || "Unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function intersection(values: string[][]) {
  if (!values.length) return [];
  const [first = [], ...rest] = values.map((row) => unique(row.map((item) => item.trim()).filter(Boolean)));
  return first.filter((item) => rest.every((row) => row.includes(item)));
}

export function toggleSelectedId(currentIds: string[], assetId: string) {
  return currentIds.includes(assetId) ? currentIds.filter((id) => id !== assetId) : [...currentIds, assetId];
}

export function selectRangeInVisibleOrder({
  currentIds,
  visibleIds,
  anchorId,
  targetId,
  additive = false
}: {
  currentIds: string[];
  visibleIds: string[];
  anchorId?: string | null;
  targetId: string;
  additive?: boolean;
}) {
  const anchorIndex = anchorId ? visibleIds.indexOf(anchorId) : -1;
  const targetIndex = visibleIds.indexOf(targetId);
  if (anchorIndex < 0 || targetIndex < 0) return toggleSelectedId(currentIds, targetId);
  const [start, end] = anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
  const rangeIds = visibleIds.slice(start, end + 1);
  return additive ? unique([...currentIds, ...rangeIds]) : rangeIds;
}

export function reconcileVisibleSelection(currentIds: string[], visibleIds: string[]) {
  const visible = new Set(visibleIds);
  const nextIds = currentIds.filter((id) => visible.has(id));
  return {
    nextIds,
    hiddenCount: currentIds.length - nextIds.length
  };
}

export function shouldShowBulkBar(selectedCount: number) {
  return selectedCount > 0;
}

function actionStatus(eligibleCount: number, totalCount: number, enabled: boolean) {
  if (!totalCount) return "Select assets";
  if (eligibleCount === totalCount) return `${eligibleCount} of ${totalCount} eligible`;
  if (eligibleCount > 0) return `${eligibleCount} of ${totalCount} eligible`;
  return enabled ? `${totalCount} selected` : "None eligible";
}

function downloadEligible(asset: StockMediaAsset, role: DemoRole) {
  return buildPortalReuseDecision(asset, role).access.downloadApprovedCopy.allowed;
}

function rightsUnclear(asset: StockMediaAsset) {
  return assetNeedsRightsReview(asset) || /unknown|unclear|missing|needs review|not confirmed/i.test(`${asset.rightsStatus || ""} ${asset.consentStatus || ""} ${asset.rightsNotes || ""}`);
}

function assetTypeLabel(asset: StockMediaAsset) {
  const type = assetType(asset).trim();
  if (!type) return "Unknown";
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
}

export function buildLibraryBulkActions(assets: StockMediaAsset[], role: DemoRole): LibraryBulkAction[] {
  const totalCount = assets.length;
  const downloadCount = assets.filter((asset) => downloadEligible(asset, role)).length;
  const reviewCount = assets.filter((asset) => assetNeedsReview(asset) || rightsUnclear(asset)).length;
  const reusableRequestCount = assets.filter((asset) => !assetIsBlocked(asset) && !assetIsArchiveOnly(asset)).length;
  const metadataCount = assets.filter((asset) => !assetIsBlocked(asset)).length;
  const restrictedCount = assets.filter((asset) => !downloadEligible(asset, role)).length;
  const unclearCount = assets.filter(rightsUnclear).length;
  const sourceRestrictedReason = "Bulk download uses approved-copy gate only. Source/original files remain restricted.";
  const comingSoonReason = "Safe workflow is visible, but bulk writeback is not enabled in beta.";

  const actions: LibraryBulkAction[] = [
    {
      id: "add-to-collection",
      label: "Add to collection",
      visible: true,
      enabled: totalCount > 0,
      eligibleCount: totalCount,
      totalCount,
      statusLabel: actionStatus(totalCount, totalCount, totalCount > 0)
    },
    {
      id: "create-collection",
      label: "Create collection",
      visible: true,
      enabled: totalCount > 0,
      eligibleCount: totalCount,
      totalCount,
      statusLabel: actionStatus(totalCount, totalCount, totalCount > 0)
    },
    {
      id: "request-reuse",
      label: "Request reuse",
      visible: true,
      enabled: reusableRequestCount > 0,
      eligibleCount: reusableRequestCount,
      totalCount,
      statusLabel: actionStatus(reusableRequestCount, totalCount, reusableRequestCount > 0),
      warning: unclearCount ? `${unclearCount} selected item${unclearCount === 1 ? "" : "s"} have unclear rights or consent.` : undefined,
      disabledReason: reusableRequestCount ? undefined : "Do Not Use or archive-only assets cannot start reuse requests."
    },
    {
      id: "send-review",
      label: "Send to review",
      visible: canContribute(role),
      enabled: reviewCount > 0,
      eligibleCount: reviewCount,
      totalCount,
      statusLabel: actionStatus(reviewCount, totalCount, reviewCount > 0),
      disabledReason: reviewCount ? undefined : "Selected assets have no review-required signal in current role-safe view."
    },
    {
      id: "assign-tags",
      label: "Assign tags",
      visible: canContribute(role),
      enabled: false,
      eligibleCount: metadataCount,
      totalCount,
      statusLabel: actionStatus(metadataCount, totalCount, false),
      disabledReason: comingSoonReason
    },
    {
      id: "mark-internal",
      label: "Mark internal-only",
      visible: canReview(role),
      enabled: false,
      eligibleCount: metadataCount,
      totalCount,
      statusLabel: actionStatus(metadataCount, totalCount, false),
      disabledReason: comingSoonReason
    },
    {
      id: "download-approved",
      label: "Download approved copies",
      visible: true,
      enabled: downloadCount > 0,
      eligibleCount: downloadCount,
      totalCount,
      statusLabel: actionStatus(downloadCount, totalCount, downloadCount > 0),
      warning: restrictedCount ? `${restrictedCount} selected item${restrictedCount === 1 ? "" : "s"} excluded by approved-copy gate.` : sourceRestrictedReason,
      disabledReason: downloadCount ? sourceRestrictedReason : `No selected asset has an approved derivative available. ${sourceRestrictedReason}`
    },
    {
      id: "export-metadata",
      label: "Export metadata",
      visible: true,
      enabled: totalCount > 0,
      eligibleCount: totalCount,
      totalCount,
      statusLabel: actionStatus(totalCount, totalCount, totalCount > 0)
    },
    {
      id: "approve",
      label: "Approve",
      visible: canReview(role),
      enabled: false,
      eligibleCount: reviewCount,
      totalCount,
      statusLabel: actionStatus(reviewCount, totalCount, false),
      disabledReason: "Use Review queue for evidence checklist and reviewer notes. Bulk approval writeback is disabled in beta."
    },
    {
      id: "reject",
      label: "Reject",
      visible: canReview(role),
      enabled: false,
      eligibleCount: reviewCount,
      totalCount,
      statusLabel: actionStatus(reviewCount, totalCount, false),
      disabledReason: "Use Review queue for evidence checklist and reviewer notes. Bulk rejection writeback is disabled in beta."
    },
    {
      id: "archive",
      label: "Archive",
      visible: canAdmin(role),
      enabled: false,
      eligibleCount: metadataCount,
      totalCount,
      statusLabel: actionStatus(metadataCount, totalCount, false),
      disabledReason: "Archive is admin-only and disabled in beta until ResourceSpace writeback is verified."
    }
  ];

  return actions.filter((action) => action.visible);
}

export function buildLibrarySelectionSummary(assets: StockMediaAsset[], role: DemoRole): LibrarySelectionSummary {
  const rightsBreakdown = countBy(assets, (asset) => {
    if (rightsUnclear(asset)) return "Rights/consent unclear";
    if (asset.consentStatus) return asset.consentStatus;
    return asset.rightsStatus || "Rights not exported";
  }).sort((left, right) => {
    if (left[0] === "Rights/consent unclear") return -1;
    if (right[0] === "Rights/consent unclear") return 1;
    return right[1] - left[1] || left[0].localeCompare(right[0]);
  });
  const warnings = [
    "Source/original files are excluded from bulk actions.",
    assets.some(rightsUnclear) ? "Rights or consent unclear: request review before reuse/download." : "",
    assets.some((asset) => !downloadEligible(asset, role)) ? "Some assets are not eligible for approved-copy download." : "",
    assets.some(assetIsBlocked) ? "Do Not Use assets can only be reviewed by authorized roles." : ""
  ].filter(Boolean);

  return {
    count: assets.length,
    statusBreakdown: countBy(assets, (asset) => asset.status),
    typeBreakdown: countBy(assets, assetTypeLabel),
    rightsBreakdown,
    sharedTags: intersection(assets.map((asset) => asset.tags || [])).slice(0, 8),
    references: unique(assets.map(assetRecordRef)).slice(0, 24),
    resourceSpaceIds: unique(assets.map(assetResourceRef)).slice(0, 24),
    warnings,
    actions: buildLibraryBulkActions(assets, role)
  };
}
