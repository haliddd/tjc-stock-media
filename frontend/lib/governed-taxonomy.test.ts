import { describe, expect, it } from "vitest";
import {
  governedTaxonomyForAsset,
  officialSearchTermsForAsset,
  taxonomyApprovalBoundary
} from "@/lib/governed-taxonomy";
import type { StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "tax-001",
    title: "Sabbath Bible study",
    thumbnail: "/thumb.jpg",
    thumbnailAlt: "Bible study",
    mediaType: "photo",
    collection: "Sabbath",
    status: "Needs Review",
    usageScope: "Do Not Publish",
    peopleRisk: "Unknown",
    rightsStatus: "Needs review",
    consentStatus: "Unknown",
    downloadPolicy: "not-downloadable",
    tags: ["Bible", "website"],
    tjcTerms: ["Sabbath Service"],
    usageTerms: ["Slides"],
    suggestedTags: ["classroom"],
    aiVisibleTagSuggestions: ["study table"],
    aiTjcTermSuggestions: ["Religious Education"],
    controlledVocabularySource: "approved-historical-tjc",
    ...overrides
  };
}

describe("governed taxonomy foundation", () => {
  it("keeps official search terms separate from suggested, AI, and system routing tags", () => {
    const tags = governedTaxonomyForAsset(asset());
    const official = officialSearchTermsForAsset(asset());

    expect(tags).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "Sabbath Service", class: "controlled", status: "locked", approvalTruth: false }),
      expect.objectContaining({ label: "Bible", class: "freeform", status: "accepted", approvalTruth: false }),
      expect.objectContaining({ label: "classroom", class: "suggested", status: "suggested", source: "review-suggestion", approvalTruth: false }),
      expect.objectContaining({ label: "study table", class: "suggested", status: "suggested", source: "ai-suggestion", approvalTruth: false }),
      expect.objectContaining({ label: "Rights or consent review", class: "system", routeOnly: true, approvalTruth: false }),
      expect.objectContaining({ label: "Approved copy missing", class: "system", routeOnly: true, approvalTruth: false })
    ]));
    expect(official).toEqual(expect.arrayContaining(["Sabbath Service", "Bible", "website", "Slides"]));
    expect(official).not.toEqual(expect.arrayContaining(["classroom", "study table", "Religious Education", "Rights or consent review", "Approved copy missing"]));
  });

  it("routes sensitive doctrine, hymn, testimony, minors, derivative, and source signals without approving reuse", () => {
    const tags = governedTaxonomyForAsset(asset({
      title: "Holy Communion testimony hymn",
      peopleRisk: "Possible minors",
      hymnNumberOrTitle: "Hymn 469",
      testimonyTheme: "healing",
      resourceSpaceId: undefined,
      sourceSystem: undefined,
      sourceAlbum: undefined
    }));
    const labels = tags.map((item) => item.label);

    expect(labels).toEqual(expect.arrayContaining([
      "Possible minors review",
      "Hymn/music rights review",
      "Doctrine/context review",
      "Testimony sensitivity review",
      "Source/provenance missing"
    ]));
    expect(tags.every((item) => item.approvalTruth === false)).toBe(true);
  });

  it("drops operational/source-looking labels from normal taxonomy outputs", () => {
    const tags = governedTaxonomyForAsset(asset({
      tags: ["Bible", "ResourceSpace ID 123", "source path /private/source.jpg", "hosted pagination fixture"],
      suggestedTags: ["checksum", "flowers"]
    }));
    const text = JSON.stringify(tags);

    expect(text).toContain("Bible");
    expect(text).toContain("flowers");
    expect(text).not.toMatch(/ResourceSpace|source path|hosted pagination fixture|checksum/i);
  });

  it("states the approval boundary explicitly", () => {
    expect(taxonomyApprovalBoundary()).toEqual({
      tagsApproveReuse: false,
      aiApprovesReuse: false,
      smartRulesApproveReuse: false,
      humanReviewRequired: true
    });
  });
});
