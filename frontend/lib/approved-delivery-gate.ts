import type { NextRequest } from "next/server";
import { buildPortalReuseDecision } from "@/lib/access-decisions";
import { assetResourceRef } from "@/lib/asset-refs";
import {
  appendRequiredAuditEvent,
  appendRequiredAuditEventWithId,
  createAuditEventId,
  type AuditEventRecord
} from "@/lib/audit-log";
import { getAssetRecordById } from "@/lib/catalog";
import { createDamRouteSession, type DamSessionInput } from "@/lib/dam-route-session";
import { buildDeliveryReadinessManifest } from "@/lib/delivery-readiness";
import { consumeDownloadTicket, mintDownloadTicket, validateDownloadTicket } from "@/lib/download-tickets";
import {
  approvedCopyDownloadedAuditEvent,
  approvedCopyImageResponse,
  hasApprovedCopyDerivative,
  readApprovedCopyDelivery,
  readDownloadGateInput,
  type ApprovedCopyImageResponse,
  type DownloadGateInput
} from "@/lib/media-delivery";
import { normalizeAssetId } from "@/lib/request-validation";
import type { DemoRole, MediaSourceStatus, StockMediaAsset } from "@/lib/types";

export type ApprovedDeliveryGateIntent = "request-ticket" | "deliver-copy";

export type ApprovedDeliveryGateInput = {
  request: NextRequest;
  assetId: string;
  intent: ApprovedDeliveryGateIntent;
};

export type ApprovedDeliveryGateJsonResult = {
  kind: "json";
  status: 200 | 400 | 403 | 404 | 500 | 503;
  body: Record<string, unknown>;
};

export type ApprovedDeliveryGateImageResult = {
  kind: "image";
  status: 200;
  body: ApprovedCopyImageResponse["body"];
  headers: ApprovedCopyImageResponse["headers"];
};

export type ApprovedDeliveryGateResult = ApprovedDeliveryGateJsonResult | ApprovedDeliveryGateImageResult;

type AssetRecordResult = Awaited<ReturnType<typeof getAssetRecordById>>;
type AssetRecord = NonNullable<AssetRecordResult["asset"]>;
type DamRouteSession = ReturnType<typeof createDamRouteSession>;
type AuditDraft = Parameters<typeof appendRequiredAuditEvent>[0];

export type ApprovedDeliveryGateDeps = {
  appendRequiredAuditEvent: typeof appendRequiredAuditEvent;
  appendRequiredAuditEventWithId: typeof appendRequiredAuditEventWithId;
  buildDeliveryReadinessManifest: typeof buildDeliveryReadinessManifest;
  buildPortalReuseDecision: typeof buildPortalReuseDecision;
  consumeDownloadTicket: typeof consumeDownloadTicket;
  createAuditEventId: typeof createAuditEventId;
  createDamRouteSession(request: NextRequest, input?: DamSessionInput): DamRouteSession;
  getAssetRecordById: typeof getAssetRecordById;
  hasApprovedCopyDerivative: typeof hasApprovedCopyDerivative;
  mintDownloadTicket: typeof mintDownloadTicket;
  readApprovedCopyDelivery: typeof readApprovedCopyDelivery;
  readDownloadGateInput: typeof readDownloadGateInput;
  validateDownloadTicket: typeof validateDownloadTicket;
};

export const approvedDeliveryGateDefaultDeps: ApprovedDeliveryGateDeps = {
  appendRequiredAuditEvent,
  appendRequiredAuditEventWithId,
  buildDeliveryReadinessManifest,
  buildPortalReuseDecision,
  consumeDownloadTicket,
  createAuditEventId,
  createDamRouteSession,
  getAssetRecordById,
  hasApprovedCopyDerivative,
  mintDownloadTicket,
  readApprovedCopyDelivery,
  readDownloadGateInput,
  validateDownloadTicket
};

const originalLikeRenditions = new Set(["original", "master", "source", "source-file", "source_file", "raw", "archive-master"]);

