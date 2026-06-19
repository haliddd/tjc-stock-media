import { describe, expect, it } from "vitest";
import { auditAccountabilityArea, auditEventForRolePayload, auditStorageReadiness, originalAccessAuditEvent, packageDecisionAuditEvent, renditionRequestAuditEvent, type AuditEventRecord } from "@/lib/audit-log";
import { buildBetaReadiness } from "@/lib/beta-readiness-facts";
import { buildCatalogDiscovery, buildDiscoveryQuery, matchesDiscoveryQuery, queryIntentPresets } from "@/lib/catalog-discovery";
import { intentDefinitions, matchesCatalogFilter, savedViewDefinitions } from "@/lib/catalog-language";
import { buildBrandKitGovernance } from "@/lib/brand-kit-governance";
import { buildDeliveryReadinessManifest } from "@/lib/delivery-readiness";
import { derivativeIndexDiagnostics, governedRenditionPolicyForVariant, originalMasterRenditionPolicy, thumbnailVariantCanSatisfyApprovedCopy } from "@/lib/derivative-index";
import { auditCoverageMetrics, buildGovernanceMetrics, usageHealthMetrics } from "@/lib/dam-governance-metrics";
import { fileIsVideoOrAudio, fileRequiresAdminIntake, intakeDefaultsToNeedsReview, routeAssetForReview, routeUploadIntakeForReview } from "@/lib/intake-routing";
import { resolvePackageSections } from "@/lib/package-drafts";
import { buildPackageGovernance } from "@/lib/package-governance";
import { packageStorageReadiness } from "@/lib/package-store";
import { canSeeAsset } from "@/lib/permissions";
import { approvedCopyAccessBoundary, buildOriginalAccessRequestDecision, buildPortalReuseDecision } from "@/lib/portal-reuse-decision";
import { buildReviewEvidenceDecision, emptyReviewChecklist, reviewActionDisabledReason } from "@/lib/review-decision-presenter";
import { missingDomainReviewEvidence, sensitiveMinistryEvidenceModel } from "@/lib/review-evidence";
import {
  buildReviewDecisionLanes,
  buildReviewDecisionRequirements,
  buildReviewQueueMetrics,
  buildReviewSignals,
  missingReviewActionEvidence,
  reviewDecisionActions,
  reviewNextCheckLabel
} from "@/lib/review-workbench";
import { assetMatchesReviewQueue, isReviewActionBackend, reviewActions, reviewGovernanceGroupsForAsset } from "@/lib/workflow-policy";
import { assetForRolePayload, sourceForRole } from "@/lib/source-redaction";
import type { DamPackage, IntegrationReadinessItem, StockMediaAsset } from "@/lib/types";

function asset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "asset-1",
    title: "Bible teaching background",
    thumbnail: "/thumb.jpg",
    thumbnailAlt: "Bible on table",
    imageUrls: {
      small: "/small.jpg",
      card: "/card.jpg",
      collection: "/collection.jpg",
      detail: "/detail.jpg",
      download: "/download.jpg"
    },
    mediaType: "photo",
    collection: "Sabbath",
    status: "Approved Public",
    usageScope: "Public",
    peopleRisk: "No people",
    sourceSystem: "ResourceSpace export",
    sourcePlatform: "Shared Drive",
    sourceAccount: "media-team@example.org",
    sourcePath: "/private/source.jpg",
    masterDrivePath: "/Shared Drives/TJC Stock Media/approved/source.jpg",
    originalFilename: "source.jpg",
    checksumSha256: "abc123abc123abc123abc123abc123ab",
    imageDimensions: "2400x1600",
    rightsStatus: "Rights approved",
    consentStatus: "Consent confirmed",
    usageGuidance: "Use for sermon slides and website backgrounds.",
    downloadPolicy: "approved-copy-allowed",
    resourceSpaceId: "1001",
    reviewer: "Reviewer One",
    reviewedDate: "2026-06-01",
    tags: ["bible", "teaching"],
    tjcTerms: ["sermon slides"],
    ...overrides
  };
}

describe("review workbench model", () => {
  it("builds review metrics and evidence signals outside UI", () => {
    const ready = asset();
    const risky = asset({
      id: "asset-2",
      status: "Needs Review",
      usageScope: "Do Not Publish",
      peopleRisk: "Unknown",
      rightsStatus: "Unknown",
      consentStatus: "Needs review",
      usageGuidance: "Review before sharing",
      imageUrls: { small: "/s.jpg", card: "/c.jpg", collection: "/g.jpg", detail: "/d.jpg" },
      reviewer: undefined,
      reviewedDate: undefined
    });

    const metrics = buildReviewQueueMetrics([ready, risky]);
    const signals = buildReviewSignals([ready, risky]);

    expect(metrics.find((item) => item.label === "Needs review")?.value).toBe("2");
    expect(metrics.find((item) => item.label === "Rights unclear")?.tone).toBe("warning");
    expect(signals.find((item) => item.label === "People/minors status unresolved")?.count).toBe(1);
    expect(reviewNextCheckLabel(risky)).toBe("Check people/minors");
    expect(buildReviewDecisionLanes(risky).some((lane) => lane.label === "Rights" && lane.blocked)).toBe(true);
  });

  it("keeps approval locked until checklist and note evidence pass", () => {
    const requirements = buildReviewDecisionRequirements(emptyReviewChecklist, "short");
    const missing = missingReviewActionEvidence("Approve Public", emptyReviewChecklist, "short");

    expect(requirements.completed).toBe(0);
    expect(requirements.total).toBe(12);
    expect(requirements.missingLabels).toContain("Review note missing");
    expect(missing).toContain("proofLinkAttached");
    expect(missing).toContain("reviewNote");
  });

  it("keeps workbench decision backends aligned with workflow policy", () => {
    const workflowBackends = reviewActions.map((action) => action.backend);

    expect(reviewDecisionActions.every((action) => isReviewActionBackend(action.action))).toBe(true);
    expect(reviewDecisionActions.map((action) => action.action)).toEqual(expect.arrayContaining([
      "Approve Public",
      "Approve Internal",
      "Request More Info",
      "Do Not Use"
    ]));
    expect(reviewDecisionActions.map((action) => action.action).every((action) => workflowBackends.includes(action))).toBe(true);
  });

  it("groups review records by enterprise governance work lanes", () => {
    const risky = asset({
      status: "Needs Review",
      usageScope: "Do Not Publish",
      peopleRisk: "Possible minors",
      sensitivityClass: "youth-sensitive",
      consentStatus: "Unknown",
      usageGuidance: "Review before sharing",
      imageUrls: { small: "/s.jpg", card: "/c.jpg", collection: "/g.jpg", detail: "/d.jpg" },
      reviewedDate: "2025-01-01",
      approvalRecheckDate: "2025-06-01",
      pendingReviewWrite: {
        id: "pending-1",
        resourceId: "1001",
        requestedStatus: "Approved Public",
        createdAt: "2026-06-13T00:00:00.000Z",
        updatedAt: "2026-06-13T00:00:00.000Z",
        syncState: "queued"
      }
    });

    const groups = reviewGovernanceGroupsForAsset(risky, true).filter((group) => group.active).map((group) => group.id);

    expect(groups).toEqual(expect.arrayContaining(["risk", "missing-evidence", "stale-review", "derivative-gap", "pending-write"]));
    expect(assetMatchesReviewQueue(risky, "risk")).toBe(true);
    expect(assetMatchesReviewQueue(risky, "missing-evidence")).toBe(true);
    expect(assetMatchesReviewQueue(risky, "stale-review")).toBe(true);
    expect(assetMatchesReviewQueue(risky, "derivative-gap")).toBe(true);
    expect(assetMatchesReviewQueue(risky, "pending-write")).toBe(true);
  });
});

