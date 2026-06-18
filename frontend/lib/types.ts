export type DemoRole = "Viewer" | "Contributor" | "Reviewer" | "DAM Admin";

export type PublishStatus =
  | "Approved Public"
  | "Approved Internal"
  | "Needs Review"
  | "Searchable Archive"
  | "Do Not Use"
  | "Possible Minors";

export type UsageScope =
  | "Public"
  | "Internal"
  | "Public and Internal"
  | "Archive Only"
  | "Do Not Publish"
  | "Do Not Use";

export type ReuseTier = "stock-safe" | "context-safe" | "archive-only";

export type VisibilityTier = "public" | "internal/member" | "reviewer/admin" | "archive";

export type SensitivityClass =
  | "public-safe"
  | "member-sensitive"
  | "sacrament-sensitive"
  | "youth-sensitive"
  | "testimony-sensitive"
  | "internal-governance"
  | "archive-restricted";

export type RightsBasis =
  | "TJC-owned"
  | "contributor-license"
  | "public-domain"
  | "jurisdiction-limited-public-domain"
  | "hymn-license"
  | "hymn-permission"
  | "fair-use-internal-only"
  | "unknown";

export type ApprovedChannel =
  | "website"
  | "livestream"
  | "projection"
  | "choir-upload"
  | "print"
  | "social"
  | "internal-training"
  | "limited-share-link"
  | "archive-only";

export type DomainReviewer =
  | "doctrine"
  | "music-rights"
  | "RE/minors"
  | "pastoral-sensitivity"
  | "archive"
  | "DAM-reviewer";

export type MasterCustodyPathStatus = "verified" | "planned" | "missing" | "not-exported";

export type WithdrawalStatus = "active" | "withdrawn" | "takedown-requested" | "embargoed" | "expired";

export type DamRendition = "orig" | "web" | "social" | "thumb" | "print";

export type DamFilenameDateSource = "captured_date" | "event_date" | "file_modified_date" | "import_date" | "undated";

export type DamGeneratedFilenames = {
  baseName: string;
  original: string;
  web: string;
  social: string;
  thumb: string;
  print: string;
  datePart: string;
  dateSource: DamFilenameDateSource;
  collectionSlug: string;
  sequence: string;
  originalExtension: string;
  derivativeExtension: string;
  subjectSlug?: string;
};