class RequiredAuditFailedError extends Error {}

function json(status: ApprovedDeliveryGateJsonResult["status"], body: Record<string, unknown>): ApprovedDeliveryGateJsonResult {
  return { kind: "json", status, body };
}

function auditRequiredErrorResponse(): ApprovedDeliveryGateJsonResult {
  return json(503, {
    allowed: false,
    error: "Required download audit could not be persisted.",
    requiredAction: "retry-after-audit-recovers",
    reasonCode: "audit-required"
  });
}

function internalErrorResponse(): ApprovedDeliveryGateJsonResult {
  return json(500, {
    allowed: false,
    error: "Approved delivery gate failed closed.",
    requiredAction: "retry",
    reasonCode: "approved-delivery-gate-error"
  });
}

function malformedIdResponse() {
  return json(400, {
    allowed: false,
    error: "Malformed asset id.",
    reasonCode: "malformed-asset-id"
  });
}

function safeBlockedResponse(input: {
  status: 403 | 404;
  requiredAction: string;
  reason: string;
  reasonCode: string;
  reasonCodes?: string[];
  label?: string;
  deliveryManifest?: ReturnType<typeof buildDeliveryReadinessManifest>;
}) {
  return json(input.status, {
    allowed: false,
    requiredAction: input.requiredAction,
    reason: input.reason,
    reasonCode: input.reasonCode,
    ...(input.reasonCodes?.length ? { reasonCodes: input.reasonCodes } : {}),
    ...(input.label ? { label: input.label } : {}),
    ...(input.deliveryManifest ? { deliveryManifest: input.deliveryManifest } : {})
  });
}

function requestedRendition(value: unknown): "approved-copy" | "original-master" {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return originalLikeRenditions.has(normalized) ? "original-master" : "approved-copy";
}

function sourceForAudit(session: DamRouteSession, source: MediaSourceStatus) {
  const envelope = session.sourceEnvelope(source);
  const auditSource = envelope.source;
  return auditSource;
}

function appendRequiredAudit(deps: ApprovedDeliveryGateDeps, event: AuditDraft) {
  try {
    return { ok: true as const, audit: deps.appendRequiredAuditEvent(event) };
  } catch {
    return { ok: false as const, result: auditRequiredErrorResponse() };
  }
}

function appendRequiredAuditWithId(deps: ApprovedDeliveryGateDeps, id: string, event: AuditDraft) {
  try {
    return { ok: true as const, audit: deps.appendRequiredAuditEventWithId(id, event) };
  } catch {
    return { ok: false as const, result: auditRequiredErrorResponse() };
  }
}

function auditBlockedAttempt(input: {
  deps: ApprovedDeliveryGateDeps;
  session: DamRouteSession;
  asset: AssetRecord;
  source: MediaSourceStatus;
  type?: AuditEventRecord["type"];
  status?: AuditEventRecord["status"];
  summary: string;
  reasonCode: string;
  usageChannel?: string | null;
  reason?: string | null;
  ticketId?: string | null;
  termsAccepted?: boolean | null;
}) {
  const auditSource = sourceForAudit(input.session, input.source);
  return appendRequiredAudit(input.deps, {
    type: input.type || "denied_download",
    role: input.session.role,
    actor: input.session.identity.id,
    assetId: input.asset.id,
    resourceSpaceId: assetResourceRef(input.asset),
    status: input.status || "denied",
    summary: input.summary,
    details: {
      source: auditSource.label,
      assetStatus: input.asset.status,
      reasonCode: input.reasonCode,
      usageChannel: input.usageChannel || null,
      reason: input.reason || null,
      ticketId: input.ticketId || null,
      termsAccepted: input.termsAccepted ?? null
    }
  });
}

