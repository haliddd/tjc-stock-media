import type { LucideIcon } from "lucide-react";
import {
  Archive,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Clock3,
  FileArchive,
  FileCheck2,
  FileClock,
  FileLock2,
  FileText,
  ShieldAlert
} from "lucide-react";

export type ReviewState = "draft" | "submitted" | "needs_evidence" | "in_review" | "approved" | "rejected" | "escalated";
export type ApprovalScope = "none" | "internal" | "public" | "restricted";
export type DerivativeState = "missing" | "generating" | "available" | "expired" | "blocked";
export type SourceAccessState = "restricted" | "requested" | "approved" | "denied";
export type EvidenceState = "missing" | "needs_review" | "complete" | "expiring" | "expired" | "blocked";
export type PortalState = "hidden" | "internal_only" | "portal_ready" | "archived";
export type DistributionState = "not_ready" | "ready" | "blocked" | "exported";

export type DisplayStatus =
  | "Draft"
  | "Submitted"
  | "Needs Evidence"
  | "In Review"
  | "Approved Internal"
  | "Portal Ready"
  | "Restricted"
  | "Blocked"
  | "Expiring Soon"
  | "Expired"
  | "Archived";

export type CanonicalStatus = DisplayStatus;
export type DamAssetType = "Image" | "Video" | "Audio" | "Graphic" | "Document";
export type UsageScope = "Website" | "Social" | "Newsletter" | "Slides" | "Print" | "Internal training" | "Public external use" | "Archive only" | "Not for distribution";
export type VisibilityAnswer = "yes" | "no" | "unknown";
export type EvidenceItemState = "Complete" | "Needs review" | "Missing" | "Blocked" | "Expiring" | "Expired" | "Not generated";

export type EvidenceItem = {
  requirement: string;
  state: EvidenceItemState;
  owner: string;
  blocking: boolean;
  action: string;
  detail?: string;
};

export type AuditEvent = {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  objectType: string;
  objectId: string;
  result?: string;
  notes?: string;
};

export type DamAsset = {
  id: string;
  title: string;
  type: DamAssetType;
  thumbnailUrl?: string;
  collectionIds: string[];
  ministry: string;
  event?: string;
  owner?: string;
  creator?: string;
  captureDate?: string;
  location?: string;
  description?: string;
  tags: string[];
  language?: string;
  reviewState: ReviewState;
  approvalScope: ApprovalScope;
  derivativeState: DerivativeState;
  sourceAccessState: SourceAccessState;
  evidenceState: EvidenceState;
  portalState: PortalState;
  displayStatus: DisplayStatus;
  usageScopes: UsageScope[];
  peopleVisible: VisibilityAnswer;
  minorsVisible: VisibilityAnswer;
  expiryDate?: string;
  rightsSummary: string;
  blockerCount: number;
  blockers: string[];
  approvedDerivativeUrl?: string;
  approvedDerivativeLabel?: string;
  sourceFileRef?: string;
  evidence: EvidenceItem[];
  auditEvents: AuditEvent[];
};

export type DamCollection = {
  id: string;
  name: string;
  ministry: string;
  useCase: string;
  description?: string;
  owner: string;
  assetIds: string[];
  readyCount: number;
  needsEvidenceCount: number;
  blockedCount: number;
  lastUpdated: string;
};

export type DistributionSection = {
  id: string;
  name: string;
  required: number;
  assetIds: string[];
};

export type GovernanceRecord = {
  id: string;
  name: string;
  status: DisplayStatus;
  owner: string;
  updated: string;
  detail: string;
};

export type PermissionCapability =
  | "Search Library"
  | "View approved derivative"
  | "Download approved derivative"
  | "View restricted source file"
  | "Request source access"
  | "Upload assets"
  | "Edit submitted metadata"
  | "Attach rights evidence"
  | "Approve internal use"
  | "Approve public use"
  | "Restrict or reject asset"
  | "Create collection"
  | "Edit policy"
  | "View full audit log";

