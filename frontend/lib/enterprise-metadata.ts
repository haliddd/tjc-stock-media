import { assetRecordRef, assetType, formatBytes, recordIdLabel } from "@/lib/enterprise-display";
import { resourceSpaceGovernanceFactForKey } from "@/lib/resourcespace-schema";
import type { DemoRole, MediaSourceStatus, StockMediaAsset } from "@/lib/types";

export type MetadataRow = [string, string | number];

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

export function assetKeywordText(asset: StockMediaAsset) {
  return metadataValue([...(asset.tags || []), ...(asset.tjcTerms || [])]);
}

export function inspectorMetadataRows({
  asset,
  tab,
  source
}: {
  asset: StockMediaAsset;
  tab: string;
  source?: MediaSourceStatus | null;
}): MetadataRow[] {
  if (tab === "Rights & restrictions") {
    return [
      ["Approval status", metadataValue(asset.status)],
      ["Usage scope", metadataValue(asset.usageScope)],
      ["Rights status", metadataValue(asset.rightsStatus)],
      ["Consent status", metadataValue(asset.consentStatus)],
      ["People/minors", metadataValue(asset.peopleRisk)],
      ["Policy", metadataValue(asset.downloadPolicy)]
    ];
  }

  if (tab === "Versions") {
    return [
      ["Versions", "Not provided by current ResourceSpace export"],
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

  return [
    [recordIdLabel(source), metadataValue(assetRecordRef(asset))],
    ["File type", assetType(asset)],
    ["Dimensions", metadataValue(asset.imageDimensions)],
    ["File size", formatBytes(asset.fileSizeBytes)],
    ["Created by", "Media team"],
    ["Capture date", metadataValue(asset.capturedDate)],
    ["Collection", metadataValue(asset.collection)],
    ["DAM filename", metadataValue(asset.damFilenames?.web || asset.damFilenames?.original)],
    ["Keywords", assetKeywordText(asset)]
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
    ["DAM Filename", metadataValue(asset.damFilenames?.web || asset.damFilenames?.original)],
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
    ["DAM Filename", metadataValue(asset.damFilenames?.web || asset.damFilenames?.original)],
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
