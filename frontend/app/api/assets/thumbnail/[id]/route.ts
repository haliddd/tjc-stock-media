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
import { normalizeAssetId } from "@/lib/request-validation";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = normalizeAssetId((await params).id);
  const session = createDamRouteSession(request, request.nextUrl.searchParams.get("role"));
  const role = session.role;
  if (!id) {
    const error = thumbnailMalformedIdError();
    return NextResponse.json(error.body, { status: error.status });
  }
  const deliveryInput = readThumbnailDeliveryInput(request.nextUrl.searchParams);
  const { asset, source } = await getAssetRecordById(id, role);
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

  const image = thumbnailImageResponse(readThumbnailDerivativeDelivery(id, deliveryInput.variant));
  return new NextResponse(image.body, { headers: image.headers });
}