export const permissionMatrix: Array<{
  capability: PermissionCapability;
  Viewer: string;
  Contributor: string;
  Reviewer: string;
  "DAM Admin": string;
}> = [
  { capability: "Search Library", Viewer: "Yes", Contributor: "Yes", Reviewer: "Yes", "DAM Admin": "Yes" },
  { capability: "View approved derivative", Viewer: "Scoped", Contributor: "Scoped", Reviewer: "Yes", "DAM Admin": "Yes" },
  { capability: "Download approved derivative", Viewer: "Scoped", Contributor: "Scoped", Reviewer: "Yes", "DAM Admin": "Yes" },
  { capability: "View restricted source file", Viewer: "No", Contributor: "No by default", Reviewer: "Scoped", "DAM Admin": "Yes, audited" },
  { capability: "Request source access", Viewer: "Yes", Contributor: "Yes", Reviewer: "Yes", "DAM Admin": "Yes" },
  { capability: "Upload assets", Viewer: "No", Contributor: "Yes", Reviewer: "Yes", "DAM Admin": "Yes" },
  { capability: "Edit submitted metadata", Viewer: "No", Contributor: "Own draft/submitted", Reviewer: "Yes", "DAM Admin": "Yes" },
  { capability: "Attach rights evidence", Viewer: "No", Contributor: "Yes", Reviewer: "Yes", "DAM Admin": "Yes" },
  { capability: "Approve internal use", Viewer: "No", Contributor: "No", Reviewer: "Yes", "DAM Admin": "Yes" },
  { capability: "Approve public use", Viewer: "No", Contributor: "No", Reviewer: "Yes", "DAM Admin": "Yes" },
  { capability: "Restrict or reject asset", Viewer: "No", Contributor: "No", Reviewer: "Yes", "DAM Admin": "Yes" },
  { capability: "Create collection", Viewer: "Scoped", Contributor: "Scoped", Reviewer: "Yes", "DAM Admin": "Yes" },
  { capability: "Edit policy", Viewer: "No", Contributor: "No", Reviewer: "No", "DAM Admin": "Yes" },
  { capability: "View full audit log", Viewer: "Limited", Contributor: "Own records only", Reviewer: "Review scope", "DAM Admin": "Yes" }
];

export const statusMeta: Record<DisplayStatus, {
  className: string;
  description: string;
  icon: LucideIcon;
}> = {
  Draft: { className: "is-draft", description: "Not submitted yet.", icon: FileText },
  Submitted: { className: "is-submitted", description: "Uploaded or requested and waiting for review.", icon: FileClock },
  "Needs Evidence": { className: "is-needs-evidence", description: "Required proof, license, release, owner, or consent evidence is missing.", icon: AlertTriangle },
  "In Review": { className: "is-in-review", description: "Assigned to reviewer and actively being evaluated.", icon: CircleDot },
  "Approved Internal": { className: "is-approved-internal", description: "Approved for internal ministry use only.", icon: FileLock2 },
  "Portal Ready": { className: "is-portal-ready", description: "Approved derivative is available for normal distribution.", icon: CheckCircle2 },
  Restricted: { className: "is-restricted", description: "Visible but source file, derivative, or use scope is limited.", icon: FileLock2 },
  Blocked: { className: "is-blocked", description: "Cannot be reused or downloaded until issue is resolved.", icon: ShieldAlert },
  "Expiring Soon": { className: "is-expiring-soon", description: "Rights, license, consent, or approval is nearing expiration.", icon: Clock3 },
  Expired: { className: "is-expired", description: "Approval or rights are no longer valid.", icon: AlertTriangle },
  Archived: { className: "is-archived", description: "Hidden from normal workflows but retained for audit/history.", icon: Archive }
};

export function deriveDisplayStatus(input: {
  reviewState: ReviewState;
  approvalScope: ApprovalScope;
  derivativeState: DerivativeState;
  evidenceState: EvidenceState;
  portalState: PortalState;
}): DisplayStatus {
  if (input.portalState === "archived") return "Archived";
  if (input.evidenceState === "expired" || input.derivativeState === "expired") return "Expired";
  if (input.evidenceState === "blocked" || input.derivativeState === "blocked" || input.reviewState === "rejected") return "Blocked";
  if (input.evidenceState === "expiring") return "Expiring Soon";
  if (input.reviewState === "needs_evidence" || input.evidenceState === "missing" || input.evidenceState === "needs_review") return "Needs Evidence";
  if (input.reviewState === "in_review" || input.reviewState === "escalated" || input.derivativeState === "generating") return "In Review";
  if (input.approvalScope === "public" && input.derivativeState === "available" && input.portalState === "portal_ready") return "Portal Ready";
  if (input.approvalScope === "internal" && input.derivativeState === "available") return "Approved Internal";
  if (input.approvalScope === "restricted") return "Restricted";
  if (input.reviewState === "submitted") return "Submitted";
  return "Draft";
}

