import { assetRecordRef, assetType, formatBytes, recordIdLabel } from "@/lib/enterprise-display";
import { resourceSpaceGovernanceFactForKey } from "@/lib/resourcespace-schema";
import type { DemoRole, MediaSourceStatus, StockMediaAsset } from "@/lib/types";

export type MetadataRow = [string, string | number];
export type AssetRecordRowTone = "ready" | "review" | "blocked" | "restricted" | "pending" | "info";
export type AssetRecordRow = {
  id: string;
  label: string;
  value: string;
  detail?: string;
  filename?: string;
  tone?: AssetRecordRowTone;
};

export type MetadataIntakeRequirement = "required" | "recommended" | "reviewer-only" | "admin-only";

export type EnterpriseMetadataSchemaRow = {
  key: string;
  label: string;
  resourceSpaceField: string;
  controlledValues: string[];
  required: boolean;
  roleVisibility: DemoRole[];
  clearanceEffect: string;
  intakeRequirement: MetadataIntakeRequirement;
  sourceTruth: "ResourceSpace" | "Google Shared Drive" | "Portal derived";
  privateSourceInternal?: boolean;
  ownerNotes: string;
};

export type RedactedMetadataSchemaRow = Omit<EnterpriseMetadataSchemaRow, "resourceSpaceField" | "privateSourceInternal" | "ownerNotes"> & {
  resourceSpaceField: "Restricted";
};