describe("trust and redaction decisions", () => {
  it("separates portal-ready assets from blocked rights states", () => {
    expect(buildPortalReuseDecision(asset(), "Viewer").reuse.state).toBe("portal-ready");

    const blocked = buildPortalReuseDecision(asset({
      rightsStatus: "Unknown",
      consentStatus: "Missing",
      rightsNotes: undefined
    }), "Viewer");

    expect(blocked.reuse.state).toBe("blocked-rights");
    expect(blocked.access.downloadApprovedCopy.allowed).toBe(false);
    expect(blocked.viewerVerdict.reason).toMatch(/Rights or permission/i);
  });

  it("redacts source custody and ResourceSpace internals from Viewer payloads", () => {
    const matureAsset = asset({
      sourceFolder: "/Shared Drives/private/source-folder",
      importBatch: "MVP Batch 01",
      masterCustodyPathStatus: "verified",
      publishDate: "2026-06-01",
      embargoDate: "2026-07-01",
      expirationDate: "2026-12-31",
      approvalRecheckDate: "2026-09-01",
      rightsExpirationDate: "2026-12-31",
      consentExpirationDate: "2026-12-31",
      withdrawalStatus: "active",
      doctrineSacramentTheme: "Holy Communion",
      hymnNumberOrTitle: "Hymn 469",
      sermonTitle: "Sabbath sermon",
      testimonyTheme: "healing",
      religiousEducationLevel: "RE youth",
      church: "Local church",
      region: "Region",
      publicationTitle: "Newsletter",
      language: "English",
      versionOrEdition: "v1",
      duplicateSimilarityHint: "near duplicate",
      suggestedTags: ["worship-ready"],
      controlledVocabularySource: "review-suggestion",
      resource_space_id: "1001",
      source_path: "/Shared Drives/private/source-alias.jpg",
      source_album: "Private album",
      checksum: "secret-checksum-alias",
      checksum_sha256: "secret-checksum-sha",
      review_status: "Approved Public",
      rights_status: "Rights approved",
      reviewedBy: "Reviewer One",
      reviewed_by: "Reviewer One",
      reviewedAt: "2026-06-01",
      reviewed_at: "2026-06-01",
      approvedForPublic: true,
      approved_for_public: true,
      approvedForInternal: false,
      approved_for_internal: false,
      lastSyncedAt: "2026-06-01T00:00:00.000Z",
      last_synced_at: "2026-06-01T00:00:00.000Z",
      syncSource: "ResourceSpace",
      sync_source: "ResourceSpace"
    });
    const viewer = assetForRolePayload("Viewer", matureAsset);
    const reviewer = assetForRolePayload("Reviewer", matureAsset);
    const viewerSource = sourceForRole("Viewer", {
      adapter: "resourcespace-api",
      label: "ResourceSpace",
      detail: "Live ResourceSpace export",
      readOnly: true
    });

    expect(viewer.resourceSpaceId).toBeUndefined();
    expect(viewer.resource_space_id).toBeUndefined();
    expect(viewer.sourcePath).toBeUndefined();
    expect(viewer.source_path).toBeUndefined();
    expect(viewer.source_album).toBeUndefined();
    expect(viewer.checksumSha256).toBeUndefined();
    expect(viewer.checksum).toBeUndefined();
    expect(viewer.checksum_sha256).toBeUndefined();
    expect(viewer.imageUrls?.download).toBeUndefined();
    expect(viewer.masterCustodyPathStatus).toBeUndefined();
    expect(viewer.publishDate).toBeUndefined();
    expect(viewer.embargoDate).toBeUndefined();
    expect(viewer.expirationDate).toBeUndefined();
    expect(viewer.approvalRecheckDate).toBeUndefined();
    expect(viewer.rightsExpirationDate).toBeUndefined();
    expect(viewer.consentExpirationDate).toBeUndefined();
    expect(viewer.withdrawalStatus).toBeUndefined();
    expect(viewer.doctrineSacramentTheme).toBeUndefined();
    expect(viewer.hymnNumberOrTitle).toBeUndefined();
    expect(viewer.sermonTitle).toBeUndefined();
    expect(viewer.testimonyTheme).toBeUndefined();
    expect(viewer.religiousEducationLevel).toBeUndefined();
    expect(viewer.church).toBeUndefined();
    expect(viewer.region).toBeUndefined();
    expect(viewer.publicationTitle).toBeUndefined();
    expect(viewer.language).toBeUndefined();
    expect(viewer.versionOrEdition).toBeUndefined();
    expect(viewer.duplicateSimilarityHint).toBeUndefined();
    expect(viewer.sourceFolder).toBeUndefined();
    expect(viewer.importBatch).toBeUndefined();
    expect(viewer.suggestedTags).toBeUndefined();
    expect(viewer.controlledVocabularySource).toBeUndefined();
    expect(viewer.review_status).toBeUndefined();
    expect(viewer.rights_status).toBeUndefined();
    expect(viewer.approvedForPublic).toBeUndefined();
    expect(viewer.approved_for_public).toBeUndefined();
    expect(viewer.approvedForInternal).toBeUndefined();
    expect(viewer.approved_for_internal).toBeUndefined();
    expect(viewer.lastSyncedAt).toBeUndefined();
    expect(viewer.last_synced_at).toBeUndefined();
    expect(viewer.syncSource).toBeUndefined();
    expect(viewer.sync_source).toBeUndefined();
    expect(viewerSource.label).toBe("Media library");
    expect(reviewer.resourceSpaceId).toBe("1001");
    expect(reviewer.resource_space_id).toBe("1001");
    expect(reviewer.sourcePath).toBeUndefined();
    expect(reviewer.source_path).toBeUndefined();
    expect(reviewer.source_album).toBeUndefined();
    expect(reviewer.masterDrivePath).toBeUndefined();
    expect(reviewer.checksumSha256).toBeUndefined();
    expect(reviewer.checksum).toBeUndefined();
    expect(reviewer.checksum_sha256).toBeUndefined();
    expect(reviewer.masterCustodyPathStatus).toBe("verified");
    expect(reviewer.doctrineSacramentTheme).toBe("Holy Communion");
    expect(reviewer.duplicateSimilarityHint).toBe("near duplicate");
  });
});

