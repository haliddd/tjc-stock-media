import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasApprovedCopyDerivative,
  readApprovedCopyDelivery,
  supportedImageContentType
} from "@/lib/media-delivery";
import type { MediaSourceStatus } from "@/lib/types";

const originalEnv = { ...process.env };
const demoFallbackSource: MediaSourceStatus = {
  adapter: "demo-fallback",
  label: "Fixture fallback",
  detail: "Local fixture data.",
  readOnly: true,
  sourceKind: "fallback-fixtures"
};

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("media delivery", () => {
  it("keeps local smoke fallback approved-copy delivery available", () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "test");

    const delivery = readApprovedCopyDelivery("367", "Fallback fixture", demoFallbackSource);

    expect(delivery.status).toBe("ready");
    expect(delivery.status === "ready" ? delivery.image.contentType : null).toBe("image/jpeg");
    expect(hasApprovedCopyDerivative("367", demoFallbackSource)).toBe(true);
  });

  it("blocks generated fallback approved-copy bytes in hosted and production runtimes", () => {
    vi.stubEnv("VERCEL", "1");
    expect(readApprovedCopyDelivery("367", "Fallback fixture", demoFallbackSource).status).toBe("missing-derivative");
    expect(hasApprovedCopyDerivative("367", demoFallbackSource)).toBe(false);

    vi.stubEnv("VERCEL", "");
    vi.stubEnv("NODE_ENV", "production");
    expect(readApprovedCopyDelivery("367", "Fallback fixture", demoFallbackSource).status).toBe("missing-derivative");
    expect(hasApprovedCopyDerivative("367", demoFallbackSource)).toBe(false);
  });

  it("accepts only raster image signatures for proxied media bytes", () => {
    expect(supportedImageContentType(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(supportedImageContentType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(supportedImageContentType(Buffer.from("<svg><script>alert(1)</script></svg>"))).toBeNull();
    expect(supportedImageContentType(Buffer.from("https://private.example/download.jpg"))).toBeNull();
    expect(supportedImageContentType(Buffer.from("file:///Volumes/Shared Drive/original.jpg"))).toBeNull();
  });
});
