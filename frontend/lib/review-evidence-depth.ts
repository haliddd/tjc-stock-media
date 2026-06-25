import type { ReviewActionBackend } from "@/lib/workflow-policy";
import type { ReviewEvidenceDepthChecklist, StockMediaAsset } from "@/lib/types";

export type ReviewEvidenceDepthField =
  | "brandGuidelinesChecked"
  | "modelReleaseChecked"
  | "propertyReleaseChecked"
  | "usageRightsChecked"
  | "locationTalentPermissionChecked"
  | "legalReviewChecked"
  | "altTextChecked";

export type ReviewEvidenceDepthItem = {
  field: ReviewEvidenceDepthField;
  label: string;
  hint: string;
  required: boolean;
  checked: boolean;
  missingLabel: string;
};

export const emptyReviewEvidenceDepthChecklist: ReviewEvidenceDepthChecklist = {
  brandGuidelinesChecked: false,
  modelReleaseChecked: false,
  propertyReleaseChecked: false,
  usageRightsChecked: false,
  locationTalentPermissionChecked: false,
  legalReviewChecked: false,
  altTextChecked: false
};

export function normalizeReviewEvidenceDepthChecklist(value: unknown): ReviewEvidenceDepthChecklist {
  const raw = (value || {}) as Partial<Record<ReviewEvidenceDepthField, unknown>>;
  return {
    brandGuidelinesChecked: raw.brandGuidelinesChecked === true,
    modelReleaseChecked: raw.modelReleaseChecked === true,
    propertyReleaseChecked: raw.propertyReleaseChecked === true,
    usageRightsChecked: raw.usageRightsChecked === true,
    locationTalentPermissionChecked: raw.locationTalentPermissionChecked === true,
    legalReviewChecked: raw.legalReviewChecked === true,
    altTextChecked: raw.altTextChecked === true
  };
}

function altTextApplies(asset: StockMediaAsset) {
  return asset.mediaType === "photo" || asset.mediaType === "graphic" || asset.mediaType === "document";
}

function modelReleaseApplies(asset: StockMediaAsset) {
  return asset.peopleRisk !== "No people";
}

function publicApproval(action: ReviewActionBackend) {
  return action === "Approve Public";
}

const definitions: Array<{ field: ReviewEvidenceDepthField; label: string; hint: string; missingLabel: string }> = [
  {
    field: "brandGuidelinesChecked",
    label: "Brand guidelines",
    hint: "Composition, tone, and campaign fit reviewed.",
    missingLabel: "Brand guidelines not reviewed"
  },
  {
    field: "modelReleaseChecked",
    label: "Model release",
    hint: "Model release reviewed, or explicitly not required.",
    missingLabel: "Model release not reviewed"
  },
  {
    field: "propertyReleaseChecked",
    label: "Property release",
    hint: "Property/location release or exception reviewed.",
    missingLabel: "Property release not reviewed"
  },
  {
    field: "usageRightsChecked",
    label: "Usage rights",
    hint: "License, usage rights, and permitted channels reviewed.",
    missingLabel: "Usage rights not reviewed"
  },
  {
    field: "locationTalentPermissionChecked",
    label: "Location/talent permission",
    hint: "Location or talent permission reviewed for intended use.",
    missingLabel: "Location/talent permission not reviewed"
  },
  {
    field: "legalReviewChecked",
    label: "Legal review",
    hint: "Legal/compliance review confirmed or explicitly not required.",
    missingLabel: "Legal review not confirmed"
  },
  {
    field: "altTextChecked",
    label: "Alt text",
    hint: "Accessibility description reviewed where applicable.",
    missingLabel: "Alt text not reviewed"
  }
];

function requiredFor(field: ReviewEvidenceDepthField, asset: StockMediaAsset, action: ReviewActionBackend) {
  if (field === "brandGuidelinesChecked" || field === "usageRightsChecked" || field === "legalReviewChecked") return true;
  if (!publicApproval(action)) return false;
  if (field === "modelReleaseChecked") return modelReleaseApplies(asset);
  if (field === "altTextChecked") return altTextApplies(asset);
  return true;
}

export function initialReviewEvidenceDepthChecklist(asset?: StockMediaAsset): ReviewEvidenceDepthChecklist {
  if (!asset) return emptyReviewEvidenceDepthChecklist;
  return {
    ...emptyReviewEvidenceDepthChecklist,
    modelReleaseChecked: !modelReleaseApplies(asset)
  };
}

export function reviewEvidenceDepthItems(asset: StockMediaAsset, checklist: ReviewEvidenceDepthChecklist, action: ReviewActionBackend): ReviewEvidenceDepthItem[] {
  return definitions.map((definition) => ({
    ...definition,
    required: requiredFor(definition.field, asset, action),
    checked: checklist[definition.field]
  }));
}

export function reviewEvidenceDepthMissingLabels(asset: StockMediaAsset, checklist: ReviewEvidenceDepthChecklist, action: ReviewActionBackend) {
  return reviewEvidenceDepthItems(asset, checklist, action)
    .filter((item) => item.required && !item.checked)
    .map((item) => item.missingLabel);
}

export function reviewEvidenceDepthDisabledReason(asset: StockMediaAsset, checklist: ReviewEvidenceDepthChecklist, action: ReviewActionBackend) {
  const missing = reviewEvidenceDepthMissingLabels(asset, checklist, action);
  return missing.length ? `Missing: ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "..." : ""}` : "";
}

export function reviewEvidenceDepthSummary(checklist: ReviewEvidenceDepthChecklist) {
  return definitions.filter((definition) => checklist[definition.field]).map((definition) => definition.label);
}

export function reviewEvidenceDepthMissingFields(asset: StockMediaAsset, checklist: ReviewEvidenceDepthChecklist, action: ReviewActionBackend) {
  return reviewEvidenceDepthItems(asset, checklist, action)
    .filter((item) => item.required && !item.checked)
    .map((item) => item.field);
}
