import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent, appendRequiredAuditEvent } from "@/lib/audit-log";
import { decideAccess } from "@/lib/access-decisions";
import { assetResourceRef } from "@/lib/asset-refs";
import { getAssetRecordById } from "@/lib/catalog";
import { createDamRouteSession } from "@/lib/dam-route-session";
import { consumeDownloadTicket, mintDownloadTicket } from "@/lib/download-tickets";
import {
  approvedCopyDownloadedAuditEvent,
  approvedCopyImageResponse,
  approvedCopyUnavailableError,
  downloadMalformedIdError,
  downloadNotFoundError,
  downloadRoleDeniedAuditEvent,
  downloadRoleDeniedError,
  hasApprovedCopyDerivative,
  readApprovedCopyDelivery,
  readDownloadGateInput
} from "@/lib/media-delivery";
import { canDownloadApprovedCopy } from "@/lib/permissions";
import { normalizeAssetId } from "@/lib/request-validation";

export const dynamic = "force-dynamic";

function roleOverrideDeniedResponse(session: ReturnType<typeof createDamRouteSession>, assetId: string) {
  try {
    appendRequiredAuditEvent({
      type: "denied_download",
      role: session.role,
      actor: session.identity.id,
      assetId,
      status: "denied",
      summary: "Download gate denied client-supplied role override.",
      details: {
        reasonCode: session.roleOverride.reasonCode || "client-role-disabled",
        overrideSource: session.roleOverride.source,
        requestedRole: session.roleOverride.requestedRole
      }
    });
  } catch {
    return auditRequiredErrorResponse();
  }
  return NextResponse.json(
    {
      allowed: false,
      error: "Client-supplied download roles are disabled outside local demo mode.",
      requiredAction: "use-server-identity",
      reasonCode: "client-role-disabled"
    },
    { status: 403 }
  );
}

function auditRequiredErrorResponse() {
  return NextResponse.json(
    {
      allowed: false,
      error: "Required download audit could not be persisted.",
      requiredAction: "retry-after-audit-recovers",
      reasonCode: "audit-required"
    },
    { status: 503 }
  );
}

