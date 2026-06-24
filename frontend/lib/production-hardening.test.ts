import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { BETA_SESSION_ROLE_HEADER, BETA_SESSION_VERIFIED_HEADER } from "@/lib/beta-auth";
import { decideAccess } from "@/lib/access-decisions";
import { buildBrandKitResponse, getBrandKitConfig } from "@/lib/brand-kits";
import { scopedCatalogAssetsForRole } from "@/lib/catalog-scope";
import { buildCollections } from "@/lib/catalog-summaries";
import { enterpriseMetadataSchemaForRole } from "@/lib/enterprise-metadata";
import { createBetaFeedback, isBetaFeedbackDurableStorageError, listBetaFeedback } from "@/lib/beta-feedback";
import { durableRuntimeStoreConfigured } from "@/lib/env";
import { demoFallbackAssets, demoFallbackStatus } from "@/lib/media-source/demo-fallback";
import { assetWithRoleImageUrls } from "@/lib/presentation";
import { listPendingReviewWrites, pendingReviewWriteDiagnostics } from "@/lib/pending-review-writes";
import { requestIdentity, resolveClientRoleOverride } from "@/lib/request-identity";
import { resourceSpaceSearchAll } from "@/lib/resourcespace-client";
import { validateAssetMetadataContract } from "@/lib/resourcespace-schema";
import { isRuntimeJsonReadError, isRuntimeWriteBlockedError, runtimeStoreDiagnostics, runtimeWriteBlockedRouteError } from "@/lib/runtime-file-store";
import { assetForRolePayload } from "@/lib/source-redaction";
import { taxonomyGovernanceForRole } from "@/lib/taxonomy";
import type { StockMediaAsset } from "@/lib/types";

const originalEnv = { ...process.env };
const tempRoots: string[] = [];

