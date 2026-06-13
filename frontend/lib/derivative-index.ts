import fs from "node:fs";
import path from "node:path";
import { writableRuntimeRoot } from "@/lib/env";
import { latestMetadataExportPath } from "@/lib/media-source/exported-metadata";
import type { ImageVariant } from "@/lib/images";
import type { StockMediaAsset } from "@/lib/types";

export type DerivativeIndexEntry = {
  resourceId: string;
  variant: ImageVariant;
  filePath: string;
  contentType: "image/jpeg";
  checksumVersion: string;
  generatedAt: string;
};

export type GovernedRenditionKind =
  | "thumbnail"
  | "detail-preview"
  | "approved-copy"
  | "original-master-restricted";

export type GovernedRenditionPolicy = {
  kind: GovernedRenditionKind;
  downloadGrade: boolean;
  routeBoundary: "thumbnail-preview" | "approved-copy-gate" | "original-access-request";
  durableStorage: false;
  productionReadyFactory: false;
  detail: string;
};

export type DeliveryReadinessUse = "public-web" | "public-print" | "internal-preview";

export type DeliveryReadinessManifestItem = {
  id: "thumbnail" | "preview" | "approved-web-copy" | "approved-print-copy" | "original-restricted";
  label: string;
  status: "ready" | "blocked" | "request-only";
  routeBoundary: GovernedRenditionPolicy["routeBoundary"];
  downloadGrade: boolean;
  satisfies: DeliveryReadinessUse[];
  detail: string;
};

export type DeliveryReadinessManifest = {
  assetId: string;
  chosenUse: DeliveryReadinessUse;
  portalReadyForChosenUse: boolean;
  originalMasterIncluded: false;
  storageTruth: "local-export-readiness-only";
  items: DeliveryReadinessManifestItem[];
};

type DerivativeIndexManifest = {
  version: 1;
  filestore: string;
  sourceKey: string;
  generatedAt: string;
  entries: DerivativeIndexEntry[];
};

const variantSuffixes: Record<ImageVariant, string[]> = {
  small: ["thm_", "col_", "pre_"],
  thumb: ["thm_", "col_", "pre_"],
  card: ["scr_", "pre_", "lpr_", "col_", "thm_"],
  collection: ["scr_", "lpr_", "pre_", "col_", "thm_"],
  detail: ["lpr_", "hpr_", "scr_", "pre_", "col_"],
  preview: ["lpr_", "hpr_", "scr_", "pre_", "col_"],
  download: ["lpr_", "hpr_", "scr_", "pre_"]
};

const variantPolicies: Record<ImageVariant, GovernedRenditionPolicy> = {
  small: {
    kind: "thumbnail",
    downloadGrade: false,
    routeBoundary: "thumbnail-preview",
    durableStorage: false,
    productionReadyFactory: false,
    detail: "Small preview derivative for browsing only; it cannot satisfy approved-copy download readiness."
  },
  thumb: {
    kind: "thumbnail",
    downloadGrade: false,
    routeBoundary: "thumbnail-preview",
    durableStorage: false,
    productionReadyFactory: false,
    detail: "Thumbnail derivative for browsing only; it cannot satisfy approved-copy download readiness."
  },
  card: {
    kind: "thumbnail",
    downloadGrade: false,
    routeBoundary: "thumbnail-preview",
    durableStorage: false,
    productionReadyFactory: false,
    detail: "Card preview derivative for discovery only; it cannot satisfy approved-copy download readiness."
  },
  collection: {
    kind: "thumbnail",
    downloadGrade: false,
    routeBoundary: "thumbnail-preview",
    durableStorage: false,
    productionReadyFactory: false,
    detail: "Collection preview derivative for browsing only; it cannot satisfy approved-copy download readiness."
  },
  detail: {
    kind: "detail-preview",
    downloadGrade: false,
    routeBoundary: "thumbnail-preview",
    durableStorage: false,
    productionReadyFactory: false,
    detail: "Detail preview supports review/inspection; approved-copy download still requires the download gate."
  },
  preview: {
    kind: "detail-preview",
    downloadGrade: false,
    routeBoundary: "thumbnail-preview",
    durableStorage: false,
    productionReadyFactory: false,
    detail: "Preview derivative supports review/inspection; approved-copy download still requires the download gate."
  },
  download: {
    kind: "approved-copy",
    downloadGrade: true,
    routeBoundary: "approved-copy-gate",
    durableStorage: false,
    productionReadyFactory: false,
    detail: "Approved-copy derivative must use the approved-copy POST ticket and GET consume gate."
  }
};