function auditMissingAsset(input: {
  deps: ApprovedDeliveryGateDeps;
  session: DamRouteSession;
  assetId: string;
}) {
  return appendRequiredAudit(input.deps, {
    type: "denied_download",
    role: input.session.role,
    actor: input.session.identity.id,
    assetId: input.assetId,
    status: "denied",
    summary: "Approved delivery gate denied a missing asset request.",
    details: { reasonCode: "asset-not-found" }
  });
}

function roleOverrideDenied(input: {
  deps: ApprovedDeliveryGateDeps;
  session: DamRouteSession;
  assetId: string;
}) {
  input.session.recordUsage({
    type: "blocked_download_intent",
    assetId: input.assetId,
    route: `/api/download/${input.assetId}`,
    metadata: {
      reasonCode: input.session.roleOverride.reasonCode || "client-role-disabled",
      overrideSource: input.session.roleOverride.source,
      requestedRole: input.session.roleOverride.requestedRole
    }
  });
  const audit = appendRequiredAudit(input.deps, {
    type: "denied_download",
    role: input.session.role,
    actor: input.session.identity.id,
    assetId: input.assetId,
    status: "denied",
    summary: "Download gate denied client-supplied role override.",
    details: {
      reasonCode: input.session.roleOverride.reasonCode || "client-role-disabled",
      overrideSource: input.session.roleOverride.source,
      requestedRole: input.session.roleOverride.requestedRole
    }
  });
  if (!audit.ok) return audit.result;
  return json(403, {
    allowed: false,
    error: "Client-supplied download roles are disabled outside local demo mode.",
    requiredAction: "use-server-identity",
    reasonCode: "client-role-disabled"
  });
}

function requestOnlyOriginalFlow(input: {
  deps: ApprovedDeliveryGateDeps;
  session: DamRouteSession;
  asset: AssetRecord;
  source: MediaSourceStatus;
  usageChannel?: string | null;
  reason?: string | null;
}) {
  const audit = auditBlockedAttempt({
    deps: input.deps,
    session: input.session,
    asset: input.asset,
    source: input.source,
    type: "original_access_denied",
    status: "denied",
    summary: "Approved delivery gate denied original/master delivery through the normal route.",
    reasonCode: "original-request-only",
    usageChannel: input.usageChannel,
    reason: input.reason
  });
  if (!audit.ok) return audit.result;
  return safeBlockedResponse({
    status: 403,
    requiredAction: "request-original-access",
    reason: "Original/master delivery requires the governed request workflow.",
    reasonCode: "original-request-only"
  });
}

function notFound(input: {
  deps: ApprovedDeliveryGateDeps;
  session: DamRouteSession;
  assetId: string;
}) {
  const audit = auditMissingAsset(input);
  if (!audit.ok) return audit.result;
  return json(404, {
    allowed: false,
    error: "Asset not found",
    reason: "Asset not found",
    reasonCode: "asset-not-found"
  });
}

function sessionForGet(request: NextRequest, deps: ApprovedDeliveryGateDeps) {
  return deps.createDamRouteSession(request, {
    explicitRole: request.nextUrl.searchParams.get("role"),
    overridePolicy: "download-gate",
    overrideSource: "query"
  });
}

function sessionForPost(request: NextRequest, input: DownloadGateInput, deps: ApprovedDeliveryGateDeps) {
  const queryRole = request.nextUrl.searchParams.get("role");
  return deps.createDamRouteSession(request, {
    explicitRole: queryRole || input.role || null,
    overridePolicy: "download-gate",
    overrideSource: queryRole ? "query" : "body"
  });
}

