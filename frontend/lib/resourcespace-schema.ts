import { safeNonNegativeInt } from "@/lib/persisted-record-safety";
import { buildDamFilenames } from "@/lib/dam-filenames";
import type {
  ApprovedChannel,
  DomainReviewer,
  MasterCustodyPathStatus,
  PublishStatus,
  ReuseTier,
  RightsBasis,
  SensitivityClass,
  StockMediaAsset,
  UsageScope,
  VisibilityTier,
  WithdrawalStatus
} from "@/lib/types";

export type ResourceSpaceRecord = Record<string, string | number | null | undefined>;

export type ResourceSpaceGovernanceFieldFact = {
  key: string;
  resourceSpaceField: string;
  fieldType: "text" | "date" | "single-select" | "multi-select" | "boolean" | "derived";
  truthBoundary: "ResourceSpace" | "Google Shared Drive" | "Portal derived";
  readiness: "mapped" | "beta-field-map" | "requires-final-field-ref";
  privateSourceInternal?: boolean;
  notes: string;
};

export const resourceSpaceGovernanceFieldFacts: ResourceSpaceGovernanceFieldFact[] = [
  {
    key: "asset_id",
    resourceSpaceField: "resource_id / ref",
    fieldType: "derived",
    truthBoundary: "ResourceSpace",
    readiness: "mapped",
    notes: "Stable DAM record reference used for audit, pending writes, and lookup."
  },
  {
    key: "publish_status",
    resourceSpaceField: "publish_status",
    fieldType: "single-select",
    truthBoundary: "ResourceSpace",
    readiness: "beta-field-map",
    notes: "Raw DAM approval state. Portal reuse still requires evidence gates."
  },
  {
    key: "usage_scope",
    resourceSpaceField: "usage_scope",
    fieldType: "single-select",
    truthBoundary: "ResourceSpace",
    readiness: "beta-field-map",
    notes: "Defines public, internal, archive, and do-not-use distribution scope."
  },
  {
    key: "rights_basis",
    resourceSpaceField: "rights_basis",
    fieldType: "single-select",
    truthBoundary: "ResourceSpace",
    readiness: "requires-final-field-ref",
    notes: "Required before public clearance; supports music, contributor, and ownership review."
  },
  {
    key: "approved_channels",
    resourceSpaceField: "approved_channels",
    fieldType: "multi-select",
    truthBoundary: "ResourceSpace",
    readiness: "requires-final-field-ref",
    notes: "Channel list used by package and download policy. Not permission truth alone."
  },
  {
    key: "people_visible",
    resourceSpaceField: "people_visible / minors_visible",
    fieldType: "single-select",
    truthBoundary: "ResourceSpace",
    readiness: "beta-field-map",
    notes: "People and youth risk drive consent and reviewer routing."
  },
  {
    key: "sensitivity_class",
    resourceSpaceField: "sensitivity_class",
    fieldType: "single-select",
    truthBoundary: "ResourceSpace",
    readiness: "requires-final-field-ref",
    notes: "Separates public-safe media from worship, sacrament, youth, testimony, and governance contexts."
  },
  {
    key: "reviewed_by",
    resourceSpaceField: "reviewed_by",
    fieldType: "text",
    truthBoundary: "ResourceSpace",
    readiness: "beta-field-map",
    notes: "Human reviewer identity required for approval evidence."
  },
  {
    key: "reviewed_date",
    resourceSpaceField: "reviewed_date",
    fieldType: "date",
    truthBoundary: "ResourceSpace",
    readiness: "beta-field-map",
    notes: "Review freshness, re-review, and audit readiness depend on this date."
  },
  {
    key: "approved_use_copy",
    resourceSpaceField: "approved_derivative_url / preview derivative",
    fieldType: "derived",
    truthBoundary: "Portal derived",
    readiness: "requires-final-field-ref",
    notes: "Download gates require approved derivative evidence, not master-original access."
  },
  {
    key: "master_custody_status",
    resourceSpaceField: "master_custody_path_status",
    fieldType: "single-select",
    truthBoundary: "Google Shared Drive",
    readiness: "requires-final-field-ref",
    privateSourceInternal: true,
    notes: "Confirms master-original custody without exposing source paths to normal roles."
  },
  {
    key: "source_path",
    resourceSpaceField: "source_path / master_drive_path / checksum_sha256",
    fieldType: "text",
    truthBoundary: "Google Shared Drive",
    readiness: "requires-final-field-ref",
    privateSourceInternal: true,
    notes: "Admin-only provenance and dedupe internals. Never shown to Viewer or Contributor."
  }
];

