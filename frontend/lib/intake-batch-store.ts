import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { hasVercelBlobConfig, hasVercelKvConfig, productionRuntime, writableRuntimeRoot } from "@/lib/env";
import { safeCompactText, safeEnumValue, safeFileNameText, safeIsoTimestamp, safePathSlugText } from "@/lib/persisted-record-safety";
import { assertRuntimeWriteAllowed, ensureRuntimeDir, readRuntimeJsonFile, writeRuntimeJsonFile } from "@/lib/runtime-file-store";
import type { DetectionConfidence, MediaInventory } from "@/lib/upload-intake-detection";
import type { DemoRole } from "@/lib/types";

export type IntakeBatchStorageMode = "local-runtime" | "source-link-only" | "vercel-kv" | "vercel-kv-blob" | "blocked-no-durable-store";

export type IntakeBatchRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  actor: string;
  role: DemoRole;
  status: "draft" | "submitted" | "processing" | "needs-review";
  defaultAssetStatus: "Needs Review";
  defaultUsageScope: "Do Not Publish";
  source: {
    kind: "browser-upload" | "folder-upload" | "drive-link" | "admin-import";
    sourceLink?: string;
    folderName?: string;
    uploader: string;
  };
  detected: {
    eventName?: string;
    eventDate?: string;
    ministry?: string;
    location?: string;
    photographer?: string;
    confidence: DetectionConfidence;
  };
  mediaInventory: MediaInventory;
  suggestions: {
    tags: string[];
    tjcTerms: string[];
    collections: string[];
    requestedUse: string[];
  };
  riskFlags: string[];
  reviewerTasks: string[];
  adminTasks: string[];
  manifestPath?: string;
  storageMode: IntakeBatchStorageMode;
  resourceSpaceWritten: false;
};

export type IntakeBatchManifestItem = {
  originalFilename: string;
  storedFilename?: string;
  blobPath?: string;
  size: number;
  type: string;
  lastModified?: number;
};

export type PersistIntakeBatchInput = Omit<IntakeBatchRecord, "id" | "createdAt" | "updatedAt" | "submittedAt" | "status" | "manifestPath" | "storageMode" | "resourceSpaceWritten"> & {
  files: File[];
  sourceLinkCaptured: boolean;
};

export type PersistIntakeBatchResult = {
  record?: IntakeBatchRecord;
  batchId: string;
  storageMode: IntakeBatchStorageMode;
  manifestPath?: string;
  blockedReason?: string;
};

function intakeRoot() {
  return path.join(writableRuntimeRoot(), ".runtime", "intake-batches");
}

const intakeIndexKey = "tjc-stock-media:intake-batches:index";
const intakeRecordPrefix = "tjc-stock-media:intake-batches:record:";
const maxIntakeBatchRecords = 500;

function intakeRecordKey(id: string) {
  return `${intakeRecordPrefix}${id}`;
}

function hostedRuntime() {
  return process.env.VERCEL === "1";
}

async function getKvClient() {
  if (!hasVercelKvConfig()) return null;
  const { kv } = await import("@vercel/kv");
  return kv;
}

function safeBatchId(eventName?: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const slug = safePathSlugText(eventName || "intake-batch", 48) || "intake-batch";
  return `${stamp}-${slug}-${crypto.randomUUID().slice(0, 8)}`;
}

function safeRole(value: DemoRole): DemoRole {
  return safeEnumValue(value, ["Viewer", "Contributor", "Reviewer", "DAM Admin"] as const, "Contributor");
}

function normalizeStringArray(value: unknown, maxItems = 40) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => safeCompactText(item, 120)).filter(Boolean).slice(0, maxItems);
}

