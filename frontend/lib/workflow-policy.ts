import type { StockMediaAsset } from "@/lib/types";
import {
  assetHasChildrenYouthRisk,
  assetHasHymnMusicRisk,
  assetHasRenditionGap,
  assetHasSacramentRisk,
  assetHasTaxonomyDrift,
  assetHasTestimonyRisk,
  assetHasUnresolvedAiSuggestionDebt,
  assetIsDuplicateCandidate,
  assetIsArchiveOnly,
  assetIsApproved,
  assetNeedsAiEnrichment,
  assetNeedsReview,
  assetNeedsRightsReview,
  assetNeedsSourceReview,
  assetNeedsStaleApprovalReview,
  assetNeedsUsageGuidance
} from "@/lib/asset-governance";
import { LARGE_MEDIA_LIMIT_BYTES, routeAssetForReview } from "@/lib/intake-routing";

export const LARGE_MEDIA_BYTES = LARGE_MEDIA_LIMIT_BYTES;

export const uploadDefaultState = {
  status: "Submitted",
  message: "New media starts in review. A reviewer approves it before anyone can reuse it.",
  largeMediaMessage:
    "Video/audio and files over 100 MB use the large-media/admin intake path. They still need review before reuse."
};

export const uploadBetaBoundaries = {
  allowed: [
    "Event photos, ministry graphics, source folders, or Google Drive/source links for reviewer intake",
    "Focused batches up to 80 browser-selected files",
    "Reviewer evidence: source, owner/license, people/youth, requested use, proof link, and restrictions"
  ],
  forbidden: [
    "Video/audio or files over 100 MB in browser upload; use the large-media/admin intake path",
    "Source-media renames, deletes, moves, or Git commits",
    "Public approval, download enablement, or ResourceSpace approval writeback from upload"
  ],
  defaultState: {
    received: "Received",
    review: "Needs Review",
    usage: "Do Not Publish",
    custody: "Source custody stays in ResourceSpace/Shared Drive; Atlas records intake metadata only"
  }
} as const;

export const reviewActions = [
  { id: "approve-internal", label: "Approve internal use", backend: "Approve Internal", targetStatus: "Approved Internal" },
  { id: "approve-public", label: "Approve public/external use", backend: "Approve Public", targetStatus: "Approved Public" },
  { id: "archive-only", label: "Archive only", backend: "Searchable Archive", targetStatus: "Searchable Archive" },
  { id: "do-not-publish", label: "Mark Do Not Use", backend: "Do Not Use", targetStatus: "Do Not Use" },
  { id: "request-info", label: "Request changes", backend: "Request More Info", targetStatus: "Needs Review" },
  { id: "usage-guidance", label: "Add usage guidance", backend: "Add Usage Guidance", targetStatus: "Needs Review" }
] as const;

export type ReviewActionBackend = (typeof reviewActions)[number]["backend"];

export const reviewQueues = [
  { id: "risk", label: "Risk triage", description: "Children/youth, sacrament, worship, music/teaching, testimony/private, or other sensitive ministry evidence." },
  { id: "missing-evidence", label: "Missing evidence", description: "Approval-critical metadata, reviewer notes, rights, people, source, or usage evidence gaps." },
  { id: "stale-review", label: "Stale review", description: "Approved or lifecycle-sensitive records due for re-review." },
  { id: "derivative-gap", label: "Derivative gap", description: "Approved-copy, preview, dimensions, or rendition readiness gaps." },
  { id: "pending-write", label: "Pending write", description: "Portal decision queued; ResourceSpace remains unchanged until sync/follow-up succeeds." },
  { id: "pending", label: "Missing copyright evidence", description: "Evidence packet incomplete or needs reviewer decision." },
  { id: "children-youth", label: "People/minors status unresolved", description: "Contains, may contain, or has not ruled out people/youth." },
  { id: "missing-source", label: "Source access restricted", description: "Source, album, photographer, or custody path missing." },
  { id: "rights-review", label: "Rights review needed", description: "Owner, license, consent, attribution, or proof unclear." },
  { id: "usage-guidance", label: "Usage scope needed", description: "Approved/useful record lacks safe channel guidance." },
  { id: "internal-only", label: "Internal Only", description: "Useful but not public." },
  { id: "archive-candidates", label: "Archive Candidates", description: "Traceable, searchable, not promoted." },
  { id: "duplicate-candidates", label: "Duplicate Candidates", description: "Possible duplicate group or repeated source." },
  { id: "ai-enrichment", label: "AI Enrichment", description: "Needs tags, dimensions, people check, or TJC terms." },
  { id: "taxonomy-drift", label: "Taxonomy Drift", description: "Generic title or sparse controlled vocabulary." },
  { id: "stale-approvals", label: "Expiring/re-review due", description: "Approved assets that should be rechecked." },
  { id: "large-media", label: "Large Media", description: "Video/audio or large file intake." },
  { id: "doctrine-sacrament", label: "Doctrine/Sacrament Review", description: "Baptism, Holy Communion, footwashing, Holy Spirit, or doctrine context." },
  { id: "music-rights", label: "Music/Hymn Rights", description: "Hymns, music, choir, livestream, or worship audio/video clearance." },
  { id: "rendition-readiness", label: "Rendition Readiness", description: "Approved copy, derivative URL, or dimensions missing." }
] as const;

