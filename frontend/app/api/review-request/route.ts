import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent, appendRequiredAuditEvent } from "@/lib/audit-log";
import { assetResourceRef } from "@/lib/asset-refs";
import { getAssetRecordById } from "@/lib/catalog";
import { createDamRouteSession } from "@/lib/dam-route-session";
import { createPendingReviewWrite, markPendingReviewWriteSyncFailed, pendingReviewWriteSummary } from "@/lib/pending-review-writes";
import { canReview, canSeeAsset } from "@/lib/permissions";
import { createAuditedAssetRequestRecord, requestRecordForRolePayload } from "@/lib/request-record-store";
import { normalizeAssetId, normalizeDisplayTextField, readJsonObject } from "@/lib/request-validation";
import { isRuntimeWriteBlockedError, runtimeWriteBlockedRouteError, type RuntimeStateCategory } from "@/lib/runtime-file-store";
import { buildReuseDecision } from "@/lib/reuse-policy";
import { initialReviewChecklistForAsset } from "@/lib/review-evidence";

export const dynamic = "force-dynamic";

type ReviewRequestBody = {
  role?: string;
  id?: string;
  notes?: string;
};

function runtimeCategoryFromError(error: unknown, fallback: RuntimeStateCategory) {
  if (!isRuntimeWriteBlockedError(error)) return fallback;
  const match = error.message.match(/^Durable runtime store required for production (.+) writes\.$/);
  return (match?.[1] || fallback) as RuntimeStateCategory;
}

function runtimeStoreRequiredRouteError(fallback: RuntimeStateCategory, error: unknown) {
  if (isRuntimeWriteBlockedError(error)) return runtimeWriteBlockedRouteError(runtimeCategoryFromError(error, fallback), error);
  return {
    status: 503 as const,
    body: {
      error: "Runtime store is required for this write.",
      reasonCode: "runtime-store-required",
      category: fallback,
      detail: error instanceof Error ? error.message : "Runtime store write failed."
    }
  };
}

export async function POST(request: NextRequest) {
  const body = await readJsonObject<ReviewRequestBody>(request);
  const session = createDamRouteSession(request, body.role);
  const role = session.role;
  const assetId = normalizeAssetId(body.id);

  if (!assetId) {
    return NextResponse.json({ error: "Missing asset id." }, { status: 400 });
  }

  const { asset, source } = await getAssetRecordById(assetId, role);
  if (!asset) {
    return NextResponse.json({ error: "Asset not found.", ...session.sourceEnvelope(source) }, { status: 404 });
  }

  if (!canSeeAsset(role, asset)) {
    appendAuditEvent({
      type: "review_denied",
      role,
      actor: session.identity.id,
      assetId,
      resourceSpaceId: assetResourceRef(asset),
      status: "denied",
      summary: "Review request denied for hidden asset.",
      details: { reason: "role-cannot-view-asset" }
    });
    return NextResponse.json({ error: "This role cannot request review for this asset.", ...session.sourceEnvelope(source) }, { status: 403 });
  }

  const resourceSpaceId = assetResourceRef(asset);
  const reuse = buildReuseDecision(asset);
  const note = normalizeDisplayTextField(
    body.notes,
    `DAM review requested from Asset Detail by ${session.identity.name || role}. Current decision: ${reuse.summary}`,
    1200
  );
  let pending: ReturnType<typeof createPendingReviewWrite>;
  try {
    pending = createPendingReviewWrite({
      asset,
      requestedStatus: "Needs Review",
      reviewerRole: "Reviewer",
      reviewerName: undefined,
      note,
      checklist: initialReviewChecklistForAsset(asset),
      blockers: reuse.blockers.map((item) => item.label)
    });
  } catch (error) {
    const blocked = runtimeStoreRequiredRouteError("pending-review-writes", error);
    return NextResponse.json(blocked.body, { status: blocked.status });
  }

  try {
    appendRequiredAuditEvent({
      type: "review_pending_write_queued",
      role,
      actor: session.identity.id,
      assetId,
      resourceSpaceId,
      status: "queued",
      summary: "Viewer DAM review request queued for reviewer follow-up.",
      details: {
        action: "Request DAM Review",
        requestedStatus: "Needs Review",
        pendingWriteId: pending.id
      }
    });
  } catch (error) {
    const blocked = runtimeStoreRequiredRouteError("audit-log", error);
    const detail = error instanceof Error ? error.message : "Audit write failed.";
    const failed = markPendingReviewWriteSyncFailed(
      pending.id,
      `Required audit failed after review request pending write was queued. ${detail}`
    );
    return NextResponse.json({
      ...blocked.body,
      error: "Review request was queued but required audit failed; fail closed.",
      reasonCode: "required-audit-failed-after-pending-write",
      pendingWriteId: pending.id,
      syncState: failed?.syncState || "sync_failed",
      partialFailure: true
    }, { status: blocked.status });
  }

  let requestRecord: Awaited<ReturnType<typeof createAuditedAssetRequestRecord>>;
  try {
    requestRecord = await createAuditedAssetRequestRecord({
      type: "DAM review",
      asset,
      actor: { id: session.identity.id, role },
      blocker: reuse.summary,
      requiredEvidence: ["Review reason", "Usage scope", "Reviewer note"],
      nextAction: "Reviewer completes evidence packet",
      linkedPendingWriteId: pending.id
    });
  } catch (error) {
    const blocked = runtimeStoreRequiredRouteError("request-records", error);
    const detail = error instanceof Error ? error.message : "Request record write failed.";
    const failed = markPendingReviewWriteSyncFailed(
      pending.id,
      `Request record failed after review request pending write was queued. ${detail}`
    );
    return NextResponse.json({
      ...blocked.body,
      error: "Review request was queued but required request record failed; fail closed.",
      reasonCode: "required-request-record-failed-after-pending-write",
      pendingWriteId: pending.id,
      syncState: failed?.syncState || "sync_failed",
      partialFailure: true
    }, { status: blocked.status });
  }

  session.recordUsage({
    type: "review_action",
    assetId,
    resourceSpaceId,
    route: "/api/review-request",
    metadata: { action: "Request DAM Review", requestedStatus: "Needs Review" }
  });

  const reviewerCanReview = canReview(role);
  const reviewerPayload = reviewerCanReview ? {
    pendingWriteId: pending.id,
    pendingWrite: pendingReviewWriteSummary(pending),
    syncState: pending.syncState,
    mode: "review-request-queue"
  } : {
    requestRecorded: true
  };

  return NextResponse.json({
    ok: true,
    id: assetId,
    message: reviewerCanReview
      ? "Review request queued for reviewer follow-up. ResourceSpace remains unchanged until a reviewer completes the decision."
      : "Review request sent to the media team. They will follow up before this asset is used.",
    ...reviewerPayload,
    requestRecord: requestRecordForRolePayload(role, requestRecord),
    ...session.sourceEnvelope(source)
  }, { status: 202 });
}