function evidence(overrides: Partial<Record<string, EvidenceItemState>> = {}): EvidenceItem[] {
  const rows: EvidenceItem[] = [
    { requirement: "Owner/license evidence", state: "Complete", owner: "Rights reviewer", blocking: true, action: "Verify owner/license" },
    { requirement: "Copyright proof", state: "Complete", owner: "Rights reviewer", blocking: true, action: "Review copyright basis" },
    { requirement: "Attribution requirement", state: "Complete", owner: "DAM admin", blocking: false, action: "Record attribution" },
    { requirement: "Consent/release", state: "Complete", owner: "Contributor", blocking: true, action: "Attach release" },
    { requirement: "People/minors visibility", state: "Complete", owner: "Reviewer", blocking: true, action: "Confirm visibility" },
    { requirement: "Usage scope", state: "Complete", owner: "Policy engine", blocking: true, action: "Choose allowed channels" },
    { requirement: "Expiration date", state: "Complete", owner: "Policy engine", blocking: false, action: "Set recheck date" },
    { requirement: "Approved derivative", state: "Complete", owner: "DAM", blocking: true, action: "Generate approved derivative" },
    { requirement: "Source file restriction confirmed", state: "Complete", owner: "DAM admin", blocking: true, action: "Confirm source access gate" },
    { requirement: "Audit note", state: "Complete", owner: "Reviewer", blocking: false, action: "Add review note" }
  ];
  return rows.map((row) => {
    const state = overrides[row.requirement] || row.state;
    return {
      ...row,
      state,
      detail: state === "Complete"
        ? "Evidence available for current scope."
        : "Required before public use, export, or normal download."
    };
  });
}

function audit(assetId: string, action: string, result: string, notes: string): AuditEvent[] {
  return [
    { id: `${assetId}-audit-1`, timestamp: "2026-06-14 09:42", actor: "M. Lin", action, objectType: "Asset", objectId: assetId, result, notes },
    { id: `${assetId}-audit-2`, timestamp: "2026-06-13 16:20", actor: "System", action: "Policy check", objectType: "Derivative", objectId: assetId, result: "Recorded", notes: "Source file remains restricted. Approved derivative used for distribution." }
  ];
}

function createAsset(input: Omit<DamAsset, "displayStatus" | "blockerCount" | "blockers"> & { blockers?: string[] }): DamAsset {
  const displayStatus = deriveDisplayStatus(input);
  const evidenceBlockers = input.evidence.filter((item) => item.blocking && item.state !== "Complete").map((item) => item.requirement);
  const blockers = input.blockers || evidenceBlockers;
  return {
    ...input,
    displayStatus,
    blockerCount: blockers.length,
    blockers
  };
}