describe("Phase 1B intake routing primitives", () => {
  it("keeps browser and batch intake non-publishing while routing large media to admin intake", () => {
    const defaults = intakeDefaultsToNeedsReview();
    const reasons = routeUploadIntakeForReview({
      files: [{ name: "choir-service.mp4", size: 42_000_000, type: "video/mp4" }],
      eventName: "Sabbath baptism service",
      ministry: "Choir",
      peopleVisible: "Unknown",
      minorsVisible: "Unknown",
      suggestedTags: "hymn,not-yet-approved",
      intakeNotes: "Hymns of Praise livestream clip from baptism service."
    });

    expect(defaults).toEqual({ status: "Needs Review", usageScope: "Do Not Publish", publishable: false });
    expect(fileIsVideoOrAudio({ name: "choir-service.mp4", type: "video/mp4" })).toBe(true);
    expect(fileIsVideoOrAudio({ name: "sabbath-choir.m4a", type: "" })).toBe(true);
    expect(fileIsVideoOrAudio({ name: "sabbath-photo.jpg", type: "image/jpeg" })).toBe(false);
    expect(fileRequiresAdminIntake({ name: "choir-service.mp4", size: 42_000_000, type: "video/mp4" })).toBe(true);
    expect(reasons.map((reason) => reason.id)).toEqual(expect.arrayContaining([
      "large-media-admin-intake",
      "doctrine-sacrament-review",
      "music-rights-review",
      "minors-consent-review",
      "source-provenance-review",
      "taxonomy-review"
    ]));
    expect(reasons.every((reason) => reason.nonPublishing)).toBe(true);
  });

  it("routes TJC recognition and AI hints to review without changing final approval truth", () => {
    const risky = asset({
      status: "Needs Review",
      usageScope: "Do Not Publish",
      peopleRisk: "Unknown",
      sourcePath: undefined,
      sourceAccount: undefined,
      checksumSha256: undefined,
      originalFilename: undefined,
      imageUrls: { small: "/small.jpg", card: "/card.jpg", collection: "/collection.jpg", detail: "/detail.jpg" },
      tags: ["uncurated"],
      tjcTerms: ["Testimony"],
      doctrineSacramentTheme: "Holy Communion",
      hymnNumberOrTitle: "Hymn 469",
      aiVisibleTagSuggestions: ["baptism"],
      controlledVocabularySource: "review-suggestion"
    });

    const reasons = routeAssetForReview(risky);

    expect(reasons.map((reason) => reason.id)).toEqual(expect.arrayContaining([
      "doctrine-sacrament-review",
      "music-rights-review",
      "minors-consent-review",
      "source-provenance-review",
      "rendition-readiness-review",
      "taxonomy-review",
      "ai-suggestion-review"
    ]));
    expect(buildPortalReuseDecision(risky, "Viewer").reuse.state).not.toBe("portal-ready");
    expect(reasons.every((reason) => reason.nonPublishing)).toBe(true);
  });
});

describe("Phase 2 TJC domain governance gates", () => {
  const completeChecklist = {
    sourceConfirmed: true,
    rightsConfirmed: true,
    attributionConfirmed: true,
    peopleVisibilityConfirmed: true,
    childrenYouthChecked: true,
    usageScopeSelected: true,
    derivativeAvailable: true,
    sensitiveContextChecked: true,
    creditRequirementChecked: true,
    expirationRereviewSet: true,
    proofLinkAttached: true
  };

  it("blocks public approval for youth/minors until consent and RE/minors review exist", () => {
    const youth = asset({
      sensitivityClass: "youth-sensitive",
      peopleRisk: "Possible minors",
      consentStatus: "Unknown",
      consentReleaseRecordId: undefined,
      domainReviewer: undefined
    });

    expect(missingDomainReviewEvidence(youth, "Approve Public", completeChecklist, "Evidence note with enough detail.")).toEqual(expect.arrayContaining([
      "consentReleaseRecord",
      "domainReviewer:RE/minors"
    ]));

    const cleared = { ...youth, consentReleaseRecordId: "release-1001", domainReviewer: "RE/minors" as const };
    expect(missingDomainReviewEvidence(cleared, "Approve Public", completeChecklist, "Evidence note with enough detail.")).not.toContain("domainReviewer:RE/minors");
  });

  it("blocks sacrament, hymn/music, and testimony public approval without domain evidence", () => {
    const risky = asset({
      sensitivityClass: "sacrament-sensitive",
      doctrineSacramentTheme: "Holy Communion",
      hymnNumberOrTitle: "Hymn 469",
      rightsBasis: "unknown",
      approvedChannels: [],
      requiredNotice: undefined,
      testimonyTheme: "healing",
      domainReviewer: undefined,
      rightsNotes: "Review before sharing."
    });

    const missing = missingDomainReviewEvidence(risky, "Approve Public", completeChecklist, "short");

    expect(missing).toEqual(expect.arrayContaining([
      "domainReviewer:doctrine",
      "musicRightsBasis",
      "musicApprovedChannel",
      "musicRequiredNotice",
      "domainReviewer:music-rights",
      "domainReviewer:pastoral-sensitivity",
      "pastoralSensitivityNote"
    ]));
    expect(buildPortalReuseDecision(risky, "Viewer").reuse.state).not.toBe("portal-ready");
  });

  it("surfaces sensitive ministry evidence locks and clear disabled reasons for public approval", () => {
    const sensitive = asset({
      peopleRisk: "Possible minors",
      sensitivityClass: "testimony-sensitive",
      sensitiveContext: "Worship testimony after prayer with youth present",
      hymnNumberOrTitle: "Hymn 469",
      rightsBasis: "unknown",
      approvedChannels: [],
      requiredNotice: undefined,
      consentStatus: "Unknown",
      consentReleaseRecordId: undefined,
      domainReviewer: undefined,
      testimonyTheme: "healing",
      rightsNotes: "Review before sharing."
    });

    const evidence = sensitiveMinistryEvidenceModel(sensitive, "Approve Public", completeChecklist, "short");
    const decision = buildReviewEvidenceDecision("Approve Public", completeChecklist, "short", sensitive);
    const disabledReason = reviewActionDisabledReason({ asset: sensitive, action: "Approve Public", checklist: completeChecklist, note: "short" });

    expect(evidence.filter((item) => item.active).map((item) => item.id)).toEqual(expect.arrayContaining([
      "children-youth",
      "worship",
      "music-teaching",
      "testimony-private"
    ]));
    expect(decision.ready).toBe(false);
    expect(decision.missingFields).toEqual(expect.arrayContaining([
      "consentReleaseRecord",
      "domainReviewer:RE/minors",
      "musicRightsBasis",
      "domainReviewer:music-rights",
      "domainReviewer:pastoral-sensitivity",
      "pastoralSensitivityNote"
    ]));
    expect(disabledReason).toMatch(/Consent\/release record missing/);
    expect(disabledReason).toMatch(/Music\/teaching rights basis missing/);
  });

  it("keeps AI and smart suggestions as non-final review debt", () => {
    const suggested = asset({
      aiVisibleTagSuggestions: ["baptism"],
      suggestedTags: ["worship-ready"],
      controlledVocabularySource: "review-suggestion",
      humanAiDecision: undefined
    });

    expect(missingDomainReviewEvidence(suggested, "Approve Public", completeChecklist, "Evidence note with enough detail.")).toContain("humanAiDecision");
    expect(buildPortalReuseDecision(suggested, "Viewer").reuse.state).not.toBe("portal-ready");

    const decided = { ...suggested, humanAiDecision: "edited by reviewer" };
    expect(missingDomainReviewEvidence(decided, "Approve Public", completeChecklist, "Evidence note with enough detail.")).not.toContain("humanAiDecision");
  });

  it("does not add domain blockers to non-public review actions", () => {
    const hymn = asset({
      hymnNumberOrTitle: "Hymn 469",
      rightsBasis: "unknown"
    });

    expect(missingDomainReviewEvidence(hymn, "Request More Info", completeChecklist, "Ask for music-rights proof.")).toEqual([]);
  });
});

