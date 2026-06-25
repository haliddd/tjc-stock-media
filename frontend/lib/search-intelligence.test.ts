import { describe, expect, it } from "vitest";
import { matchedBecauseChips } from "@/lib/search-intelligence";
import type { SearchResult, StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "asset-1",
    title: "Mountain Lake Hero",
    thumbnail: "/thumb.jpg",
    thumbnailAlt: "Mountain Lake Hero",
    mediaType: "photo",
    collection: "Outdoor Heroes",
    status: "Approved Public",
    usageScope: "Public",
    peopleRisk: "No people",
    sourceSystem: "ResourceSpace export",
    rightsStatus: "Worldwide rights",
    approvedChannels: ["website", "social"],
    usageTerms: ["hero image", "outdoor"],
    tags: ["mountain", "lake"],
    region: "Worldwide",
    reuseDecision: {
      state: "portal-ready",
      label: "Portal ready",
      summary: "ready",
      downloadable: true,
      previewTier: "reusable-preview",
      blockers: [],
      reasonCodes: [],
      allowedRenditions: ["web"]
    },
    downloadPolicy: "approved-copy-allowed",
    ...overrides
  };
}

const discovery: SearchResult["discovery"] = {
  mode: "smart-query",
  summary: "Search summary",
  expandedTerms: ["mountain", "hero image"],
  matchedIntent: {
    id: "website-hero",
    label: "Website hero",
    query: "hero image",
    description: "",
    safetyNote: ""
  },
  intentPresets: [],
  suggestedFilters: [],
  scoreHint: "",
  rankingExplanation: [],
  safetyNote: ""
};

describe("search intelligence", () => {
  it("derives matched-because chips from existing metadata and rights-safe state", () => {
    const chips = matchedBecauseChips(asset(), "outdoor hero images", discovery, true);

    expect(chips).toEqual(expect.arrayContaining(["hero image", "outdoor", "approved for web", "Worldwide", "rights-safe"]));
  });
});
