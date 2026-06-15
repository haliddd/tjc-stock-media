import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  approvedDeliveryGateDefaultDeps,
  runApprovedDeliveryGate,
  type ApprovedDeliveryGateDeps,
  type ApprovedDeliveryGateJsonResult
} from "@/lib/approved-delivery-gate";
import type { appendRequiredAuditEvent, AuditEventRecord } from "@/lib/audit-log";
import type { DownloadTicketRecord } from "@/lib/download-tickets";
import type { ApprovedCopyDelivery } from "@/lib/media-delivery";
import type { MediaSourceStatus, StockMediaAsset } from "@/lib/types";

type AuditDraft = Parameters<typeof appendRequiredAuditEvent>[0];

const tempRoots: string[] = [];

const source: MediaSourceStatus = {
  adapter: "media-library",
  label: "Media library",
  detail: "Role-safe media library",
  readOnly: true
};

function approvedAsset(overrides: Partial<StockMediaAsset> = {}): StockMediaAsset {
  return {
    id: "asset-1",
    title: "Approved delivery fixture",
    thumbnail: "/thumb.jpg",
    thumbnailAlt: "Approved delivery fixture",
    preview: "/detail.jpg",
    imageUrls: {
      small: "/small.jpg",
      card: "/card.jpg",
      collection: "/collection.jpg",
      detail: "/detail.jpg",
      download: "/download.jpg"
    },
    mediaType: "photo",
    collection: "Sabbath",
    status: "Approved Public",
    usageScope: "Public",
    peopleRisk: "No people",
    sourceSystem: "ResourceSpace",
    sourcePlatform: "Google Shared Drive",
    sourceAccount: "private-source@example.test",
    sourceAlbum: "Private Album",
    sourceAlbumPath: "/private/source-album",
    sourceAlbumMemberships: ["Private Album"],
    sourcePath: "/private/source-file.jpg",
    masterDrivePath: "/Shared Drives/TJC Stock Media/master-file.jpg",
    originalFilename: "private-original-file.jpg",
    checksumSha256: "a".repeat(64),
    resourceSpaceId: "rs-asset-1",
    imageDimensions: "2400 x 1600",
    rightsStatus: "Rights approved",
    consentStatus: "Consent confirmed",
    reviewer: "Reviewer One",
    reviewedDate: "2026-06-01",
    rightsNotes: "TJC-owned rights approved for public ministry use.",
    usageGuidance: "Approved for public ministry website reuse.",
    rightsBasis: "TJC-owned",
    approvedChannels: ["website"],
    reuseTier: "stock-safe",
    visibilityTier: "public",
    sensitivityClass: "public-safe",
    downloadPolicy: "approved-copy-allowed",
    ...overrides
  };
}

function auditRecorder() {
  const events: AuditEventRecord[] = [];
  const append = vi.fn((event: AuditDraft) => {
    const record = {
      id: `audit-${events.length + 1}`,
      createdAt: "2026-06-14T00:00:00.000Z",
      actor: event.actor || event.role,
      ...event
    } as AuditEventRecord;
    events.push(record);
    return record;
  });
  const appendWithId = vi.fn((id: string, event: AuditDraft) => {
    const record = {
      id,
      createdAt: "2026-06-14T00:00:00.000Z",
      actor: event.actor || event.role,
      ...event
    } as AuditEventRecord;
    events.push(record);
    return record;
  });
  return { append, appendWithId, events };
}

function readyDelivery(fileName = "approved-delivery-fixture-approved-copy.jpg"): Extract<ApprovedCopyDelivery, { status: "ready" }> {
  const bytes = new ArrayBuffer(3);
  new Uint8Array(bytes).set([0xff, 0xd8, 0xff]);
  return { status: "ready", image: { bytes, contentType: "image/jpeg" }, fileName };
}

function ticketRecord(overrides: Partial<DownloadTicketRecord> = {}): DownloadTicketRecord {
  return {
    id: "ticket-1",
    tokenHash: "b".repeat(64),
    createdAt: "2026-06-14T00:00:00.000Z",
    expiresAt: "2026-06-14T00:05:00.000Z",
    actor: "local-beta:Reviewer",
    assetId: "asset-1",
    resourceSpaceId: "rs-asset-1",
    role: "Reviewer",
    variant: "download",
    scope: "test",
    reason: "test",
    termsAcceptedAt: "2026-06-14T00:00:00.000Z",
    gateAuditId: "audit-gate",
    sourceLabel: "Media library",
    ...overrides
  };
}