function accessDeniedResponse(input: {
  deps: ApprovedDeliveryGateDeps;
  session: DamRouteSession;
  asset: StockMediaAsset;
  source: MediaSourceStatus;
  deliveryManifest: ReturnType<typeof buildDeliveryReadinessManifest>;
  usageChannel?: string | null;
  reason?: string | null;
}) {
  const portalDecision = input.deps.buildPortalReuseDecision(input.asset, input.session.role);
  const access = portalDecision.access.downloadApprovedCopy;
  const reasonCode = access.reasonCodes?.[0] || portalDecision.reuse.reasonCodes[0] || "policy-denied";
  const audit = auditBlockedAttempt({
    deps: input.deps,
    session: input.session,
    asset: input.asset,
    source: input.source,
    type: "denied_download",
    status: "denied",
    summary: "Approved delivery gate denied approved-copy delivery.",
    reasonCode,
    usageChannel: input.usageChannel,
    reason: input.reason
  });
  if (!audit.ok) return audit.result;
  return safeBlockedResponse({
    status: 403,
    requiredAction: input.asset.status === "Needs Review" ? "request-approval" : "review-rights-and-permissions",
    reason: access.reason || "This asset is not approved for this role.",
    reasonCode,
    reasonCodes: access.reasonCodes || portalDecision.reuse.reasonCodes,
    label: access.label || "Download blocked",
    deliveryManifest: input.deliveryManifest
  });
}

