import type { getAssetById } from "@/lib/catalog";
import type { createDamRouteSession } from "@/lib/dam-route-session";
import { latestPendingWriteForResourceAsync, pendingReviewWriteSummary } from "@/lib/pending-review-writes";
import { canOpenResourceSpace, canReview, canSeeAsset } from "@/lib/permissions";
import { assetWithRoleImageUrls } from "@/lib/presentation";
import { resourceSpaceRecordRef } from "@/lib/asset-refs";
import { resourceSpaceAssetUrl } from "@/lib/resourcespace-client";
import type { DemoRole } from "@/lib/types";

type AssetDetailResult = Awaited<ReturnType<typeof getAssetById>>;
type DamRouteSession = ReturnType<typeof createDamRouteSession>;
type AssetDetailRouteError = {
  body: {
    error: string;
  } & Record<string, unknown>;
  status: 400 | 403 | 404;
};

export function assetDetailMalformedIdError(): AssetDetailRouteError {
  return { body: { error: "Malformed asset id." }, status: 400 };
}

export function assetDetailNotFoundError(session: DamRouteSession, source: AssetDetailResult["source"]): AssetDetailRouteError {
  return { body: { error: "Asset not found", ...session.sourceEnvelope(source) }, status: 404 };
}

export function assetDetailRoleDeniedError(session: DamRouteSession, source: AssetDetailResult["source"]): AssetDetailRouteError {
  return { body: { error: "This role cannot view this asset.", ...session.sourceEnvelope(source) }, status: 403 };
}

export async function buildAssetDetailResponse({
  asset,
  related,
  resourceSpaceId,
  session,
  source,
  previewRole
}: {
  asset: NonNullable<AssetDetailResult["asset"]>;
  related: AssetDetailResult["related"];
  resourceSpaceId: string;
  session: DamRouteSession;
  source: AssetDetailResult["source"];
  previewRole?: DemoRole;
}) {
  const role = session.role;
  const effectivePreviewRole = previewRole || role;
  const pending = await latestPendingWriteForResourceAsync(resourceSpaceId);
  const isReviewerOrAdmin = canReview(role);
  const assetPayload = assetWithRoleImageUrls(asset, role, effectivePreviewRole);
  const resourceSpaceRef = resourceSpaceRecordRef(asset);
  return {
    asset: {
      ...session.assetPayload(assetPayload),
      pendingReviewWrite: isReviewerOrAdmin && pending ? pendingReviewWriteSummary(pending) : undefined
    },
    ...session.sourceEnvelope(source),
    related: related
      .filter((item) => canSeeAsset(effectivePreviewRole, item))
      .map((item) => session.assetPayload(assetWithRoleImageUrls(item, role, effectivePreviewRole))),
    resourceSpaceUrl: isReviewerOrAdmin && resourceSpaceRef && canOpenResourceSpace(role) ? resourceSpaceAssetUrl(resourceSpaceRef) : undefined
  };
}
