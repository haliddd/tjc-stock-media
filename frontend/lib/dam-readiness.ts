import {
  assetHasChildrenYouthRisk,
  assetHasRenditionGap,
  assetHasTaxonomyDrift,
  assetIsDuplicateCandidate,
  assetIsPortalReady,
  assetNeedsAiEnrichment,
  assetNeedsReview,
  assetNeedsRightsReview,
  assetNeedsSourceReview,
  assetNeedsStaleApprovalReview,
  buildDuplicateGroupCounts
} from "@/lib/asset-governance";
import { auditLogDiagnostics } from "@/lib/audit-log";
import { buildBetaReadiness } from "@/lib/beta-readiness-facts";
import { buildFieldMappings, buildVocabulary } from "@/lib/dam-readiness-metadata";
import { getActiveMediaSource } from "@/lib/media-source";
import { buildIntegrationReadiness } from "@/lib/dam-readiness-integrations";
import type { AuditEventRecord } from "@/lib/audit-log";
import type { createDamRouteSession } from "@/lib/dam-route-session";
import type { AdminActionItem, DamReadinessItem, DamReadinessResult } from "@/lib/types";

type DamRouteSession = ReturnType<typeof createDamRouteSession>;
type DamReadinessAuditEvent = Omit<AuditEventRecord, "id" | "createdAt" | "actor"> & { actor?: string };
type DamReadinessRouteError = {
  body: {
    error: string;
  };
  status: 403;
};

