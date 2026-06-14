import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { writableRuntimeRoot } from "@/lib/env";
import { safeIsoTimestamp } from "@/lib/persisted-record-safety";
import { normalizeAssetId, normalizePersistedDisplayText, normalizePersistedSlugText, normalizeResourceSpaceRef } from "@/lib/request-validation";
import { ensureRuntimeDir, readRuntimeJsonFile, writeRuntimeJsonFile } from "@/lib/runtime-file-store";
import type { DemoRole } from "@/lib/types";

const downloadTicketTtlMs = 5 * 60 * 1000;
const ticketLockMaxWaitMs = 1500;

export type DownloadTicketRecord = {
  id: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  consumedAt?: string;
  consumedBy?: string;
  actor: string;
  assetId: string;
  resourceSpaceId?: string;
  role: DemoRole;
  variant: "download";
  scope: string | null;
  reason: string | null;
  termsAcceptedAt: string;
  gateAuditId: string;
  sourceLabel: string;
};

export type MintDownloadTicketInput = {
  actor: string;
  assetId: string;
  resourceSpaceId?: string;
  role: DemoRole;
  variant: "download";
  scope: string | null;
  reason: string | null;
  termsAcceptedAt: string;
  gateAuditId: string;
  sourceLabel: string;
};

export type ConsumeDownloadTicketInput = {
  ticket: string | null;
  actor: string;
  assetId: string;
  role: DemoRole;
  variant: "download";
  beforeConsume?: (record: DownloadTicketRecord) => void;
};

export type ConsumeDownloadTicketResult =
  | { ok: true; record: DownloadTicketRecord }
  | { ok: false; reasonCode: string; reason: string; ticketId?: string };

function validateDownloadTicketRecord(input: ConsumeDownloadTicketInput, parsed: { id: string; secret: string }): ConsumeDownloadTicketResult {
  const record = readRuntimeJsonFile(ticketPath(parsed.id), normalizeTicketRecord);
  if (!record) return { ok: false, reasonCode: "ticket-not-found", reason: "Download ticket is invalid.", ticketId: parsed.id };
  if (!secureEquals(record.tokenHash, hashSecret(parsed.secret))) return { ok: false, reasonCode: "ticket-invalid", reason: "Download ticket is invalid.", ticketId: parsed.id };
  if (record.consumedAt) return { ok: false, reasonCode: "ticket-reused", reason: "Download ticket has already been used.", ticketId: parsed.id };
  if (Date.parse(record.expiresAt) <= Date.now()) return { ok: false, reasonCode: "ticket-expired", reason: "Download ticket has expired.", ticketId: parsed.id };
  if (record.actor !== input.actor || record.assetId !== input.assetId || record.role !== input.role || record.variant !== input.variant) {
    return { ok: false, reasonCode: "ticket-mismatch", reason: "Download ticket does not match this request.", ticketId: parsed.id };
  }
  return { ok: true, record };
}

export function validateDownloadTicket(input: ConsumeDownloadTicketInput): ConsumeDownloadTicketResult {
  const parsed = splitTicket(input.ticket);
  if (!parsed) return { ok: false, reasonCode: "ticket-missing", reason: "Download ticket is required." };
  return validateDownloadTicketRecord(input, parsed);
}

function ticketDir() {
  return path.join(writableRuntimeRoot(), ".runtime", "download-tickets");
}

function ticketPath(id: string) {
  return path.join(ticketDir(), `${id}.json`);
}

function ticketLockPath(id: string) {
  return path.join(ticketDir(), `${id}.lock`);
}

function hashSecret(secret: string) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

function safeTicketId(value: unknown) {
  return normalizePersistedSlugText(value, 80, { rejectUnsafePath: true });
}

