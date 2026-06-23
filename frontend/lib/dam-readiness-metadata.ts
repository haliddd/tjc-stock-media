import { resourceSpaceFieldMap } from "@/lib/resourcespace-field-map";
import { canonicalTags } from "@/lib/taxonomy";
import type { FieldMappingStatus, StockMediaAsset, VocabularyInsight } from "@/lib/types";

const fieldMapLookup: Record<string, string | number> = resourceSpaceFieldMap;

const fieldDefinitions: Array<{
  key: string;
  label: string;
  required: boolean;
}> = [
  { key: "publishStatus", label: "Publish status", required: true },
  { key: "usageScope", label: "Usage scope", required: true },
  { key: "rightsStatus", label: "Rights status", required: true },
  { key: "consentStatus", label: "Consent status", required: true },
  { key: "peopleVisible", label: "People visible", required: true },
  { key: "minorsVisible", label: "Children/youth visible", required: true },
  { key: "reviewer", label: "Reviewer", required: true },
  { key: "reviewedDate", label: "Review date", required: true },
  { key: "sourceSystem", label: "Source system", required: true },
  { key: "sourceAccount", label: "Source / photographer", required: false },
  { key: "sourceTraceability", label: "Source traceability", required: true },
  { key: "sourceAlbumMemberships", label: "Album memberships", required: false },
  { key: "visibleTags", label: "Visible tags", required: true },
  { key: "tjcTerms", label: "TJC terms", required: true },
  { key: "integrityFingerprint", label: "Integrity fingerprint", required: true },
  { key: "duplicateGroup", label: "Duplicate group", required: false },
  { key: "reuseTier", label: "Reuse tier", required: true },
  { key: "visibilityTier", label: "Visibility tier", required: true },
  { key: "sensitivityClass", label: "Sensitivity class", required: true },
  { key: "rightsBasis", label: "Rights basis", required: true },
  { key: "approvedChannels", label: "Approved channels", required: true },
  { key: "requiredNotice", label: "Required notice", required: false },
  { key: "consentReleaseRecordId", label: "Consent/release record", required: false },
  { key: "approvalRecheckDate", label: "Approval recheck date", required: false },
  { key: "domainReviewer", label: "Domain reviewer", required: false }
];

function ratio(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}

function fieldPresent(asset: StockMediaAsset, key: string) {
  switch (key) {
    case "publishStatus":
      return Boolean(asset.status);
    case "usageScope":
      return Boolean(asset.usageScope);
    case "rightsStatus":
      return Boolean(asset.rightsStatus && !/unknown|needs review|review required/i.test(asset.rightsStatus));
    case "consentStatus":
      return Boolean(asset.consentStatus && !/unknown|needs review|review required/i.test(asset.consentStatus));
    case "peopleVisible":
      return Boolean(asset.peopleRisk && asset.peopleRisk !== "Unknown");
    case "minorsVisible":
      return Boolean(asset.peopleRisk && asset.peopleRisk !== "Unknown");
    case "visibleTags":
      return Boolean(asset.tags?.length);
    case "tjcTerms":
      return Boolean(asset.tjcTerms?.length);
    case "reviewer":
      return Boolean(asset.reviewer);
    case "reviewedDate":
      return Boolean(asset.reviewedDate);
    case "sourceAlbum":
      return Boolean(asset.collection);
    case "sourceAlbumMemberships":
      return Boolean(asset.sourceAlbumMemberships?.length);
    case "sourceTraceability":
      return Boolean(asset.sourcePath);
    case "integrityFingerprint":
      return Boolean(asset.checksumSha256);
    case "duplicateGroup":
      return Boolean(asset.duplicateGroup);
    case "reuseTier":
      return Boolean(asset.reuseTier);
    case "visibilityTier":
      return Boolean(asset.visibilityTier);
    case "sensitivityClass":
      return Boolean(asset.sensitivityClass);
    case "rightsBasis":
      return Boolean(asset.rightsBasis && asset.rightsBasis !== "unknown");
    case "approvedChannels":
      return Boolean(asset.approvedChannels?.length);
    case "requiredNotice":
      return Boolean(asset.requiredNotice);
    case "consentReleaseRecordId":
      return Boolean(asset.consentReleaseRecordId);
    case "approvalRecheckDate":
      return Boolean(asset.approvalRecheckDate || asset.expirationOrRecheckDate);
    case "domainReviewer":
      return Boolean(asset.domainReviewer);
    default: {
      const value = asset[key as keyof StockMediaAsset];
      return Array.isArray(value) ? value.length > 0 : Boolean(value);
    }
  }
}

export function buildFieldMappings(assets: StockMediaAsset[]): FieldMappingStatus[] {
  return fieldDefinitions.map((field) => {
    const present = assets.filter((asset) => fieldPresent(asset, field.key)).length;
    const missing = Math.max(0, assets.length - present);
    return {
      key: field.key,
      label: field.label,
      resourceSpaceField: String(fieldMapLookup[field.key] || field.key),
      required: field.required,
      coverage: ratio(present, assets.length),
      present,
      missing
    };
  });
}

function normalizeTerm(term: string) {
  return term.trim().replace(/\s+/g, " ");
}

export function buildVocabulary(assets: StockMediaAsset[]): VocabularyInsight[] {
  const canonical = [...canonicalTags.visibleTags, ...canonicalTags.tjcTerms];
  const canonicalLookup = new Map(canonical.map((term) => [term.toLowerCase(), term]));
  const counts = new Map<string, { label: string; count: number }>();

  assets.forEach((asset) => {
    [...(asset.tags || []), ...(asset.tjcTerms || []), ...(asset.usageTerms || [])].forEach((term) => {
      const label = normalizeTerm(term);
      if (!label) return;
      const key = label.toLowerCase();
      const current = counts.get(key);
      counts.set(key, { label: current?.label || label, count: (current?.count || 0) + 1 });
    });
  });

  const canonicalRows: VocabularyInsight[] = canonical
    .flatMap((term) => {
      const count = counts.get(term.toLowerCase())?.count || 0;
      return count ? [{ term, count, kind: "canonical" as const }] : [];
    });

  const candidateRows: VocabularyInsight[] = [...counts.entries()]
    .filter(([key]) => !canonicalLookup.has(key))
    .map(([, item]) => ({
      term: item.label,
      count: item.count,
      kind: item.count >= 3 ? ("candidate" as const) : ("drift" as const)
    }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, 18);

  return [...canonicalRows, ...candidateRows].slice(0, 28);
}
