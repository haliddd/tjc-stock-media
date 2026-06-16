import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { requestIdentity, resolveClientRoleOverride } from "@/lib/request-identity";
import { scopedCatalogAssetsForRole } from "@/lib/catalog-scope";
import { demoFallbackAssets, demoFallbackStatus } from "@/lib/media-source/demo-fallback";
import { resourceSpaceSearchAll } from "@/lib/resourcespace-client";
import { validateAssetMetadataContract } from "@/lib/resourcespace-schema";
import { assetForRolePayload } from "@/lib/source-redaction";
import type { StockMediaAsset } from "@/lib/types";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

function nextRequest(url: string) {
  return new NextRequest(url);
}

function approvedAsset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "1001",
    title: "Approved public fixture",
    thumbnail: "/thumb.jpg",
    thumbnailAlt: "Approved public fixture",
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
    sourceSystem: "ResourceSpace",
    sourcePlatform: "Google Shared Drive",
    sourceAlbum: "Sabbath",
    sourcePath: "/private/source.jpg",
    masterDrivePath: "/Shared Drives/TJC Stock Media/source.jpg",
    originalFilename: "source.jpg",
    checksumSha256: "a".repeat(64),
    rightsStatus: "Rights approved",
    consentStatus: "Consent confirmed",
    reviewer: "Reviewer One",
    reviewedDate: "2026-06-01",
    rightsNotes: "Approved for public church use.",
    imageDimensions: "2400 x 1600",
    downloadPolicy: "approved-copy-allowed",
    ...overrides
  };
}

describe("production identity guard", () => {
  it("ignores client role overrides in production when trusted SSO is not enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.SSO_TRUSTED_HEADERS = "0";
    process.env.SSO_PROVIDER = "";

    const request = nextRequest("https://stock-media.example.tjc.org/api/admin/readiness?role=DAM%20Admin");
    const override = resolveClientRoleOverride(request, "DAM Admin");
    const identity = requestIdentity(request, "DAM Admin");

    expect(override.allowed).toBe(false);
    expect(override.ignored).toBe(true);
    expect(override.reasonCode).toBe("production-client-role-ignored");
    expect(identity.role).toBe("Viewer");
    expect(identity.id).toBe("production:trusted-identity-missing");
  });

  it("maps trusted SSO groups through strongest role precedence", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.SSO_TRUSTED_HEADERS = "1";
    process.env.SSO_ROLE_MAP_JSON = JSON.stringify({ "media-reviewers": "Reviewer", "media-admins": "DAM Admin" });

    const request = nextRequest("https://stock-media.example.tjc.org/api/review?role=Viewer");
    request.headers.set("cf-access-authenticated-user-email", "reviewer@example.org");
    request.headers.set("cf-access-groups", "members,media-reviewers,media-admins");
    const identity = requestIdentity(request, "Viewer");

    expect(identity.role).toBe("DAM Admin");
    expect(identity.email).toBe("reviewer@example.org");
    expect(identity.sourceSystem).toBe("sso");
  });
});

describe("ResourceSpace pagination", () => {
  it("reads more than 2,100 ResourceSpace records without truncating at 1,000", async () => {
    process.env.RESOURCESPACE_BASE_URL = "https://resourcespace.example.org";
    process.env.RESOURCESPACE_API_USER = "api";
    process.env.RESOURCESPACE_API_KEY = "secret";
    process.env.RESOURCESPACE_API_PAGE_SIZE = "500";
    process.env.RESOURCESPACE_API_MAX_PAGES = "10";
    const total = 2105;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const parsed = new URL(url);
      const offset = Number(parsed.searchParams.get("offset") || "0");
      const fetchrows = Number(parsed.searchParams.get("fetchrows") || "500");
      const rows = Array.from({ length: Math.max(0, Math.min(fetchrows, total - offset)) }, (_, index) => ({ ref: offset + index + 1 }));
      return new Response(JSON.stringify(rows), { status: 200 });
    }));

    const result = await resourceSpaceSearchAll<{ ref: number }>({ function: "do_search", search: "" });

    expect(result.ok).toBe(true);
    expect(result.complete).toBe(true);
    expect(result.records).toBe(total);
    expect(result.data).toHaveLength(total);
  });

  it("fails safely instead of returning partial completeness when a page fails", async () => {
    process.env.RESOURCESPACE_BASE_URL = "https://resourcespace.example.org";
    process.env.RESOURCESPACE_API_USER = "api";
    process.env.RESOURCESPACE_API_KEY = "secret";
    process.env.RESOURCESPACE_API_PAGE_SIZE = "500";
    process.env.RESOURCESPACE_API_MAX_PAGES = "10";
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const parsed = new URL(url);
      const offset = Number(parsed.searchParams.get("offset") || "0");
      if (offset >= 500) return new Response(JSON.stringify({ error: "mid-page failure" }), { status: 200 });
      return new Response(JSON.stringify(Array.from({ length: 500 }, (_, index) => ({ ref: index + 1 }))), { status: 200 });
    }));

    const result = await resourceSpaceSearchAll<{ ref: number }>({ function: "do_search", search: "" });

    expect(result.ok).toBe(false);
    expect(result.complete).toBe(false);
    expect(result.records).toBe(500);
    expect(result.error).toMatch(/mid-page failure/i);
  });
});

describe("metadata schema contract", () => {
  it("does not treat raw Approved Public as portal-ready when required evidence is missing", () => {
    const validation = validateAssetMetadataContract(approvedAsset({
      rightsStatus: "Unknown",
      peopleRisk: "Unknown",
      reviewer: undefined,
      reviewedDate: undefined,
      imageUrls: { small: "/small.jpg", card: "/card.jpg", collection: "/collection.jpg", detail: "/detail.jpg" }
    }));

    expect(validation.ok).toBe(false);
    expect(validation.missing).toEqual(expect.arrayContaining(["rights_status", "reviewed_by", "reviewed_date", "people_visible", "approved_use_copy"]));
  });
});

describe("photo-only beta fixture scope", () => {
  it("keeps normal beta roles in photo-only scope while preserving reviewer diagnostics", () => {
    const viewerScoped = scopedCatalogAssetsForRole("Viewer", demoFallbackAssets, demoFallbackStatus);
    const contributorScoped = scopedCatalogAssetsForRole("Contributor", demoFallbackAssets, demoFallbackStatus);
    const reviewerScoped = scopedCatalogAssetsForRole("Reviewer", demoFallbackAssets, demoFallbackStatus);

    expect(viewerScoped.every((asset) => asset.mediaType === "photo")).toBe(true);
    expect(contributorScoped.every((asset) => asset.mediaType === "photo")).toBe(true);
    expect(reviewerScoped.some((asset) => asset.mediaType === "audio")).toBe(true);
  });

  it("redacts fallback fixture labels from normal role asset payloads", () => {
    const fixture = demoFallbackAssets.find((asset) => /Hosted Pagination Fixture/i.test(asset.title));
    expect(fixture).toBeTruthy();

    const payload = assetForRolePayload("Viewer", fixture!);
    const text = JSON.stringify(payload);

    expect(text).not.toMatch(/Hosted Pagination Fixture|Hosted beta fixture|qa\.fixture|API Smoke|demo-fallback/i);
    expect(payload.title).toBe("Media record");
    expect(payload.collection).toBe("Media library");
  });
});