const enterpriseMetadataSchemaBaseRows = [
  {
    key: "asset_id",
    label: "Asset ID",
    resourceSpaceField: "resource_id / ref",
    controlledValues: [],
    required: true,
    roleVisibility: ["Viewer", "Contributor", "Reviewer", "DAM Admin"],
    clearanceEffect: "Required for audit lookup and ResourceSpace traceability.",
    intakeRequirement: "required",
    sourceTruth: "ResourceSpace",
    ownerNotes: "Never invent IDs in portal sidecars."
  },
  {
    key: "publish_status",
    label: "ResourceSpace status",
    resourceSpaceField: "publish_status",
    controlledValues: ["Approved Public", "Approved Internal", "Needs Review", "Searchable Archive", "Do Not Use", "Possible Minors"],
    required: true,
    roleVisibility: ["Viewer", "Contributor", "Reviewer", "DAM Admin"],
    clearanceEffect: "Seeds workflow lane; portal-ready still needs rights, people, review, and derivative evidence.",
    intakeRequirement: "reviewer-only",
    sourceTruth: "ResourceSpace",
    ownerNotes: "Approved Public is never enough by itself."
  },
  {
    key: "usage_scope",
    label: "Usage scope",
    resourceSpaceField: "usage_scope",
    controlledValues: ["Public", "Internal", "Public and Internal", "Archive Only", "Do Not Publish", "Do Not Use"],
    required: true,
    roleVisibility: ["Viewer", "Contributor", "Reviewer", "DAM Admin"],
    clearanceEffect: "Controls public/internal download eligibility and package clearance.",
    intakeRequirement: "required",
    sourceTruth: "ResourceSpace",
    ownerNotes: "Scope must match reviewer notes before any public package is cleared."
  },
  {
    key: "rights_basis",
    label: "Rights basis",
    resourceSpaceField: "rights_basis",
    controlledValues: ["TJC-owned", "contributor-license", "public-domain", "jurisdiction-limited-public-domain", "hymn-license", "hymn-permission", "fair-use-internal-only", "unknown"],
    required: true,
    roleVisibility: ["Reviewer", "DAM Admin"],
    clearanceEffect: "Blocks public approval when unknown or internal-only.",
    intakeRequirement: "required",
    sourceTruth: "ResourceSpace",
    ownerNotes: "Music and third-party design need domain reviewer confirmation."
  },
  {
    key: "approved_channels",
    label: "Approved channels",
    resourceSpaceField: "approved_channels",
    controlledValues: ["website", "livestream", "projection", "choir-upload", "print", "social", "internal-training", "limited-share-link", "archive-only"],
    required: true,
    roleVisibility: ["Reviewer", "DAM Admin"],
    clearanceEffect: "Limits delivery, package, and download affordances to approved contexts.",
    intakeRequirement: "reviewer-only",
    sourceTruth: "ResourceSpace",
    ownerNotes: "Channels explain use; they do not override RBAC."
  },
  {
    key: "people_visible",
    label: "People and minors",
    resourceSpaceField: "people_visible / minors_visible",
    controlledValues: ["No people", "Adults visible", "Possible minors", "Unknown"],
    required: true,
    roleVisibility: ["Viewer", "Contributor", "Reviewer", "DAM Admin"],
    clearanceEffect: "Possible minors route to consent review and block public self-serve reuse.",
    intakeRequirement: "required",
    sourceTruth: "ResourceSpace",
    ownerNotes: "Unknown people status must not be treated as no people."
  },
  {
    key: "sensitivity_class",
    label: "Sensitivity class",
    resourceSpaceField: "sensitivity_class",
    controlledValues: ["public-safe", "member-sensitive", "sacrament-sensitive", "youth-sensitive", "testimony-sensitive", "internal-governance", "archive-restricted"],
    required: true,
    roleVisibility: ["Reviewer", "DAM Admin"],
    clearanceEffect: "Sensitive ministry terms require reviewer domain routing and may force internal-only use.",
    intakeRequirement: "required",
    sourceTruth: "ResourceSpace",
    ownerNotes: "Sacrament, testimony, youth, and pastoral/private contexts stay first-class fields."
  },
  {
    key: "reviewed_by",
    label: "Reviewer",
    resourceSpaceField: "reviewed_by",
    controlledValues: [],
    required: true,
    roleVisibility: ["Reviewer", "DAM Admin"],
    clearanceEffect: "Approval cannot become portal-ready without named human reviewer.",
    intakeRequirement: "reviewer-only",
    sourceTruth: "ResourceSpace",
    ownerNotes: "AI suggestions never count as reviewer evidence."
  },
  {
    key: "reviewed_date",
    label: "Review date",
    resourceSpaceField: "reviewed_date",
    controlledValues: [],
    required: true,
    roleVisibility: ["Reviewer", "DAM Admin"],
    clearanceEffect: "Enables stale-review and re-review policy.",
    intakeRequirement: "reviewer-only",
    sourceTruth: "ResourceSpace",
    ownerNotes: "Use ISO dates in exports when possible."
  },
  {
    key: "approved_use_copy",
    label: "Approved use copy",
    resourceSpaceField: "approved_derivative_url / preview derivative",
    controlledValues: ["thumbnail", "preview", "approved web copy", "approved print copy"],
    required: true,
    roleVisibility: ["Viewer", "Contributor", "Reviewer", "DAM Admin"],
    clearanceEffect: "Downloads stay blocked when approved derivative evidence is missing.",
    intakeRequirement: "reviewer-only",
    sourceTruth: "Portal derived",
    ownerNotes: "Original/master access remains request-only."
  },
  {
    key: "master_custody_status",
    label: "Master custody status",
    resourceSpaceField: "master_custody_path_status",
    controlledValues: ["verified", "planned", "missing", "not-exported"],
    required: true,
    roleVisibility: ["DAM Admin"],
    clearanceEffect: "Flags source custody gaps without granting master access.",
    intakeRequirement: "admin-only",
    sourceTruth: "Google Shared Drive",
    privateSourceInternal: true,
    ownerNotes: "Shared Drive remains master copy; portal never mutates source media."
  },
  {
    key: "source_path",
    label: "Source internals",
    resourceSpaceField: "source_path / master_drive_path / checksum_sha256",
    controlledValues: [],
    required: true,
    roleVisibility: ["DAM Admin"],
    clearanceEffect: "Supports provenance, dedupe, and audit without normal-role disclosure.",
    intakeRequirement: "admin-only",
    sourceTruth: "Google Shared Drive",
    privateSourceInternal: true,
    ownerNotes: "Private paths, original filenames, and checksums are admin-only."
  }
] satisfies EnterpriseMetadataSchemaRow[];

