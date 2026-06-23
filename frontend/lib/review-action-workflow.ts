import { appendAuditEvent } from "@/lib/audit-log";
import { getAssetRecordById } from "@/lib/catalog";
import { createDamWorkflowSession } from "@/lib/dam-route-session";
import { sourceEnvelope } from "@/lib/media-source/session";
import { updateResourceReviewStatus } from "@/lib/media-source/resourcespace-api";
import { canReview } from "@/lib/permissions";
import { normalizeAssetId, readJsonObject } from "@/lib/request-validation";
import {
  buildReviewEvidencePacket,
  queueReviewEvidencePacketDecisionAsync,
  reviewEvidencePacketAuditRecord,
  reviewEvidencePacketBlockedAuditEvent,
  reviewEvidencePacketBlockedBody,
  reviewEvidencePacketQueuedAuditEvent
} from "@/lib/review-evidence-packet";
import { recordUsageEvent } from "@/lib/usage-analytics";
import { isReviewActionBackend, reviewActions, type ReviewActionBackend } from "@/lib/workflow-policy";
import type { NextRequest } from "next/server";
import type { ReviewEvidenceChecklist } from "@/lib/types";

export type ReviewActionRequestBody = {
  role?: string;
  id?: string;
  action?: ReviewActionBackend;
  label?: string;
  notes?: string;
  checklist?: Partial<ReviewEvidenceChecklist>;
  reviewerName?: string;
  reviewDate?: string;
  approvalScope?: string;
};

export type ReviewActionWorkflowResult = {
  status: number;
  body: Record<string, unknown>;
};

export async function readReviewActionRequestBody(request: { json(): Promise<unknown> }): Promise<ReviewActionRequestBody> {
  return readJsonObject<ReviewActionRequestBody>(request);
}

export async function runReviewActionWorkflow(request: NextRequest, body: ReviewActionRequestBody): Promise<ReviewActionWorkflowResult> {
  const session = createDamWorkflowSession(request, body.role);
  const identity = session.identity;
  const role = identity.role;
  const assetId = normalizeAssetId(body.id);

  if (!canReview(role)) {
    appendAuditEvent({
      type: "review_denied",
      role,
      actor: identity.id,
      assetId: assetId || undefined,
      status: "denied",
      summary: "Review action denied for role.",
      details: { action: body.action || null, reason: "role-cannot-review" }
    });
    return { status: 403, body: { error: "Reviewer controls are unavailable for this role." } };
  }

  if (!assetId || !body.action) {
    return { status: 400, body: { error: "Missing asset id or review action." } };
  }
  if (!isReviewActionBackend(body.action)) {
    return { status: 400, body: { error: "Unsupported review action." } };
  }

  const { asset, source } = await getAssetRecordById(assetId);
  const envelope = sourceEnvelope(source);
  if (!asset) {
    return { status: 404, body: { error: "Asset not found.", ...envelope } };
  }

  const action = reviewActions.find((item) => item.backend === body.action);
  const packet = buildReviewEvidencePacket({
    asset,
    action: body.action,
    actionDefinition: action,
    label: body.label,
    note: body.notes,
    checklist: body.checklist,
    reviewerName: body.reviewerName,
    reviewDate: body.reviewDate,
    approvalScope: body.approvalScope
  });
  if (packet.blocked) {
    appendAuditEvent(reviewEvidencePacketBlockedAuditEvent(packet, role, identity.id));
    return {
      status: 400,
      body: {
        ...reviewEvidencePacketBlockedBody(packet),
        ...envelope
      }
    };
  }

  let pending: Awaited<ReturnType<typeof queueReviewEvidencePacketDecisionAsync>>;
  try {
    pending = await queueReviewEvidencePacketDecisionAsync({
      packet,
      role,
      reviewerName: body.reviewerName,
    });
  } catch (error) {
    return {
      status: 503,
      body: {
        error: "Review decision could not be queued because required runtime storage is unavailable.",
        reasonCode: "runtime-store-required",
        detail: error instanceof Error ? error.message : "Runtime store write failed.",
        ...envelope
      }
    };
  }

  appendAuditEvent(reviewEvidencePacketQueuedAuditEvent(packet, role, identity.id, pending.id));
  const usageEvent = recordUsageEvent({
    type: "review_action",
    role,
    actor: identity.id,
    assetId: asset.id,
    resourceSpaceId: packet.resourceSpaceId,
    route: "/api/review",
    metadata: { action: packet.action, requestedStatus: packet.requestedStatus }
  });

  const sync = await updateResourceReviewStatus(pending);
  return {
    status: sync.ok ? 200 : 202,
    body: {
      ok: true,
      id: assetId,
      action: packet.action,
      label: packet.label,
      notes: packet.note,
      message: sync.ok
        ? "ResourceSpace review fields were updated through the live API."
        : `Review decision queued for media-team follow-up. Record status remains unchanged until review is completed. ${sync.message}`,
      pendingWriteId: pending.id,
      syncState: sync.ok ? "synced_to_resourcespace" : sync.record?.syncState || pending.syncState,
      sync,
      auditRecord: {
        ...reviewEvidencePacketAuditRecord(packet, role, identity.id, pending.createdAt),
        blockers: pending.blockers
      },
      usageRecord: {
        actor: identity.id,
        recorded: usageEvent.recorded,
        reason: usageEvent.reason
      },
      mode: sync.ok ? "resourcespace-live-writeback" : "review-follow-up-preview"
    }
  };
}