async function requestTicket(
  request: NextRequest,
  rawAssetId: string,
  deps: ApprovedDeliveryGateDeps
): Promise<ApprovedDeliveryGateResult> {
  const id = normalizeAssetId(rawAssetId);
  if (!id) return malformedIdResponse();

  const gateInput = await deps.readDownloadGateInput(request);
  const session = sessionForPost(request, gateInput, deps);
  if (session.roleOverride.denied) return roleOverrideDenied({ deps, session, assetId: id });

  const { asset, source } = await deps.getAssetRecordById(id);
  if (!asset) return notFound({ deps, session, assetId: id });

  if (requestedRendition(gateInput.requestedVariant) === "original-master") {
    return requestOnlyOriginalFlow({
      deps,
      session,
      asset,
      source,
      usageChannel: gateInput.usageChannel,
      reason: gateInput.reason
    });
  }

  const resourceSpaceId = assetResourceRef(asset);
  const deliveryManifest = deps.buildDeliveryReadinessManifest(asset, "public-web");
  const portalDecision = deps.buildPortalReuseDecision(asset, session.role);
  session.recordUsage({
    type: "download_gate",
    assetId: asset.id,
    resourceSpaceId,
    route: `/api/download/${asset.id}`,
    metadata: { termsAccepted: gateInput.termsAccepted, variant: gateInput.variant }
  });

  if (!gateInput.termsAccepted) {
    session.recordUsage({
      type: "blocked_download_intent",
      assetId: asset.id,
      resourceSpaceId,
      route: `/api/download/${asset.id}`,
      metadata: { reasonCode: "terms-not-accepted", usageChannel: gateInput.usageChannel, variant: gateInput.variant }
    });
    const audit = auditBlockedAttempt({
      deps,
      session,
      asset,
      source,
      type: "download_gate_checked",
      status: "blocked",
      summary: "Download gate blocked because usage terms were not accepted.",
      reasonCode: "terms-not-accepted",
      usageChannel: gateInput.usageChannel,
      reason: gateInput.reason,
      termsAccepted: false
    });
    if (!audit.ok) return audit.result;
    return safeBlockedResponse({
      status: 403,
      requiredAction: "accept-usage-terms",
      reason: "Accept the approved-copy usage terms before download.",
      reasonCode: "terms-not-accepted",
      deliveryManifest
    });
  }

  if (!portalDecision.access.downloadApprovedCopy.allowed) {
    session.recordUsage({
      type: "blocked_download_intent",
      assetId: asset.id,
      resourceSpaceId,
      route: `/api/download/${asset.id}`,
      metadata: { reasonCode: "policy-denied", usageChannel: gateInput.usageChannel, variant: gateInput.variant }
    });
    return accessDeniedResponse({
      deps,
      session,
      asset,
      source,
      deliveryManifest,
      usageChannel: gateInput.usageChannel,
      reason: gateInput.reason
    });
  }

  if (!deps.hasApprovedCopyDerivative(id, source)) {
    session.recordUsage({
      type: "blocked_download_intent",
      assetId: asset.id,
      resourceSpaceId,
      route: `/api/download/${asset.id}`,
      metadata: { reasonCode: "approved-derivative-missing", usageChannel: gateInput.usageChannel, variant: gateInput.variant }
    });
    const audit = auditBlockedAttempt({
      deps,
      session,
      asset,
      source,
      type: "download_gate_checked",
      status: "blocked",
      summary: "Download gate blocked because approved derivative is unavailable.",
      reasonCode: "approved-derivative-missing",
      usageChannel: gateInput.usageChannel,
      reason: gateInput.reason,
      termsAccepted: true
    });
    if (!audit.ok) return audit.result;
    return safeBlockedResponse({
      status: 404,
      requiredAction: "generate-approved-derivative",
      reason: "Approved derivative is not available yet.",
      reasonCode: "approved-derivative-missing",
      deliveryManifest
    });
  }

  const termsAcceptedAt = new Date().toISOString();
  const auditSource = sourceForAudit(session, source);
  const gateAuditId = deps.createAuditEventId();
  let ticket: ReturnType<typeof mintDownloadTicket>;
  try {
    ticket = deps.mintDownloadTicket({
      actor: session.identity.id,
      assetId: asset.id,
      resourceSpaceId,
      role: session.role,
      variant: gateInput.variant,
      scope: gateInput.usageChannel,
      reason: gateInput.reason,
      termsAcceptedAt,
      gateAuditId,
      sourceLabel: auditSource.label
    });
  } catch {
    const audit = auditBlockedAttempt({
      deps,
      session,
      asset,
      source,
      type: "download_gate_checked",
      status: "blocked",
      summary: "Download gate blocked because a one-time ticket could not be issued.",
      reasonCode: "ticket-mint-failed",
      usageChannel: gateInput.usageChannel,
      reason: gateInput.reason,
      termsAccepted: true
    });
    if (!audit.ok) return audit.result;
    return json(503, {
      allowed: false,
      error: "Download ticket could not be issued.",
      requiredAction: "retry-after-ticket-store-recovers",
      reasonCode: "ticket-mint-failed"
    });
  }

  const audit = appendRequiredAuditWithId(deps, gateAuditId, {
    type: "download_gate_checked",
    role: session.role,
    actor: session.identity.id,
    assetId: asset.id,
    resourceSpaceId,
    status: "allowed",
    summary: "Download gate approved an approved-copy URL.",
    details: {
      source: auditSource.label,
      assetStatus: asset.status,
      variant: gateInput.variant,
      usageChannel: gateInput.usageChannel,
      reason: gateInput.reason,
      termsAccepted: true,
      termsAcceptedAt
    }
  });
  if (!audit.ok) return audit.result;
  const roleParam =
    session.roleOverride.allowed && session.roleOverride.role
      ? `&role=${encodeURIComponent(session.roleOverride.role)}`
      : "";

  return json(200, {
    allowed: true,
    downloadUrl: `/api/download/${encodeURIComponent(asset.id)}?variant=${encodeURIComponent(gateInput.variant)}&ticket=${encodeURIComponent(ticket.ticket)}${roleParam}`,
    auditId: audit.audit.id,
    ticketExpiresAt: ticket.expiresAt,
    deliveryManifest,
    message: "Approved copy is available through the approved-copy gate. Private originals and storage paths are not exposed."
  });
}

