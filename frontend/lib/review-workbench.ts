import type { EnterpriseStatus } from "@/lib/enterprise-status";
import { assetHasSourceProvenance, assetReviewedDate, assetRightsStatusLabel, buildDuplicateGroupCounts } from "@/lib/asset-governance";
import { buildReviewEvidenceDecision, reviewChecklistItems, reviewChecklistLabelByField, reviewDecisionMissingLabels, reviewEvidenceCompletion } from "@/lib/review-decision-presenter";
import type { MediaSourceStatus, ReviewEvidenceChecklist, StockMediaAsset } from "@/lib/types";
import { missingReviewEvidence } from "@/lib/review-evidence";
import { missingReviewFields, reviewGovernanceGroupsForAsset, reviewRiskFlags, type ReviewActionBackend } from "@/lib/workflow-policy";

export type ReviewDecisionAction = {
  id: string;
  label: string;
  helper: string;
  status: EnterpriseStatus;
  action: ReviewActionBackend;
  tone?: "approve" | "restrict";
  icon: "check" | "file" | "alert";
};

export const reviewWorkbenchTabs = ["Details", "Rights", "Comments", "Activity"];

export const reviewEvidenceGroups: Array<{
  title: string;
  fields: Array<keyof ReviewEvidenceChecklist>;
}> = [
  { title: "Rights/consent", fields: ["rightsConfirmed", "attributionConfirmed", "creditRequirementChecked"] },
  { title: "People/minors", fields: ["peopleVisibilityConfirmed", "childrenYouthChecked"] },
  { title: "Event/context", fields: ["sourceConfirmed", "proofLinkAttached", "sensitiveContextChecked"] },
  { title: "Usage scope", fields: ["usageScopeSelected", "derivativeAvailable", "expirationRereviewSet"] }
];

export const reviewDecisionActions: ReviewDecisionAction[] = [
  {
    id: "approve-public",
    label: "Approve public",
    helper: "Prepares reviewer follow-up. Source status stays unchanged until confirmed.",
    status: "Approved",
    action: "Approve Public",
    tone: "approve",
    icon: "check"
  },
  {
    id: "approve-internal",
    label: "Approve internal only",
    helper: "Prepares internal-use follow-up. Source status stays unchanged until confirmed.",
    status: "Approved",
    action: "Approve Internal",
    tone: "approve",
    icon: "check"
  },
  {
    id: "needs-more-info",
    label: "Needs more info",
    helper: "Send back to uploader for updates.",
    status: "Needs Review",
    action: "Request More Info",
    icon: "file"
  },
  {
    id: "missing-consent",
    label: "Missing Consent",
    helper: "Require release or consent evidence before reuse.",
    status: "Missing Consent",
    action: "Request More Info",
    icon: "alert"
  },
  {
    id: "restrict",
    label: "Restrict / do not publish",
    helper: "Limit or block usage of this asset.",
    status: "Restricted",
    action: "Do Not Use",
    tone: "restrict",
    icon: "alert"
  }
];

export type PendingReviewDecisionSummary = {
  status: EnterpriseStatus;
  message: string;
  action: string;
};

export type ReviewSourceReadState = "checking" | "readable" | "disconnected" | "error";

export type ReviewWorkbenchState =
  | "loading"
  | "reviewer-access-needed"
  | "review-queue-needs-attention"
  | "review-paused"
  | "no-uploads-waiting"
  | "search-empty"
  | "ready";

export function reviewSourceReadState({
  source,
  live,
  error,
  loading
}: {
  source?: MediaSourceStatus | null;
  live?: boolean;
  error?: string | null;
  loading?: boolean;
}): ReviewSourceReadState {
  if (loading) return "checking";
  if (error) return "error";
  if (!source || source.adapter === "demo-fallback" || source.adapter === "media-library") return "disconnected";
  if (live || source.live || source.readOnly) return "readable";
  return "readable";
}

