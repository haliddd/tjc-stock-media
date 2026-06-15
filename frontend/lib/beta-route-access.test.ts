import { afterEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";
import { createBetaSessionCookieValue } from "@/lib/beta-auth";
import { requestIdentity, resolveClientRoleOverride } from "@/lib/request-identity";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

function request(url: string, headers?: HeadersInit) {
  return {
    nextUrl: new URL(url),
    headers: new Headers(headers)
  } as unknown as NextRequest;
}

describe("beta role identity boundary", () => {
  it("ignores client role query when signed beta session is authoritative", async () => {
    vi.stubEnv("BETA_AUTH_ENABLED", "true");
    vi.stubEnv("BETA_SESSION_SECRET", "test-secret");
    const cookie = await createBetaSessionCookieValue("Contributor", Date.now());
    const headers = new Headers({
      cookie: `tjc_beta_session=${cookie}`,
      "x-tjc-beta-role": "Contributor",
      "x-tjc-beta-session-verified": "1"
    });
    const req = request("https://dam.example.test/review?role=DAM%20Admin", headers);

    const identity = requestIdentity(req, "DAM Admin");
    const override = resolveClientRoleOverride(req, { explicitRole: "DAM Admin" });

    expect(identity.role).toBe("Contributor");
    expect(identity.sourceSystem).toBe("local-beta");
    expect(override.ignored).toBe(true);
    expect(override.reasonCode).toBe("beta-session-authoritative");
  });

  it("ignores client role query in production runtime without trusted session headers", () => {
    vi.stubEnv("NODE_ENV", "production");
    const req = request("https://dam.example.test/governance/audit-log?role=DAM%20Admin");

    const identity = requestIdentity(req, "DAM Admin");
    const override = resolveClientRoleOverride(req, { explicitRole: "DAM Admin" });

    expect(identity.role).toBe("Viewer");
    expect(override.ignored).toBe(true);
    expect(override.reasonCode).toBe("production-client-role-ignored");
  });
});
