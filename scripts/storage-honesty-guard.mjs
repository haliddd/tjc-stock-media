#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const files = {
  feedback: "frontend/lib/beta-feedback.ts",
  savedSearches: "frontend/lib/saved-search-store.ts",
  packages: "frontend/lib/package-store.ts",
  packageRefs: "frontend/lib/package-refs.ts",
  packageDrafts: "frontend/lib/package-drafts.ts",
  packageGovernance: "frontend/lib/package-governance.ts",
  assetRefs: "frontend/lib/asset-refs.ts",
  pendingReviewWrites: "frontend/lib/pending-review-writes.ts",
  auditLog: "frontend/lib/audit-log.ts",
  usageAnalytics: "frontend/lib/usage-analytics.ts",
  localJsonStore: "frontend/lib/local-json-store.ts",
  runtimeFileStore: "frontend/lib/runtime-file-store.ts",
  env: "frontend/lib/env.ts",
  nextConfig: "frontend/next.config.mjs",
  reviewEvidence: "frontend/lib/review-evidence.ts",
  requestValidation: "frontend/lib/request-validation.ts",
  catalog: "frontend/lib/catalog.ts",
  catalogSearchRequest: "frontend/lib/catalog-search-request.ts",
  catalogLanguage: "frontend/lib/catalog-language.ts",
  searchRoute: "frontend/app/api/assets/search/route.ts",
  betaFeedbackUpdateRoute: "frontend/app/api/beta-feedback/[id]/route.ts",
  savedSearchRoute: "frontend/app/api/saved-searches/route.ts",
  packageRoute: "frontend/app/api/packages/route.ts",
  packageBuilder: "frontend/components/dam/enterprise/PackageBuilderPage.tsx",
  brandKits: "frontend/lib/brand-kits.ts",
  enterpriseDisplay: "frontend/lib/enterprise-display.ts",
  enterpriseShared: "frontend/components/dam/enterprise/EnterpriseShared.tsx",
  enterpriseMetadata: "frontend/lib/enterprise-metadata.ts",
  enterpriseAssetDetail: "frontend/components/dam/enterprise/AssetDetailPage.tsx",
  enterpriseReview: "frontend/components/dam/enterprise/ReviewPage.tsx",
  enterpriseBrandHub: "frontend/components/dam/enterprise/BrandHubPage.tsx",
  enterpriseInsights: "frontend/components/dam/enterprise/InsightsPage.tsx",
  assetRoute: "frontend/app/api/assets/[id]/route.ts",
  assetDetailResponse: "frontend/lib/asset-detail-response.ts",
  uploadRoute: "frontend/app/api/upload/route.ts",
  uploadIntake: "frontend/lib/upload-intake.ts",
  reviewRoute: "frontend/app/api/review/route.ts",
  reviewQueueResponse: "frontend/lib/review-queue-response.ts",
  batchActions: "frontend/lib/batch-actions.ts",
  batchRoute: "frontend/app/api/batch/route.ts",
  downloadRoute: "frontend/app/api/download/[id]/route.ts",
  reviewActionWorkflow: "frontend/lib/review-action-workflow.ts",
  resourceSpaceApi: "frontend/lib/media-source/resourcespace-api.ts",
  resourceSpaceFieldMap: "frontend/lib/resourcespace-field-map.ts",
  resourceSpaceSchema: "frontend/lib/resourcespace-schema.ts",
  mediaSourceIndex: "frontend/lib/media-source/index.ts",
  mediaDelivery: "frontend/lib/media-delivery.ts",
  readiness: "frontend/lib/dam-readiness-integrations.ts",
  portalApiSmoke: "scripts/portal-api-smoke.sh",
  portalBetaRehearsal: "scripts/portal-beta-rehearsal.sh",
  portalDeliverySmoke: "scripts/portal-delivery-smoke.sh",
  portalPackageSmoke: "scripts/portal-package-smoke.sh",
  apiPayloadGuard: "scripts/api-payload-guard.mjs"
};

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function stringArrayConst(source, constName) {
  const match = source.match(new RegExp(`const\\s+${constName}\\s*=\\s*\\[([\\s\\S]*?)\\]`));
  return match ? [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]) : [];
}

function requireAllStrings(label, source, values) {
  for (const value of values) {
    if (!source.includes(`"${value}"`)) failures.push(`${label} must cover ${value}`);
  }
}