function normalizeMediaInventory(value: unknown): MediaInventory {
  const raw = (value || {}) as Partial<MediaInventory>;
  return {
    fileCount: Math.max(0, Math.trunc(Number(raw.fileCount) || 0)),
    photoCount: Math.max(0, Math.trunc(Number(raw.photoCount) || 0)),
    videoCount: Math.max(0, Math.trunc(Number(raw.videoCount) || 0)),
    audioCount: Math.max(0, Math.trunc(Number(raw.audioCount) || 0)),
    heicCount: Math.max(0, Math.trunc(Number(raw.heicCount) || 0)),
    totalBytes: Math.max(0, Math.trunc(Number(raw.totalBytes) || 0)),
    largeMediaCount: Math.max(0, Math.trunc(Number(raw.largeMediaCount) || 0)),
    extensions: normalizeStringArray(raw.extensions, 80),
    folderName: safeCompactText(raw.folderName, 160) || undefined,
    originalFilenames: normalizeStringArray(raw.originalFilenames, 200)
  };
}

export function normalizeIntakeBatchRecord(input: unknown): IntakeBatchRecord | null {
  const raw = (input || {}) as Partial<IntakeBatchRecord>;
  const id = safePathSlugText(raw.id, 160);
  if (!id) return null;
  return {
    id,
    createdAt: safeIsoTimestamp(raw.createdAt) || new Date(0).toISOString(),
    updatedAt: safeIsoTimestamp(raw.updatedAt) || new Date(0).toISOString(),
    submittedAt: raw.submittedAt ? safeIsoTimestamp(raw.submittedAt) || undefined : undefined,
    actor: safeCompactText(raw.actor, 160) || "local-beta:unknown",
    role: safeRole(raw.role || "Contributor"),
    status: safeEnumValue(raw.status, ["draft", "submitted", "processing", "needs-review"] as const, "submitted"),
    defaultAssetStatus: "Needs Review",
    defaultUsageScope: "Do Not Publish",
    source: {
      kind: safeEnumValue(raw.source?.kind, ["browser-upload", "folder-upload", "drive-link", "admin-import"] as const, "browser-upload"),
      sourceLink: raw.source?.sourceLink ? "captured-redacted" : undefined,
      folderName: safeCompactText(raw.source?.folderName, 160) || undefined,
      uploader: safeCompactText(raw.source?.uploader, 160) || "Unknown uploader"
    },
    detected: {
      eventName: safeCompactText(raw.detected?.eventName, 160) || undefined,
      eventDate: safeCompactText(raw.detected?.eventDate, 40) || undefined,
      ministry: safeCompactText(raw.detected?.ministry, 120) || undefined,
      location: safeCompactText(raw.detected?.location, 160) || undefined,
      photographer: safeCompactText(raw.detected?.photographer, 160) || undefined,
      confidence: safeEnumValue(raw.detected?.confidence, ["high", "medium", "low"] as const, "low")
    },
    mediaInventory: normalizeMediaInventory(raw.mediaInventory),
    suggestions: {
      tags: normalizeStringArray(raw.suggestions?.tags),
      tjcTerms: normalizeStringArray(raw.suggestions?.tjcTerms),
      collections: normalizeStringArray(raw.suggestions?.collections),
      requestedUse: normalizeStringArray(raw.suggestions?.requestedUse)
    },
    riskFlags: normalizeStringArray(raw.riskFlags),
    reviewerTasks: normalizeStringArray(raw.reviewerTasks),
    adminTasks: normalizeStringArray(raw.adminTasks),
    manifestPath: raw.manifestPath ? safeCompactText(raw.manifestPath, 240) : undefined,
    storageMode: safeEnumValue(raw.storageMode, ["local-runtime", "source-link-only", "vercel-kv", "vercel-kv-blob", "blocked-no-durable-store"] as const, "local-runtime"),
    resourceSpaceWritten: false
  };
}

function manifestForFiles(files: File[]): IntakeBatchManifestItem[] {
  return files.map((file) => ({
    originalFilename: file.name,
    storedFilename: safeFileNameText(file.name, 120) || `${crypto.randomUUID().slice(0, 8)}.bin`,
    size: file.size,
    type: file.type || "unknown",
    lastModified: file.lastModified || undefined
  }));
}