export const damAssets = [
  createAsset({
    id: "TJC-IMG-1001",
    title: "Sabbath Service Choir — 2025-03-15",
    type: "Image",
    thumbnailUrl: "https://picsum.photos/seed/tjc-sabbath-service-choir/720/480",
    collectionIds: ["sabbath"],
    ministry: "Worship",
    event: "Sabbath Service",
    owner: "TJC Media Team",
    creator: "Media volunteer",
    captureDate: "2025-03-15",
    location: "Main chapel",
    description: "Choir worship photograph cleared for website and slide usage.",
    tags: ["choir", "worship", "sabbath", "service"],
    language: "English",
    reviewState: "approved",
    approvalScope: "public",
    derivativeState: "available",
    sourceAccessState: "restricted",
    evidenceState: "complete",
    portalState: "portal_ready",
    usageScopes: ["Website", "Slides"],
    peopleVisible: "yes",
    minorsVisible: "no",
    expiryDate: "2027-03-15",
    rightsSummary: "Public use approved. Source restricted.",
    approvedDerivativeUrl: "/api/download/TJC-IMG-1001",
    approvedDerivativeLabel: "Web JPG 2400px",
    sourceFileRef: "GDrive master path restricted",
    evidence: evidence(),
    auditEvents: audit("TJC-IMG-1001", "Approve public derivative", "Portal Ready", "Reviewer approved public derivative for website and slides.")
  }),
  createAsset({
    id: "TJC-IMG-1002",
    title: "Youth Fellowship Group Photo",
    type: "Image",
    collectionIds: ["fellowship"],
    ministry: "Youth",
    event: "Youth Fellowship",
    owner: "Youth Ministry",
    creator: "Contributor upload",
    captureDate: "2025-08-03",
    description: "Group photo requires consent and minors review before reuse.",
    tags: ["youth", "fellowship", "people", "consent"],
    reviewState: "needs_evidence",
    approvalScope: "none",
    derivativeState: "missing",
    sourceAccessState: "restricted",
    evidenceState: "missing",
    portalState: "hidden",
    usageScopes: ["Internal training"],
    peopleVisible: "yes",
    minorsVisible: "unknown",
    rightsSummary: "Consent/release and minors visibility unresolved.",
    evidence: evidence({ "Consent/release": "Missing", "People/minors visibility": "Needs review", "Approved derivative": "Not generated" }),
    auditEvents: audit("TJC-IMG-1002", "Request evidence", "Needs Evidence", "Consent release and minors status required before public use.")
  }),
  createAsset({
    id: "TJC-VID-1003",
    title: "Hymn Practice Recording",
    type: "Video",
    thumbnailUrl: "https://picsum.photos/seed/tjc-hymn-practice-recording/720/480",
    collectionIds: ["teaching-study", "sabbath"],
    ministry: "Music",
    event: "Choir Practice",
    owner: "Music Ministry",
    creator: "Choir director",
    captureDate: "2025-11-19",
    description: "Internal-only hymn practice recording. Public channels require music-rights review.",
    tags: ["hymn", "music", "practice", "internal"],
    reviewState: "approved",
    approvalScope: "internal",
    derivativeState: "available",
    sourceAccessState: "restricted",
    evidenceState: "complete",
    portalState: "internal_only",
    usageScopes: ["Internal training"],
    peopleVisible: "no",
    minorsVisible: "no",
    expiryDate: "2026-10-01",
    rightsSummary: "Approved internal. Public use blocked until hymn rights cleared.",
    approvedDerivativeUrl: "/api/download/TJC-VID-1003",
    approvedDerivativeLabel: "Internal MP4 preview",
    evidence: evidence({ "Usage scope": "Needs review" }),
    auditEvents: audit("TJC-VID-1003", "Approve internal only", "Approved Internal", "Internal training approved. Public/social use blocked.")
  }),
  createAsset({
    id: "TJC-IMG-1004",
    title: "Bible Study Slide Background",
    type: "Image",
    thumbnailUrl: "https://picsum.photos/seed/tjc-bible-study-slide-background/720/480",
    collectionIds: ["web-slides", "teaching-study"],
    ministry: "Religious Education",
    event: "Bible Study",
    owner: "Design Team",
    creator: "Internet Ministry design",
    captureDate: "2026-02-02",
    description: "Approved teaching background for slides and newsletter use.",
    tags: ["bible", "study", "slides", "background"],
    reviewState: "approved",
    approvalScope: "public",
    derivativeState: "available",
    sourceAccessState: "restricted",
    evidenceState: "complete",
    portalState: "portal_ready",
    usageScopes: ["Slides", "Newsletter"],
    peopleVisible: "no",
    minorsVisible: "no",
    expiryDate: "2028-01-01",
    rightsSummary: "Owner verified. Approved derivative available.",
    approvedDerivativeUrl: "/api/download/TJC-IMG-1004",
    approvedDerivativeLabel: "PNG 1920x1080",
    evidence: evidence(),
    auditEvents: audit("TJC-IMG-1004", "Approve public derivative", "Portal Ready", "Design ownership and derivative confirmed.")
  }),
  createAsset({
    id: "TJC-IMG-1005",
    title: "Church Exterior Evening",
    type: "Image",
    thumbnailUrl: "https://picsum.photos/seed/tjc-church-exterior-evening/720/480",
    collectionIds: ["web-slides", "welcome-team"],
    ministry: "Welcome",
    event: "Exterior photography",
    owner: "TJC Media Team",
    creator: "Media volunteer",
    captureDate: "2024-12-05",
    description: "Exterior photo cleared for website with upcoming license recheck.",
    tags: ["church", "exterior", "welcome", "evening"],
    reviewState: "approved",
    approvalScope: "public",
    derivativeState: "available",
    sourceAccessState: "restricted",
    evidenceState: "complete",
    portalState: "portal_ready",
    usageScopes: ["Website"],
    peopleVisible: "no",
    minorsVisible: "no",
    expiryDate: "2027-07-20",
    rightsSummary: "Website derivative available.",
    approvedDerivativeUrl: "/api/download/TJC-IMG-1005",
    approvedDerivativeLabel: "Web JPG 1800px",
    evidence: evidence(),
    auditEvents: audit("TJC-IMG-1005", "Approve public derivative", "Portal Ready", "Website derivative approved.")
  }),
  createAsset({
    id: "TJC-IMG-1006",
    title: "Sermon Speaker Portrait",
    type: "Image",
    thumbnailUrl: "https://picsum.photos/seed/tjc-sermon-speaker-portrait/720/480",
    collectionIds: ["teaching-study"],
    ministry: "Sermon",
    event: "Sermon",
    owner: "Sermon Team",
    creator: "Contributor upload",
    captureDate: "2026-05-05",
    description: "Speaker portrait in active review for website use.",
    tags: ["sermon", "speaker", "portrait"],
    reviewState: "in_review",
    approvalScope: "none",
    derivativeState: "generating",
    sourceAccessState: "restricted",
    evidenceState: "needs_review",
    portalState: "hidden",
    usageScopes: ["Website"],
    peopleVisible: "yes",
    minorsVisible: "no",
    rightsSummary: "Reviewer assigned. Derivative pending.",
    evidence: evidence({ "Approved derivative": "Not generated", "Audit note": "Needs review" }),
    auditEvents: audit("TJC-IMG-1006", "Assign reviewer", "In Review", "Reviewer assigned for public derivative decision.")
  }),
  createAsset({
    id: "TJC-PDF-1007",
    title: "Baptism Service Program Graphic",
    type: "Document",
    thumbnailUrl: "https://picsum.photos/seed/tjc-baptism-service-program/720/480",
    collectionIds: ["seasonal-details"],
    ministry: "Sacrament",
    event: "Baptism Service",
    owner: "Design Team",
    creator: "Design Team",
    captureDate: "2026-04-19",
    description: "Sacrament-related graphic requires doctrine review before print distribution.",
    tags: ["baptism", "program", "sacrament", "graphic"],
    reviewState: "in_review",
    approvalScope: "restricted",
    derivativeState: "blocked",
    sourceAccessState: "restricted",
    evidenceState: "needs_review",
    portalState: "hidden",
    usageScopes: ["Print"],
    peopleVisible: "no",
    minorsVisible: "no",
    rightsSummary: "Doctrine context review required.",
    evidence: evidence({ "Usage scope": "Blocked", "Approved derivative": "Blocked" }),
    auditEvents: audit("TJC-PDF-1007", "Restrict use", "Restricted", "Sacrament media requires doctrine review before public release.")
  }),
  createAsset({
    id: "TJC-IMG-1008",
    title: "Fellowship Lunch Photos",
    type: "Image",
    thumbnailUrl: "https://picsum.photos/seed/tjc-fellowship-lunch-photos/720/480",
    collectionIds: ["fellowship"],
    ministry: "Fellowship",
    event: "Fellowship Lunch",
    owner: "Fellowship Team",
    creator: "Contributor upload",
    captureDate: "2025-10-12",
    description: "People consent evidence needed before broader reuse.",
    tags: ["fellowship", "lunch", "members"],
    reviewState: "needs_evidence",
    approvalScope: "none",
    derivativeState: "missing",
    sourceAccessState: "restricted",
    evidenceState: "missing",
    portalState: "hidden",
    usageScopes: ["Internal training"],
    peopleVisible: "yes",
    minorsVisible: "unknown",
    rightsSummary: "People consent evidence missing.",
    evidence: evidence({ "Consent/release": "Missing", "People/minors visibility": "Needs review", "Approved derivative": "Not generated" }),
    auditEvents: audit("TJC-IMG-1008", "Request evidence", "Needs Evidence", "People consent evidence required before reuse.")
  }),
  createAsset({
    id: "TJC-IMG-1009",
    title: "Summer Camp Group Photo",
    type: "Image",
    thumbnailUrl: "https://picsum.photos/seed/tjc-summer-camp-group-photo/720/480",
    collectionIds: ["fellowship"],
    ministry: "Youth",
    event: "Summer Camp",
    owner: "Religious Education",
    creator: "Camp media volunteer",
    captureDate: "2025-07-22",
    description: "Youth camp group photo blocked until minors consent is attached.",
    tags: ["summer camp", "youth", "group", "consent"],
    reviewState: "rejected",
    approvalScope: "restricted",
    derivativeState: "blocked",
    sourceAccessState: "restricted",
    evidenceState: "blocked",
    portalState: "hidden",
    usageScopes: ["Not for distribution"],
    peopleVisible: "yes",
    minorsVisible: "yes",
    rightsSummary: "Minor consent missing. Download/export blocked.",
    evidence: evidence({ "Consent/release": "Blocked", "People/minors visibility": "Blocked", "Approved derivative": "Blocked" }),
    auditEvents: audit("TJC-IMG-1009", "Block public use", "Blocked", "Minor consent evidence required before any reuse.")
  }),
  createAsset({
    id: "TJC-IMG-1010",
    title: "Newsletter Header — Spring Evangelical Service",
    type: "Image",
    thumbnailUrl: "https://picsum.photos/seed/tjc-spring-evangelical-service-header/720/480",
    collectionIds: ["web-slides"],
    ministry: "Evangelism",
    event: "Spring Evangelical Service",
    owner: "Internet Ministry",
    creator: "Internet Ministry design",
    captureDate: "2026-03-22",
    description: "Header graphic cleared for newsletter distribution.",
    tags: ["newsletter", "evangelical service", "spring", "web"],
    reviewState: "approved",
    approvalScope: "public",
    derivativeState: "available",
    sourceAccessState: "restricted",
    evidenceState: "complete",
    portalState: "portal_ready",
    usageScopes: ["Newsletter"],
    peopleVisible: "no",
    minorsVisible: "no",
    expiryDate: "2027-06-01",
    rightsSummary: "Owner verified. Newsletter derivative ready.",
    approvedDerivativeUrl: "/api/download/TJC-IMG-1010",
    approvedDerivativeLabel: "Web PNG 2400px",
    evidence: evidence(),
    auditEvents: audit("TJC-IMG-1010", "Approve public derivative", "Portal Ready", "Approved derivative and newsletter scope recorded.")
  }),
  createAsset({
    id: "TJC-VID-1011",
    title: "Testimony Recording Clip",
    type: "Video",
    thumbnailUrl: "https://picsum.photos/seed/tjc-testimony-recording-clip/720/480",
    collectionIds: ["teaching-study"],
    ministry: "Pastoral",
    event: "Testimony Sharing",
    owner: "Pastoral Team",
    creator: "Media team",
    captureDate: "2025-09-09",
    description: "Sensitive testimony clip. Internal-only review and pastoral approval required.",
    tags: ["testimony", "recording", "sensitive", "internal"],
    reviewState: "in_review",
    approvalScope: "restricted",
    derivativeState: "missing",
    sourceAccessState: "restricted",
    evidenceState: "needs_review",
    portalState: "hidden",
    usageScopes: ["Internal training"],
    peopleVisible: "yes",
    minorsVisible: "unknown",
    rightsSummary: "Pastoral sensitivity review required. Internal-only until approved.",
    evidence: evidence({ "Consent/release": "Needs review", "People/minors visibility": "Needs review", "Approved derivative": "Not generated" }),
    auditEvents: audit("TJC-VID-1011", "Escalate", "In Review", "Pastoral sensitivity review required.")
  }),
  createAsset({
    id: "TJC-AUD-1012",
    title: "Choir Hymn Audio Reference",
    type: "Audio",
    thumbnailUrl: "https://picsum.photos/seed/tjc-choir-hymn-audio-reference/720/480",
    collectionIds: ["sabbath"],
    ministry: "Music",
    event: "Choir reference",
    owner: "Music Ministry",
    creator: "Choir director",
    captureDate: "2025-12-14",
    description: "Internal hymn audio reference with license recheck approaching.",
    tags: ["choir", "hymn", "audio", "reference"],
    reviewState: "approved",
    approvalScope: "internal",
    derivativeState: "available",
    sourceAccessState: "restricted",
    evidenceState: "expiring",
    portalState: "internal_only",
    usageScopes: ["Internal training"],
    peopleVisible: "no",
    minorsVisible: "no",
    expiryDate: "2026-07-20",
    rightsSummary: "Internal use allowed. Hymn license expires soon.",
    approvedDerivativeUrl: "/api/download/TJC-AUD-1012",
    approvedDerivativeLabel: "Internal MP3",
    evidence: evidence({ "Expiration date": "Expiring" }),
    auditEvents: audit("TJC-AUD-1012", "Expiration warning", "Expiring Soon", "Hymn license recheck due soon.")
  })
] satisfies Array<DamAsset & { blockers: string[] }>;

