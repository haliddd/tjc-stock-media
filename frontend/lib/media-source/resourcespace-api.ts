import { assetResourceRef } from "@/lib/asset-refs";
import { hasResourceSpaceApiConfig, resourceSpaceWritebackEnabled } from "@/lib/env";
import { getAssetsFromExport } from "@/lib/media-source/exported-metadata";
import {
  markPendingReviewWriteConflictDetected,
  markPendingReviewWriteReadyToSync,
  markPendingReviewWriteSyncFailed,
  markPendingReviewWriteSyncing,
  markPendingReviewWriteSynced
} from "@/lib/pending-review-writes";
import { resourceSpaceFieldMap, resourceSpaceWritebackFieldMapDiagnostics } from "@/lib/resourcespace-field-map";
import {
  resourceSpaceApiDiagnostics,
  resourceSpaceGetCollectionResources,
  resourceSpaceGetResourceData,
  resourceSpaceSearchAll,
  resourceSpaceUpdateField
} from "@/lib/resourcespace-client";
import { normalizeResourceSpaceRecord, normalizeResourceSpaceStatus, type ResourceSpaceRecord } from "@/lib/resourcespace-schema";
import type { MediaSourceStatus, StockMediaAsset } from "@/lib/types";
import type { ReviewWriteRecord } from "@/lib/types";

export const resourceSpaceApiStatus: MediaSourceStatus = {
  adapter: "resourcespace-api",
  label: "ResourceSpace API",
  detail: "ResourceSpace API config is present. Server routes may call ResourceSpace without exposing credentials to the browser.",
  readOnly: false
};

export let resourceSpaceApiReadDiagnostics = {
  ok: false,
  complete: false,
  pages: 0,
  records: 0,
  error: "ResourceSpace API has not been read in this process."
};

export async function getAssetsFromResourceSpaceApi(): Promise<StockMediaAsset[] | null> {
  if (!hasResourceSpaceApiConfig()) return null;

  const result = await resourceSpaceSearchAll<unknown>({ function: "do_search", search: "" });
  resourceSpaceApiReadDiagnostics = {
    ok: result.ok,
    complete: result.complete,
    pages: result.pages,
    records: result.records,
    error: result.error || ""
  };
  if (!result.ok || !result.complete || !Array.isArray(result.data)) return null;
  const records = result.data
    .filter((row): row is ResourceSpaceRecord => Boolean(row && typeof row === "object" && !Array.isArray(row)))
    .map((row) => normalizeResourceSpaceRecord(row));
  return records.length ? records : null;
}

function asResourceSpaceRecord(data: unknown): ResourceSpaceRecord | null {
  return data && typeof data === "object" && !Array.isArray(data) ? data as ResourceSpaceRecord : null;
}

type ResourceSpaceRecordReadResult =
  | { ok: true; status: number; data: ResourceSpaceRecord; error?: string }
  | { ok: false; status: number; data?: null; error: string };

async function readResourceSpaceRecord(resourceId: string): Promise<ResourceSpaceRecordReadResult> {
  const result = await resourceSpaceGetResourceData(resourceId);
  if (!result.ok) {
    return {
      ok: false,
      status: result.status,
      data: null,
      error: result.error || "ResourceSpace record read failed."
    };
  }
  const record = asResourceSpaceRecord(result.data);
  if (!record) {
    return {
      ok: false,
      status: 502,
      data: null,
      error: "ResourceSpace record confirmation returned a non-object payload."
    };
  }
  return { ok: true, status: result.status, data: record };
}

function recordValue(row: ResourceSpaceRecord, field: string | number) {
  const key = String(field);
  const found = row[key] ?? row[key.toLowerCase()] ?? row[key.toUpperCase()];
  return found === undefined || found === null ? "" : String(found).trim();
}

function valuesMatch(actual: string, expected: string) {
  return actual.trim().toLowerCase() === expected.trim().toLowerCase();
}

function resourceIdsFromCollectionPayload(payload: unknown): string[] {
  if (!payload) return [];
  const values = Array.isArray(payload)
    ? payload
    : typeof payload === "object"
      ? Object.values(payload as Record<string, unknown>)
      : [];
  return values
    .flatMap((item) => {
      if (typeof item === "string" || typeof item === "number") return [String(item)];
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const id = record.ref || record.resource || record.resource_id || record.id;
        return typeof id === "string" || typeof id === "number" ? [String(id)] : [];
      }
      return [];
    })
    .filter(Boolean);
}

