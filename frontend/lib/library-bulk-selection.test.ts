import { describe, expect, it } from "vitest";
import {
  buildLibraryMetadataCsv,
  buildLibraryBulkActions,
  buildLibrarySelectionSummary,
  reconcileVisibleSelection,
  selectRangeInVisibleOrder,
  shouldShowBulkBar,
  toggleSelectedId
} from "@/lib/library-bulk-selection";
import type { StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "asset-1",
    title: "Sabbath worship",
    thumbnail: "/placeholder.svg",
    thumbnailAlt: "Preview",
    mediaType: "photo",
    collection: "MVP",
    status: "Approved Public",
    usageScope: "Public",
    peopleRisk: "No people",
    rightsStatus: "Rights approved",
    consentStatus: "Not applicable",
    rightsNotes: "TJC-owned rights approved.",
    reviewer: "Reviewer",
    reviewedDate: "2026-06-01",
    sourceAccount: "lm.photos@tjc.org",
    sourceSystem: "LM Photos",
    sourceAlbumPath: "LM Photos / MVP",
    imageDimensions: "2400x1600",
    imageUrls: {
      small: "/api/assets/thumbnail/asset-1",
      card: "/api/assets/thumbnail/asset-1",
      collection: "/api/assets/thumbnail/asset-1",
      detail: "/api/assets/thumbnail/asset-1",
      download: "/api/download/asset-1"
    },
    downloadPolicy: "approved-copy-allowed",
    fileSizeBytes: 1200,
    tags: ["worship", "sabbath"],
    tjcTerms: ["church"],
    rightsBasis: "TJC-owned",
    approvedChannels: ["website"],
    withdrawalStatus: "active",
    ...overrides
  };
}

describe("library bulk selection helpers", () => {
  it("toggles individual selection and reports bulk bar visibility", () => {
    expect(toggleSelectedId([], "a")).toEqual(["a"]);
    expect(toggleSelectedId(["a", "b"], "a")).toEqual(["b"]);
    expect(shouldShowBulkBar(0)).toBe(false);
    expect(shouldShowBulkBar(1)).toBe(true);
  });

  it("selects a shift range using visible sorted order", () => {
    expect(selectRangeInVisibleOrder({
      currentIds: ["a"],
      visibleIds: ["a", "b", "c", "d"],
      anchorId: "a",
      targetId: "c"
    })).toEqual(["a", "b", "c"]);
  });

  it("clears hidden selections when visible page or filters change", () => {
    expect(reconcileVisibleSelection(["a", "b", "c"], ["b", "d"])).toEqual({
      nextIds: ["b"],
      hiddenCount: 2
    });
  });

  it("keeps reviewer/admin bulk actions away from viewers and contributors", () => {
    const viewerLabels = buildLibraryBulkActions([asset()], "Viewer").map((action) => action.label);
    const contributorLabels = buildLibraryBulkActions([asset()], "Contributor").map((action) => action.label);

    expect(viewerLabels).not.toContain("Send to review");
    expect(viewerLabels).not.toContain("Mark internal-only");
    expect(viewerLabels).not.toContain("Approve");
    expect(viewerLabels).not.toContain("Reject");
    expect(viewerLabels).not.toContain("Archive");
    expect(contributorLabels).not.toContain("Approve");
    expect(contributorLabels).not.toContain("Reject");
    expect(contributorLabels).not.toContain("Archive");
    expect(contributorLabels).toContain("Send to review");
  });

  it("disables unimplemented bulk workflows with helper copy", () => {
    const actions = buildLibraryBulkActions([asset()], "DAM Admin");
    const disabledIds = [
      "add-to-collection",
      "create-collection",
      "request-reuse",
      "send-review",
      "assign-tags",
      "mark-internal",
      "download-approved",
      "approve",
      "reject",
      "archive"
    ];

    disabledIds.forEach((id) => {
      const action = actions.find((item) => item.id === id);
      expect(action?.enabled).toBe(false);
      expect(action?.disabledReason).toBeTruthy();
    });
    const exportAction = actions.find((item) => item.id === "export-metadata");
    expect(exportAction?.enabled).toBe(true);
    expect(exportAction?.disabledReason).toBeUndefined();
  });

  it("marks mixed bulk download as partial and approved-copy gated", () => {
    const actions = buildLibraryBulkActions([
      asset({ id: "ready" }),
      asset({
        id: "needs-review",
        status: "Needs Review",
        usageScope: "Do Not Publish",
        rightsStatus: "Unknown",
        consentStatus: "Missing",
        imageUrls: {
          small: "/api/assets/thumbnail/needs-review",
          card: "/api/assets/thumbnail/needs-review",
          collection: "/api/assets/thumbnail/needs-review",
          detail: "/api/assets/thumbnail/needs-review"
        },
        downloadPolicy: "not-downloadable"
      })
    ], "Viewer");
    const download = actions.find((action) => action.id === "download-approved");

    expect(download).toMatchObject({
      enabled: false,
      eligibleCount: 1,
      totalCount: 2,
      statusLabel: "1 of 2 eligible"
    });
    expect(download?.warning).toContain("excluded by approved-copy gate");
    expect(download?.disabledReason).toContain("Source/original files remain restricted");
  });

  it("summarizes multi-selection status, type, rights, tags, refs, and warnings", () => {
    const summary = buildLibrarySelectionSummary([
      asset({ id: "ready", resourceSpaceId: "1001", tags: ["shared", "ready"] }),
      asset({
        id: "unclear",
        resourceSpaceId: "1002",
        status: "Needs Review",
        usageScope: "Do Not Publish",
        rightsStatus: "Rights unclear",
        consentStatus: "Unknown",
        tags: ["shared", "review"]
      })
    ], "Reviewer");

    expect(summary.count).toBe(2);
    expect(summary.statusBreakdown).toEqual(expect.arrayContaining([["Needs Review", 1], ["Approved Public", 1]]));
    expect(summary.typeBreakdown).toEqual([["Photo", 2]]);
    expect(summary.rightsBreakdown[0]?.[0]).toBe("Rights/consent unclear");
    expect(summary.sharedTags).toEqual(["shared"]);
    expect(summary.resourceSpaceIds).toEqual(["1001", "1002"]);
    expect(summary.warnings.join(" ")).toContain("Source/original files are excluded");
    expect(summary.actions.some((action) => action.id === "approve")).toBe(true);
  });

  it("exports only role-safe selected metadata fields", () => {
    const csv = buildLibraryMetadataCsv([
      asset({
        id: "ready",
        title: "Comma, quote \"test\"",
        resourceSpaceId: "1001",
        sourceAlbumPath: "LM Photos / Private Album",
        sourcePath: "/Shared Drive/Originals/private.jpg",
        masterDrivePath: "/Master Archive/private.jpg",
        originalFilename: "IMG_0001.ORIGINAL.JPG",
        checksumSha256: "secret-checksum"
      })
    ]);

    expect(csv.split("\n")[0]).toBe("\"id\",\"title\",\"status\",\"type\",\"collection\",\"rights\",\"usage-scope\",\"reference\"");
    expect(csv).toContain("\"Comma, quote \"\"test\"\"\"");
    expect(csv).toContain("\"Approved Public\"");
    expect(csv).not.toContain("Private Album");
    expect(csv).not.toContain("/Shared Drive/Originals");
    expect(csv).not.toContain("/Master Archive");
    expect(csv).not.toContain("IMG_0001.ORIGINAL.JPG");
    expect(csv).not.toContain("secret-checksum");
    expect(csv).not.toContain("sourceAlbumPath");
    expect(csv).not.toContain("resourceSpaceUrl");
  });
});