export const damCollections: DamCollection[] = [
  collection("sabbath", "Sabbath", "Worship", "Worship service, hymn, and Sabbath media", "Worship Media", ["TJC-IMG-1001", "TJC-VID-1003", "TJC-AUD-1012"]),
  collection("teaching-study", "Teaching & Study", "Religious Education", "Sermons, Bible study, testimony, and classroom material", "Religious Education", ["TJC-IMG-1004", "TJC-IMG-1006", "TJC-VID-1011"]),
  collection("seasonal-details", "Seasonal Details", "Media Team", "Event details, programs, and seasonal material", "DAM Admin", ["TJC-PDF-1007"]),
  collection("welcome-team", "Welcome Team", "Welcome", "Welcome pages and first-visit visuals", "Welcome Team", ["TJC-IMG-1005"]),
  collection("fellowship", "Fellowship", "Fellowship", "Community and member ministry communication", "Fellowship Team", ["TJC-IMG-1002", "TJC-IMG-1008", "TJC-IMG-1009"]),
  collection("web-slides", "Web & Slides", "Internet Ministry", "Web, newsletter, social, and slide-ready graphics", "Internet Ministry", ["TJC-IMG-1004", "TJC-IMG-1005", "TJC-IMG-1010"])
];

function collection(id: string, name: string, ministry: string, useCase: string, owner: string, assetIds: string[]): DamCollection {
  const assets = assetIds.map(assetById).filter((asset): asset is DamAsset => Boolean(asset));
  return {
    id,
    name,
    ministry,
    useCase,
    owner,
    assetIds,
    description: `${name} collection. Collection membership does not override asset-level rights, consent, or derivative approval.`,
    readyCount: assets.filter((asset) => asset.displayStatus === "Portal Ready").length,
    needsEvidenceCount: assets.filter((asset) => asset.displayStatus === "Needs Evidence").length,
    blockedCount: assets.filter((asset) => asset.displayStatus === "Blocked" || asset.displayStatus === "Restricted").length,
    lastUpdated: "2026-06-15"
  };
}

