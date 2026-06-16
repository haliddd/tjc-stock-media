import fs from "node:fs";
import type { AccessAction } from "@/lib/access-decisions";
import { assetResourceRef } from "@/lib/asset-refs";
import type { AuditEventRecord } from "@/lib/audit-log";
import type { getAssetRecordById } from "@/lib/catalog";
import type { createDamRouteSession } from "@/lib/dam-route-session";
import type { DownloadTicketRecord } from "@/lib/download-tickets";
import { productionRuntime } from "@/lib/env";
import type { ImageVariant } from "@/lib/images";
import { findFilestoreDerivative } from "@/lib/media-source";
import { safeSlugText } from "@/lib/persisted-record-safety";
import { normalizeDisplayTextField, readJsonObject } from "@/lib/request-validation";

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
  | { status: "missing-derivative" | "unavailable-derivative"; placeholderLabel: string };

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
  if (process.env.VERCEL === "1" || productionRuntime()) return null;
  const fileBytes = Buffer.from(generatedFallbackJpegBase64, "base64");
  const bytes = new ArrayBuffer(fileBytes.byteLength);
  new Uint8Array(bytes).set(fileBytes);
  return { bytes, contentType: "image/jpeg" };
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

function placeholderSvg(label: string) {
  const safeLabel = label.replace(/[<>&"]/g, "");
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

export function readThumbnailDerivativeDelivery(id: string, variant: ImageVariant): ThumbnailDerivativeDelivery {
  const filePath = findFilestoreDerivative(id, variant);
  if (!filePath) return { status: "missing-derivative", placeholderLabel: "Preview pending" };
  const image = readDeliveredImage(filePath);
  if (!image) return { status: "unavailable-derivative", placeholderLabel: "Preview unavailable" };
  return { status: "ready", image };
}

export function thumbnailImageResponse(delivery: ThumbnailDerivativeDelivery): ThumbnailImageResponse {
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

export function approvedCopyFileName(title: unknown, id: string) {
  const safeTitle = safeSlugText(normalizeDisplayTextField(title, "", 80), 80) || `asset-${id}`;
  return `${safeTitle}-approved-copy.jpg`;
}

export function hasApprovedCopyDerivative(id: string, source?: AssetRecordResult["source"]) {
  return Boolean(findFilestoreDerivative(id, "download") || generatedFallbackApprovedCopy(id, source));
}

export function readApprovedCopyDelivery(id: string, title: unknown, source?: AssetRecordResult["source"]): ApprovedCopyDelivery {
  const filePath = findFilestoreDerivative(id, "download");
  if (!filePath) {
    const generated = generatedFallbackApprovedCopy(id, source);
    return generated ? { status: "ready", image: generated, fileName: approvedCopyFileName(title, id) } : { status: "missing-derivative" };
  }
  const image = readDeliveredImage(filePath);
  if (!image) return { status: "unavailable-derivative" };
  return { status: "ready", image, fileName: approvedCopyFileName(title, id) };
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
  return {
    role: typeof body.role === "string" ? body.role : undefined,
    variant: normalizeDownloadVariant(body.variant),
    usageChannel: normalizeDisplayTextField(body.usageChannel, "", 80) || null,
    reason: normalizeDisplayTextField(body.reason, "", 240) || null,
    termsAccepted: body.termsAccepted === true
  };
}
