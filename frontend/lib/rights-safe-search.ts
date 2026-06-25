import { buildReuseDecision } from "@/lib/reuse-policy";
import type { StockMediaAsset } from "@/lib/types";

export type RightsSafeSummary = {
  active: boolean;
  contextLabel: string;
  safeLabel: string;
  totalBefore: number;
  totalAfter: number;
  hidden: number;
  criteria: string[];
  hiddenReasons: Array<{ label: string; count: number }>;
  explanation: string;
};

const criteria = [
  "Approved Public",
  "rights/release evidence present when exported",
  "people/minors review clear",
  "reviewer/date current",
  "approved-copy derivative available",
  "public channel/lifecycle clear"
];

function hiddenReasonLabel(reasonCode: string) {
  if (reasonCode === "blocked-rights") return "rights or release evidence missing";
  if (reasonCode === "blocked-people-minors") return "people/minors evidence missing";
  if (reasonCode === "blocked-reviewer-date") return "expired, stale, or missing reviewer/date";
  if (reasonCode === "blocked-derivative") return "approved-copy derivative missing";
  if (reasonCode === "blocked-source") return "source evidence missing";
  if (reasonCode === "blocked-do-not-use") return "blocked by Do Not Use";
  if (reasonCode === "blocked-archive") return "archive or reference-only";
  if (reasonCode === "blocked-sensitive") return "sensitive review required";
  if (reasonCode === "blocked-needs-review") return "draft, submitted, or review evidence pending";
  return "not cleared for current use";
}

function rightsSafeReasonLabels(asset: StockMediaAsset) {
  const decision = buildReuseDecision(asset);
  if (decision.state === "portal-ready") return [];
  const labels = decision.reasonCodes.map(hiddenReasonLabel);
  return labels.length ? [...new Set(labels)] : ["not cleared for current use"];
}

export function assetIsRightsSafeForCurrentUse(asset: StockMediaAsset) {
  return buildReuseDecision(asset).state === "portal-ready";
}

export function rightsSafeHiddenReasons(assets: StockMediaAsset[]) {
  const counts = new Map<string, number>();
  assets.forEach((asset) => {
    rightsSafeReasonLabels(asset).forEach((label) => counts.set(label, (counts.get(label) || 0) + 1));
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildRightsSafeSummary(assetsBefore: StockMediaAsset[], assetsAfter: StockMediaAsset[], active: boolean): RightsSafeSummary {
  const hiddenAssets = active ? assetsBefore.filter((asset) => !assetIsRightsSafeForCurrentUse(asset)) : [];
  const hidden = Math.max(0, assetsBefore.length - assetsAfter.length);
  return {
    active,
    contextLabel: "normal public reuse",
    safeLabel: "Only show assets I can use",
    totalBefore: assetsBefore.length,
    totalAfter: assetsAfter.length,
    hidden,
    criteria,
    hiddenReasons: rightsSafeHiddenReasons(hiddenAssets).slice(0, 6),
    explanation: active
      ? hidden
        ? `${hidden.toLocaleString()} asset${hidden === 1 ? "" : "s"} hidden because approval, rights, release, people/minors, lifecycle, or approved-copy evidence is missing.`
        : "All matching assets pass the rights-safe checks for normal public reuse."
      : "Rights-safe mode is off. Results may include review-gated, internal, archive, or not-downloadable assets for browsing."
  };
}