export const initialDistributionSections: DistributionSection[] = [
  { id: "cover", name: "Cover", required: 1, assetIds: ["TJC-IMG-1010"] },
  { id: "hero-assets", name: "Hero Assets", required: 1, assetIds: ["TJC-IMG-1001"] },
  { id: "social-media", name: "Social Media", required: 1, assetIds: [] },
  { id: "documents", name: "Documents", required: 1, assetIds: [] }
];

export const governanceRecords: Record<string, GovernanceRecord[]> = {
  rights: [
    { id: "r1", name: "Owner/license evidence missing", status: "Needs Evidence", owner: "Rights reviewer", updated: "2026-06-14", detail: "Youth Fellowship Group Photo requires proof before public use." },
    { id: "r2", name: "Minors consent required", status: "Blocked", owner: "Rights reviewer", updated: "2026-06-14", detail: "Summer Camp Group Photo blocked until minor consent is attached." },
    { id: "r3", name: "Expiring license review", status: "Expiring Soon", owner: "Music rights", updated: "2026-06-13", detail: "Choir Hymn Audio Reference license recheck due soon." },
    { id: "r4", name: "Download unlock evidence", status: "In Review", owner: "Reviewer desk", updated: "2026-06-12", detail: "Approved derivative request waits on usage-scope note." },
    { id: "r5", name: "Blocked public use", status: "Restricted", owner: "Policy reviewer", updated: "2026-06-11", detail: "External distribution blocked until release packet is complete." }
  ],
  metadata: [
    { id: "m1", name: "Missing ministry/tags", status: "In Review", owner: "Metadata steward", updated: "2026-06-15", detail: "Review queue includes records requiring field completion." },
    { id: "m2", name: "Duplicate candidates", status: "Submitted", owner: "DAM Admin", updated: "2026-06-14", detail: "Two derivative candidates queued for checksum verification." },
    { id: "m3", name: "Taxonomy drift", status: "Needs Evidence", owner: "Taxonomy owner", updated: "2026-06-13", detail: "Youth and fellowship tags need consolidation." },
    { id: "m4", name: "Orphaned records", status: "Submitted", owner: "Metadata steward", updated: "2026-06-12", detail: "Records missing collection or ministry owner need cleanup." },
    { id: "m5", name: "Required field coverage", status: "In Review", owner: "DAM Admin", updated: "2026-06-11", detail: "Title, ministry, event date, and creator fields under audit." }
  ],
  policy: [
    { id: "p1", name: "Source file restrictions", status: "Portal Ready", owner: "Policy engine", updated: "2026-06-15", detail: "Source files require approved access and audit events." },
    { id: "p2", name: "Public use rules", status: "Portal Ready", owner: "Rights reviewer", updated: "2026-06-15", detail: "Human reviewer, date, usage scope, and notes required." },
    { id: "p3", name: "Expired rights gate", status: "Blocked", owner: "Policy engine", updated: "2026-06-14", detail: "Expired rights block download and package export." },
    { id: "p4", name: "Download gates", status: "In Review", owner: "Policy engine", updated: "2026-06-12", detail: "Viewer downloads require approved derivative and role-safe scope." },
    { id: "p5", name: "Role permissions", status: "Portal Ready", owner: "DAM Admin", updated: "2026-06-11", detail: "Contributor, reviewer, and admin routes remain role-scoped." }
  ],
  integrations: [
    { id: "i1", name: "Source review handoff", status: "In Review", owner: "DAM Admin", updated: "2026-06-15", detail: "Search and review layer tracked; live source-system updates remain gated." },
    { id: "i2", name: "Google Shared Drive custody", status: "Portal Ready", owner: "Archive admin", updated: "2026-06-15", detail: "Master source custody remains outside portal package flows." },
    { id: "i3", name: "Identity provider", status: "Needs Evidence", owner: "Admin", updated: "2026-06-14", detail: "Production SSO role mapping pending." },
    { id: "i4", name: "Pending source updates", status: "Blocked", owner: "DAM Admin", updated: "2026-06-13", detail: "Source-system updates remain disabled until adapter proof exists." },
    { id: "i5", name: "Portal runtime store", status: "Needs Evidence", owner: "Platform", updated: "2026-06-12", detail: "Hosted durability proof still required before broad beta." }
  ]
};

