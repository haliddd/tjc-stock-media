import { afterEach, describe, expect, it, vi } from "vitest";
import {
  betaFeedbackAttachmentValidationError,
  betaFeedbackDiagnostics,
  betaFeedbackStorageUnavailableError,
  createBetaFeedback,
  maxBetaFeedbackAttachmentBytes,
  putBetaFeedbackAttachment,
  resetBetaFeedbackForTests
} from "@/lib/beta-feedback";

const kvSet = vi.fn();

vi.mock("@vercel/kv", () => ({
  kv: {
    get: vi.fn().mockResolvedValue([]),
    set: kvSet
  }
}));

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  resetBetaFeedbackForTests();
  kvSet.mockReset();
});

function configureHostedKv() {
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("KV_REST_API_URL", "https://kv.example.test");
  vi.stubEnv("KV_REST_API_TOKEN", "test-token");
}

describe("beta feedback durability and attachment safety", () => {
  it("requires durable KV configuration in hosted runtime", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");

    expect(betaFeedbackStorageUnavailableError()).toEqual({
      body: {
        error: "Beta feedback durable storage is not configured.",
        missing: ["KV_REST_API_URL", "KV_REST_API_TOKEN"]
      },
      status: 503
    });
  });

  it("fails closed when hosted KV write fails", async () => {
    configureHostedKv();
    kvSet.mockRejectedValue(new Error("kv unavailable"));

    await expect(createBetaFeedback({
      role: "Viewer",
      route: "/",
      task: "Feedback durability",
      severity: "high",
      expected: "Hosted feedback should save durably.",
      actual: "KV failed.",
      actor: "test"
    })).rejects.toThrow("Hosted beta feedback durable write failed.");
  });

  it("keeps file attachments disabled by default even when Blob is configured", async () => {
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-token");
    const file = new File(["safe"], "safe.png", { type: "image/png" });

    expect(betaFeedbackAttachmentValidationError(file)).toEqual({
      body: { error: "Feedback attachments are disabled for this beta. Paste a redacted safe link instead." },
      status: 400
    });
    expect(await putBetaFeedbackAttachment("feedback-id", file)).toBe("");
    expect(betaFeedbackDiagnostics().attachmentStorageConfigured).toBe(false);
  });

  it("validates explicitly enabled beta feedback attachments before Blob upload", () => {
    vi.stubEnv("BETA_FEEDBACK_ATTACHMENTS_ENABLED", "1");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "blob-token");

    expect(betaFeedbackAttachmentValidationError(new File(["safe"], "safe.txt", { type: "text/plain" }))).toBeNull();
    expect(betaFeedbackAttachmentValidationError(new File(["bad"], "bad.svg", { type: "image/svg+xml" }))?.body.error).toMatch(/type is not allowed/i);
    expect(betaFeedbackAttachmentValidationError(new File([new Uint8Array(maxBetaFeedbackAttachmentBytes + 1)], "large.png", { type: "image/png" }))?.body.error).toMatch(/too large/i);
  });
});
