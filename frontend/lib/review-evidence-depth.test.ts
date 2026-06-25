import { describe, expect, it } from "vitest";
import {
  initialReviewEvidenceDepthChecklist,
  normalizeReviewEvidenceDepthChecklist,
  reviewEvidenceDepthDisabledReason,
  reviewEvidenceDepthItems,
  reviewEvidenceDepthMissingLabels
} from "@/lib/review-evidence-depth";
import type { StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "asset-1",
    title: "Mountain Lake Hero",
    thumbnail: "/thumb.jpg",
    thumbnailAlt: "Mountain Lake Hero",
    mediaType: "photo",
    collection: "Campaign 2024",
    status: "Approved Public",
    usageScope: "Public",
    peopleRisk: "No people",
    sourceSystem: "ResourceSpace export",
    rightsStatus: "Rights approved",
    downloadPolicy: "approved-copy-allowed",
    ...overrides
  };
}

describe("review evidence depth", () => {
  it("marks model release not required when no people are exported", () => {
    const checklist = initialReviewEvidenceDepthChecklist(asset());
    const items = reviewEvidenceDepthItems(asset(), checklist, "Approve Public");

    expect(checklist.modelReleaseChecked).toBe(true);
    expect(items.find((item) => item.field === "modelReleaseChecked")?.required).toBe(false);
    expect(items.find((item) => item.field === "brandGuidelinesChecked")?.required).toBe(true);
  });

  it("requires expanded evidence before public approval", () => {
    const checklist = initialReviewEvidenceDepthChecklist(asset({ peopleRisk: "Adults visible" }));
    const missing = reviewEvidenceDepthMissingLabels(asset({ peopleRisk: "Adults visible" }), checklist, "Approve Public");

    expect(missing).toEqual(expect.arrayContaining([
      "Brand guidelines not reviewed",
      "Property release not reviewed",
      "Usage rights not reviewed",
      "Location/talent permission not reviewed",
      "Legal review not confirmed",
      "Alt text not reviewed"
    ]));
    expect(reviewEvidenceDepthDisabledReason(asset({ peopleRisk: "Adults visible" }), checklist, "Approve Public")).toMatch(/Missing:/);
  });

  it("normalizes persisted depth fields as explicit booleans only", () => {
    expect(normalizeReviewEvidenceDepthChecklist({
      brandGuidelinesChecked: true,
      modelReleaseChecked: "true",
      propertyReleaseChecked: 1,
      usageRightsChecked: true,
      locationTalentPermissionChecked: false,
      legalReviewChecked: true,
      altTextChecked: null
    })).toEqual({
      brandGuidelinesChecked: true,
      modelReleaseChecked: false,
      propertyReleaseChecked: false,
      usageRightsChecked: true,
      locationTalentPermissionChecked: false,
      legalReviewChecked: true,
      altTextChecked: false
    });
  });
});
