import { describe, expect, it } from "vitest";
import { smartRulesDryRunForAsset } from "@/lib/smart-rules-dry-run";
import type { StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "rule-001",
    title: "Sabbath testimony hymn",
    thumbnail: "/thumb.jpg",
    thumbnailAlt: "Sabbath testimony hymn",
    imageUrls: {
      small: "/small.jpg",
      card: "/card.jpg",
      collection: "/collection.jpg",
      detail: "/detail.jpg"
    },
    mediaType: "photo",
    collection: "Religious Education",
    status: "Needs Review",
    usageScope: "Do Not Publish",
    peopleRisk: "Possible minors",
    rightsStatus: "Needs review",
    consentStatus: "Unknown",
    downloadPolicy: "not-downloadable",
    tags: ["choir", "testimony"],
    tjcTerms: ["Holy Communion"],
    ...overrides
  };
}

describe("smart rules dry run", () => {
  it("suggests review routes and blockers without approving or writing", () => {
    const result = smartRulesDryRunForAsset(asset());
    const ids = result.actions.map((item) => item.id);

    expect(ids).toEqual(expect.arrayContaining([
      "possible-minors-review",
      "hymn-music-rights-review",
      "doctrine-context-review",
      "testimony-sensitivity-review",
      "missing-approved-derivative",
      "missing-source-provenance"
    ]));
    expect(result.blockers).toEqual(expect.arrayContaining(["missing-approved-derivative", "missing-source-provenance"]));
    expect(result.actions.every((item) =>
      item.canApprove === false
      && item.canMarkPortalReady === false
      && item.canEnableDownload === false
      && item.canWriteResourceSpace === false
    )).toBe(true);
    expect(result.approvalBoundary).toEqual({
      tagsApproveReuse: false,
      aiApprovesReuse: false,
      smartRulesApproveReuse: false,
      humanReviewRequired: true
    });
  });

  it("keeps clean assets as no-op suggestions, not proof of launch readiness", () => {
    const result = smartRulesDryRunForAsset(asset({
      title: "Flower arrangement",
      collection: "Seasonal details",
      status: "Approved Public",
      usageScope: "Public",
      peopleRisk: "No people",
      tags: ["flowers"],
      tjcTerms: ["Sabbath Service"],
      imageUrls: {
        small: "/small.jpg",
        card: "/card.jpg",
        collection: "/collection.jpg",
        detail: "/detail.jpg",
        download: "/download.jpg"
      },
      downloadPolicy: "approved-copy-allowed",
      resourceSpaceId: "123",
      sourceSystem: "ResourceSpace",
      sourceAlbum: "Seasonal"
    }));

    expect(result.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "doctrine-context-review", canApprove: false })
    ]));
    expect(result.blockers).toEqual([]);
    expect(result.approvalBoundary.humanReviewRequired).toBe(true);
  });
});