export type StockMediaAsset = {
  id: string;
  title: string;
  thumbnail: string;
  thumbnailAlt: string;
  preview?: string;
  imageUrls?: {
    small: string;
    card: string;
    collection: string;
    detail: string;
    download?: string;
  };
  mediaType: "photo" | "video" | "audio" | "graphic" | "document";
  collection: string;
  status: PublishStatus;
  usageScope: UsageScope;
  visibility?: "public" | "internal" | "reviewer" | "admin";
  peopleRisk?: "No people" | "Adults visible" | "Possible minors" | "Unknown";
  sourcePlatform?: string;
  sourceSystem?: string;
  sourceAccount?: string;
  sourceFolder?: string;
  sourceAlbum?: string;
  sourceAlbumPath?: string;
  sourceAlbumMemberships?: string[];
  importBatch?: string;
  eventName?: string;
  eventSeries?: string;
  eventDate?: string;
  capturedDate?: string;
  fileModifiedDate?: string;
  importDate?: string;
  imageDimensions?: string;
  rightsStatus?: string;
  workflowState?: string;
  qualityStatus?: string;
  sensitiveContext?: string;
  consentStatus?: string;
  usageTerms?: string[];
  duplicateGroup?: string;
  duplicateRole?: string;
  checksumSha256?: string;
  reviewer?: string;
  reviewedDate?: string;
  rightsNotes?: string;
  usageGuidance?: string;
  downloadPolicy:
    | "approved-copy-allowed"
    | "internal-approved-copy-allowed"
    | "not-downloadable"
    | "admin-original-only";
  resourceSpaceId?: string;
  sourcePath?: string;
  masterDrivePath?: string;
  masterCustodyPathStatus?: MasterCustodyPathStatus;
  originalFilename?: string;
  damFilenames?: DamGeneratedFilenames;
  fileExtension?: string;
  fileSizeBytes?: number;
  tags?: string[];
  tjcTerms?: string[];
  suggestedTags?: string[];
  controlledVocabularySource?: "approved-historical-tjc" | "review-suggestion" | "unknown";
  aiTitleSuggestion?: string;
  aiVisibleTagSuggestions?: string[];
  aiTjcTermSuggestions?: string[];
  aiQualitySuggestion?: string;
  aiPeopleOrMinorFlag?: string;
  humanAiDecision?: string;
  reuseTier?: ReuseTier;
  visibilityTier?: VisibilityTier;
  sensitivityClass?: SensitivityClass;
  rightsBasis?: RightsBasis;
  approvedChannels?: ApprovedChannel[];
  requiredNotice?: string;
  consentReleaseRecordId?: string;
  publishDate?: string;
  embargoDate?: string;
  expirationDate?: string;
  approvalRecheckDate?: string;
  expirationOrRecheckDate?: string;
  rightsExpirationDate?: string;
  consentExpirationDate?: string;
  withdrawalStatus?: WithdrawalStatus;
  domainReviewer?: DomainReviewer;
  doctrineSacramentTheme?: string;
  hymnNumberOrTitle?: string;
  sermonTitle?: string;
  testimonyTheme?: string;
  religiousEducationLevel?: string;
  church?: string;
  region?: string;
  publicationTitle?: string;
  language?: string;
  versionOrEdition?: string;
  duplicateSimilarityHint?: string;
  reuseDecision?: ReuseDecision;
  pendingReviewWrite?: ReviewWriteRecordSummary;
};

export type ReuseState =
  | "portal-ready"
  | "internal-ready"
  | "preview-only"
  | "blocked-needs-review"
  | "blocked-source"
  | "blocked-rights"
  | "blocked-people-minors"
  | "blocked-reviewer-date"
  | "blocked-derivative"
  | "blocked-sensitive"
  | "blocked-archive"
  | "blocked-do-not-use";

export type PreviewTier =
  | "reusable-preview"
  | "candidate-preview"
  | "reviewer-only-preview"
  | "no-preview";

export type ReuseBlocker = {
  code: ReuseState;
  label: string;
};

export type ReuseDecision = {
  state: ReuseState;
  label: string;
  summary: string;
  downloadable: boolean;
  previewTier: PreviewTier;
  blockers: ReuseBlocker[];
  reasonCodes: string[];
  allowedRenditions: string[];
};

export type MetadataConfidence = {
  source: "verified" | "missing" | "unknown";
  peopleMinors: "reviewed" | "unknown" | "children_youth_possible";
  rights: "approved" | "unknown" | "review_required";
  usageGuidance: "present" | "missing";
  review: "complete" | "pending";
};

export type ReviewEvidenceChecklist = {
  sourceConfirmed: boolean;
  rightsConfirmed: boolean;
  attributionConfirmed: boolean;
  peopleVisibilityConfirmed: boolean;
  childrenYouthChecked: boolean;
  usageScopeSelected: boolean;
  derivativeAvailable: boolean;
  sensitiveContextChecked: boolean;
  creditRequirementChecked: boolean;
  expirationRereviewSet: boolean;
  proofLinkAttached: boolean;
};

export type ReviewWriteSyncState =
  | "queued"
  | "ready_to_sync"
  | "syncing"
  | "sync_failed"
  | "synced_to_resourcespace"
  | "conflict_detected"
  | "cancelled"
  | "superseded";

export type ReviewWriteRecord = {
  id: string;
  resourceId: string;
  oldStatus: string;
  requestedStatus: string;
  reviewerRole: "Reviewer" | "DAM Admin";
  reviewerName?: string;
  createdAt: string;
  updatedAt: string;
  note: string;
  checklist: ReviewEvidenceChecklist;
  blockers: string[];
  syncState: ReviewWriteSyncState;
  retryCount: number;
  lastError?: string;
};

