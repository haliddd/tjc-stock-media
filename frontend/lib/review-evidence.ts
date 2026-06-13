import type { ReviewActionBackend } from "@/lib/workflow-policy";
import { safeBoolean } from "@/lib/persisted-record-safety";
import {
  assetHasChildrenYouthRisk,
  assetHasConsentEvidence,
  assetHasDomainReviewClearance,
  assetHasExplicitPublicRightsBasis,
  assetHasHymnMusicRisk,
  assetHasRenditionGap,
  assetHasPastoralSensitivityEvidence,
  assetHasPublicChannelClearance,
  assetHasSacramentRisk,
  assetHasTestimonyRisk,
  assetHasUnresolvedAiSuggestionDebt,
  assetLifecycleIsCurrent,
  assetNeedsStaleApprovalReview
} from "@/lib/asset-governance";
import type { ReviewEvidenceChecklist, StockMediaAsset } from "@/lib/types";

export const reviewChecklistItems: Array<{ field: keyof ReviewEvidenceChecklist; label: string; missingLabel: string; hint: string }> = [
  { field: "sourceConfirmed", label: "Source evidence", missingLabel: "Source evidence missing", hint: "Custody/source record checked" },
  { field: "rightsConfirmed", label: "Owner/license evidence", missingLabel: "Owner/license evidence missing", hint: "Rights status supports requested use" },
  { field: "attributionConfirmed", label: "Attribution evidence", missingLabel: "Attribution evidence missing", hint: "Credit requirement reviewed" },
  { field: "peopleVisibilityConfirmed", label: "People/minors status", missingLabel: "People/minors status unresolved", hint: "People/minors visibility reviewed" },
  { field: "childrenYouthChecked", label: "Children/youth review", missingLabel: "Children/youth review required", hint: "Youth/minor risk explicitly checked" },
  { field: "usageScopeSelected", label: "Usage scope", missingLabel: "Usage scope missing", hint: "Internal/public scope selected" },
  { field: "derivativeAvailable", label: "Approved derivative", missingLabel: "Approved derivative missing", hint: "Approved copy/rendition can be delivered" },
  { field: "sensitiveContextChecked", label: "Sensitive context review", missingLabel: "Sensitive context review required", hint: "Worship/sacrament/context reviewed" },
  { field: "creditRequirementChecked", label: "Credit requirement evidence", missingLabel: "Credit requirement evidence missing", hint: "Credit/attribution requirement recorded" },
  { field: "expirationRereviewSet", label: "Expiration/re-review decision", missingLabel: "Expiration or re-review decision missing", hint: "Future review requirement considered" },
  { field: "proofLinkAttached", label: "Proof link or note", missingLabel: "Proof link or note missing", hint: "Evidence/proof link or note attached" }
];

export const emptyReviewChecklist: ReviewEvidenceChecklist = {
  sourceConfirmed: false,
  rightsConfirmed: false,
  attributionConfirmed: false,
  peopleVisibilityConfirmed: false,
  childrenYouthChecked: false,
  usageScopeSelected: false,
  derivativeAvailable: false,
  sensitiveContextChecked: false,
  creditRequirementChecked: false,
  expirationRereviewSet: false,
  proofLinkAttached: false
};

export const reviewChecklistLabelByField = Object.fromEntries(
  reviewChecklistItems.map((item) => [item.field, item.label])
) as Record<keyof ReviewEvidenceChecklist, string>;

export type SensitiveMinistryEvidenceId =
  | "children-youth"
  | "sacrament"
  | "worship"
  | "music-teaching"
  | "testimony-private"
  | "rereview-required";

export type SensitiveMinistryEvidence = {
  id: SensitiveMinistryEvidenceId;
  label: string;
  active: boolean;
  required: boolean;
  blocked: boolean;
  owner: string;
  detail: string;
  missingEvidence: string[];
};

export const domainReviewEvidenceLabelByField: Record<string, string> = {
  consentReleaseRecord: "Consent/release record missing",
  "domainReviewer:RE/minors": "RE/minors reviewer missing",
  childrenYouthEvidence: "Children/youth evidence missing",
  "domainReviewer:doctrine": "Doctrine reviewer missing",
  doctrineSacramentEvidence: "Sacrament/doctrine evidence missing",
  worshipContextEvidence: "Worship/private context evidence missing",
  musicRightsBasis: "Music/teaching rights basis missing",
  musicApprovedChannel: "Approved public channel missing",
  musicRequiredNotice: "Required music/teaching notice missing",
  "domainReviewer:music-rights": "Music-rights reviewer missing",
  teachingDoctrineReviewer: "Teaching/doctrine reviewer missing",
  musicRightsEvidence: "Music/teaching rights evidence missing",
  "domainReviewer:pastoral-sensitivity": "Pastoral-sensitivity reviewer missing",
  pastoralSensitivityEvidence: "Testimony/private moment evidence missing",
  pastoralSensitivityNote: "Audit-safe pastoral note missing",
  lifecycleCurrentEvidence: "Lifecycle/re-review evidence expired",
  rereviewDecision: "Re-review decision missing",
  domainReviewerClearance: "Domain reviewer clearance missing",
  humanAiDecision: "Human AI/suggestion decision missing",
  approvedDerivativeEvidence: "Approved derivative evidence missing"
};