export function assetById(id: string) {
  return damAssets.find((asset) => asset.id === id);
}

export function collectionAssets(collection: DamCollection) {
  return collection.assetIds.map(assetById).filter((asset): asset is DamAsset => Boolean(asset));
}

export function portalReadyAssets(assets = damAssets) {
  return assets.filter((asset) => asset.displayStatus === "Portal Ready" && asset.derivativeState === "available");
}

export function readinessForAssets(assets: DamAsset[]) {
  const total = assets.length;
  const ready = assets.filter((asset) => asset.displayStatus === "Portal Ready").length;
  const needsEvidence = assets.filter((asset) => asset.displayStatus === "Needs Evidence").length;
  const blocked = assets.filter((asset) => asset.displayStatus === "Blocked" || asset.displayStatus === "Restricted" || asset.displayStatus === "Expired").length;
  const score = total ? Math.round((ready / total) * 100) : 0;
  return { total, ready, needsEvidence, blocked, score };
}

export function rightsBadgesForAsset(asset: DamAsset) {
  const badges = [
    asset.sourceAccessState === "restricted" ? "Source restricted" : "Source access approved",
    asset.approvalScope === "public" ? "Public use approved" : asset.approvalScope === "internal" ? "Internal only" : asset.approvalScope === "restricted" ? "Public use blocked" : "Evidence required",
    asset.derivativeState === "available" ? "Approved derivative" : asset.derivativeState === "generating" ? "Derivative generating" : "Derivative missing"
  ];
  if (asset.minorsVisible === "yes" || asset.minorsVisible === "unknown") badges.push("Consent required");
  if (asset.evidenceState === "expiring") badges.push("License expiring");
  if (/verified|approved|public use/i.test(asset.rightsSummary)) badges.push("Owner verified");
  return badges;
}