export type ReviewWriteRecordSummary = Pick<
  ReviewWriteRecord,
  "id" | "resourceId" | "requestedStatus" | "createdAt" | "updatedAt" | "syncState" | "lastError"
>;

export type DamAssetStatus =
  | "approved"
  | "needs-review"
  | "restricted"
  | "missing-consent"
  | "expiring-soon"
  | "unknown";

export type DamMediaType = "image" | "video" | "document" | "audio" | "other";

export type DamAssetVersion = {
  id: string;
  label: string;
  createdAt?: string;
  createdBy?: string;
  isCurrent?: boolean;
  resourceSpaceId?: number | string;
};

export type DamActivity = {
  id: string;
  type: string;
  actor?: string;
  createdAt: string;
  summary: string;
};

export type DamAsset = {
  id: string;
  resourceSpaceId: number | string;
  title: string;
  filename: string;
  type: DamMediaType;
  mime?: string;
  extension?: string;
  dimensions?: string;
  duration?: string;
  fileSize?: string;
  thumbnailUrl?: string;
  previewUrl?: string;
  downloadUrl?: string;
  status: DamAssetStatus;
  approvalStatusRaw?: string;
  createdBy?: string;
  uploadedBy?: string;
  createdAt?: string;
  uploadedAt?: string;
  modifiedAt?: string;
  categories: string[];
  keywords: string[];
  collections: string[];
  usageChannels: string[];
  licenseType?: string;
  usageRights?: string;
  territory?: string;
  durationRights?: string;
  modelRelease?: "yes" | "no" | "not-required" | "unknown";
  propertyRelease?: "yes" | "no" | "not-required" | "unknown";
  sourceSystem: "resourcespace";
  storageSource?: "s3" | "google-drive" | "resourcespace" | "unknown";
  versions?: DamAssetVersion[];
  activity?: DamActivity[];
  raw?: unknown;
};

export type ResourceSpaceFieldMap = {
  title: string | number;
  description: string | number;
  approvalStatus: string | number;
  usageRights: string | number;
  licenseType: string | number;
  territory: string | number;
  modelRelease: string | number;
  propertyRelease: string | number;
  categories: string | number;
  keywords: string | number;
  ministry: string | number;
  campaign: string | number;
  usageChannels: string | number;
  [key: string]: string | number;
};

export type DamUser = {
  id: string;
  name: string;
  email?: string;
  role: DemoRole;
  team?: string;
  sourceSystem?: "sso" | "local-beta";
};

export type BetaFeedbackSeverity = "low" | "medium" | "high" | "critical";

export type BetaFeedbackStatus = "new" | "triaged" | "agent-ready" | "fixed" | "wont-fix";

export type BetaFeedbackOwner = "unassigned" | "Hali" | "Enoch" | "Reviewer" | "Codex" | "Admin";

export type BetaFeedbackIncidentState = "none" | "watch" | "triggered" | "resolved";

export type BetaFeedbackRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  role: DemoRole;
  route: string;
  task: string;
  severity: BetaFeedbackSeverity;
  expected: string;
  actual: string;
  status: BetaFeedbackStatus;
  owner: BetaFeedbackOwner;
  incidentState: BetaFeedbackIncidentState;
  incidentId?: string;
  incidentTriggeredAt?: string;
  notes?: string;
  reporterName?: string;
  browser?: string;
  device?: string;
  viewport?: string;
  attachmentUrl?: string;
  storageMode: "vercel-kv" | "local-json";
  actor?: string;
};

export type DamPackageSection = {
  id: string;
  title: string;
  resourceSpaceAssetIds: Array<string | number>;
};

export type DamPackage = {
  id: string;
  title: string;
  description?: string;
  status: "draft" | "pending-review" | "approved" | "archived";
  collectionId?: string | number;
  sections: DamPackageSection[];
  createdBy?: string;
  updatedAt?: string;
};

