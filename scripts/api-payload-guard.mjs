#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.env.API_PAYLOAD_GUARD_ROOT || process.cwd();
const apiRoot = path.join(root, "frontend/app/api");
const sourceRedactionSource = fs.readFileSync(path.join(root, "frontend/lib/source-redaction.ts"), "utf8");

function stringArrayConst(source, constName) {
  const match = source.match(new RegExp(`const\\s+${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  return match ? [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]) : [];
}

const sourceCustodyAssetKeys = stringArrayConst(sourceRedactionSource, "sourceCustodyAssetKeys");
const forbiddenPayloadKeys = [
  "signedUrl",
  "originalUrl",
  ...sourceCustodyAssetKeys
];
const allowedFilesByKey = new Map([
  ["resourceSpaceUrl", new Set([])],
  ["resourceSpaceUrls", new Set([])]
]);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(fullPath);
    return entry.name === "route.ts" ? [fullPath] : [];
  });
}

const failures = [];
if (sourceCustodyAssetKeys.length < 8) {
  failures.push("API payload guard could not read canonical sourceCustodyAssetKeys");
}
if (!sourceRedactionSource.includes("function omitDownloadImageUrl") || !sourceRedactionSource.includes("download: _download")) {
  failures.push("source-redaction must strip imageUrls.download from every role payload");
}
for (const fullPath of walk(apiRoot)) {
  const relativePath = path.relative(root, fullPath);
  const source = fs.readFileSync(fullPath, "utf8");
  for (const key of forbiddenPayloadKeys) {
    if (!new RegExp(`\\b${key}\\b`).test(source)) continue;
    const allowed = allowedFilesByKey.get(key);
    if (!allowed?.has(relativePath)) failures.push(`${relativePath} references private payload key ${key}`);
  }
  if (/\bdownloadUrl\s*:/.test(source) && !source.includes("`/api/download/${encodeURIComponent(asset.id)}")) {
    failures.push(`${relativePath} exposes a downloadUrl that is not the backend-gated download route`);
  }
  if (/\b(signedUrl|originalUrl|url)\s*:/.test(source) && relativePath !== "frontend/app/api/download/[id]/route.ts") {
    failures.push(`${relativePath} exposes direct URL-like response fields outside the download gate`);
  }
}

const downloadRoute = "frontend/app/api/download/[id]/route.ts";
const downloadSource = fs.readFileSync(path.join(root, downloadRoute), "utf8");
const approvedDeliveryGateSource = fs.readFileSync(path.join(root, "frontend/lib/approved-delivery-gate.ts"), "utf8");
const thumbnailRoute = "frontend/app/api/assets/thumbnail/[id]/route.ts";
const thumbnailSource = fs.readFileSync(path.join(root, thumbnailRoute), "utf8");
const mediaDeliverySource = fs.readFileSync(path.join(root, "frontend/lib/media-delivery.ts"), "utf8");
if (!downloadSource.includes("runApprovedDeliveryGate(") || !downloadSource.includes("approvedDeliveryGateResponse(")) {
  failures.push(`${downloadRoute} must delegate approved-copy delivery to approved-delivery-gate`);
}
if (/appendRequiredAuditEvent|appendAuditEvent|decideAccess|assetResourceRef|getAssetRecordById|createDamRouteSession|buildDeliveryReadinessManifest|consumeDownloadTicket|mintDownloadTicket|canDownloadApprovedCopy|readApprovedCopyDelivery|hasApprovedCopyDerivative|approvedCopyDownloadedAuditEvent|approvedCopyImageResponse|session\.sourceEnvelope/.test(downloadSource)) {
  failures.push(`${downloadRoute} must stay transport-only and avoid scattered approved-delivery gate modules`);
}
if (!/readApprovedCopyDelivery\(id,\s*asset(?:\.title)?,\s*source\)/.test(approvedDeliveryGateSource) || !approvedDeliveryGateSource.includes("hasApprovedCopyDerivative(id, source)") || !approvedDeliveryGateSource.includes("approvedCopyDownloadedAuditEvent(asset, delivery, session, source") || !approvedDeliveryGateSource.includes("approvedCopyImageResponse(delivery)")) {
  failures.push("approved-delivery-gate must resolve approved-copy GET responses and gate checks through media-delivery");
}
if (!approvedDeliveryGateSource.includes("Private originals and storage paths are not exposed.")) {
  failures.push("approved-delivery-gate must keep explicit no-originals response copy");
}
if (!mediaDeliverySource.includes("function approvedCopyFileName") || !mediaDeliverySource.includes("safeSlugText(normalizeDisplayTextField")) {
  failures.push(`${downloadRoute} must derive download filenames through media-delivery approvedCopyFileName`);
}
if (!approvedDeliveryGateSource.includes("readDownloadGateInput(request)") || !mediaDeliverySource.includes("function readDownloadGateInput") || !mediaDeliverySource.includes("function normalizeDownloadVariant") || !mediaDeliverySource.includes("function readApprovedCopyDelivery") || !mediaDeliverySource.includes("function hasApprovedCopyDerivative") || !mediaDeliverySource.includes("function downloadMalformedIdError") || !mediaDeliverySource.includes("function downloadNotFoundError") || !mediaDeliverySource.includes("function downloadRoleDeniedError") || !mediaDeliverySource.includes("function approvedCopyUnavailableError") || !mediaDeliverySource.includes("function approvedCopyImageResponse") || !mediaDeliverySource.includes("function approvedCopyDownloadedAuditEvent") || !mediaDeliverySource.includes("function downloadRoleDeniedAuditEvent")) {
  failures.push("approved-delivery-gate must delegate download gate body parsing, approved-copy delivery, metadata normalization, GET errors, and GET audit details to media-delivery");
}
if (!approvedDeliveryGateSource.includes("consumeDownloadTicket(") || !approvedDeliveryGateSource.includes("mintDownloadTicket(") || !approvedDeliveryGateSource.includes("appendRequiredAuditEvent(") || !approvedDeliveryGateSource.includes("ticket=${encodeURIComponent(ticket.ticket)}")) {
  failures.push("approved-delivery-gate must require one-time tickets and fail closed when required download audit cannot persist");
}
if (!thumbnailSource.includes('deliveryInput.variant === "download"') || !thumbnailSource.includes("thumbnailDownloadVariantDeniedError(session, source)") || !mediaDeliverySource.includes("function thumbnailDownloadVariantDeniedError") || !mediaDeliverySource.includes("request-download-ticket")) {
  failures.push(`${thumbnailRoute} must block download-grade thumbnail delivery outside the approved-copy ticket gate`);
}
if (/readJsonObject|normalizeDisplayTextField|function\s+normalizeDownloadVariant|findFilestoreDerivative|readDeliveredImage|approvedCopyFileName/.test(downloadSource)) {
  failures.push(`${downloadRoute} must not hand-roll download gate body parsing, usage metadata, variant normalization, or approved-copy delivery`);
}
if (/\.replace\(\/\[\^a-z0-9_-\]\+\/gi/.test(downloadSource)) {
  failures.push(`${downloadRoute} must not hand-roll approved-copy filename slugging`);
}
for (const route of [
  { name: thumbnailRoute, source: thumbnailSource }
]) {
  if (!route.source.includes("readThumbnailDerivativeDelivery(id, deliveryInput.variant)") || !route.source.includes("thumbnailImageResponse(")) {
    failures.push(`${route.name} must resolve thumbnail derivatives through media-delivery thumbnail delivery helpers`);
  }
  if (/from "node:fs"|readFileSync|findFilestoreDerivative|readDeliveredImage|placeholderImage|<svg|Preview pending|Preview unavailable|session\.sourceEnvelope|Malformed asset id|Asset not found|Preview restricted/.test(route.source)) {
    failures.push(`${route.name} must not hand-roll derivative reads, placeholder images, access error copy, or source envelopes`);
  }
}
if (!thumbnailSource.includes("readThumbnailDeliveryInput(request.nextUrl.searchParams)") || !thumbnailSource.includes("thumbnailMalformedIdError()") || !thumbnailSource.includes("thumbnailNotFoundError(session, source)") || !thumbnailSource.includes("thumbnailAccessDeniedError(access.reason, session, source)") || !mediaDeliverySource.includes("function readThumbnailDeliveryInput") || !mediaDeliverySource.includes("function normalizeThumbnailVariant") || !mediaDeliverySource.includes("function thumbnailMalformedIdError") || !mediaDeliverySource.includes("function thumbnailNotFoundError") || !mediaDeliverySource.includes("function thumbnailAccessDeniedError")) {
  failures.push(`${thumbnailRoute} must delegate thumbnail variant, access-action normalization, and error responses to media-delivery`);
}
if (/variantParam|viewDetailPreview|viewThumbnail|downloadApprovedCopy/.test(thumbnailSource)) {
  failures.push(`${thumbnailRoute} must not hand-roll thumbnail variant or access-action mapping`);
}
if (!mediaDeliverySource.includes("function supportedImageContentType") || !mediaDeliverySource.includes("function readDeliveredImage") || !mediaDeliverySource.includes("function readThumbnailDerivativeDelivery") || !mediaDeliverySource.includes("function thumbnailImageResponse") || !mediaDeliverySource.includes("function thumbnailPlaceholderResponse") || !mediaDeliverySource.includes("function approvedCopyFileName") || !mediaDeliverySource.includes("function readThumbnailDeliveryInput") || !mediaDeliverySource.includes("function readApprovedCopyDelivery")) {
  failures.push("media-delivery must own supported image detection, derivative reads, thumbnail delivery input/responses, approved-copy delivery, and approved-copy filenames");
}

const collectionsRoute = "frontend/app/api/collections/route.ts";
const collectionsSource = fs.readFileSync(path.join(root, collectionsRoute), "utf8");
const collectionDraftSource = fs.readFileSync(path.join(root, "frontend/lib/collection-drafts.ts"), "utf8");
const batchRoute = "frontend/app/api/batch/route.ts";
const batchSource = fs.readFileSync(path.join(root, batchRoute), "utf8");
const batchActionSource = fs.readFileSync(path.join(root, "frontend/lib/batch-actions.ts"), "utf8");
const assetSelectionSource = fs.readFileSync(path.join(root, "frontend/lib/asset-selection.ts"), "utf8");
if (!collectionsSource.includes("readCollectionDraftInput(request)") || !collectionsSource.includes("collectionDraftPublicBlockedAssets(input.audience, selection.assets)") || !collectionsSource.includes("buildCollectionDraftPreviewPayload(input, selection.assets, portalBlockedAssets)") || !collectionsSource.includes("collectionDraftInputValidationError(input)") || !collectionsSource.includes("collectionDraftSelectionValidationError(selection)") || !collectionsSource.includes("collectionDraftPreviewAuditEvent(input, selection.assets, portalBlockedAssets, role, identity.id)")) {
  failures.push(`${collectionsRoute} must delegate collection draft parsing, validation, public gate checks, audit details, and preview payload assembly to collection-drafts`);
}
if (!collectionDraftSource.includes("normalizeCollectionDraftAudience") || !collectionDraftSource.includes("normalizeCollectionShareSlug") || !collectionDraftSource.includes("normalizeDateField") || !collectionDraftSource.includes("selectedAssetIds") || !collectionDraftSource.includes("function collectionDraftInputValidationError") || !collectionDraftSource.includes("function collectionDraftSelectionValidationError") || !collectionDraftSource.includes("function collectionDraftPreviewAuditEvent")) {
  failures.push("collection-drafts must own draft audience, share slug, expiry, selected asset id normalization, validation, and audit details");
}
if (/readJsonObject|normalizeCollectionDraftAudience|normalizeCollectionShareSlug|normalizeDateField|normalizeDisplayTextField|selectedAssetIds|assetIsPortalReady|assetNeedsStaleApprovalReview|missingIds|hiddenAssets|blockedPublic|blockedAssetIds|missingCount/.test(collectionsSource)) {
  failures.push(`${collectionsRoute} must not hand-roll collection draft parsing, field normalization, selected ids, validation, public gate checks, or audit details`);
}
if (/function\s+slugify\s*\(/.test(collectionsSource) || /function\s+slugify\s*\(/.test(collectionDraftSource) || /allowedAudiences\s*=\s*new Set/.test(collectionsSource) || /allowedAudiences\s*=\s*new Set/.test(collectionDraftSource)) {
  failures.push("collection draft code must not hand-roll collection audience or share slug normalization");
}
if (!assetSelectionSource.includes("normalizeAssetIds") || !assetSelectionSource.includes("getAssetRecordById") || !assetSelectionSource.includes("canSeeAsset")) {
  failures.push("asset-selection must own selected asset id normalization, record lookup, and optional visibility filtering");
}
if (!batchSource.includes("readBatchActionInput(request)") || !batchSource.includes("batchActionForPreview(input)") || !batchSource.includes("buildBatchActionPreviewPayload({ action, assets: selection.assets, role, timestamp })") || !batchSource.includes("batchActionInputValidationError(input)") || !batchSource.includes("batchActionSelectionValidationError(selection)") || !batchSource.includes("batchActionPreviewAuditEvent(action, selection.assets.length, role, identity.id)")) {
  failures.push(`${batchRoute} must delegate batch action parsing, validation, audit details, and preview payload assembly to batch-actions`);
}
if (!batchActionSource.includes("function normalizeBatchAction") || !batchActionSource.includes("selectedAssetIds(body.assetIds)") || !batchActionSource.includes("assetResourceRef(asset)") || !batchActionSource.includes("function batchActionInputValidationError") || !batchActionSource.includes("function batchActionSelectionValidationError") || !batchActionSource.includes("function batchActionForPreview") || !batchActionSource.includes("function batchActionPreviewAuditEvent")) {
  failures.push("batch-actions must own batch action normalization, selected id intake, validation, action narrowing, audit details, and preview ResourceSpace refs");
}
if (/requestedAction\s*\|\|\s*null|missingIds|missingCount|assetCount:\s*selection\.assets\.length|Bulk review actions require reviewer access|Unsupported batch action|Select at least one asset/.test(batchSource)) {
  failures.push(`${batchRoute} must not hand-roll batch action validation, denial copy, selection errors, or audit details`);
}
for (const route of [
  { name: collectionsRoute, source: collectionsSource },
  { name: batchRoute, source: batchSource }
]) {
  if (!route.source.includes("resolveAssetSelection(")) {
    failures.push(`${route.name} must resolve selected assets through asset-selection`);
  }
  if (route.source.includes("getAssetRecordById") || route.source.includes("normalizeAssetIds")) {
    failures.push(`${route.name} must not hand-roll selected asset lookup or id normalization`);
  }
}
if (/readJsonObject|selectedAssetIds|assetResourceRef|supportedActions|new Set/.test(batchSource)) {
  failures.push(`${batchRoute} must not hand-roll batch action parsing, selected ids, or preview ResourceSpace refs`);
}

const searchRoute = "frontend/app/api/assets/search/route.ts";
const searchRouteSource = fs.readFileSync(path.join(root, searchRoute), "utf8");
const catalogSearchRequestSource = fs.readFileSync(path.join(root, "frontend/lib/catalog-search-request.ts"), "utf8");
if (!searchRouteSource.includes("readCatalogSearchRequest(params)") || !searchRouteSource.includes("searchAssets({ role, ...input })")) {
  failures.push(`${searchRoute} must delegate search parameter parsing and validation to catalog-search-request`);
}
if (!catalogSearchRequestSource.includes('normalizePublicTextField(params.get("q"), "", 200)') || !catalogSearchRequestSource.includes('normalizePublicTextField(value, "", 80)') || !catalogSearchRequestSource.includes("normalizeCatalogSort(sort)") || !catalogSearchRequestSource.includes("normalizeBoundedIntField(value")) {
  failures.push("catalog-search-request must own public query/filter, sort, limit, and offset normalization");
}
if (/normalizePublicTextField|normalizeTextField|normalizeCatalogSort|normalizeBoundedIntField|safeBoundedInt|function\s+normalize(Limit|Offset)|isKnown(SavedView|Collection)Id/.test(searchRouteSource)) {
  failures.push(`${searchRoute} must not hand-roll search parameter normalization or validation`);
}

const requestValidationSource = fs.readFileSync(path.join(root, "frontend/lib/request-validation.ts"), "utf8");
const assetDetailRoute = "frontend/app/api/assets/[id]/route.ts";
const assetDetailRouteSource = fs.readFileSync(path.join(root, assetDetailRoute), "utf8");
const assetDetailResponseSource = fs.readFileSync(path.join(root, "frontend/lib/asset-detail-response.ts"), "utf8");
const reviewRoute = "frontend/app/api/review/route.ts";
const reviewRouteSource = fs.readFileSync(path.join(root, reviewRoute), "utf8");
const reviewActionWorkflowSource = fs.readFileSync(path.join(root, "frontend/lib/review-action-workflow.ts"), "utf8");
const reviewEvidencePacketSource = fs.readFileSync(path.join(root, "frontend/lib/review-evidence-packet.ts"), "utf8");
const reviewQueueResponseSource = fs.readFileSync(path.join(root, "frontend/lib/review-queue-response.ts"), "utf8");
const workflowPolicySource = fs.readFileSync(path.join(root, "frontend/lib/workflow-policy.ts"), "utf8");
if (!requestValidationSource.includes("function readJsonObject")) {
  failures.push("request validation must expose readJsonObject for API JSON body fallback");
}
if (!requestValidationSource.includes("function readFormData")) {
  failures.push("request validation must expose readFormData for API multipart body fallback");
}
if (!requestValidationSource.includes("function normalizeBrandKitId")) {
  failures.push("request validation must expose normalizeBrandKitId for brand kit route ids");
}
if (!requestValidationSource.includes("function normalizeFeedbackId")) {
  failures.push("request validation must expose normalizeFeedbackId for beta feedback route ids");
}
if (!requestValidationSource.includes("function normalizePublicTextField")) {
  failures.push("request validation must expose normalizePublicTextField for public reviewer-visible fields");
}
if (!requestValidationSource.includes("function normalizeBoundedIntField") || !requestValidationSource.includes("safeBoundedInt(value, options)")) {
  failures.push("request validation must expose normalizeBoundedIntField for bounded numeric request fields");
}
for (const fullPath of walk(apiRoot)) {
  const relativePath = path.relative(root, fullPath);
  const source = fs.readFileSync(fullPath, "utf8");
  if (/request\.json\(\)\.catch/.test(source)) {
    failures.push(`${relativePath} must parse fallback JSON through readJsonObject`);
  }
  if (/request\.formData\(\)/.test(source)) {
    failures.push(`${relativePath} must parse fallback multipart forms through readFormData`);
  }
}
if (!reviewRouteSource.includes("normalizeReviewQueueId(request.nextUrl.searchParams.get(\"queue\"))") || !reviewRouteSource.includes("readReviewActionRequestBody(request)")) {
  failures.push(`${reviewRoute} must delegate queue normalization and action body parsing to review modules`);
}
if (!reviewRouteSource.includes("buildReviewQueueResponse(queue, session)") || !reviewRouteSource.includes("reviewQueueDeniedAuditEvent(session)") || !reviewRouteSource.includes("reviewQueueDeniedError()") || !reviewQueueResponseSource.includes("function buildReviewQueueResponse") || !reviewQueueResponseSource.includes("function reviewQueueDeniedAuditEvent") || !reviewQueueResponseSource.includes("pendingReviewWriteSummary") || !reviewQueueResponseSource.includes("resourceSpaceRecordRef")) {
  failures.push(`${reviewRoute} must delegate review queue payload assembly, denial copy, and audit details to review-queue-response`);
}
if (!workflowPolicySource.includes("function normalizeReviewQueueId") || !reviewActionWorkflowSource.includes("function readReviewActionRequestBody") || !reviewActionWorkflowSource.includes("readJsonObject<ReviewActionRequestBody>(request)")) {
  failures.push("review modules must own review queue normalization and action body parsing");
}
if (!reviewActionWorkflowSource.includes("buildReviewEvidencePacket(") || !reviewActionWorkflowSource.includes("reviewEvidencePacketBlockedBody(packet)") || !reviewEvidencePacketSource.includes("function buildReviewEvidencePacket") || !reviewEvidencePacketSource.includes("function reviewEvidencePacketBlockedAuditEvent") || !reviewEvidencePacketSource.includes("function queueReviewEvidencePacketDecision")) {
  failures.push("review evidence packet must own checklist/note normalization, missing evidence, blocked body/audit, and queued decision packet");
}
if (/missingReviewEvidence|missingDomainReviewEvidence|reviewDomainMissingLabels|reviewActionDisabledReason|queuePendingReviewDecision|assetResourceRef|normalizeDisplayTextField/.test(reviewActionWorkflowSource)) {
  failures.push(`${reviewRoute} workflow must not hand-roll review evidence packet assembly, normalization, missing evidence, refs, or queue details`);
}
if (/readJsonObject|function\s+normalizeQueue|reviewQueues|pendingReviewWriteSummary|resourceSpaceRecordRef|resourceSpaceAssetUrl|canOpenResourceSpace|role-cannot-review|Review Inbox requires reviewer access/.test(reviewRouteSource)) {
  failures.push(`${reviewRoute} must not hand-roll review body parsing, queue normalization, response payload assembly, denial copy, or audit details`);
}

const adminReadinessRoute = "frontend/app/api/admin/readiness/route.ts";
const adminReadinessRouteSource = fs.readFileSync(path.join(root, adminReadinessRoute), "utf8");
const damReadinessSource = fs.readFileSync(path.join(root, "frontend/lib/dam-readiness.ts"), "utf8");
if (!adminReadinessRouteSource.includes("damReadinessDeniedError()") || !adminReadinessRouteSource.includes("damReadinessDeniedAuditEvent(session)") || !adminReadinessRouteSource.includes("damReadinessViewedAuditEvent(session)")) {
  failures.push(`${adminReadinessRoute} must delegate readiness denial copy and audit details to dam-readiness`);
}
if (!damReadinessSource.includes("function damReadinessDeniedError") || !damReadinessSource.includes("function damReadinessDeniedAuditEvent") || !damReadinessSource.includes("function damReadinessViewedAuditEvent")) {
  failures.push("dam-readiness must own readiness denial copy and audit details");
}
if (/role-cannot-admin|DAM readiness is available to DAM Admin role|admin_readiness_(denied|viewed)|Governance readiness/.test(adminReadinessRouteSource)) {
  failures.push(`${adminReadinessRoute} must not hand-roll readiness denial copy or audit details`);
}

if (!assetDetailRouteSource.includes("buildAssetDetailResponse({ asset, related, resourceSpaceId, session, source })") || !assetDetailRouteSource.includes("assetDetailMalformedIdError()") || !assetDetailRouteSource.includes("assetDetailNotFoundError(session, source)") || !assetDetailRouteSource.includes("assetDetailRoleDeniedError(session, source)") || !assetDetailResponseSource.includes("function buildAssetDetailResponse") || !assetDetailResponseSource.includes("function assetDetailMalformedIdError") || !assetDetailResponseSource.includes("function assetDetailNotFoundError") || !assetDetailResponseSource.includes("function assetDetailRoleDeniedError") || !assetDetailResponseSource.includes("pendingReviewWriteSummary") || !assetDetailResponseSource.includes("resourceSpaceRecordRef")) {
  failures.push(`${assetDetailRoute} must delegate asset detail errors and payload assembly to asset-detail-response`);
}
if (/pendingReviewWriteSummary|resourceSpaceRecordRef|resourceSpaceAssetUrl|canOpenResourceSpace|assetWithRoleImageUrls|Malformed asset id|Asset not found|This role cannot view this asset|session\.sourceEnvelope/.test(assetDetailRouteSource)) {
  failures.push(`${assetDetailRoute} must not hand-roll asset detail errors or response payload assembly`);
}

const brandKitRoute = "frontend/app/api/brand-kits/[id]/route.ts";
const brandKitRouteSource = fs.readFileSync(path.join(root, brandKitRoute), "utf8");
const brandKitSource = fs.readFileSync(path.join(root, "frontend/lib/brand-kits.ts"), "utf8");
if (!brandKitRouteSource.includes("normalizeBrandKitId((await params).id)")) {
  failures.push(`${brandKitRoute} must normalize path params through normalizeBrandKitId`);
}
if (!brandKitRouteSource.includes("brandKitUnknownError()") || !brandKitSource.includes("function brandKitUnknownError")) {
  failures.push(`${brandKitRoute} must delegate unknown brand kit response copy to brand-kits`);
}
if (/Unknown brand kit/.test(brandKitRouteSource)) {
  failures.push(`${brandKitRoute} must not hand-roll unknown brand kit response copy`);
}
if (!brandKitRouteSource.includes("`/api/brand-kits/${encodeURIComponent(kitId)}`")) {
  failures.push(`${brandKitRoute} must record usage route with encoded brand kit id`);
}

const betaFeedbackItemRoute = "frontend/app/api/beta-feedback/[id]/route.ts";
const betaFeedbackItemRouteSource = fs.readFileSync(path.join(root, betaFeedbackItemRoute), "utf8");
if (!betaFeedbackItemRouteSource.includes("normalizeFeedbackId((await params).id)")) {
  failures.push(`${betaFeedbackItemRoute} must normalize path params through normalizeFeedbackId`);
}
const betaFeedbackRoute = "frontend/app/api/beta-feedback/route.ts";
const betaFeedbackRouteSource = fs.readFileSync(path.join(root, betaFeedbackRoute), "utf8");
const betaFeedbackExportRoute = "frontend/app/api/beta-feedback/export/route.ts";
const betaFeedbackExportRouteSource = fs.readFileSync(path.join(root, betaFeedbackExportRoute), "utf8");
const betaFeedbackSource = fs.readFileSync(path.join(root, "frontend/lib/beta-feedback.ts"), "utf8");
if (!betaFeedbackItemRouteSource.includes("readBetaFeedbackPatchInput(request)") || !betaFeedbackItemRouteSource.includes("patchBetaFeedback(id, input.patch)")) {
  failures.push(`${betaFeedbackItemRoute} must delegate patch body parsing and normalization to beta-feedback module`);
}
if (!betaFeedbackItemRouteSource.includes("betaFeedbackPatchValidationError(input)") || !betaFeedbackItemRouteSource.includes("buildBetaFeedbackPatchResponse(record)") || !betaFeedbackItemRouteSource.includes("betaFeedbackTriagedAuditEvent(record, identity.role, identity.id)")) {
  failures.push(`${betaFeedbackItemRoute} must delegate feedback patch validation, audit details, and response payloads to beta-feedback module`);
}
if (!betaFeedbackRouteSource.includes("readBetaFeedbackRequestInput(request)") || !betaFeedbackRouteSource.includes("normalizeBetaFeedbackSubmission(")) {
  failures.push(`${betaFeedbackRoute} must delegate submission parsing and field normalization to beta-feedback module`);
}
if (!betaFeedbackRouteSource.includes("betaFeedbackSubmissionValidationError(submission)") || !betaFeedbackRouteSource.includes("createBetaFeedbackFromSubmission(submission, identity, file)") || !betaFeedbackRouteSource.includes("buildBetaFeedbackSubmitResponse(record)") || !betaFeedbackRouteSource.includes("buildBetaFeedbackInboxResponse(feedback)")) {
  failures.push(`${betaFeedbackRoute} must delegate submission validation, persistence assembly, and response payloads to beta-feedback module`);
}
if (!betaFeedbackRouteSource.includes('betaFeedbackAdminDeniedError("inbox")') || !betaFeedbackRouteSource.includes('betaFeedbackAdminDeniedAuditEvent("inbox", identity.role, identity.id)')) {
  failures.push(`${betaFeedbackRoute} must delegate beta feedback inbox admin denial copy and audit details to beta-feedback module`);
}
if (!betaFeedbackItemRouteSource.includes('betaFeedbackAdminDeniedError("update")') || !betaFeedbackItemRouteSource.includes('betaFeedbackAdminDeniedAuditEvent("update", identity.role, identity.id)')) {
  failures.push(`${betaFeedbackItemRoute} must delegate beta feedback update admin denial copy and audit details to beta-feedback module`);
}
if (!betaFeedbackExportRouteSource.includes('betaFeedbackAdminDeniedError("export")') || !betaFeedbackExportRouteSource.includes('betaFeedbackAdminDeniedAuditEvent("export", identity.role, identity.id)')) {
  failures.push(`${betaFeedbackExportRoute} must delegate beta feedback export admin denial copy and audit details to beta-feedback module`);
}
if (!betaFeedbackSource.includes("function normalizeBetaFeedbackSubmission") || !betaFeedbackSource.includes("normalizeFeedbackUrl(fields.screenshotLink)") || !betaFeedbackSource.includes("readBetaFeedbackRequestInput") || !betaFeedbackSource.includes("function readBetaFeedbackPatchInput") || !betaFeedbackSource.includes("function createBetaFeedbackFromSubmission") || !betaFeedbackSource.includes("function betaFeedbackSubmissionValidationError") || !betaFeedbackSource.includes("function buildBetaFeedbackSubmitResponse")) {
  failures.push("beta-feedback module must own feedback submission normalization, patch normalization, screenshot URL sanitization, multipart parsing, submission validation, persistence assembly, and response payloads");
}
if (!betaFeedbackSource.includes("function betaFeedbackAdminDeniedError") || !betaFeedbackSource.includes("function betaFeedbackAdminDeniedAuditEvent") || !betaFeedbackSource.includes("function betaFeedbackAdminDeniedCopy")) {
  failures.push("beta-feedback module must own beta feedback admin denial copy and audit details");
}
if (!betaFeedbackExportRouteSource.includes("readBetaFeedbackExportFilters(request.nextUrl.searchParams)") || !betaFeedbackSource.includes("function readBetaFeedbackExportFilters") || !betaFeedbackSource.includes("normalizeFeedbackStatusFilter") || !betaFeedbackSource.includes("normalizeFeedbackSeverityFilter") || !betaFeedbackSource.includes("normalizeRoleFilter")) {
  failures.push(`${betaFeedbackExportRoute} must delegate export filter normalization to beta-feedback module`);
}
if (!betaFeedbackExportRouteSource.includes("betaFeedbackExportAuditEvent(packet, identity.role, identity.id)") || !betaFeedbackExportRouteSource.includes("betaFeedbackExportHeaders(packet)")) {
  failures.push(`${betaFeedbackExportRoute} must delegate export audit details and headers to beta-feedback module`);
}
if (/normalizeFeedback(Route|Text|Url)\(/.test(betaFeedbackRouteSource) || /readFormData|readJsonObject|validateFeedbackPayload|isKnownRole|\bcreateBetaFeedback\(|putBetaFeedbackAttachment|BetaFeedbackSeverity/.test(betaFeedbackRouteSource)) {
  failures.push(`${betaFeedbackRoute} must not hand-roll feedback submission parsing, field normalization, validation, persistence assembly, or response payloads`);
}
if (/admin_denied|role-cannot-admin|Beta feedback (inbox|updates|export) requires DAM Admin role|Beta feedback (inbox access|update|export) denied for non-admin role/.test(betaFeedbackRouteSource) || /admin_denied|role-cannot-admin|Beta feedback (inbox|updates|export) requires DAM Admin role|Beta feedback (inbox access|update|export) denied for non-admin role/.test(betaFeedbackItemRouteSource) || /admin_denied|role-cannot-admin|Beta feedback (inbox|updates|export) requires DAM Admin role|Beta feedback (inbox access|update|export) denied for non-admin role/.test(betaFeedbackExportRouteSource)) {
  failures.push("beta feedback routes must not hand-roll admin denial copy or audit details");
}
if (/readJsonObject|normalizeFeedback(Severity|Status|Text)\(|invalidField|Feedback status is invalid|Feedback severity is invalid/.test(betaFeedbackItemRouteSource)) {
  failures.push(`${betaFeedbackItemRoute} must not hand-roll feedback patch body parsing, status/severity normalization, or validation responses`);
}
if (/normalizeFeedback(Severity|Status|Text)\(|normalizeRoleFilter|function\s+normalize|Content-Disposition|exportedRecords|statusFilter/.test(betaFeedbackExportRouteSource)) {
  failures.push(`${betaFeedbackExportRoute} must not hand-roll feedback export filter normalization, audit details, or download headers`);
}

const savedSearchRoute = "frontend/app/api/saved-searches/route.ts";
const savedSearchRouteSource = fs.readFileSync(path.join(root, savedSearchRoute), "utf8");
const savedSearchSource = fs.readFileSync(path.join(root, "frontend/lib/saved-search-store.ts"), "utf8");
if (!savedSearchRouteSource.includes("readSavedSearchDraftInput(request)") || !savedSearchRouteSource.includes("savedSearchCriteriaError(draft)") || !savedSearchRouteSource.includes("saveSavedSearchDraft(draft, identity)") || !savedSearchRouteSource.includes("buildSavedSearchListResponse(searches)") || !savedSearchRouteSource.includes("buildSavedSearchSaveResponse(identity.role, record)") || !savedSearchRouteSource.includes("savedSearchSavedAuditEvent(record, identity.role, identity.id)")) {
  failures.push(`${savedSearchRoute} must delegate draft parsing, criteria checks, record creation, response payloads, and audit details to saved-search-store`);
}
if (!savedSearchSource.includes("function readSavedSearchDraftInput") || !savedSearchSource.includes("function hasSavedSearchCriteria") || !savedSearchSource.includes("function saveSavedSearchDraft") || !savedSearchSource.includes("function savedSearchCriteriaError") || !savedSearchSource.includes("function buildSavedSearchListResponse") || !savedSearchSource.includes("function buildSavedSearchSaveResponse") || !savedSearchSource.includes("function savedSearchSavedAuditEvent")) {
  failures.push("saved-search-store must own saved search draft parsing, criteria checks, record creation, response payloads, and audit details");
}
if (/readJsonObject|sanitizeSavedSearch|safeIsoTimestampIdPart|saveSavedSearch\(|hasSavedSearchCriteria|savedSearchForRolePayload|storageMode:\s*record\.storageMode|filterCount|role-cannot-(list|save)-saved-searches/.test(savedSearchRouteSource)) {
  failures.push(`${savedSearchRoute} must not hand-roll saved search body parsing, sanitization, timestamp ids, persistence record creation, criteria checks, role payloads, response payloads, or audit details`);
}

const packageRoute = "frontend/app/api/packages/route.ts";
const packageRouteSource = fs.readFileSync(path.join(root, packageRoute), "utf8");
const packageSource = fs.readFileSync(path.join(root, "frontend/lib/package-store.ts"), "utf8");
if (!packageRouteSource.includes("readPackageDraftInput(request)") || !packageRouteSource.includes("savePackageDraftSubmission(draft, identity, governance)") || !packageRouteSource.includes("buildPackageDraftListResponse(packages)") || !packageRouteSource.includes("buildPackageDraftSaveResponse(identity.role, record, governance)") || !packageRouteSource.includes("packageDraftSavedAuditEvent(record, governance, identity.role, identity.id)")) {
  failures.push(`${packageRoute} must delegate draft parsing, stored record creation, response payloads, and audit details to package-store`);
}
if (!packageSource.includes("function readPackageDraftInput") || !packageSource.includes("function savePackageDraftSubmission") || !packageSource.includes("function storedGovernanceSnapshot") || !packageSource.includes("function buildPackageDraftListResponse") || !packageSource.includes("function buildPackageDraftSaveResponse") || !packageSource.includes("function packageDraftSavedAuditEvent")) {
  failures.push("package-store must own package draft parsing, stored governance snapshots, record creation, response payloads, and audit details");
}
if (/readJsonObject|sanitizePackageDraft|safeIsoTimestampIdPart|savePackageDraft\(|packageDraftForRolePayload|storageMode:\s*record\.storageMode|totalRefs|portalReadyRefs|blockedRefs|role-cannot-(list|save)-packages/.test(packageRouteSource)) {
  failures.push(`${packageRoute} must not hand-roll package draft body parsing, sanitization, timestamp ids, persistence record creation, role payloads, response payloads, or audit details`);
}

for (const route of [
  assetDetailRoute,
  "frontend/app/api/assets/thumbnail/[id]/route.ts"
]) {
  const source = fs.readFileSync(path.join(root, route), "utf8");
  if (!source.includes("normalizeAssetId((await params).id)")) {
    failures.push(`${route} must normalize path params through normalizeAssetId`);
  }
}
if (!approvedDeliveryGateSource.includes("normalizeAssetId(rawAssetId)")) {
  failures.push("approved-delivery-gate must normalize download path params through normalizeAssetId");
}

const uploadRoute = "frontend/app/api/upload/route.ts";
const uploadRouteSource = fs.readFileSync(path.join(root, uploadRoute), "utf8");
const uploadIntakeSource = fs.readFileSync(path.join(root, "frontend/lib/upload-intake.ts"), "utf8");
const intakeRoutingSource = fs.readFileSync(path.join(root, "frontend/lib/intake-routing.ts"), "utf8");
if (!uploadRouteSource.includes("normalizeUploadIntake(form)")) {
  failures.push(`${uploadRoute} must delegate intake field normalization to upload-intake`);
}
if (!uploadRouteSource.includes("uploadIntakeValidationError(intake)") || !uploadRouteSource.includes("submitUploadIntakeBatch(intake, role, identity.id)") || !uploadRouteSource.includes("uploadIntakeRoleDeniedError()") || !uploadRouteSource.includes("uploadIntakeDeniedAuditEvent(role, identity.id)") || !uploadRouteSource.includes("uploadIntakeSubmittedAuditEvent(intake, role, identity.id)")) {
  failures.push(`${uploadRoute} must delegate intake validation responses, role denial copy, audit details, and response payloads to upload-intake`);
}
if (!uploadIntakeSource.includes("normalizePublicTextField") || !uploadIntakeSource.includes("nonCanonicalUploadTags") || !uploadIntakeSource.includes("fileRequiresAdminIntake") || !uploadIntakeSource.includes("MAX_UPLOAD_INTAKE_FILES") || !uploadIntakeSource.includes("function uploadIntakeValidationError") || !uploadIntakeSource.includes("function uploadIntakeRoleDeniedError") || !uploadIntakeSource.includes("function uploadIntakeDeniedAuditEvent") || !uploadIntakeSource.includes("function uploadIntakeSubmittedAuditEvent") || !uploadIntakeSource.includes("function buildUploadIntakeResponse") || !uploadIntakeSource.includes("function submitUploadIntakeBatch")) {
  failures.push("upload-intake must normalize public intake text, canonical tags, large-media threshold, file-count threshold, validation responses, denial copy, audit details, and response payloads in one module");
}
if (!intakeRoutingSource.includes("LARGE_MEDIA_LIMIT_BYTES") || !intakeRoutingSource.includes("function fileRequiresAdminIntake") || !intakeRoutingSource.includes("file.size > LARGE_MEDIA_LIMIT_BYTES") || !intakeRoutingSource.includes("/^video\\//i") || !intakeRoutingSource.includes("/^audio\\//i")) {
  failures.push("intake-routing must own large-media threshold and video/audio admin-intake detection used by upload-intake");
}
if (/normalize(DateField|DisplayTextField|PublicTextField|UrlField)\(|missingRequired|invalidTags|largeFiles|uploadDefaultState|upload_(denied|submitted)|role-cannot-submit|This role can browse media but cannot upload|Upload intake denied for role/.test(uploadRouteSource)) {
  failures.push(`${uploadRoute} must not hand-roll upload intake field normalization, validation, denial copy, audit details, or response payloads`);
}
if (/normalizeTextField\(form\.get/.test(uploadRouteSource)) {
  failures.push(`${uploadRoute} must not normalize public intake form fields through raw normalizeTextField`);
}

if (failures.length) {
  console.error("API payload guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("API payload guard passed.");
