import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-log";
import { assetResourceRef } from "@/lib/asset-refs";
import { getAssetRecordById } from "@/lib/catalog";
import { createDamRouteSession } from "@/lib/dam-route-session";
import { createPendingReviewWrite, pendingReviewWriteSummary } from "@/lib/pending-review-writes";
import { canReview, canSeeAsset } from "@/lib/permissions";
import { normalizeAssetId, normalizeDisplayTextField, readJsonObject } from "@/lib/request-validation";
import { buildReuseDecision } from "@/lib/reuse-policy";
import { initialReviewChecklistForAsset } from "@/lib/review-evidence";

export const dynamic = "force-dynamic";

type ReviewRequestBody = {
  role?: string;
  id?: string;
  notes?: string;
};

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
  const pending = createPendingReviewWrite({
    asset,
    requestedStatus: "Needs Review",
    reviewerRole: "Reviewer",
    reviewerName: undefined,
    note,
    checklist: initialReviewChecklistForAsset(asset),
    blockers: reuse.blockers.map((item) => item.label)
  });

  appendAuditEvent({
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
    ...session.sourceEnvelope(source)
  }, { status: 202 });
}