describe("package governance and discovery", () => {
  it("blocks package publish when refs are unresolved or not portal ready", () => {
    const draft: DamPackage = {
      id: "pkg-1",
      title: "Sermon Pack",
      status: "draft",
      sections: [{ id: "hero", title: "Hero", resourceSpaceAssetIds: ["1001", "missing"] }]
    };
    const sections = resolvePackageSections(draft, [asset()]);
    const governance = buildPackageGovernance(draft, sections, "DAM Admin");

    expect(governance.canPreview).toBe(false);
    expect(governance.canPublish).toBe(false);
    expect(governance.missingRefs).toBe(1);
    expect(governance.auditMessage).toContain("missing");
  });

  it("expands ministry tag queries without exposing source details", () => {
    const discovery = buildDiscoveryQuery("sermon slides");

    expect(discovery.expandedTerms).toEqual(expect.arrayContaining(["bible", "worship"]));
    expect(matchesDiscoveryQuery(asset(), "sermon slides")).toBe(true);
  });

  it("exposes trust-aware query presets as discovery hints only", () => {
    const presetIds = queryIntentPresets.map((preset) => preset.id);
    expect(presetIds).toEqual(expect.arrayContaining([
      "website-hero",
      "slide-background",
      "newsletter",
      "social",
      "no-people",
      "youth-review",
      "worship",
      "music",
      "internal-only"
    ]));

    const blockedSocial = asset({
      id: "blocked-social",
      approvedChannels: ["social"],
      rightsBasis: undefined,
      rightsStatus: "Unknown",
      consentStatus: "Unknown",
      reviewer: undefined,
      reviewedDate: undefined,
      tags: ["social", "event"],
      tjcTerms: ["social media"]
    });
    const packet = buildCatalogDiscovery({
      query: "social",
      intent: "social",
      filters: [],
      matchedAssets: [blockedSocial],
      availableAssets: [blockedSocial],
      totalVisible: 1
    });

    expect(packet.matchedIntent?.id).toBe("social");
    expect(packet.intentPresets.find((preset) => preset.id === "social")?.suggestedFilters).toEqual(expect.arrayContaining(["portal ready", "social channel"]));
    expect(matchesCatalogFilter(blockedSocial, "social channel")).toBe(true);
    expect(matchesCatalogFilter(blockedSocial, "public safe")).toBe(false);
    expect(buildPortalReuseDecision(blockedSocial, "Viewer").viewerVerdict.canDownload).toBe(false);
    expect(packet.safetyNote).toMatch(/never grants|still pass|permission/i);
  });

  it("keeps youth review discovery separate from viewer permission truth", () => {
    const youth = asset({
      id: "youth-review",
      status: "Needs Review",
      usageScope: "Do Not Publish",
      peopleRisk: "Possible minors",
      consentStatus: "Needs review",
      rightsStatus: "Unknown",
      tags: ["youth", "students"]
    });
    const packet = buildCatalogDiscovery({
      query: "youth review",
      intent: "youth-review",
      filters: [],
      matchedAssets: [youth],
      availableAssets: [youth],
      totalVisible: 1
    });

    expect(packet.matchedIntent?.id).toBe("youth-review");
    expect(matchesDiscoveryQuery(youth, "youth review")).toBe(true);
    expect(matchesCatalogFilter(youth, "children/youth")).toBe(true);
    expect(canSeeAsset("Viewer", youth)).toBe(false);
    expect(buildPortalReuseDecision(youth, "Viewer").viewerVerdict.canDownload).toBe(false);
  });
});

