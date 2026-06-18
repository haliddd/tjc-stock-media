import fs from "node:fs";
import type { AccessAction } from "@/lib/access-decisions";
import { assetResourceRef } from "@/lib/asset-refs";
import type { AuditEventRecord } from "@/lib/audit-log";
import type { getAssetRecordById } from "@/lib/catalog";
import type { createDamRouteSession } from "@/lib/dam-route-session";
import type { DownloadTicketRecord } from "@/lib/download-tickets";
import { productionRuntime } from "@/lib/env";
import type { ImageVariant } from "@/lib/images";
import { damFilenameForRendition } from "@/lib/dam-filenames";
import { findFilestoreDerivative } from "@/lib/media-source";
import { safeSlugText } from "@/lib/persisted-record-safety";
import { normalizeDisplayTextField, readJsonObject } from "@/lib/request-validation";
import type { StockMediaAsset } from "@/lib/types";

type AssetRecordResult = Awaited<ReturnType<typeof getAssetRecordById>>;
type DamRouteSession = ReturnType<typeof createDamRouteSession>;
type AssetRecord = NonNullable<AssetRecordResult["asset"]>;
type DownloadAuditEvent = Omit<AuditEventRecord, "id" | "createdAt" | "actor"> & { actor?: string };
const generatedFallbackApprovedCopyIds = new Set(["367", "9101", "9105"]);
const generatedFallbackJpegBase64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Aaf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/Aaf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IX//2gAMAwEAAgADAAAAEP/EFBQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EFBQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EFBABAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z";

export type DeliveredImage = {
  bytes: ArrayBuffer;
  contentType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
};
type DownloadGateBody = {
  role?: unknown;
  variant?: unknown;
  usageChannel?: unknown;
  reason?: unknown;
  termsAccepted?: unknown;
};
export type DownloadGateInput = {
  role?: string;
  variant: "download";
  requestedVariant: string | null;
  usageChannel: string | null;
  reason: string | null;
  termsAccepted: boolean;
};
export type ThumbnailDeliveryInput = {
  variant: ImageVariant;
  action: AccessAction;
};
export type ThumbnailDeliveryRouteError = {
  body: {
    error: string;
  } & Record<string, unknown>;
  status: 400 | 403 | 404;
};
export type DownloadDeliveryRouteError = {
  body: {
    error: string;
  } & Record<string, unknown>;
  status: 400 | 403 | 404;
};
export type ThumbnailImageResponse = {
  body: BodyInit;
  headers: Record<string, string>;
};
export type ApprovedCopyImageResponse = {
  body: BodyInit;
  headers: Record<string, string>;
};
export type ApprovedCopyDelivery =
  | { status: "ready"; image: DeliveredImage; fileName: string }
  | { status: "missing-derivative" | "unavailable-derivative" };
export type ThumbnailDerivativeDelivery =
  | { status: "ready"; image: DeliveredImage }
  | { status: "missing-derivative" | "unavailable-derivative"; placeholderLabel: string; asset?: Pick<StockMediaAsset, "id" | "title" | "mediaType" | "imageDimensions" | "resourceSpaceId"> };

export function supportedImageContentType(bytes: Buffer): DeliveredImage["contentType"] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii"))) return "image/gif";
  return null;
}

export function readDeliveredImage(filePath: string): DeliveredImage | null {
  try {
    const fileBytes = fs.readFileSync(filePath);
    const contentType = supportedImageContentType(fileBytes);
    if (!contentType) return null;
    const bytes = new ArrayBuffer(fileBytes.byteLength);
    new Uint8Array(bytes).set(fileBytes);
    return { bytes, contentType };
  } catch {
    return null;
  }
}

function generatedFallbackApprovedCopy(id: string, source?: AssetRecordResult["source"]): DeliveredImage | null {
  if (source?.adapter !== "demo-fallback" || !generatedFallbackApprovedCopyIds.has(id)) return null;
  if (generatedFallbackApprovedCopyBlocked(id, source)) return null;
  const fileBytes = Buffer.from(generatedFallbackJpegBase64, "base64");
  const bytes = new ArrayBuffer(fileBytes.byteLength);
  new Uint8Array(bytes).set(fileBytes);
  return { bytes, contentType: "image/jpeg" };
}

