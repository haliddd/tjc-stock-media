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
import { canSeeAsset } from "@/lib/permissions";
import { normalizeAssetId } from "@/lib/request-validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = normalizeAssetId((await params).id);
  const session = createDamRouteSession(request, request.nextUrl.searchParams.get("role"));
  const role = session.role;
  if (!id) {
    const error = assetDetailMalformedIdError();
    return NextResponse.json(error.body, { status: error.status });
  }
  const { asset, source, related } = await getAssetById(id, role);
  if (!asset) {
    const error = assetDetailNotFoundError(session, source);
    return NextResponse.json(error.body, { status: error.status });
  }
  if (!canSeeAsset(role, asset)) {
    const error = assetDetailRoleDeniedError(session, source);
    return NextResponse.json(error.body, { status: error.status });
  }
  const resourceSpaceId = assetResourceRef(asset);
  session.recordUsage({
    type: "asset_view",
    assetId: asset.id,
    resourceSpaceId,
    route: `/api/assets/${asset.id}`
  });
  return NextResponse.json(buildAssetDetailResponse({ asset, related, resourceSpaceId, session, source }));
}
