import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent, appendRequiredAuditEvent } from "@/lib/audit-log";
import { canUpload } from "@/lib/permissions";
import { requestIdentity } from "@/lib/request-identity";
import { readFormData } from "@/lib/request-validation";
import { isRuntimeWriteBlockedError, runtimeWriteBlockedRouteError, type RuntimeStateCategory } from "@/lib/runtime-file-store";
import {
  normalizeUploadIntake,
  submitUploadIntakeBatch,
  uploadIntakeDeniedAuditEvent,
  uploadIntakeRoleDeniedError,
  uploadIntakeSubmittedAuditEvent,
  uploadIntakeValidationError
} from "@/lib/upload-intake";

export const dynamic = "force-dynamic";

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

  try {
    const submitted = await submitUploadIntakeBatch(intake, role, identity.id);
    if (submitted.status !== 200) {
      return NextResponse.json(submitted.body, { status: submitted.status });
    }
    try {
      appendRequiredAuditEvent(uploadIntakeSubmittedAuditEvent(intake, role, identity.id));
    } catch (error) {
      const blocked = runtimeStoreRequiredRouteError("audit-log", error);
      return NextResponse.json({
        ...blocked.body,
        error: "Upload intake was saved but required audit failed; fail closed.",
        reasonCode: "required-audit-failed-after-intake-save",
        partialFailure: true,
        batchId: "batchId" in submitted.body ? submitted.body.batchId : undefined,
        requestRecord: "requestRecord" in submitted.body ? submitted.body.requestRecord : undefined
      }, { status: blocked.status });
    }
    return NextResponse.json(submitted.body, { status: submitted.status });
  } catch (error) {
    const blocked = runtimeStoreRequiredRouteError("request-records", error);
    return NextResponse.json(blocked.body, { status: blocked.status });
  }
}