async function writeOriginals(originalsDir: string, files: File[], manifest: IntakeBatchManifestItem[]) {
  ensureRuntimeDir(originalsDir);
  await Promise.all(files.map(async (file, index) => {
    const stored = manifest[index]?.storedFilename || `${crypto.randomUUID().slice(0, 8)}.bin`;
    const bytes = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(originalsDir, stored), bytes);
  }));
}

async function writeDurableOriginals(batchId: string, files: File[], manifest: IntakeBatchManifestItem[]) {
  if (!files.length) return manifest;
  if (!hasVercelBlobConfig()) {
    throw new Error("Blob storage is required for durable browser file intake.");
  }
  const { put } = await import("@vercel/blob");
  return Promise.all(files.map(async (file, index) => {
    const item = manifest[index] || {
      originalFilename: file.name,
      storedFilename: safeFileNameText(file.name, 120) || `${crypto.randomUUID().slice(0, 8)}.bin`,
      size: file.size,
      type: file.type || "unknown"
    };
    const safeName = item.storedFilename || `${crypto.randomUUID().slice(0, 8)}.bin`;
    const blob = await put(`intake-batches/${batchId}/originals/${safeName}`, file, {
      access: "private",
      addRandomSuffix: true,
      multipart: file.size > 8 * 1024 * 1024
    });
    return { ...item, blobPath: blob.pathname };
  }));
}

async function writeKvIntakeBatch(record: IntakeBatchRecord) {
  const kv = await getKvClient();
  if (!kv) return false;
  const ids = await kv.get<string[]>(intakeIndexKey).catch(() => null);
  const nextIds = [record.id, ...(ids || []).filter((id) => id !== record.id)].slice(0, maxIntakeBatchRecords);
  await Promise.all([
    kv.set(intakeRecordKey(record.id), record),
    kv.set(intakeIndexKey, nextIds)
  ]);
  return true;
}