function compactUnique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function textMatchesAsset(asset: StockMediaAsset, pattern: RegExp) {
  return pattern.test([
    asset.sensitiveContext,
    asset.doctrineSacramentTheme,
    asset.testimonyTheme,
    asset.hymnNumberOrTitle,
    asset.sermonTitle,
    asset.publicationTitle,
    asset.rightsNotes,
    asset.eventName,
    ...(asset.tags || []),
    ...(asset.tjcTerms || []),
    ...(asset.usageTerms || [])
  ].filter(Boolean).join(" "));
}

export function assetHasWorshipOrPrivateMinistryContext(asset: StockMediaAsset) {
  return textMatchesAsset(asset, /worship|service|prayer|altar|private|pastoral|counseling|grief|illness/i);
}

export function assetHasMusicTeachingRisk(asset: StockMediaAsset) {
  return assetHasHymnMusicRisk(asset) || textMatchesAsset(asset, /sermon|teaching|lesson|doctrine|publication|bible study|religious education/i);
}

export function sensitiveMinistryEvidenceModel(
  asset: StockMediaAsset,
  action: ReviewActionBackend,
  checklist: ReviewEvidenceChecklist,
  note: string
): SensitiveMinistryEvidence[] {
  const normalized = normalizeReviewChecklist(checklist);
  const publicDecision = action === "Approve Public";
  const reviewNote = note.trim();
  const childrenYouthActive = assetHasChildrenYouthRisk(asset) || !asset.peopleRisk || asset.peopleRisk === "Unknown";
  const sacramentActive = assetHasSacramentRisk(asset);
  const worshipActive = assetHasWorshipOrPrivateMinistryContext(asset);
  const musicTeachingActive = assetHasMusicTeachingRisk(asset);
  const testimonyPrivateActive = assetHasTestimonyRisk(asset);
  const rereviewActive = !assetLifecycleIsCurrent(asset) || assetNeedsStaleApprovalReview(asset);

  const item = (
    id: SensitiveMinistryEvidenceId,
    label: string,
    active: boolean,
    owner: string,
    detail: string,
    missingEvidence: string[]
  ): SensitiveMinistryEvidence => {
    const required = publicDecision && active;
    return { id, label, active, required, blocked: required && missingEvidence.length > 0, owner, detail, missingEvidence: compactUnique(required ? missingEvidence : []) };
  };

  return [
    item(
      "children-youth",
      "Children/youth",
      childrenYouthActive,
      "RE/minors",
      asset.peopleRisk || "People/minors status unknown",
      [
        assetHasChildrenYouthRisk(asset) && !assetHasConsentEvidence(asset) ? "consentReleaseRecord" : "",
        assetHasChildrenYouthRisk(asset) && asset.domainReviewer !== "RE/minors" ? "domainReviewer:RE/minors" : "",
        !normalized.childrenYouthChecked || !normalized.peopleVisibilityConfirmed ? "childrenYouthEvidence" : ""
      ]
    ),
    item(
      "sacrament",
      "Sacrament",
      sacramentActive,
      "doctrine",
      asset.doctrineSacramentTheme || asset.sensitiveContext || "Sacrament/doctrine context",
      [
        asset.domainReviewer !== "doctrine" ? "domainReviewer:doctrine" : "",
        !normalized.sensitiveContextChecked ? "doctrineSacramentEvidence" : ""
      ]
    ),
    item(
      "worship",
      "Worship/private setting",
      worshipActive,
      "DAM reviewer",
      asset.sensitiveContext || "Worship or private ministry context",
      [
        !normalized.sensitiveContextChecked ? "worshipContextEvidence" : "",
        !normalized.proofLinkAttached && reviewNote.length <= 20 ? "worshipContextEvidence" : ""
      ]
    ),
    item(
      "music-teaching",
      "Music/teaching",
      musicTeachingActive,
      assetHasHymnMusicRisk(asset) ? "music-rights" : "doctrine",
      asset.hymnNumberOrTitle || asset.sermonTitle || asset.publicationTitle || "Music/teaching rights",
      [
        assetHasHymnMusicRisk(asset) && !assetHasExplicitPublicRightsBasis(asset) ? "musicRightsBasis" : "",
        assetHasHymnMusicRisk(asset) && (!assetHasPublicChannelClearance(asset) || !asset.approvedChannels?.length) ? "musicApprovedChannel" : "",
        assetHasHymnMusicRisk(asset) && !asset.requiredNotice ? "musicRequiredNotice" : "",
        assetHasHymnMusicRisk(asset) && asset.domainReviewer !== "music-rights" ? "domainReviewer:music-rights" : "",
        !assetHasHymnMusicRisk(asset) && textMatchesAsset(asset, /sermon|teaching|doctrine|bible study|religious education/i) && asset.domainReviewer !== "doctrine" ? "teachingDoctrineReviewer" : "",
        !normalized.rightsConfirmed || !normalized.creditRequirementChecked ? "musicRightsEvidence" : ""
      ]
    ),
    item(
      "testimony-private",
      "Testimony/private moments",
      testimonyPrivateActive,
      "pastoral-sensitivity",
      asset.testimonyTheme || asset.sensitiveContext || "Pastoral or private moment",
      [
        asset.domainReviewer !== "pastoral-sensitivity" ? "domainReviewer:pastoral-sensitivity" : "",
        !normalized.sensitiveContextChecked ? "pastoralSensitivityEvidence" : "",
        !assetHasPastoralSensitivityEvidence(asset) && reviewNote.length <= 20 ? "pastoralSensitivityNote" : ""
      ]
    ),
    item(
      "rereview-required",
      "Re-review required",
      rereviewActive,
      "DAM reviewer",
      asset.expirationOrRecheckDate || asset.approvalRecheckDate || asset.reviewedDate || "Lifecycle date missing or stale",
      [
        !assetLifecycleIsCurrent(asset) ? "lifecycleCurrentEvidence" : "",
        !normalized.expirationRereviewSet ? "rereviewDecision" : ""
      ]
    )
  ];
}

