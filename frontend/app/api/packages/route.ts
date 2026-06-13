import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-log";
import { getMediaSourceSession } from "@/lib/media-source/session";
import { buildPackageGovernance } from "@/lib/package-governance";
import { resolvePackageSections } from "@/lib/package-drafts";
import {
  buildPackageDraftListResponse,
  buildPackageDraftSaveResponse,
  listStoredPackageDrafts,
  packageDraftListDeniedAuditEvent,
  packageDraftListDeniedError,
  packageDraftListViewedAuditEvent,
  packageDraftSaveDeniedAuditEvent,
  packageDraftSaveDeniedError,
  packageDraftSavedAuditEvent,
  readPackageDraftInput,
  savePackageDraftSubmission
} from "@/lib/package-store";
import { canContribute, canReview } from "@/lib/permissions";
import { requestIdentity } from "@/lib/request-identity";
import { isRuntimeWriteBlockedError, runtimeWriteBlockedRouteError } from "@/lib/runtime-file-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = requestIdentity(request, request.nextUrl.searchParams.get("role"));
  if (!canReview(identity.role)) {
    appendAuditEvent(packageDraftListDeniedAuditEvent(identity.role, identity.id));
    const denied = packageDraftListDeniedError();
    return NextResponse.json(denied.body, { status: denied.status });
  }
  const packages = await listStoredPackageDrafts();
  appendAuditEvent(packageDraftListViewedAuditEvent(packages, identity.role, identity.id));
  return NextResponse.json(buildPackageDraftListResponse(packages));
}

export async function POST(request: NextRequest) {
  const identity = requestIdentity(request, request.nextUrl.searchParams.get("role"));
  if (!canContribute(identity.role)) {
    appendAuditEvent(packageDraftSaveDeniedAuditEvent(identity.role, identity.id));
    const denied = packageDraftSaveDeniedError();
    return NextResponse.json(denied.body, { status: denied.status });
  }

  const draft = await readPackageDraftInput(request);
  const { assets } = await getMediaSourceSession(identity.role);
  const sections = resolvePackageSections(draft, assets);
  const governance = buildPackageGovernance(draft, sections, identity.role);
  let record: Awaited<ReturnType<typeof savePackageDraftSubmission>>;
  try {
    record = await savePackageDraftSubmission(draft, identity, governance);
  } catch (error) {
    if (isRuntimeWriteBlockedError(error)) {
      const blocked = runtimeWriteBlockedRouteError("package-drafts", error);
      return NextResponse.json(blocked.body, { status: blocked.status });
    }
    throw error;
  }

  appendAuditEvent(packageDraftSavedAuditEvent(record, governance, identity.role, identity.id));

  return NextResponse.json(buildPackageDraftSaveResponse(identity.role, record, governance));
}
