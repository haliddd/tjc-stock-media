import { clearDerivativeFileIndex, findResourceSpaceImageDerivative, type ImageVariant } from "@/lib/images";
import type { MediaSourceStatus, StockMediaAsset } from "@/lib/types";
import { bundledBetaCatalogStatus, getBundledBetaCatalogAssets } from "@/lib/media-source/bundled-beta-catalog";
import { demoFallbackAssets, demoFallbackStatus } from "@/lib/media-source/demo-fallback";
import { exportedMetadataStatus, getAssetsFromExport, latestMetadataExportPath } from "@/lib/media-source/exported-metadata";
import { getAssetsFromResourceSpaceApi, resourceSpaceApiStatus } from "@/lib/media-source/resourcespace-api";

let cachedAssets: StockMediaAsset[] | null = null;
let cachedStatus: MediaSourceStatus | null = null;
let cachedSourceKey: string | null = null;

export async function getActiveMediaSource() {
  const exportPath = latestMetadataExportPath();
  if (cachedAssets && cachedStatus) {
    const nextSourceKey = cachedStatus.adapter === "exported-metadata"
      ? exportPath
      : (cachedStatus.adapter === "demo-fallback" || cachedStatus.adapter === "bundled-beta-catalog") && exportPath
        ? exportPath
        : cachedSourceKey;
    if (cachedSourceKey === nextSourceKey) {
      return { assets: cachedAssets, status: cachedStatus };
    }
    clearMediaSourceCache();
  }

  const apiAssets = await getAssetsFromResourceSpaceApi();
  if (apiAssets?.length) {
    cachedAssets = apiAssets;
    cachedStatus = resourceSpaceApiStatus;
    cachedSourceKey = "resourcespace-api";
    return { assets: cachedAssets, status: cachedStatus };
  }

  const exportAssets = await getAssetsFromExport();
  if (exportAssets?.length) {
    cachedAssets = exportAssets;
    cachedStatus = {
      ...exportedMetadataStatus,
      detail: exportPath
        ? "Reading latest ResourceSpace metadata export. Approval writes still require ResourceSpace API field mapping."
        : exportedMetadataStatus.detail
    };
    cachedSourceKey = exportPath;
    return { assets: cachedAssets, status: cachedStatus };
  }

  const bundledAssets = getBundledBetaCatalogAssets();
  if (bundledAssets.length) {
    cachedAssets = bundledAssets;
    cachedStatus = bundledBetaCatalogStatus;
    cachedSourceKey = "bundled-beta-catalog";
    return { assets: cachedAssets, status: cachedStatus };
  }

  cachedAssets = demoFallbackAssets;
  cachedStatus = demoFallbackStatus;
  cachedSourceKey = exportPath ? null : "demo-fallback";
  return { assets: cachedAssets, status: cachedStatus };
}

export function clearMediaSourceCache() {
  cachedAssets = null;
  cachedStatus = null;
  cachedSourceKey = null;
  clearDerivativeFileIndex();
}

export function findFilestoreDerivative(id: string, variant: ImageVariant) {
  return findResourceSpaceImageDerivative(id, variant);
}
