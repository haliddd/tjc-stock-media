import { selectedAssetIds, type AssetSelection } from "@/lib/asset-selection";
import { assetIsPortalReady, assetNeedsStaleApprovalReview } from "@/lib/asset-governance";
import { normalizeCollectionDraftAudience, normalizeCollectionShareSlug, normalizeDateField, normalizeDisplayTextField, readJsonObject } from "@/lib/request-validation";
import type { AuditEventRecord } from "@/lib/audit-log";
import type { CollectionDraftAudience } from "@/lib/request-validation";
import type { DemoRole, StockMediaAsset } from "@/lib/types";

export type CollectionDraftInput = {
  role?: string;
  requestedIds: string[];
  title: string;
  audience: CollectionDraftAudience;
  expiry: string;
  owner: string;
};

type CollectionDraftBody = {
  role?: string;
  assetIds?: string[];
  title?: string;
  audience?: string;
  expiry?: string;
  owner?: string;
};
type CollectionDraftAuditEvent = Omit<AuditEventRecord, "id" | "createdAt" | "actor"> & { actor?: string };
type CollectionDraftRouteError = {
  body: {
    error: string;
    missingCount?: number;
  };
  status: 400 | 403 | 404;
};

export async function readCollectionDraftInput(request: { json(): Promise<unknown> }): Promise<CollectionDraftInput> {
  const body = await readJsonObject<CollectionDraftBody>(request);
  return {
    role: body.role,
    requestedIds: selectedAssetIds(body.assetIds),
    title: normalizeDisplayTextField(body.title, "Untitled ministry collection", 100),
    audience: normalizeCollectionDraftAudience(body.audience),
    expiry: normalizeDateField(body.expiry),
    owner: normalizeDisplayTextField(body.owner, "Ministry media", 80)
  };
}

export function collectionDraftPublicBlockedAssets(audience: CollectionDraftAudience, assets: StockMediaAsset[]) {
  return audience === "Public-approved portal"
    ? assets.filter((asset) => !assetIsPortalReady(asset) || assetNeedsStaleApprovalReview(asset))
    : [];
}

export function collectionDraftRoleDeniedError(): CollectionDraftRouteError {
  return { body: { error: "Collection drafts require Contributor, Reviewer, or DAM Admin role." }, status: 403 };
}

export function collectionDraftInputValidationError(input: CollectionDraftInput): CollectionDraftRouteError | null {
  return input.requestedIds.length ? null : { body: { error: "Select at least one asset for the collection." }, status: 400 };
}

export function collectionDraftSelectionValidationError(selection: AssetSelection): CollectionDraftRouteError | null {
  if (selection.missingIds.length) {
    return { body: { error: "One or more selected assets were not found.", missingCount: selection.missingIds.length }, status: 404 };
  }
  if (selection.hiddenAssets.length) {
    return { body: { error: "This role cannot add one or more selected assets to a collection draft." }, status: 403 };
  }
  return null;
}

export function collectionDraftDeniedAuditEvent(input: CollectionDraftInput, role: DemoRole, actor: string): CollectionDraftAuditEvent {
  return {
    type: "collection_draft_denied",
    role,
    actor,
    status: "denied",
    summary: "Collection draft denied for role.",
    details: { assetCount: input.requestedIds.length, audience: input.audience }
  };
}

export function collectionDraftPreviewAuditEvent(
  input: CollectionDraftInput,
  assets: StockMediaAsset[],
  portalBlockedAssets: StockMediaAsset[],
  role: DemoRole,
  actor: string
): CollectionDraftAuditEvent {
  const blockedPublic = portalBlockedAssets.length > 0;
  return {
    type: "collection_draft_previewed",
    role,
    actor,
    status: blockedPublic ? "blocked" : "preview",
    summary: blockedPublic ? "Collection draft previewed with public gate blocked." : "Collection draft previewed.",
    details: {
      title: input.title,
      audience: input.audience,
      assetCount: assets.length,
      blockedPublic,
      blockedAssetIds: portalBlockedAssets.map((asset) => asset.id)
    }
  };
}

export function buildCollectionDraftPreviewPayload(input: CollectionDraftInput, assets: StockMediaAsset[], portalBlockedAssets: StockMediaAsset[]) {
  const blockedPublic = portalBlockedAssets.length > 0;
  return {
    ok: false,
    mode: "review-preview",
    title: input.title,
    state: blockedPublic ? "private draft - sharing blocked" : input.audience,
    owner: input.owner,
    expiry: input.expiry || null,
    assetCount: assets.length,
    sharePath: null,
    sharingBlocked: true,
    previewSlug: normalizeCollectionShareSlug(input.title),
    reuseReadiness: {
      ready: assets.length - portalBlockedAssets.length,
      blocked: portalBlockedAssets.length,
      blockedReferences: portalBlockedAssets.map((asset) => asset.id)
    },
    message: blockedPublic
      ? `Collection draft preview ready with ${assets.length} asset${assets.length === 1 ? "" : "s"}. External sharing stays blocked until every item clears approval, source, rights, people, and safe-copy checks.`
      : `Collection draft preview ready with ${assets.length} asset${assets.length === 1 ? "" : "s"} for ${input.audience}. Sharing stays paused until each item is reviewed and cleared.`
  };
}