let cachedManifest: DerivativeIndexManifest | null = null;

function manifestPath() {
  return path.join(writableRuntimeRoot(), ".runtime", "derivative-index.json");
}

function filestoreRoot() {
  return path.join(writableRuntimeRoot(), ".runtime", "filestore");
}

function safeStatMtime(filePath: string) {
  try {
    return String(Math.trunc(fs.statSync(filePath).mtimeMs));
  } catch {
    return "missing";
  }
}

function sourceKey(filestore: string) {
  const exportPath = latestMetadataExportPath();
  return [
    filestore,
    safeStatMtime(filestore),
    exportPath || "no-export",
    exportPath ? safeStatMtime(exportPath) : "no-export-mtime"
  ].join("|");
}

function resourceIdFromDerivativeName(name: string) {
  const match = name.match(/^([A-Za-z0-9_-]+)(?:thm_|col_|pre_|scr_|lpr_|hpr_)/);
  return match?.[1] || "";
}

function variantForFileName(name: string): ImageVariant[] {
  return (Object.entries(variantSuffixes) as Array<[ImageVariant, string[]]>)
    .filter(([, suffixes]) => suffixes.some((suffix) => name.startsWith(`${resourceIdFromDerivativeName(name)}${suffix}`)))
    .map(([variant]) => variant);
}

