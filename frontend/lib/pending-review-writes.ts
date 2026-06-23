import crypto from "node:crypto";
import path from "node:path";
import { assetResourceRef } from "@/lib/asset-refs";
import { hasVercelKvConfig, pendingWritesStoreMode, productionRuntime, writableRuntimeRoot } from "@/lib/env";
import { newestByTimestamp, safeEnumValue, safeIsoTimestamp, safeIsoTimestampIdPart, safeNonNegativeInt } from "@/lib/persisted-record-safety";
import { normalizeReviewRoleWithFallback } from "@/lib/permissions";
import { normalizePersistedDisplayText, normalizePersistedSlugText } from "@/lib/request-validation";
import { normalizeReviewChecklist } from "@/lib/review-evidence";
import { listRuntimeFiles, readRuntimeJsonFile, writeRuntimeJsonFile } from "@/lib/runtime-file-store";
import type { ReviewEvidenceChecklist, ReviewWriteRecord, ReviewWriteRecordSummary, StockMediaAsset } from "@/lib/types";

const pendingDirName = "pending-review-writes";
const pendingWriteIndexKey = "tjc-stock-media:pending-review-writes:index";
const pendingWriteRecordPrefix = "tjc-stock-media:pending-review-writes:record:";
export const maxPendingReviewWrites = 200;
const pendingReviewWriteFileReadWindow = maxPendingReviewWrites * 3;
const syncStates: ReviewWriteRecord["syncState"][] = [
  "queued",
  "ready_to_sync",
  "syncing",
  "sync_failed",
  "synced_to_resourcespace",
  "superseded",
  "cancelled",
  "conflict_detected"
];

function pendingDir() {
  return path.join(writableRuntimeRoot(), ".runtime", pendingDirName);
}

function safeFilePart(value: unknown) {
  return normalizePersistedSlugText(value, 80) || "review-write";
}

function safeRole(value: unknown): ReviewWriteRecord["reviewerRole"] {
  return normalizeReviewRoleWithFallback(value);
}

function safeSyncState(value: unknown): ReviewWriteRecord["syncState"] {
  return safeEnumValue(value, syncStates, "queued");
}

function normalizePendingReviewWrite(input: unknown): ReviewWriteRecord | null {
  const raw = (input || {}) as Partial<ReviewWriteRecord>;
  const id = safeFilePart(raw.id);
  const resourceId = safeFilePart(raw.resourceId);
  if (!id || !resourceId) return null;
  const updatedAt = safeIsoTimestamp(raw.updatedAt) || safeIsoTimestamp(raw.createdAt) || new Date(0).toISOString();
  return {
    id,
    resourceId,
    oldStatus: normalizePersistedDisplayText(raw.oldStatus, 120) || "Unknown",
    requestedStatus: normalizePersistedDisplayText(raw.requestedStatus, 120) || "Needs Review",
    reviewerRole: safeRole(raw.reviewerRole),
    reviewerName: raw.reviewerName === undefined ? undefined : normalizePersistedDisplayText(raw.reviewerName, 120),
    createdAt: safeIsoTimestamp(raw.createdAt) || updatedAt,
    updatedAt,
    note: normalizePersistedDisplayText(raw.note, 1200),
    checklist: normalizeReviewChecklist(raw.checklist),
    blockers: Array.isArray(raw.blockers) ? raw.blockers.map((item) => normalizePersistedDisplayText(item, 120)).filter(Boolean).slice(0, 24) : [],
    syncState: safeSyncState(raw.syncState),
    retryCount: safeNonNegativeInt(raw.retryCount),
    lastError: raw.lastError === undefined ? undefined : normalizePersistedDisplayText(raw.lastError, 240)
  };
}

function readRecord(filePath: string): ReviewWriteRecord | null {
  return readRuntimeJsonFile(filePath, normalizePendingReviewWrite);
}

function writeRecord(record: ReviewWriteRecord) {
  const safeRecord = normalizePendingReviewWrite(record) || record;
  writeRuntimeJsonFile(path.join(pendingDir(), `${safeRecord.id}.json`), safeRecord);
  return safeRecord;
}

function shouldUseKvPendingWrites() {
  return pendingWritesStoreMode() === "vercel-kv";
}

