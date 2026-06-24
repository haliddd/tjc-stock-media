import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-log";
import { requestIdentity } from "@/lib/request-identity";
import {
  buildRequestRecordListResponse,
  buildRequestRecordSaveResponse,
  canCreateRequestRecord,
  createAuditedRequestRecord,
  listRequestRecords,
  readRequestRecordDraftInput,
  requestCreateDeniedError,
  requestCreateValidationError,
  requestRecordDeniedAuditEvent,
  requestRecordsForIdentityPayload
} from "@/lib/request-record-store";
import { isRuntimeWriteBlockedError, runtimeWriteBlockedRouteError } from "@/lib/runtime-file-store";

export const dynamic = "force-dynamic";

function runtimeStoreRequiredRouteError(error: unknown) {
  if (isRuntimeWriteBlockedError(error)) return runtimeWriteBlockedRouteError("request-records", error);
  return {
    status: 503 as const,
    body: {
      error: "Runtime store is required for this write.",
      reasonCode: "runtime-store-required",
      category: "request-records",
      detail: error instanceof Error ? error.message : "Runtime store write failed."
    }
  };
}

export async function GET(request: NextRequest) {
  const identity = requestIdentity(request, request.nextUrl.searchParams.get("role"));
  try {
    const records = requestRecordsForIdentityPayload(identity, await listRequestRecords());
    return NextResponse.json(buildRequestRecordListResponse(records));
  } catch (error) {
    const blocked = runtimeStoreRequiredRouteError(error);
    return NextResponse.json(blocked.body, { status: blocked.status });
  }
}

export async function POST(request: NextRequest) {
  const identity = requestIdentity(request, request.nextUrl.searchParams.get("role"));
  const draft = await readRequestRecordDraftInput(request);
  if (!canCreateRequestRecord(identity.role, draft.type)) {
    appendAuditEvent(requestRecordDeniedAuditEvent(draft.type, identity.role, identity.id));
    const denied = requestCreateDeniedError(draft.type);
    return NextResponse.json(denied.body, { status: denied.status });
  }

  const validationError = requestCreateValidationError(draft);
  if (validationError) {
    return NextResponse.json(validationError.body, { status: validationError.status });
  }

  let record: Awaited<ReturnType<typeof createAuditedRequestRecord>>;
  try {
    record = await createAuditedRequestRecord(draft, identity);
  } catch (error) {
    const blocked = runtimeStoreRequiredRouteError(error);
    return NextResponse.json(blocked.body, { status: blocked.status });
  }

  return NextResponse.json(buildRequestRecordSaveResponse(identity.role, record), { status: 201 });
}
