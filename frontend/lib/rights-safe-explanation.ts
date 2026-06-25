import { decideAccess } from "@/lib/access-decisions";
import { buildReuseDecision } from "@/lib/reuse-policy";
import type { DemoRole, StockMediaAsset } from "@/lib/types";

export type RightsExplanationState = "pass" | "review" | "info";

export type RightsExplanationCriterion = {
  id: string;
  label: string;
  state: RightsExplanationState;
  value: string;
  detail: string;
};

export type RightsSafeExplanationModel = {
  title: string;
  summary: string;
  reusable: boolean;
  blockers: string[];
  criteria: RightsExplanationCriterion[];
};

function meaningfulValue(value?: string) {
  return Boolean(value && !/^(unknown|not exported|not applicable|none|n\/a)$/i.test(value.trim()));
}

function blockerExplanation(code: string) {
  if (code === "blocked-rights") return "Rights, license, or release evidence still needs review.";
  if (code === "blocked-people-minors") return "People or youth visibility still needs consent or reviewer confirmation.";
  if (code === "blocked-reviewer-date") return "Reviewer/date evidence is missing or stale.";
  if (code === "blocked-derivative") return "Approved-copy delivery is missing for this role or channel.";
  if (code === "blocked-source") return "Source provenance still needs confirmation.";
  if (code === "blocked-sensitive") return "Sensitive ministry context still needs domain review.";
  if (code === "blocked-archive") return "This record is archive/reference only.";
  if (code === "blocked-do-not-use") return "This record is blocked from reuse.";
  if (code === "blocked-needs-review") return "Review evidence is still pending.";
  return "This record is not cleared for current reuse.";
}

function firstExportedDate(asset: StockMediaAsset) {
  return [
    asset.expirationDate,
    asset.rightsExpirationDate,
    asset.consentExpirationDate,
    asset.approvalRecheckDate,
    asset.expirationOrRecheckDate
  ].find((value) => meaningfulValue(value));
}

function releaseValue(asset: StockMediaAsset) {
  if (asset.peopleRisk === "No people") return { value: "No visible people exported", state: "info" as const, detail: "No release evidence is needed from exported people visibility." };
  if (meaningfulValue(asset.consentStatus)) return { value: asset.consentStatus!, state: /confirmed|documented|not required/i.test(asset.consentStatus || "") ? "pass" as const : "review" as const, detail: "Release evidence comes from exported consent status only." };
  return { value: "Needs reviewer confirmation", state: "review" as const, detail: "Release evidence is not exported for this record." };
}

export function buildRightsSafeExplanation(asset: StockMediaAsset, role: DemoRole): RightsSafeExplanationModel {
  const reuse = buildReuseDecision(asset);
  const downloadAccess = decideAccess(role, "downloadApprovedCopy", asset);
  const blockers = reuse.blockers.map((blocker) => blockerExplanation(blocker.code));
  const reusable = reuse.state === "portal-ready" || (role !== "Viewer" && reuse.state === "internal-ready");
  const release = releaseValue(asset);
  const expiration = firstExportedDate(asset);

  const criteria: RightsExplanationCriterion[] = [
    {
      id: "approval",
      label: "Approval state",
      state: reusable ? "pass" : "review",
      value: `${asset.status} / ${asset.usageScope}`,
      detail: reusable ? "Current approval state and usage scope support this visible reuse answer." : "Current approval state or usage scope does not clear normal public reuse yet."
    },
    {
      id: "license",
      label: "License / rights",
      state: meaningfulValue(asset.rightsStatus || asset.rightsBasis || asset.rightsNotes) && !/needs review|unknown|unclear|concern/i.test(`${asset.rightsStatus || ""} ${asset.rightsNotes || ""}`) ? "pass" : "review",
      value: asset.rightsStatus || asset.rightsBasis || "Needs review",
      detail: asset.rightsNotes || "Rights explanation uses exported status or rights basis only."
    },
    {
      id: "channels",
      label: "Approved channels",
      state: asset.approvedChannels?.length ? "pass" : "info",
      value: asset.approvedChannels?.length ? asset.approvedChannels.join(", ") : "Not exported",
      detail: asset.approvedChannels?.length ? "Channels come from exported approval metadata." : "No channel-specific approval is exported for this record."
    },
    ...(asset.region ? [{
      id: "region",
      label: "Region",
      state: "info" as const,
      value: asset.region,
      detail: "Region is shown only when exported."
    }] : []),
    ...(expiration ? [{
      id: "expiration",
      label: "Expiration / re-review",
      state: "info" as const,
      value: expiration,
      detail: "Uses the first exported expiration or re-review field."
    }] : []),
    {
      id: "release",
      label: "Release evidence",
      state: release.state,
      value: release.value,
      detail: release.detail
    },
    {
      id: "role",
      label: "Role permission",
      state: downloadAccess.allowed ? "pass" : "review",
      value: downloadAccess.allowed ? `${role} can download the approved copy.` : `${role} cannot self-serve this download yet.`,
      detail: downloadAccess.allowed ? "Permission still runs through the approved-copy gate." : downloadAccess.reason || "Role access stays limited until the visible checks pass."
    }
  ];

  return {
    title: "Why can I use this?",
    summary: reusable
      ? "This record is currently cleared for the visible reuse path because approval, rights, people/release, and delivery checks pass for this role."
      : blockers[0] || "This record still needs review before normal reuse.",
    reusable,
    blockers,
    criteria
  };
}
