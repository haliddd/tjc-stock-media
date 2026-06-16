import { afterEach, describe, expect, it, vi } from "vitest";
import {
  betaLoginPathForReturn,
  betaPasswordMatches,
  betaSessionSecretConfigured,
  createBetaSessionCookieValue,
  safeBetaReturnTo,
  verifyBetaSessionCookieValue
} from "@/lib/beta-auth";
import {
  BETA_LOGIN_THROTTLE_BLOCK_MS,
  BETA_LOGIN_THROTTLE_MAX_FAILURES,
  BETA_LOGIN_THROTTLE_WINDOW_MS,
  betaLoginThrottleKey,
  betaLoginThrottleStatus,
  clearBetaLoginThrottle,
  recordBetaLoginFailure,
  resetBetaLoginThrottleForTests
} from "@/lib/beta-login-throttle";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
  resetBetaLoginThrottleForTests();
});

function configureBetaEnv() {
  vi.stubEnv("BETA_AUTH_ENABLED", "true");
  vi.stubEnv("BETA_SESSION_SECRET", "local-test-session-secret");
  vi.stubEnv("BETA_VIEWER_PASSWORD", "viewer-pass");
  vi.stubEnv("BETA_CONTRIBUTOR_PASSWORD", "contributor-pass");
  vi.stubEnv("BETA_REVIEWER_PASSWORD", "reviewer-pass");
  vi.stubEnv("BETA_ADMIN_PASSWORD", "admin-pass");
}

describe("beta auth", () => {
  it("signs persona sessions and rejects tampering", async () => {
    configureBetaEnv();

    const cookieValue = await createBetaSessionCookieValue("Reviewer", 1_000);
    const session = await verifyBetaSessionCookieValue(cookieValue, 2_000);

    expect(session?.role).toBe("Reviewer");
    expect(session?.issuedAt).toBe(1_000);
    expect(session?.expiresAt).toBeGreaterThan(2_000);
    expect(await verifyBetaSessionCookieValue(`${cookieValue}.x`, 2_000)).toBeNull();
    expect(await verifyBetaSessionCookieValue(`${cookieValue.slice(0, -1)}x`, 2_000)).toBeNull();
  });

  it("requires env-backed persona credentials and session signing", () => {
    configureBetaEnv();

    expect(betaSessionSecretConfigured()).toBe(true);
    expect(betaPasswordMatches("Viewer", "viewer-pass")).toBe(true);
    expect(betaPasswordMatches("Viewer", "admin-pass")).toBe(false);
    expect(betaPasswordMatches("DAM Admin", "admin-pass")).toBe(true);
  });

  it("keeps beta return targets app-local and away from auth/api routes", () => {
    expect(betaLoginPathForReturn("/review", "?queue=pending")).toBe("/beta-login?returnTo=%2Freview%3Fqueue%3Dpending");
    expect(safeBetaReturnTo("/assets/368")).toBe("/assets/368");
    expect(safeBetaReturnTo("https://example.com/admin")).toBe("/");
    expect(safeBetaReturnTo("//example.com/admin")).toBe("/");
    expect(safeBetaReturnTo("/api/assets")).toBe("/");
    expect(safeBetaReturnTo("/beta-login?returnTo=/admin")).toBe("/");
  });

  it("throttles repeated failed beta login attempts without storing passwords", () => {
    const key = "beta-login:test-client";
    const now = 10_000;

    for (let attempt = 1; attempt < BETA_LOGIN_THROTTLE_MAX_FAILURES; attempt += 1) {
      const status = recordBetaLoginFailure(key, now + attempt);
      expect(status.allowed).toBe(true);
      expect(status.failures).toBe(attempt);
      expect(status.remainingFailures).toBe(BETA_LOGIN_THROTTLE_MAX_FAILURES - attempt);
    }

    const blocked = recordBetaLoginFailure(key, now + BETA_LOGIN_THROTTLE_MAX_FAILURES);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(betaLoginThrottleStatus(key, now + BETA_LOGIN_THROTTLE_MAX_FAILURES + 1).allowed).toBe(false);
    expect(betaLoginThrottleStatus(key, now + BETA_LOGIN_THROTTLE_BLOCK_MS + BETA_LOGIN_THROTTLE_MAX_FAILURES + 1).allowed).toBe(true);
  });

  it("resets failed beta login attempts after a successful login or expired window", () => {
    const key = "beta-login:reset-client";

    recordBetaLoginFailure(key, 1_000);
    expect(betaLoginThrottleStatus(key, 1_100).failures).toBe(1);

    clearBetaLoginThrottle(key);
    expect(betaLoginThrottleStatus(key, 1_200).failures).toBe(0);

    recordBetaLoginFailure(key, 2_000);
    expect(betaLoginThrottleStatus(key, 2_100).failures).toBe(1);
    expect(betaLoginThrottleStatus(key, 2_000 + BETA_LOGIN_THROTTLE_WINDOW_MS + 1).failures).toBe(0);
  });

  it("builds a stable beta login throttle key from proxy-safe client hints", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.5",
      "user-agent": "Vitest Agent/1.0"
    });

    expect(betaLoginThrottleKey(headers)).toBe("beta-login:203.0.113.10:VitestAgent1.0");
  });
});
