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
  if (!source) return "Source system disconnected";
  if (source.adapter === "resourcespace-api") return source.readOnly ? "Read-only source system" : "Source system API";
  if (source.adapter === "exported-metadata") return "Read-only source export";
  if (source.adapter === "bundled-beta-catalog") return "Read-only catalog snapshot";
  if (source.adapter === "demo-fallback") return "Local sample data";
  return "Media library";
}

export function sourceTruthLabel(source?: MediaSourceStatus | null) {
  if (!source) return sourceLabel(source);
  if (source.adapter === "resourcespace-api") return source.readOnly ? "Read-only hosted source system" : "Hosted source API";
  if (source.adapter === "exported-metadata") return "Read-only source export snapshot";
  if (source.adapter === "bundled-beta-catalog") return "Read-only catalog snapshot";
  if (source.adapter === "demo-fallback") return "Local sample data";
  if (source.adapter === "media-library") return "Media library";

  const label = sourceLabel(source);
  if (/fixture|fallback|demo|local/i.test(label)) return "Local sample data";
  return label;
}

export function sourceNoun(source?: MediaSourceStatus | null) {
  if (source?.adapter === "resourcespace-api") return "ResourceSpace";
  return source?.adapter === "media-library" ? "media library" : "source system";
}

export function recordIdLabel(source?: MediaSourceStatus | null) {
  return source && source.adapter !== "media-library" ? "ResourceSpace ID" : "Reference code";
}