function downloadTicketDeniedResponse({
  asset,
  reason,
  reasonCode,
  session,
  source,
  ticketId
}: {
  asset: NonNullable<Awaited<ReturnType<typeof getAssetRecordById>>["asset"]>;
  reason: string;
  reasonCode: string;
  session: ReturnType<typeof createDamRouteSession>;
  source: Awaited<ReturnType<typeof getAssetRecordById>>["source"];
  ticketId?: string;
}) {
  const envelope = session.sourceEnvelope(source);
  try {
    appendRequiredAuditEvent({
      type: "denied_download",
      role: session.role,
      actor: session.identity.id,
      assetId: asset.id,
      resourceSpaceId: assetResourceRef(asset),
      status: "denied",
      summary: "Approved copy GET denied by download ticket gate.",
      details: {
        source: envelope.source.label,
        assetStatus: asset.status,
        reasonCode,
        ticketId: ticketId || null
      }
    });
  } catch {
    return auditRequiredErrorResponse();
  }
  return NextResponse.json(
    {
      allowed: false,
      error: reason,
      requiredAction: "request-download-ticket",
      reason,
      reasonCode,
      ...envelope
    },
    { status: 403 }
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = normalizeAssetId((await params).id);
  const explicitRole = request.nextUrl.searchParams.get("role");
  const session = createDamRouteSession(request, {
    explicitRole,
    overridePolicy: "download-gate",
    overrideSource: "query"
  });
  const role = session.role;
  if (!id) {
    const error = downloadMalformedIdError();
    return NextResponse.json(error.body, { status: error.status });
  }
  if (session.roleOverride.denied) return roleOverrideDeniedResponse(session, id);
  const { asset, source } = await getAssetRecordById(id, role);

  if (!asset) {
    const error = downloadNotFoundError(session, source);
    return NextResponse.json(error.body, { status: error.status });
  }
  if (!canDownloadApprovedCopy(role, asset)) {
    const error = downloadRoleDeniedError(session, source);
    appendAuditEvent(downloadRoleDeniedAuditEvent(asset, session, source));
    return NextResponse.json(error.body, { status: error.status });
  }

  const ticket = consumeDownloadTicket({
    ticket: request.nextUrl.searchParams.get("ticket"),
    actor: session.identity.id,
    assetId: asset.id,
    role,
    variant: "download"
  });
  if (!ticket.ok) {
    return downloadTicketDeniedResponse({
      asset,
      reason: ticket.reason,
      reasonCode: ticket.reasonCode,
      session,
      source,
      ticketId: ticket.ticketId
    });
  }

  const delivery = readApprovedCopyDelivery(id, asset.title, source);
  if (delivery.status !== "ready") {
    const error = approvedCopyUnavailableError(delivery, session, source);
    return NextResponse.json(error.body, { status: error.status });
  }
  try {
    appendRequiredAuditEvent(approvedCopyDownloadedAuditEvent(asset, delivery, session, source, ticket.record));
  } catch {
    return auditRequiredErrorResponse();
  }
  const image = approvedCopyImageResponse(delivery);
  return new NextResponse(image.body, { headers: image.headers });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = normalizeAssetId((await params).id);
  const input = await readDownloadGateInput(request);
  const queryRole = request.nextUrl.searchParams.get("role");
  const explicitRole = queryRole || input.role || null;
  const session = createDamRouteSession(request, {
    explicitRole,
    overridePolicy: "download-gate",
    overrideSource: queryRole ? "query" : "body"
  });
  const role = session.role;
  if (!id) {
    return NextResponse.json({ allowed: false, error: "Malformed asset id." }, { status: 400 });
  }
  if (session.roleOverride.denied) return roleOverrideDeniedResponse(session, id);

  const { asset, source } = await getAssetRecordById(id, role);
  const envelope = session.sourceEnvelope(source);
  const auditSource = envelope.source;

  if (!asset) {
    return NextResponse.json({ allowed: false, reason: "Asset not found", ...envelope }, { status: 404 });
  }

  const access = decideAccess(role, "downloadApprovedCopy", asset);
  const resourceSpaceId = assetResourceRef(asset);
  session.recordUsage({
    type: "download_gate",
    assetId: asset.id,
    resourceSpaceId,
    route: `/api/download/${asset.id}`,
    metadata: { termsAccepted: input.termsAccepted, variant: input.variant }
  });
  const derivativeAvailable = hasApprovedCopyDerivative(id, source);

  if (!input.termsAccepted) {
    const termsRejectedAt = new Date().toISOString();
    try {
      appendRequiredAuditEvent({
        type: "download_gate_checked",
        role,
        actor: session.identity.id,
        assetId: asset.id,
        resourceSpaceId,
        status: "blocked",
        summary: "Download gate blocked because usage terms were not accepted.",
        details: {
          source: auditSource.label,
          assetStatus: asset.status,
          usageChannel: input.usageChannel,
          reason: input.reason,
          termsAccepted: false,
          termsRejectedAt
        }
      });
    } catch {
      return auditRequiredErrorResponse();
    }
    return NextResponse.json(
      {
        allowed: false,
        requiredAction: "accept-usage-terms",
        reason: "Accept the approved-copy usage terms before download.",
        ...envelope
      },
      { status: 403 }
    );
  }

  if (!access.allowed || !canDownloadApprovedCopy(role, asset)) {
    try {
      appendRequiredAuditEvent({
        type: "denied_download",
        role,
        actor: session.identity.id,
        assetId: asset.id,
        resourceSpaceId,
        status: "denied",
        summary: "Download gate denied approved copy.",
        details: {
          source: auditSource.label,
          assetStatus: asset.status,
          reasonCodes: access.reasonCodes || [],
          accessReason: access.reason || null,
          usageChannel: input.usageChannel
        }
      });
    } catch {
      return auditRequiredErrorResponse();
    }
    return NextResponse.json(
      {
        allowed: false,
        requiredAction: asset.status === "Needs Review" ? "request-approval" : "review-rights-and-permissions",
        reason: access.reason || "This asset is not approved for this role.",
        label: access.label || "Download blocked",
        reasonCodes: access.reasonCodes || [],
        ...envelope
      },
      { status: 403 }
    );
  }

  if (!derivativeAvailable) {
    try {
      appendRequiredAuditEvent({
        type: "download_gate_checked",
        role,
        actor: session.identity.id,
        assetId: asset.id,
        resourceSpaceId,
        status: "blocked",
        summary: "Download gate blocked because approved derivative is unavailable.",
        details: {
          source: auditSource.label,
          assetStatus: asset.status,
          usageChannel: input.usageChannel
        }
      });
    } catch {
      return auditRequiredErrorResponse();
    }
    return NextResponse.json(
      {
        allowed: false,
        requiredAction: "generate-approved-derivative",
        reason: "Approved derivative is not available yet. Source/master access remains restricted.",
        ...envelope
      },
      { status: 404 }
    );
  }

  const termsAcceptedAt = new Date().toISOString();
  let audit: ReturnType<typeof appendRequiredAuditEvent>;
  try {
    audit = appendRequiredAuditEvent({
      type: "download_gate_checked",
      role,
      actor: session.identity.id,
      assetId: asset.id,
      resourceSpaceId,
      status: "allowed",
      summary: "Download gate approved an approved-copy URL.",
      details: {
        source: auditSource.label,
        assetStatus: asset.status,
        variant: input.variant,
        usageChannel: input.usageChannel,
        reason: input.reason,
        termsAccepted: true,
        termsAcceptedAt
      }
    });
  } catch {
    return auditRequiredErrorResponse();
  }
  const ticket = mintDownloadTicket({
    actor: session.identity.id,
    assetId: asset.id,
    resourceSpaceId,
    role,
    variant: input.variant,
    scope: input.usageChannel,
    reason: input.reason,
    termsAcceptedAt,
    gateAuditId: audit.id,
    sourceLabel: auditSource.label
  });

  const roleParam =
    session.roleOverride.allowed && session.roleOverride.role
      ? `&role=${encodeURIComponent(session.roleOverride.role)}`
      : "";

  return NextResponse.json({
    allowed: true,
    downloadUrl: `/api/download/${encodeURIComponent(asset.id)}?variant=${encodeURIComponent(input.variant)}&ticket=${encodeURIComponent(ticket.ticket)}${roleParam}`,
    auditId: audit.id,
    ticketExpiresAt: ticket.expiresAt,
    ...envelope,
    message: "Approved copy is available through backend gate. Private originals and S3 paths are not exposed."
  });
}