export function buildReviewWorkbenchState({
  roleReady,
  accessAllowed,
  loading,
  error,
  source,
  live,
  batchCount,
  filteredBatchCount = batchCount
}: {
  roleReady: boolean;
  accessAllowed: boolean;
  loading: boolean;
  error?: string | null;
  source?: MediaSourceStatus | null;
  live?: boolean;
  batchCount: number;
  filteredBatchCount?: number;
}): ReviewWorkbenchState {
  if (!roleReady || loading) return "loading";
  if (!accessAllowed) return "reviewer-access-needed";
  const sourceState = reviewSourceReadState({ source, live, error });
  if (sourceState === "error") return "review-queue-needs-attention";
  if (sourceState === "disconnected") return "review-paused";
  if (!batchCount) return "no-uploads-waiting";
  if (!filteredBatchCount) return "search-empty";
  return "ready";
}

export type ReviewMetricTone = "neutral" | "warning" | "ready";

export type ReviewQueueMetric = {
  label: string;
  value: string;
  detail: string;
  tone: ReviewMetricTone;
};

export type ReviewSignal = {
  label: string;
  count: number;
};

export type ReviewDecisionLane = {
  label: string;
  blocked: boolean;
  detail: string;
};

export type ReviewQueueIntelligence = {
  label: string;
  value: string;
  detail: string;
  tone: "risk" | "sync" | "ready";
};

export type ReviewQueueNextMove = {
  title: string;
  detail: string;
  action: string;
  tone: "risk" | "sync" | "ready";
};

function reviewDateValue(asset: StockMediaAsset) {
  return Date.parse(asset.importDate || asset.capturedDate || assetReviewedDate(asset) || "") || 0;
}

export function reviewWaitingDays(asset?: StockMediaAsset, now = Date.now()) {
  if (!asset) return 0;
  const value = reviewDateValue(asset);
  if (!value) return 0;
  return Math.max(0, Math.floor((now - value) / 86_400_000));
}

export function checklistActionLabel(field: keyof ReviewEvidenceChecklist, complete: boolean) {
  if (complete) return "View evidence";
  if (field === "proofLinkAttached") return "Add evidence";
  if (field === "rightsConfirmed" || field === "attributionConfirmed" || field === "creditRequirementChecked") return "Add evidence";
  if (field === "peopleVisibilityConfirmed" || field === "childrenYouthChecked" || field === "sensitiveContextChecked" || field === "expirationRereviewSet") return "Record reviewer decision";
  if (field === "sourceConfirmed" || field === "usageScopeSelected" || field === "derivativeAvailable") return "Open evidence";
  return "Add evidence";
}

function rightsEvidenceMissing(asset: StockMediaAsset) {
  const missing = missingReviewFields(asset);
  return missing.includes("consent") || missing.includes("rights notes") || reviewRiskFlags(asset).includes("Rights unclear");
}

export function buildReviewQueueMetrics(assets: StockMediaAsset[]): ReviewQueueMetric[] {
  const rightsUnclear = assets.filter((asset) => /unknown|needs review|review required|missing|unclear/i.test(`${assetRightsStatusLabel(asset)} ${asset.consentStatus || ""}`)).length;
  const missingEvidence = assets.filter((asset) => missingReviewFields(asset).length > 0).length;
  const likelyReady = assets.filter((asset) => reviewMetadataCompleteness(asset).percent >= 75 && missingReviewFields(asset).length <= 1).length;
  return [
    { label: "Needs review", value: assets.length.toLocaleString(), detail: "Records in current queue", tone: "neutral" },
    { label: "Rights unclear", value: rightsUnclear.toLocaleString(), detail: "Rights or consent require reviewer attention", tone: rightsUnclear ? "warning" : "ready" },
    { label: "Missing evidence", value: missingEvidence.toLocaleString(), detail: "Exported metadata gaps remain", tone: missingEvidence ? "warning" : "ready" },
    { label: "Ready / likely ready", value: likelyReady.toLocaleString(), detail: "Strong metadata with few gaps", tone: likelyReady ? "ready" : "neutral" }
  ];
}

