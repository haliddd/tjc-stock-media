import { describe, expect, it } from "vitest";
import { approveDerivativeDisabledReason, enterpriseReviewActionState } from "@/lib/enterprise-review-actions";
import { damAssets, portalReadyAssets, type DamAsset } from "@/lib/enterprise-dam-redesign";

function assetByTitle(title: string) {
  const asset = damAssets.find((item) => item.title === title);
  if (!asset) throw new Error(`Missing test asset: ${title}`);
  return asset;
}

describe("enterprise review action state", () => {
  it("makes Request evidence primary and disables derivative approval for Needs Evidence assets", () => {
    const state = enterpriseReviewActionState(assetByTitle("Youth Fellowship Group Photo"));

    expect(state.requestEvidencePrimary).toBe(true);
    expect(state.approveDerivativeDisabled).toBe(true);
    expect(state.approveDerivativeDisabledReason).toBe(approveDerivativeDisabledReason);
    expect(state.recommendedNextAction).toBe("Request evidence before any derivative approval.");
  });

  it("disables public approval when people/minors consent evidence is missing", () => {
    const state = enterpriseReviewActionState(assetByTitle("Youth Fellowship Group Photo"));

    expect(state.approveDerivativeDisabled).toBe(true);
    expect(state.approveDerivativeDisabledReason).toBe(approveDerivativeDisabledReason);
  });

  it("disables public approval when owner/license evidence is missing", () => {
    const ready = assetByTitle("Sabbath Service Choir — 2025-03-15");
    const missingOwnerLicense: DamAsset = {
      ...ready,
      evidence: ready.evidence.map((item) => item.requirement === "Owner/license"
        ? { ...item, state: "Missing", blocking: true }
        : item),
      blockers: ["Owner/license"],
      blockerCount: 1
    };

    const state = enterpriseReviewActionState(missingOwnerLicense);

    expect(state.requestEvidencePrimary).toBe(true);
    expect(state.approveDerivativeDisabled).toBe(true);
  });

  it("keeps Approved Internal assets out of Portal Ready state", () => {
    const internal = assetByTitle("Hymn Practice Recording");

    expect(internal.displayStatus).toBe("Approved Internal");
    expect(internal.displayStatus).not.toBe("Portal Ready");
    expect(portalReadyAssets()).not.toContain(internal);
  });

  it("enables derivative approval when public evidence is complete and derivative exists", () => {
    const state = enterpriseReviewActionState(assetByTitle("Sabbath Service Choir — 2025-03-15"));

    expect(state.requestEvidencePrimary).toBe(false);
    expect(state.approveDerivativeDisabled).toBe(false);
    expect(state.approveDerivativeDisabledReason).toBeUndefined();
    expect(state.recommendedNextAction).toBe("Approve derivative and record audit note.");
  });
});
