import type { StockMediaAsset } from "@/lib/types";

export const albumCollectionPrefix = "album:";

function normalizeAlbumText(value?: string) {
  return (value || "").trim().replace(/\s+/g, " ");
}

export function assetAlbumNames(asset: StockMediaAsset) {
  const names = [
    ...(asset.sourceAlbumMemberships || []),
    asset.sourceAlbum,
    asset.collection
  ].map(normalizeAlbumText).filter(Boolean);
  return Array.from(new Set(names));
}

export function assetPrimaryAlbumName(asset: StockMediaAsset) {
  return assetAlbumNames(asset)[0] || normalizeAlbumText(asset.collection) || "Imported album";
}

export function albumCollectionSlug(name: string) {
  return normalizeAlbumText(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "album";
}

export function albumCollectionId(name: string) {
  return `${albumCollectionPrefix}${albumCollectionSlug(name)}`;
}

export function isAlbumCollectionId(id?: string) {
  return Boolean(id?.startsWith(albumCollectionPrefix) && id.length > albumCollectionPrefix.length);
}

export function assetMatchesAlbumCollection(asset: StockMediaAsset, collectionId?: string) {
  if (!isAlbumCollectionId(collectionId)) return false;
  const safeCollectionId = collectionId || "";
  const slug = safeCollectionId.slice(albumCollectionPrefix.length);
  return assetAlbumNames(asset).some((name) => albumCollectionSlug(name) === slug);
}

export function assetHasImportedAlbum(asset: StockMediaAsset) {
  const source = `${asset.sourceSystem || ""} ${asset.sourcePlatform || ""} ${asset.sourceAccount || ""}`;
  const trustedLmPhotos = asset.sourceAccount?.toLowerCase() === "lm.photos@tjc.org" || /lm photos|lm\.photos/i.test(source);
  return trustedLmPhotos && Boolean(asset.sourceAlbum || asset.sourceAlbumMemberships?.length);
}