export function resourceSpaceGovernanceFactForKey(key: string) {
  return resourceSpaceGovernanceFieldFacts.find((field) => field.key === key);
}

const mediaExtensions = {
  video: ["mp4", "mov", "m4v"],
  audio: ["mp3", "wav", "m4a", "aac", "flac"],
  graphic: ["pdf", "psd", "ai", "svg"],
  document: ["doc", "docx", "txt"]
};

const statusLabels: Record<PublishStatus, string> = {
  "Approved Public": "ResourceSpace Approved Public",
  "Approved Internal": "ResourceSpace Approved Internal",
  "Needs Review": "Please review before public sharing",
  "Searchable Archive": "Archive only",
  "Do Not Use": "Do not publish externally",
  "Possible Minors": "Contains children/youth"
};

const usageLabels: Record<UsageScope, string> = {
  Public: "Church-wide use",
  Internal: "Internal ministry use",
  "Public and Internal": "Church-wide and internal",
  "Archive Only": "Archive only",
  "Do Not Publish": "Not published",
  "Do Not Use": "Do not use"
};

function value(row: ResourceSpaceRecord, ...keys: string[]) {
  for (const key of keys) {
    const found = row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()];
    if (found !== undefined && found !== null && String(found).trim()) return String(found).trim();
  }
  return "";
}