function pendingWriteKey(id: string) {
  return `${pendingWriteRecordPrefix}${id}`;
}

async function getKvClient() {
  if (!hasVercelKvConfig()) return null;
  const { kv } = await import("@vercel/kv");
  return kv;
}

function durablePendingWriteError(action: string) {
  return new Error(`Pending review write durable storage ${action} failed in hosted runtime.`);
}

export function isPendingReviewWriteDurableStorageError(error: unknown): error is Error {
  return error instanceof Error && /^Pending review write durable storage .+ failed in hosted runtime\.$/.test(error.message);
}

async function listKvPendingReviewWrites() {
  const kv = await getKvClient();
  if (!kv) return null;
  const ids = await kv.get<string[]>(pendingWriteIndexKey).catch(() => null);
  if (!ids?.length) return [];
  const records = await Promise.all(ids.slice(0, pendingReviewWriteFileReadWindow).map((id) => kv.get<ReviewWriteRecord>(pendingWriteKey(id)).catch(() => null)));
  return newestByTimestamp(records.map(normalizePendingReviewWrite).filter(Boolean) as ReviewWriteRecord[], (record) => record.updatedAt)
    .slice(0, maxPendingReviewWrites);
}

async function writeKvPendingReviewWrite(record: ReviewWriteRecord) {
  const kv = await getKvClient();
  if (!kv) return false;
  const safeRecord = normalizePendingReviewWrite(record) || record;
  const ids = await kv.get<string[]>(pendingWriteIndexKey).catch(() => null);
  const nextIds = [safeRecord.id, ...(ids || []).filter((id) => id !== safeRecord.id)].slice(0, pendingReviewWriteFileReadWindow);
  await Promise.all([
    kv.set(pendingWriteKey(safeRecord.id), safeRecord),
    kv.set(pendingWriteIndexKey, nextIds)
  ]);
  return true;
}

export function listPendingReviewWrites(): ReviewWriteRecord[] {
  const records = listRuntimeFiles(pendingDir(), ".json", { maxFilesFromEnd: pendingReviewWriteFileReadWindow })
    .map(readRecord)
    .filter((record): record is ReviewWriteRecord => Boolean(record));
  return newestByTimestamp(records, (record) => record.updatedAt)
    .slice(0, maxPendingReviewWrites);
}

export async function listPendingReviewWritesAsync(): Promise<ReviewWriteRecord[]> {
  if (shouldUseKvPendingWrites()) {
    const records = await listKvPendingReviewWrites();
    if (records) return records;
    if (productionRuntime()) throw durablePendingWriteError("read");
  }
  return listPendingReviewWrites();
}

export function pendingReviewWriteSummary(record: ReviewWriteRecord): ReviewWriteRecordSummary {
  return {
    id: record.id,
    resourceId: record.resourceId,
    requestedStatus: record.requestedStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    syncState: record.syncState,
    lastError: record.lastError
  };
}

const terminalSyncStates: ReviewWriteRecord["syncState"][] = ["cancelled", "superseded", "synced_to_resourcespace"];

export function latestPendingWriteForResource(resourceId: string) {
  return listPendingReviewWrites().find((record) => record.resourceId === resourceId && !terminalSyncStates.includes(record.syncState));
}

export async function latestPendingWriteForResourceAsync(resourceId: string) {
  const records = await listPendingReviewWritesAsync();
  return records.find((record) => record.resourceId === resourceId && !terminalSyncStates.includes(record.syncState));
}

export function pendingReviewWriteDiagnostics() {
  const records = listPendingReviewWrites();
  const lastAttempt = records[0];
  const lastError = records.find((record) => record.lastError);
  return {
    count: records.filter((record) => !terminalSyncStates.includes(record.syncState)).length,
    lastAttemptAt: lastAttempt?.updatedAt,
    lastError: lastError?.lastError
  };
}

export async function pendingReviewWriteDiagnosticsAsync() {
  const records = await listPendingReviewWritesAsync();
  const lastAttempt = records[0];
  const lastError = records.find((record) => record.lastError);
  return {
    count: records.filter((record) => !terminalSyncStates.includes(record.syncState)).length,
    lastAttemptAt: lastAttempt?.updatedAt,
    lastError: lastError?.lastError
  };
}

