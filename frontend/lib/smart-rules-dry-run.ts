import { taxonomyApprovalBoundary, type TaxonomyApprovalBoundary } from "@/lib/governed-taxonomy";
import type { StockMediaAsset } from "@/lib/types";

export type SmartRuleEffect = "suggest" | "flag" | "route" | "worklist-filter";
export type SmartRuleSeverity = "info" | "review" | "blocker";

export type SmartRuleDryRunAction = {
  id: string;
  label: string;
  severity: SmartRuleSeverity;
  effects: SmartRuleEffect[];
  reason: string;
  canApprove: false;
  canMarkPortalReady: false;
  canEnableDownload: false;
  canWriteResourceSpace: false;
};

export type SmartRulesDryRunResult = {
  actions: SmartRuleDryRunAction[];
  blockers: string[];
  approvalBoundary: TaxonomyApprovalBoundary;
};

const doctrineTerms = [/baptism/i, /holy communion/i, /footwashing/i, /holy spirit/i, /sabbath/i];
const hymnTerms = [/hymn/i, /choir/i, /music/i];
const testimonyTerms = [/testimony/i, /illness/i, /healing/i, /pastoral/i, /private/i];
const youthTerms = [/\bRE\b/i, /children/i, /youth/i, /minor/i];

function haystack(asset: StockMediaAsset) {
  return [
    asset.title,
    asset.collection,
    asset.eventName,
    asset.doctrineSacramentTheme,
    asset.hymnNumberOrTitle,
    asset.sermonTitle,
    asset.testimonyTheme,
    asset.religiousEducationLevel,
    asset.rightsNotes,
    ...(asset.tags || []),
    ...(asset.tjcTerms || []),
    ...(asset.suggestedTags || []),
    ...(asset.aiVisibleTagSuggestions || []),
    ...(asset.aiTjcTermSuggestions || [])
  ].filter(Boolean).join(" ");
}

function matches(asset: StockMediaAsset, patterns: RegExp[]) {
  const text = haystack(asset);
  return patterns.some((pattern) => pattern.test(text));
}

function action(id: string, label: string, severity: SmartRuleSeverity, reason: string, effects: SmartRuleEffect[]): SmartRuleDryRunAction {
  return {
    id,
    label,
    severity,
    reason,
    effects,
    canApprove: false,
    canMarkPortalReady: false,
    canEnableDownload: false,
    canWriteResourceSpace: false
  };
}

function hasApprovedDerivative(asset: StockMediaAsset) {
  return Boolean(asset.imageUrls?.download && ["approved-copy-allowed", "internal-approved-copy-allowed"].includes(asset.downloadPolicy));
}

function hasSourceProof(asset: StockMediaAsset) {
  return Boolean(asset.resourceSpaceId || asset.sourceSystem || asset.sourceAlbum);
}

export function smartRulesDryRunForAsset(asset: StockMediaAsset): SmartRulesDryRunResult {
  const actions: SmartRuleDryRunAction[] = [];

  if (asset.peopleRisk === "Possible minors" || asset.status === "Possible Minors" || matches(asset, youthTerms)) {
    actions.push(action(
      "possible-minors-review",
      "Possible minors review",
      "review",
      "Children, youth, RE, or minors signal requires human review before reuse.",
      ["suggest", "flag", "route", "worklist-filter"]
    ));
  }
  if (matches(asset, hymnTerms)) {
    actions.push(action(
      "hymn-music-rights-review",
      "Hymn/music rights review",
      "review",
      "Hymn, choir, or music signal needs rights review.",
      ["suggest", "flag", "route"]
    ));
  }
  if (matches(asset, doctrineTerms)) {
    actions.push(action(
      "doctrine-context-review",
      "Doctrine/context review",
      "review",
      "Sacrament, doctrine, or Sabbath context needs reviewer confirmation.",
      ["suggest", "flag", "route"]
    ));
  }
  if (matches(asset, testimonyTerms)) {
    actions.push(action(
      "testimony-sensitivity-review",
      "Testimony sensitivity review",
      "review",
      "Testimony, healing, pastoral, or private context needs sensitivity review.",
      ["suggest", "flag", "route"]
    ));
  }
  if (!hasApprovedDerivative(asset)) {
    actions.push(action(
      "missing-approved-derivative",
      "Approved copy missing",
      "blocker",
      "Approved-use derivative is missing or not downloadable.",
      ["flag", "route", "worklist-filter"]
    ));
  }
  if (!hasSourceProof(asset)) {
    actions.push(action(
      "missing-source-provenance",
      "Source/provenance missing",
      "blocker",
      "Source system, source album, or ResourceSpace reference is missing.",
      ["flag", "route", "worklist-filter"]
    ));
  }

  return {
    actions,
    blockers: actions.filter((item) => item.severity === "blocker").map((item) => item.id),
    approvalBoundary: taxonomyApprovalBoundary()
  };
}