afterEach(async () => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  await Promise.all(tempRoots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

async function useTempRuntimeRoot(prefix = "tjc-production-hardening-test-") {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  tempRoots.push(root);
  process.env.TJC_STOCK_MEDIA_ROOT = root;
  return root;
}

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
  it("does not trust caller-supplied beta role headers without middleware verification", () => {
    vi.stubEnv("BETA_AUTH_ENABLED", "true");
    vi.stubEnv("NODE_ENV", "development");
    process.env.SSO_TRUSTED_HEADERS = "0";
    process.env.SSO_PROVIDER = "";

    const spoofedRequest = nextRequest("http://localhost:4871/api/review?role=Viewer");
    spoofedRequest.headers.set(BETA_SESSION_ROLE_HEADER, "Reviewer");
    const spoofedIdentity = requestIdentity(spoofedRequest, "Viewer");
    const spoofedOverride = resolveClientRoleOverride(spoofedRequest, "Viewer");

    expect(spoofedIdentity.role).toBe("Viewer");
    expect(spoofedOverride.reasonCode).toBe("client-role-disabled");

    const verifiedRequest = nextRequest("http://localhost:4871/api/review?role=Viewer");
    verifiedRequest.headers.set(BETA_SESSION_ROLE_HEADER, "Reviewer");
    verifiedRequest.headers.set(BETA_SESSION_VERIFIED_HEADER, "1");
    const verifiedIdentity = requestIdentity(verifiedRequest, "Viewer");
    const verifiedOverride = resolveClientRoleOverride(verifiedRequest, "Viewer");

    expect(verifiedIdentity.role).toBe("Reviewer");
    expect(verifiedOverride.reasonCode).toBe("beta-session-authoritative");
  });

  it("defaults query role callers to Viewer unless server-only local override is enabled", () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.SSO_TRUSTED_HEADERS = "0";
    process.env.SSO_PROVIDER = "";
    delete process.env.PORTAL_ALLOW_BETA_ROLE_OVERRIDE;
    delete process.env.BETA_ROLE_OVERRIDE_ENABLED;

    const request = nextRequest("http://localhost:4871/api/review?role=Reviewer");
    const deniedOverride = resolveClientRoleOverride(request, "Reviewer");
    const deniedIdentity = requestIdentity(request, "Reviewer");

    expect(deniedOverride.allowed).toBe(false);
    expect(deniedOverride.denied).toBe(true);
    expect(deniedOverride.reasonCode).toBe("client-role-disabled");
    expect(deniedIdentity.role).toBe("Viewer");

    vi.stubEnv("PORTAL_ALLOW_BETA_ROLE_OVERRIDE", "1");
    const allowedOverride = resolveClientRoleOverride(request, "Reviewer");
    const allowedIdentity = requestIdentity(request, "Reviewer");

    expect(allowedOverride.allowed).toBe(true);
    expect(allowedIdentity.role).toBe("Reviewer");
  });

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

  it("maps local trusted-header rehearsal groups through strongest role precedence", () => {
    vi.stubEnv("NODE_ENV", "development");
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

  it("denies mismatched download-gate client role overrides in trusted-header mode", () => {
    vi.stubEnv("NODE_ENV", "development");
    process.env.SSO_TRUSTED_HEADERS = "1";
    process.env.DOWNLOAD_GATE_ALLOW_DEMO_ROLES = "0";

    const spoofed = nextRequest("http://localhost:4871/api/download/367");
    spoofed.headers.set("x-tjc-role", "Viewer");
    const denied = resolveClientRoleOverride(spoofed, {
      explicitRole: "Reviewer",
      overridePolicy: "download-gate",
      overrideSource: "body"
    });

    const matching = nextRequest("http://localhost:4871/api/download/367?role=Reviewer");
    matching.headers.set("x-tjc-role", "Reviewer");
    const ignored = resolveClientRoleOverride(matching, {
      explicitRole: "Reviewer",
      overridePolicy: "download-gate",
      overrideSource: "query"
    });

    expect(denied.denied).toBe(true);
    expect(denied.reasonCode).toBe("client-role-disabled");
    expect(ignored.denied).toBe(false);
    expect(ignored.ignored).toBe(true);
    expect(ignored.reasonCode).toBe("trusted-sso-authoritative");
  });

  it("ignores generic trusted-header role shims in production without Cloudflare Access proof", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.SSO_TRUSTED_HEADERS = "1";
    process.env.SSO_PROVIDER = "";

    const request = nextRequest("https://stock-media.example.tjc.org/api/admin/readiness");
    request.headers.set("x-tjc-role", "DAM Admin");
    request.headers.set("x-auth-request-email", "admin@example.org");
    request.headers.set("x-auth-request-groups", "media-admins");
    const identity = requestIdentity(request);

    expect(identity.role).toBe("Viewer");
    expect(identity.id).toBe("production:trusted-identity-missing");
    expect(identity.sourceSystem).toBe("local-beta");
  });

  it("maps production Cloudflare Access groups and ignores direct role shims", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.SSO_PROVIDER = "cloudflare-access";
    process.env.SSO_TRUSTED_HEADERS = "0";
    process.env.SSO_ROLE_MAP_JSON = JSON.stringify({ "media-reviewers": "Reviewer", "media-admins": "DAM Admin" });

    const request = nextRequest("https://stock-media.example.tjc.org/api/review?role=DAM%20Admin");
    request.headers.set("cf-access-jwt-assertion", "signed-by-cloudflare-access");
    request.headers.set("cf-access-authenticated-user-email", "reviewer@example.org");
    request.headers.set("cf-access-groups", "members,media-reviewers");
    request.headers.set("x-tjc-role", "DAM Admin");
    request.headers.set("x-auth-request-groups", "media-admins");
    const identity = requestIdentity(request, "DAM Admin");

    expect(identity.role).toBe("Reviewer");
    expect(identity.email).toBe("reviewer@example.org");
    expect(identity.sourceSystem).toBe("sso");
  });
});

describe("normal-role preview safety", () => {
  it("blocks Viewer thumbnails for non-approved review candidates while keeping Reviewer inspection available", () => {
    const candidate = approvedAsset({
      id: "needs-review",
      status: "Needs Review",
      usageScope: "Do Not Publish",
      rightsStatus: "Needs review",
      consentStatus: "Unknown",
      reviewer: undefined,
      reviewedDate: undefined
    });

    expect(decideAccess("Viewer", "viewThumbnail", candidate)).toMatchObject({
      allowed: false,
      label: "Preview restricted"
    });
    expect(decideAccess("Reviewer", "viewThumbnail", candidate)).toMatchObject({
      allowed: true
    });
  });
});

