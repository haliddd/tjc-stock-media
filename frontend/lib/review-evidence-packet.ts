import { assetResourceRef } from "@/lib/asset-refs";
import { normalizeDisplayTextField } from "@/lib/request-validation";
import { buildReviewEvidenceDecision, normalizeReviewChecklist, queuePendingReviewDecision, queuePendingReviewDecisionAsync } from "@/lib/review-decision";
import type { ReviewActionBackend, reviewActions } from "@/lib/workflow-policy";
import type { DemoRole, ReviewEvidenceChecklist, StockMediaAsset, UsageScope } from "@/lib/types";

type ReviewActionDefinition = (typeof reviewActions)[number];
type ApprovalReviewEvidence = {
  reviewerName: string;
  reviewDate: string;
  approvalScope: UsageScope | "";
};

export type ReviewEvidencePacket = {
  asset: StockMediaAsset;
  action: ReviewActionBackend;
  actionDefinition?: ReviewActionDefinition;
  label: string;
  note: string;
  checklist: ReviewEvidenceChecklist;
  requestedStatus: string;
  resourceSpaceId: string;
  decision: ReturnType<typeof buildReviewEvidenceDecision>;
  approvalEvidence: ApprovalReviewEvidence;
  missingEvidence: string[];
  missingEvidenceLabels: string[];
  blocked: boolean;
  disabledReason: string;
};

export type BuildReviewEvidencePacketInput = {
  asset: StockMediaAsset;
  action: ReviewActionBackend;
  actionDefinition?: ReviewActionDefinition;
  label?: unknown;
  note?: unknown;
  checklist?: unknown;
  reviewerName?: unknown;
  reviewDate?: unknown;
  approvalScope?: unknown;
};

export type QueueReviewEvidencePacketInput = {
  packet: ReviewEvidencePacket;
  role: DemoRole;
  reviewerName?: string;
};

const approvalActions = new Set<ReviewActionBackend>(["Approve Public", "Approve Internal"]);
const usageScopes: UsageScope[] = ["Public", "Internal", "Public and Internal", "Archive Only", "Do Not Publish", "Do Not Use"];

function normalizeUsageScope(value: unknown): UsageScope | "" {
  return usageScopes.includes(value as UsageScope) ? value as UsageScope : "";
}

function validReviewDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed)) return false;
  const today = new Date().toISOString().slice(0, 10);
  return value <= today;
}

function approvalEvidenceMissing(action: ReviewActionBackend, evidence: ApprovalReviewEvidence) {
  if (!approvalActions.has(action)) return [];
  const missing: string[] = [];
  if (evidence.reviewerName.trim().length < 2) missing.push("reviewerName");
  if (!validReviewDate(evidence.reviewDate)) missing.push("reviewDate");
  if (!evidence.approvalScope) missing.push("approvalScope");
  if (action === "Approve Public" && evidence.approvalScope && !["Public", "Public and Internal"].includes(evidence.approvalScope)) {
    missing.push("publicApprovalScope");
  }
  if (action === "Approve Internal" && evidence.approvalScope && !["Internal", "Public and Internal"].includes(evidence.approvalScope)) {
    missing.push("internalApprovalScope");
  }
  return missing;
}

const approvalEvidenceLabels: Record<string, string> = {
  reviewerName: "Reviewer name missing",
  reviewDate: "Review date missing or future",
  approvalScope: "Approval usage scope missing",
  publicApprovalScope: "Public approval requires Public or Public and Internal scope",
  internalApprovalScope: "Internal approval requires Internal or Public and Internal scope"
};

export function buildReviewEvidencePacket(input: BuildReviewEvidencePacketInput): ReviewEvidencePacket {
  const note = normalizeDisplayTextField(input.note, "", 1200);
  const label = normalizeDisplayTextField(input.label, "", 120) || input.action;
  const checklist = normalizeReviewChecklist(input.checklist);
  const decision = buildReviewEvidenceDecision(input.action, checklist, note, input.asset);
  const approvalEvidence: ApprovalReviewEvidence = {
    reviewerName: normalizeDisplayTextField(input.reviewerName, "", 120),
    reviewDate: normalizeDisplayTextField(input.reviewDate, "", 20),
    approvalScope: normalizeUsageScope(input.approvalScope)
  };
  const approvalMissing = approvalEvidenceMissing(input.action, approvalEvidence);
  const missingEvidence = Array.from(new Set([...decision.missingFields, ...approvalMissing]));
  const missingEvidenceLabels = Array.from(new Set([
    ...decision.missingLabels,
    ...approvalMissing.map((item) => approvalEvidenceLabels[item] || item)
  ]));
  const disabledReason = missingEvidenceLabels.length
    ? `Missing: ${missingEvidenceLabels.slice(0, 5).join(", ")}${missingEvidenceLabels.length > 5 ? "..." : ""}`
    : "";
  return {
    asset: input.asset,
    action: input.action,
    actionDefinition: input.actionDefinition,
    label,
    note,
    checklist: decision.checklist,
    requestedStatus: input.actionDefinition?.targetStatus || input.asset.status,
    resourceSpaceId: assetResourceRef(input.asset),
    decision,
    approvalEvidence,
    missingEvidence,
    missingEvidenceLabels,
    blocked: missingEvidence.length > 0,
    disabledReason
  };
}