export function buildReviewSignals(assets: StockMediaAsset[]): ReviewSignal[] {
  const count = (matcher: (asset: StockMediaAsset) => boolean) => assets.filter(matcher).length;
  return [
    { label: "Missing copyright evidence", count: count(rightsEvidenceMissing) },
    { label: "People/minors status unresolved", count: count((asset) => !asset.peopleRisk || asset.peopleRisk === "Unknown" || asset.peopleRisk === "Possible minors") },
    { label: "Source access restricted", count: count((asset) => /restricted|read.?only|export/i.test(`${asset.sourceSystem || ""} ${asset.downloadPolicy || ""}`)) },
    { label: "Rights review needed", count: count((asset) => reviewRiskFlags(asset).includes("Rights unclear")) },
    { label: "Usage scope needed", count: count((asset) => !asset.usageScope || /unknown|review/i.test(asset.usageScope)) },
    { label: "Internal only", count: count((asset) => asset.status === "Approved Internal" || asset.usageScope === "Internal") },
    { label: "Archive candidates", count: count((asset) => asset.status === "Searchable Archive" || asset.usageScope === "Archive Only") },
    { label: "Duplicate candidates", count: count((asset) => reviewRiskFlags(asset).includes("Duplicate candidate") || reviewRiskFlags(asset).includes("Possible duplicate")) },
    { label: "Risk triage", count: count((asset) => reviewGovernanceGroupsForAsset(asset).some((group) => group.id === "risk" && group.active)) },
    { label: "Missing evidence", count: count((asset) => reviewGovernanceGroupsForAsset(asset).some((group) => group.id === "missing-evidence" && group.active)) },
    { label: "Stale review", count: count((asset) => reviewGovernanceGroupsForAsset(asset).some((group) => group.id === "stale-review" && group.active)) },
    { label: "Derivative gap", count: count((asset) => reviewGovernanceGroupsForAsset(asset).some((group) => group.id === "derivative-gap" && group.active)) },
    { label: "Pending write", count: count((asset) => reviewGovernanceGroupsForAsset(asset).some((group) => group.id === "pending-write" && group.active)) }
  ];
}

export function reviewNextCheckLabel(asset: StockMediaAsset) {
  const missing = missingReviewFields(asset);
  const risks = reviewRiskFlags(asset);
  if (missing.includes("source")) return "Verify source";
  if (missing.includes("people/minors")) return "Check people/minors";
  if (missing.includes("consent") || risks.includes("Rights unclear")) return "Confirm rights";
  if (missing.includes("usage guidance")) return "Add guidance";
  if (missing.includes("reviewer") || missing.includes("review date")) return "Record reviewer";
  return "Decision ready";
}

export function buildReviewDecisionLanes(asset: StockMediaAsset): ReviewDecisionLane[] {
  const missing = missingReviewFields(asset);
  const risks = reviewRiskFlags(asset);
  const lane = (label: string, blocked: boolean, detail: string): ReviewDecisionLane => ({ label, blocked, detail });
  return [
    lane("Rights", missing.includes("consent") || risks.includes("Rights unclear") || !asset.rightsStatus, asset.rightsStatus || "Rights evidence needed"),
    lane("People/minors", missing.includes("people/minors") || /child|youth|minor/i.test(asset.peopleRisk || ""), asset.peopleRisk || "Visibility unknown"),
    lane("Source", missing.includes("source"), missing.includes("source") ? "Source evidence needed" : "Source noted"),
    lane("Derivative", missing.includes("derivative"), asset.imageUrls?.download || asset.downloadPolicy.includes("approved-copy") ? "Approved copy available" : "Approved rendition missing"),
    lane("Usage", missing.includes("usage guidance"), asset.usageGuidance || asset.usageScope)
  ];
}

export function buildReviewDecisionRequirements(checklist: ReviewEvidenceChecklist, note: string) {
  const completion = reviewEvidenceCompletion(checklist, note);
  return {
    rows: completion.rows,
    completed: completion.completed,
    total: completion.total,
    missingLabels: completion.missingLabels,
    noteReady: note.trim().length > 10
  };
}

export function formatMissingReviewEvidence(missing: string[]) {
  return missing
    .map((field) => field === "reviewNote" ? "Review note added" : reviewChecklistLabelByField[field as keyof ReviewEvidenceChecklist] || field)
    .join(", ");
}