describe("production runtime write guard", () => {
  it("does not treat Vercel KV env as generic durable runtime storage", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.RUNTIME_STORE = "vercel-kv";
    process.env.KV_REST_API_URL = "https://kv.example.invalid";
    process.env.KV_REST_API_TOKEN = "secret";

    expect(durableRuntimeStoreConfigured()).toBe(false);
    expect(runtimeStoreDiagnostics()).toMatchObject({
      mode: "vercel-kv",
      adapter: "local-filesystem",
      durable: false,
      production: true,
      statefulWritesAllowed: false,
      state: "Blocked"
    });
    expect(runtimeStoreDiagnostics().detail).toContain("Vercel KV is implemented for beta feedback only");
  });

  it("turns blocked runtime writes into explicit 503 route errors", () => {
    const error = new Error("Durable runtime store required for production beta-feedback writes.");
    const response = runtimeWriteBlockedRouteError("beta-feedback", error);

    expect(isRuntimeWriteBlockedError(error)).toBe(true);
    expect(response).toEqual({
      status: 503,
      body: {
        error: "Durable runtime store is required for this production write.",
        reasonCode: "runtime-store-required",
        category: "beta-feedback",
        detail: "Durable runtime store required for production beta-feedback writes."
      }
    });
  });

  it("does not classify unrelated runtime errors as durable-store blockers", () => {
    const error = new Error("Unexpected write failure");

    expect(isRuntimeWriteBlockedError(error)).toBe(false);
  });

  it("fails hosted beta feedback writes and reads instead of falling back to local memory", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;

    await expect(createBetaFeedback({
      role: "Viewer",
      route: "/",
      task: "Hosted feedback proof",
      severity: "low",
      expected: "Feedback persists durably.",
      actual: "Durable store missing."
    })).rejects.toSatisfy(isBetaFeedbackDurableStorageError);

    await expect(listBetaFeedback()).rejects.toSatisfy(isBetaFeedbackDurableStorageError);
  });

  it("fails closed and reports diagnostics when pending review JSON is corrupt", async () => {
    const root = await useTempRuntimeRoot();
    const pendingDir = path.join(root, ".runtime", "pending-review-writes");
    await mkdir(pendingDir, { recursive: true });
    await writeFile(path.join(pendingDir, "bad.json"), "{bad-json");

    expect(() => listPendingReviewWrites()).toThrow();
    try {
      listPendingReviewWrites();
    } catch (error) {
      expect(isRuntimeJsonReadError(error)).toBe(true);
    }
    expect(pendingReviewWriteDiagnostics()).toMatchObject({
      count: 0,
      corrupted: true,
      corruption: { reasonCode: "runtime-json-invalid" }
    });
  });

  it("returns partial failure when live writeback succeeds but local sync state cannot be marked synced", async () => {
    await useTempRuntimeRoot();
    process.env.RESOURCESPACE_BASE_URL = "https://resourcespace.example.org";
    process.env.RESOURCESPACE_API_USER = "api";
    process.env.RESOURCESPACE_API_KEY = "secret";
    process.env.RESOURCESPACE_ENABLE_WRITEBACK = "1";
    process.env.RESOURCESPACE_WRITEBACK_MODE = "live";
    process.env.RESOURCESPACE_FIELD_MAP_JSON = JSON.stringify({
      approvalStatus: "publish_status",
      reviewer: "reviewed_by",
      reviewedDate: "reviewed_date",
      notes: "approval_notes"
    });
    const reviewedDate = new Date().toISOString().slice(0, 10);
    let resourceReadCount = 0;
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const params = new URL(url).searchParams;
      const fn = params.get("function");
      if (fn === "do_search") return new Response(JSON.stringify([]), { status: 200 });
      if (fn === "get_resource_data") {
        resourceReadCount += 1;
        return new Response(JSON.stringify(resourceReadCount === 1
          ? { ref: "123", publish_status: "Needs Review" }
          : {
              ref: "123",
              publish_status: "Approved Public",
              reviewed_by: "QA Reviewer",
              reviewed_date: reviewedDate,
              approval_notes: "Approved after evidence."
            }), { status: 200 });
      }
      if (fn === "update_field") return new Response(JSON.stringify(true), { status: 200 });
      return new Response(JSON.stringify({ error: "unexpected API call" }), { status: 200 });
    }));
    vi.resetModules();
    const { updateResourceReviewStatus } = await import("@/lib/media-source/resourcespace-api");

    const result = await updateResourceReviewStatus({
      id: "missing-local-pending-record",
      resourceId: "123",
      oldStatus: "Unknown",
      requestedStatus: "Approved Public",
      reviewerRole: "Reviewer",
      reviewerName: "QA Reviewer",
      createdAt: "2026-06-24T00:00:00.000Z",
      updatedAt: "2026-06-24T00:00:00.000Z",
      note: "Approved after evidence.",
      checklist: {
        sourceConfirmed: true,
        rightsConfirmed: true,
        attributionConfirmed: true,
        peopleVisibilityConfirmed: true,
        childrenYouthChecked: true,
        usageScopeSelected: true,
        derivativeAvailable: true,
        sensitiveContextChecked: true,
        creditRequirementChecked: true,
        expirationRereviewSet: true,
        proofLinkAttached: true
      },
      blockers: [],
      syncState: "syncing",
      retryCount: 0
    });

    expect(result).toMatchObject({
      ok: false,
      status: 503,
      attemptedLiveWriteback: true,
      reasonCode: "local-sync-state-update-failed",
      record: null
    });
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

  it.each(["Viewer", "Contributor"] as const)("does not expose private schema or source internals to %s", (role) => {
    const schema = enterpriseMetadataSchemaForRole(role);
    const serialized = JSON.stringify(schema).toLowerCase();

    expect(schema.some((row) => row.key === "source_path" || row.key === "master_custody_status")).toBe(false);
    expect(serialized).not.toContain("source_path");
    expect(serialized).not.toContain("master_drive_path");
    expect(serialized).not.toContain("checksum_sha256");
    expect(serialized).not.toContain("ownernotes");
    expect(schema.every((row) => row.resourceSpaceField === "Restricted")).toBe(true);
  });

  it.each(["Viewer", "Contributor"] as const)("does not expose private taxonomy cleanup internals to %s", (role) => {
    const taxonomy = taxonomyGovernanceForRole(role);
    const serialized = JSON.stringify(taxonomy).toLowerCase();

    expect(taxonomy.health.forbiddenTerms).toHaveLength(0);
    expect(taxonomy.health.deprecatedTerms).toHaveLength(0);
    expect(taxonomy.health.ownerNotes).toHaveLength(0);
    expect(taxonomy.health.sensitiveMinistryMappings).toHaveLength(0);
    expect(serialized).not.toContain("master available");
    expect(serialized).not.toContain("rights guaranteed");
    expect(serialized).not.toContain("reviewer-owned policy");
  });

  it.each(["Viewer", "Contributor"] as const)("keeps asset detail image payloads derivative-only for %s", (role) => {
    const payload = assetWithRoleImageUrls(approvedAsset(), role);
    const text = JSON.stringify(payload);

    expect(payload.imageUrls?.download).toBeUndefined();
    expect(text).not.toContain("/private/source.jpg");
    expect(text).not.toContain("/Shared Drives/TJC Stock Media/source.jpg");
    expect(text).not.toContain("sourcePath");
    expect(text).not.toContain("masterDrivePath");
    expect(text).not.toContain("checksumSha256");
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
    const fixture = demoFallbackAssets.find((asset) => /Beta Library Sample/i.test(asset.title));
    expect(fixture).toBeTruthy();

    const payload = assetForRolePayload("Viewer", fixture!);
    const text = JSON.stringify(payload);

    expect(text).not.toMatch(/Beta Library Sample|Hosted Pagination Fixture|Hosted beta fixture|Read-only sample record|qa\.fixture|API Smoke|demo-fallback/i);
    expect(payload.title).toBe("Media record");
    expect(payload.collection).toBe("Media library");
  });

  it("redacts fallback fixture labels from normal role collection thumbnails", () => {
    const fixtureAssets = demoFallbackAssets.filter((asset) => /Beta Library Sample/i.test(asset.title));
    expect(fixtureAssets.length).toBeGreaterThan(0);

    const collections = buildCollections(fixtureAssets, "Viewer");
    const text = JSON.stringify(collections);

    expect(text).not.toMatch(/Beta Library Sample|Hosted Pagination Fixture|Hosted beta fixture|Read-only sample record|qa\.fixture|API Smoke|demo-fallback/i);
    expect(collections.flatMap((collection) => collection.images).some((image) => image.alt === "Media preview")).toBe(true);
  });

  it("hides raw media source envelopes from normal role brand kit payloads", async () => {
    const config = getBrandKitConfig("mvp-2024");
    expect(config).toBeTruthy();

    const viewer = await buildBrandKitResponse(config!, "Viewer");
    const reviewer = await buildBrandKitResponse(config!, "Reviewer");

    expect("rawSource" in viewer).toBe(false);
    expect(JSON.stringify(viewer)).not.toMatch(/demo-fallback|fixture fallback|Hosted pagination fixture/i);
    expect("rawSource" in reviewer).toBe(true);
  });
});