export const enterpriseMetadataSchemaRows: EnterpriseMetadataSchemaRow[] = enterpriseMetadataSchemaBaseRows.map((row): EnterpriseMetadataSchemaRow => {
  const fact = resourceSpaceGovernanceFactForKey(row.key);
  if (!fact) return row;
  return {
    ...row,
    resourceSpaceField: fact.resourceSpaceField,
    sourceTruth: fact.truthBoundary,
    privateSourceInternal: row.privateSourceInternal || fact.privateSourceInternal || undefined
  };
});

export function enterpriseMetadataSchemaForRole(role: DemoRole): Array<EnterpriseMetadataSchemaRow | RedactedMetadataSchemaRow> {
  if (role === "DAM Admin") return enterpriseMetadataSchemaRows;
  return enterpriseMetadataSchemaRows
    .filter((row) => row.roleVisibility.includes(role) && !row.privateSourceInternal)
    .map(({ resourceSpaceField: _resourceSpaceField, privateSourceInternal: _privateSourceInternal, ownerNotes: _ownerNotes, ...row }) => ({
      ...row,
      resourceSpaceField: "Restricted" as const
    }));
}

export function metadataSchemaHealthSummary(rows: EnterpriseMetadataSchemaRow[] = enterpriseMetadataSchemaRows) {
  const required = rows.filter((row) => row.required);
  const privateInternals = rows.filter((row) => row.privateSourceInternal);
  const intakeRequired = rows.filter((row) => row.intakeRequirement === "required");
  const controlled = rows.filter((row) => row.controlledValues.length);
  return {
    total: rows.length,
    required: required.length,
    controlled: controlled.length,
    intakeRequired: intakeRequired.length,
    privateInternals: privateInternals.length
  };
}

export function metadataValue(value: unknown): string {
  if (Array.isArray(value)) return value.filter(Boolean).join(", ") || "Not provided";
  if (value === null || value === undefined || value === "") return "Not provided";
  return String(value);
}

function roleCanSeePrivateAssetRecordFields(role: DemoRole) {
  return role === "DAM Admin";
}

function roleCanSeeOperationalAssetRecordFields(role: DemoRole) {
  return role === "Reviewer" || roleCanSeePrivateAssetRecordFields(role);
}

function pendingSyncLabel(asset: StockMediaAsset, role: DemoRole) {
  if (!asset.pendingReviewWrite) return "None";
  const state = asset.pendingReviewWrite.syncState.replace(/_/g, " ");
  if (roleCanSeeOperationalAssetRecordFields(role)) return `${state}${asset.pendingReviewWrite.id ? ` (${asset.pendingReviewWrite.id})` : ""}`;
  return "Pending reviewer sync";
}

function lifecycleDate(asset: StockMediaAsset) {
  return asset.approvalRecheckDate || asset.expirationOrRecheckDate || asset.rightsExpirationDate || asset.consentExpirationDate || asset.expirationDate || "";
}

function renditionValue(available: boolean, fallback: string) {
  return available ? "Available" : fallback;
}

function generatedFilename(value: unknown, fallback = "Not generated") {
  const text = metadataValue(value);
  return text === "Not provided" ? fallback : text;
}

function roleSafeDamFilename(asset: StockMediaAsset, role: DemoRole) {
  return asset.damFilenames?.web ||
    asset.damFilenames?.thumb ||
    asset.damFilenames?.social ||
    asset.damFilenames?.print ||
    (roleCanSeePrivateAssetRecordFields(role) ? asset.damFilenames?.original : undefined);
}

export function assetKeywordText(asset: StockMediaAsset) {
  return metadataValue([...(asset.tags || []), ...(asset.tjcTerms || [])]);
}