export async function getResourceSpaceCollectionAssets(collectionId: string | number) {
  if (!hasResourceSpaceApiConfig()) {
    return {
      ok: false,
      status: 409,
      assets: [] as StockMediaAsset[],
      message: "ResourceSpace API credentials are not configured; live collection reads are unavailable."
    };
  }

  const resources = await resourceSpaceGetCollectionResources(collectionId);
  if (!resources.ok) {
    return {
      ok: false,
      status: resources.status,
      assets: [] as StockMediaAsset[],
      message: resources.error || "ResourceSpace collection read failed."
    };
  }
  const ids = new Set(resourceIdsFromCollectionPayload(resources.data));
  const exportAssets = await getAssetsFromExport() || [];
  const matched = exportAssets.filter((asset) => ids.has(assetResourceRef(asset)));
  return {
    ok: true,
    status: 200,
    assets: matched,
    resourceIds: [...ids],
    message: matched.length
      ? `Loaded ${matched.length.toLocaleString()} ResourceSpace collection asset${matched.length === 1 ? "" : "s"}.`
      : `Collection ${collectionId} returned ${ids.size.toLocaleString()} resource id${ids.size === 1 ? "" : "s"}, but no exported records matched yet.`
  };
}

export async function updateResourceReviewStatus(record: ReviewWriteRecord) {
  if (!hasResourceSpaceApiConfig()) {
    return {
      ok: false,
      status: 409,
      attemptedLiveWriteback: false,
      reasonCode: "resourcespace-api-unconfigured",
      message: "Review decision passed evidence checks and is queued for media-team follow-up. Final library update is not completed from this page."
    };
  }

  if (!resourceSpaceWritebackEnabled()) {
    return {
      ok: false,
      status: 409,
      attemptedLiveWriteback: false,
      reasonCode: "resourcespace-writeback-disabled",
      message: "ResourceSpace writeback is configured but disabled. Decision remains queued for pending sync."
    };
  }

  const fieldMap = resourceSpaceWritebackFieldMapDiagnostics();
  if (!fieldMap.valid) {
    const message = fieldMap.configured
      ? `ResourceSpace writeback field map is incomplete. Missing: ${fieldMap.missing.join(", ") || "none"}. ${fieldMap.error || ""}`.trim()
      : "ResourceSpace writeback requires explicit RESOURCESPACE_FIELD_MAP_JSON review field refs.";
    const failed = markPendingReviewWriteSyncFailed(record.id, message);
    return {
      ok: false,
      status: 409,
      attemptedLiveWriteback: true,
      reasonCode: "resourcespace-field-map-invalid",
      record: failed,
      message
    };
  }

  markPendingReviewWriteReadyToSync(record.id);

  const diagnostics = await resourceSpaceApiDiagnostics();
  if (!diagnostics.ok) {
    const failed = markPendingReviewWriteSyncFailed(record.id, diagnostics.error || "ResourceSpace API smoke failed before writeback.");
    return {
      ok: false,
      status: diagnostics.status,
      attemptedLiveWriteback: true,
      reasonCode: "resourcespace-api-diagnostics-failed",
      record: failed,
      message: diagnostics.error || "ResourceSpace API smoke failed before writeback."
    };
  }

  const current = await readResourceSpaceRecord(record.resourceId);
  if (!current.ok || !current.data) {
    const message = current.error || "ResourceSpace record could not be read before writeback.";
    const failed = markPendingReviewWriteSyncFailed(record.id, message);
    return {
      ok: false,
      status: current.status,
      attemptedLiveWriteback: true,
      reasonCode: "resourcespace-record-read-failed",
      record: failed,
      message
    };
  }
  const currentStatus = normalizeResourceSpaceStatus(current.data);
  if (record.oldStatus !== "Unknown" && currentStatus !== record.oldStatus) {
    const message = `ResourceSpace status conflict: expected ${record.oldStatus}, found ${currentStatus}.`;
    const conflict = markPendingReviewWriteConflictDetected(record.id, message);
    return {
      ok: false,
      status: 409,
      attemptedLiveWriteback: true,
      reasonCode: "resourcespace-status-conflict",
      record: conflict,
      message
    };
  }

  markPendingReviewWriteSyncing(record.id);

  const statusField = resourceSpaceFieldMap.approvalStatus;
  const expectedDate = new Date().toISOString().slice(0, 10);
  const expectedReviewer = record.reviewerName || record.reviewerRole;

  const secondaryResults = await Promise.all([
    resourceSpaceUpdateField(record.resourceId, resourceSpaceFieldMap.reviewedDate, expectedDate),
    resourceSpaceUpdateField(record.resourceId, resourceSpaceFieldMap.reviewer, expectedReviewer),
    resourceSpaceUpdateField(record.resourceId, resourceSpaceFieldMap.notes, record.note)
  ]);
  const secondaryFailure = secondaryResults.find((result) => !result.ok);
  if (secondaryFailure) {
    const message = secondaryFailure.error || "ResourceSpace secondary review field update failed.";
    const failed = markPendingReviewWriteSyncFailed(record.id, message);
    return {
      ok: false,
      status: secondaryFailure.status,
      attemptedLiveWriteback: true,
      reasonCode: "resourcespace-secondary-field-update-failed",
      record: failed,
      message
    };
  }

  const statusResult = await resourceSpaceUpdateField(record.resourceId, statusField, record.requestedStatus);
  if (!statusResult.ok) {
    const failed = markPendingReviewWriteSyncFailed(record.id, statusResult.error || "ResourceSpace status update failed.");
    return {
      ok: false,
      status: statusResult.status,
      attemptedLiveWriteback: true,
      reasonCode: "resourcespace-status-update-failed",
      record: failed,
      message: statusResult.error || "ResourceSpace status update failed."
    };
  }

  const confirmation = await readResourceSpaceRecord(record.resourceId);
  if (!confirmation.ok || !confirmation.data) {
    const message = confirmation.error || "ResourceSpace writeback could not be confirmed after update.";
    const failed = markPendingReviewWriteSyncFailed(record.id, message);
    return {
      ok: false,
      status: confirmation.status || 502,
      attemptedLiveWriteback: true,
      reasonCode: "resourcespace-confirmation-read-failed",
      record: failed,
      message
    };
  }
  const confirmedStatus = normalizeResourceSpaceStatus(confirmation.data);
  const confirmedReviewer = recordValue(confirmation.data, resourceSpaceFieldMap.reviewer);
  const confirmedDate = recordValue(confirmation.data, resourceSpaceFieldMap.reviewedDate);
  const confirmedNotes = recordValue(confirmation.data, resourceSpaceFieldMap.notes);
  const confirmed = confirmedStatus === record.requestedStatus
    && valuesMatch(confirmedReviewer, expectedReviewer)
    && valuesMatch(confirmedDate, expectedDate)
    && valuesMatch(confirmedNotes, record.note);
  if (!confirmed) {
    const message = "ResourceSpace writeback completed but confirmation fields did not match the requested evidence packet.";
    const failed = markPendingReviewWriteSyncFailed(record.id, message);
    return {
      ok: false,
      status: 502,
      attemptedLiveWriteback: true,
      reasonCode: "resourcespace-confirmation-mismatch",
      record: failed,
      message
    };
  }

  let synced: ReviewWriteRecord | null;
  try {
    synced = markPendingReviewWriteSynced(record.id);
  } catch (error) {
    return {
      ok: false,
      status: 503,
      attemptedLiveWriteback: true,
      reasonCode: "local-sync-state-update-failed",
      record: null,
      message: error instanceof Error ? error.message : "Local pending write record could not be marked synced."
    };
  }
  if (!synced) {
    return {
      ok: false,
      status: 503,
      attemptedLiveWriteback: true,
      reasonCode: "local-sync-state-update-failed",
      record: null,
      message: "ResourceSpace writeback was confirmed, but the local pending write record could not be marked synced."
    };
  }
  return {
    ok: true,
    status: 200,
    attemptedLiveWriteback: true,
    reasonCode: "resourcespace-writeback-synced",
    record: synced,
    message: "ResourceSpace review fields were updated through the live API."
  };
}