function generatedFallbackApprovedCopyBlocked(id: string, source?: AssetRecordResult["source"]) {
  return source?.adapter === "demo-fallback"
    && generatedFallbackApprovedCopyIds.has(id)
    && (process.env.VERCEL === "1" || productionRuntime());
}

export function thumbnailMalformedIdError(): ThumbnailDeliveryRouteError {
  return { body: { error: "Malformed asset id." }, status: 400 };
}

export function thumbnailNotFoundError(session: DamRouteSession, source: AssetRecordResult["source"]): ThumbnailDeliveryRouteError {
  return { body: { error: "Asset not found.", ...session.sourceEnvelope(source) }, status: 404 };
}

export function thumbnailAccessDeniedError(reason: string | undefined, session: DamRouteSession, source: AssetRecordResult["source"]): ThumbnailDeliveryRouteError {
  return { body: { error: reason || "Preview restricted.", ...session.sourceEnvelope(source) }, status: 403 };
}

export function thumbnailDownloadVariantDeniedError(session: DamRouteSession, source: AssetRecordResult["source"]): ThumbnailDeliveryRouteError {
  return {
    body: {
      error: "Download-grade derivatives require the approved-copy download gate.",
      requiredAction: "request-download-ticket",
      ...session.sourceEnvelope(source)
    },
    status: 403
  };
}

