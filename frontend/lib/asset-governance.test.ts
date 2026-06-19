import { describe, expect, it } from "vitest";
import { assetGovernancePassport, assetHasPortalTruthBoundary, assetLibraryScanSummary, assetPortalBlockers, assetReviewComplete, assetSourceRecordTruthRows } from "@/lib/asset-governance";
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
    expect(scan.sourceCustodyLabel).toBe("Full file restricted");
    expect(serialized).not.toContain("/Shared Drives/private");
    expect(serialized).not.toContain("private-master.jpg");
    expect(serialized).not.toContain("aaaaaaaaaaaa");
    expect(JSON.stringify(assetLibraryScanSummary(privateAsset, "Contributor"))).not.toContain("ResourceSpace");
    expect(assetLibraryScanSummary(privateAsset, "Reviewer").sourceCustodyLabel).toBe("Source record ref");
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

  it("uses bridge aliases for source truth without clearing rights gates", () => {
    const bridged = asset({
      status: "Approved Public",
      usageScope: "Public",
      peopleRisk: "No people",
      rightsStatus: undefined,
      rights_status: "Rights approved",
      rightsBasis: "TJC-owned",
      reviewer: undefined,
      reviewedDate: undefined,
      reviewed_by: "Reviewer One",
      reviewed_at: "2026-06-01",
      resourceSpaceId: undefined,
      resource_space_id: "rs-9001",
      checksumSha256: undefined,
      checksum: "b".repeat(64),
      sourcePath: undefined,
      source_path: "/Shared Drives/archive/album/source.jpg",
      sourceAlbum: undefined,
      source_album: "Sabbath album",
      sourceSystem: "ResourceSpace import",
      originalFilename: "source.jpg",
      masterCustodyPathStatus: "verified",
      imageDimensions: "2400 x 1600",
      imageUrls: {
        small: "/small.jpg",
        card: "/card.jpg",
        collection: "/collection.jpg",
        detail: "/detail.jpg",
        download: "/download.jpg"
      },
      downloadPolicy: "approved-copy-allowed",
      approvedChannels: ["website"]
    });
    const blockers = assetPortalBlockers(bridged);

    expect(assetHasPortalTruthBoundary(bridged)).toBe(true);
    expect(assetReviewComplete(bridged)).toBe(true);
    expect(blockers).not.toContain("Import/source truth missing");
    expect(blockers).not.toContain("Metadata contract missing: rights_status");
    expect(blockers).not.toContain("Metadata contract missing: reviewed_by");
    expect(blockers).not.toContain("Metadata contract missing: reviewed_date");
    expect(blockers).not.toContain("Reviewer/date missing");
    expect(blockers).toContain("Rights/consent unclear");
    expect(assetSourceRecordTruthRows(bridged)).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Source record ID", value: "rs-9001" }),
      expect.objectContaining({ label: "Source album", value: "Sabbath album" }),
      expect.objectContaining({ label: "Reviewer", value: "Reviewer One" }),
      expect.objectContaining({ label: "Checksum", value: "b".repeat(64) })
    ]));
    expect(assetSourceRecordTruthRows(bridged, { privateCustodyRestricted: true })).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Source path", value: "Restricted to DAM admin" }),
      expect.objectContaining({ label: "Checksum", value: "Restricted to DAM admin" })
    ]));
  });
});
