import { afterEach, describe, expect, it, vi } from "vitest";
import { listStoredPackageDrafts, savePackageDraft, type StoredPackageDraft } from "@/lib/package-store";
import { listSavedSearches, saveSavedSearch, type SavedSearchRecord } from "@/lib/saved-search-store";

const kvGet = vi.fn();
const kvSet = vi.fn();

vi.mock("@vercel/kv", () => ({
  kv: {
    get: kvGet,
    set: kvSet
  }
}));

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  kvGet.mockReset();
  kvSet.mockReset();
});

function configureKv() {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("KV_REST_API_URL", "https://kv.example.test");
  vi.stubEnv("KV_REST_API_TOKEN", "test-token");
}

function packageDraft(overrides: Partial<StoredPackageDraft> = {}): Omit<StoredPackageDraft, "storageMode"> {
  return {
    id: "pkg-safe",
    title: "Sabbath package",
    status: "draft",
    sections: [],
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
    createdBy: "sso:admin@example.test",
    role: "DAM Admin",
    governance: {
      chosenUse: "public-web",
      canPreview: true,
      canShare: false,
      canPublish: false,
      canDownloadPackage: false,
      totalRefs: 1,
      portalReadyRefs: 1,
      blockedRefs: 0,
      missingRefs: 0,
      reason: "Draft review only."
    },
    ...overrides
  };
}

function savedSearch(overrides: Partial<SavedSearchRecord> = {}): Omit<SavedSearchRecord, "storageMode"> {
  return {
    id: "search-safe",
    title: "Sabbath media",
    query: "Sabbath",
    filters: ["worship"],
    sort: "Newest",
    createdAt: "2026-06-06T00:00:00.000Z",
    updatedAt: "2026-06-06T00:00:00.000Z",
    createdBy: "sso:contributor@example.test",
    role: "Contributor",
    ...overrides
  };
}

describe("durable runtime stores", () => {
  it("stores package drafts in KV when hosted durable state is configured", async () => {
    configureKv();
    kvGet.mockResolvedValue([]);

    const record = await savePackageDraft(packageDraft());

    expect(record.storageMode).toBe("vercel-kv");
    expect(record.governance).toMatchObject({
      canShare: false,
      canPublish: false,
      canDownloadPackage: false
    });
    expect(kvSet).toHaveBeenCalledWith(expect.stringContaining("package-drafts:record:"), expect.objectContaining({ storageMode: "vercel-kv" }));
    expect(kvSet).toHaveBeenCalledWith("tjc-stock-media:package-drafts:index", expect.any(Array));
  });

  it("lists package drafts from KV without granting share or download state", async () => {
    configureKv();
    kvGet.mockImplementation(async (key: string) => {
      if (key === "tjc-stock-media:package-drafts:index") return ["pkg-safe"];
      if (key.endsWith("pkg-safe")) return { ...packageDraft(), storageMode: "vercel-kv" };
      return null;
    });

    await expect(listStoredPackageDrafts()).resolves.toEqual([
      expect.objectContaining({
        id: "pkg-safe",
        storageMode: "vercel-kv",
        governance: expect.objectContaining({ canShare: false, canDownloadPackage: false })
      })
    ]);
  });

  it("stores saved searches in KV when hosted durable state is configured", async () => {
    configureKv();
    kvGet.mockResolvedValue([]);

    const record = await saveSavedSearch(savedSearch());

    expect(record.storageMode).toBe("vercel-kv");
    expect(kvSet).toHaveBeenCalledWith(expect.stringContaining("saved-searches:record:"), expect.objectContaining({ storageMode: "vercel-kv" }));
    expect(kvSet).toHaveBeenCalledWith("tjc-stock-media:saved-searches:index", expect.any(Array));
  });

  it("lists saved searches from KV as saved-view records only", async () => {
    configureKv();
    kvGet.mockImplementation(async (key: string) => {
      if (key === "tjc-stock-media:saved-searches:index") return ["search-safe"];
      if (key.endsWith("search-safe")) return { ...savedSearch(), storageMode: "vercel-kv" };
      return null;
    });

    await expect(listSavedSearches()).resolves.toEqual([
      expect.objectContaining({
        id: "search-safe",
        storageMode: "vercel-kv",
        query: "Sabbath"
      })
    ]);
  });
});
