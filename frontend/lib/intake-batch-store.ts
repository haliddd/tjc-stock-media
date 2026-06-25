import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { productionRuntime, writableRuntimeRoot } from "@/lib/env";
import { safeCompactText, safeEnumValue, safeFileNameText, safeIsoTimestamp, safePathSlugText } from "@/lib/persisted-record-safety";
import { assertRuntimeWriteAllowed, ensureRuntimeDir, readRuntimeJsonFile, writeRuntimeJsonFile } from "@/lib/runtime-file-store";
import type { DetectionConfidence, MediaInventory } from "@/lib/upload-intake-detection";
import type { DemoRole } from "@/lib/types";

export type IntakeBatchStorageMode = "local-runtime" | "source-link-only" | "blocked-no-durable-store";

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
    storageMode: safeEnumValue(raw.storageMode, ["local-runtime", "source-link-only", "blocked-no-durable-store"] as const, "local-runtime"),
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

export async function persistIntakeBatch(input: PersistIntakeBatchInput): Promise<PersistIntakeBatchResult> {
  const batchId = safeBatchId(input.detected.eventName);
  const now = new Date().toISOString();
  const hasFiles = input.files.length > 0;
  if (productionRuntime() && hasFiles) {
    return {
      batchId,
      storageMode: "blocked-no-durable-store",
      blockedReason: "Production browser file intake requires durable storage or admin/Drive intake."
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

  try {
    assertRuntimeWriteAllowed("intake-batches");
    ensureRuntimeDir(batchDir);
    writeRuntimeJsonFile(path.join(batchDir, "batch.json"), record);
    writeRuntimeJsonFile(manifestPath, { batchId, files: manifest });
    return { record, batchId, storageMode: record.storageMode, manifestPath: record.manifestPath };
  } catch (error) {
    if (!hasFiles && input.sourceLinkCaptured) {
      return { batchId, storageMode: "source-link-only", blockedReason: error instanceof Error ? error.message : "Runtime store write failed." };
    }
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