export function normalizeReviewChecklist(value: unknown): ReviewEvidenceChecklist {
  const raw = typeof value === "object" && value ? (value as Partial<Record<keyof ReviewEvidenceChecklist, unknown>>) : {};
  return {
    sourceConfirmed: safeBoolean(raw.sourceConfirmed),
    rightsConfirmed: safeBoolean(raw.rightsConfirmed),
    attributionConfirmed: safeBoolean(raw.attributionConfirmed),
    peopleVisibilityConfirmed: safeBoolean(raw.peopleVisibilityConfirmed),
    childrenYouthChecked: safeBoolean(raw.childrenYouthChecked),
    usageScopeSelected: safeBoolean(raw.usageScopeSelected),
    derivativeAvailable: safeBoolean(raw.derivativeAvailable),
    sensitiveContextChecked: safeBoolean(raw.sensitiveContextChecked),
    creditRequirementChecked: safeBoolean(raw.creditRequirementChecked),
    expirationRereviewSet: safeBoolean(raw.expirationRereviewSet),
    proofLinkAttached: safeBoolean(raw.proofLinkAttached)
  };
}

export function requiredReviewEvidence(action: ReviewActionBackend): Array<keyof ReviewEvidenceChecklist> {
  const required: Array<keyof ReviewEvidenceChecklist> = [
    "sourceConfirmed",
    "rightsConfirmed",
    "peopleVisibilityConfirmed",
    "childrenYouthChecked",
    "usageScopeSelected"
  ];
  if (action === "Approve Public") {
    required.push(
      "derivativeAvailable",
      "sensitiveContextChecked",
      "creditRequirementChecked",
      "attributionConfirmed",
      "expirationRereviewSet",
      "proofLinkAttached"
    );
  }
  return required;
}

export function missingReviewEvidence(action: ReviewActionBackend, checklist: ReviewEvidenceChecklist, note: string) {
  const missing = requiredReviewEvidence(action).filter((field) => !checklist[field]).map((field) => String(field));
  if (note.trim().length <= 10) missing.push("reviewNote");
  return missing;
}