function normalizeTicketRecord(input: unknown): DownloadTicketRecord | null {
  const raw = (input || {}) as Partial<DownloadTicketRecord>;
  const id = safeTicketId(raw.id);
  const tokenHash = typeof raw.tokenHash === "string" && /^[a-f0-9]{64}$/i.test(raw.tokenHash) ? raw.tokenHash.toLowerCase() : "";
  const actor = normalizePersistedDisplayText(raw.actor, 160);
  const assetId = normalizeAssetId(raw.assetId);
  const role = raw.role;
  const createdAt = safeIsoTimestamp(raw.createdAt);
  const expiresAt = safeIsoTimestamp(raw.expiresAt);
  const termsAcceptedAt = safeIsoTimestamp(raw.termsAcceptedAt);
  const gateAuditId = normalizePersistedSlugText(raw.gateAuditId, 120);
  if (!id || !tokenHash || !actor || !assetId || !role || !createdAt || !expiresAt || !termsAcceptedAt || !gateAuditId) return null;
  if (!["Viewer", "Contributor", "Reviewer", "DAM Admin"].includes(role)) return null;
  return {
    id,
    tokenHash,
    createdAt,
    expiresAt,
    consumedAt: safeIsoTimestamp(raw.consumedAt) || undefined,
    consumedBy: normalizePersistedDisplayText(raw.consumedBy, 160) || undefined,
    actor,
    assetId,
    resourceSpaceId: raw.resourceSpaceId === undefined ? undefined : normalizeResourceSpaceRef(raw.resourceSpaceId),
    role,
    variant: "download",
    scope: raw.scope === null ? null : normalizePersistedDisplayText(raw.scope, 80) || null,
    reason: raw.reason === null ? null : normalizePersistedDisplayText(raw.reason, 240) || null,
    termsAcceptedAt,
    gateAuditId,
    sourceLabel: normalizePersistedDisplayText(raw.sourceLabel, 120) || "Media source"
  };
}

function secureEquals(left: string, right: string) {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && crypto.timingSafeEqual(leftBytes, rightBytes);
}

function splitTicket(ticket: string | null) {
  if (!ticket) return null;
  const [id, secret] = ticket.split(".");
  const safeId = safeTicketId(id);
  if (!safeId || !secret || !/^[A-Za-z0-9_-]{32,160}$/.test(secret)) return null;
  return { id: safeId, secret };
}

export function mintDownloadTicket(input: MintDownloadTicketInput) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + downloadTicketTtlMs).toISOString();
  const id = crypto.randomUUID();
  const secret = crypto.randomBytes(32).toString("base64url");
  const record: DownloadTicketRecord = {
    id,
    tokenHash: hashSecret(secret),
    createdAt: now.toISOString(),
    expiresAt,
    actor: input.actor,
    assetId: input.assetId,
    resourceSpaceId: input.resourceSpaceId,
    role: input.role,
    variant: "download",
    scope: input.scope,
    reason: input.reason,
    termsAcceptedAt: input.termsAcceptedAt,
    gateAuditId: input.gateAuditId,
    sourceLabel: input.sourceLabel
  };
  writeRuntimeJsonFile(ticketPath(id), record);
  return { ticket: `${id}.${secret}`, ticketId: id, expiresAt };
}

function acquireTicketLock(id: string) {
  ensureRuntimeDir(ticketDir());
  const lockPath = ticketLockPath(id);
  const startedAt = Date.now();
  while (Date.now() - startedAt < ticketLockMaxWaitMs) {
    try {
      const fd = fs.openSync(lockPath, "wx");
      fs.writeFileSync(fd, `${process.pid}:${Date.now()}`, "utf8");
      fs.closeSync(fd);
      return () => {
        try {
          fs.unlinkSync(lockPath);
        } catch {
          // Lock cleanup is best effort after consumed ticket state is persisted.
        }
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;
      try {
        const stat = fs.statSync(lockPath);
        if (Date.now() - stat.mtimeMs > ticketLockMaxWaitMs * 4) fs.unlinkSync(lockPath);
      } catch {
        // Retry after transient lock inspection failure.
      }
    }
  }
  return null;
}

export function consumeDownloadTicket(input: ConsumeDownloadTicketInput): ConsumeDownloadTicketResult {
  const parsed = splitTicket(input.ticket);
  if (!parsed) return { ok: false, reasonCode: "ticket-missing", reason: "Download ticket is required." };

  const release = acquireTicketLock(parsed.id);
  if (!release) return { ok: false, reasonCode: "ticket-busy", reason: "Download ticket is already being consumed.", ticketId: parsed.id };
  try {
    const validation = validateDownloadTicketRecord(input, parsed);
    if (!validation.ok) return validation;
    const record = validation.record;

    input.beforeConsume?.(record);
    const consumedRecord: DownloadTicketRecord = {
      ...record,
      consumedAt: new Date().toISOString(),
      consumedBy: input.actor
    };
    writeRuntimeJsonFile(ticketPath(record.id), consumedRecord);
    return { ok: true, record: consumedRecord };
  } finally {
    release();
  }
}
