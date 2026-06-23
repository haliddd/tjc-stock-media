import { describe, expect, it } from "vitest";
import { albumCollectionId } from "@/lib/catalog-albums";
import { buildCollections } from "@/lib/catalog-summaries";
import type { StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "album-asset-1",
    title: "MVP 2024 worship",
    thumbnail: "/api/assets/thumbnail/album-asset-1",
    thumbnailAlt: "MVP 2024 worship",
    mediaType: "photo",
    collection: "MVP 2024",
    status: "Approved Public",
    usageScope: "Public",
    peopleRisk: "No people",
    sourceSystem: "Google Photos",
    sourceAccount: "lm.photos@tjc.org",
    sourceAlbum: "MVP 2024",
    sourceAlbumMemberships: ["MVP 2024"],
    imageUrls: {
      small: "/api/assets/thumbnail/album-asset-1",
      card: "/api/assets/thumbnail/album-asset-1",
      collection: "/api/assets/thumbnail/album-asset-1",
      detail: "/api/assets/thumbnail/album-asset-1"
    },
    downloadPolicy: "approved-copy-allowed",
    rightsStatus: "Rights approved",
    consentStatus: "Not applicable",
    tags: ["worship"],
    tjcTerms: ["church"],
    ...overrides
  };
}

describe("imported album collections", () => {
  it("builds collection cards from LM Photos album membership", () => {
    const collections = buildCollections([
      asset(),
      asset({ id: "album-asset-2", title: "MVP 2024 details" })
    ], "Viewer");
    const album = collections.find((item) => item.id === albumCollectionId("MVP 2024"));

    expect(album).toMatchObject({
      name: "MVP 2024",
      description: "Imported LM Photos album membership",
      count: 2
    });
  });
});