export function createPendingReviewWrite({
  asset,
  requestedStatus,
  reviewerRole,
  reviewerName,
  note,
  checklist,
  blockers
}: {
  asset: StockMediaAsset;
  requestedStatus: string;
  reviewerRole: "Reviewer" | "DAM Admin";
  reviewerName?: string;
  note: string;
  checklist: ReviewEvidenceChecklist;
  blockers: string[];
}) {
  const now = new Date().toISOString();
  const resourceId = assetResourceRef(asset);
  const id = `${safeIsoTimestampIdPart(now)}-${safeFilePart(resourceId)}-${crypto.randomUUID().slice(0, 8)}`;
  const record: ReviewWriteRecord = {
    id,
    resourceId,
    oldStatus: normalizePersistedDisplayText(asset.status, 120) || "Unknown",
    requestedStatus: normalizePersistedDisplayText(requestedStatus, 120) || "Needs Review",
    reviewerRole,
    reviewerName: reviewerName === undefined ? undefined : normalizePersistedDisplayText(reviewerName, 120),
    createdAt: now,
    updatedAt: now,
    note: normalizePersistedDisplayText(note, 1200),
    checklist,
    blockers: blockers.map((item) => normalizePersistedDisplayText(item, 120)).filter(Boolean).slice(0, 24),
    syncState: "queued",
    retryCount: 0
  };
  return writeRecord(record);
}

export async function createPendingReviewWriteAsync(input: Parameters<typeof createPendingReviewWrite>[0]) {
  const now = new Date().toISOString();
  const resourceId = assetResourceRef(input.asset);
  const id = `${safeIsoTimestampIdPart(now)}-${safeFilePart(resourceId)}-${crypto.randomUUID().slice(0, 8)}`;
  const record: ReviewWriteRecord = {
    id,
    resourceId,
    oldStatus: normalizePersistedDisplayText(input.asset.status, 120) || "Unknown",
    requestedStatus: normalizePersistedDisplayText(input.requestedStatus, 120) || "Needs Review",
    reviewerRole: input.reviewerRole,
    reviewerName: input.reviewerName === undefined ? undefined : normalizePersistedDisplayText(input.reviewerName, 120),
    createdAt: now,
    updatedAt: now,
    note: normalizePersistedDisplayText(input.note, 1200),
    checklist: input.checklist,
    blockers: input.blockers.map((item) => normalizePersistedDisplayText(item, 120)).filter(Boolean).slice(0, 24),
    syncState: "queued",
    retryCount: 0
  };
  if (shouldUseKvPendingWrites()) {
    const wroteKv = await writeKvPendingReviewWrite(record).catch(() => false);
    if (wroteKv) return record;
    if (productionRuntime()) throw durablePendingWriteError("write");
  }
  return writeRecord(record);
}

export function updatePendingReviewWrite(id: string, update: Partial<Pick<ReviewWriteRecord, "syncState" | "lastError" | "retryCount">>) {
  const record = listPendingReviewWrites().find((item) => item.id === id);
  if (!record) return null;
  return writeRecord({
    ...record,
    ...update,
    updatedAt: new Date().toISOString(),
    retryCount: update.retryCount ?? record.retryCount
  });
}

export function markPendingReviewWriteSyncFailed(id: string, error: string) {
  const record = listPendingReviewWrites().find((item) => item.id === id);
  return updatePendingReviewWrite(id, {
    syncState: "sync_failed",
    lastError: error,
    retryCount: record ? record.retryCount + 1 : 1
  });
}

export function markPendingReviewWriteReadyToSync(id: string) {
  return updatePendingReviewWrite(id, {
    syncState: "ready_to_sync",
    lastError: undefined
  });
}

export function markPendingReviewWriteSyncing(id: string) {
  return updatePendingReviewWrite(id, {
    syncState: "syncing",
    lastError: undefined
  });
}

export function markPendingReviewWriteSynced(id: string) {
  return updatePendingReviewWrite(id, {
    syncState: "synced_to_resourcespace",
    lastError: undefined
  });
}

export function markPendingReviewWriteConflictDetected(id: string, error: string) {
  const record = listPendingReviewWrites().find((item) => item.id === id);
  return updatePendingReviewWrite(id, {
    syncState: "conflict_detected",
    lastError: error,
    retryCount: record ? record.retryCount + 1 : 1
  });
}
