import crypto from "node:crypto";
import path from "node:path";
import { assetResourceRef } from "@/lib/asset-refs";
import { writableRuntimeRoot } from "@/lib/env";
import { newestByTimestamp, safeEnumValue, safeIsoTimestamp, safeIsoTimestampIdPart, safeNonNegativeInt } from "@/lib/persisted-record-safety";
import { normalizeReviewRoleWithFallback } from "@/lib/permissions";
import { normalizePersistedDisplayText, normalizePersistedSlugText } from "@/lib/request-validation";
import { normalizeReviewChecklist } from "@/lib/review-evidence";
import { normalizeReviewEvidenceDepthChecklist } from "@/lib/review-evidence-depth";
import { listRuntimeFiles, readRuntimeJsonFile, writeRuntimeJsonFile } from "@/lib/runtime-file-store";
import type { ReviewEvidenceChecklist, ReviewEvidenceDepthChecklist, ReviewWriteRecord, ReviewWriteRecordSummary, StockMediaAsset } from "@/lib/types";

const pendingDirName = "pending-review-writes";
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
    evidenceDepth: raw.evidenceDepth ? normalizeReviewEvidenceDepthChecklist(raw.evidenceDepth) : undefined,
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

export function listPendingReviewWrites(): ReviewWriteRecord[] {
  const records = listRuntimeFiles(pendingDir(), ".json", { maxFilesFromEnd: pendingReviewWriteFileReadWindow })
    .map(readRecord)
    .filter((record): record is ReviewWriteRecord => Boolean(record));
  return newestByTimestamp(records, (record) => record.updatedAt)
    .slice(0, maxPendingReviewWrites);
}

export function pendingReviewWriteSummary(record: ReviewWriteRecord): ReviewWriteRecordSummary {
  return {
    id: record.id,
    resourceId: record.resourceId,
    requestedStatus: record.requestedStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    syncState: record.syncState,
    lastError: record.lastError,
    evidenceDepth: record.evidenceDepth
  };
}

const terminalSyncStates: ReviewWriteRecord["syncState"][] = ["cancelled", "superseded", "synced_to_resourcespace"];

export function latestPendingWriteForResource(resourceId: string) {
  return listPendingReviewWrites().find((record) => record.resourceId === resourceId && !terminalSyncStates.includes(record.syncState));
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

export function createPendingReviewWrite({
  asset,
  requestedStatus,
  reviewerRole,
  reviewerName,
  note,
  checklist,
  evidenceDepth,
  blockers
}: {
  asset: StockMediaAsset;
  requestedStatus: string;
  reviewerRole: "Reviewer" | "DAM Admin";
  reviewerName?: string;
  note: string;
  checklist: ReviewEvidenceChecklist;
  evidenceDepth?: ReviewEvidenceDepthChecklist;
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
    evidenceDepth,
    blockers: blockers.map((item) => normalizePersistedDisplayText(item, 120)).filter(Boolean).slice(0, 24),
    syncState: "queued",
    retryCount: 0
  };
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