function svgText(value: string) {
  return value.replace(/[<>&"]/g, "");
}

function previewSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function localBetaPreviewPalette(seed: number) {
  const palettes = [
    ["#d8efe7", "#f6f1d6", "#1f5f52"],
    ["#e6eef8", "#f3dfd3", "#284d7a"],
    ["#f1e7d8", "#d8ebef", "#6f4a21"],
    ["#e8ead6", "#f7e1ec", "#56621f"],
    ["#e3e1f4", "#d8efe2", "#4b4478"]
  ];
  return palettes[seed % palettes.length];
}

function wrapSvgLines(value: string, maxChars = 24, maxLines = 3) {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  for (const word of words) {
    const current = lines[lines.length - 1] || "";
    if (!current || `${current} ${word}`.length > maxChars) {
      if (lines.length >= maxLines) break;
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  }
  if (!lines.length) return ["Local beta preview"];
  if (words.join(" ").length > lines.join(" ").length) lines[lines.length - 1] = `${lines[lines.length - 1].replace(/\.+$/, "")}...`;
  return lines;
}

function generatedLocalBetaPreviewSvg(asset: Pick<StockMediaAsset, "id" | "title" | "mediaType" | "imageDimensions" | "resourceSpaceId">, label: string) {
  const title = svgText(asset.title || label || `Resource ${asset.id}`);
  const ref = svgText(String(asset.resourceSpaceId || asset.id));
  const type = svgText((asset.mediaType || "media").toUpperCase());
  const dimensions = svgText(asset.imageDimensions || "local beta preview");
  const [primary, secondary, ink] = localBetaPreviewPalette(previewSeed(`${asset.id}:${asset.title}`));
  const titleLines = wrapSvgLines(title);
  const lineStart = 236 - ((titleLines.length - 1) * 22);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${primary}"/>
      <stop offset="1" stop-color="${secondary}"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="14" flood-color="#18362f" flood-opacity=".18"/>
    </filter>
  </defs>
  <rect width="640" height="480" fill="url(#bg)"/>
  <circle cx="108" cy="96" r="76" fill="#ffffff" opacity=".42"/>
  <circle cx="548" cy="382" r="118" fill="#ffffff" opacity=".32"/>
  <path d="M0 360 C130 300 210 420 340 350 S520 250 640 310 V480 H0 Z" fill="#ffffff" opacity=".32"/>
  <rect x="96" y="86" width="448" height="308" rx="22" fill="#fbfcfa" opacity=".9" filter="url(#shadow)"/>
  <rect x="122" y="116" width="396" height="170" rx="18" fill="${primary}" opacity=".72"/>
  <path d="M122 286 L222 190 L296 248 L352 202 L518 286 Z" fill="${ink}" opacity=".28"/>
  <circle cx="428" cy="164" r="34" fill="${ink}" opacity=".24"/>
  <text x="320" y="330" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" font-weight="800" fill="${ink}" letter-spacing="1.5">${type} PREVIEW</text>
  ${titleLines.map((line, index) => `<text x="320" y="${lineStart + index * 42}" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="34" font-weight="800" fill="#10251f">${svgText(line)}</text>`).join("\n  ")}
  <text x="320" y="360" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="16" font-weight="700" fill="#43564f">Reference code ${ref} · ${dimensions}</text>
  <text x="320" y="386" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="14" font-weight="700" fill="#6b766f">Generated local beta preview. Original/source remains restricted.</text>
</svg>`;
}

function placeholderSvg(label: string) {
  const safeLabel = svgText(label);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480" role="img" aria-label="${safeLabel}">
  <rect width="640" height="480" fill="#eef1ed"/>
  <path d="M0 480 640 0" stroke="#dfe6df" stroke-width="8"/>
  <rect x="232" y="196" width="176" height="84" rx="8" fill="#f7f8f6" stroke="#d7ddd5"/>
  <path d="M276 252h88l-28-36-22 26-14-16-24 26Z" fill="#8b958d"/>
  <circle cx="286" cy="222" r="10" fill="#8b958d"/>
  <text x="320" y="316" text-anchor="middle" font-family="ui-sans-serif, system-ui, sans-serif" font-size="22" font-weight="700" fill="#5d675f">${safeLabel}</text>
</svg>`;
}

export function thumbnailPlaceholderResponse(label: string): ThumbnailImageResponse {
  return {
    body: placeholderSvg(label),
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=60"
    }
  };
}

export function readThumbnailDerivativeDelivery(id: string, variant: ImageVariant, asset?: Pick<StockMediaAsset, "id" | "title" | "mediaType" | "imageDimensions" | "resourceSpaceId">): ThumbnailDerivativeDelivery {
  const filePath = findFilestoreDerivative(id, variant);
  if (!filePath) return { status: "missing-derivative", placeholderLabel: "Local beta preview", asset };
  const image = readDeliveredImage(filePath);
  if (!image) return { status: "unavailable-derivative", placeholderLabel: "Local beta preview", asset };
  return { status: "ready", image };
}

export function thumbnailImageResponse(delivery: ThumbnailDerivativeDelivery): ThumbnailImageResponse {
  if (delivery.status !== "ready" && delivery.asset) {
    return {
      body: generatedLocalBetaPreviewSvg(delivery.asset, delivery.placeholderLabel),
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "private, max-age=300",
        "X-TJC-Preview-Mode": "generated-local-beta"
      }
    };
  }
  if (delivery.status !== "ready") return thumbnailPlaceholderResponse(delivery.placeholderLabel);
  return {
    body: delivery.image.bytes,
    headers: {
      "Content-Type": delivery.image.contentType,
      "Cache-Control": "private, max-age=300"
    }
  };
}

export function downloadMalformedIdError(): DownloadDeliveryRouteError {
  return { body: { error: "Malformed asset id." }, status: 400 };
}

export function downloadNotFoundError(session: DamRouteSession, source: AssetRecordResult["source"]): DownloadDeliveryRouteError {
  return { body: { error: "Asset not found", ...session.sourceEnvelope(source) }, status: 404 };
}

function downloadAuditSource(session: DamRouteSession, source: AssetRecordResult["source"]) {
  return session.sourceEnvelope(source).source;
}

export function downloadRoleDeniedError(session: DamRouteSession, source: AssetRecordResult["source"]): DownloadDeliveryRouteError {
  return {
    body: {
      allowed: false,
      error: "Not approved for this role. Source-file access stays restricted.",
      ...session.sourceEnvelope(source)
    },
    status: 403
  };
}

export function approvedCopyUnavailableError(delivery: ApprovedCopyDelivery, session: DamRouteSession, source: AssetRecordResult["source"]): DownloadDeliveryRouteError {
  return {
    body: {
      error: delivery.status === "missing-derivative"
        ? "Approved derivative not available in local filestore."
        : "Approved derivative is indexed but unavailable.",
      ...session.sourceEnvelope(source)
    },
    status: 404
  };
}

export function downloadRoleDeniedAuditEvent(asset: AssetRecord, session: DamRouteSession, source: AssetRecordResult["source"]): DownloadAuditEvent {
  const auditSource = downloadAuditSource(session, source);
  return {
    type: "denied_download",
    role: session.role,
    actor: session.identity.id,
    assetId: asset.id,
    resourceSpaceId: assetResourceRef(asset),
    status: "denied",
    summary: "Approved copy download denied; original/master remains restricted.",
    details: { source: auditSource.label, sourceDetail: auditSource.detail, assetStatus: asset.status }
  };
}

export function approvedCopyDownloadedAuditEvent(
  asset: AssetRecord,
  delivery: Extract<ApprovedCopyDelivery, { status: "ready" }>,
  session: DamRouteSession,
  source: AssetRecordResult["source"],
  ticket?: DownloadTicketRecord
): DownloadAuditEvent {
  const auditSource = downloadAuditSource(session, source);
  return {
    type: "approved_download",
    role: session.role,
    actor: session.identity.id,
    assetId: asset.id,
    resourceSpaceId: assetResourceRef(asset),
    status: "allowed",
    summary: "Approved copy downloaded.",
    details: {
      source: auditSource.label,
      sourceDetail: auditSource.detail,
      fileName: delivery.fileName,
      ticketId: ticket?.id || null,
      gateAuditId: ticket?.gateAuditId || null,
      usageChannel: ticket?.scope || null,
      reason: ticket?.reason || null,
      termsAcceptedAt: ticket?.termsAcceptedAt || null
    }
  };
}

export function approvedCopyImageResponse(delivery: Extract<ApprovedCopyDelivery, { status: "ready" }>): ApprovedCopyImageResponse {
  return {
    body: delivery.image.bytes,
    headers: {
      "Content-Type": delivery.image.contentType,
      "Content-Disposition": `attachment; filename="${delivery.fileName}"`,
      "Cache-Control": "no-store"
    }
  };
}

function isStockMediaAsset(value: unknown): value is StockMediaAsset {
  return Boolean(value && typeof value === "object" && "id" in value && "mediaType" in value);
}

export function approvedCopyFileName(titleOrAsset: unknown, id: string) {
  if (isStockMediaAsset(titleOrAsset)) return damFilenameForRendition(titleOrAsset, "web");
  const title = titleOrAsset;
  const safeTitle = safeSlugText(normalizeDisplayTextField(title, "", 80), 80) || `asset-${id}`;
  return `${safeTitle}-approved-copy.jpg`;
}

export function hasApprovedCopyDerivative(id: string, source?: AssetRecordResult["source"]) {
  if (generatedFallbackApprovedCopyBlocked(id, source)) return false;
  return Boolean(findFilestoreDerivative(id, "download") || generatedFallbackApprovedCopy(id, source));
}

export function readApprovedCopyDelivery(id: string, titleOrAsset: unknown, source?: AssetRecordResult["source"]): ApprovedCopyDelivery {
  const fileName = approvedCopyFileName(titleOrAsset, id);
  if (generatedFallbackApprovedCopyBlocked(id, source)) return { status: "missing-derivative" };
  const filePath = findFilestoreDerivative(id, "download");
  if (!filePath) {
    const generated = generatedFallbackApprovedCopy(id, source);
    return generated ? { status: "ready", image: generated, fileName } : { status: "missing-derivative" };
  }
  const image = readDeliveredImage(filePath);
  if (!image) return { status: "unavailable-derivative" };
  return { status: "ready", image, fileName };
}

function normalizeDownloadVariant(_value: unknown): DownloadGateInput["variant"] {
  return "download";
}

function normalizeThumbnailVariant(value: unknown): ImageVariant {
  if (value === "download") return "download";
  if (value === "detail" || value === "preview") return "detail";
  if (value === "collection") return "collection";
  if (value === "card") return "card";
  return "small";
}

export function readThumbnailDeliveryInput(search: Pick<URLSearchParams, "get">): ThumbnailDeliveryInput {
  const variant = normalizeThumbnailVariant(search.get("variant"));
  return {
    variant,
    action: variant === "download" ? "downloadApprovedCopy" : variant === "detail" ? "viewDetailPreview" : "viewThumbnail"
  };
}

export async function readDownloadGateInput(request: { json(): Promise<unknown> }): Promise<DownloadGateInput> {
  const body = await readJsonObject<DownloadGateBody>(request);
  const requestedVariant = normalizeDisplayTextField(body.variant, "", 40) || null;
  return {
    role: typeof body.role === "string" ? body.role : undefined,
    variant: normalizeDownloadVariant(body.variant),
    requestedVariant,
    usageChannel: normalizeDisplayTextField(body.usageChannel, "", 80) || null,
    reason: normalizeDisplayTextField(body.reason, "", 240) || null,
    termsAccepted: body.termsAccepted === true
  };
}
