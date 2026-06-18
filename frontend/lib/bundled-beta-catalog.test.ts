import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bundledBetaCatalogStatus, getBundledBetaCatalogAssets } from "@/lib/media-source/bundled-beta-catalog";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.resetModules();
});

describe("bundled beta catalog", () => {
  it("keeps hosted beta above demo-scale with MVP 2024 search terms", () => {
    const assets = getBundledBetaCatalogAssets();
    const haystack = assets.map((asset) => [asset.title, ...(asset.tags || []), ...(asset.tjcTerms || [])].join(" ")).join(" ");

    expect(bundledBetaCatalogStatus.adapter).toBe("bundled-beta-catalog");
    expect(bundledBetaCatalogStatus.readOnly).toBe(true);
    expect(bundledBetaCatalogStatus.live).toBe(false);
    expect(assets).toHaveLength(181);
    expect(assets.filter((asset) => /bible/i.test(asset.title))).toHaveLength(23);
    expect(assets.filter((asset) => /plant/i.test(asset.title))).toHaveLength(33);
    expect(assets.filter((asset) => /fountain/i.test(asset.title))).toHaveLength(6);
    expect(haystack).toMatch(/LM Photos/);
  });

  it("does not bundle private source paths or checksum values", () => {
    const assets = getBundledBetaCatalogAssets();

    expect(assets.every((asset) => !asset.sourcePath)).toBe(true);
    expect(assets.every((asset) => !asset.masterDrivePath)).toBe(true);
    expect(assets.every((asset) => !asset.checksumSha256)).toBe(true);
  });

  it("is used before demo fallback when live API and export files are absent", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tjc-bundled-beta-"));
    process.env.TJC_STOCK_MEDIA_ROOT = tempRoot;
    delete process.env.RESOURCESPACE_API_USER;
    delete process.env.RS_API_USER;
    delete process.env.RESOURCESPACE_API_KEY;
    delete process.env.RS_API_KEY;

    try {
      const { clearMediaSourceCache, getActiveMediaSource } = await import("@/lib/media-source");
      clearMediaSourceCache();
      const { assets, status } = await getActiveMediaSource();

      expect(status.adapter).toBe("bundled-beta-catalog");
      expect(assets).toHaveLength(181);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
