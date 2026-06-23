import { NextRequest, NextResponse } from "next/server";
import { assetResourceRef } from "@/lib/asset-refs";
import {
  assetDetailMalformedIdError,
  assetDetailNotFoundError,
  assetDetailRoleDeniedError,
  buildAssetDetailResponse
} from "@/lib/asset-detail-response";
import { getAssetById } from "@/lib/catalog";
import { createDamRouteSession } from "@/lib/dam-route-session";
import { publicSnapshotBrowseEnabled } from "@/lib/env";
import { canSeeAsset } from "@/lib/permissions";
import { localBetaRoleOverrideFromRequest } from "@/lib/request-identity";
import { normalizeAssetId } from "@/lib/request-validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = normalizeAssetId((await params).id);
  const session = createDamRouteSession(request, localBetaRoleOverrideFromRequest(request));
  const role = session.role;
  if (!id) {
    const error = assetDetailMalformedIdError();
    return NextResponse.json(error.body, { status: error.status });
  }
  const accessRole = publicSnapshotBrowseEnabled() && role === "Viewer" ? "Reviewer" : role;
  const { asset, source, related } = await getAssetById(id, role, accessRole);
  if (!asset) {
    const error = assetDetailNotFoundError(session, source);
    return NextResponse.json(error.body, { status: error.status });
  }
  if (!canSeeAsset(accessRole, asset)) {
    const error = assetDetailRoleDeniedError(session, source);
    return NextResponse.json(error.body, { status: error.status });
  }
  const resourceSpaceId = assetResourceRef(asset);
  session.recordUsage({
    type: "asset_open",
    assetId: asset.id,
    resourceSpaceId,
    route: `/api/assets/${asset.id}`
  });
  try {
    return NextResponse.json(await buildAssetDetailResponse({ asset, related, resourceSpaceId, session, source, previewRole: accessRole }));
  } catch (error) {
    return NextResponse.json({
      error: "Asset detail could not load review queue state because durable review storage is unavailable.",
      reasonCode: "review-storage-required",
      detail: error instanceof Error ? error.message : "Pending review write read failed.",
      ...session.sourceEnvelope(source)
    }, { status: 503 });
  }
}