function ratio(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(values: number[]) {
  return values.length ? clampScore(values.reduce((sum, value) => sum + value, 0) / values.length) : 0;
}

function buildActionBacklog({
  needsReview,
  rightsReview,
  missingSource,
  childrenYouth,
  peopleUnknown,
  aiEnrichment,
  taxonomyDrift,
  renditionGaps,
  staleApprovals,
  duplicateCandidates
}: {
  needsReview: number;
  rightsReview: number;
  missingSource: number;
  childrenYouth: number;
  peopleUnknown: number;
  aiEnrichment: number;
  taxonomyDrift: number;
  renditionGaps: number;
  staleApprovals: number;
  duplicateCandidates: number;
}): AdminActionItem[] {
  const items: AdminActionItem[] = [
    {
      id: "write-mapping",
      severity: "critical",
      label: "ResourceSpace write mapping",
      count: needsReview,
      owner: "DAM Admin",
      action: "Map publish status, reviewer, date, notes, and audit fields before real approvals persist."
    },
    {
      id: "rights-review",
      severity: rightsReview ? "high" : "low",
      label: "Rights and consent review coverage",
      count: rightsReview,
      owner: "Reviewer",
      action: "Confirm rights status, consent, restrictions, and public-use notes before external reuse.",
      savedViewId: "rights-review"
    },
    {
      id: "missing-source",
      severity: missingSource ? "high" : "low",
      label: "Source traceability",
      count: missingSource,
      owner: "Contributor",
      action: "Attach source system, source account, album/path, or ResourceSpace source fields.",
      savedViewId: "missing-source"
    },
    {
      id: "children-youth",
      severity: childrenYouth ? "high" : "low",
      label: "Children/youth guardrail",
      count: childrenYouth,
      owner: "Reviewer",
      action: "Keep youth/minors media out of public portals until explicit review is recorded.",
      savedViewId: "children-youth-review"
    },
    {
      id: "people-review",
      severity: peopleUnknown ? "high" : "low",
      label: "People/minors unknown",
      count: peopleUnknown,
      owner: "Reviewer",
      action: "Mark people visible, no people, adults visible, or children/youth possible for every reusable asset.",
      savedViewId: "people-unknown"
    },
    {
      id: "renditions",
      severity: renditionGaps ? "medium" : "low",
      label: "Derivative readiness",
      count: renditionGaps,
      owner: "DAM Admin",
      action: "Confirm detail/download derivatives and dimensions so previews are not stretched or misleading.",
      savedViewId: "rendition-gaps"
    },
    {
      id: "metadata",
      severity: aiEnrichment || taxonomyDrift ? "medium" : "low",
      label: "Metadata enrichment",
      count: aiEnrichment + taxonomyDrift,
      owner: "Contributor",
      action: "Normalize useful titles, controlled TJC terms, visible tags, and use-case vocabulary.",
      savedViewId: "ai-enrichment"
    },
    {
      id: "governance-housekeeping",
      severity: staleApprovals || duplicateCandidates ? "medium" : "low",
      label: "Governance housekeeping",
      count: staleApprovals + duplicateCandidates,
      owner: "DAM Admin",
      action: "Review stale approvals and duplicate groups without losing source provenance.",
      savedViewId: "stale-approvals"
    }
  ];
  return items.sort((a, b) => {
    const weight = { critical: 0, high: 1, medium: 2, low: 3 };
    return weight[a.severity] - weight[b.severity] || b.count - a.count;
  });
}

function readinessItem(item: DamReadinessItem): DamReadinessItem {
  return {
    ...item,
    score: clampScore(item.score),
    tone: item.score >= 80 ? "ok" : item.score >= 55 ? "info" : "warn"
  };
}

export function damReadinessDeniedError(): DamReadinessRouteError {
  return { body: { error: "DAM readiness is available to DAM Admin role." }, status: 403 };
}

export function damReadinessDeniedAuditEvent(session: DamRouteSession): DamReadinessAuditEvent {
  return {
    type: "admin_readiness_denied",
    role: session.role,
    actor: session.identity.id,
    status: "denied",
    summary: "Governance readiness denied for non-admin role.",
    details: { reason: "role-cannot-admin" }
  };
}

export function damReadinessViewedAuditEvent(session: DamRouteSession): DamReadinessAuditEvent {
  return {
    type: "admin_readiness_viewed",
    role: session.role,
    actor: session.identity.id,
    status: "allowed",
    summary: "Governance readiness viewed."
  };
}

export async function getDamReadiness(): Promise<DamReadinessResult> {
  const { assets, status } = await getActiveMediaSource();
  const assetCount = assets.length;
  const duplicateGroupCounts = buildDuplicateGroupCounts(assets);

  const approvedPublic = assets.filter((asset) => asset.status === "Approved Public").length;
  const portalReady = assets.filter(assetIsPortalReady).length;
  const needsReview = assets.filter(assetNeedsReview).length;
  const rightsReview = assets.filter(assetNeedsRightsReview).length;
  const missingSource = assets.filter(assetNeedsSourceReview).length;
  const childrenYouth = assets.filter(assetHasChildrenYouthRisk).length;
  const peopleUnknown = assets.filter((asset) => !asset.peopleRisk || asset.peopleRisk === "Unknown").length;
  const aiEnrichment = assets.filter(assetNeedsAiEnrichment).length;
  const taxonomyDrift = assets.filter(assetHasTaxonomyDrift).length;
  const duplicateCandidates = assets.filter((asset) => assetIsDuplicateCandidate(asset, duplicateGroupCounts)).length;
  const renditionGaps = assets.filter(assetHasRenditionGap).length;
  const staleApprovals = assets.filter((asset) => assetNeedsStaleApprovalReview(asset)).length;
  const auditLog = auditLogDiagnostics();

  const sourceCoverage = 100 - ratio(missingSource, assetCount);
  const rightsCoverage = 100 - ratio(rightsReview, assetCount);
  const peopleCoverage = 100 - ratio(peopleUnknown, assetCount);
  const reviewFlow = 100 - ratio(needsReview, assetCount);
  const taxonomyScore = 100 - ratio(taxonomyDrift, assetCount);
  const enrichmentScore = 100 - ratio(aiEnrichment, assetCount);
  const portalScore = approvedPublic ? ratio(portalReady, approvedPublic) : 0;
  const duplicateScore = 100 - ratio(duplicateCandidates, assetCount);
  const staleScore = 100 - ratio(staleApprovals, assetCount);
  const renditionScore = 100 - ratio(renditionGaps, assetCount);
  const integrationReadiness = await buildIntegrationReadiness({ status, approvedPublic, portalReady, auditEvents: auditLog });

  const readiness = [
    readinessItem({
      id: "find",
      pillar: "Find",
      label: "Search quality",
      score: average([taxonomyScore, enrichmentScore]),
      detail: "Controlled vocabulary, metadata enrichment backlog, and useful titles.",
      action: "Clear taxonomy drift and enrichment queues.",
      savedViewId: "taxonomy-drift",
      tone: "info"
    }),
    readinessItem({
      id: "trust",
      pillar: "Trust",
      label: "Use confidence",
      score: average([sourceCoverage, rightsCoverage, peopleCoverage]),
      detail: "Source, rights, people/minors, consent, and review evidence.",
      action: "Fix missing source, rights review, and unknown people fields.",
      savedViewId: "rights-review",
      tone: "info"
    }),
    readinessItem({
      id: "review",
      pillar: "Review",
      label: "Reviewer workflow",
      score: reviewFlow,
      detail: "Assets should enter Needs Review, then leave with reviewer, date, notes, and status.",
      action: "Work pending review queue and required review fields.",
      savedViewId: "needs-review",
      tone: "info"
    }),
    readinessItem({
      id: "share",
      pillar: "Share",
      label: "Portal readiness",
      score: average([portalScore, renditionScore]),
      detail: "Public portals need approved assets, safe metadata, and approved derivatives.",
      action: "Fix portal-ready blockers and rendition gaps before public sharing.",
      savedViewId: "portal-ready",
      tone: "info"
    }),
    readinessItem({
      id: "govern",
      pillar: "Govern",
      label: "Archive control",
      score: average([duplicateScore, staleScore, taxonomyScore]),
      detail: "Duplicates, stale approvals, taxonomy drift, and source traceability stay visible.",
      action: "Resolve duplicate cleanup, stale approvals, and vocabulary drift.",
      savedViewId: "duplicate-candidates",
      tone: "info"
    })
  ];

  return {
    source: status,
    score: average(readiness.map((item) => item.score)),
    assetCount,
    metrics: {
      approvedPublic,
      portalReady,
      needsReview,
      rightsReview,
      missingSource,
      childrenYouth,
      aiEnrichment,
      taxonomyDrift,
      duplicateCandidates,
      renditionGaps,
      staleApprovals
    },
    readiness,
    fieldMappings: buildFieldMappings(assets),
    vocabulary: buildVocabulary(assets),
    portalPolicy: [
      {
        id: "approval",
        label: "Approved Public only",
        blocked: Math.max(0, assetCount - approvedPublic),
        detail: "Public portals should exclude anything not approved public.",
        savedViewId: "approved-church-wide"
      },
      {
        id: "rights",
        label: "Rights clear",
        blocked: rightsReview,
        detail: "Rights review must be clear before external reuse.",
        savedViewId: "rights-review"
      },
      {
        id: "source",
        label: "Source traceable",
        blocked: missingSource,
        detail: "Source system, album, path, or owner must be traceable.",
        savedViewId: "missing-source"
      },
      {
        id: "children",
        label: "Children/youth guarded",
        blocked: childrenYouth,
        detail: "Children/youth assets require explicit review before public use.",
        savedViewId: "children-youth-review"
      },
      {
        id: "renditions",
        label: "Derivatives ready",
        blocked: renditionGaps,
        detail: "Approved download/detail derivatives must exist for sharing.",
        savedViewId: "rendition-gaps"
      },
      {
        id: "stale",
        label: "Approval current",
        blocked: staleApprovals,
        detail: "Old approvals need periodic recheck.",
        savedViewId: "stale-approvals"
      }
    ],
    actionBacklog: buildActionBacklog({
      needsReview,
      rightsReview,
      missingSource,
      childrenYouth,
      peopleUnknown,
      aiEnrichment,
      taxonomyDrift,
      renditionGaps,
      staleApprovals,
      duplicateCandidates
    }),
    integrationReadiness,
    betaReadiness: buildBetaReadiness({
      integrations: integrationReadiness,
      assetCount,
      portalReady,
      auditRecent: auditLog.recent
    }),
    auditLog
  };
}
