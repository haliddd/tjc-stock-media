import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-log";
import {
  betaFeedbackAdminDeniedAuditEvent,
  betaFeedbackAdminDeniedError,
  betaFeedbackExportAuditEvent,
  betaFeedbackExportHeaders,
  betaFeedbackStorageRouteError,
  betaFeedbackStorageUnavailableError,
  buildBetaFeedbackExport,
  listBetaFeedback,
  readBetaFeedbackExportFilters
} from "@/lib/beta-feedback";
import { canAdmin } from "@/lib/permissions";
import { requestIdentity } from "@/lib/request-identity";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = requestIdentity(request, request.nextUrl.searchParams.get("role"));
  if (!canAdmin(identity.role)) {
    const denied = betaFeedbackAdminDeniedError("export");
    appendAuditEvent(betaFeedbackAdminDeniedAuditEvent("export", identity.role, identity.id));
    return NextResponse.json(denied.body, { status: denied.status });
  }
  const storageUnavailable = betaFeedbackStorageUnavailableError();
  if (storageUnavailable) {
    return NextResponse.json(storageUnavailable.body, { status: storageUnavailable.status });
  }

  const filters = readBetaFeedbackExportFilters(request.nextUrl.searchParams);
  const records = await listBetaFeedback().catch((error: unknown) => {
    const storageError = betaFeedbackStorageRouteError(error, "read");
    if (storageError) return storageError;
    throw error;
  });
  if ("status" in records && "body" in records) {
    return NextResponse.json(records.body, { status: records.status });
  }
  const packet = buildBetaFeedbackExport(records, filters);
  appendAuditEvent(betaFeedbackExportAuditEvent(packet, identity.role, identity.id));
  return NextResponse.json(packet, {
    headers: betaFeedbackExportHeaders(packet)
  });
}
