import { describe, expect, it } from "vitest";
import { buildDownloadCenterModel } from "@/lib/download-center";
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
    fileExtension: "jpg",
    fileSizeBytes: 1048576,
    rightsStatus: "Rights approved",
    rightsNotes: "TJC-owned; approved for church website use.",
    consentStatus: "Not applicable",
    usageGuidance: "Approved for website and slide use.",
    downloadPolicy: "approved-copy-allowed",
    reviewer: "DAM Reviewer",
    reviewedDate: "2026-06-10",
    tags: ["worship"],
    tjcTerms: ["sabbath"],
    rightsBasis: "TJC-owned",
    reuseTier: "stock-safe",
    visibilityTier: "public",
    sensitivityClass: "public-safe",
    approvedChannels: ["website", "social"],
    domainReviewer: "DAM-reviewer",
    withdrawalStatus: "active",
    ...overrides
  };
}

describe("download center model", () => {
  it("keeps approved copy and original access separate", () => {
    const model = buildDownloadCenterModel(asset(), "Viewer");
    const web = model.rows.find((row) => row.id === "approved-web-copy");

    expect(web).toMatchObject({
      status: "ready",
      routeBoundary: "approved-copy-gate",
      fileType: "JPG",
      dimensions: "1400x900",
      fileSize: "1.0 MB"
    });
    expect(web?.downloadHref).toBe("/api/download/asset-1?role=Viewer");
    expect(model.originalAccess.state).toBe("blocked");
    expect(model.originalAccess.requestHref).toContain("mailto:media@tjc.org");
    expect(model.truthNote).toContain("current backend truth");
  });

  it("uses request-needed states when renditions are missing", () => {
    const model = buildDownloadCenterModel(asset({
      imageUrls: {
        small: "/small.jpg",
        card: "/card.jpg",
        collection: "/collection.jpg",
        detail: "/detail.jpg"
      },
      imageDimensions: undefined,
      fileSizeBytes: undefined,
      downloadPolicy: "not-downloadable",
      rightsStatus: "Needs review",
      rightsNotes: "Review required before reuse.",
      usageGuidance: "",
      reviewer: "",
      reviewedDate: ""
    }), "Viewer");
    const web = model.rows.find((row) => row.id === "approved-web-copy");
    const print = model.rows.find((row) => row.id === "approved-print-copy");
    const sidecar = model.addons.find((item) => item.id === "metadata-sidecar");

    expect(web?.status).toBe("request-needed");
    expect(web?.downloadHref).toBeUndefined();
    expect(print?.status).toBe("request-needed");
    expect(sidecar?.status).toBe("request-needed");
    expect(model.addons.find((item) => item.id === "usage-notes")?.status).toBe("request-needed");
  });
});
