import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-log";
import { canUpload } from "@/lib/permissions";
import { requestIdentity } from "@/lib/request-identity";
import { readFormData } from "@/lib/request-validation";
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

  appendAuditEvent(uploadIntakeSubmittedAuditEvent(intake, role, identity.id));
  const submitted = await submitUploadIntakeBatch(intake, role, identity.id);
  return NextResponse.json(submitted.body, { status: submitted.status });
}
