import { describe, expect, it } from "vitest";
import { publicAssetRef } from "@/lib/asset-refs";
import { createPackageDraft, resolvePackageSections } from "@/lib/package-drafts";
import {
  buildPackageGovernance,
  buildPackageManifestPreviewRows,
  buildPackagePortalReadinessInspector
} from "@/lib/package-governance";
import { sanitizePackageDraft } from "@/lib/package-store";
import { sanitizeSavedSearch } from "@/lib/saved-search-store";
import type { DamPackage, StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "asset-1",
    title: "Approved church web image",
    thumbnail: "/thumb.jpg",
    thumbnailAlt: "Church service",
    imageUrls: {
      small: "/small.jpg",
      card: "/card.jpg",
      collection: "/collection.jpg",
      detail: "/detail.jpg",
      download: "/download.jpg"
    },
    mediaType: "photo",
    collection: "Sabbath",
    status: "Approved Public",
    usageScope: "Public",
    peopleRisk: "No people",
    rightsStatus: "Rights approved",
    consentStatus: "Consent confirmed",
    usageGuidance: "Use for local prototype package draft checks.",
    downloadPolicy: "approved-copy-allowed",
    resourceSpaceId: "1001",
    reviewer: "Reviewer One",
    reviewedDate: "2026-06-01",
    tags: ["worship"],
    tjcTerms: ["service"],
    ...overrides
  };
}

function packageDraftWithRefs(refs: string[]): DamPackage {
  return {
    ...createPackageDraft("Package Draft"),
    sections: [
      { id: "cover", title: "Cover", resourceSpaceAssetIds: refs },
      { id: "hero-assets", title: "01. Hero Assets", resourceSpaceAssetIds: [] },
      { id: "social-media", title: "02. Social Media", resourceSpaceAssetIds: [] },
      { id: "documents", title: "03. Documents", resourceSpaceAssetIds: [] }
    ]
  };
}

describe("delivery package and saved search payload safety", () => {
  it("keeps package drafts to sanitized resource refs only", () => {
    const draft = sanitizePackageDraft({
      id: "../private-draft",
      title: "Sunday set",
      collectionId: "/Shared Drives/TJC Stock Media/source",
      sections: [
        {
          id: "cover",
          title: "Cover",
          resourceSpaceAssetIds: ["1001", "/Users/hali/source.jpg", "1001", "TJC_IMG_2002", "abc/def"]
        }
      ]
    });

    expect(draft.id).toBe("portal-local-draft");
    expect(draft.collectionId).toBeUndefined();
    expect(draft.sections[0]?.resourceSpaceAssetIds).toEqual(["1001", "TJC_IMG_2002"]);
  });

  it("keeps saved searches to display criteria without private paths", () => {
    const search = sanitizeSavedSearch({
      title: "Website hero picks",
      query: "/Users/hali/Downloads/private church media",
      view: "approved-church-wide",
      collection: "../secret-album",
      filters: ["worship", "/Shared Drives/TJC Stock Media/source", "worship"],
      sort: "Approved first"
    });

    expect(search.query).toBe("");
    expect(search.view).toBe("approved-church-wide");
    expect(search.collection).toBeUndefined();
    expect(search.filters).toEqual(["worship"]);
  });

  it("uses public asset ids for non-ops copy references", () => {
    expect(publicAssetRef({ id: "asset-safe-1" })).toBe("asset-safe-1");
    expect(publicAssetRef({ id: "/Shared Drives/TJC Stock Media/source.jpg" })).toBe("media-record");
  });

  it("summarizes portal/share readiness without enabling delivery actions", () => {
    const ready = asset();
    const missingDerivative = asset({
      id: "asset-2",
      resourceSpaceId: "1002",
      imageUrls: {
        small: "/small-2.jpg",
        card: "/card-2.jpg",
        collection: "/collection-2.jpg",
        detail: "/detail-2.jpg"
      }
    });
    const draft = packageDraftWithRefs(["1001", "1002"]);
    const governance = buildPackageGovernance(draft, resolvePackageSections(draft, [ready, missingDerivative]), "DAM Admin");
    const inspector = buildPackagePortalReadinessInspector(governance);

    expect(inspector.selectedAssets).toBe(2);
    expect(inspector.blockedAssets).toBeGreaterThanOrEqual(1);
    expect(inspector.missingDerivatives).toBeGreaterThanOrEqual(1);
    expect(governance.canShare).toBe(false);
    expect(governance.canPublish).toBe(false);
    expect(governance.canDownloadPackage).toBe(false);
  });

  it("builds manifest preview rows as ref, rendition, status, and reason", () => {
    const draft = packageDraftWithRefs(["1001"]);
    const governance = buildPackageGovernance(draft, resolvePackageSections(draft, [asset()]), "DAM Admin");
    const rows = buildPackageManifestPreviewRows(governance);

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({
        assetRef: "1001",
        allowedRendition: "Approved web copy",
        status: "ready",
        reason: expect.stringContaining("Approved web copy")
      }),
      expect.objectContaining({
        assetRef: "1001",
        allowedRendition: "Original restricted",
        status: "request-only",
        reason: expect.stringContaining("request workflow")
      })
    ]));
  });
});
