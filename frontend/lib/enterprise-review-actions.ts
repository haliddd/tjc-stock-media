import type { DamAsset } from "@/lib/enterprise-dam-redesign";

export const approveDerivativeDisabledReason =
  "Approve derivative disabled: Consent/release, people/minors visibility, and approved derivative evidence are incomplete.";

type ReviewActionAsset = Pick<DamAsset, "approvalScope" | "blockers" | "derivativeState" | "displayStatus" | "evidence">;

function hasIncompleteBlockingEvidence(asset: ReviewActionAsset) {
  return asset.evidence.some((item) => item.blocking && item.state !== "Complete");
}

export function enterpriseReviewActionState(asset?: ReviewActionAsset) {
  const approveDerivativeDisabled = !asset
    || asset.blockers.length > 0
    || hasIncompleteBlockingEvidence(asset)
    || asset.derivativeState !== "available"
    || asset.approvalScope !== "public";
  const requestEvidencePrimary = approveDerivativeDisabled;

  return {
    approveDerivativeDisabled,
    approveDerivativeDisabledReason: approveDerivativeDisabled ? approveDerivativeDisabledReason : undefined,
    requestEvidencePrimary,
    recommendedNextAction: requestEvidencePrimary
      ? "Request evidence before any derivative approval."
      : "Approve derivative and record audit note."
  };
}
