import { describe, expect, it } from "vitest";
import { assetIsRightsSafeForCurrentUse, buildRightsSafeSummary, rightsSafeHiddenReasons } from "@/lib/rights-safe-search";
import type { StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "asset-1",
    title: "Sabbath service courtyard",
    thumbnail: "/thumb.jpg",
    thumbnailAlt: "Church courtyard",
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
    sourceSystem: "TJC local ResourceSpace export",
    sourceAccount: "Media Team",
    imageDimensions: "2400x1600",
    rightsStatus: "Rights approved",
    consentStatus: "Consent confirmed",
    usageGuidance: "Approved for website, print, and social media reuse.",
    downloadPolicy: "approved-copy-allowed",
    reviewer: "DAM Reviewer",
    reviewedDate: "2026-06-10",
    tags: ["church", "courtyard"],
    tjcTerms: ["sabbath"],
    rightsBasis: "TJC-owned",
    reuseTier: "stock-safe",
    visibilityTier: "public",
    sensitivityClass: "public-safe",
    approvedChannels: ["website", "social", "print"],
    domainReviewer: "DAM-reviewer",
    withdrawalStatus: "active",
    ...overrides
  };
}

describe("rights-safe search filtering", () => {
  it("allows only portal-ready assets for normal public reuse", () => {
    expect(assetIsRightsSafeForCurrentUse(asset())).toBe(true);
    expect(assetIsRightsSafeForCurrentUse(asset({
      id: "draft",
      status: "Needs Review",
      usageScope: "Do Not Publish",
      rightsStatus: "Unknown",
      consentStatus: "Unknown",
      downloadPolicy: "not-downloadable",
      imageUrls: {
        small: "/small.jpg",
        card: "/card.jpg",
        collection: "/collection.jpg",
        detail: "/detail.jpg"
      },
      reviewer: undefined,
      reviewedDate: undefined
    }))).toBe(false);
  });

  it("reports honest hidden counts and reasons without inventing approvals", () => {
    const ready = asset({ id: "ready" });
    const missingRights = asset({
      id: "missing-rights",
      rightsBasis: undefined,
      rightsStatus: "Unknown",
      consentStatus: "Unknown",
      rightsNotes: undefined
    });
    const draft = asset({
      id: "draft",
      status: "Needs Review",
      usageScope: "Do Not Publish",
      downloadPolicy: "not-downloadable",
      reviewer: undefined,
      reviewedDate: undefined
    });
    const before = [ready, missingRights, draft];
    const after = before.filter(assetIsRightsSafeForCurrentUse);
    const summary = buildRightsSafeSummary(before, after, true);

    expect(after.map((item) => item.id)).toEqual(["ready"]);
    expect(summary.active).toBe(true);
    expect(summary.totalBefore).toBe(3);
    expect(summary.totalAfter).toBe(1);
    expect(summary.hidden).toBe(2);
    expect(summary.explanation).toMatch(/2 assets hidden/);
    expect(summary.hiddenReasons.map((item) => item.label)).toEqual(expect.arrayContaining([
      "rights or release evidence missing",
      "draft, submitted, or review evidence pending"
    ]));
  });

  it("keeps hidden reason labels safe for public UI", () => {
    const reasons = rightsSafeHiddenReasons([
      asset({ id: "rights", rightsStatus: "Unknown", consentStatus: "Unknown", rightsBasis: undefined }),
      asset({ id: "expired", rightsExpirationDate: "2026-01-01" })
    ]);

    expect(reasons.some((item) => item.label.includes("ResourceSpace"))).toBe(false);
    expect(reasons.map((item) => item.label)).toEqual(expect.arrayContaining([
      "rights or release evidence missing",
      "expired, stale, or missing reviewer/date"
    ]));
  });
});
