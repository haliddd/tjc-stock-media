import { afterEach, describe, expect, it, vi } from "vitest";
import { listIntakeBatchesForActor, persistIntakeBatch, type PersistIntakeBatchInput } from "@/lib/intake-batch-store";
import type { MediaInventory } from "@/lib/upload-intake-detection";

const kvGet = vi.fn();
const kvSet = vi.fn();
const blobPut = vi.fn();

vi.mock("@vercel/kv", () => ({
  kv: {
    get: kvGet,
    set: kvSet
  }
}));

vi.mock("@vercel/blob", () => ({
  put: blobPut
}));

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  kvGet.mockReset();
  kvSet.mockReset();
  blobPut.mockReset();
});

function configureHostedKv(blob = false) {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("KV_REST_API_URL", "https://kv.example.test");
  vi.stubEnv("KV_REST_API_TOKEN", "test-token");
  if (blob) vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-token");
}

function inventory(overrides: Partial<MediaInventory> = {}): MediaInventory {
  return {
    fileCount: 0,
    photoCount: 0,
    videoCount: 0,
    audioCount: 0,
    heicCount: 0,
    totalBytes: 0,
    largeMediaCount: 0,
    extensions: [],
    originalFilenames: [],
    ...overrides
  };
}

function input(files: File[] = []): PersistIntakeBatchInput {
  return {
    actor: "sso:contributor@example.test",
    role: "Contributor",
    defaultAssetStatus: "Needs Review",
    defaultUsageScope: "Do Not Publish",
    source: {
      kind: files.length ? "browser-upload" : "drive-link",
      sourceLink: files.length ? undefined : "captured-redacted",
      uploader: "Contributor"
    },
    detected: {
      eventName: "Sabbath Service",
      eventDate: "2026-06-06",
      ministry: "Internet Ministry",
      confidence: "medium"
    },
    mediaInventory: inventory({
      fileCount: files.length,
      photoCount: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.size, 0),
      originalFilenames: files.map((file) => file.name)
    }),
    suggestions: {
      tags: [],
      tjcTerms: [],
      collections: [],
      requestedUse: []
    },
    riskFlags: [],
    reviewerTasks: ["Rights reviewer verifies ownership/license before public use"],
    adminTasks: ["Upload does not approve media for use"],
    files,
    sourceLinkCaptured: !files.length
  };
}

describe("intake batch durable storage", () => {
  it("writes hosted source-link intake records to KV without ResourceSpace writeback", async () => {
    configureHostedKv();
    kvGet.mockResolvedValue([]);

    const result = await persistIntakeBatch(input());

    expect(result.storageMode).toBe("vercel-kv");
    expect(result.record).toMatchObject({
      actor: "sso:contributor@example.test",
      status: "needs-review",
      defaultAssetStatus: "Needs Review",
      defaultUsageScope: "Do Not Publish",
      storageMode: "vercel-kv",
      resourceSpaceWritten: false
    });
    expect(kvSet).toHaveBeenCalledWith(expect.stringContaining("intake-batches:record:"), expect.objectContaining({ resourceSpaceWritten: false }));
    expect(kvSet).toHaveBeenCalledWith("tjc-stock-media:intake-batches:index", expect.any(Array));
    expect(blobPut).not.toHaveBeenCalled();
  });

  it("requires Blob storage before hosted browser file intake can persist", async () => {
    configureHostedKv(false);
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });

    const result = await persistIntakeBatch(input([file]));

    expect(result.storageMode).toBe("blocked-no-durable-store");
    expect(result.blockedReason).toMatch(/Blob storage/i);
    expect(kvSet).not.toHaveBeenCalled();
    expect(blobPut).not.toHaveBeenCalled();
  });

  it("stores hosted browser file originals in private Blob before KV history", async () => {
    configureHostedKv(true);
    kvGet.mockResolvedValue([]);
    blobPut.mockResolvedValue({ pathname: "intake-batches/batch/originals/photo.jpg", url: "https://blob.example/photo.jpg" });
    const file = new File(["photo"], "photo.jpg", { type: "image/jpeg" });

    const result = await persistIntakeBatch(input([file]));

    expect(result.storageMode).toBe("vercel-kv-blob");
    expect(result.record?.manifestPath).toBe("vercel-blob:intake-batches/<batchId>/originals");
    expect(blobPut).toHaveBeenCalledWith(expect.stringContaining("intake-batches/"), file, expect.objectContaining({ access: "private" }));
    expect(kvSet).toHaveBeenCalledWith(expect.stringContaining("intake-batches:record:"), expect.objectContaining({ storageMode: "vercel-kv-blob" }));
  });

  it("lists only matching actor intake records from KV", async () => {
    configureHostedKv();
    kvGet.mockImplementation(async (key: string) => {
      if (key === "tjc-stock-media:intake-batches:index") return ["match", "other"];
      if (key.endsWith("match")) return {
        ...input(),
        id: "match",
        createdAt: "2026-06-06T00:00:00.000Z",
        updatedAt: "2026-06-06T00:00:00.000Z",
        submittedAt: "2026-06-06T00:00:00.000Z",
        status: "needs-review",
        storageMode: "vercel-kv",
        resourceSpaceWritten: false
      };
      if (key.endsWith("other")) return {
        ...input(),
        id: "other",
        actor: "sso:other@example.test",
        createdAt: "2026-06-06T00:00:00.000Z",
        updatedAt: "2026-06-06T00:00:00.000Z",
        submittedAt: "2026-06-06T00:00:00.000Z",
        status: "needs-review",
        storageMode: "vercel-kv",
        resourceSpaceWritten: false
      };
      return null;
    });

    await expect(listIntakeBatchesForActor("sso:contributor@example.test")).resolves.toHaveLength(1);
  });
});