export function splitResourceSpaceList(input?: string) {
  return (input || "")
    .split(/[;,|]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function normalizeControlledValue<T extends string>(input: string | undefined, aliases: Array<[T, RegExp]>): T | undefined {
  const raw = (input || "").trim();
  if (!raw) return undefined;
  const normalized = raw.toLowerCase().replace(/[_\s]+/g, "-");
  for (const [value, pattern] of aliases) {
    if (pattern.test(raw) || pattern.test(normalized)) return value;
  }
  return undefined;
}

function normalizeReuseTier(input: string): ReuseTier | undefined {
  return normalizeControlledValue<ReuseTier>(input, [
    ["stock-safe", /stock[-\s]?safe|approved stock|broad reuse|portal[-\s]?ready/i],
    ["context-safe", /context[-\s]?safe|context only|limited|event context/i],
    ["archive-only", /archive[-\s]?only|preservation|searchable archive|cold archive/i]
  ]);
}

function normalizeVisibilityTier(input: string): VisibilityTier | undefined {
  return normalizeControlledValue<VisibilityTier>(input, [
    ["public", /^public$|public-safe|external/i],
    ["internal/member", /internal|member|ministry/i],
    ["reviewer/admin", /reviewer|admin|restricted/i],
    ["archive", /archive|cold/i]
  ]);
}

function normalizeSensitivityClass(input: string): SensitivityClass | undefined {
  return normalizeControlledValue<SensitivityClass>(input, [
    ["public-safe", /public[-\s]?safe|none/i],
    ["member-sensitive", /member[-\s]?sensitive|member only|fellowship/i],
    ["sacrament-sensitive", /sacrament|baptism|footwashing|holy communion|communion/i],
    ["youth-sensitive", /youth|minor|children|religious education|\bRE\b/i],
    ["testimony-sensitive", /testimony|pastoral|healing|illness|grief|counseling/i],
    ["internal-governance", /internal governance|governance|board|admin/i],
    ["archive-restricted", /archive[-\s]?restricted|restricted archive|cold archive/i]
  ]);
}

function normalizeRightsBasis(input: string): RightsBasis | undefined {
  return normalizeControlledValue<RightsBasis>(input, [
    ["TJC-owned", /tjc[-\s]?owned|church owned|owned/i],
    ["contributor-license", /contributor|permission confirmed|licensed contributor|release/i],
    ["public-domain", /^public domain$/i],
    ["jurisdiction-limited-public-domain", /jurisdiction|country|territory.*public domain/i],
    ["hymn-license", /hymn.*license|music.*license/i],
    ["hymn-permission", /hymn.*permission|music.*permission/i],
    ["fair-use-internal-only", /fair use|internal only/i],
    ["unknown", /unknown|needs review|not confirmed/i]
  ]);
}

function normalizeApprovedChannel(input: string): ApprovedChannel | undefined {
  return normalizeControlledValue<ApprovedChannel>(input, [
    ["website", /website|web|hero/i],
    ["livestream", /livestream|stream/i],
    ["projection", /projection|slides?|screen/i],
    ["choir-upload", /choir/i],
    ["print", /print|newsletter|bulletin/i],
    ["social", /social|instagram|facebook/i],
    ["internal-training", /internal training|training/i],
    ["limited-share-link", /limited share|share link/i],
    ["archive-only", /archive/i]
  ]);
}

function normalizeApprovedChannels(input: string): ApprovedChannel[] {
  return splitResourceSpaceList(input)
    .map(normalizeApprovedChannel)
    .filter((item): item is ApprovedChannel => Boolean(item));
}

function normalizeDomainReviewer(input: string): DomainReviewer | undefined {
  return normalizeControlledValue<DomainReviewer>(input, [
    ["doctrine", /doctrine|sacrament/i],
    ["music-rights", /music|hymn/i],
    ["RE/minors", /minor|youth|children|religious education|\bRE\b/i],
    ["pastoral-sensitivity", /pastoral|testimony|sensitivity/i],
    ["archive", /archive|preservation/i],
    ["DAM-reviewer", /dam|media reviewer|reviewer/i]
  ]);
}

function normalizeMasterCustodyPathStatus(input: string): MasterCustodyPathStatus | undefined {
  return normalizeControlledValue<MasterCustodyPathStatus>(input, [
    ["verified", /verified|confirmed/i],
    ["planned", /planned|intended/i],
    ["missing", /missing|none/i],
    ["not-exported", /not exported|not-exported/i]
  ]);
}

function normalizeWithdrawalStatus(input: string): WithdrawalStatus | undefined {
  return normalizeControlledValue<WithdrawalStatus>(input, [
    ["active", /active|current/i],
    ["withdrawn", /withdrawn|withdrawal/i],
    ["takedown-requested", /takedown|remove request/i],
    ["embargoed", /embargo/i],
    ["expired", /expired/i]
  ]);
}

function titleCase(input: string) {
  return input
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function cleanDisplayTitle(row: ResourceSpaceRecord, fallback: string) {
  const original = value(row, "original_filename") || fallback;
  const tags = splitResourceSpaceList(value(row, "visible_content_tags", "human_tags_final"));
  const tjcTerms = splitResourceSpaceList(value(row, "tjc_terms", "TJC_terms"));
  let base = fallback
    .replace(/^copy of\s+/i, "")
    .replace(/\.(jpe?g|png|heic|heif|gif|tif|tiff|mp4|mov|m4v|mp3|wav|m4a|aac|flac|pdf)$/i, "")
    .replace(/已增强-降噪-\d+$/i, "")
    .replace(/[a-f0-9]{8}-[a-f0-9-]{20,}/gi, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const longNumericSuffix = base.match(/^(.*?)\s+\d{8,}\s*o?$/i);
  if (longNumericSuffix) base = longNumericSuffix[1].replace(/^\d+\s+/, "").trim() || base;

  const letters = (base.match(/[a-z]/gi) || []).length;
  const digits = (base.match(/\d/g) || []).length;
  const archiveContext = value(row, "source_album", "import_batch", "event_or_topic", "event_name") || "Archive";
  const resourceId = value(row, "resource_id", "resourcespace_ref", "ref");

  if (/^_?DSC0*\d+/i.test(base)) {
    const serial = base.match(/\d+/)?.[0]?.replace(/^0+/, "") || "";
    return `Photo${serial ? ` ${serial}` : ""}`;
  }
  if (/^(?:[a-f0-9]{8,}|[a-f0-9]{6,}\s+version\s+\d+|[a-f0-9]{6,}\s+\d{8,})/i.test(base)) {
    return `${archiveContext} Photo ${resourceId}`.trim();
  }
  if ((digits >= 1 && letters <= 2) || (digits >= 8 && letters < 6)) {
    return `${archiveContext} Photo ${resourceId}`.trim();
  }
  if (/^\d?[a-z0-9]{5,}$/i.test(base) && !/[aeiou].*[aeiou]/i.test(base)) {
    return `${archiveContext} Photo ${resourceId}`.trim();
  }
  if (/^[A-Z0-9-]{12,}$/i.test(base) || base.length < 3) {
    const context = [...tjcTerms, ...tags].find((item) => !/stock media candidate|mvp 2024/i.test(item));
    return context ? `${titleCase(context)} Detail` : `Media Record ${resourceId}`.trim();
  }
  if (/^bible\s+\d+/i.test(base)) return titleCase(base);
  if (/^beach\s+\d+/i.test(base)) return titleCase(base);
  if (/bench bible/i.test(original)) return "Bench Bible";

  return titleCase(base);
}

export function normalizeResourceSpaceStatus(row: ResourceSpaceRecord): PublishStatus {
  const raw = value(row, "publish_status", "status");
  if (raw === "Approved Public" || raw === "Approved Internal" || raw === "Needs Review" || raw === "Do Not Use") return raw;
  if (raw === "Searchable Archive" || raw === "Archive - Not Promoted") return "Searchable Archive";
  if (/possible minors|children|youth/i.test(raw)) return "Possible Minors";
  if (value(row, "minors_visible", "children_visible").toLowerCase() === "yes") return "Possible Minors";
  if (value(row, "public_safe").toLowerCase() === "yes" && /public/i.test(value(row, "usage_scope"))) return "Approved Public";
  if (value(row, "public_safe").toLowerCase() === "yes" && /internal/i.test(value(row, "usage_scope"))) return "Approved Internal";
  return "Needs Review";
}

export function statusToUserLabel(status: PublishStatus) {
  return statusLabels[status];
}

export function normalizeUsageScope(row: ResourceSpaceRecord): UsageScope {
  const raw = value(row, "usage_scope").replace(/internal only/i, "Internal");
  if (raw === "Public" || raw === "Internal" || raw === "Public and Internal" || raw === "Archive Only" || raw === "Do Not Use") return raw;
  if (/public.*internal|church-wide/i.test(raw)) return "Public and Internal";
  if (/internal/i.test(raw)) return "Internal";
  if (/archive/i.test(raw)) return "Archive Only";
  if (/do not use/i.test(raw)) return "Do Not Use";
  return "Do Not Publish";
}

export function usageScopeToUserLabel(scope: UsageScope) {
  return usageLabels[scope];
}

export function normalizePeopleRisk(row: ResourceSpaceRecord): StockMediaAsset["peopleRisk"] {
  const minors = value(row, "minors_visible", "children_visible").toLowerCase();
  const people = value(row, "people_visible").toLowerCase();
  if (minors === "yes") return "Possible minors";
  if (people === "yes") return "Adults visible";
  if (people === "no") return "No people";
  return "Unknown";
}

function normalizeMediaType(row: ResourceSpaceRecord): StockMediaAsset["mediaType"] {
  const raw = value(row, "media_type", "resource_type").toLowerCase();
  const ext = value(row, "file_extension", "original_extension", "file_format").toLowerCase().replace(/^\./, "");
  if (raw.includes("video") || mediaExtensions.video.includes(ext)) return "video";
  if (raw.includes("audio") || mediaExtensions.audio.includes(ext)) return "audio";
  if (raw.includes("graphic") || mediaExtensions.graphic.includes(ext)) return "graphic";
  if (mediaExtensions.document.includes(ext)) return "document";
  return "photo";
}

function normalizeRightsStatus(row: ResourceSpaceRecord) {
  const raw = value(row, "rights_status");
  if (!raw) return undefined;
  if (/^(approved public|approved internal|needs review|searchable archive|archive - not promoted|do not use|possible minors)$/i.test(raw)) {
    return undefined;
  }
  return raw;
}

function normalizeDownloadPolicy(status: PublishStatus): StockMediaAsset["downloadPolicy"] {
  if (status === "Approved Public") return "approved-copy-allowed";
  if (status === "Approved Internal") return "internal-approved-copy-allowed";
  return "not-downloadable";
}

export function imageUrlsForResource(id: string, cacheKey?: string) {
  const encoded = encodeURIComponent(id);
  const version = cacheKey ? `&v=${encodeURIComponent(cacheKey.slice(0, 16))}` : "";
  return {
    small: `/api/assets/thumbnail/${encoded}?variant=small${version}`,
    card: `/api/assets/thumbnail/${encoded}?variant=card${version}`,
    collection: `/api/assets/thumbnail/${encoded}?variant=collection${version}`,
    detail: `/api/assets/thumbnail/${encoded}?variant=detail${version}`,
    download: `/api/assets/thumbnail/${encoded}?variant=download${version}`
  };
}

export function validateResourceSpaceRecord(row: ResourceSpaceRecord) {
  const id = value(row, "resource_id", "resourcespace_ref", "canonical_asset_id", "ref");
  return {
    ok: Boolean(id),
    id,
    missing: id ? [] : ["resource_id"]
  };
}

function isMeaningful(value?: string) {
  return Boolean(value && !/^(unknown|not exported|not applicable|none|n\/a|needs review|review required)$/i.test(value.trim()));
}

export type MetadataContractValidation = {
  ok: boolean;
  missing: string[];
  warnings: string[];
};

export function validateAssetMetadataContract(asset: StockMediaAsset): MetadataContractValidation {
  const missing: string[] = [];
  const warnings: string[] = [];
  const requireField = (field: string, present: boolean) => {
    if (!present) missing.push(field);
  };
  const warnField = (field: string, present: boolean) => {
    if (!present) warnings.push(field);
  };

  requireField("asset_id", Boolean(asset.id || asset.resourceSpaceId));
  requireField("media_type", Boolean(asset.mediaType));
  requireField("source_system", Boolean(asset.sourceSystem || asset.sourcePlatform));
  requireField("source_album_or_event", Boolean(asset.sourceAlbum || asset.sourceFolder || asset.collection || asset.eventName));
  requireField("original_filename", Boolean(asset.originalFilename));
  requireField("master_custody_status", asset.masterCustodyPathStatus === "verified" || Boolean(asset.masterDrivePath));
  requireField("checksum_sha256", Boolean(asset.checksumSha256));

  if (asset.status === "Approved Public" || asset.status === "Approved Internal") {
    requireField("rights_status", isMeaningful(asset.rightsStatus));
    requireField("reviewed_by", Boolean(asset.reviewer));
    requireField("reviewed_date", Boolean(asset.reviewedDate));
    requireField("approval_notes", isMeaningful(asset.rightsNotes));
    requireField("people_visible", Boolean(asset.peopleRisk && asset.peopleRisk !== "Unknown"));
    requireField("approved_use_copy", Boolean(asset.imageUrls?.download));
  }

  if (asset.status === "Approved Public") {
    requireField("usage_scope_public", asset.usageScope === "Public" || asset.usageScope === "Public and Internal");
    requireField("derivative_dimensions", Boolean(asset.imageDimensions));
    requireField("rights_basis", isMeaningful(asset.rightsBasis));
    requireField("approved_channels", Boolean(asset.approvedChannels?.length));
  }

  warnField("reuse_tier", isMeaningful(asset.reuseTier));
  warnField("visibility_tier", isMeaningful(asset.visibilityTier));
  warnField("sensitivity_class", isMeaningful(asset.sensitivityClass));
  warnField("rights_basis", isMeaningful(asset.rightsBasis));
  warnField("approved_channels", Boolean(asset.approvedChannels?.length));
  warnField("required_notice", asset.requiredNotice !== undefined);
  warnField("expiration_or_recheck_date", isMeaningful(asset.expirationOrRecheckDate));
  warnField("domain_reviewer", isMeaningful(asset.domainReviewer));

  const peopleOrYouth = asset.peopleRisk === "Adults visible" || asset.peopleRisk === "Possible minors";
  if (peopleOrYouth) warnField("consent_release_record_id", isMeaningful(asset.consentReleaseRecordId));
  if (asset.peopleRisk === "Possible minors") warnField("domain_reviewer_re_minors", asset.domainReviewer === "RE/minors");

  const aiLooksFinal = Boolean(asset.aiTitleSuggestion || asset.aiVisibleTagSuggestions?.length || asset.aiTjcTermSuggestions?.length || asset.aiQualitySuggestion || asset.aiPeopleOrMinorFlag)
    && !/accepted|edited|rejected/i.test(asset.humanAiDecision || "");
  if (aiLooksFinal) warnings.push("ai_suggestions_not_human_approved");

  return {
    ok: missing.length === 0,
    missing,
    warnings
  };
}

export function normalizeResourceSpaceRecord(row: ResourceSpaceRecord): StockMediaAsset {
  const validation = validateResourceSpaceRecord(row);
  const id = validation.id || value(row, "canonical_asset_id") || "unknown-resource";
  const status = normalizeResourceSpaceStatus(row);
  const usageScope = normalizeUsageScope(row);
  const rawTitle = value(row, "human_title_final", "title", "original_filename") || `Resource ${id}`;
  const title = cleanDisplayTitle(row, rawTitle);
  const collection = value(row, "source_album", "import_batch", "event_or_topic", "event_name") || "ResourceSpace export";
  const checksumSha256 = value(row, "checksum_sha256") || undefined;
  const imageUrls = imageUrlsForResource(id, checksumSha256 || value(row, "reviewed_date") || id);
  const fileSizeBytes = safeNonNegativeInt(value(row, "file_size", "original_file_size_bytes")) || undefined;
  const peopleRisk = normalizePeopleRisk(row);

  const asset: StockMediaAsset = {
    id,
    title,
    thumbnail: imageUrls.small,
    thumbnailAlt: `${title} thumbnail`,
    preview: imageUrls.detail,
    imageUrls,
    mediaType: normalizeMediaType(row),
    collection,
    status,
    usageScope,
    visibility: status === "Approved Public" ? "public" : status === "Approved Internal" ? "internal" : "reviewer",
    peopleRisk,
    sourcePlatform: value(row, "source_platform") || undefined,
    sourceSystem: value(row, "source_system") || undefined,
    sourceAccount: value(row, "source_account") || undefined,
    sourceAlbum: value(row, "source_album", "import_batch", "event_or_topic", "event_name") || undefined,
    sourceAlbumPath: value(row, "source_album_path") || undefined,
    sourceAlbumMemberships: splitResourceSpaceList(value(row, "source_album_memberships")),
    eventName: value(row, "event_name", "event_or_topic") || undefined,
    eventSeries: value(row, "event_series") || undefined,
    eventDate: value(row, "event_date") || undefined,
    capturedDate: value(row, "captured_date") || undefined,
    fileModifiedDate: value(row, "file_modified_date", "modified_date", "mtime") || undefined,
    importDate: value(row, "import_date") || undefined,
    imageDimensions: value(row, "image_dimensions") || undefined,
    rightsStatus: normalizeRightsStatus(row),
    workflowState: value(row, "workflow_state") || undefined,
    qualityStatus: value(row, "quality_status") || undefined,
    sensitiveContext: value(row, "sensitive_context") || undefined,
    consentStatus: value(row, "consent_status") || undefined,
    usageTerms: splitResourceSpaceList(value(row, "usage_terms")),
    duplicateGroup: value(row, "duplicate_group") || undefined,
    duplicateRole: value(row, "duplicate_role") || undefined,
    checksumSha256,
    reviewer: value(row, "reviewed_by") || undefined,
    reviewedDate: value(row, "reviewed_date") || undefined,
    rightsNotes: value(row, "approval_notes", "notes") || undefined,
    usageGuidance:
      status === "Approved Public"
        ? "Approved for newsletters, slides, local church announcements, and church-wide ministry communication."
        : status === "Approved Internal"
          ? "Approved for internal ministry use only. Please do not share publicly without another review."
          : peopleRisk === "Possible minors"
            ? "Use with care: children/youth may be visible. Please ask a media coworker before public sharing."
            : "Please review before sharing publicly. A reviewer must approve this asset before reuse.",
    downloadPolicy: normalizeDownloadPolicy(status),
    resourceSpaceId: value(row, "resource_id", "resourcespace_ref", "ref") || undefined,
    sourcePath: value(row, "source_path") || undefined,
    masterDrivePath: value(row, "master_drive_path") || undefined,
    masterCustodyPathStatus: normalizeMasterCustodyPathStatus(value(row, "master_custody_path_status", "master_drive_path_status")),
    originalFilename: value(row, "original_filename") || undefined,
    fileExtension: value(row, "file_extension", "original_extension", "file_format") || undefined,
    fileSizeBytes,
    tags: splitResourceSpaceList(value(row, "visible_content_tags", "human_tags_final")),
    tjcTerms: splitResourceSpaceList(value(row, "tjc_terms", "TJC_terms")),
    aiTitleSuggestion: value(row, "ai_title_suggestion") || undefined,
    aiVisibleTagSuggestions: splitResourceSpaceList(value(row, "ai_visible_tag_suggestions")),
    aiTjcTermSuggestions: splitResourceSpaceList(value(row, "ai_tjc_term_suggestions")),
    aiQualitySuggestion: value(row, "ai_quality_suggestion") || undefined,
    aiPeopleOrMinorFlag: value(row, "ai_people_or_minor_flag") || undefined,
    humanAiDecision: value(row, "human_ai_decision") || undefined,
    reuseTier: normalizeReuseTier(value(row, "reuse_tier")),
    visibilityTier: normalizeVisibilityTier(value(row, "visibility_tier")),
    sensitivityClass: normalizeSensitivityClass(value(row, "sensitivity_class")),
    rightsBasis: normalizeRightsBasis(value(row, "rights_basis")),
    approvedChannels: normalizeApprovedChannels(value(row, "approved_channels")),
    requiredNotice: value(row, "required_notice") || undefined,
    consentReleaseRecordId: value(row, "consent_release_record_id") || undefined,
    publishDate: value(row, "publish_date") || undefined,
    embargoDate: value(row, "embargo_date") || undefined,
    expirationDate: value(row, "expiration_date") || undefined,
    approvalRecheckDate: value(row, "approval_recheck_date") || undefined,
    expirationOrRecheckDate: value(row, "expiration_or_recheck_date") || undefined,
    rightsExpirationDate: value(row, "rights_expiration_date") || undefined,
    consentExpirationDate: value(row, "consent_expiration_date") || undefined,
    withdrawalStatus: normalizeWithdrawalStatus(value(row, "withdrawal_status", "takedown_status")),
    domainReviewer: normalizeDomainReviewer(value(row, "domain_reviewer")),
    doctrineSacramentTheme: value(row, "doctrine_sacrament_theme") || undefined,
    hymnNumberOrTitle: value(row, "hymn_number_or_title", "hymn_number", "hymn_title") || undefined,
    sermonTitle: value(row, "sermon_title") || undefined,
    testimonyTheme: value(row, "testimony_theme") || undefined,
    religiousEducationLevel: value(row, "religious_education_level", "re_level") || undefined,
    church: value(row, "church", "local_church") || undefined,
    region: value(row, "region") || undefined,
    publicationTitle: value(row, "publication_title") || undefined,
    language: value(row, "language") || undefined,
    versionOrEdition: value(row, "version_or_edition", "edition") || undefined,
    duplicateSimilarityHint: value(row, "duplicate_similarity_hint", "near_duplicate_hint") || undefined
  };
  return {
    ...asset,
    damFilenames: buildDamFilenames(asset)
  };
}