describe("Phase 6 rights-aware packages and collections", () => {
  it("blocks package export and share when one item is not portal ready", () => {
    const ready = asset({ id: "ready", resourceSpaceId: "2001" });
    const blocked = asset({
      id: "blocked",
      resourceSpaceId: "2002",
      status: "Approved Public",
      rightsStatus: "Unknown",
      consentStatus: "Unknown",
      rightsBasis: undefined,
      approvedChannels: [],
      imageUrls: { small: "/s.jpg", card: "/c.jpg", collection: "/g.jpg", detail: "/d.jpg" }
    });
    const draft: DamPackage = {
      id: "pkg-blocked",
      title: "Blocked Package",
      status: "draft",
      sections: [{ id: "main", title: "Main", resourceSpaceAssetIds: ["2001", "2002"] }]
    };
    const governance = buildPackageGovernance(draft, resolvePackageSections(draft, [ready, blocked]), "DAM Admin");
    const exportAction = governance.actions.find((item) => item.action === "export-approved-copy-package");
    const shareAction = governance.actions.find((item) => item.action === "prepare-share-decision");

    expect(governance.canPublish).toBe(false);
    expect(governance.canShare).toBe(false);
    expect(exportAction).toMatchObject({ allowed: false, originalMasterIncluded: false, requiresApprovedCopyGate: true });
    expect(shareAction).toMatchObject({ allowed: false, originalMasterIncluded: false, durableShareStorage: false });
    expect(governance.blockerSummary.map((item) => item.category)).toEqual(expect.arrayContaining(["channel-mismatch", "missing-derivative"]));
  });

  it("keeps collection membership from overriding item-level policy", () => {
    const contextSafe = asset({
      id: "context",
      resourceSpaceId: "3001",
      reuseTier: "context-safe",
      collection: "Sabbath",
      rightsBasis: "TJC-owned",
      approvedChannels: ["website"]
    });
    const draft: DamPackage = {
      id: "pkg-collection",
      title: "Collection Package",
      status: "draft",
      collectionId: "sabbath-service",
      sections: [{ id: "collection", title: "Collection", resourceSpaceAssetIds: ["3001"] }]
    };
    const governance = buildPackageGovernance(draft, resolvePackageSections(draft, [contextSafe]), "Reviewer");

    expect(governance.canPublish).toBe(false);
    expect(governance.reason).toMatch(/Portal Ready/i);
    expect(governance.sections[0]?.assets[0]?.reuseState).not.toBe("portal-ready");
  });

  it("requires portal-ready approved-copy readiness instead of raw Approved Public", () => {
    const rawApproved = asset({
      id: "raw",
      resourceSpaceId: "4001",
      status: "Approved Public",
      rightsStatus: "Unknown",
      rightsBasis: undefined,
      approvedChannels: [],
      reviewer: undefined,
      reviewedDate: undefined,
      imageUrls: { small: "/small.jpg", card: "/card.jpg", collection: "/collection.jpg", detail: "/detail.jpg" }
    });
    const draft: DamPackage = {
      id: "pkg-raw",
      title: "Raw Approved Package",
      status: "draft",
      sections: [{ id: "raw", title: "Raw", resourceSpaceAssetIds: ["4001"] }]
    };
    const governance = buildPackageGovernance(draft, resolvePackageSections(draft, [rawApproved]), "DAM Admin");

    expect(rawApproved.status).toBe("Approved Public");
    expect(governance.portalReadyRefs).toBe(0);
    expect(governance.actions.find((item) => item.action === "export-approved-copy-package")?.allowed).toBe(false);
  });

  it("publishes a derivative readiness manifest while keeping originals request-only", () => {
    const ready = asset();
    const manifest = buildDeliveryReadinessManifest(ready, "public-web");
    const byId = Object.fromEntries(manifest.items.map((item) => [item.id, item]));

    expect(manifest).toMatchObject({
      assetId: ready.id,
      chosenUse: "public-web",
      portalReadyForChosenUse: true,
      originalMasterIncluded: false,
      storageTruth: "local-export-readiness-only"
    });
    expect(byId.thumbnail).toMatchObject({ status: "ready", routeBoundary: "thumbnail-preview", downloadGrade: false });
    expect(byId.preview).toMatchObject({ status: "ready", routeBoundary: "thumbnail-preview", downloadGrade: false });
    expect(byId["approved-web-copy"]).toMatchObject({ status: "ready", routeBoundary: "approved-copy-gate", downloadGrade: true });
    expect(byId["approved-print-copy"]).toMatchObject({ status: "blocked", routeBoundary: "approved-copy-gate", downloadGrade: true });
    expect(byId["original-restricted"]).toMatchObject({ status: "request-only", routeBoundary: "original-access-request" });
  });

  it("blocks package share, publish, and download when chosen-use derivative is not ready", () => {
    const webReady = asset({ id: "web-ready", resourceSpaceId: "6001" });
    const draft: DamPackage = {
      id: "pkg-print",
      title: "Print Package",
      status: "draft",
      sections: [{ id: "main", title: "Main", resourceSpaceAssetIds: ["6001"] }]
    };
    const governance = buildPackageGovernance(draft, resolvePackageSections(draft, [webReady]), "DAM Admin", "public-print");

    expect(governance.chosenUse).toBe("public-print");
    expect(governance.canShare).toBe(false);
    expect(governance.canPublish).toBe(false);
    expect(governance.canDownloadPackage).toBe(false);
    expect(governance.blockedRefs).toBe(1);
    expect(governance.reason).toMatch(/approved derivative for public print/i);
    expect(governance.sections[0]?.assets[0]?.deliveryManifest.originalMasterIncluded).toBe(false);
    expect(governance.sections[0]?.assets[0]?.deliveryManifest.items.find((item) => item.id === "original-restricted")?.status).toBe("request-only");
  });

  it("keeps brand readiness packet role-safe while disabling beta ZIP and share delivery", () => {
    const ready = asset({ id: "brand-ready", resourceSpaceId: "7001" });
    const governance = buildBrandKitGovernance({
      configured: true,
      assets: [ready],
      role: "Reviewer",
      missingSectionMappings: 0,
      warnings: []
    });

    expect(governance.deliveryReady).toBe(true);
    expect(governance.canShare).toBe(false);
    expect(governance.canDownloadKit).toBe(false);
    expect(governance.betaDeliveryDisabled).toBe(true);
    expect(governance.readinessPacket).toMatchObject({
      originalMasterIncluded: false,
      shareCreatesPublicLink: false,
      downloadCreatesZip: false,
      deliveryMode: "disabled-beta-packet"
    });
    expect(JSON.stringify(governance.readinessPacket)).not.toMatch(/sourcePath|masterDrivePath|checksumSha256|originalFilename/i);
  });

  it("redacts Viewer package payloads and package audit read models", () => {
    const privateAsset = asset({
      id: "private",
      resourceSpaceId: "5001",
      sourcePath: "/Shared Drives/private/source.jpg",
      masterDrivePath: "/Shared Drives/master/source.jpg",
      originalFilename: "source.jpg",
      checksumSha256: "secret-checksum"
    });
    const draft: DamPackage = {
      id: "pkg-redacted",
      title: "Redacted Package",
      status: "draft",
      sections: [{ id: "main", title: "Main", resourceSpaceAssetIds: ["5001"] }]
    };
    const governance = buildPackageGovernance(draft, resolvePackageSections(draft, [privateAsset]), "Viewer");
    const packageAsset = governance.sections[0]?.assets[0]?.asset;
    const audit = auditEventForRolePayload("Viewer", {
      id: "audit-package",
      createdAt: "2026-06-12T00:00:00.000Z",
      actor: "reviewer@example.org",
      ...packageDecisionAuditEvent({
        type: "package_export_blocked",
        role: "Reviewer",
        actor: "reviewer@example.org",
        packageId: "pkg-redacted",
        status: "blocked",
        totalRefs: 1,
        portalReadyRefs: 0,
        blockedRefs: 1,
        missingRefs: 0,
        reason: "Blocked by source evidence.",
        action: "export-approved-copy-package"
      }),
      details: {
        sourcePath: "/Shared Drives/private/source.jpg",
        masterDrivePath: "/Shared Drives/master/source.jpg",
        checksumSha256: "secret",
        signedUrl: "https://example.test/private?token=secret",
        originalMasterIncluded: false,
        approvedCopyGateRequired: true
      }
    });

    expect(packageAsset?.resourceSpaceId).toBeUndefined();
    expect(packageAsset?.sourcePath).toBeUndefined();
    expect(packageAsset?.masterDrivePath).toBeUndefined();
    expect(packageAsset?.originalFilename).toBeUndefined();
    expect(packageAsset?.checksumSha256).toBeUndefined();
    expect(audit.packageId).toBe("pkg-redacted");
    expect(audit.details?.sourcePath).toBeUndefined();
    expect(audit.details?.masterDrivePath).toBeUndefined();
    expect(audit.details?.checksumSha256).toBeUndefined();
    expect(audit.details?.signedUrl).toBeUndefined();
    expect(audit.details?.originalMasterIncluded).toBeUndefined();
    expect(audit.details?.approvedCopyGateRequired).toBe(true);
  });

  it("states local package storage is not durable production share storage", () => {
    expect(packageStorageReadiness()).toMatchObject({
      storageMode: "local-json",
      durableShareStorage: false,
      productionReadySharing: false,
      permissionTruth: false
    });
  });
});

