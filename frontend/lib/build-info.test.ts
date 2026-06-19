import { afterEach, describe, expect, it, vi } from "vitest";
import { BUILD_READINESS_CONTRACT, publicBuildInfo } from "@/lib/build-info";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe("publicBuildInfo", () => {
  it("exposes a non-secret currentness contract for hosted read-only probes", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "63474a70e930687b188d6327f888e677dde3c2d2");
    vi.stubEnv("VERCEL_GIT_COMMIT_REF", "codex/merge-recommended-set-2026-06-17");
    vi.stubEnv("BETA_SESSION_SECRET", "secret-session-value");
    vi.stubEnv("BETA_CHURCH_INVITE_CODES_JSON", JSON.stringify({ Queens: "real-code-do-not-leak" }));

    const info = publicBuildInfo();
    const serialized = JSON.stringify(info);

    expect(info).toMatchObject({
      app: "tjc-stock-media",
      readinessContract: BUILD_READINESS_CONTRACT,
      deploymentProvider: "vercel",
      commitShort: "63474a70e930",
      branch: "codex/merge-recommended-set-2026-06-17",
      routeSurface: {
        homePage: "EnterprisePortalHomePage",
        uploadPage: "EnterpriseUploadPage"
      }
    });
    expect(info.routeSurface.routeCount).toBeGreaterThanOrEqual(20);
    expect(info.routeSurface.navItemCount).toBeGreaterThanOrEqual(8);
    expect(serialized).not.toContain("secret-session-value");
    expect(serialized).not.toContain("real-code-do-not-leak");
  });
});
