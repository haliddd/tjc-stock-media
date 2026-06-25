import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent, appendRequiredAuditEvent } from "@/lib/audit-log";
import { canUpload } from "@/lib/permissions";
import { createAuditedRequestRecord } from "@/lib/request-record-store";
import { requestIdentity } from "@/lib/request-identity";
import { readFormData } from "@/lib/request-validation";
import { runtimeWriteBlockedRouteError } from "@/lib/runtime-file-store";
import {
  normalizeUploadIntake,
  submitUploadIntakeBatch,
  uploadIntakeDeniedAuditEvent,
  uploadIntakeRoleDeniedError,
  uploadIntakeSubmittedAuditEvent,
  uploadIntakeValidationError
} from "@/lib/upload-intake";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const form = await readFormData(request);
  const identity = requestIdentity(request, String(form.get("role") || "Viewer"));
  const role = identity.role;
  if (!canUpload(role)) {
    const denied = uploadIntakeRoleDeniedError();
    appendAuditEvent(uploadIntakeDeniedAuditEvent(role, identity.id));
    return NextResponse.json(denied.body, { status: denied.status });
  }

  const intake = normalizeUploadIntake(form);
  const validationError = uploadIntakeValidationError(intake);
  if (validationError) {
    return NextResponse.json(validationError.body, { status: validationError.status });
  }

  const submitted = await submitUploadIntakeBatch(intake, role, identity.id);
  if (submitted.status !== 200) {
    return NextResponse.json(submitted.body, { status: submitted.status });
  }
  let requestRecord: Awaited<ReturnType<typeof createAuditedRequestRecord>>;
  try {
    requestRecord = await createAuditedRequestRecord({
      type: "Upload intake",
      relatedAsset: intake.eventName || "Upload intake batch",
      blocker: intake.reviewWarnings[0] || "Reviewer intake packet pending.",
      requiredEvidence: ["Uploader declaration", "Event context", "People visibility", "Rights notes"],
      nextAction: "Reviewer intake triage required before any media becomes reusable.",
      linkedIntakeBatchId: submitted.body.batchId
    }, identity);
  } catch (error) {
    const blocked = runtimeWriteBlockedRouteError("request-records", error);
    return NextResponse.json({
      ...blocked.body,
      error: "Upload intake was saved but request ticket recording failed; fail closed.",
      reasonCode: "required-request-record-failed-after-intake-save",
      partialFailure: true,
      batchId: submitted.body.batchId,
      custodyBoundary: submitted.body.custodyBoundary,
      resourceSpaceWritten: false
    }, { status: blocked.status });
  }
  try {
    appendRequiredAuditEvent(uploadIntakeSubmittedAuditEvent(intake, role, identity.id));
  } catch (error) {
    const blocked = runtimeWriteBlockedRouteError("audit-log", error);
    return NextResponse.json({
      ...blocked.body,
      error: "Upload intake was saved but required audit failed; fail closed.",
      reasonCode: "required-audit-failed-after-intake-save",
      partialFailure: true,
      batchId: submitted.body.batchId,
      custodyBoundary: submitted.body.custodyBoundary,
      resourceSpaceWritten: false
    }, { status: blocked.status });
  }
  return NextResponse.json({ ...submitted.body, requestRecordId: requestRecord.id }, { status: submitted.status });
}