describe("Phase 7 governance metrics primitives", () => {
  it("reports raw Approved Public as blocked when portal-ready gates fail", () => {
    const rawApproved = asset({
      id: "raw-approved",
      status: "Approved Public",
      rightsStatus: "Unknown",
      rightsBasis: undefined,
      approvedChannels: [],
      consentStatus: "Unknown",
      peopleRisk: "Unknown",
      reviewer: undefined,
      reviewedDate: undefined,
      imageUrls: { small: "/small.jpg", card: "/card.jpg", collection: "/collection.jpg", detail: "/detail.jpg" }
    });
    const youthSacrament = asset({
      id: "sensitive",
      status: "Needs Review",
      usageScope: "Do Not Publish",
      sensitivityClass: "sacrament-sensitive",
      doctrineSacramentTheme: "Holy Communion",
      peopleRisk: "Possible minors",
      consentReleaseRecordId: undefined,
      hymnNumberOrTitle: "Hymn 469",
      requiredNotice: undefined,
      withdrawalStatus: "takedown-requested",
      duplicateGroup: "dup-1",
      duplicateRole: "near duplicate"
    });

    const metrics = buildGovernanceMetrics({ assets: [rawApproved, youthSacrament] });
    const byId = Object.fromEntries(metrics.map((item) => [item.id, item]));

    expect(byId["raw-approved-blocked"]?.count).toBe(1);
    expect(byId["rights-review-backlog"]?.count).toBeGreaterThan(0);
    expect(byId["minors-consent-backlog"]?.count).toBeGreaterThan(0);
    expect(byId["doctrine-sacrament-backlog"]?.count).toBe(1);
    expect(byId["hymn-music-backlog"]?.count).toBe(1);
    expect(byId["required-notice-gaps"]?.count).toBe(1);
    expect(byId["withdrawal-takedown"]?.count).toBe(1);
    expect(byId["missing-derivatives"]?.count).toBeGreaterThan(0);
    expect(byId["duplicate-candidates"]?.count).toBe(1);
  });

  it("marks missing analytics and package sharing as unavailable instead of zero-success", () => {
    const metrics = buildGovernanceMetrics({
      assets: [asset()],
      usageAnalytics: { enabled: false, storageMode: "local-sqlite", totalEvents: 0 },
      packageDiagnostics: { count: 2, blockedRefs: 3, productionReadySharing: false }
    });
    const byId = Object.fromEntries(metrics.map((item) => [item.id, item]));

    expect(byId["usage-analytics"]).toMatchObject({ status: "unavailable", count: null });
    expect(byId["package-blockers"]).toMatchObject({ status: "available", count: 3 });
    expect(byId["package-durable-sharing"]).toMatchObject({ status: "unavailable", count: null });
    expect(usageHealthMetrics({ enabled: true, storageMode: "local-sqlite", totalEvents: 0 })).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "usage-zero-results", status: "unavailable", count: null })
    ]));
  });

  it("summarizes audit/download/package coverage without becoming permission truth", () => {
    const events: AuditEventRecord[] = [
      { id: "a1", type: "approved_download", createdAt: "2026-06-12T00:00:00.000Z", role: "Viewer", actor: "Viewer", status: "allowed", summary: "Approved copy downloaded." },
      { id: "a2", type: "denied_download", createdAt: "2026-06-12T00:01:00.000Z", role: "Viewer", actor: "Viewer", status: "denied", summary: "Denied." },
      { id: "a3", type: "package_export_blocked", createdAt: "2026-06-12T00:02:00.000Z", role: "Reviewer", actor: "Reviewer", status: "blocked", summary: "Blocked." },
      { id: "a4", type: "review_pending_write_queued", createdAt: "2026-06-12T00:03:00.000Z", role: "Reviewer", actor: "Reviewer", status: "queued", summary: "Queued." }
    ];
    const metrics = auditCoverageMetrics(events);
    const byId = Object.fromEntries(metrics.map((item) => [item.id, item]));

    expect(byId["audit-approved-downloads"]).toMatchObject({ count: 1, status: "available" });
    expect(byId["audit-blocked-downloads"]).toMatchObject({ count: 1, status: "available" });
    expect(byId["audit-package-decisions"]).toMatchObject({ count: 1, status: "available" });
    expect(byId["audit-review-throughput"]?.detail).toMatch(/portal audit/i);
  });
});