export function assetRecordOverviewRows(asset: StockMediaAsset, role: DemoRole, source?: MediaSourceStatus | null): MetadataRow[] {
  return [
    [recordIdLabel(source), metadataValue(assetRecordRef(asset))],
    ["Status", metadataValue(asset.status)],
    ["Media type", assetType(asset)],
    ["Collection", metadataValue(asset.collection)],
    ["Event", metadataValue(asset.eventName || asset.eventSeries)],
    ["Capture date", metadataValue(asset.capturedDate || asset.eventDate)],
    ["Dimensions", metadataValue(asset.imageDimensions)],
    ["File size", formatBytes(asset.fileSizeBytes)],
    ["DAM filename", generatedFilename(asset.damFilenames?.web || asset.damFilenames?.thumb)],
    ["Keywords", assetKeywordText(asset)],
    ...(roleCanSeeOperationalAssetRecordFields(role) ? [["Workflow", metadataValue(asset.workflowState)]] as MetadataRow[] : [])
  ];
}

export function assetRecordRightsRows(asset: StockMediaAsset, role: DemoRole): MetadataRow[] {
  return [
    ["Usage scope", metadataValue(asset.usageScope)],
    ["Rights status", metadataValue(asset.rightsStatus)],
    ["Rights basis", roleCanSeeOperationalAssetRecordFields(role) ? metadataValue(asset.rightsBasis) : "Reviewer controlled"],
    ["Consent", metadataValue(asset.consentStatus)],
    ["People/minors", metadataValue(asset.peopleRisk)],
    ["Approved channels", metadataValue(asset.approvedChannels)],
    ["Required notice", metadataValue(asset.requiredNotice)],
    ["Reviewer", roleCanSeeOperationalAssetRecordFields(role) ? metadataValue(asset.reviewer) : asset.reviewer ? "Recorded" : "Not provided"],
    ["Review date", roleCanSeeOperationalAssetRecordFields(role) ? metadataValue(asset.reviewedDate) : asset.reviewedDate ? "Recorded" : "Not provided"],
    ["Reviewer note", roleCanSeeOperationalAssetRecordFields(role) ? metadataValue(asset.rightsNotes) : "Restricted to reviewer roles"]
  ];
}

export function assetRecordRenditionRows(asset: StockMediaAsset, role: DemoRole): AssetRecordRow[] {
  const mediaType = asset.mediaType;
  const approvedDownloadAvailable = Boolean(asset.imageUrls?.download) && (asset.downloadPolicy === "approved-copy-allowed" || asset.downloadPolicy === "internal-approved-copy-allowed");
  const rows: AssetRecordRow[] = [
    {
      id: "original",
      label: "Original",
      value: "Restricted",
      detail: roleCanSeePrivateAssetRecordFields(role)
        ? "Admin can inspect source metadata; delivery remains request-only."
        : "Source/original delivery is not exposed in this record view.",
      filename: roleCanSeePrivateAssetRecordFields(role) ? asset.damFilenames?.original : undefined,
      tone: "restricted"
    },
    {
      id: "thumb",
      label: "Thumb",
      value: renditionValue(Boolean(asset.thumbnail || asset.imageUrls?.small || asset.imageUrls?.card), "Missing"),
      detail: "Role-safe browse derivative.",
      filename: asset.damFilenames?.thumb,
      tone: asset.thumbnail || asset.imageUrls?.small || asset.imageUrls?.card ? "ready" : "review"
    },
    {
      id: "web",
      label: "Web",
      value: approvedDownloadAvailable ? "Gate required" : asset.imageUrls?.detail ? "Preview only" : "Not generated",
      detail: approvedDownloadAvailable ? "Approved-copy ticket gate still required." : "Reviewer or rendition work needed before download.",
      filename: asset.damFilenames?.web,
      tone: approvedDownloadAvailable ? "pending" : "review"
    },
    {
      id: "social",
      label: "Social",
      value: mediaType === "photo" || mediaType === "graphic" ? generatedFilename(asset.damFilenames?.social, "Not generated") : "Placeholder",
      detail: mediaType === "video" || mediaType === "audio" ? "Channel derivative placeholder for future transcode/crop work." : "Social crop slot; not a rights decision.",
      filename: asset.damFilenames?.social,
      tone: asset.damFilenames?.social ? "info" : "review"
    },
    {
      id: "print",
      label: "Print",
      value: mediaType === "photo" || mediaType === "graphic" || mediaType === "document" ? generatedFilename(asset.damFilenames?.print, "Request") : "Placeholder",
      detail: "Print-approved derivative requires review and approved-copy delivery path.",
      filename: asset.damFilenames?.print,
      tone: asset.damFilenames?.print ? "info" : "review"
    }
  ];

  if (mediaType === "video") {
    rows.push({
      id: "video-placeholder",
      label: "Video/audio",
      value: "Transcode placeholder",
      detail: "Low-res preview, captions, and stream/download variants are not live writes in this prototype.",
      tone: "pending"
    });
  }

  if (mediaType === "audio") {
    rows.push({
      id: "audio-placeholder",
      label: "Video/audio",
      value: "Audio placeholder",
      detail: "Waveform, preview MP3, and approved audio copy are future rendition states.",
      tone: "pending"
    });
  }

  return rows;
}

