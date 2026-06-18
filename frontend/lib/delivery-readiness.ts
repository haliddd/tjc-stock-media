import type { StockMediaAsset } from "@/lib/types";

export type DeliveryReadinessUse = "public-web" | "public-print" | "internal-preview";

export type DeliveryRouteBoundary = "thumbnail-preview" | "approved-copy-gate" | "original-access-request";

export type DeliveryReadinessManifestItem = {
  id: "thumbnail" | "preview" | "approved-web-copy" | "approved-print-copy" | "original-restricted";
  label: string;
  status: "ready" | "blocked" | "request-only";
  routeBoundary: DeliveryRouteBoundary;
  downloadGrade: boolean;
  satisfies: DeliveryReadinessUse[];
  detail: string;
};

export type DeliveryReadinessManifest = {
  assetId: string;
  chosenUse: DeliveryReadinessUse;
  portalReadyForChosenUse: boolean;
  originalMasterIncluded: false;
  storageTruth: "local-export-readiness-only";
  items: DeliveryReadinessManifestItem[];
};

function hasAnyPreview(asset: StockMediaAsset, variants: Array<keyof NonNullable<StockMediaAsset["imageUrls"]>>) {
  return variants.some((variant) => Boolean(asset.imageUrls?.[variant]));
}

export function buildDeliveryReadinessManifest(
  asset: StockMediaAsset,
  chosenUse: DeliveryReadinessUse = "public-web"
): DeliveryReadinessManifest {
  const thumbnailReady = Boolean(asset.thumbnail || hasAnyPreview(asset, ["small", "card", "collection"]));
  const previewReady = Boolean(asset.preview || hasAnyPreview(asset, ["detail", "card", "collection"]));
  const approvedWebReady = asset.status === "Approved Public" && asset.downloadPolicy === "approved-copy-allowed" && Boolean(asset.imageUrls?.download);
  const printReady = false;
  const items: DeliveryReadinessManifestItem[] = [
    {
      id: "thumbnail",
      label: "Thumbnail",
      status: thumbnailReady ? "ready" : "blocked",
      routeBoundary: "thumbnail-preview",
      downloadGrade: false,
      satisfies: thumbnailReady ? ["internal-preview"] : [],
      detail: thumbnailReady ? "Role-safe thumbnail derivative can render for browsing." : "Thumbnail derivative is not exported."
    },
    {
      id: "preview",
      label: "Preview",
      status: previewReady ? "ready" : "blocked",
      routeBoundary: "thumbnail-preview",
      downloadGrade: false,
      satisfies: previewReady ? ["internal-preview"] : [],
      detail: previewReady ? "Role-safe preview derivative can render for inspection." : "Preview derivative is not exported."
    },
    {
      id: "approved-web-copy",
      label: "Approved web copy",
      status: approvedWebReady ? "ready" : "blocked",
      routeBoundary: "approved-copy-gate",
      downloadGrade: true,
      satisfies: approvedWebReady ? ["public-web"] : [],
      detail: approvedWebReady ? "Approved web copy must be delivered through the POST ticket and GET consume gate." : "Approved web copy is missing or not cleared for public delivery."
    },
    {
      id: "approved-print-copy",
      label: "Approved print copy",
      status: printReady ? "ready" : "blocked",
      routeBoundary: "approved-copy-gate",
      downloadGrade: true,
      satisfies: printReady ? ["public-print"] : [],
      detail: "Print-approved derivative factory is not configured; request reviewer approval for print use."
    },
    {
      id: "original-restricted",
      label: "Original restricted",
      status: "request-only",
      routeBoundary: "original-access-request",
      downloadGrade: true,
      satisfies: [],
      detail: "Original/master access stays a request workflow with approver, expiry, audit, and revocation."
    }
  ];

  return {
    assetId: asset.id,
    chosenUse,
    portalReadyForChosenUse: items.some((item) => item.status === "ready" && item.satisfies.includes(chosenUse)),
    originalMasterIncluded: false,
    storageTruth: "local-export-readiness-only",
    items
  };
}
