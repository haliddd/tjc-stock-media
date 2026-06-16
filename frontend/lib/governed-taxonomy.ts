import { containsOperationalText, containsScaffoldText } from "@/lib/public-text-safety";
import type { StockMediaAsset } from "@/lib/types";

export type GovernedTagClass = "controlled" | "freeform" | "suggested" | "system";
export type GovernedTagStatus = "suggested" | "accepted" | "rejected" | "locked";
export type GovernedTagSource =
  | "asset-tags"
  | "tjc-terms"
  | "usage-terms"
  | "review-suggestion"
  | "ai-suggestion"
  | "system-rule";

export type GovernedTaxonomyTag = {
  label: string;
  class: GovernedTagClass;
  status: GovernedTagStatus;
  source: GovernedTagSource;
  approvalTruth: false;
  routeOnly?: boolean;
};

export type TaxonomyApprovalBoundary = {
  tagsApproveReuse: false;
  aiApprovesReuse: false;
  smartRulesApproveReuse: false;
  humanReviewRequired: true;
};

const doctrineTerms = [/baptism/i, /holy communion/i, /footwashing/i, /holy spirit/i, /sabbath/i];
const hymnTerms = [/hymn/i, /choir/i, /music/i];
const testimonyTerms = [/testimony/i, /illness/i, /healing/i, /pastoral/i, /private/i];
const taxonomyScaffoldTextPattern = /\b(?:hosted beta fixture|hosted pagination fixture|hosted beta pagination|API smoke|qa\.fixture|fixture fallback)\b/i;

function safeTagLabel(value: unknown) {
  if (typeof value !== "string") return "";
  const label = value.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!label || taxonomyScaffoldTextPattern.test(label) || containsOperationalText(label) || containsScaffoldText(label)) return "";
  return label;
}

function tag(
  label: string,
  tagClass: GovernedTagClass,
  status: GovernedTagStatus,
  source: GovernedTagSource,
  routeOnly = false
): GovernedTaxonomyTag | null {
  const safeLabel = safeTagLabel(label);
  if (!safeLabel) return null;
  return { label: safeLabel, class: tagClass, status, source, approvalTruth: false, routeOnly };
}

function appendTags(
  tags: GovernedTaxonomyTag[],
  labels: unknown[] | undefined,
  tagClass: GovernedTagClass,
  status: GovernedTagStatus,
  source: GovernedTagSource
) {
  for (const label of labels || []) {
    const next = tag(String(label), tagClass, status, source);
    if (next) tags.push(next);
  }
}

function appendSystemTag(tags: GovernedTaxonomyTag[], label: string) {
  const next = tag(label, "system", "suggested", "system-rule", true);
  if (next) tags.push(next);
}

function labelMatches(asset: StockMediaAsset, patterns: RegExp[]) {
  const haystack = [
    asset.title,
    asset.collection,
    asset.eventName,
    asset.doctrineSacramentTheme,
    asset.hymnNumberOrTitle,
    asset.sermonTitle,
    asset.testimonyTheme,
    ...(asset.tags || []),
    ...(asset.tjcTerms || []),
    ...(asset.suggestedTags || []),
    ...(asset.aiVisibleTagSuggestions || []),
    ...(asset.aiTjcTermSuggestions || [])
  ].join(" ");
  return patterns.some((pattern) => pattern.test(haystack));
}

function missingApprovedDerivative(asset: StockMediaAsset) {
  return !asset.imageUrls?.download || !["approved-copy-allowed", "internal-approved-copy-allowed"].includes(asset.downloadPolicy);
}

function missingSourceProof(asset: StockMediaAsset) {
  return !asset.resourceSpaceId && !asset.sourceSystem && !asset.sourceAlbum;
}

function uniqueTags(tags: GovernedTaxonomyTag[]) {
  const seen = new Set<string>();
  return tags.filter((item) => {
    const key = `${item.label.toLowerCase()}|${item.class}|${item.status}|${item.source}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function taxonomyApprovalBoundary(): TaxonomyApprovalBoundary {
  return {
    tagsApproveReuse: false,
    aiApprovesReuse: false,
    smartRulesApproveReuse: false,
    humanReviewRequired: true
  };
}

export function governedTaxonomyForAsset(asset: StockMediaAsset): GovernedTaxonomyTag[] {
  const tags: GovernedTaxonomyTag[] = [];
  const tjcTermStatus: GovernedTagStatus = asset.controlledVocabularySource === "approved-historical-tjc" ? "locked" : "accepted";

  appendTags(tags, asset.tjcTerms, "controlled", tjcTermStatus, "tjc-terms");
  appendTags(tags, asset.usageTerms, "controlled", "accepted", "usage-terms");
  appendTags(tags, asset.tags, "freeform", "accepted", "asset-tags");
  appendTags(tags, asset.suggestedTags, "suggested", "suggested", "review-suggestion");
  appendTags(tags, asset.aiVisibleTagSuggestions, "suggested", "suggested", "ai-suggestion");
  appendTags(tags, asset.aiTjcTermSuggestions, "suggested", "suggested", "ai-suggestion");

  if (asset.peopleRisk === "Possible minors" || asset.status === "Possible Minors") appendSystemTag(tags, "Possible minors review");
  if (/need|missing|unknown/i.test(`${asset.rightsStatus || ""} ${asset.consentStatus || ""}`)) appendSystemTag(tags, "Rights or consent review");
  if (labelMatches(asset, hymnTerms)) appendSystemTag(tags, "Hymn/music rights review");
  if (labelMatches(asset, doctrineTerms)) appendSystemTag(tags, "Doctrine/context review");
  if (labelMatches(asset, testimonyTerms)) appendSystemTag(tags, "Testimony sensitivity review");
  if (missingApprovedDerivative(asset)) appendSystemTag(tags, "Approved copy missing");
  if (missingSourceProof(asset)) appendSystemTag(tags, "Source/provenance missing");

  return uniqueTags(tags);
}

export function officialSearchTermsForAsset(asset: StockMediaAsset) {
  return governedTaxonomyForAsset(asset)
    .filter((item) => item.class !== "system" && (item.status === "accepted" || item.status === "locked"))
    .map((item) => item.label);
}