function readManifest(filestore: string, key: string): DerivativeIndexManifest | null {
  if (cachedManifest?.filestore === filestore && cachedManifest.sourceKey === key) return cachedManifest;
  try {
    const parsed = JSON.parse(fs.readFileSync(manifestPath(), "utf8")) as DerivativeIndexManifest;
    if (parsed.version !== 1 || parsed.filestore !== filestore || parsed.sourceKey !== key || !Array.isArray(parsed.entries)) return null;
    cachedManifest = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function writeManifest(manifest: DerivativeIndexManifest) {
  cachedManifest = manifest;
  try {
    fs.mkdirSync(path.dirname(manifestPath()), { recursive: true });
    fs.writeFileSync(manifestPath(), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  } catch {
    // Local index persistence is an optimization; in-memory index still serves this process.
  }
}

function buildManifest(filestore: string, key: string): DerivativeIndexManifest {
  const entries: DerivativeIndexEntry[] = [];
  const stack = [filestore];
  const generatedAt = new Date().toISOString();
  while (stack.length) {
    const dir = stack.pop();
    if (!dir) break;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      if (!/\.(jpg|jpeg)$/i.test(entry.name)) continue;
      const resourceId = resourceIdFromDerivativeName(entry.name);
      if (!resourceId) continue;
      const stat = fs.statSync(fullPath);
      for (const variant of variantForFileName(entry.name)) {
        entries.push({
          resourceId,
          variant,
          filePath: fullPath,
          contentType: "image/jpeg",
          checksumVersion: `${stat.size}:${Math.trunc(stat.mtimeMs)}`,
          generatedAt
        });
      }
    }
  }
  const manifest = { version: 1 as const, filestore, sourceKey: key, generatedAt, entries };
  writeManifest(manifest);
  return manifest;
}

function derivativeManifest() {
  const filestore = filestoreRoot();
  if (!fs.existsSync(filestore)) return null;
  const key = sourceKey(filestore);
  return readManifest(filestore, key) || buildManifest(filestore, key);
}

export function clearDerivativeIndex() {
  cachedManifest = null;
}

export function findDerivativeEntry(id: string, variant: ImageVariant) {
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return null;
  const manifest = derivativeManifest();
  if (!manifest) return null;
  const suffixes = variantSuffixes[variant];
  const candidates = new Array<DerivativeIndexEntry | null>(suffixes.length).fill(null);
  for (const entry of manifest.entries) {
    if (entry.resourceId !== id || entry.variant !== variant) continue;
    const name = path.basename(entry.filePath);
    const rank = suffixes.findIndex((suffix) => name.startsWith(`${id}${suffix}`));
    if (rank === -1) continue;
    candidates[rank] ||= entry;
    if (rank === 0) return entry;
  }
  return candidates.find(Boolean) || null;
}

export function derivativeIndexDiagnostics() {
  const manifest = derivativeManifest();
  return {
    indexed: Boolean(manifest),
    entries: manifest?.entries.length || 0,
    generatedAt: manifest?.generatedAt,
    sourceKey: manifest?.sourceKey,
    storageMode: "local-runtime-filestore-index",
    durable: false,
    productionReadyFactory: false,
    detail: "Local .runtime derivative index is a read/cache helper, not a durable production rendition factory."
  };
}

export function governedRenditionPolicyForVariant(variant: ImageVariant): GovernedRenditionPolicy {
  return variantPolicies[variant];
}

export function thumbnailVariantCanSatisfyApprovedCopy(variant: ImageVariant) {
  const policy = governedRenditionPolicyForVariant(variant);
  return policy.routeBoundary === "approved-copy-gate" && policy.downloadGrade;
}

export function originalMasterRenditionPolicy(): GovernedRenditionPolicy {
  return {
    kind: "original-master-restricted",
    downloadGrade: true,
    routeBoundary: "original-access-request",
    durableStorage: false,
    productionReadyFactory: false,
    detail: "Original/master access is request-only and remains outside approved-copy delivery."
  };
}

function hasAnyPreview(asset: StockMediaAsset, variants: Array<keyof NonNullable<StockMediaAsset["imageUrls"]>>) {
  return variants.some((variant) => Boolean(asset.imageUrls?.[variant]));
}

export function buildDeliveryReadinessManifest(
  asset: StockMediaAsset,
  chosenUse: DeliveryReadinessUse = "public-web"
): DeliveryReadinessManifest {
  const thumbnailReady = Boolean(asset.thumbnail || hasAnyPreview(asset, ["small", "card", "collection"]));
  const previewReady = Boolean(asset.preview || hasAnyPreview(asset, ["detail", "card", "collection"]));
  const approvedWebReady = asset.status === "Approved Public" && asset.downloadPolicy === "approved-copy-allowed" && Boolean(asset.imageUrls?.download);
  const printReady = false;
  const items: DeliveryReadinessManifestItem[] = [
    {
      id: "thumbnail",
      label: "Thumbnail",
      status: thumbnailReady ? "ready" : "blocked",
      routeBoundary: "thumbnail-preview",
      downloadGrade: false,
      satisfies: thumbnailReady ? ["internal-preview"] : [],
      detail: thumbnailReady ? "Role-safe thumbnail derivative can render for browsing." : "Thumbnail derivative is not exported."
    },
    {
      id: "preview",
      label: "Preview",
      status: previewReady ? "ready" : "blocked",
      routeBoundary: "thumbnail-preview",
      downloadGrade: false,
      satisfies: previewReady ? ["internal-preview"] : [],
      detail: previewReady ? "Role-safe preview derivative can render for inspection." : "Preview derivative is not exported."
    },
    {
      id: "approved-web-copy",
      label: "Approved web copy",
      status: approvedWebReady ? "ready" : "blocked",
      routeBoundary: "approved-copy-gate",
      downloadGrade: true,
      satisfies: approvedWebReady ? ["public-web"] : [],
      detail: approvedWebReady ? "Approved web copy must be delivered through the POST ticket and GET consume gate." : "Approved web copy is missing or not cleared for public delivery."
    },
    {
      id: "approved-print-copy",
      label: "Approved print copy",
      status: printReady ? "ready" : "blocked",
      routeBoundary: "approved-copy-gate",
      downloadGrade: true,
      satisfies: printReady ? ["public-print"] : [],
      detail: "Print-approved derivative factory is not configured; request reviewer approval for print use."
    },
    {
      id: "original-restricted",
      label: "Original restricted",
      status: "request-only",
      routeBoundary: "original-access-request",
      downloadGrade: true,
      satisfies: [],
      detail: "Original/master access stays a request workflow with approver, expiry, audit, and revocation."
    }
  ];

  return {
    assetId: asset.id,
    chosenUse,
    portalReadyForChosenUse: items.some((item) => item.status === "ready" && item.satisfies.includes(chosenUse)),
    originalMasterIncluded: false,
    storageTruth: "local-export-readiness-only",
    items
  };
}