async function readKvIntakeBatches(limit = 50) {
  const kv = await getKvClient();
  if (!kv) return null;
  const ids = await kv.get<string[]>(intakeIndexKey).catch(() => null);
  if (!ids?.length) return [] as IntakeBatchRecord[];
  const records = await Promise.all(ids.slice(0, Math.max(limit, 1)).map((id) => kv.get<IntakeBatchRecord>(intakeRecordKey(id)).catch(() => null)));
  return records
    .map(normalizeIntakeBatchRecord)
    .filter((record): record is IntakeBatchRecord => Boolean(record))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

function durableStorageBlockedReason(hasFiles: boolean) {
  if (!hasVercelKvConfig()) return "Durable upload intake records require KV storage before hosted upload history can continue.";
  if (hasFiles && !hasVercelBlobConfig()) return "Durable browser file intake requires Blob storage before hosted file staging can continue.";
  return "";
}

async function persistDurableIntakeBatch(record: IntakeBatchRecord, batchId: string, files: File[], manifest: IntakeBatchManifestItem[]): Promise<PersistIntakeBatchResult | null> {
  if (!hasVercelKvConfig()) return null;
  try {
    if (files.length) await writeDurableOriginals(batchId, files, manifest);
    const durableRecord: IntakeBatchRecord = {
      ...record,
      manifestPath: files.length ? "vercel-blob:intake-batches/<batchId>/originals" : undefined,
      storageMode: files.length ? "vercel-kv-blob" : "vercel-kv"
    };
    const wroteKv = await writeKvIntakeBatch(durableRecord);
    if (!wroteKv) return null;
    return { record: durableRecord, batchId, storageMode: durableRecord.storageMode, manifestPath: durableRecord.manifestPath };
  } catch (error) {
    if (hostedRuntime() || productionRuntime()) {
      return {
        batchId,
        storageMode: "blocked-no-durable-store",
        blockedReason: error instanceof Error ? error.message : "Durable upload intake storage failed."
      };
    }
    return null;
  }
}

export async function persistIntakeBatch(input: PersistIntakeBatchInput): Promise<PersistIntakeBatchResult> {
  const batchId = safeBatchId(input.detected.eventName);
  const now = new Date().toISOString();
  const hasFiles = input.files.length > 0;
  const durableBlocker = durableStorageBlockedReason(hasFiles);
  if ((hostedRuntime() || productionRuntime()) && durableBlocker) {
    return {
      batchId,
      storageMode: "blocked-no-durable-store",
      blockedReason: durableBlocker
    };
  }

  const batchDir = path.join(intakeRoot(), batchId);
  const manifestPath = path.join(batchDir, "manifest.json");
  const manifest = manifestForFiles(input.files);
  const sourceKind = input.source.kind === "folder-upload" || input.mediaInventory.folderName ? "folder-upload" : input.source.kind;
  const record: IntakeBatchRecord = {
    id: batchId,
    createdAt: now,
    updatedAt: now,
    submittedAt: now,
    actor: input.actor,
    role: input.role,
    status: "needs-review",
    defaultAssetStatus: "Needs Review",
    defaultUsageScope: "Do Not Publish",
    source: {
      ...input.source,
      kind: sourceKind,
      sourceLink: input.sourceLinkCaptured ? "captured-redacted" : undefined
    },
    detected: input.detected,
    mediaInventory: input.mediaInventory,
    suggestions: input.suggestions,
    riskFlags: input.riskFlags,
    reviewerTasks: input.reviewerTasks,
    adminTasks: input.adminTasks,
    manifestPath: hasFiles ? ".runtime/intake-batches/<batchId>/manifest.json" : undefined,
    storageMode: hasFiles ? "local-runtime" : "source-link-only",
    resourceSpaceWritten: false
  };

  const durable = await persistDurableIntakeBatch(record, batchId, input.files, manifest);
  if (durable) return durable;

  try {
    assertRuntimeWriteAllowed("intake-batches");
    ensureRuntimeDir(batchDir);
    writeRuntimeJsonFile(manifestPath, { batchId, files: manifest });
    if (hasFiles) await writeOriginals(path.join(batchDir, "originals"), input.files, manifest);
    writeRuntimeJsonFile(path.join(batchDir, "batch.json"), record);
    return { record, batchId, storageMode: record.storageMode, manifestPath: record.manifestPath };
  } catch (error) {
    return { batchId, storageMode: "blocked-no-durable-store", blockedReason: error instanceof Error ? error.message : "Runtime store write failed." };
  }
}

export function listIntakeBatches(limit = 50) {
  const root = intakeRoot();
  try {
    return fs.readdirSync(root)
      .map((id) => readRuntimeJsonFile(path.join(root, id, "batch.json"), normalizeIntakeBatchRecord))
      .filter((record): record is IntakeBatchRecord => Boolean(record))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export async function listStoredIntakeBatches(limit = 50) {
  const kvRecords = await readKvIntakeBatches(limit).catch((error) => {
    if ((hostedRuntime() || productionRuntime()) && hasVercelKvConfig()) {
      throw new Error(error instanceof Error ? error.message : "Durable upload intake read failed.");
    }
    return null;
  });
  if (kvRecords) return kvRecords;
  if (hostedRuntime() || productionRuntime()) {
    throw new Error("Durable upload intake records require KV storage before hosted upload history can continue.");
  }
  return listIntakeBatches(limit);
}

export async function listIntakeBatchesForActor(actor: string, limit = 50) {
  const safeActor = safeCompactText(actor, 160);
  if (!safeActor) return [];
  const records = await listStoredIntakeBatches(Math.max(limit * 3, limit));
  return records.filter((record) => record.actor === safeActor).slice(0, limit);
}
