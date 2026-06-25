import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bundledBetaCatalogStatus, getBundledBetaCatalogAssets } from "@/lib/media-source/bundled-beta-catalog";
import { exportedMetadataStatus } from "@/lib/media-source/exported-metadata";

const originalEnv = { ...process.env };
const tempRoots: string[] = [];

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.resetModules();
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function useTempRuntimeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "tjc-media-source-truth-"));
  tempRoots.push(root);
  process.env.TJC_STOCK_MEDIA_ROOT = root;
  return root;
}

describe("media source truth boundaries", () => {
  it("preserves ResourceSpace API statuses instead of applying local LM Photos approval truth", async () => {
    useTempRuntimeRoot();
    process.env.RESOURCESPACE_BASE_URL = "https://resourcespace.example.org";
    process.env.RESOURCESPACE_API_USER = "api";
    process.env.RESOURCESPACE_API_KEY = "secret";
    process.env.RESOURCESPACE_API_PAGE_SIZE = "500";
    process.env.RESOURCESPACE_API_MAX_PAGES = "10";
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const parsed = new URL(url);
      if (Number(parsed.searchParams.get("offset") || "0") > 0) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      return new Response(JSON.stringify([
        {
          resource_id: "9101",
          human_title_final: "LM Photos record",
          media_type: "Photo",
          source_system: "LM Photos / ResourceSpace",
          source_account: "lm.photos@tjc.org",
          publish_status: "Needs Review",
          usage_scope: "Do Not Publish",
          rights_status: "Unknown",
          people_visible: "Unknown",
          consent_status: "Unknown"
        }
      ]), { status: 200 });
    }));

    const { hasResourceSpaceApiConfig } = await import("@/lib/env");
    const resourceSpaceApi = await import("@/lib/media-source/resourcespace-api");
    const { clearMediaSourceCache, getActiveMediaSource } = await import("@/lib/media-source");
    const { sourceEnvelope } = await import("@/lib/media-source/session");
    const apiAssets = await resourceSpaceApi.getAssetsFromResourceSpaceApi();
    clearMediaSourceCache();
    const { assets, status } = await getActiveMediaSource();
    const envelope = sourceEnvelope(status);

    expect(hasResourceSpaceApiConfig()).toBe(true);
    expect(resourceSpaceApi.resourceSpaceApiReadDiagnostics).toMatchObject({ ok: true, complete: true, records: 1 });
    expect(apiAssets?.[0]).toMatchObject({ status: "Needs Review", usageScope: "Do Not Publish" });
    expect(status.adapter).toBe("resourcespace-api");
    expect(envelope).toMatchObject({
      live: true,
      resourceSpaceBacked: true,
      fallbackOnly: false,
      truthBoundary: "resourcespace-truth"
    });
    expect(assets[0]).toMatchObject({
      id: "9101",
      status: "Needs Review",
      usageScope: "Do Not Publish"
    });
  });

  it("keeps ResourceSpace snapshots read-only and never live writeback", async () => {
    const { sourceEnvelope } = await import("@/lib/media-source/session");

    expect(sourceEnvelope(exportedMetadataStatus)).toMatchObject({
      live: false,
      resourceSpaceBacked: true,
      fallbackOnly: false,
      truthBoundary: "resourcespace-truth"
    });
    expect(sourceEnvelope(bundledBetaCatalogStatus)).toMatchObject({
      live: false,
      resourceSpaceBacked: true,
      fallbackOnly: false,
      truthBoundary: "resourcespace-truth"
    });
  });

  it("keeps bundled beta snapshot statuses from the ResourceSpace-shaped seed data", () => {
    const assets = getBundledBetaCatalogAssets();

    expect(assets).toHaveLength(181);
    expect(assets.every((asset) => asset.status === "Needs Review")).toBe(true);
    expect(assets.every((asset) => asset.usageScope === "Do Not Publish")).toBe(true);
  });
});