export type DamAuditEvent = {
  id: string;
  type: string;
  actor: string;
  role?: DemoRole;
  resourceSpaceId?: string | number;
  packageId?: string;
  status: "allowed" | "denied" | "blocked" | "queued" | "preview";
  summary: string;
  createdAt: string;
};

export type SavedViewSummary = {
  id: string;
  label: string;
  description: string;
  count: number;
  reason: string;
};

export type CatalogSort = "Approved first" | "Recently approved" | "Newest" | "A-Z";

export type CatalogCollection = {
  id: string;
  name: string;
  description: string;
  count: number;
  countLabel: string;
  dateRange: string;
  ministry: string;
  approvalSummary: string;
  peopleWarning?: string;
  searchQuery: string;
  viewId?: string;
  images: { src: string; alt: string }[];
};

export type MetadataHealthSummary = {
  averageScore: number;
  complete: number;
  needsSource: number;
  needsPeople: number;
  needsRights: number;
  needsUsage: number;
  reviewPending: number;
};

export type ZeroResultInsight = {
  query: string;
  rawCount: number;
  savedViewCount: number;
  savedViewId?: string;
  recommendation: string;
};

export type OperationalInsight = {
  id: string;
  label: string;
  value: number;
  detail: string;
  tone: "ok" | "warn" | "info";
  savedViewId?: string;
};

export type DamReadinessItem = {
  id: string;
  pillar: "Find" | "Trust" | "Review" | "Share" | "Govern";
  label: string;
  score: number;
  detail: string;
  action: string;
  savedViewId?: string;
  tone: "ok" | "warn" | "info";
};

export type FieldMappingStatus = {
  key: string;
  label: string;
  resourceSpaceField: string;
  required: boolean;
  coverage: number;
  present: number;
  missing: number;
};

export type VocabularyInsight = {
  term: string;
  count: number;
  kind: "canonical" | "candidate" | "drift";
};

export type PortalPolicyCheck = {
  id: string;
  label: string;
  blocked: number;
  detail: string;
  savedViewId?: string;
};

export type AdminActionItem = {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  label: string;
  count: number;
  owner: "DAM Admin" | "Reviewer" | "Contributor";
  action: string;
  savedViewId?: string;
};

export type IntegrationReadinessItem = {
  id: string;
  label: string;
  ready: boolean;
  detail: string;
  owner: "ResourceSpace" | "Google Shared Drive" | "Amazon S3" | "Identity Provider" | "DAM Admin" | "Reviewers" | "Portal";
  state?: "Operational" | "Degraded" | "Not configured" | "Read-only" | "Blocked" | "Pending setup";
};

export type BetaReadinessFact = {
  id: string;
  label: string;
  ready: boolean;
  state: "pass" | "warn" | "block";
  detail: string;
  source: "integration" | "qa-report" | "environment" | "launch-readiness" | "git-hygiene" | "catalog";
};

export type BetaReadinessResult = {
  ready: boolean;
  score: number;
  generatedAt: string;
  facts: BetaReadinessFact[];
};

export type AuditEventSummary = {
  id: string;
  type: string;
  createdAt: string;
  role: DemoRole;
  actor: string;
  status: "allowed" | "denied" | "blocked" | "queued" | "preview";
  assetId?: string;
  resourceSpaceId?: string;
  summary: string;
};

export type AssetGovernancePassport = {
  score: number;
  decision: string;
  portalReady: boolean;
  blockers: string[];
  warnings: string[];
  evidence: Array<{
    label: string;
    value: string;
    tone: "ok" | "warn" | "info";
  }>;
  auditTrail: Array<{
    event: string;
    actor: string;
    date: string;
    detail: string;
    tone: "ok" | "warn" | "info";
  }>;
  renditions: Array<{
    label: string;
    available: boolean;
    detail: string;
    intent: string;
  }>;
};