function depsFor(options: {
  asset?: StockMediaAsset | null | ((id: string) => StockMediaAsset | null);
  derivativeReady?: boolean;
  delivery?: ApprovedCopyDelivery;
  validate?: ApprovedDeliveryGateDeps["validateDownloadTicket"];
  consume?: ApprovedDeliveryGateDeps["consumeDownloadTicket"];
  mint?: ApprovedDeliveryGateDeps["mintDownloadTicket"];
  audit?: ReturnType<typeof auditRecorder>;
} = {}) {
  const audit = options.audit || auditRecorder();
  const assetOrFactory = options.asset === undefined ? approvedAsset() : options.asset;
  const validateDownloadTicket: ApprovedDeliveryGateDeps["validateDownloadTicket"] =
    options.validate || vi.fn(() => ({ ok: true as const, record: ticketRecord() }));
  const consumeDownloadTicket: ApprovedDeliveryGateDeps["consumeDownloadTicket"] =
    options.consume || vi.fn((input) => {
      const record = ticketRecord();
      input.beforeConsume?.(record);
      return { ok: true as const, record: { ...record, consumedAt: "2026-06-14T00:00:01.000Z" } };
    });
  const fallbackMintDownloadTicket: ApprovedDeliveryGateDeps["mintDownloadTicket"] = () => ({
    ticket: "00000000-0000-4000-8000-000000000000.secret",
    ticketId: "00000000-0000-4000-8000-000000000000",
    expiresAt: "2026-06-14T00:05:00.000Z"
  });
  const mintDownloadTicket: ApprovedDeliveryGateDeps["mintDownloadTicket"] =
    options.mint || fallbackMintDownloadTicket;
  return {
    audit,
    deps: {
      ...approvedDeliveryGateDefaultDeps,
      appendRequiredAuditEvent: audit.append,
      appendRequiredAuditEventWithId: audit.appendWithId,
      createAuditEventId: vi.fn(() => `audit-${audit.events.length + 1}`),
      getAssetRecordById: vi.fn(async (id: string) => ({
        asset: typeof assetOrFactory === "function" ? assetOrFactory(id) : assetOrFactory,
        source
      })),
      hasApprovedCopyDerivative: vi.fn(() => options.derivativeReady ?? true),
      readApprovedCopyDelivery: vi.fn(() => options.delivery || readyDelivery()),
      validateDownloadTicket,
      consumeDownloadTicket,
      mintDownloadTicket
    } satisfies ApprovedDeliveryGateDeps
  };
}

function getRequest(assetId = "asset-1", query = "role=Reviewer&ticket=ticket-id.secret") {
  return new NextRequest(`http://localhost/api/download/${encodeURIComponent(assetId)}?${query}`);
}