export function assetRecordVersionRows(asset: StockMediaAsset, role: DemoRole, source?: MediaSourceStatus | null): AssetRecordRow[] {
  const canSeePrivate = roleCanSeePrivateAssetRecordFields(role);
  const canSeeOperational = roleCanSeeOperationalAssetRecordFields(role);
  const rows: AssetRecordRow[] = [
    {
      id: "record-ref",
      label: "Record reference",
      value: assetRecordRef(asset),
      detail: recordIdLabel(source),
      tone: "info"
    },
    {
      id: "original-file",
      label: "Original filename",
      value: canSeePrivate ? metadataValue(asset.originalFilename) : "Restricted",
      detail: canSeePrivate ? "Admin-only source filename reference." : "Hidden from non-admin roles.",
      tone: canSeePrivate && asset.originalFilename ? "info" : "restricted"
    },
    {
      id: "generated-web",
      label: "Generated web filename",
      value: generatedFilename(asset.damFilenames?.web),
      detail: "Derivative filename generated from record metadata.",
      tone: asset.damFilenames?.web ? "ready" : "review"
    },
    {
      id: "generated-social",
      label: "Generated social filename",
      value: generatedFilename(asset.damFilenames?.social),
      detail: "Reserved derivative filename. Does not create copy.",
      tone: asset.damFilenames?.social ? "info" : "review"
    },
    {
      id: "generated-print",
      label: "Generated print filename",
      value: generatedFilename(asset.damFilenames?.print),
      detail: "Reserved derivative filename. Does not create copy.",
      tone: asset.damFilenames?.print ? "info" : "review"
    },
    {
      id: "duplicate-role",
      label: "Duplicate role",
      value: canSeePrivate ? metadataValue(asset.duplicateRole) : "Restricted",
      detail: canSeePrivate ? "Admin-only duplicate cleanup metadata." : "Duplicate grouping hidden from non-admin roles.",
      tone: canSeePrivate && asset.duplicateRole ? "pending" : "restricted"
    },
    {
      id: "duplicate-group",
      label: "Duplicate group",
      value: canSeePrivate ? metadataValue(asset.duplicateGroup) : "Restricted",
      detail: canSeePrivate ? "Preserve source album membership while resolving canonical role." : "Duplicate group hidden from non-admin roles.",
      tone: canSeePrivate && asset.duplicateGroup ? "pending" : "restricted"
    },
    {
      id: "pending-sync",
      label: "Pending replacement/sync",
      value: pendingSyncLabel(asset, role),
      detail: canSeeOperational ? "No live version writes from this page." : "Reviewer/admin workflow only.",
      tone: asset.pendingReviewWrite ? "pending" : "info"
    }
  ];
  return rows;
}