export function distributionReadiness(sections: DistributionSection[]) {
  const requiredSections = sections.filter((section) => section.required > 0);
  const readySections = requiredSections.filter((section) =>
    section.assetIds.length >= section.required &&
    section.assetIds.every((assetId) => {
      const asset = assetById(assetId);
      return asset?.displayStatus === "Portal Ready" && asset.derivativeState === "available";
    })
  );
  const selectedIds = sections.flatMap((section) => section.assetIds);
  const selectedAssets = selectedIds.map(assetById).filter((asset): asset is DamAsset => Boolean(asset));
  const blockers = [
    ...requiredSections
      .filter((section) => !readySections.some((ready) => ready.id === section.id))
      .map((section) => `${section.name} needs approved assets`),
    ...selectedAssets.flatMap((asset) => asset.displayStatus === "Portal Ready" ? [] : [`${asset.title}: ${asset.displayStatus}`])
  ];
  const score = requiredSections.length ? Math.round((readySections.length / requiredSections.length) * 100) : 0;
  return {
    score,
    readySections: readySections.length,
    totalSections: requiredSections.length,
    selectedAssets,
    blockers,
    distributionState: blockers.length ? "blocked" as DistributionState : "ready" as DistributionState,
    canGenerate: blockers.length === 0 && readySections.length === requiredSections.length
  };
}

export function formatDate(value?: string) {
  if (!value) return "Not set";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function iconForAssetType(type: DamAssetType) {
  if (type === "Audio") return FileArchive;
  if (type === "Document") return FileText;
  if (type === "Graphic") return FileCheck2;
  if (type === "Video") return FileArchive;
  return FileCheck2;
}
