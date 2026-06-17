import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { requestIdentity } from "@/lib/request-identity";
import {
  BETA_SESSION_COOKIE,
  BETA_SESSION_CHURCH_LOCATION_HEADER,
  BETA_SESSION_ROLE_HEADER,
  BETA_SESSION_VERIFIED_HEADER,
  betaChurchInviteCodeMatches,
  betaChurchInviteCodeDiagnostics,
  betaChurchInviteCodeRequired,
  betaChurchInviteCodesConfigured,
  betaLoginPathForReturn,
  betaPasswordMatches,
  betaSessionSecretConfigured,
  createBetaSessionCookieValue,
  safeBetaReturnTo,
  verifyBetaSessionCookieValue
} from "@/lib/beta-auth";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
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

    const cookieValue = await createBetaSessionCookieValue("Reviewer", 1_000, "Queens NY");
    const session = await verifyBetaSessionCookieValue(cookieValue, 2_000);

    expect(session?.role).toBe("Reviewer");
    expect(session?.churchLocation).toBe("Queens NY");
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

  it("requires church invitation codes only for contributor and above", () => {
    configureBetaEnv();
    vi.stubEnv("BETA_CHURCH_INVITE_CODES_JSON", JSON.stringify({
      "Queens NY": "queens-contributor-token",
      "Brooklyn NY": "brooklyn-contributor-token"
    }));

    expect(betaChurchInviteCodeRequired("Viewer")).toBe(false);
    expect(betaChurchInviteCodeRequired("Contributor")).toBe(true);
    expect(betaChurchInviteCodeRequired("Reviewer")).toBe(true);
    expect(betaChurchInviteCodeRequired("DAM Admin")).toBe(true);
    expect(betaChurchInviteCodesConfigured()).toBe(true);
    expect(betaChurchInviteCodeMatches("queens-contributor-token")?.churchLocation).toBe("Queens NY");
    expect(betaChurchInviteCodeMatches("brooklyn-contributor-token")?.churchLocation).toBe("Brooklyn NY");
    expect(betaChurchInviteCodeMatches("wrong-code")).toBeNull();
  });

  it("reports church invitation readiness without exposing code values", () => {
    configureBetaEnv();
    vi.stubEnv("BETA_CHURCH_INVITE_CODES_JSON", JSON.stringify({
      "Queens NY": ["queens-contributor-token", "queens-reviewer-token"],
      "Brooklyn NY": "brooklyn-contributor-token"
    }));

    const diagnostics = betaChurchInviteCodeDiagnostics();
    const serialized = JSON.stringify(diagnostics);

    expect(diagnostics).toEqual({
      configured: true,
      locationCount: 2,
      codeCount: 3
    });
    expect(serialized).not.toContain("queens-contributor-token");
    expect(serialized).not.toContain("queens-reviewer-token");
    expect(serialized).not.toContain("brooklyn-contributor-token");
  });

  it("creates Viewer sessions without church location and Contributor sessions with location", async () => {
    configureBetaEnv();

    const viewerCookie = await createBetaSessionCookieValue("Viewer", 1_000);
    const contributorCookie = await createBetaSessionCookieValue("Contributor", 1_000, "Queens NY");

    expect((await verifyBetaSessionCookieValue(viewerCookie, 2_000))?.churchLocation).toBeNull();
    expect((await verifyBetaSessionCookieValue(contributorCookie, 2_000))?.churchLocation).toBe("Queens NY");
  });

  it("keeps beta return targets app-local and away from auth/api routes", () => {
    expect(betaLoginPathForReturn("/review", "?queue=pending")).toBe("/beta-login?returnTo=%2Freview%3Fqueue%3Dpending");
    expect(safeBetaReturnTo("/assets/368")).toBe("/assets/368");
    expect(safeBetaReturnTo("https://example.com/admin")).toBe("/");
    expect(safeBetaReturnTo("//example.com/admin")).toBe("/");
    expect(safeBetaReturnTo("/api/assets")).toBe("/");
    expect(safeBetaReturnTo("/beta-login?returnTo=/admin")).toBe("/");
  });

  it("strips caller-supplied beta role headers on beta auth routes", async () => {
    configureBetaEnv();

    const response = await middleware(new NextRequest("http://localhost:4871/api/beta-auth/session", {
      headers: {
        [BETA_SESSION_ROLE_HEADER]: "Reviewer",
        [BETA_SESSION_VERIFIED_HEADER]: "1"
      }
    }));

    expect(response.headers.get(`x-middleware-request-${BETA_SESSION_ROLE_HEADER}`)).toBeNull();
    expect(response.headers.get(`x-middleware-request-${BETA_SESSION_VERIFIED_HEADER}`)).toBeNull();
    expect(response.headers.get(`x-middleware-request-${BETA_SESSION_CHURCH_LOCATION_HEADER}`)).toBeNull();
    expect(response.headers.get("x-middleware-override-headers") || "").not.toContain(BETA_SESSION_ROLE_HEADER);
    expect(response.headers.get("x-middleware-override-headers") || "").not.toContain(BETA_SESSION_VERIFIED_HEADER);
    expect(response.headers.get("x-middleware-override-headers") || "").not.toContain(BETA_SESSION_CHURCH_LOCATION_HEADER);
  });

  it("injects beta role headers only from verified session cookies", async () => {
    configureBetaEnv();
    const cookieValue = await createBetaSessionCookieValue("Reviewer", Date.now(), "Queens NY");

    const response = await middleware(new NextRequest("http://localhost:4871/api/beta-auth/session", {
      headers: {
        cookie: `${BETA_SESSION_COOKIE}=${cookieValue}`,
        [BETA_SESSION_CHURCH_LOCATION_HEADER]: "Spoofed",
        [BETA_SESSION_ROLE_HEADER]: "DAM Admin",
        [BETA_SESSION_VERIFIED_HEADER]: "1"
      }
    }));

    expect(response.headers.get(`x-middleware-request-${BETA_SESSION_ROLE_HEADER}`)).toBe("Reviewer");
    expect(response.headers.get(`x-middleware-request-${BETA_SESSION_VERIFIED_HEADER}`)).toBe("1");
    expect(response.headers.get(`x-middleware-request-${BETA_SESSION_CHURCH_LOCATION_HEADER}`)).toBe("Queens NY");
  });

  it("maps verified beta church location to DamUser team", () => {
    configureBetaEnv();

    const verified = requestIdentity(new NextRequest("http://localhost:4871/library", {
      headers: {
        [BETA_SESSION_ROLE_HEADER]: "Contributor",
        [BETA_SESSION_VERIFIED_HEADER]: "1",
        [BETA_SESSION_CHURCH_LOCATION_HEADER]: "Queens NY"
      }
    }));
    const unverified = requestIdentity(new NextRequest("http://localhost:4871/library", {
      headers: {
        [BETA_SESSION_CHURCH_LOCATION_HEADER]: "Spoofed Location"
      }
    }));

    expect(verified.role).toBe("Contributor");
    expect(verified.team).toBe("Queens NY");
    expect(unverified.role).toBe("Viewer");
    expect(unverified.team).toBeUndefined();
  });
});
