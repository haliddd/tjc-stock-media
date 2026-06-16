import { canReview } from "@/lib/permissions";
import { mediaSourceKind } from "@/lib/media-source/truth";
import type { DemoRole, MediaSourceStatus, StockMediaAsset } from "@/lib/types";

function normalBetaRole(role: DemoRole) {
  return !canReview(role);
}

export function currentBetaPhotoOnlyRole(role: DemoRole) {
  return normalBetaRole(role);
}

export function fallbackFixtureSource(source?: MediaSourceStatus | null) {
  return mediaSourceKind(source) === "fallback-fixtures";
}

export function assetInCurrentBetaScope(role: DemoRole, asset: StockMediaAsset, source?: MediaSourceStatus | null) {
  if (!normalBetaRole(role)) return true;
  if (asset.mediaType !== "photo") return false;
  if (fallbackFixtureSource(source) && asset.mediaType !== "photo") return false;
  return true;
}

export function scopedCatalogAssetsForRole(role: DemoRole, assets: StockMediaAsset[], source?: MediaSourceStatus | null) {
  if (!normalBetaRole(role)) return assets;
  return assets.filter((asset) => assetInCurrentBetaScope(role, asset, source));
}
