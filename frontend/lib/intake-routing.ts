import { assetHasChildrenYouthRisk, assetHasRenditionGap, assetNeedsSourceReview } from "@/lib/asset-governance";
import { canonicalTags } from "@/lib/taxonomy";
import type { DomainReviewer, StockMediaAsset } from "@/lib/types";

export const LARGE_MEDIA_LIMIT_BYTES = 100 * 1024 * 1024;

export type IntakeRoutingReasonId =
  | "doctrine-sacrament-review"
  | "music-rights-review"
  | "testimony-pastoral-review"
  | "minors-consent-review"
  | "source-provenance-review"
  | "rendition-readiness-review"
  | "taxonomy-review"
  | "large-media-admin-intake"
  | "ai-suggestion-review";

export type IntakeRoutingReason = {
  id: IntakeRoutingReasonId;
  label: string;
  queue: string;
  reviewer: DomainReviewer | "taxonomy-manager" | "source-reviewer" | "rendition-reviewer";
  reason: string;
  nonPublishing: true;
};

type IntakeRoutingInput = {
  files?: Array<Pick<File, "name" | "size" | "type">>;
  sourceFolder?: string;
  sourceAccount?: string;
  importBatch?: string;
  checksumManifest?: string;
  originalFilenames?: string[];
  suggestedTags?: string;
  intakeNotes?: string;
  eventName?: string;
  ministry?: string;
  peopleVisible?: string;
  minorsVisible?: string;
  usageRights?: string;
  consentRestrictions?: string;
  doctrineSacramentSensitive?: string;
  testimonyPastoralSensitive?: string;
  hymnMusicPresent?: string;
};

const sacramentPattern = /\b(baptism|sacrament|holy communion|communion|footwashing|holy spirit|prayer in spirit|doctrine)\b/i;
const musicPattern = /\b(hymn|hymns of praise|music|choir|worship audio|worship video|livestream|song|singing)\b/i;
const youthPattern = /\b(minor|minors|children|child|youth|teen|re\b|religious education)\b/i;
const testimonyPattern = /\b(testimony|pastoral|sensitive story|healing|illness|grief|counseling|spiritual battle)\b/i;

const canonicalTagLookup = new Set(
  [...canonicalTags.visibleTags, ...canonicalTags.tjcTerms].map((tag) => tag.toLowerCase())
);

function routingReason(reason: Omit<IntakeRoutingReason, "nonPublishing">): IntakeRoutingReason {
  return { ...reason, nonPublishing: true };
}

function addUnique(reasons: IntakeRoutingReason[], reason: IntakeRoutingReason) {
  if (!reasons.some((item) => item.id === reason.id)) reasons.push(reason);
}

function compactText(values: Array<string | string[] | undefined>) {
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .map((value) => value || "")
    .join(" ");
}