describe("Phase 3 mature DAM search primitives", () => {
  it("maps public-safe intent to portal-ready instead of raw Approved Public", () => {
    const intent = intentDefinitions.find((item) => item.terms.includes("public safe"));
    const view = savedViewDefinitions.find((item) => item.id === intent?.view);
    const portalReady = asset({
      rightsBasis: "TJC-owned",
      approvedChannels: ["website", "social"],
      reuseTier: "stock-safe",
      visibilityTier: "public",
      sensitivityClass: "public-safe",
      rightsNotes: "Rights approved for website and social use."
    });
    const rawApproved = asset({
      rightsBasis: undefined,
      approvedChannels: [],
      consentStatus: "Unknown",
      rightsStatus: "Unknown",
      rightsNotes: undefined
    });

    expect(intent?.view).toBe("portal-ready");
    expect(view?.match(portalReady)).toBe(true);
    expect(view?.match(rawApproved)).toBe(false);
    expect(matchesCatalogFilter(rawApproved, "approved public")).toBe(true);
    expect(matchesCatalogFilter(rawApproved, "public safe")).toBe(false);
  });

  it("keeps saved views behind role and per-asset visibility policy", () => {
    const reviewOnly = asset({
      status: "Needs Review",
      usageScope: "Do Not Publish",
      peopleRisk: "Unknown",
      rightsStatus: "Needs review",
      consentStatus: "Unknown"
    });
    const needsReviewView = savedViewDefinitions.find((item) => item.id === "needs-review");

    expect(needsReviewView?.match(reviewOnly)).toBe(true);
    expect(canSeeAsset("Viewer", reviewOnly)).toBe(false);
    expect(canSeeAsset("Reviewer", reviewOnly)).toBe(true);
  });

  it("matches mature facets without creating new approval truth", () => {
    const mature = asset({
      reuseTier: "context-safe",
      visibilityTier: "reviewer/admin",
      rightsBasis: "hymn-permission",
      approvedChannels: ["website", "projection"],
      sensitivityClass: "testimony-sensitive",
      consentStatus: "Unknown",
      church: "Elizabeth",
      region: "Northeast",
      language: "Chinese",
      fileExtension: "jpg",
      eventSeries: "Evangelical Service",
      withdrawalStatus: "embargoed",
      approvalRecheckDate: "2020-01-01"
    });

    expect(matchesCatalogFilter(mature, "context-safe")).toBe(true);
    expect(matchesCatalogFilter(mature, "website channel")).toBe(true);
    expect(matchesCatalogFilter(mature, "hymn permission")).toBe(true);
    expect(matchesCatalogFilter(mature, "testimony sensitive")).toBe(true);
    expect(matchesCatalogFilter(mature, "consent review")).toBe(true);
    expect(matchesCatalogFilter(mature, "region:northeast")).toBe(true);
    expect(matchesCatalogFilter(mature, "church:elizabeth")).toBe(true);
    expect(matchesCatalogFilter(mature, "language:chinese")).toBe(true);
    expect(matchesCatalogFilter(mature, "file:jpg")).toBe(true);
    expect(matchesCatalogFilter(mature, "event:evangelical")).toBe(true);
    expect(matchesCatalogFilter(mature, "embargoed")).toBe(true);
    expect(matchesCatalogFilter(mature, "public safe")).toBe(false);
  });

  it("keeps Viewer-safe payloads protected when search facets include private provenance", () => {
    const governed = asset({
      sourcePath: "/private/source.jpg",
      masterDrivePath: "/Shared Drives/master.jpg",
      checksumSha256: "secret-checksum",
      resourceSpaceId: "1001",
      sourceFolder: "/Shared Drives/private",
      importBatch: "Batch 01"
    });
    const viewer = assetForRolePayload("Viewer", governed);

    expect(matchesCatalogFilter(governed, "resourcespace")).toBe(true);
    expect(viewer.sourcePath).toBeUndefined();
    expect(viewer.masterDrivePath).toBeUndefined();
    expect(viewer.checksumSha256).toBeUndefined();
    expect(viewer.resourceSpaceId).toBeUndefined();
    expect(viewer.sourceFolder).toBeUndefined();
    expect(viewer.importBatch).toBeUndefined();
  });
});

describe("Phase 4 audit accountability primitives", () => {
  const auditEvent: AuditEventRecord = {
    id: "audit-1",
    type: "resourcespace_write_failed",
    createdAt: "2026-06-12T10:00:00.000Z",
    role: "Reviewer",
    actor: "reviewer@example.org",
    assetId: "asset-1",
    resourceSpaceId: "1001",
    status: "blocked",
    summary: "ResourceSpace write failed after source path check.",
    details: {
      sourcePath: "/Shared Drives/private/source.jpg",
      masterDrivePath: "/Shared Drives/master/source.jpg",
      checksumSha256: "secret-checksum",
      resourceSpaceInternalField: "field99",
      signedUrl: "https://example.test/signed?token=secret",
      originalFilename: "private-file.jpg",
      importBatch: "Batch 01",
      privateEvidence: "release note",
      privateNotes: "Pastoral details",
      action: "queued for review",
      reason: "writeback disabled"
    }
  };

  it("redacts audit read models for Viewer and Contributor", () => {
    const viewer = auditEventForRolePayload("Viewer", auditEvent);
    const contributor = auditEventForRolePayload("Contributor", auditEvent);

    expect(viewer.resourceSpaceId).toBeUndefined();
    expect(viewer.summary).toContain("media library");
    expect(viewer.details).toEqual({ action: "queued for review", reason: "writeback disabled" });
    expect(contributor.resourceSpaceId).toBeUndefined();
    expect(contributor.details).toEqual({ action: "queued for review", reason: "writeback disabled" });
  });

  it("keeps reviewer/admin audit summaries useful without exposing custody secrets", () => {
    const reviewer = auditEventForRolePayload("Reviewer", auditEvent);
    const admin = auditEventForRolePayload("DAM Admin", auditEvent);

    expect(reviewer.resourceSpaceId).toBe("1001");
    expect(reviewer.details).toEqual({
      action: "queued for review",
      reason: "writeback disabled"
    });
    expect(admin.resourceSpaceId).toBe("1001");
    expect(admin.details?.resourceSpaceInternalField).toBeUndefined();
    expect(admin.details?.sourcePath).toBeUndefined();
    expect(admin.details?.signedUrl).toBeUndefined();
    expect(admin.details?.privateEvidence).toBeUndefined();
  });

  it("classifies future accountability events without making audit a truth source", () => {
    const storage = auditStorageReadiness();

    expect(auditAccountabilityArea("original_access_requested")).toBe("original-access");
    expect(auditAccountabilityArea("rendition_request_recorded")).toBe("rendition");
    expect(auditAccountabilityArea("duplicate_candidate_reviewed")).toBe("duplicate");
    expect(storage).toMatchObject({
      mode: "local-runtime-jsonl",
      durable: false,
      productionReady: false,
      truthBoundary: "portal-accountability-only"
    });
  });
});