export type DamReadinessResult = {
  source: MediaSourceStatus;
  score: number;
  assetCount: number;
  metrics: {
    approvedPublic: number;
    portalReady: number;
    needsReview: number;
    rightsReview: number;
    missingSource: number;
    childrenYouth: number;
    aiEnrichment: number;
    taxonomyDrift: number;
    duplicateCandidates: number;
    renditionGaps: number;
    staleApprovals: number;
  };
  readiness: DamReadinessItem[];
  fieldMappings: FieldMappingStatus[];
  vocabulary: VocabularyInsight[];
  portalPolicy: PortalPolicyCheck[];
  actionBacklog: AdminActionItem[];
  integrationReadiness: IntegrationReadinessItem[];
  betaReadiness: BetaReadinessResult;
  auditLog: {
    count: number;
    latestAt?: string;
    denied: number;
    queued: number;
    storage?: {
      mode: string;
      durable: boolean;
      productionReady: boolean;
      accountabilityEvidence: boolean;
      truthBoundary: string;
      detail: string;
    };
    recent: AuditEventSummary[];
  };
};

export type SearchResult = {
  assets: StockMediaAsset[];
  total: number;
  pagination: {
    offset: number;
    limit: number;
    rangeStart: number;
    rangeEnd: number;
    hasPrevious: boolean;
    hasNext: boolean;
    previousOffset: number;
    nextOffset: number;
  };
  source: MediaSourceStatus;
  counts: {
    rawTotal: number;
    visibleToRole: number;
    currentlyShown: number;
    totalMatching: number;
    totalRendered: number;
    matching: number;
    rendered: number;
    approvedRaw: number;
    approved: number;
    portalReady: number;
    batchApprovedWithBlockers: number;
    needsReview: number;
    pendingReview: number;
    archive: number;
    archiveCandidates: number;
    blocked: number;
    childrenYouth: number;
    missingSource: number;
    rightsReview: number;
    approvedThisMonth: number;
  };
  metadataHealth: MetadataHealthSummary;
  appliedIntent?: {
    rawQuery: string;
    matchedView?: string;
    matchedCollection?: string;
    matchedDiscoveryIntent?: string;
    confidence: "exact" | "synonym" | "none";
  };
  discovery: {
    mode: "browse" | "smart-query" | "saved-view" | "collection";
    summary: string;
    expandedTerms: string[];
    matchedIntent?: {
      id: string;
      label: string;
      query: string;
      description: string;
      safetyNote: string;
    };
    intentPresets: Array<{
      id: string;
      label: string;
      query: string;
      description: string;
      suggestedFilters: string[];
    }>;
    suggestedFilters: Array<{
      label: string;
      filter: string;
      count: number;
      kind: "policy" | "media" | "people" | "shape" | "workflow" | "ministry";
    }>;
    noResultHelp?: {
      title: string;
      guidance: string;
      querySuggestions: string[];
      filters: Array<{
        label: string;
        filter: string;
        count: number;
        kind: "policy" | "media" | "people" | "shape" | "workflow" | "ministry";
      }>;
      savedViews: Array<{
        id: string;
        label: string;
      }>;
    };
    scoreHint: string;
    rankingExplanation: Array<{
      label: string;
      detail: string;
    }>;
    safetyNote: string;
  };
  zeroResultInsights: ZeroResultInsight[];
  operationalInsights: OperationalInsight[];
  savedViews: SavedViewSummary[];
  collections: CatalogCollection[];
  usageAnalytics?: {
    enabled: boolean;
    totalEvents: number;
    topSearches: Array<{ label: string; value: number }>;
    topAssets: Array<{ label: string; value: number }>;
    dailyEvents?: Array<{ date: string; value: number }>;
  };
};

export type MediaSourceStatus = {
  adapter: "resourcespace-api" | "exported-metadata" | "bundled-beta-catalog" | "demo-fallback" | "media-library";
  label: string;
  detail: string;
  readOnly: boolean;
  live?: boolean;
  sourceKind?: "resourcespace" | "fallback-fixtures" | "media-library";
};
