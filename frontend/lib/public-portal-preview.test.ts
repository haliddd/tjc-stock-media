import { describe, expect, it } from "vitest";
import { buildPublicPortalPreview, normalizePublicPortalMediaType, normalizePublicPortalSort } from "@/lib/public-portal-preview";
import type { MediaSourceStatus, StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "asset-1",
    title: "Bible study detail",
    thumbnail: "/api/assets/thumbnail/asset-1",
    thumbnailAlt: "Bible study detail",
    preview: "/api/assets/thumbnail/asset-1?variant=detail",
    imageUrls: {
      small: "/api/assets/thumbnail/asset-1?variant=small",
      card: "/api/assets/thumbnail/asset-1?variant=card",
      collection: "/api/assets/thumbnail/asset-1?variant=collection",
      detail: "/api/assets/thumbnail/asset-1?variant=detail",
      download: "/api/download/asset-1?variant=download"
    },
    mediaType: "photo",
    collection: "Sabbath",
    status: "Approved Public",
    usageScope: "Public",
    peopleRisk: "No people",
    sourceSystem: "ResourceSpace",
    sourceAlbum: "Sabbath",
    originalFilename: "bible-study-detail.jpg",
    masterCustodyPathStatus: "verified",
    checksumSha256: "a".repeat(64),
    imageDimensions: "2400x1600",
    rightsStatus: "Rights approved",
    rightsNotes: "TJC-owned; approved for public ministry use.",
    rightsBasis: "TJC-owned",
    approvedChannels: ["website"],
    reviewer: "Media Reviewer",
    reviewedDate: "2026-06-01",
    usageGuidance: "Approved for website and slide background use.",
    downloadPolicy: "approved-copy-allowed",
    reuseTier: "stock-safe",
    visibilityTier: "public",
    sensitivityClass: "public-safe",
    ...overrides
  };
}

const source: MediaSourceStatus = {
  adapter: "exported-metadata",
  label: "ResourceSpace export",
  detail: "test source",
  readOnly: true
};

describe("public portal preview", () => {
  it("normalizes unsupported filters to safe defaults", () => {
    expect(normalizePublicPortalSort("copied-link")).toBe("curated");
    expect(normalizePublicPortalMediaType("share")).toBe("all");
  });

  it("shows only Portal Ready collection assets and keeps demo link honest", () => {
    const ready = asset({ id: "ready-1", title: "Sabbath Bible detail" });
    const needsReview = asset({
      id: "review-1",
      title: "Sabbath youth fellowship",
      status: "Needs Review",
      usageScope: "Do Not Publish",
      peopleRisk: "Possible minors",
      rightsStatus: "Needs review",
      rightsNotes: "Review required.",
      downloadPolicy: "not-downloadable"
    });
    const otherCollection = asset({
      id: "other-1",
      title: "Flowers",
      collection: "Seasonal Details",
      sourceAlbum: "Seasonal Details",
      originalFilename: "seasonal-detail.jpg",
      tags: ["flowers"]
    });

    const preview = buildPublicPortalPreview({
      assets: [ready, needsReview, otherCollection],
      source,
      collectionId: "sabbath",
      sort: "curated",
      mediaType: "all"
    });

    expect(preview).not.toBeNull();
    expect(preview?.assets.map((item) => item.id)).toEqual(["ready-1"]);
    expect(preview?.counts.collectionMatches).toBe(2);
    expect(preview?.counts.portalReady).toBe(1);
    expect(preview?.linkEnabled).toBe(false);
    expect(preview?.localDemoNotice).toBe("Public link not enabled in local demo.");
    expect(JSON.stringify(preview?.assets)).not.toContain("originalFilename");
    expect(JSON.stringify(preview?.assets)).not.toContain("checksumSha256");
    expect(JSON.stringify(preview?.assets)).not.toContain("ResourceSpace");
  });

  it("explains zero Portal Ready collection matches with safe readiness diagnostics", () => {
    const missingReviewer = asset({
      id: "missing-reviewer",
      title: "Sabbath approved but unreviewed",
      reviewer: undefined,
      reviewedDate: undefined
    });
    const rightsBlocked = asset({
      id: "rights-blocked",
      title: "Sabbath rights unclear",
      rightsStatus: "Needs review",
      rightsNotes: "Review required before sharing."
    });
    const derivativeBlocked = asset({
      id: "derivative-blocked",
      title: "Sabbath derivative gap",
      imageUrls: {
        small: "/api/assets/thumbnail/asset-1?variant=small",
        card: "/api/assets/thumbnail/asset-1?variant=card",
        collection: "",
        detail: ""
      }
    });
    const publishBlocked = asset({
      id: "publish-blocked",
      title: "Sabbath pending approval",
      status: "Needs Review",
      usageScope: "Do Not Publish"
    });

    const preview = buildPublicPortalPreview({
      assets: [missingReviewer, rightsBlocked, derivativeBlocked, publishBlocked],
      source,
      collectionId: "sabbath",
      sort: "curated",
      mediaType: "all"
    });

    expect(preview?.assets).toEqual([]);
    expect(preview?.counts.collectionMatches).toBe(4);
    expect(preview?.counts.portalReady).toBe(0);
    expect(preview?.readinessDiagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "reviewer-date", count: expect.any(Number), href: "/review?queue=missing-evidence" }),
      expect.objectContaining({ id: "rights-consent", count: expect.any(Number), href: "/review?queue=rights-review" }),
      expect.objectContaining({ id: "approved-copy", count: expect.any(Number), href: "/review?queue=derivative-gap" }),
      expect.objectContaining({ id: "publish-state", count: expect.any(Number), href: "/review?queue=pending" })
    ]));
    expect(JSON.stringify(preview?.readinessDiagnostics)).not.toContain("originalFilename");
    expect(JSON.stringify(preview?.readinessDiagnostics)).not.toContain("checksumSha256");
    expect(JSON.stringify(preview?.readinessDiagnostics)).not.toContain("/private");
  });

  it("returns null for unknown collections instead of inventing a portal", () => {
    expect(buildPublicPortalPreview({ assets: [asset()], source, collectionId: "missing" })).toBeNull();
  });
});