export function reviewEvidencePacketBlockedAuditEvent(packet: ReviewEvidencePacket, role: DemoRole, actor: string) {
  return {
    type: "review_evidence_incomplete" as const,
    role,
    actor,
    assetId: packet.asset.id,
    resourceSpaceId: packet.resourceSpaceId,
    status: "blocked" as const,
    summary: "Review decision blocked by missing evidence.",
    details: {
      action: packet.action,
      missingEvidence: packet.missingEvidence
    }
  };
}

export function reviewEvidencePacketBlockedBody(packet: ReviewEvidencePacket) {
  return {
    error: "Review evidence is incomplete.",
    disabledReason: packet.disabledReason,
    missingEvidence: packet.missingEvidence,
    missingEvidenceLabels: packet.missingEvidenceLabels
  };
}

export function queueReviewEvidencePacketDecision(input: QueueReviewEvidencePacketInput) {
  const reviewEvidenceNote = approvalActions.has(input.packet.action)
    ? [
        `Reviewer: ${input.packet.approvalEvidence.reviewerName}`,
        `Review date: ${input.packet.approvalEvidence.reviewDate}`,
        `Usage scope: ${input.packet.approvalEvidence.approvalScope}`,
        input.packet.note
      ].filter(Boolean).join("\n")
    : input.packet.note;
  return queuePendingReviewDecision({
    asset: input.packet.asset,
    requestedStatus: input.packet.requestedStatus,
    role: input.role,
    reviewerName: input.packet.approvalEvidence.reviewerName || input.reviewerName,
    note: reviewEvidenceNote,
    checklist: input.packet.checklist
  });
}

export async function queueReviewEvidencePacketDecisionAsync(input: QueueReviewEvidencePacketInput) {
  const reviewEvidenceNote = approvalActions.has(input.packet.action)
    ? [
        `Reviewer: ${input.packet.approvalEvidence.reviewerName}`,
        `Review date: ${input.packet.approvalEvidence.reviewDate}`,
        `Usage scope: ${input.packet.approvalEvidence.approvalScope}`,
        input.packet.note
      ].filter(Boolean).join("\n")
    : input.packet.note;
  return queuePendingReviewDecisionAsync({
    asset: input.packet.asset,
    requestedStatus: input.packet.requestedStatus,
    role: input.role,
    reviewerName: input.packet.approvalEvidence.reviewerName || input.reviewerName,
    note: reviewEvidenceNote,
    checklist: input.packet.checklist
  });
}

export function reviewEvidencePacketQueuedAuditEvent(packet: ReviewEvidencePacket, role: DemoRole, actor: string, pendingWriteId: string) {
  return {
    type: "review_pending_write_queued" as const,
    role,
    actor,
    assetId: packet.asset.id,
    resourceSpaceId: packet.resourceSpaceId,
    status: "queued" as const,
    summary: "Review decision queued for media-team follow-up.",
    details: {
      action: packet.action,
      requestedStatus: packet.requestedStatus,
      pendingWriteId,
      reviewerName: packet.approvalEvidence.reviewerName || null,
      reviewDate: packet.approvalEvidence.reviewDate || null,
      approvalScope: packet.approvalEvidence.approvalScope || null
    }
  };
}

export function reviewEvidencePacketAuditRecord(packet: ReviewEvidencePacket, role: DemoRole, actor: string, timestamp: string) {
  return {
    assetId: packet.asset.id,
    resourceSpaceId: packet.resourceSpaceId,
    previousStatus: packet.asset.status,
    requestedStatus: packet.requestedStatus,
    actor,
    reviewerRole: role,
    reviewerName: packet.approvalEvidence.reviewerName || undefined,
    reviewDate: packet.approvalEvidence.reviewDate || undefined,
    approvalScope: packet.approvalEvidence.approvalScope || undefined,
    timestamp,
    notes: packet.note,
    checklist: packet.checklist,
    blockers: [] as string[]
  };
}