function postRequest(assetId = "asset-1", role = "Reviewer", body: Record<string, unknown> = {}) {
  return new NextRequest(`http://localhost/api/download/${encodeURIComponent(assetId)}?role=${encodeURIComponent(role)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      termsAccepted: true,
      usageChannel: "test",
      reason: "gate test",
      variant: "download",
      ...body
    })
  });
}

function expectJson(result: Awaited<ReturnType<typeof runApprovedDeliveryGate>>) {
  expect(result.kind).toBe("json");
  return result as ApprovedDeliveryGateJsonResult;
}

function tempRuntimeRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "approved-delivery-gate-"));
  tempRoots.push(root);
  vi.stubEnv("TJC_STOCK_MEDIA_ROOT", root);
  return root;
}

function expireTicket(root: string, ticket: string) {
  const id = ticket.split(".")[0];
  const ticketPath = path.join(root, ".runtime", "download-tickets", `${id}.json`);
  const record = JSON.parse(fs.readFileSync(ticketPath, "utf8")) as DownloadTicketRecord;
  record.expiresAt = "2020-01-01T00:00:00.000Z";
  fs.writeFileSync(ticketPath, `${JSON.stringify(record, null, 2)}\n`);
}

beforeEach(() => {
  vi.stubEnv("PORTAL_ALLOW_BETA_ROLE_OVERRIDE", "1");
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  while (tempRoots.length) {
    const root = tempRoots.pop();
    if (root) fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("approved delivery gate", () => {
  it("blocks original/master delivery for Viewer, Reviewer, and DAM Admin", async () => {
    for (const role of ["Viewer", "Reviewer", "DAM Admin"] as const) {
      const { deps, audit } = depsFor({
        consume: vi.fn(() => {
          throw new Error("ticket consume should not run for original/master requests");
        })
      });
      const result = expectJson(await runApprovedDeliveryGate({
        request: getRequest("asset-1", `role=${encodeURIComponent(role)}&variant=master&ticket=ticket-id.secret`),
        assetId: "asset-1",
        intent: "deliver-copy"
      }, deps));

      expect(result.status).toBe(403);
      expect(result.body).toMatchObject({
        allowed: false,
        requiredAction: "request-original-access",
        reasonCode: "original-request-only"
      });
      expect(result.body).not.toHaveProperty("downloadUrl");
      expect(audit.events).toHaveLength(1);
      expect(audit.events[0]?.type).toBe("original_access_denied");
    }
  });

  it("blocks contributors when approved derivative readiness is missing", async () => {
    const { deps, audit } = depsFor({ derivativeReady: false });
    const result = expectJson(await runApprovedDeliveryGate({
      request: postRequest("asset-1", "Contributor"),
      assetId: "asset-1",
      intent: "request-ticket"
    }, deps));

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({
      allowed: false,
      requiredAction: "generate-approved-derivative",
      reasonCode: "approved-derivative-missing"
    });
    expect(result.body).not.toHaveProperty("downloadUrl");
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({ type: "download_gate_checked", status: "blocked" });
  });

  it("blocks missing and expired tickets", async () => {
    const missing = depsFor({
      validate: vi.fn(() => ({ ok: false as const, reasonCode: "ticket-missing", reason: "Download ticket is required." })),
      consume: vi.fn(() => ({ ok: false as const, reasonCode: "ticket-missing", reason: "Download ticket is required." }))
    });
    const missingResult = expectJson(await runApprovedDeliveryGate({
      request: getRequest("asset-1", "role=Reviewer"),
      assetId: "asset-1",
      intent: "deliver-copy"
    }, missing.deps));

    expect(missingResult.status).toBe(403);
    expect(missingResult.body).toMatchObject({
      allowed: false,
      requiredAction: "request-download-ticket",
      reasonCode: "ticket-missing"
    });
    expect(missing.audit.events).toHaveLength(1);

    const root = tempRuntimeRoot();
    const audit = auditRecorder();
    const ticket = approvedDeliveryGateDefaultDeps.mintDownloadTicket({
      actor: "local-beta:Reviewer",
      assetId: "asset-1",
      resourceSpaceId: "rs-asset-1",
      role: "Reviewer",
      variant: "download",
      scope: "test",
      reason: "test",
      termsAcceptedAt: "2026-06-14T00:00:00.000Z",
      gateAuditId: "audit-gate",
      sourceLabel: "Media library"
    }).ticket;
    expireTicket(root, ticket);
    const expired = depsFor({ audit });
    expired.deps.validateDownloadTicket = approvedDeliveryGateDefaultDeps.validateDownloadTicket;
    expired.deps.consumeDownloadTicket = approvedDeliveryGateDefaultDeps.consumeDownloadTicket;
    const expiredResult = expectJson(await runApprovedDeliveryGate({
      request: getRequest("asset-1", `role=Reviewer&ticket=${encodeURIComponent(ticket)}`),
      assetId: "asset-1",
      intent: "deliver-copy"
    }, expired.deps));

    expect(expiredResult.status).toBe(403);
    expect(expiredResult.body).toMatchObject({ allowed: false, reasonCode: "ticket-expired" });
    expect(audit.events).toHaveLength(1);
  });

  it("blocks asset/ticket and role/ticket mismatches", async () => {
    tempRuntimeRoot();
    const ticketForAssetOne = approvedDeliveryGateDefaultDeps.mintDownloadTicket({
      actor: "local-beta:Reviewer",
      assetId: "asset-1",
      resourceSpaceId: "rs-asset-1",
      role: "Reviewer",
      variant: "download",
      scope: "test",
      reason: "test",
      termsAcceptedAt: "2026-06-14T00:00:00.000Z",
      gateAuditId: "audit-gate",
      sourceLabel: "Media library"
    }).ticket;
    const assetMismatch = depsFor({
      asset: (id: string) => approvedAsset({ id, resourceSpaceId: `rs-${id}` }),
      validate: approvedDeliveryGateDefaultDeps.validateDownloadTicket,
      consume: approvedDeliveryGateDefaultDeps.consumeDownloadTicket
    });
    const assetMismatchResult = expectJson(await runApprovedDeliveryGate({
      request: getRequest("asset-2", `role=Reviewer&ticket=${encodeURIComponent(ticketForAssetOne)}`),
      assetId: "asset-2",
      intent: "deliver-copy"
    }, assetMismatch.deps));

    expect(assetMismatchResult.status).toBe(403);
    expect(assetMismatchResult.body).toMatchObject({ allowed: false, reasonCode: "ticket-mismatch" });

    const ticketForReviewer = approvedDeliveryGateDefaultDeps.mintDownloadTicket({
      actor: "local-beta:Reviewer",
      assetId: "asset-1",
      resourceSpaceId: "rs-asset-1",
      role: "Reviewer",
      variant: "download",
      scope: "test",
      reason: "test",
      termsAcceptedAt: "2026-06-14T00:00:00.000Z",
      gateAuditId: "audit-gate",
      sourceLabel: "Media library"
    }).ticket;
    const roleMismatch = depsFor({
      validate: approvedDeliveryGateDefaultDeps.validateDownloadTicket,
      consume: approvedDeliveryGateDefaultDeps.consumeDownloadTicket
    });
    const roleMismatchResult = expectJson(await runApprovedDeliveryGate({
      request: getRequest("asset-1", `role=Viewer&ticket=${encodeURIComponent(ticketForReviewer)}`),
      assetId: "asset-1",
      intent: "deliver-copy"
    }, roleMismatch.deps));

    expect(roleMismatchResult.status).toBe(403);
    expect(roleMismatchResult.body).toMatchObject({ allowed: false, reasonCode: "ticket-mismatch" });
  });

  it("blocks expired rights, consent, or recheck lifecycle states", async () => {
    const { deps } = depsFor({
      asset: approvedAsset({
        rightsExpirationDate: "2020-01-01",
        consentExpirationDate: "2020-01-01",
        approvalRecheckDate: "2020-01-01"
      })
    });
    const result = expectJson(await runApprovedDeliveryGate({
      request: postRequest("asset-1", "Reviewer"),
      assetId: "asset-1",
      intent: "request-ticket"
    }, deps));

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({ allowed: false, requiredAction: "review-rights-and-permissions" });
    expect(result.body).not.toHaveProperty("downloadUrl");
  });

  it("keeps blocked responses free of private/source/original delivery material", async () => {
    const { deps } = depsFor({ derivativeReady: false });
    const result = expectJson(await runApprovedDeliveryGate({
      request: postRequest("asset-1", "Reviewer"),
      assetId: "asset-1",
      intent: "request-ticket"
    }, deps));
    const text = JSON.stringify(result.body);

    for (const forbidden of [
      "/private/source-file.jpg",
      "/Shared Drives/TJC Stock Media/master-file.jpg",
      "private-original-file.jpg",
      "a".repeat(64),
      "sourcePath",
      "masterDrivePath",
      "originalFilename",
      "checksumSha256",
      "ResourceSpace admin",
      "signedUrl",
      "originalUrl",
      "s3://",
      "sourceEnvelope"
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  it("audits successful ticket issuance and successful delivery exactly once", async () => {
    const post = depsFor();
    const postResult = expectJson(await runApprovedDeliveryGate({
      request: postRequest("asset-1", "Reviewer"),
      assetId: "asset-1",
      intent: "request-ticket"
    }, post.deps));

    expect(postResult.status).toBe(200);
    expect(postResult.body).toMatchObject({ allowed: true, auditId: "audit-1" });
    expect(String(postResult.body.downloadUrl)).toContain("/api/download/asset-1?variant=download&ticket=");
    expect(postResult.body).not.toHaveProperty("ticket");
    expect(post.audit.events).toHaveLength(1);
    expect(post.audit.events[0]).toMatchObject({ type: "download_gate_checked", status: "allowed" });

    const get = depsFor();
    const getResult = await runApprovedDeliveryGate({
      request: getRequest(),
      assetId: "asset-1",
      intent: "deliver-copy"
    }, get.deps);

    expect(getResult.kind).toBe("image");
    expect(get.audit.events).toHaveLength(1);
    expect(get.audit.events[0]).toMatchObject({ type: "approved_download", status: "allowed" });
  });

  it("does not write an allowed gate audit when ticket minting fails", async () => {
    const { deps, audit } = depsFor({
      mint: vi.fn(() => {
        throw new Error("ticket store unavailable");
      })
    });
    const result = expectJson(await runApprovedDeliveryGate({
      request: postRequest("asset-1", "Reviewer"),
      assetId: "asset-1",
      intent: "request-ticket"
    }, deps));

    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ allowed: false, reasonCode: "ticket-mint-failed" });
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({ type: "download_gate_checked", status: "blocked" });
    expect(audit.events.some((event) => event.type === "download_gate_checked" && event.status === "allowed")).toBe(false);
  });

  it("does not consume a ticket when delivery becomes unavailable", async () => {
    const consume = vi.fn(() => ({ ok: true as const, record: ticketRecord() }));
    const { deps, audit } = depsFor({
      delivery: { status: "unavailable-derivative" },
      consume
    });
    const result = expectJson(await runApprovedDeliveryGate({
      request: getRequest(),
      assetId: "asset-1",
      intent: "deliver-copy"
    }, deps));

    expect(result.status).toBe(404);
    expect(result.body).toMatchObject({ allowed: false, reasonCode: "approved-derivative-unavailable" });
    expect(consume).not.toHaveBeenCalled();
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({ type: "download_gate_checked", status: "blocked" });
  });

  it("does not consume a ticket when the approved-download audit cannot persist", async () => {
    let consumed = false;
    const append = vi.fn((event: AuditDraft) => {
      if (event.type === "approved_download") throw new Error("audit unavailable");
      return {
        id: "audit-blocked",
        createdAt: "2026-06-14T00:00:00.000Z",
        actor: event.actor || event.role,
        ...event
      } as AuditEventRecord;
    });
    const audit = { append, events: [] as AuditEventRecord[] };
    const auditWithId = {
      ...audit,
      appendWithId: vi.fn((id: string, event: AuditDraft) => ({
        id,
        createdAt: "2026-06-14T00:00:00.000Z",
        actor: event.actor || event.role,
        ...event
      } as AuditEventRecord))
    };
    const consume = vi.fn<ApprovedDeliveryGateDeps["consumeDownloadTicket"]>((input) => {
      input.beforeConsume?.(ticketRecord());
      consumed = true;
      return { ok: true as const, record: ticketRecord({ consumedAt: "2026-06-14T00:00:01.000Z" }) };
    });
    const { deps } = depsFor({ audit: auditWithId, consume });
    const result = expectJson(await runApprovedDeliveryGate({
      request: getRequest(),
      assetId: "asset-1",
      intent: "deliver-copy"
    }, deps));

    expect(result.status).toBe(503);
    expect(result.body).toMatchObject({ allowed: false, reasonCode: "audit-required" });
    expect(consumed).toBe(false);
  });

  it("audits blocked attempts safely where current audit model supports it", async () => {
    const { deps, audit } = depsFor({
      validate: vi.fn(() => ({ ok: false as const, reasonCode: "ticket-missing", reason: "Download ticket is required." })),
      consume: vi.fn(() => ({ ok: false as const, reasonCode: "ticket-missing", reason: "Download ticket is required." }))
    });
    const result = expectJson(await runApprovedDeliveryGate({
      request: getRequest("asset-1", "role=Reviewer"),
      assetId: "asset-1",
      intent: "deliver-copy"
    }, deps));

    expect(result.status).toBe(403);
    expect(result.body).toMatchObject({ allowed: false, reasonCode: "ticket-missing" });
    expect(result.body).not.toHaveProperty("downloadUrl");
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({ type: "denied_download", status: "denied" });
  });

  it("keeps the download route as transport only", () => {
    const route = fs.readFileSync(new URL("../app/api/download/[id]/route.ts", import.meta.url), "utf8");

    expect(route).toContain("runApprovedDeliveryGate(");
    for (const forbidden of [
      "appendRequiredAuditEvent",
      "appendAuditEvent",
      "decideAccess",
      "assetResourceRef",
      "getAssetRecordById",
      "createDamRouteSession",
      "buildDeliveryReadinessManifest",
      "consumeDownloadTicket",
      "mintDownloadTicket",
      "canDownloadApprovedCopy",
      "readApprovedCopyDelivery",
      "hasApprovedCopyDerivative",
      "approvedCopyDownloadedAuditEvent",
      "approvedCopyImageResponse",
      "sourceEnvelope"
    ]) {
      expect(route).not.toContain(forbidden);
    }
  });
});
