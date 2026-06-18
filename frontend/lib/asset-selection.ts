import { getAssetRecordById } from "@/lib/catalog";
import { canSeeAsset } from "@/lib/permissions";
import { normalizeAssetIds } from "@/lib/request-validation";
import type { DemoRole, StockMediaAsset } from "@/lib/types";

export type AssetSelection = {
  requestedIds: string[];
  assets: StockMediaAsset[];
  missingIds: string[];
  hiddenAssets: StockMediaAsset[];
};

export function selectedAssetIds(value: unknown) {
  return normalizeAssetIds(value);
}

export async function resolveAssetSelection(value: unknown, role?: DemoRole): Promise<AssetSelection> {
  const requestedIds = selectedAssetIds(value);
  const records = await Promise.all(requestedIds.map((id) => getAssetRecordById(id, role)));
  const assets = records.filter((item) => item.asset).map((item) => item.asset!);
  const missingIds = requestedIds.filter((id) => !assets.some((asset) => asset.id === id));
  const hiddenAssets = role ? assets.filter((asset) => !canSeeAsset(role, asset)) : [];

  return {
    requestedIds,
    assets,
    missingIds,
    hiddenAssets
  };
}
