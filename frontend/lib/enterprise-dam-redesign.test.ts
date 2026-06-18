import { describe, expect, it } from "vitest";
import { deriveDisplayStatus } from "@/lib/enterprise-dam-redesign";

describe("enterprise DAM split state display status", () => {
  it("derives Portal Ready only from public approval plus available derivative and portal readiness", () => {
    expect(deriveDisplayStatus({
      reviewState: "approved",
      approvalScope: "public",
      derivativeState: "available",
      evidenceState: "complete",
      portalState: "portal_ready"
    })).toBe("Portal Ready");

    expect(deriveDisplayStatus({
      reviewState: "approved",
      approvalScope: "public",
      derivativeState: "missing",
      evidenceState: "complete",
      portalState: "portal_ready"
    })).not.toBe("Portal Ready");
  });

  it("keeps internal approval separate from Portal Ready", () => {
    expect(deriveDisplayStatus({
      reviewState: "approved",
      approvalScope: "internal",
      derivativeState: "available",
      evidenceState: "complete",
      portalState: "internal_only"
    })).toBe("Approved Internal");
  });

  it("prioritizes evidence blockers before workflow labels", () => {
    expect(deriveDisplayStatus({
      reviewState: "approved",
      approvalScope: "public",
      derivativeState: "available",
      evidenceState: "missing",
      portalState: "portal_ready"
    })).toBe("Needs Evidence");

    expect(deriveDisplayStatus({
      reviewState: "approved",
      approvalScope: "public",
      derivativeState: "available",
      evidenceState: "blocked",
      portalState: "portal_ready"
    })).toBe("Blocked");

    expect(deriveDisplayStatus({
      reviewState: "approved",
      approvalScope: "public",
      derivativeState: "available",
      evidenceState: "expired",
      portalState: "portal_ready"
    })).toBe("Expired");
  });

  it("keeps submitted hidden assets unpublished and respects restricted and archived states", () => {
    expect(deriveDisplayStatus({
      reviewState: "submitted",
      approvalScope: "none",
      derivativeState: "missing",
      evidenceState: "complete",
      portalState: "hidden"
    })).toBe("Submitted");

    expect(deriveDisplayStatus({
      reviewState: "approved",
      approvalScope: "restricted",
      derivativeState: "available",
      evidenceState: "complete",
      portalState: "hidden"
    })).toBe("Restricted");

    expect(deriveDisplayStatus({
      reviewState: "approved",
      approvalScope: "public",
      derivativeState: "available",
      evidenceState: "complete",
      portalState: "archived"
    })).toBe("Archived");
  });
});
