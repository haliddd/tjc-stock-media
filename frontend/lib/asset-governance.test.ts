import { describe, expect, it } from "vitest";
import { assetGovernancePassport, assetLibraryScanSummary } from "@/lib/asset-governance";
import type { StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "asset-1",
    title: "Sabbath fellowship",
    thumbnail: "",
    thumbnailAlt: "Sabbath fellowship",
    mediaType: "photo",
    collection: "Fellowship",
    status: "Needs Review",
    usageScope: "Do Not Publish",
    peopleRisk: "Possible minors",
    rightsStatus: "Needs review",
    consentStatus: "Unknown",
    reviewer: "",
    reviewedDate: "",
    downloadPolicy: "not-downloadable",
    resourceSpaceId: "1234",
    sourcePath: "/Shared Drives/private/master.jpg",
    masterDrivePath: "/Shared Drives/private/master.jpg",
    sourceAlbumPath: "/Shared Drives/private/album",
    originalFilename: "private-master.jpg",
    checksumSha256: "a".repeat(64),
    fileExtension: "jpg",
    fileSizeBytes: 2048,
    imageUrls: {
      small: "",
      card: "",
      collection: "",
      detail: "",
      download: ""
    },
    ...overrides
  };
}

describe("asset library governance scan", () => {
  it("keeps library scan and passport output free of private custody internals", () => {
    const privateAsset = asset();
    const scan = assetLibraryScanSummary(privateAsset, "Viewer");
    const passport = assetGovernancePassport(privateAsset);
    const serialized = JSON.stringify({ scan, passport });

    expect(scan.nextAction).toBe("Request DAM review");
    expect(scan.sourceCustodyLabel).toBe("Source/original restricted");
    expect(serialized).not.toContain("/Shared Drives/private");
    expect(serialized).not.toContain("private-master.jpg");
    expect(serialized).not.toContain("aaaaaaaaaaaa");
    expect(JSON.stringify(assetLibraryScanSummary(privateAsset, "Contributor"))).not.toContain("ResourceSpace");
    expect(assetLibraryScanSummary(privateAsset, "Reviewer").sourceCustodyLabel).toBe("ResourceSpace ref");
  });

  it("changes next action by role without clearing review gates", () => {
    const reviewAsset = asset({
      status: "Approved Public",
      usageScope: "Public",
      rightsStatus: "Rights approved",
      consentStatus: "Unknown",
      peopleRisk: "Possible minors",
      downloadPolicy: "approved-copy-allowed"
    });

    expect(assetLibraryScanSummary(reviewAsset, "Viewer").nextAction).toBe("Request DAM review");
    expect(assetLibraryScanSummary(reviewAsset, "Reviewer").nextAction).toBe("Verify consent");
  });
});