export function missingDomainReviewEvidence(asset: StockMediaAsset, action: ReviewActionBackend, checklist: ReviewEvidenceChecklist, note: string) {
  if (action !== "Approve Public") return [];
  const missing: string[] = sensitiveMinistryEvidenceModel(asset, action, checklist, note).flatMap((item) => item.missingEvidence);
  const normalized = normalizeReviewChecklist(checklist);

  if (assetHasRenditionGap(asset) && !normalized.derivativeAvailable) missing.push("approvedDerivativeEvidence");
  if (!assetHasDomainReviewClearance(asset)) missing.push("domainReviewerClearance");
  if (assetHasUnresolvedAiSuggestionDebt(asset)) missing.push("humanAiDecision");

  return compactUnique(missing);
}

export function initialReviewChecklistForAsset(asset?: StockMediaAsset): ReviewEvidenceChecklist {
  if (!asset) return emptyReviewChecklist;
  return {
    ...emptyReviewChecklist,
    sourceConfirmed: Boolean(asset.resourceSpaceId || asset.sourceSystem || asset.sourcePlatform),
    usageScopeSelected: Boolean(asset.usageScope && asset.usageScope !== "Do Not Publish"),
    peopleVisibilityConfirmed: Boolean(asset.peopleRisk && asset.peopleRisk !== "Unknown"),
    childrenYouthChecked: Boolean(asset.peopleRisk && asset.peopleRisk !== "Unknown")
  };
}

export function reviewEvidenceCompletion(checklist: ReviewEvidenceChecklist, note: string) {
  const rows = [
    ...reviewChecklistItems.map((item) => ({ id: item.field, label: item.label, missingLabel: item.missingLabel, complete: checklist[item.field] })),
    { id: "reviewNote", label: "Review note", missingLabel: "Review note missing", complete: note.trim().length > 10 }
  ];
  return {
    rows,
    completed: rows.filter((item) => item.complete).length,
    total: rows.length,
    missingLabels: rows.filter((item) => !item.complete).map((item) => item.missingLabel)
  };
}

export function reviewDecisionMissingLabels(action: ReviewActionBackend, checklist: ReviewEvidenceChecklist, note: string) {
  return missingReviewEvidence(action, checklist, note).map((field) => {
    if (field === "reviewNote") return "Review note missing";
    return reviewChecklistItems.find((item) => item.field === field)?.missingLabel || reviewChecklistLabelByField[field as keyof ReviewEvidenceChecklist] || field;
  });
}

export function reviewDomainMissingLabels(asset: StockMediaAsset, action: ReviewActionBackend, checklist: ReviewEvidenceChecklist, note: string) {
  return missingDomainReviewEvidence(asset, action, checklist, note).map((field) => domainReviewEvidenceLabelByField[field] || field);
}

export function reviewDecisionDisabledReason(action: ReviewActionBackend, checklist: ReviewEvidenceChecklist, note: string) {
  const missing = reviewDecisionMissingLabels(action, checklist, note);
  if (!missing.length) return "";
  return `Missing: ${missing.slice(0, 4).join(", ")}${missing.length > 4 ? "..." : ""}`;
}

export function reviewActionDisabledReason({
  asset,
  action,
  checklist,
  note
}: {
  asset?: StockMediaAsset;
  action: ReviewActionBackend;
  checklist: ReviewEvidenceChecklist;
  note: string;
}) {
  const checklistMissing = reviewDecisionMissingLabels(action, checklist, note);
  const domainMissing = asset ? reviewDomainMissingLabels(asset, action, checklist, note) : [];
  const missing = compactUnique([...checklistMissing, ...domainMissing]);
  if (!missing.length) return "";
  return `Missing: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "..." : ""}`;
}

export function buildReviewEvidenceDecision(action: ReviewActionBackend, checklist: ReviewEvidenceChecklist, note: string, asset?: StockMediaAsset) {
  const normalized = normalizeReviewChecklist(checklist);
  const missingFields = missingReviewEvidence(action, normalized, note);
  const domainMissingFields = asset ? missingDomainReviewEvidence(asset, action, normalized, note) : [];
  const missingLabels = [
    ...reviewDecisionMissingLabels(action, normalized, note),
    ...(asset ? reviewDomainMissingLabels(asset, action, normalized, note) : [])
  ];
  return {
    action,
    checklist: normalized,
    requiredFields: requiredReviewEvidence(action),
    missingFields: compactUnique([...missingFields, ...domainMissingFields]),
    missingLabels,
    completion: reviewEvidenceCompletion(normalized, note),
    disabledReason: reviewActionDisabledReason({ asset, action, checklist: normalized, note }),
    sensitiveMinistryEvidence: asset ? sensitiveMinistryEvidenceModel(asset, action, normalized, note) : [],
    ready: missingFields.length === 0 && domainMissingFields.length === 0
  };
}
