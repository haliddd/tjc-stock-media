import { NextRequest, NextResponse } from "next/server";
import { canUpload } from "@/lib/permissions";
import { localBetaRoleOverrideFromRequest, requestIdentity } from "@/lib/request-identity";
import { listIntakeBatchesForActor } from "@/lib/intake-batch-store";
import { buildMyUploadHistoryResponse } from "@/lib/upload-history";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const identity = requestIdentity(request, localBetaRoleOverrideFromRequest(request) || request.nextUrl.searchParams.get("role"));
  if (!canUpload(identity.role)) {
    return NextResponse.json(buildMyUploadHistoryResponse([]));
  }

  try {
    const records = await listIntakeBatchesForActor(identity.id, 50);
    return NextResponse.json(buildMyUploadHistoryResponse(records));
  } catch {
    return NextResponse.json({
      uploads: [],
      count: 0,
      source: "server-intake",
      storageTruth: "Recorded upload history is unavailable. Browser fallback may still appear on this device."
    }, { status: 503 });
  }
}