const feedback = read(files.feedback);
const savedSearches = read(files.savedSearches);
const packages = read(files.packages);
const packageRefs = read(files.packageRefs);
const packageDrafts = read(files.packageDrafts);
const packageGovernance = read(files.packageGovernance);
const assetRefs = read(files.assetRefs);
const pendingReviewWrites = read(files.pendingReviewWrites);
const auditLog = read(files.auditLog);
const usageAnalytics = read(files.usageAnalytics);
const localJsonStore = read(files.localJsonStore);
const runtimeFileStore = read(files.runtimeFileStore);
const env = read(files.env);
const nextConfig = read(files.nextConfig);
const reviewEvidence = read(files.reviewEvidence);
const requestValidation = read(files.requestValidation);
const catalog = read(files.catalog);
const catalogSearchRequest = read(files.catalogSearchRequest);
const catalogLanguage = read(files.catalogLanguage);
const searchRoute = read(files.searchRoute);
const betaFeedbackUpdateRoute = read(files.betaFeedbackUpdateRoute);
const savedSearchRoute = read(files.savedSearchRoute);
const packageRoute = read(files.packageRoute);
const packageBuilder = read(files.packageBuilder);
const brandKits = read(files.brandKits);
const enterpriseDisplay = read(files.enterpriseDisplay);
const enterpriseShared = read(files.enterpriseShared);
const enterpriseMetadata = read(files.enterpriseMetadata);
const enterpriseAssetDetail = read(files.enterpriseAssetDetail);
const enterpriseReview = read(files.enterpriseReview);
const enterpriseBrandHub = read(files.enterpriseBrandHub);
const enterpriseInsights = read(files.enterpriseInsights);
const assetRoute = read(files.assetRoute);
const assetDetailResponse = read(files.assetDetailResponse);
const uploadRoute = read(files.uploadRoute);
const uploadIntake = read(files.uploadIntake);
const reviewRoute = read(files.reviewRoute);
const reviewQueueResponse = read(files.reviewQueueResponse);
const batchActions = read(files.batchActions);
const batchRoute = read(files.batchRoute);
const downloadRoute = read(files.downloadRoute);
const reviewActionWorkflow = read(files.reviewActionWorkflow);
const resourceSpaceApi = read(files.resourceSpaceApi);
const resourceSpaceFieldMap = read(files.resourceSpaceFieldMap);
const resourceSpaceSchema = read(files.resourceSpaceSchema);
const mediaSourceIndex = read(files.mediaSourceIndex);
const mediaDelivery = read(files.mediaDelivery);
const readiness = read(files.readiness);
const portalApiSmoke = read(files.portalApiSmoke);
const portalBetaRehearsal = read(files.portalBetaRehearsal);
const portalDeliverySmoke = read(files.portalDeliverySmoke);
const portalPackageSmoke = read(files.portalPackageSmoke);
const apiPayloadGuard = read(files.apiPayloadGuard);
const publicTextSafety = read("frontend/lib/public-text-safety.ts");
const sourceRedaction = read("frontend/lib/source-redaction.ts");
const viewerVerdict = read("frontend/lib/viewer-verdict.ts");
const betaReadinessFacts = read("frontend/lib/beta-readiness-facts.ts");
const makefile = read("Makefile");
const frontendCheck = read("scripts/frontend-check.sh");
const failures = [];

const stores = [
  { name: "feedback", source: feedback, path: "data\", \"runtime\", \"beta-feedback.json", cap: "maxBetaFeedbackRecords = 500", diagnostic: "durableStorageConfigured: kvConfigured" },
  { name: "saved searches", source: savedSearches, path: "data\", \"runtime\", \"saved-searches.json", cap: "maxSavedSearches = 250", diagnostic: "durableStorageConfigured: false" },
  { name: "package drafts", source: packages, path: "data\", \"runtime\", \"package-drafts.json", cap: "maxPackageDrafts = 200", diagnostic: "durableStorageConfigured: false" }
];

for (const store of stores) {
  if (!store.source.includes(store.path)) failures.push(`${store.name} store must persist local beta JSON under data/runtime`);
  if (!store.source.includes(store.cap)) failures.push(`${store.name} store must keep explicit record cap: ${store.cap}`);
  if (!store.source.includes(store.diagnostic)) failures.push(`${store.name} diagnostics must report durable storage honestly`);
  if (!store.source.includes("storageMode")) failures.push(`${store.name} records must expose storageMode`);
  if (!store.source.includes("@/lib/local-json-store")) failures.push(`${store.name} store must use shared local-json persistence module`);
  if (/from "node:fs\/promises"/.test(store.source) || /from "node:fs"/.test(store.source)) failures.push(`${store.name} store must not hand-roll local-json file IO`);
}
if (!localJsonStore.includes("function normalizeWindow") || !localJsonStore.includes("writeLocalJsonStore") || !localJsonStore.includes("readLocalJsonStoreSync") || !localJsonStore.includes("memoryStore")) {
  failures.push("shared local-json persistence module must own normalization window, writes, diagnostics reads, and memory fallback");
}
if (!runtimeFileStore.includes("writeRuntimeJsonFile") || !runtimeFileStore.includes("appendRuntimeJsonLine") || !runtimeFileStore.includes("readRuntimeJsonLines") || !runtimeFileStore.includes("listRuntimeFiles")) {
  failures.push("shared runtime file module must own JSON file writes, JSONL append/read, and runtime file listing");
}
if (!runtimeFileStore.includes("maxFilesFromEnd") || !runtimeFileStore.includes("function fileWindow")) {
  failures.push("shared runtime file module must own bounded runtime file listing windows for diagnostics");
}
if (!runtimeFileStore.includes("maxLinesFromEnd") || !runtimeFileStore.includes("function lineWindow")) {
  failures.push("shared runtime file module must own bounded JSONL read windows for diagnostics");
}
if (!auditLog.includes("maxAuditEventsReturned") || !auditLog.includes("maxLinesFromEnd: readWindow")) {
  failures.push("audit log diagnostics must read bounded JSONL windows instead of unbounded monthly files");
}
if (!pendingReviewWrites.includes("pendingReviewWriteFileReadWindow") || !pendingReviewWrites.includes("maxFilesFromEnd: pendingReviewWriteFileReadWindow")) {
  failures.push("pending review diagnostics must read bounded pending-write file windows instead of every queued file");
}
for (const store of [
  { name: "pending review writes", source: pendingReviewWrites },
  { name: "audit log", source: auditLog }
]) {
  if (!store.source.includes("@/lib/runtime-file-store")) failures.push(`${store.name} must use shared runtime file persistence module`);
  if (/from "node:fs"/.test(store.source)) failures.push(`${store.name} must not hand-roll runtime file IO`);
}

