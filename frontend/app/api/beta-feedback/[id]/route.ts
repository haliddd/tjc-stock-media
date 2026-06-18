import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-log";
import {
  betaFeedbackAdminDeniedAuditEvent,
  betaFeedbackAdminDeniedError,
  betaFeedbackDurableStorageRouteError,
  betaFeedbackPatchValidationError,
  betaFeedbackTriagedAuditEvent,
  buildBetaFeedbackPatchResponse,
  isBetaFeedbackDurableStorageError,
  patchBetaFeedback,
  readBetaFeedbackPatchInput
} from "@/lib/beta-feedback";
import { canAdmin } from "@/lib/permissions";
import { requestIdentity } from "@/lib/request-identity";
import { normalizeFeedbackId } from "@/lib/request-validation";
import { isRuntimeWriteBlockedError, runtimeWriteBlockedRouteError } from "@/lib/runtime-file-store";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const identity = requestIdentity(request, request.nextUrl.searchParams.get("role"));
  if (!canAdmin(identity.role)) {
    const denied = betaFeedbackAdminDeniedError("update");
    appendAuditEvent(betaFeedbackAdminDeniedAuditEvent("update", identity.role, identity.id));
    return NextResponse.json(denied.body, { status: denied.status });
  }

  const id = normalizeFeedbackId((await params).id);
  const input = await readBetaFeedbackPatchInput(request);
  const validationError = betaFeedbackPatchValidationError(input);
  if (validationError) {
    return NextResponse.json(validationError.body, { status: validationError.status });
  }

  let record: Awaited<ReturnType<typeof patchBetaFeedback>>;
  try {
    record = await patchBetaFeedback(id, input.patch);
  } catch (error) {
    if (isBetaFeedbackDurableStorageError(error)) {
      const blocked = betaFeedbackDurableStorageRouteError(error);
      return NextResponse.json(blocked.body, { status: blocked.status });
    }
    if (isRuntimeWriteBlockedError(error)) {
      const blocked = runtimeWriteBlockedRouteError("beta-feedback", error);
      return NextResponse.json(blocked.body, { status: blocked.status });
    }
    throw error;
  }
  if (!record) return NextResponse.json({ error: "Feedback record not found." }, { status: 404 });

  appendAuditEvent(betaFeedbackTriagedAuditEvent(record, identity.role, identity.id));

  return NextResponse.json(buildBetaFeedbackPatchResponse(record));
}