export function missingReviewActionEvidence(action: ReviewActionBackend, checklist: ReviewEvidenceChecklist, note: string) {
  return missingReviewEvidence(action, checklist, note);
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`;
}

function verbForCount(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function reviewQueueFacts(
  assets: StockMediaAsset[],
  pendingById: Record<string, PendingReviewDecisionSummary> = {}
) {
  const duplicateCounts = buildDuplicateGroupCounts(assets);
  const flagged = assets.map((asset) => ({ asset, flags: reviewRiskFlags(asset, duplicateCounts), missing: missingReviewFields(asset) }));
  const highRisk = flagged.filter(({ flags }) => flags.some((flag) => /children|youth|minor|rights|source|sensitive|stale/i.test(flag))).length;
  const likelyReady = flagged.filter(({ missing }) => missing.length <= 1).length;
  const pendingSync = assets.filter((asset) => pendingById[asset.id] || asset.pendingReviewWrite).length;
  const oldestDays = Math.max(0, ...assets.map((asset) => reviewWaitingDays(asset)));

  return { highRisk, likelyReady, pendingSync, oldestDays };
}

export function buildReviewQueueIntelligence(
  assets: StockMediaAsset[],
  pendingById: Record<string, PendingReviewDecisionSummary> = {}
): ReviewQueueIntelligence[] {
  const { highRisk, likelyReady, pendingSync, oldestDays } = reviewQueueFacts(assets, pendingById);

  return [
    {
      label: "Risk focus",
      value: highRisk.toLocaleString(),
      detail: highRisk ? `${countLabel(highRisk, "record")} ${verbForCount(highRisk, "needs", "need")} rights, source, people/youth, sensitive, or stale approval attention.` : "No elevated queue flags in this view.",
      tone: highRisk ? "risk" : "ready"
    },
    {
      label: "Likely ready",
      value: likelyReady.toLocaleString(),
      detail: likelyReady ? `${countLabel(likelyReady, "record")} ${verbForCount(likelyReady, "has", "have")} one or fewer exported metadata gaps; reviewer note may be last step.` : "Every record still has multiple exported evidence gaps.",
      tone: likelyReady ? "ready" : "risk"
    },
    {
      label: "Pending follow-up",
      value: pendingSync.toLocaleString(),
      detail: pendingSync ? "Portal decision exists for follow-up. Source status stays unchanged until media team confirmation." : "No pending portal review follow-up visible in this queue.",
      tone: pendingSync ? "sync" : "ready"
    },
    {
      label: "Oldest record age",
      value: oldestDays ? `${oldestDays}d` : "-",
      detail: oldestDays ? `Oldest visible record is ${oldestDays} day${oldestDays === 1 ? "" : "s"} old from exported dates.` : "No import/capture date exported for age math.",
      tone: oldestDays > 30 ? "risk" : "sync"
    }
  ];
}

export function buildReviewQueueNextMove(
  assets: StockMediaAsset[],
  pendingById: Record<string, PendingReviewDecisionSummary> = {}
): ReviewQueueNextMove {
  const { highRisk, likelyReady, pendingSync, oldestDays } = reviewQueueFacts(assets, pendingById);

  if (!assets.length) {
    return {
      title: "Queue clear",
      detail: "No reviewable records are visible in this queue. Check another queue before inviting testers to rely on this path.",
      action: "Check queue tabs",
      tone: "ready"
    };
  }

  if (pendingSync) {
    return {
      title: "Resolve pending follow-up first",
      detail: `${countLabel(pendingSync, "portal decision")} ${verbForCount(pendingSync, "is", "are")} waiting on media-team confirmation before another decision.`,
      action: "Review follow-up notes",
      tone: "sync"
    };
  }

  if (highRisk) {
    return {
      title: "Triage risk records first",
      detail: `${countLabel(highRisk, "record")} ${verbForCount(highRisk, "carries", "carry")} rights, source, people/youth, sensitive, or stale approval signals.`,
      action: "Open risk evidence",
      tone: "risk"
    };
  }

  if (oldestDays > 30) {
    return {
      title: "Triage oldest record",
      detail: `Oldest visible record is ${oldestDays} days old from exported dates. Sort oldest first, then request evidence or queue a decision.`,
      action: "Sort oldest first",
      tone: "risk"
    };
  }

  if (likelyReady) {
    return {
      title: "Finish likely-ready records",
      detail: `${countLabel(likelyReady, "record")} ${verbForCount(likelyReady, "has", "have")} one or fewer exported metadata gaps. Reviewer note may be final blocker.`,
      action: "Complete evidence",
      tone: "ready"
    };
  }

  return {
    title: "Request evidence before approval",
    detail: "Every record in this queue has multiple exported evidence gaps. Use Request Changes or source verification before public approval.",
    action: "Request evidence",
    tone: "risk"
  };
}

export function reviewMetadataCompleteness(asset?: StockMediaAsset) {
  if (!asset) return { completed: 0, total: 8, percent: 0, label: "No asset selected" };
  const rows = [
    assetHasSourceProvenance(asset) ? "source" : "",
    assetRightsStatusLabel(asset),
    asset.consentStatus,
    asset.peopleRisk && asset.peopleRisk !== "Unknown" ? asset.peopleRisk : "",
    asset.usageScope && asset.usageScope !== "Do Not Publish" ? asset.usageScope : "",
    asset.imageDimensions,
    asset.tags?.length || asset.tjcTerms?.length ? "taxonomy" : "",
    asset.imageUrls?.download || asset.downloadPolicy !== "not-downloadable" ? "derivative" : ""
  ];
  const completed = rows.filter(Boolean).length;
  const percent = Math.round((completed / rows.length) * 100);
  return { completed, total: rows.length, percent, label: `${completed}/${rows.length} fields` };
}

export function buildSelectedReviewGuidance({
  asset,
  checklist,
  comment,
  pending
}: {
  asset?: StockMediaAsset;
  checklist: ReviewEvidenceChecklist;
  comment: string;
  pending?: PendingReviewDecisionSummary;
}) {
  if (!asset) {
    return {
      riskFlags: [] as string[],
      missingFields: [] as string[],
      approveMissingLabels: [] as string[],
      nextBestAction: "Select a review record.",
      blockedExplanation: "Approval waits for selected asset evidence.",
      syncHonesty: "No source-system update has been confirmed.",
      syncTone: "sync" as const,
      approvalReady: false
    };
  }

  const approveDecision = buildReviewEvidenceDecision("Approve Public", checklist, comment, asset);
  const requestInfoDecision = buildReviewEvidenceDecision("Request More Info", checklist, comment);
  const riskFlags = reviewRiskFlags(asset);
  const missingFields = missingReviewFields(asset);
  const approveMissingLabels = approveDecision.missingLabels;
  const governanceGroups = reviewGovernanceGroupsForAsset(asset, Boolean(pending || asset.pendingReviewWrite));
  const firstMissing = approveMissingLabels[0] || missingFields[0];
  const nextBestAction = pending
    ? "Check pending source follow-up before making another decision."
    : approveDecision.ready
      ? "Prepare approval follow-up only if public scope, consent, people/youth, and proof notes match real evidence."
      : requestInfoDecision.ready && approveMissingLabels.length > 3
        ? "Request changes or source verification; public approval still lacks full evidence."
        : firstMissing
          ? `Complete evidence: ${firstMissing}.`
          : "Review evidence and choose safest workflow action.";

  return {
    riskFlags,
    missingFields,
    approveMissingLabels,
    approveDisabledReason: approveDecision.disabledReason,
    sensitiveMinistryEvidence: approveDecision.sensitiveMinistryEvidence,
    governanceGroups,
    nextBestAction,
    blockedExplanation: approveDecision.ready
      ? "Public approval is unblocked in portal UI, but source-system confirmation remains final approval truth."
      : `Public approval blocked by ${approveMissingLabels.slice(0, 5).join(", ")}${approveMissingLabels.length > 5 ? "..." : ""}.`,
    syncHonesty: pending
      ? pending.message
      : asset.pendingReviewWrite
        ? `Existing pending review follow-up ${asset.pendingReviewWrite.id} is ${asset.pendingReviewWrite.syncState}. Source status may not reflect this portal state yet.`
        : "No source-system update has been confirmed. Any decision prepares reviewer follow-up in this portal.",
    syncTone: pending || asset.pendingReviewWrite ? "sync" as const : "ready" as const,
    approvalReady: approveDecision.ready
  };
}