async function deliverCopy(
  request: NextRequest,
  rawAssetId: string,
  deps: ApprovedDeliveryGateDeps
): Promise<ApprovedDeliveryGateResult> {
  const id = normalizeAssetId(rawAssetId);
  if (!id) return malformedIdResponse();

  const session = sessionForGet(request, deps);
  if (session.roleOverride.denied) return roleOverrideDenied({ deps, session, assetId: id });

  const { asset, source } = await deps.getAssetRecordById(id);
  if (!asset) return notFound({ deps, session, assetId: id });

  if (requestedRendition(request.nextUrl.searchParams.get("variant")) === "original-master") {
    return requestOnlyOriginalFlow({ deps, session, asset, source });
  }

  const deliveryManifest = deps.buildDeliveryReadinessManifest(asset, "public-web");
  const portalDecision = deps.buildPortalReuseDecision(asset, session.role);
  if (!portalDecision.access.downloadApprovedCopy.allowed) {
    return accessDeniedResponse({ deps, session, asset, source, deliveryManifest });
  }

  const ticketInput = {
    ticket: request.nextUrl.searchParams.get("ticket"),
    actor: session.identity.id,
    assetId: asset.id,
    role: session.role as DemoRole,
    variant: "download" as const
  };
  const ticketValidation = deps.validateDownloadTicket(ticketInput);
  if (!ticketValidation.ok) {
    const audit = auditBlockedAttempt({
      deps,
      session,
      asset,
      source,
      type: "denied_download",
      status: "denied",
      summary: "Approved copy GET denied by download ticket gate.",
      reasonCode: ticketValidation.reasonCode,
      ticketId: ticketValidation.ticketId || null
    });
    if (!audit.ok) return audit.result;
    return safeBlockedResponse({
      status: 403,
      requiredAction: "request-download-ticket",
      reason: ticketValidation.reason,
      reasonCode: ticketValidation.reasonCode
    });
  }

  const delivery = deps.readApprovedCopyDelivery(id, asset.title, source);
  if (delivery.status !== "ready") {
    const reasonCode = delivery.status === "missing-derivative" ? "approved-derivative-missing" : "approved-derivative-unavailable";
    const audit = auditBlockedAttempt({
      deps,
      session,
      asset,
      source,
      type: "download_gate_checked",
      status: "blocked",
      summary: "Approved copy GET blocked because approved derivative could not be delivered.",
      reasonCode
    });
    if (!audit.ok) return audit.result;
    return safeBlockedResponse({
      status: 404,
      requiredAction: "generate-approved-derivative",
      reason: delivery.status === "missing-derivative"
        ? "Approved derivative is not available yet."
        : "Approved derivative is unavailable.",
      reasonCode,
      deliveryManifest
    });
  }

  let ticket: ReturnType<typeof consumeDownloadTicket>;
  try {
    ticket = deps.consumeDownloadTicket({
      ...ticketInput,
      beforeConsume(record) {
        try {
          deps.appendRequiredAuditEvent(approvedCopyDownloadedAuditEvent(asset, delivery, session, source, record));
        } catch {
          throw new RequiredAuditFailedError();
        }
      }
    });
  } catch (error) {
    if (error instanceof RequiredAuditFailedError) return auditRequiredErrorResponse();
    return internalErrorResponse();
  }
  if (!ticket.ok) {
    const audit = auditBlockedAttempt({
      deps,
      session,
      asset,
      source,
      type: "denied_download",
      status: "denied",
      summary: "Approved copy GET denied by download ticket gate.",
      reasonCode: ticket.reasonCode,
      ticketId: ticket.ticketId || null
    });
    if (!audit.ok) return audit.result;
    return safeBlockedResponse({
      status: 403,
      requiredAction: "request-download-ticket",
      reason: ticket.reason,
      reasonCode: ticket.reasonCode
    });
  }
  const image = approvedCopyImageResponse(delivery);
  return { kind: "image", status: 200, body: image.body, headers: image.headers };
}

export async function runApprovedDeliveryGate(
  input: ApprovedDeliveryGateInput,
  deps: ApprovedDeliveryGateDeps = approvedDeliveryGateDefaultDeps
): Promise<ApprovedDeliveryGateResult> {
  try {
    return input.intent === "request-ticket"
      ? await requestTicket(input.request, input.assetId, deps)
      : await deliverCopy(input.request, input.assetId, deps);
  } catch {
    return internalErrorResponse();
  }
}
