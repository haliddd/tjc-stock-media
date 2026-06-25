import { buildOriginalAccessRequestDecision, decideAccess } from "@/lib/access-decisions";
import { buildDeliveryReadinessManifest } from "@/lib/delivery-readiness";
import { assetType, formatBytes } from "@/lib/enterprise-display";
import { requestAssetMailto, viewerVerdictForAsset } from "@/lib/viewer-verdict";
import type { DemoRole, StockMediaAsset } from "@/lib/types";

export type DownloadCenterRowStatus = "ready" | "request-needed" | "restricted";
export type DownloadCenterAddonStatus = "available" | "request-needed";

export type DownloadCenterRow = {
  id: string;
  label: string;
  status: DownloadCenterRowStatus;
  permissionState: string;
  intendedUse: string;
  fileType?: string;
  dimensions?: string;
  fileSize?: string;
  detail: string;
  routeBoundary: "thumbnail-preview" | "approved-copy-gate" | "original-access-request";
  downloadHref?: string;
};

export type DownloadCenterAddon = {
  id: string;
  label: string;
  status: DownloadCenterAddonStatus;
  detail: string;
};

export type DownloadCenterModel = {
  title: string;
  summary: string;
  rows: DownloadCenterRow[];
  originalAccess: {
    state: "requestable" | "blocked" | "pending" | "expired" | "revoked";
    label: string;
    detail: string;
    requestHref: string;
  };
  addons: DownloadCenterAddon[];
  reviewRequestHref: string;
  truthNote: string;
};

function meaningfulValue(value?: string) {
  return Boolean(value && !/^(unknown|not exported|not applicable|none|n\/a)$/i.test(value.trim()));
}

function intendedUseLabel(asset: StockMediaAsset) {
  if (asset.approvedChannels?.length) return asset.approvedChannels.join(", ");
  if (asset.usageScope === "Internal") return "Internal ministry use";
  if (asset.usageScope === "Public and Internal") return "Public and internal ministry use";
  if (asset.usageScope === "Public") return "Public ministry use";
  return "Reviewer-scoped use";
}

function rowStatus(ready: boolean, restricted = false): DownloadCenterRowStatus {
  if (ready) return "ready";
  return restricted ? "restricted" : "request-needed";
}

function assetFileType(asset: StockMediaAsset) {
  const type = assetType(asset);
  return type === "ASSET" ? undefined : type;
}

function releaseSummary(asset: StockMediaAsset) {
  if (asset.peopleRisk === "No people") return "No visible people exported for this record.";
  if (meaningfulValue(asset.consentStatus)) return asset.consentStatus;
  if (meaningfulValue(asset.peopleRisk)) return asset.peopleRisk;
  return "";
}

export function buildDownloadCenterModel(asset: StockMediaAsset, role: DemoRole): DownloadCenterModel {
  const approvedCopyAccess = decideAccess(role, "downloadApprovedCopy", asset);
  const originalAccess = buildOriginalAccessRequestDecision(role, asset);
  const verdict = viewerVerdictForAsset(asset, role);
  const manifest = buildDeliveryReadinessManifest(asset, asset.usageScope === "Internal" ? "internal-preview" : "public-web");
  const downloadHref = approvedCopyAccess.allowed ? `/api/download/${encodeURIComponent(asset.id)}?role=${encodeURIComponent(role)}` : undefined;
  const previewReady = manifest.items.find((item) => item.id === "preview");
  const webReady = manifest.items.find((item) => item.id === "approved-web-copy");
  const printReady = manifest.items.find((item) => item.id === "approved-print-copy");

  const rows: DownloadCenterRow[] = [
    {
      id: "preview",
      label: "Preview derivative",
      status: rowStatus(previewReady?.status === "ready"),
      permissionState: previewReady?.status === "ready" ? "Inspection available" : "Preview export missing",
      intendedUse: "Inspection before reuse",
      fileType: assetFileType(asset),
      dimensions: meaningfulValue(asset.imageDimensions) ? asset.imageDimensions : undefined,
      detail: previewReady?.detail || "Role-safe preview is not exported for this record.",
      routeBoundary: "thumbnail-preview"
    },
    {
      id: "approved-web-copy",
      label: asset.status === "Approved Internal" ? "Approved internal copy" : "Approved web copy",
      status: rowStatus(Boolean(downloadHref)),
      permissionState: approvedCopyAccess.allowed
        ? approvedCopyAccess.label || "Gate-backed download available"
        : approvedCopyAccess.reason || webReady?.detail || verdict.reason,
      intendedUse: intendedUseLabel(asset),
      fileType: assetFileType(asset),
      dimensions: meaningfulValue(asset.imageDimensions) ? asset.imageDimensions : undefined,
      fileSize: asset.fileSizeBytes ? formatBytes(asset.fileSizeBytes) : undefined,
      detail: approvedCopyAccess.allowed
        ? "Approved-copy download runs through the existing POST/GET gate and audit path."
        : webReady?.detail || "Approved copy is missing or reviewer approval is still required.",
      routeBoundary: "approved-copy-gate",
      downloadHref
    },
    {
      id: "approved-print-copy",
      label: "Approved print copy",
      status: rowStatus(false),
      permissionState: "Request/export needed",
      intendedUse: "Bulletin, poster, or handout once print export is configured",
      detail: printReady?.detail || "Print-approved derivative is not configured in current backend truth.",
      routeBoundary: "approved-copy-gate"
    }
  ];

  const addons: DownloadCenterAddon[] = [
    {
      id: "metadata-sidecar",
      label: "Metadata sidecar",
      status: "request-needed",
      detail: "No sidecar export is wired. Request a reviewed metadata packet if needed."
    },
    {
      id: "release-summary",
      label: "Release summary",
      status: meaningfulValue(releaseSummary(asset)) ? "available" : "request-needed",
      detail: releaseSummary(asset) || "Release summary is not exported for this record."
    },
    {
      id: "license-terms",
      label: "License / rights terms",
      status: meaningfulValue(asset.rightsStatus || asset.rightsNotes) ? "available" : "request-needed",
      detail: asset.rightsStatus || asset.rightsNotes || "Rights terms are not exported in this payload."
    },
    {
      id: "usage-notes",
      label: "Usage notes",
      status: meaningfulValue(asset.usageGuidance) ? "available" : "request-needed",
      detail: asset.usageGuidance || "Usage guidance needs reviewer follow-up."
    },
    {
      id: "delivery-manifest",
      label: "Delivery manifest preview",
      status: "available",
      detail: `${manifest.items.filter((item) => item.status === "ready").length} ready row(s), ${manifest.items.filter((item) => item.status !== "ready").length} request/blocked row(s). Original/master never included.`
    }
  ];

  const originalLabel = role === "DAM Admin" ? "Original/master access request" : "Source-file access request";

  return {
    title: "Download Center",
    summary: approvedCopyAccess.allowed
      ? "Approved downloads are available through the existing gate. Original/source access stays separate."
      : `${verdict.reason} Approved copies stay blocked until the visible checks clear.`,
    rows,
    originalAccess: {
      state: originalAccess.state,
      label: originalLabel,
      detail: originalAccess.reason,
      requestHref: requestAssetMailto(asset, role, "original")
    },
    addons,
    reviewRequestHref: requestAssetMailto(asset, role, "review", asset.reuseDecision?.label || verdict.label),
    truthNote: "Rows reflect current backend truth only. Missing exports stay request-only instead of showing fake formats or links."
  };
}