export function assetRecordActivityRows(asset: StockMediaAsset, role: DemoRole): AssetRecordRow[] {
  const canSeeOperational = roleCanSeeOperationalAssetRecordFields(role);
  return [
    {
      id: "indexed",
      label: "Imported / indexed",
      value: metadataValue(asset.importDate || asset.capturedDate || asset.eventDate),
      detail: metadataValue(asset.collection || asset.eventName),
      tone: "info"
    },
    {
      id: "review",
      label: "Review",
      value: asset.reviewer && asset.reviewedDate
        ? canSeeOperational ? `${asset.reviewer} / ${asset.reviewedDate}` : "Reviewer recorded"
        : "Review pending",
      detail: canSeeOperational ? metadataValue(asset.rightsNotes || asset.workflowState) : "Reviewer notes restricted.",
      tone: asset.reviewer && asset.reviewedDate ? "ready" : "review"
    },
    {
      id: "rights",
      label: "Rights decision",
      value: metadataValue(asset.rightsStatus || asset.usageScope),
      detail: metadataValue(asset.requiredNotice || asset.consentStatus),
      tone: asset.status === "Approved Public" || asset.status === "Approved Internal" ? "ready" : "review"
    },
    {
      id: "lifecycle",
      label: "Lifecycle / recheck",
      value: metadataValue(lifecycleDate(asset)),
      detail: metadataValue(asset.withdrawalStatus || asset.embargoDate || "No lifecycle exception recorded"),
      tone: lifecycleDate(asset) || asset.withdrawalStatus || asset.embargoDate ? "pending" : "info"
    },
    {
      id: "sync",
      label: "Pending sync",
      value: pendingSyncLabel(asset, role),
      detail: "Replacement/version writes are not live from this record.",
      tone: asset.pendingReviewWrite ? "pending" : "info"
    }
  ];
}

export function inspectorMetadataRows({
  asset,
  tab,
  source,
  role = "Viewer"
}: {
  asset: StockMediaAsset;
  tab: string;
  source?: MediaSourceStatus | null;
  role?: DemoRole;
}): MetadataRow[] {
  if (tab === "Rights") {
    return [
      ["Approval status", metadataValue(asset.status)],
      ["Usage scope", metadataValue(asset.usageScope)],
      ["Rights status", metadataValue(asset.rightsStatus)],
      ["Consent status", metadataValue(asset.consentStatus)],
      ["People/minors", metadataValue(asset.peopleRisk)],
      ["Policy", metadataValue(asset.downloadPolicy)]
    ];
  }

  if (tab === "Renditions") {
    return [
      ["Original", "Restricted source/master"],
      ["Thumbnail", asset.thumbnail ? "Available preview derivative" : "Missing preview derivative"],
      ["Web copy", asset.imageUrls?.download || asset.imageUrls?.detail ? "Available after approval gate" : "Not generated"],
      ["Social crop", asset.damFilenames?.social ? "Filename reserved" : "Request"],
      ["Print", asset.damFilenames?.print ? "Filename reserved" : "Restricted / request"]
    ];
  }

  if (tab === "Versions") {
    const canSeePrivate = roleCanSeePrivateAssetRecordFields(role);
    return [
      ["Source original", canSeePrivate ? metadataValue(asset.originalFilename || "Not provided") : "Restricted source/master"],
      ["Web derivative", metadataValue(asset.damFilenames?.web || "Not generated")],
      ["Social derivative", metadataValue(asset.damFilenames?.social || "Not generated")],
      ["Duplicate group", canSeePrivate ? metadataValue(asset.duplicateGroup) : "Restricted"],
      [recordIdLabel(source), metadataValue(assetRecordRef(asset))]
    ];
  }

  if (tab === "Activity") {
    return [
      ["Reviewer", metadataValue(asset.reviewer)],
      ["Reviewed date", metadataValue(asset.reviewedDate)],
      ["Pending sync", asset.pendingReviewWrite ? "Pending ResourceSpace write" : "None"]
    ];
  }

  if (tab === "Metadata") {
    return [
      [recordIdLabel(source), metadataValue(assetRecordRef(asset))],
      ["File type", assetType(asset)],
      ["Dimensions", metadataValue(asset.imageDimensions)],
      ["File size", formatBytes(asset.fileSizeBytes)],
      ["Capture date", metadataValue(asset.capturedDate)],
      ["Import date", metadataValue(asset.importDate)],
      ["Collection", metadataValue(asset.collection)],
      ["Event", metadataValue(asset.eventName)],
      ["DAM filename", metadataValue(roleSafeDamFilename(asset, role))],
      ["Keywords", assetKeywordText(asset)]
    ];
  }

  return [
    [recordIdLabel(source), metadataValue(assetRecordRef(asset))],
    ["File type", assetType(asset)],
    ["Collection", metadataValue(asset.collection)],
    ["Status", metadataValue(asset.status)],
    ["Usage", metadataValue(asset.usageScope)],
    ["People/minors", metadataValue(asset.peopleRisk)],
    ["Rights", metadataValue(asset.rightsStatus)],
    ["Reviewer", metadataValue(asset.reviewer)]
  ];
}

