import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-log";
import { betaFeedbackEnabled } from "@/lib/env";
import {
  betaFeedbackAdminDeniedAuditEvent,
  betaFeedbackAdminDeniedError,
  betaFeedbackDisabledError,
  betaFeedbackStorageUnavailableError,
  betaFeedbackSubmissionValidationError,
  betaFeedbackSubmittedAuditEvent,
  buildBetaFeedbackInboxResponse,
  buildBetaFeedbackSubmitResponse,
  createBetaFeedbackFromSubmission,
  listBetaFeedback,
  normalizeBetaFeedbackSubmission,
  readBetaFeedbackRequestInput
} from "@/lib/beta-feedback";
import { canAdmin } from "@/lib/permissions";
import { requestIdentity } from "@/lib/request-identity";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = requestIdentity(request, request.nextUrl.searchParams.get("role"));
  if (!canAdmin(identity.role)) {
    const denied = betaFeedbackAdminDeniedError("inbox");
    appendAuditEvent(betaFeedbackAdminDeniedAuditEvent("inbox", identity.role, identity.id));
    return NextResponse.json(denied.body, { status: denied.status });
  }
  const storageUnavailable = betaFeedbackStorageUnavailableError();
  if (storageUnavailable) {
    return NextResponse.json(storageUnavailable.body, { status: storageUnavailable.status });
  }
  const feedback = await listBetaFeedback();
  return NextResponse.json(buildBetaFeedbackInboxResponse(feedback));
}

export async function POST(request: NextRequest) {
  if (!betaFeedbackEnabled()) {
    const disabled = betaFeedbackDisabledError();
    return NextResponse.json(disabled.body, { status: disabled.status });
  }
  const storageUnavailable = betaFeedbackStorageUnavailableError();
  if (storageUnavailable) {
    return NextResponse.json(storageUnavailable.body, { status: storageUnavailable.status });
  }
  const { fields, file } = await readBetaFeedbackRequestInput(request);
  const submission = normalizeBetaFeedbackSubmission(fields, request.headers.get("user-agent"));
  const validationError = betaFeedbackSubmissionValidationError(submission);
  if (validationError) {
    return NextResponse.json(validationError.body, { status: validationError.status });
  }
  const identity = requestIdentity(request, submission.rawRole);
  const record = await createBetaFeedbackFromSubmission(submission, identity, file);

  appendAuditEvent(betaFeedbackSubmittedAuditEvent(record, identity.role, identity.id));

  return NextResponse.json(buildBetaFeedbackSubmitResponse(record));
}