export type ReviewQueueId = (typeof reviewQueues)[number]["id"];

export function normalizeReviewQueueId(value: unknown): ReviewQueueId {
  const found = reviewQueues.find((queue) => queue.id === value);
  return found?.id || "pending";
}

export function isReviewActionBackend(value: unknown): value is ReviewActionBackend {
  return reviewActions.some((action) => action.backend === value);
}

export function assetMatchesReviewQueue(asset: StockMediaAsset, queueId: ReviewQueueId, duplicateGroupCounts?: Map<string, number>) {
  const largeMedia = asset.mediaType === "video" || asset.mediaType === "audio" || (asset.fileSizeBytes || 0) > LARGE_MEDIA_BYTES;

  switch (queueId) {
    case "risk":
      return reviewGovernanceGroupsForAsset(asset).some((group) => group.id === "risk" && group.active);
    case "missing-evidence":
      return reviewGovernanceGroupsForAsset(asset).some((group) => group.id === "missing-evidence" && group.active);
    case "stale-review":
      return reviewGovernanceGroupsForAsset(asset).some((group) => group.id === "stale-review" && group.active);
    case "derivative-gap":
      return reviewGovernanceGroupsForAsset(asset).some((group) => group.id === "derivative-gap" && group.active);
    case "pending-write":
      return Boolean(asset.pendingReviewWrite);
    case "pending":
      return assetNeedsReview(asset);
    case "children-youth":
      return assetHasChildrenYouthRisk(asset);
    case "missing-source":
      return assetNeedsSourceReview(asset);
    case "rights-review":
      return assetNeedsRightsReview(asset);
    case "usage-guidance":
      return assetNeedsUsageGuidance(asset);
    case "internal-only":
      return asset.status === "Approved Internal" || asset.usageScope === "Internal";
    case "archive-candidates":
      return assetIsArchiveOnly(asset);
    case "duplicate-candidates":
      return assetIsDuplicateCandidate(asset, duplicateGroupCounts);
    case "ai-enrichment":
      return assetNeedsAiEnrichment(asset);
    case "taxonomy-drift":
      return assetHasTaxonomyDrift(asset);
    case "stale-approvals":
      return assetNeedsStaleApprovalReview(asset);
    case "large-media":
      return largeMedia;
    case "doctrine-sacrament":
      return routeAssetForReview(asset).some((reason) => reason.id === "doctrine-sacrament-review");
    case "music-rights":
      return routeAssetForReview(asset).some((reason) => reason.id === "music-rights-review");
    case "rendition-readiness":
      return routeAssetForReview(asset).some((reason) => reason.id === "rendition-readiness-review");
  }
}

function meaningfulMetadataValue(value?: string) {
  return Boolean(value && !/^(unknown|not exported|not applicable|none|n\/a)$/i.test(value.trim()));
}

function assetHasWorshipOrPrivateSignal(asset: StockMediaAsset) {
  const text = [
    asset.sensitiveContext,
    asset.doctrineSacramentTheme,
    asset.testimonyTheme,
    asset.eventName,
    ...(asset.tags || []),
    ...(asset.tjcTerms || []),
    ...(asset.usageTerms || [])
  ].filter(Boolean).join(" ");
  return /worship|service|prayer|altar|private|pastoral|counseling|grief|illness/i.test(text);
}

function assetHasTeachingSignal(asset: StockMediaAsset) {
  const text = [
    asset.sermonTitle,
    asset.publicationTitle,
    asset.doctrineSacramentTheme,
    asset.sensitiveContext,
    ...(asset.tags || []),
    ...(asset.tjcTerms || []),
    ...(asset.usageTerms || [])
  ].filter(Boolean).join(" ");
  return /sermon|teaching|lesson|doctrine|bible study|religious education|publication/i.test(text);
}

export type ReviewGovernanceGroupId = "risk" | "missing-evidence" | "stale-review" | "derivative-gap" | "pending-write";

export type ReviewGovernanceGroup = {
  id: ReviewGovernanceGroupId;
  label: string;
  active: boolean;
  detail: string;
};

