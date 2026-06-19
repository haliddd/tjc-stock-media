import { newestByTimestamp, safeCompactText, safeEnumValue, safeIsoTimestamp } from "@/lib/persisted-record-safety";
import type { IntakeBatchRecord } from "@/lib/intake-batch-store";
import type { DemoRole } from "@/lib/types";

export type UploadHistoryStatus = "Submitted" | "Needs more info" | "Reviewed" | "Restricted" | "Rejected";
export type UploadHistoryMediaType = "Photos" | "Videos" | "Photos and videos" | "Not sure";

export type UploadHistoryRow = {
  id: string;
  batchName: string;
  eventName?: string;
  mediaType: UploadHistoryMediaType;
  fileCount: number;
  status: UploadHistoryStatus;
  date: string;
  eventDate: string;
  locationName?: string;
  ministry: string;
  source?: string;
  peopleMinors: string;
  notes: string;
  submittedAt?: string;
  reviewStatus?: string;
  publishStatus?: string;
  reviewerNote?: string;
  roleFit: DemoRole[];
};

export type MyUploadHistoryResponse = {
  uploads: UploadHistoryRow[];
  count: number;
  source: "server-intake";
  storageTruth: string;
};

const uploadHistoryUnsafeContributorCopy = /\b(ResourceSpace|Support Zone|Source Status|source-system|source system|writeback|backend|live sync|sync complete|synced|published|download|downloadable|public now|Approved Public|production-ready)\b/i;

function safeHistoryText(value: unknown, fallback = "", max = 160) {
  const text = safeCompactText(value, max);
  if (!text || uploadHistoryUnsafeContributorCopy.test(text)) return fallback;
  return text;
}

function receiptDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Today";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

function mediaTypeForBatch(record: IntakeBatchRecord): UploadHistoryMediaType {
  const inventory = record.mediaInventory;
  if (!inventory.fileCount) return "Not sure";
  if (inventory.photoCount && (inventory.videoCount || inventory.audioCount)) return "Photos and videos";
  if (inventory.videoCount || inventory.audioCount) return "Videos";
  return "Photos";
}

export function uploadHistoryStorageTruth(records: IntakeBatchRecord[]) {
  const modes = new Set(records.map((record) => record.storageMode));
  if (modes.has("vercel-kv") || modes.has("vercel-kv-blob")) {
    return "Recorded upload history is available for this signed-in session. Review still controls use.";
  }
  if (modes.has("local-runtime") || modes.has("source-link-only")) {
    return "Recorded upload history is available in this local beta runtime. Browser fallback may also appear on this device.";
  }
  return "No recorded upload history yet. Browser fallback may appear on this device.";
}

export function intakeBatchToUploadHistoryRow(record: IntakeBatchRecord): UploadHistoryRow {
  const submittedAt = safeIsoTimestamp(record.submittedAt || record.createdAt) || new Date(0).toISOString();
  const batchName = safeHistoryText(record.detected.eventName || record.source.folderName, "Submitted media");
  const source = safeHistoryText(record.source.uploader, "Contributor upload");
  return {
    id: record.id,
    batchName,
    eventName: batchName,
    mediaType: mediaTypeForBatch(record),
    fileCount: Math.max(0, Math.trunc(record.mediaInventory.fileCount || 0)),
    status: "Submitted",
    date: receiptDate(submittedAt),
    eventDate: safeHistoryText(record.detected.eventDate, ""),
    locationName: safeHistoryText(record.detected.location, "") || undefined,
    ministry: safeHistoryText(record.detected.ministry, ""),
    source,
    peopleMinors: "Not sure",
    notes: "Reviewer packet recorded. Waiting for review.",
    submittedAt,
    reviewStatus: "Waiting for review",
    publishStatus: "Do not use yet",
    reviewerNote: "Waiting for review.",
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  };
}

export function buildMyUploadHistoryResponse(records: IntakeBatchRecord[]): MyUploadHistoryResponse {
  const uploads = newestByTimestamp(records, (record) => record.submittedAt || record.createdAt)
    .map(intakeBatchToUploadHistoryRow);
  return {
    uploads,
    count: uploads.length,
    source: "server-intake",
    storageTruth: uploadHistoryStorageTruth(records)
  };
}

export function normalizeUploadHistoryRow(value: unknown): UploadHistoryRow | null {
  const raw = (value || {}) as Partial<UploadHistoryRow>;
  const id = safeHistoryText(raw.id, "", 180);
  const batchName = safeHistoryText(raw.batchName, "Submitted media");
  const status = safeEnumValue(raw.status, ["Submitted", "Needs more info", "Reviewed", "Restricted", "Rejected"] as const, "Submitted");
  if (!id || !batchName) return null;
  return {
    id,
    batchName,
    eventName: safeHistoryText(raw.eventName, batchName),
    mediaType: safeEnumValue(raw.mediaType, ["Photos", "Videos", "Photos and videos", "Not sure"] as const, "Not sure"),
    fileCount: Math.max(0, Math.trunc(Number(raw.fileCount) || 0)),
    status,
    date: safeHistoryText(raw.date, "Today"),
    eventDate: safeHistoryText(raw.eventDate, ""),
    locationName: safeHistoryText(raw.locationName, "") || undefined,
    ministry: safeHistoryText(raw.ministry, ""),
    source: safeHistoryText(raw.source, "Contributor upload"),
    peopleMinors: safeHistoryText(raw.peopleMinors, "Not sure"),
    notes: safeHistoryText(raw.notes, ""),
    submittedAt: safeIsoTimestamp(raw.submittedAt) || undefined,
    reviewStatus: safeHistoryText(raw.reviewStatus, "") || undefined,
    publishStatus: safeHistoryText(raw.publishStatus, "") || undefined,
    reviewerNote: safeHistoryText(raw.reviewerNote, "") || undefined,
    roleFit: ["Contributor", "Reviewer", "DAM Admin"]
  };
}
