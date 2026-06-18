import { assetResourceRef } from "@/lib/asset-refs";
import { normalizeDisplayTextField } from "@/lib/request-validation";
import { buildReviewEvidenceDecision, normalizeReviewChecklist, queuePendingReviewDecision } from "@/lib/review-decision";
import type { ReviewActionBackend, reviewActions } from "@/lib/workflow-policy";
import type { DemoRole, ReviewEvidenceChecklist, StockMediaAsset } from "@/lib/types";

type ReviewActionDefinition = (typeof reviewActions)[number];

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
};

export type QueueReviewEvidencePacketInput = {
  packet: ReviewEvidencePacket;
  role: DemoRole;
  reviewerName?: string;
};

export function buildReviewEvidencePacket(input: BuildReviewEvidencePacketInput): ReviewEvidencePacket {
  const note = normalizeDisplayTextField(input.note, "", 1200);
  const label = normalizeDisplayTextField(input.label, "", 120) || input.action;
  const checklist = normalizeReviewChecklist(input.checklist);
  const decision = buildReviewEvidenceDecision(input.action, checklist, note, input.asset);
  const missingEvidence = decision.missingFields;
  const missingEvidenceLabels = Array.from(new Set(decision.missingLabels));
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
    missingEvidence,
    missingEvidenceLabels,
    blocked: !decision.ready,
    disabledReason: decision.disabledReason
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
  return queuePendingReviewDecision({
    asset: input.packet.asset,
    requestedStatus: input.packet.requestedStatus,
    role: input.role,
    reviewerName: input.reviewerName,
    note: input.packet.note,
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
      pendingWriteId
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
    timestamp,
    notes: packet.note,
    checklist: packet.checklist,
    blockers: [] as string[]
  };
}