export function reviewGovernanceGroupsForAsset(asset: StockMediaAsset, hasPendingWrite = Boolean(asset.pendingReviewWrite)): ReviewGovernanceGroup[] {
  const riskSignals = [
    assetHasChildrenYouthRisk(asset) && "children/youth",
    assetHasSacramentRisk(asset) && "sacrament",
    assetHasWorshipOrPrivateSignal(asset) && "worship/private",
    (assetHasHymnMusicRisk(asset) || assetHasTeachingSignal(asset)) && "music/teaching",
    assetHasTestimonyRisk(asset) && "testimony/private moments"
  ].filter(Boolean);
  const missing = missingReviewFields(asset);
  const stale = assetNeedsStaleApprovalReview(asset);
  const derivativeGap = assetHasRenditionGap(asset);

  return [
    { id: "risk", label: "Risk", active: riskSignals.length > 0, detail: riskSignals.length ? riskSignals.join(", ") : "No elevated sensitive-ministry signal" },
    { id: "missing-evidence", label: "Missing evidence", active: missing.length > 0, detail: missing.length ? missing.join(", ") : "Required exported fields present" },
    { id: "stale-review", label: "Stale review", active: stale, detail: stale ? "Approval, expiry, embargo, withdrawal, or recheck date needs reviewer attention" : "Lifecycle dates current" },
    { id: "derivative-gap", label: "Derivative gap", active: derivativeGap, detail: derivativeGap ? "Approved copy, preview derivative, or dimensions missing" : "Derivative evidence present" },
    { id: "pending-write", label: "Pending write", active: hasPendingWrite, detail: hasPendingWrite ? "Portal decision queued; ResourceSpace truth still pending" : "No pending ResourceSpace write" }
  ];
}

export function reviewRiskFlags(asset: StockMediaAsset, duplicateGroupCounts?: Map<string, number>) {
  const flags: string[] = [];
  if (assetHasChildrenYouthRisk(asset)) flags.push("Children/youth");
  if (assetHasSacramentRisk(asset)) flags.push("Doctrine/sacrament review");
  if (assetHasWorshipOrPrivateSignal(asset)) flags.push("Worship/private context review");
  if (assetHasHymnMusicRisk(asset)) flags.push("Music/hymn rights review");
  if (assetHasTeachingSignal(asset)) flags.push("Teaching/doctrine review");
  if (assetHasTestimonyRisk(asset)) flags.push("Testimony/pastoral sensitivity review");
  if (asset.peopleRisk === "Adults visible") flags.push("People visible");
  if (!asset.peopleRisk || asset.peopleRisk === "Unknown") flags.push("People/minors status unresolved");
  if (assetNeedsSourceReview(asset)) flags.push("Missing source");
  if (assetNeedsRightsReview(asset)) flags.push("Rights unclear");
  if (!meaningfulMetadataValue(asset.consentStatus)) flags.push("Consent unknown");
  if (assetNeedsUsageGuidance(asset)) flags.push("No usage guidance");
  if (assetIsDuplicateCandidate(asset, duplicateGroupCounts)) flags.push("Possible duplicate");
  if (assetNeedsAiEnrichment(asset)) flags.push("Metadata enrichment");
  if (assetHasTaxonomyDrift(asset)) flags.push("Taxonomy drift");
  if (assetNeedsStaleApprovalReview(asset)) flags.push("Stale approval");
  if (assetHasRenditionGap(asset)) flags.push("Derivative gap");
  if (assetHasUnresolvedAiSuggestionDebt(asset)) flags.push("AI/smart suggestion review");
  if (asset.mediaType === "video" || asset.mediaType === "audio" || (asset.fileSizeBytes || 0) > LARGE_MEDIA_BYTES) flags.push("Large media");
  routeAssetForReview(asset).forEach((reason) => flags.push(reason.label));
  if (meaningfulMetadataValue(asset.sensitiveContext)) flags.push("Sensitive context");
  else if (asset.sensitiveContext === "Unknown") flags.push("Sensitivity unknown");
  return flags.length ? flags : ["Standard review"];
}

export function missingReviewFields(asset: StockMediaAsset) {
  const fields: string[] = [];
  if (assetIsApproved(asset) && !asset.reviewer) fields.push("reviewer");
  if (assetIsApproved(asset) && !asset.reviewedDate) fields.push("review date");
  if (!asset.peopleRisk || asset.peopleRisk === "Unknown") fields.push("people/minors");
  if (!meaningfulMetadataValue(asset.consentStatus)) fields.push("consent");
  if (assetNeedsRightsReview(asset) && !asset.rightsNotes) fields.push("rights notes");
  if (assetNeedsUsageGuidance(asset)) fields.push("usage guidance");
  if (assetNeedsSourceReview(asset)) fields.push("source");
  if (assetNeedsAiEnrichment(asset) && (!asset.tags?.length || !asset.tjcTerms?.length)) fields.push("AI/taxonomy suggestions");
  return fields;
}
