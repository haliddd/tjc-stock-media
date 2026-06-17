import { NextRequest, NextResponse } from "next/server";
import { decideAccess } from "@/lib/access-decisions";
import { getAssetRecordById } from "@/lib/catalog";
import { createDamRouteSession } from "@/lib/dam-route-session";
import {
  readThumbnailDeliveryInput,
  readThumbnailDerivativeDelivery,
  thumbnailAccessDeniedError,
  thumbnailDownloadVariantDeniedError,
  thumbnailImageResponse,
  thumbnailMalformedIdError,
  thumbnailNotFoundError
} from "@/lib/media-delivery";
import { localBetaRoleOverrideFromRequest } from "@/lib/request-identity";
import { normalizeAssetId } from "@/lib/request-validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = normalizeAssetId((await params).id);
  const session = createDamRouteSession(request, localBetaRoleOverrideFromRequest(request) || request.nextUrl.searchParams.get("role"));
  const role = session.role;
  if (!id) {
    const error = thumbnailMalformedIdError();
    return NextResponse.json(error.body, { status: error.status });
  }
  const deliveryInput = readThumbnailDeliveryInput(request.nextUrl.searchParams);
  const { asset, source } = await getAssetRecordById(id);
  if (!asset) {
    const error = thumbnailNotFoundError(session, source);
    return NextResponse.json(error.body, { status: error.status });
  }
  if (deliveryInput.variant === "download") {
    const error = thumbnailDownloadVariantDeniedError(session, source);
    return NextResponse.json(error.body, { status: error.status });
  }

  const access = decideAccess(role, deliveryInput.action, asset);
  if (!access.allowed) {
    const error = thumbnailAccessDeniedError(access.reason, session, source);
    return NextResponse.json(error.body, { status: error.status });
  }

  const delivery = readThumbnailDerivativeDelivery(id, deliveryInput.variant);
  const image = thumbnailImageResponse(delivery.status === "ready" ? delivery : { ...delivery, asset });
  return new NextResponse(image.body, { headers: image.headers });
}
