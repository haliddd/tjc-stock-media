import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-log";
import {
  betaFeedbackAdminDeniedAuditEvent,
  betaFeedbackAdminDeniedError,
  betaFeedbackDurableStorageRouteError,
  betaFeedbackExportAuditEvent,
  betaFeedbackExportHeaders,
  buildBetaFeedbackExport,
  isBetaFeedbackDurableStorageError,
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

  const filters = readBetaFeedbackExportFilters(request.nextUrl.searchParams);
  let records: Awaited<ReturnType<typeof listBetaFeedback>>;
  try {
    records = await listBetaFeedback();
  } catch (error) {
    if (isBetaFeedbackDurableStorageError(error)) {
      const blocked = betaFeedbackDurableStorageRouteError(error);
      return NextResponse.json(blocked.body, { status: blocked.status });
    }
    throw error;
  }
  const packet = buildBetaFeedbackExport(records, filters);
  appendAuditEvent(betaFeedbackExportAuditEvent(packet, identity.role, identity.id));
  return NextResponse.json(packet, {
    headers: betaFeedbackExportHeaders(packet)
  });
}