const persistedRecordSources = [
  { name: "feedback", source: feedback },
  { name: "saved searches", source: savedSearches, enumHelper: "normalizeCatalogSort" },
  { name: "package drafts", source: packages },
  { name: "pending review writes", source: pendingReviewWrites },
  { name: "audit log", source: auditLog }
];

for (const store of persistedRecordSources) {
  if (!store.source.includes("safeIsoTimestamp")) failures.push(`${store.name} must normalize persisted timestamps through safeIsoTimestamp`);
  if (!store.source.includes("newestByTimestamp")) failures.push(`${store.name} must sort persisted records through newestByTimestamp`);
  if (!store.source.includes("safeCompactText") && !store.source.includes("normalizePersisted")) failures.push(`${store.name} must normalize persisted text through shared safety helpers`);
  if (!store.source.includes("safeSlugText") && !store.source.includes("normalizePersistedSlugText") && !store.source.includes("normalizeFeedbackId")) failures.push(`${store.name} must normalize persisted slugs through normalizePersistedSlugText, safeSlugText, or normalizeFeedbackId`);
  if (!store.source.includes(store.enumHelper || "safeEnumValue")) failures.push(`${store.name} must normalize persisted enums through ${store.enumHelper || "safeEnumValue"}`);
  if (/function\s+safeIso\s*\(/.test(store.source)) failures.push(`${store.name} must not hand-roll Date.parse timestamp guards`);
  if (/Date\.parse/.test(store.source)) failures.push(`${store.name} must not hand-roll timestamp ordering with Date.parse`);
  if (/String\([^)]*\|\|\s*""\)\.replace\(\/\\s\+\/g/.test(store.source)) failures.push(`${store.name} must not hand-roll compact text normalization`);
  if (/\.replace\(\/\[\^a-z0-9_-\]\+\/gi,\s*"-"\)\.replace\(\/\^-\|-\\\$\/g,\s*""\)/.test(store.source)) failures.push(`${store.name} must not hand-roll slug normalization`);
  if (/\.includes\(value as /.test(store.source) || /value\s*===\s*"[a-zA-Z0-9_-]+"\s*\?\s*"[a-zA-Z0-9_-]+"/.test(store.source)) failures.push(`${store.name} must not hand-roll enum fallback normalization`);
}

for (const store of [
  { name: "package drafts", source: packages },
  { name: "pending review writes", source: pendingReviewWrites }
]) {
  if (!store.source.includes("safeNonNegativeInt")) failures.push(`${store.name} must normalize persisted counters through safeNonNegativeInt`);
  if (/Math\.max\(0,\s*Number\.isFinite\(Number\(/.test(store.source)) failures.push(`${store.name} must not hand-roll nonnegative counter normalization`);
}

if (!pendingReviewWrites.includes("normalizeReviewRoleWithFallback")) {
  failures.push("pending review writes must normalize reviewer roles through normalizeReviewRoleWithFallback");
}
if (!pendingReviewWrites.includes("normalizeReviewChecklist")) {
  failures.push("pending review writes must normalize persisted checklist through normalizeReviewChecklist");
}
if (/function\s+safeChecklist\s*\(/.test(pendingReviewWrites) || /raw\.[a-zA-Z0-9_]+\s*===\s*true/.test(pendingReviewWrites)) {
  failures.push("pending review writes must not hand-roll review checklist boolean normalization");
}

if (!packages.includes("safeBoolean")) failures.push("package drafts must normalize persisted booleans through safeBoolean");
if (/function\s+safeBoolean\s*\(/.test(packages) || /value\s*===\s*true/.test(packages)) {
  failures.push("package drafts must not hand-roll boolean normalization");
}
if (!packageRefs.includes("normalizeResourceSpaceRef")) {
  failures.push("package ref module must normalize ResourceSpace refs through normalizeResourceSpaceRef");
}
if (!/collectionId:\s*raw\.collectionId\s*\?\s*normalizePackageRef\(raw\.collectionId\)\s*\|\|\s*undefined\s*:\s*undefined/.test(packages)) {
  failures.push("package draft collectionId must normalize through normalizePackageRef and drop unsafe refs");
}
if (!packageDrafts.includes("normalizePackageRefs") || /refs\.map\(\(ref\)\s*=>\s*String\(ref\)\)/.test(packageDrafts)) {
  failures.push("package draft client helpers must normalize package refs through normalizePackageRefs");
}
if (!packageDrafts.includes("function sectionsWithGlobalPackageRefs") || !packageDrafts.includes("function draftPackageRefs")) {
  failures.push("package draft client helpers must keep refs globally deduped before server persistence");
}
if (!packageGovernance.includes("normalizedPackageAssetRef") || /String\(asset\.resourceSpaceId\s*\|\|\s*asset\.id\)/.test(packageGovernance)) {
  failures.push("package governance display refs must normalize through package ref module");
}
if (!packageGovernance.includes("assetForRolePayload(role, asset)") || !packageGovernance.includes("@/lib/source-redaction")) {
  failures.push("package governance nested asset payloads must pass through role redaction");
}
if (!brandKits.includes("matchedSourceAssets") || !brandKits.includes("assets: matchedSourceAssets")) {
  failures.push("brand kit governance must run on raw matched source assets so reuse decisions keep source/readiness truth");
}
if (!brandKits.includes("const matchedAssets = matchedSourceAssets.map((asset) => assetForRolePayload(role, asset))")) {
  failures.push("brand kit response assets must pass through role redaction before returning payloads");
}
if (!read("scripts/portal-package-smoke.sh").includes("package governance payload leaked private source metadata")) {
  failures.push("package smoke must prove package governance nested assets are role-safe");
}
if (!packageBuilder.includes("packageAssetRef") || /asset\.resourceSpaceId\s*\|\|\s*asset\.id/.test(packageBuilder)) {
  failures.push("package builder display refs must normalize through package ref module");
}
if (!assetRefs.includes("function assetResourceRef") || !assetRefs.includes("normalizeResourceSpaceRef") || !assetRefs.includes("normalizeAssetId")) {
  failures.push("asset ref module must expose assetResourceRef through normalized ResourceSpace/id fallback");
}
if (!assetRefs.includes("function resourceSpaceRecordRef") || !assetRefs.includes("normalizeResourceSpaceRef(asset?.resourceSpaceId)")) {
  failures.push("asset ref module must expose resourceSpaceRecordRef without portal-id fallback");
}
if (!enterpriseDisplay.includes("function assetRecordRef") || !enterpriseDisplay.includes("assetResourceRef")) {
  failures.push("enterprise display must expose normalized assetRecordRef through assetResourceRef");
}
if (!enterpriseShared.includes("assetRecordRef") || /asset\.resourceSpaceId\s*\|\|\s*asset\.id/.test(enterpriseShared)) {
  failures.push("enterprise shared cards must display record refs through assetRecordRef");
}
for (const surface of [
  { name: "enterprise metadata", source: enterpriseMetadata },
  { name: "enterprise asset detail", source: enterpriseAssetDetail },
  { name: "enterprise review", source: enterpriseReview },
  { name: "enterprise brand hub", source: enterpriseBrandHub },
  { name: "enterprise insights", source: enterpriseInsights }
]) {
  if (!surface.source.includes("assetRecordRef") || /asset\.resourceSpaceId\s*\|\|\s*asset\.id/.test(surface.source)) {
    failures.push(`${surface.name} record labels must display through assetRecordRef`);
  }
}
for (const surface of [
  { name: "pending review writes", source: pendingReviewWrites },
  { name: "asset route", source: assetRoute },
  { name: "review queue response", source: reviewQueueResponse },
  { name: "batch actions", source: batchActions },
  { name: "download route", source: downloadRoute },
  { name: "review action workflow", source: reviewActionWorkflow },
  { name: "ResourceSpace API adapter", source: resourceSpaceApi }
]) {
  if (!surface.source.includes("assetResourceRef") || /asset\.resourceSpaceId\s*\|\|\s*asset\.id/.test(surface.source)) {
    failures.push(`${surface.name} operational refs must normalize through assetResourceRef`);
  }
}
for (const surface of [
  { name: "asset detail response", source: assetDetailResponse },
  { name: "review queue response", source: reviewQueueResponse }
]) {
  if (!surface.source.includes("resourceSpaceRecordRef") || /resourceSpaceAssetUrl\(asset(Resource|\.resourceSpaceId)/.test(surface.source)) {
    failures.push(`${surface.name} ResourceSpace URLs must use strict resourceSpaceRecordRef`);
  }
  if (!surface.source.includes("canOpenResourceSpace(role)") || !surface.source.includes("resourceSpaceAssetUrl")) {
    failures.push(`${surface.name} ResourceSpace admin URLs must stay behind canOpenResourceSpace(role)`);
  }
}
if (/function\s+safeResourceSpaceRef\s*\(/.test(packages) || /String\([^)]*\|\|\s*""\)\.trim\(\)\.slice\(0,\s*80\)/.test(packages)) {
  failures.push("package drafts must not hand-roll ResourceSpace ref normalization");
}
if (!requestValidation.includes("function normalizeResourceSpaceRef")) {
  failures.push("request validation must expose normalizeResourceSpaceRef");
}
if (!uploadIntake.includes("function uploadIntakeAuditDetails") || !uploadIntake.includes("sourceLinkCaptured: Boolean(intake.sourceLink)") || /details:\s*\{[^}]*sourceLink:\s*(sourceLink|intake\.sourceLink)/s.test(uploadRoute) || /sourceLink:\s*intake\.sourceLink/.test(uploadIntake)) {
  failures.push("upload audit details must persist sourceLinkCaptured instead of raw sourceLink URLs");
}
if (!requestValidation.includes("containsPrivateSourceText(ref)")) {
  failures.push("request validation ResourceSpace refs must reject private-source tokens through containsPrivateSourceText");
}
if (!requestValidation.includes("function normalizePersistedDisplayText")) {
  failures.push("request validation must expose normalizePersistedDisplayText for persisted display labels");
}
if (!requestValidation.includes("function normalizePersistedSlugText")) {
  failures.push("request validation must expose normalizePersistedSlugText for persisted identifiers");
}
if (/checksumLikePattern|\/\^\[a-f0-9\]\{32,\}/.test(requestValidation)) {
  failures.push("request validation must not hand-roll private token detection");
}
if (!requestValidation.includes("function readJsonObject")) {
  failures.push("request validation must expose readJsonObject for API JSON body fallback");
}
if (!env.includes("function normalizedResourceSpaceBaseUrl") || !env.includes('url.protocol !== "http:"') || !env.includes('url.protocol !== "https:"')) {
  failures.push("env must normalize ResourceSpace base URL and reject non-http(s) values");
}
if (!env.includes("normalizedResourceSpaceBaseUrl()") || /resourceSpaceBaseUrl\(\)\s*&&/.test(env)) {
  failures.push("ResourceSpace API config readiness must require normalizedResourceSpaceBaseUrl");
}
if (!read("frontend/lib/resourcespace-client.ts").includes("normalizedResourceSpaceBaseUrl") || /[^A-Za-z]resourceSpaceBaseUrl\(/.test(read("frontend/lib/resourcespace-client.ts"))) {
  failures.push("ResourceSpace client must build API/admin links from normalizedResourceSpaceBaseUrl only");
}
const resourceSpaceClient = read("frontend/lib/resourcespace-client.ts");
if (/url\??:\s*string/.test(resourceSpaceClient) || /,\s*url\s*}/.test(resourceSpaceClient) || /url\s*}/.test(resourceSpaceClient)) {
  failures.push("ResourceSpace API results must not expose signed request URLs");
}
if (!resourceSpaceClient.includes("function safeApiErrorMessage") || !resourceSpaceClient.includes("sign=|user=")) {
  failures.push("ResourceSpace API errors must redact signed query details before leaving the client");
}
if (!resourceSpaceClient.includes("function parseApiResponseText") || !resourceSpaceClient.includes("ResourceSpace API returned invalid JSON.")) {
  failures.push("ResourceSpace API client must convert malformed upstream JSON into a safe adapter error");
}
if (!resourceSpaceClient.includes("function timeoutSignal") || !resourceSpaceClient.includes("new AbortController()") || !resourceSpaceClient.includes("cache: \"no-store\", signal") || !resourceSpaceClient.includes("clearTimeout(timer)")) {
  failures.push("ResourceSpace API client must bound live DAM requests with an abort timeout");
}
if (!resourceSpaceFieldMap.includes("function normalizeFieldMapValue") || !resourceSpaceFieldMap.includes("value.trim()") || !resourceSpaceFieldMap.includes("entry[1] !== null")) {
  failures.push("ResourceSpace field map config must drop blank/non-scalar values before merging with beta defaults");
}
if (!resourceSpaceSchema.includes("safeNonNegativeInt") || /fileSizeBytes\s*=\s*Number\(/.test(resourceSpaceSchema)) {
  failures.push("ResourceSpace schema must normalize file size metadata through safeNonNegativeInt");
}
if (!read("frontend/lib/persisted-record-safety.ts").includes("function safeIsoTimestampIdPart")) {
  failures.push("persisted record safety must expose safeIsoTimestampIdPart for record id timestamps");
}
if (!localJsonStore.includes("const windowed = normalizeWindow(records, options)") || !localJsonStore.includes("...normalizeWindow(records, options)")) {
  failures.push("local JSON store must normalize and cap records on write as well as read");
}
if (!localJsonStore.includes("await rename(tmpPath, filePath)") || !localJsonStore.includes("function tempFilePath") || !localJsonStore.includes("randomUUID().slice(0, 8)") || !localJsonStore.includes("await unlink(tmpPath).catch")) {
  failures.push("local JSON store must write via unique temp file, atomic rename, and temp cleanup to avoid corrupt beta JSON");
}
if (!runtimeFileStore.includes("function writeRuntimeFileAtomically") || !runtimeFileStore.includes("randomUUID().slice(0, 8)") || !runtimeFileStore.includes("fs.renameSync(tmpPath, filePath)") || !runtimeFileStore.includes("fs.unlinkSync(tmpPath)") || !runtimeFileStore.includes("writeRuntimeFileAtomically(filePath")) {
  failures.push("runtime JSON evidence files must write via unique temp file, atomic rename, and temp cleanup");
}
if (!pendingReviewWrites.includes("const safeRecord = normalizePendingReviewWrite(record) || record") || !pendingReviewWrites.includes("writeRuntimeJsonFile(path.join(pendingDir(), `${safeRecord.id}.json`), safeRecord)")) {
  failures.push("pending review writes must normalize records before writing runtime JSON evidence");
}
for (const store of [
  { name: "feedback", source: feedback },
  { name: "saved searches", source: savedSearches },
  { name: "package drafts", source: packages },
  { name: "pending review writes", source: pendingReviewWrites },
  { name: "audit log", source: auditLog }
]) {
  if (!store.source.includes("normalizePersistedSlugText") && !store.source.includes("normalizeFeedbackId")) {
    failures.push(`${store.name} must normalize persisted identifiers through normalizePersistedSlugText or normalizeFeedbackId`);
  }
}
for (const store of [
  { name: "feedback", source: feedback },
  { name: "saved searches", source: savedSearches },
  { name: "package drafts", source: packages },
  { name: "pending review writes", source: pendingReviewWrites },
  { name: "audit log", source: auditLog },
  { name: "usage analytics", source: usageAnalytics }
]) {
  if (!store.source.includes("normalizePersistedDisplayText")) {
    failures.push(`${store.name} must normalize persisted display labels through normalizePersistedDisplayText`);
  }
  if (/function\s+safeDisplayText\s*\(/.test(store.source)) {
    failures.push(`${store.name} must not hand-roll persisted display label normalization`);
  }
}
for (const writer of [
  { name: "saved searches", source: savedSearches },
  { name: "package drafts", source: packages },
  { name: "pending review writes", source: pendingReviewWrites },
  { name: "audit log", source: auditLog }
]) {
  if (!writer.source.includes("safeIsoTimestampIdPart")) failures.push(`${writer.name} must derive record id timestamps through safeIsoTimestampIdPart`);
  if (/\.replace\(\/\[:\\\.\]\/g,\s*"-"\)/.test(writer.source)) failures.push(`${writer.name} must not hand-roll timestamp id slugging`);
}
if (!reviewEvidence.includes("safeBoolean")) failures.push("review evidence must normalize checklist booleans through safeBoolean");
if (/raw\.[a-zA-Z0-9_]+\s*===\s*true/.test(reviewEvidence)) {
  failures.push("review evidence must not hand-roll checklist boolean normalization");
}

if (/betaFeedback(?:Statuses|Severities)\.includes/.test(feedback)) {
  failures.push("feedback store must not hand-roll status/severity normalization");
}
if (!feedback.includes("safeFileNameText")) {
  failures.push("feedback attachments must derive blob filenames through safeFileNameText");
}
if (/\.replace\(\/\[\^a-z0-9\._-\]\+\/gi,\s*"-"\)/.test(feedback)) {
  failures.push("feedback attachments must not hand-roll attachment filename normalization");
}

if (!catalogLanguage.includes("function normalizeCatalogSort")) failures.push("catalog language must expose normalizeCatalogSort");
for (const surface of [
  { name: "catalog search", source: catalog },
  { name: "catalog search request", source: catalogSearchRequest },
  { name: "saved searches", source: savedSearches }
]) {
  if (!surface.source.includes("normalizeCatalogSort")) failures.push(`${surface.name} must normalize catalog sort through normalizeCatalogSort`);
  if (/catalogSortOptions\.includes/.test(surface.source)) failures.push(`${surface.name} must not hand-roll catalog sort normalization`);
}
if (!savedSearches.includes("savedSearchForRolePayload") || !savedSearches.includes("createdBy: creatorLabel(record.role)")) {
  failures.push("saved search list payloads must scrub creator identity for non-review roles while keeping stored audit actor");
}
if (!savedSearchRoute.includes("buildSavedSearchSaveResponse(identity.role, record)") || !savedSearches.includes("savedSearchForRolePayload(role, record)")) {
  failures.push("saved search route must return role-safe saved search payloads through saved-search-store");
}
if (!read("scripts/portal-saved-search-smoke.sh").includes("saved search contributor list leaked creator identity")) {
  failures.push("saved search smoke must prove Contributor lists do not leak creator identity");
}
if (!packages.includes("packageDraftForRolePayload") || !packages.includes("createdBy: creatorLabel(record.role)")) {
  failures.push("package draft save payloads must scrub creator identity for non-review roles while keeping stored audit actor");
}
if (!packageRoute.includes("buildPackageDraftSaveResponse(identity.role, record, governance)") || !packages.includes("packageDraftForRolePayload(role, record)")) {
  failures.push("package route must return role-safe package draft payloads on save through package-store");
}
if (!portalPackageSmoke.includes("package save response leaked creator identity")) {
  failures.push("package smoke must prove Contributor package saves do not leak creator identity");
}
for (const surface of [
  { name: "catalog search", source: catalog, helper: "safeBoundedInt" },
  { name: "catalog search request", source: catalogSearchRequest, helper: "normalizeBoundedIntField" }
]) {
  if (!surface.source.includes(surface.helper)) failures.push(`${surface.name} must normalize pagination bounds through ${surface.helper}`);
  if (/Number\.isFinite\([^)]*(limit|offset|parsed)/.test(surface.source)) failures.push(`${surface.name} must not hand-roll pagination number bounds`);
}
if (!requestValidation.includes("function normalizeBoundedIntField") || !requestValidation.includes("safeBoundedInt(value, options)")) {
  failures.push("request validation must own bounded numeric request field normalization through safeBoundedInt");
}
if (!catalogLanguage.includes("safeNonNegativeInt(dimensions?.[1])") || !catalogLanguage.includes("safeNonNegativeInt(dimensions?.[2])") || /const\s+(width|height)\s*=\s*Number\(dimensions/.test(catalogLanguage)) {
  failures.push("catalog language dimension filters must normalize image dimensions through safeNonNegativeInt");
}
if (!portalBetaRehearsal.includes("function parseHttpCode") || /httpCode:\s*Number\(process\.env\.CODE\)/.test(portalBetaRehearsal)) {
  failures.push("portal beta rehearsal evidence must normalize HTTP codes before writing JSONL");
}

if (!usageAnalytics.includes("normalizePersistedDisplayText")) failures.push("usage analytics must normalize usage labels through normalizePersistedDisplayText");
if (!usageAnalytics.includes("normalizeAssetId")) failures.push("usage analytics must normalize asset ids through normalizeAssetId");
if (!usageAnalytics.includes("normalizeResourceSpaceRef")) failures.push("usage analytics must normalize ResourceSpace ids through normalizeResourceSpaceRef");
if (!usageAnalytics.includes("safeEnumValue")) failures.push("usage analytics must normalize event types through safeEnumValue");
if (!usageAnalytics.includes("safeNonNegativeInt")) failures.push("usage analytics must normalize metric counters through safeNonNegativeInt");
if (!usageAnalytics.includes("PRAGMA journal_mode = WAL") || !usageAnalytics.includes("PRAGMA busy_timeout = 2500")) {
  failures.push("usage analytics SQLite must enable WAL and busy timeout for beta concurrency");
}
if (!usageAnalytics.includes("totalEvents: safeNonNegativeInt(total.count)")) {
  failures.push("usage analytics diagnostics must normalize total event counter");
}
if (!usageAnalytics.includes("normalizeSafeRoutePath")) failures.push("usage analytics must normalize routes through normalizeSafeRoutePath");
if (/String\([^)]*\|\|\s*""\)\.replace\(\/\\s\+\/g/.test(usageAnalytics)) failures.push("usage analytics must not hand-roll compact text normalization");
if (/\.includes\(value as /.test(usageAnalytics)) failures.push("usage analytics must not hand-roll enum fallback normalization");
if (/Math\.max\(0,\s*Number/.test(usageAnalytics)) failures.push("usage analytics must not hand-roll nonnegative metric normalization");
if (/containsUnsafeRouteText|startsWith\("\/"\)/.test(usageAnalytics)) failures.push("usage analytics must not hand-roll route path normalization");
if (!usageAnalytics.includes("function usageActorLabel") || /normalizePersistedDisplayText\(event\.actor/.test(usageAnalytics)) {
  failures.push("usage analytics must store role-level actor labels instead of raw actor identities");
}
if (!read("scripts/portal-usage-smoke.sh").includes("DELETE FROM usage_events WHERE role = ? AND metadata_json LIKE ?") || !read("scripts/portal-usage-smoke.sh").includes("smokeMarker: process.env.MARKER")) {
  failures.push("usage analytics smoke must clean seeded unsafe analytics rows after payload sanitization checks");
}
for (const smoke of [
  { name: "saved search smoke", source: read("scripts/portal-saved-search-smoke.sh"), store: "saved-searches.json" },
  { name: "package smoke", source: read("scripts/portal-package-smoke.sh"), store: "package-drafts.json" },
  { name: "feedback smoke", source: read("scripts/portal-feedback-smoke.sh"), store: "beta-feedback.json" }
]) {
  if (!smoke.source.includes(`data\", \"runtime\", \"${smoke.store}`) || !smoke.source.includes('MARKER="$MARKER" node') || !smoke.source.includes("!JSON.stringify(row).includes(marker)")) {
    failures.push(`${smoke.name} must clean current-marker local-json seed rows after smoke assertions`);
  }
}
if (!usageAnalytics.includes("function safeUsageFailureReason") || /reason:\s*error instanceof Error/.test(usageAnalytics)) {
  failures.push("usage analytics write failures must not expose raw storage error messages");
}
if (!usageAnalytics.includes("function usageAnalyticsStorageMode") || /\bdbPath\b/.test(usageAnalytics) || /analytics\.dbPath/.test(readiness)) {
  failures.push("usage analytics diagnostics must expose storage mode, not filesystem paths");
}
if (/path\.relative\(repoRoot\(\),\s*exportPath\)|\.runtime\/exports|Reading \$\{/.test(mediaSourceIndex)) {
  failures.push("media source status must not expose metadata export filesystem paths");
}
if (!mediaDelivery.includes('import { productionRuntime } from "@/lib/env"') || !mediaDelivery.includes('process.env.VERCEL === "1" || productionRuntime()')) {
  failures.push("media delivery must block generated demo-fallback approved-copy bytes in hosted and production runtimes");
}
if (!sourceRedaction.includes("function canSeePrivateSourceFiles") || /if \(canSeeOperationalSource\(role\)\) return asset/.test(sourceRedaction)) {
  failures.push("reviewer payloads must not expose raw private source-file fields");
}
if (!sourceRedaction.includes("export const sourceCustodyAssetKeys") || !sourceRedaction.includes("function omitAssetKeys")) {
  failures.push("source redaction must centralize private asset key omission");
}
const sourceCustodyRedactionPattern = /const\s+roleSafeAsset\s*=\s*omitAssetKeys\((?:asset|downloadSafeAsset),\s*sourceCustodyAssetKeys\)/;
if (!sourceCustodyRedactionPattern.test(sourceRedaction) || !sourceRedaction.includes("omitAssetKeys(roleSafeAsset, publicHiddenAssetKeys)")) {
  failures.push("normal-user payload redaction must derive safeAsset from roleSafeAsset through centralized key omission");
}
const sourceCustodyAssetKeys = stringArrayConst(sourceRedaction, "sourceCustodyAssetKeys");
const publicHiddenAssetKeys = stringArrayConst(sourceRedaction, "publicHiddenAssetKeys");
if (sourceCustodyAssetKeys.length < 8) failures.push("source redaction custody key list must stay explicit and complete");
if (publicHiddenAssetKeys.length < 8) failures.push("source redaction public-hidden key list must stay explicit and complete");
if (!portalApiSmoke.includes("reviewer-payload-hides-source-custody") || !portalApiSmoke.includes("dam-admin-payload-keeps-source-custody")) {
  failures.push("portal API smoke must prove Reviewer redaction and DAM Admin source custody visibility");
}
if (/reviewer-payload-keeps-original-metadata|Reviewer asset payload lost audit\/source metadata/.test(portalApiSmoke)) {
  failures.push("portal API smoke must not expect Reviewer payloads to keep original source-file metadata");
}
for (const guard of [
  { name: "portal API smoke", source: portalApiSmoke },
  { name: "portal beta rehearsal", source: portalBetaRehearsal },
  { name: "portal delivery smoke", source: portalDeliverySmoke }
]) {
  requireAllStrings(`${guard.name} normal-user payload guard`, guard.source, sourceCustodyAssetKeys);
  requireAllStrings(`${guard.name} normal-user payload guard`, guard.source, publicHiddenAssetKeys);
}
requireAllStrings("portal package smoke governance guard", portalPackageSmoke, sourceCustodyAssetKeys);
requireAllStrings("portal package smoke governance guard", portalPackageSmoke, publicHiddenAssetKeys);
if (!apiPayloadGuard.includes('stringArrayConst(sourceRedactionSource, "sourceCustodyAssetKeys")') || !apiPayloadGuard.includes("...sourceCustodyAssetKeys")) {
  failures.push("API payload guard must derive forbidden custody keys from source redaction");
}
if (/sourcePath",\s*new Set|masterDrivePath",\s*new Set/.test(apiPayloadGuard)) {
  failures.push("API payload guard must not allowlist raw source path keys in API routes");
}
if (!downloadRoute.includes("const auditSource = envelope.source") || /source:\s*source\.label/.test(downloadRoute) || /sourceDetail:\s*source\.detail/.test(downloadRoute)) {
  failures.push("download audit details must derive source labels/details from role-safe envelope source");
}
requireAllStrings("API payload guard direct URL keys", apiPayloadGuard, ["signedUrl", "originalUrl"]);
if (!searchRoute.includes("assets: session.assetsPayload(result.assets)") || !reviewQueueResponse.includes("assets: session.assetsPayload(queue.assets)") || !reviewQueueResponse.includes("allAssets: session.assetsPayload(queue.allAssets)") || !assetDetailResponse.includes("session.assetPayload(assetPayload)")) {
  failures.push("reviewer search/review API payloads must pass assets through role redaction");
}
requireAllStrings("source redaction custody key list", sourceRedaction, ["sourcePath", "masterDrivePath", "sourceAlbumPath", "sourceAlbumMemberships", "checksumSha256", "originalFilename"]);
requireAllStrings("source redaction public-hidden key list", sourceRedaction, publicHiddenAssetKeys);
if (!auditLog.includes("normalizeAssetId")) failures.push("audit log must normalize asset ids through normalizeAssetId");
if (!auditLog.includes("normalizeResourceSpaceRef")) failures.push("audit log must normalize ResourceSpace ids through normalizeResourceSpaceRef");
if (/recent:\s*events\.slice\(0,\s*25\)\.map[\s\S]*details:/.test(auditLog)) {
  failures.push("audit log diagnostics must not expose raw audit details");
}
for (const module of [
  { name: "audit log", source: auditLog },
  { name: "usage analytics", source: usageAnalytics }
]) {
  if (!module.source.includes("safeFiniteNumber")) failures.push(`${module.name} must normalize finite metadata numbers through safeFiniteNumber`);
  if (/Number\.isFinite\(item\)/.test(module.source)) failures.push(`${module.name} must not hand-roll finite metadata number normalization`);
}

if (!feedback.includes("normalizeSafeRoutePath")) failures.push("feedback store must normalize routes through normalizeSafeRoutePath");
if (/containsUnsafeRouteText|startsWith\("\/"\)/.test(feedback)) failures.push("feedback store must not hand-roll route path normalization");
if (/npm --prefix frontend run (build|dev|typecheck)/.test(makefile) || /npm --prefix frontend run (build|typecheck)/.test(frontendCheck)) {
  failures.push("frontend build/dev checks must run from frontend cwd so Next outputFileTracingRoot and production artifacts are correct");
}
if (!frontendCheck.includes("rm -rf frontend/.next") || !frontendCheck.includes("frontend/.next/required-server-files.json")) {
  failures.push("frontend-check must clean stale Next output and assert the production server manifest before next start smoke");
}
if (!env.includes("function findRepoRoot") || !env.includes("looksLikeRepoRoot") || /path\.resolve\(process\.cwd\(\),\s*"\.\."\)/.test(env)) {
  failures.push("env repoRoot must detect repo root from current or frontend cwd without assuming cwd/..");
}
if (!nextConfig.includes("fileURLToPath(import.meta.url)") || !nextConfig.includes("outputFileTracingRoot: repoRoot") || /outputFileTracingRoot:\s*path\.resolve\(process\.cwd\(\)/.test(nextConfig)) {
  failures.push("Next config must derive outputFileTracingRoot from its file location, not process.cwd()");
}

if (!betaReadinessFacts.includes('scripts", "git-hygiene-guard.mjs"') || !betaReadinessFacts.includes('source: "git-hygiene"')) {
  failures.push("beta readiness brand PNG allowlist fact must use git hygiene guard as source of truth");
}
if (/function allowlistFact\(\)[\s\S]*launch-readiness\.sh/.test(betaReadinessFacts)) {
  failures.push("beta readiness brand PNG allowlist fact must not infer media allowlist from launch-readiness.sh copy");
}

if (!publicTextSafety.includes("function containsOperationalText") || !publicTextSafety.includes("function containsScaffoldText") || !publicTextSafety.includes("function safePublicList")) {
  failures.push("public text safety must expose shared operational/scaffold redaction helpers");
}
if (!sourceRedaction.includes("@/lib/public-text-safety") || /const operationalTextPattern|function hasOperationalText|function hasScaffoldText|function safePublicList/.test(sourceRedaction)) {
  failures.push("source redaction must use shared public text safety helpers");
}
if (!viewerVerdict.includes("containsOperationalText") || /ResourceSpace\|Shared Drive|source\[- \]path|master drive\|master/.test(viewerVerdict)) {
  failures.push("request mailto safety must reuse shared operational text detection");
}

for (const route of [
  { name: "beta feedback", source: feedback, required: ["normalizeFeedbackStatus", "normalizeFeedbackSeverity"] },
  { name: "beta feedback export filters", source: feedback, required: ["normalizeFeedbackStatusFilter", "normalizeFeedbackSeverityFilter", "normalizeRoleFilter"] }
]) {
  for (const helper of route.required) {
    if (!route.source.includes(helper)) failures.push(`${route.name} must normalize API enum filters through ${helper}`);
  }
  if (/\.includes\([^)]* as /.test(route.source)) failures.push(`${route.name} must not hand-roll enum filter normalization`);
}

const readinessRequirements = [
  "Feedback is using",
  "local/private beta rehearsal only, not wider rollout",
  "Configure Vercel KV for durable hosted feedback and Blob for attachments before larger testing.",
  "Saved searches use",
  "Connect durable profile storage before favorites, teams, or persistent saved views are promised.",
  "Package drafts use",
  "Connect durable backend storage before package sharing or invites."
];

for (const phrase of readinessRequirements) {
  if (!readiness.includes(phrase)) failures.push(`readiness storage copy missing: ${phrase}`);
}

if (failures.length) {
  console.error("Storage honesty guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Storage honesty guard passed.");