function splitSuggestionTags(value?: string) {
  return (value || "")
    .split(/[|,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function fileIsVideoOrAudio(file: Pick<File, "name" | "type">) {
  const name = file.name.toLowerCase();
  return /^video\//i.test(file.type) || /^audio\//i.test(file.type) || /\.(mov|mp4|m4v|avi|mkv|mp3|wav|m4a|aac|flac)$/i.test(name);
}

export function fileRequiresAdminIntake(file: Pick<File, "name" | "size" | "type">) {
  return file.size > LARGE_MEDIA_LIMIT_BYTES || fileIsVideoOrAudio(file);
}

export function intakeDefaultsToNeedsReview() {
  return {
    status: "Needs Review",
    usageScope: "Do Not Publish",
    publishable: false as const
  };
}

export function routeUploadIntakeForReview(input: IntakeRoutingInput): IntakeRoutingReason[] {
  const reasons: IntakeRoutingReason[] = [];
  const text = compactText([
    input.eventName,
    input.ministry,
    input.intakeNotes,
    input.suggestedTags,
    input.usageRights,
    input.consentRestrictions,
    input.doctrineSacramentSensitive,
    input.testimonyPastoralSensitive,
    input.hymnMusicPresent
  ]);
  const files = input.files || [];

  if (files.some(fileRequiresAdminIntake)) {
    addUnique(reasons, routingReason({
      id: "large-media-admin-intake",
      label: "Large video/audio admin intake",
      queue: "large-media",
      reviewer: "source-reviewer",
      reason: "Video, audio, or files over the browser limit must be placed through Shared Drive/admin intake before DAM review."
    }));
  }
  if (/yes|unknown/i.test(input.doctrineSacramentSensitive || "") || sacramentPattern.test(text)) {
    addUnique(reasons, routingReason({
      id: "doctrine-sacrament-review",
      label: "Doctrine/sacrament review",
      queue: "doctrine-sacrament",
      reviewer: "doctrine",
      reason: "Sacrament or doctrine terms require domain review before any public reuse decision."
    }));
  }
  if (/yes|unknown/i.test(input.hymnMusicPresent || "") || musicPattern.test(text)) {
    addUnique(reasons, routingReason({
      id: "music-rights-review",
      label: "Music/hymn rights review",
      queue: "music-rights",
      reviewer: "music-rights",
      reason: "Hymn, music, choir, livestream, or worship audio/video terms require music-rights evidence."
    }));
  }
  if (/yes|unknown/i.test(input.testimonyPastoralSensitive || "") || testimonyPattern.test(text)) {
    addUnique(reasons, routingReason({
      id: "testimony-pastoral-review",
      label: "Testimony/pastoral sensitivity review",
      queue: "pastoral-sensitivity",
      reviewer: "pastoral-sensitivity",
      reason: "Testimony or pastoral-sensitive context needs restricted review before broad reuse."
    }));
  }
  if (input.peopleVisible === "Unknown" || input.minorsVisible === "Unknown" || input.minorsVisible === "Yes" || youthPattern.test(text)) {
    addUnique(reasons, routingReason({
      id: "minors-consent-review",
      label: "Minors/consent review",
      queue: "children-youth",
      reviewer: "RE/minors",
      reason: "People, children/youth, or unknown visibility requires consent/minors review."
    }));
  }
  if (!input.sourceFolder && !input.sourceAccount && !input.importBatch && !input.checksumManifest && !input.originalFilenames?.length) {
    addUnique(reasons, routingReason({
      id: "source-provenance-review",
      label: "Source provenance review",
      queue: "missing-source",
      reviewer: "source-reviewer",
      reason: "Batch intake should preserve source folder, source account, import batch, original filename, checksum, and custody status."
    }));
  }

  const suggestedTags = splitSuggestionTags(input.suggestedTags);
  const hasSparseTags = suggestedTags.length < 2;
  const hasNonCanonicalTags = suggestedTags.some((tag) => !canonicalTagLookup.has(tag.toLowerCase()));
  if (hasSparseTags || hasNonCanonicalTags) {
    addUnique(reasons, routingReason({
      id: "taxonomy-review",
      label: "Taxonomy review",
      queue: "taxonomy-drift",
      reviewer: "taxonomy-manager",
      reason: "Suggested tags are sparse or outside approved historical TJC vocabulary; reviewer must map or reject them."
    }));
  }

  return reasons;
}

export function routeAssetForReview(asset: StockMediaAsset): IntakeRoutingReason[] {
  const reasons: IntakeRoutingReason[] = [];
  const text = compactText([
    asset.title,
    asset.eventName,
    asset.sensitiveContext,
    asset.doctrineSacramentTheme,
    asset.hymnNumberOrTitle,
    asset.sermonTitle,
    asset.testimonyTheme,
    asset.religiousEducationLevel,
    asset.tags,
    asset.tjcTerms,
    asset.usageTerms,
    asset.aiVisibleTagSuggestions,
    asset.aiTjcTermSuggestions,
    asset.suggestedTags
  ]);

  if (sacramentPattern.test(text) || asset.sensitivityClass === "sacrament-sensitive") {
    addUnique(reasons, routingReason({
      id: "doctrine-sacrament-review",
      label: "Doctrine/sacrament review",
      queue: "doctrine-sacrament",
      reviewer: "doctrine",
      reason: "Doctrine or sacrament context needs reviewer evidence before reuse."
    }));
  }
  if (musicPattern.test(text) || asset.rightsBasis === "hymn-license" || asset.rightsBasis === "hymn-permission") {
    addUnique(reasons, routingReason({
      id: "music-rights-review",
      label: "Music/hymn rights review",
      queue: "music-rights",
      reviewer: "music-rights",
      reason: "Music or hymn context needs rights basis, channel clearance, and notice."
    }));
  }
  if (testimonyPattern.test(text) || asset.sensitivityClass === "testimony-sensitive") {
    addUnique(reasons, routingReason({
      id: "testimony-pastoral-review",
      label: "Testimony/pastoral sensitivity review",
      queue: "pastoral-sensitivity",
      reviewer: "pastoral-sensitivity",
      reason: "Testimony or pastoral-sensitive context needs restricted review before broad reuse."
    }));
  }
  if (!asset.peopleRisk || asset.peopleRisk === "Unknown" || assetHasChildrenYouthRisk(asset)) {
    addUnique(reasons, routingReason({
      id: "minors-consent-review",
      label: "Minors/consent review",
      queue: "children-youth",
      reviewer: "RE/minors",
      reason: "People/minors status is unknown or youth-sensitive."
    }));
  }
  if (assetNeedsSourceReview(asset) || !asset.checksumSha256 || !asset.originalFilename || asset.masterCustodyPathStatus === "missing") {
    addUnique(reasons, routingReason({
      id: "source-provenance-review",
      label: "Source provenance review",
      queue: "missing-source",
      reviewer: "source-reviewer",
      reason: "Source path/account/batch, checksum, original filename, or master custody evidence is missing."
    }));
  }
  if (assetHasRenditionGap(asset)) {
    addUnique(reasons, routingReason({
      id: "rendition-readiness-review",
      label: "Rendition readiness review",
      queue: "rendition-readiness",
      reviewer: "rendition-reviewer",
      reason: "Approved copy, derivative URL, or dimensions are missing."
    }));
  }
  const approvedTags = [...(asset.tags || []), ...(asset.tjcTerms || [])];
  const suggestedTags = asset.suggestedTags || [];
  const sparse = approvedTags.length < 2;
  const nonCanonical = [...approvedTags, ...suggestedTags].some((tag) => !canonicalTagLookup.has(tag.toLowerCase()));
  if (sparse || nonCanonical || asset.controlledVocabularySource && asset.controlledVocabularySource !== "approved-historical-tjc") {
    addUnique(reasons, routingReason({
      id: "taxonomy-review",
      label: "Taxonomy review",
      queue: "taxonomy-drift",
      reviewer: "taxonomy-manager",
      reason: "Visible/TJC tags are sparse, non-canonical, or suggestion-only."
    }));
  }
  if (asset.aiTitleSuggestion || asset.aiVisibleTagSuggestions?.length || asset.aiTjcTermSuggestions?.length || asset.aiQualitySuggestion || asset.aiPeopleOrMinorFlag) {
    addUnique(reasons, routingReason({
      id: "ai-suggestion-review",
      label: "AI suggestion review",
      queue: "ai-enrichment",
      reviewer: "DAM-reviewer",
      reason: "AI fields are hints only; reviewer must accept, edit, or reject before final metadata changes."
    }));
  }

  return reasons;
}
