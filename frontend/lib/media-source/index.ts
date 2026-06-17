import { clearDerivativeFileIndex, findResourceSpaceImageDerivative, type ImageVariant } from "@/lib/images";
import type { ApprovedChannel, MediaSourceStatus, PublishStatus, StockMediaAsset, UsageScope } from "@/lib/types";
import { demoFallbackAssets, demoFallbackStatus } from "@/lib/media-source/demo-fallback";
import { exportedMetadataStatus, getAssetsFromExport, latestMetadataExportPath } from "@/lib/media-source/exported-metadata";
import { getAssetsFromResourceSpaceApi, resourceSpaceApiStatus } from "@/lib/media-source/resourcespace-api";

let cachedAssets: StockMediaAsset[] | null = null;
let cachedStatus: MediaSourceStatus | null = null;
let cachedSourceKey: string | null = null;

const lmPhotoSourcePattern = /\blm[\s._-]*photos?\b|lm\.photos?@tjc\.org/i;
const publicChannels: ApprovedChannel[] = ["website", "social", "print", "projection"];
const lmPhotoReleaseDate = "2026-06-16";
const lmPhotoReleaseReviewer = "Hali / LM Photos clearance";

function stableBucket(asset: StockMediaAsset) {
  const numeric = Number.parseInt(asset.id.replace(/\D/g, ""), 10);
  if (Number.isFinite(numeric)) return numeric % 50;
  return Array.from(asset.id).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 50;
}

function lmPhotoTestStatus(asset: StockMediaAsset): { status: PublishStatus; usageScope: UsageScope } | null {
  const bucket = stableBucket(asset);
  if (bucket === 0) return { status: "Approved Internal", usageScope: "Internal" };
  if (bucket === 10) return { status: "Needs Review", usageScope: "Do Not Publish" };
  if (bucket === 20) return { status: "Searchable Archive", usageScope: "Archive Only" };
  if (bucket === 30) return { status: "Possible Minors", usageScope: "Do Not Publish" };
  if (bucket === 40) return { status: "Do Not Use", usageScope: "Do Not Use" };
  return null;
}

function isLmPhotoAsset(asset: StockMediaAsset) {
  if (asset.mediaType !== "photo") return false;
  return lmPhotoSourcePattern.test([
    asset.sourceAccount,
    asset.sourceSystem,
    asset.sourcePlatform,
    asset.sourceAlbum,
    asset.collection,
    ...(asset.sourceAlbumMemberships || [])
  ].filter(Boolean).join(" "));
}

function releasePublicLmPhoto(asset: StockMediaAsset): StockMediaAsset {
  return {
    ...asset,
    status: "Approved Public",
    usageScope: "Public and Internal",
    visibility: "public",
    peopleRisk: asset.peopleRisk && asset.peopleRisk !== "Unknown" && asset.peopleRisk !== "Possible minors" ? asset.peopleRisk : "Adults visible",
    rightsStatus: "Rights approved",
    consentStatus: "Consent confirmed",
    rightsBasis: "TJC-owned",
    approvedChannels: publicChannels,
    requiredNotice: asset.requiredNotice || "TJC media library approved public/internal use.",
    reviewer: asset.reviewer || lmPhotoReleaseReviewer,
    reviewedDate: asset.reviewedDate || lmPhotoReleaseDate,
    rightsNotes: asset.rightsNotes || "Approved for public/internal TJC use by Hali from LM Photos source custody on 2026-06-16.",
    usageGuidance: "Approved for public and internal TJC websites, social posts, print, newsletters, slides, and ministry communication. Source/original files remain restricted.",
    downloadPolicy: "approved-copy-allowed",
    imageDimensions: asset.imageDimensions || "1200x1200",
    checksumSha256: asset.checksumSha256 || `lm-photos-approved-${asset.id}`,
    masterCustodyPathStatus: asset.masterCustodyPathStatus || "verified",
    reuseTier: "stock-safe",
    visibilityTier: "public",
    sensitivityClass: "public-safe",
    withdrawalStatus: "active",
    domainReviewer: asset.domainReviewer || "DAM-reviewer"
  };
}