describe("Phase 5 governed rendition and original-access primitives", () => {
  it("keeps thumbnail and preview derivatives separate from approved-copy download readiness", () => {
    expect(governedRenditionPolicyForVariant("small")).toMatchObject({
      kind: "thumbnail",
      downloadGrade: false,
      routeBoundary: "thumbnail-preview"
    });
    expect(governedRenditionPolicyForVariant("detail")).toMatchObject({
      kind: "detail-preview",
      downloadGrade: false,
      routeBoundary: "thumbnail-preview"
    });
    expect(governedRenditionPolicyForVariant("download")).toMatchObject({
      kind: "approved-copy",
      downloadGrade: true,
      routeBoundary: "approved-copy-gate"
    });
    expect(thumbnailVariantCanSatisfyApprovedCopy("small")).toBe(false);
    expect(thumbnailVariantCanSatisfyApprovedCopy("detail")).toBe(false);
    expect(thumbnailVariantCanSatisfyApprovedCopy("download")).toBe(true);
  });

  it("blocks portal-ready reuse when approved-copy download derivative is missing", () => {
    const missingDownload = asset({
      imageUrls: {
        small: "/small.jpg",
        card: "/card.jpg",
        collection: "/collection.jpg",
        detail: "/detail.jpg"
      },
      rightsBasis: "TJC-owned",
      approvedChannels: ["website"],
      reuseTier: "stock-safe",
      visibilityTier: "public",
      sensitivityClass: "public-safe"
    });
    const decision = buildPortalReuseDecision(missingDownload, "Viewer");

    expect(decision.reuse.state).toBe("blocked-derivative");
    expect(decision.access.downloadApprovedCopy.allowed).toBe(false);
    expect(decision.reuse.blockers.map((item) => item.code)).toContain("blocked-derivative");
  });

  it("keeps original/master access request-only and separate from approved-copy downloads", () => {
    const ready = asset({
      rightsBasis: "TJC-owned",
      approvedChannels: ["website"],
      reuseTier: "stock-safe",
      visibilityTier: "public",
      sensitivityClass: "public-safe"
    });
    const boundary = approvedCopyAccessBoundary(ready, "DAM Admin");
    const adminOriginal = buildOriginalAccessRequestDecision("DAM Admin", ready);
    const viewerOriginal = buildOriginalAccessRequestDecision("Viewer", ready);
    const expiredOriginal = buildOriginalAccessRequestDecision("DAM Admin", ready, { status: "approved", expiresAt: "2020-01-01T00:00:00.000Z" }, new Date("2026-06-12T00:00:00.000Z"));

    expect(boundary.approvedCopyAllowed).toBe(true);
    expect(boundary.originalLiveAccessAllowed).toBe(false);
    expect(boundary.separateFromOriginalMaster).toBe(true);
    expect(adminOriginal).toMatchObject({ state: "requestable", liveAccessAllowed: false, requestOnly: true, audited: true, revocable: true });
    expect(viewerOriginal).toMatchObject({ state: "blocked", liveAccessAllowed: false });
    expect(expiredOriginal).toMatchObject({ state: "expired", liveAccessAllowed: false });
    expect(originalMasterRenditionPolicy()).toMatchObject({
      kind: "original-master-restricted",
      routeBoundary: "original-access-request"
    });
  });

  it("keeps rendition and original-access audit helpers redacted for Viewer/Contributor", () => {
    const originalEvent = originalAccessAuditEvent({
      type: "original_access_requested",
      role: "DAM Admin",
      actor: "admin@example.org",
      assetId: "asset-1",
      resourceSpaceId: "1001",
      status: "queued",
      requestState: "requestable",
      reason: "Need preservation copy for admin review.",
      approver: "DAM lead",
      expiresAt: "2026-06-13T00:00:00.000Z"
    });
    const renditionEvent = renditionRequestAuditEvent({
      role: "Reviewer",
      actor: "reviewer@example.org",
      assetId: "asset-1",
      resourceSpaceId: "1001",
      status: "blocked",
      renditionKind: "approved-copy",
      routeBoundary: "approved-copy-gate",
      reason: "Download derivative missing."
    });
    const viewer = auditEventForRolePayload("Viewer", {
      id: "audit-original",
      createdAt: "2026-06-12T00:00:00.000Z",
      actor: originalEvent.actor || "admin@example.org",
      ...originalEvent,
      details: {
        ...originalEvent.details,
        sourcePath: "/Shared Drives/private/master.jpg",
        checksumSha256: "secret",
        signedUrl: "https://example.test/private?token=secret",
        privateEvidence: "pastoral note"
      }
    });
    const contributor = auditEventForRolePayload("Contributor", {
      id: "audit-rendition",
      createdAt: "2026-06-12T00:00:00.000Z",
      actor: renditionEvent.actor || "reviewer@example.org",
      ...renditionEvent,
      details: {
        ...renditionEvent.details,
        originalFilename: "private-original.jpg",
        masterDrivePath: "/Shared Drives/master/private-original.jpg"
      }
    });

    expect(viewer.resourceSpaceId).toBeUndefined();
    expect(viewer.details?.sourcePath).toBeUndefined();
    expect(viewer.details?.checksumSha256).toBeUndefined();
    expect(viewer.details?.signedUrl).toBeUndefined();
    expect(viewer.details?.privateEvidence).toBeUndefined();
    expect(viewer.details?.liveGrantIssued).toBe(false);
    expect(contributor.resourceSpaceId).toBeUndefined();
    expect(contributor.details?.originalFilename).toBeUndefined();
    expect(contributor.details?.masterDrivePath).toBeUndefined();
    expect(contributor.details?.routeBoundary).toBe("approved-copy-gate");
  });

  it("states local derivative index is not a durable production rendition factory", () => {
    expect(derivativeIndexDiagnostics()).toMatchObject({
      durable: false,
      productionReadyFactory: false,
      storageMode: "local-runtime-filestore-index"
    });
  });
});

describe("launch readiness facts", () => {
  it("keeps launch readiness blocked when ResourceSpace writeback is not configured", () => {
    const integrations: IntegrationReadinessItem[] = [
      { id: "auth", label: "Auth", ready: true, detail: "Configured", owner: "Identity Provider", state: "Operational" },
      { id: "review-writes", label: "Review writes", ready: false, detail: "Not configured", owner: "ResourceSpace", state: "Not configured" },
      { id: "approved-copy-delivery", label: "Approved copies", ready: true, detail: "Configured", owner: "Amazon S3", state: "Operational" }
    ];

    const readiness = buildBetaReadiness({ integrations, assetCount: 1, portalReady: 1, auditRecent: [] });
    const writeback = readiness.facts.find((item) => item.id === "review-writes");
    const hosted181 = readiness.facts.find((item) => item.id === "hosted-181-record-proof");
    const boundary = readiness.facts.find((item) => item.id === "durable-fail-closed-boundary");
    const signoff = readiness.facts.find((item) => item.id === "team-beta-owner-signoff");

    expect(writeback?.ready).toBe(false);
    expect(writeback?.state).toBe("block");
    expect(hosted181?.state).toBe("block");
    expect(boundary?.state).toBe("block");
    expect(signoff?.state).toBe("block");
    expect(readiness.ready).toBe(false);
  });
});
