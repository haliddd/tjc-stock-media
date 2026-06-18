import type { MediaSourceStatus, StockMediaAsset } from "@/lib/types";
import { assetResourceRef } from "@/lib/asset-refs";

export function formatBytes(bytes?: number) {
  if (!bytes) return "Not provided";
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function assetType(asset: StockMediaAsset) {
  return (asset.fileExtension || asset.mediaType || "asset").toUpperCase();
}

export function assetDate(asset: StockMediaAsset) {
  return asset.capturedDate || asset.eventDate || asset.reviewedDate || asset.importDate || "Not provided";
}

export function assetRecordRef(asset?: Pick<StockMediaAsset, "id" | "resourceSpaceId">) {
  return assetResourceRef(asset);
}

export function displayTitle(asset?: StockMediaAsset) {
  return asset?.title?.trim() || asset?.originalFilename || `Media asset ${assetRecordRef(asset)}`.trim();
}

export function metadataQualityLabel(asset: StockMediaAsset) {
  if (asset.status === "Approved Public") return "Approved public";
  if (asset.status === "Approved Internal") return "Internal only";
  if (!asset.rightsStatus || /unknown|needs review|review required/i.test(asset.rightsStatus)) return "Needs rights review";
  if (!asset.tags?.length && !asset.tjcTerms?.length) return "Metadata incomplete";
  return "Metadata reviewed";
}

export function sourceLabel(source?: MediaSourceStatus | null) {
  if (!source) return "ResourceSpace disconnected";
  if (source.adapter === "resourcespace-api") return source.readOnly ? "Read-only ResourceSpace" : "Live ResourceSpace";
  if (source.adapter === "exported-metadata") return "Read-only ResourceSpace export";
  if (source.adapter === "bundled-beta-catalog") return "Beta ResourceSpace snapshot";
  if (source.adapter === "demo-fallback") return "Local demo data";
  return "Media library";
}

export function sourceNoun(source?: MediaSourceStatus | null) {
  return source?.adapter === "media-library" ? "media library" : "ResourceSpace";
}

export function recordIdLabel(source?: MediaSourceStatus | null) {
  return source && source.adapter !== "media-library" ? "ResourceSpace ID" : "Reference code";
}
