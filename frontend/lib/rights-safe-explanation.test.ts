import { describe, expect, it } from "vitest";
import { buildRightsSafeExplanation } from "@/lib/rights-safe-explanation";
import type { StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "asset-1",
    title: "Sabbath worship sample",
    thumbnail: "/thumb.jpg",
    thumbnailAlt: "Sabbath worship sample",
    imageUrls: {
      small: "/small.jpg",
      card: "/card.jpg",
      collection: "/collection.jpg",
      detail: "/detail.jpg",
      download: "/download.jpg"
    },
    mediaType: "photo",
    collection: "MVP 2024",
    status: "Approved Public",
    usageScope: "Public",
    peopleRisk: "No people",
    sourceSystem: "ResourceSpace export",
    sourceAccount: "Media Team",
    sourceAlbum: "Worship",
    originalFilename: "worship-sample.jpg",
    checksumSha256: "a".repeat(64),
    resourceSpaceId: "1001",
    imageDimensions: "1400x900",
    rightsStatus: "Rights approved",
    rightsNotes: "TJC-owned; approved for church website use.",
    consentStatus: "Not applicable",
    usageGuidance: "Approved for website and slide use.",
    downloadPolicy: "approved-copy-allowed",
    reviewer: "DAM Reviewer",
    reviewedDate: "2026-06-10",
    rightsBasis: "TJC-owned",
    reuseTier: "stock-safe",
    visibilityTier: "public",
    sensitivityClass: "public-safe",
    approvedChannels: ["website", "social"],
    withdrawalStatus: "active",
    ...overrides
  };
}

describe("rights-safe explanation", () => {
  it("explains reusable records with exported approval and role data", () => {
    const model = buildRightsSafeExplanation(asset(), "Viewer");

    expect(model.reusable).toBe(true);
    expect(model.summary).toMatch(/currently cleared/);
    expect(model.blockers).toEqual([]);
    expect(model.criteria.map((item) => item.id)).toEqual(expect.arrayContaining(["approval", "license", "channels", "release", "role"]));
    expect(model.criteria.find((item) => item.id === "role")?.value).toBe("Viewer can download the approved copy.");
  });

  it("keeps blocked records out of usable state and explains safe blocker reasons", () => {
    const model = buildRightsSafeExplanation(asset({
      status: "Needs Review",
      usageScope: "Do Not Publish",
      peopleRisk: "Possible minors",
      consentStatus: "Unknown",
      rightsStatus: "Needs review",
      rightsNotes: "Review required before reuse.",
      downloadPolicy: "not-downloadable",
      imageUrls: {
        small: "/small.jpg",
        card: "/card.jpg",
        collection: "/collection.jpg",
        detail: "/detail.jpg"
      },
      reviewer: "",
      reviewedDate: ""
    }), "Viewer");

    expect(model.reusable).toBe(false);
    expect(model.summary).toMatch(/needs review|Rights|People|review/i);
    expect(model.blockers.length).toBeGreaterThan(0);
    expect(model.criteria.find((item) => item.id === "role")?.value).toBe("Viewer cannot self-serve this download yet.");
    expect(model.criteria.find((item) => item.id === "license")?.state).toBe("review");
  });
});