export function assetDetailMetadataRows(asset: StockMediaAsset, role: DemoRole): MetadataRow[] {
  return [
    ["Title", metadataValue(asset.title)],
    ["Description", metadataValue(asset.usageGuidance)],
    ["Creator", role === "DAM Admin" ? metadataValue(asset.sourceAccount) : "Media team"],
    ["Capture Date", metadataValue(asset.capturedDate)],
    ["Collection", metadataValue(asset.collection)],
    ["Categories", metadataValue(asset.tjcTerms)],
    ["Keywords", metadataValue(asset.tags)],
    ["Asset ID", metadataValue(assetRecordRef(asset))],
    ["DAM Filename", metadataValue(roleSafeDamFilename(asset, role))],
    ["File Type", assetType(asset)],
    ["Dimensions", metadataValue(asset.imageDimensions)],
    ["File Size", formatBytes(asset.fileSizeBytes)],
    ["Uploaded", metadataValue(asset.importDate)],
    ["Uploaded By", role === "DAM Admin" ? metadataValue(asset.sourceAccount) : "Media team"],
    ["Source", role === "DAM Admin" ? metadataValue(asset.sourceSystem) : "DAM record"],
    ...(role === "DAM Admin"
      ? [
          ["Checksum", metadataValue(asset.checksumSha256)] as MetadataRow,
          ["Original filename", metadataValue(asset.originalFilename)] as MetadataRow
        ]
      : [])
  ];
}

export function rightsRestrictionRows(asset: StockMediaAsset): MetadataRow[] {
  return [
    ["Approval status", metadataValue(asset.status)],
    ["Usage", metadataValue(asset.usageScope)],
    ["Rights status", metadataValue(asset.rightsStatus)],
    ["Consent", metadataValue(asset.consentStatus)],
    ["People/minors", metadataValue(asset.peopleRisk)],
    ["Restrictions", metadataValue(asset.reuseDecision?.summary)]
  ];
}

export function reviewMetadataRows({
  asset,
  pendingAction
}: {
  asset: StockMediaAsset;
  pendingAction?: string;
}): MetadataRow[] {
  return [
    ["Title", metadataValue(asset.title)],
    ["Review summary", metadataValue(asset.reuseDecision?.summary || "Needs reviewer decision.")],
    ["Pending sync", pendingAction || "None"],
    ["Source", metadataValue(asset.sourceSystem)],
    ["Capture Date", metadataValue(asset.capturedDate)],
    ["Collection", metadataValue(asset.collection)],
    ["Asset ID", metadataValue(assetRecordRef(asset))],
    ["DAM Filename", metadataValue(asset.damFilenames?.web || asset.damFilenames?.thumb || asset.damFilenames?.social || asset.damFilenames?.print)],
    ["File Type", assetType(asset)],
    ["Dimensions", metadataValue(asset.imageDimensions)],
    ["File Size", formatBytes(asset.fileSizeBytes)],
    ["Uploaded By", "Media team"]
  ];
}

export function reviewEvidenceRows({
  asset,
  currentStatus,
  pendingStatus
}: {
  asset: StockMediaAsset;
  currentStatus: string;
  pendingStatus?: string;
}): MetadataRow[] {
  return [
    ["ResourceSpace ID", metadataValue(assetRecordRef(asset))],
    ["Assigned to", "Reviewer queue"],
    ["Policy", metadataValue(asset.downloadPolicy)],
    ["Record source", "DAM record"],
    ["Current ResourceSpace status", currentStatus],
    ["Portal pending decision", pendingStatus || "None"]
  ];
}
