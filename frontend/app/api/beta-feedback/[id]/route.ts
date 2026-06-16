import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-log";
import {
  betaFeedbackAdminDeniedAuditEvent,
  betaFeedbackAdminDeniedError,
  betaFeedbackPatchValidationError,
  betaFeedbackStorageRouteError,
  betaFeedbackStorageUnavailableError,
  betaFeedbackTriagedAuditEvent,
  buildBetaFeedbackPatchResponse,
  patchBetaFeedback,
  readBetaFeedbackPatchInput
} from "@/lib/beta-feedback";
import { canAdmin } from "@/lib/permissions";
import { requestIdentity } from "@/lib/request-identity";
import { normalizeFeedbackId } from "@/lib/request-validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = requestIdentity(request, request.nextUrl.searchParams.get("role"));
  if (!canAdmin(identity.role)) {
    const denied = betaFeedbackAdminDeniedError("update");
    appendAuditEvent(betaFeedbackAdminDeniedAuditEvent("update", identity.role, identity.id));
    return NextResponse.json(denied.body, { status: denied.status });
  }
  const storageUnavailable = betaFeedbackStorageUnavailableError();
  if (storageUnavailable) {
    return NextResponse.json(storageUnavailable.body, { status: storageUnavailable.status });
  }

  const id = normalizeFeedbackId((await params).id);
  const input = await readBetaFeedbackPatchInput(request);
  const validationError = betaFeedbackPatchValidationError(input);
  if (validationError) {
    return NextResponse.json(validationError.body, { status: validationError.status });
  }

  const record = await patchBetaFeedback(id, input.patch).catch((error: unknown) => {
    const storageError = betaFeedbackStorageRouteError(error, "write");
    if (storageError) return storageError;
    throw error;
  });
  if (record && "status" in record && "body" in record) {
    return NextResponse.json(record.body, { status: record.status });
  }
  if (!record) return NextResponse.json({ error: "Feedback record not found." }, { status: 404 });

  appendAuditEvent(betaFeedbackTriagedAuditEvent(record, identity.role, identity.id));

  return NextResponse.json(buildBetaFeedbackPatchResponse(record));
}