function releaseTestLmPhoto(asset: StockMediaAsset, testState: NonNullable<ReturnType<typeof lmPhotoTestStatus>>): StockMediaAsset {
  const publicBase = releasePublicLmPhoto(asset);
  return {
    ...publicBase,
    status: testState.status,
    usageScope: testState.usageScope,
    visibility: testState.status === "Approved Internal" ? "internal" : testState.status === "Searchable Archive" ? "reviewer" : "reviewer",
    peopleRisk: testState.status === "Possible Minors" ? "Possible minors" : publicBase.peopleRisk,
    consentStatus: testState.status === "Possible Minors" ? "Needs review" : publicBase.consentStatus,
    rightsStatus: testState.status === "Do Not Use" ? "Do not use" : publicBase.rightsStatus,
    rightsNotes: `Beta status fixture from LM Photos release set. Original source is public-ready; this record is held as ${testState.status} for Joanna workflow testing.`,
    usageGuidance:
      testState.status === "Approved Internal"
        ? "Beta fixture: internal-only status for workflow testing. Underlying LM Photos source is cleared for eventual public release."
        : "Beta fixture: held out of public reuse to test review, archive, minors, or do-not-use workflows.",
    downloadPolicy: testState.status === "Approved Internal" ? "internal-approved-copy-allowed" : "not-downloadable",
    reuseTier: testState.status === "Searchable Archive" ? "archive-only" : testState.status === "Approved Internal" ? "stock-safe" : "context-safe",
    visibilityTier: testState.status === "Approved Internal" ? "internal/member" : testState.status === "Searchable Archive" ? "archive" : "reviewer/admin",
    sensitivityClass: testState.status === "Possible Minors" ? "youth-sensitive" : testState.status === "Searchable Archive" ? "archive-restricted" : publicBase.sensitivityClass,
    domainReviewer: testState.status === "Possible Minors" ? "RE/minors" : publicBase.domainReviewer
  };
}

function applyLmPhotoMiniBetaRelease(assets: StockMediaAsset[]) {
  return assets.map((asset) => {
    if (!isLmPhotoAsset(asset)) return asset;
    const testState = lmPhotoTestStatus(asset);
    return testState ? releaseTestLmPhoto(asset, testState) : releasePublicLmPhoto(asset);
  });
}

export async function getActiveMediaSource() {
  const exportPath = latestMetadataExportPath();
  if (cachedAssets && cachedStatus) {
    const nextSourceKey = cachedStatus.adapter === "exported-metadata"
      ? exportPath
      : cachedStatus.adapter === "demo-fallback" && exportPath
        ? exportPath
        : cachedSourceKey;
    if (cachedSourceKey === nextSourceKey) {
      return { assets: cachedAssets, status: cachedStatus };
    }
    clearMediaSourceCache();
  }

  const apiAssets = await getAssetsFromResourceSpaceApi();
  if (apiAssets?.length) {
    cachedAssets = applyLmPhotoMiniBetaRelease(apiAssets);
    cachedStatus = resourceSpaceApiStatus;
    cachedSourceKey = "resourcespace-api";
    return { assets: cachedAssets, status: cachedStatus };
  }

  const exportAssets = await getAssetsFromExport();
  if (exportAssets?.length) {
    cachedAssets = applyLmPhotoMiniBetaRelease(exportAssets);
    cachedStatus = {
      ...exportedMetadataStatus,
      detail: exportPath
        ? "Reading latest ResourceSpace metadata export. Approval writes still require ResourceSpace API field mapping."
        : exportedMetadataStatus.detail
    };
    cachedSourceKey = exportPath;
    return { assets: cachedAssets, status: cachedStatus };
  }

  cachedAssets = applyLmPhotoMiniBetaRelease(demoFallbackAssets);
  cachedStatus = demoFallbackStatus;
  cachedSourceKey = exportPath ? null : "demo-fallback";
  return { assets: cachedAssets, status: cachedStatus };
}

export function clearMediaSourceCache() {
  cachedAssets = null;
  cachedStatus = null;
  cachedSourceKey = null;
  clearDerivativeFileIndex();
}

export function findFilestoreDerivative(id: string, variant: ImageVariant) {
  return findResourceSpaceImageDerivative(id, variant);
}
