import path from "node:path";
import { appendRequiredAuditEvent, type AuditEventRecord } from "@/lib/audit-log";
import { assetResourceRef } from "@/lib/asset-refs";
import { displayTitle } from "@/lib/enterprise-display";
import { writableRuntimeRoot } from "@/lib/env";
import { readLocalJsonStore, readLocalJsonStoreSync, writeLocalJsonStore } from "@/lib/local-json-store";
import { newestByTimestamp, safeEnumValue, safeIsoTimestamp, safeIsoTimestampIdPart } from "@/lib/persisted-record-safety";
import { canContribute, canReview, canUpload } from "@/lib/permissions";
import { normalizeAssetId, normalizePersistedDisplayText, normalizePersistedSlugText, readJsonObject } from "@/lib/request-validation";
import type { DemoRole, StockMediaAsset } from "@/lib/types";

export type RequestRecordType = "Source access" | "Rights issue" | "Derivative request" | "DAM review" | "Upload intake";
export type RequestRecordStatus = "Waiting on me" | "Assigned" | "Blocked" | "Resolved";

export type RequestRecord = {
  id: string;
  type: RequestRecordType;
  relatedAssetId?: string;
  relatedAsset: string;
  resourceSpaceId?: string;
  requestedBy: string;
  requesterRole: DemoRole;
  status: RequestRecordStatus;
  blocker: string;
  assignedTo: string;
  updatedAt: string;
  createdAt: string;
  requiredEvidence: string[];
  timeline: string[];
  nextAction: string;
  roleFit: DemoRole[];
  linkedIntakeBatchId?: string;
  linkedPendingWriteId?: string;
  storageMode: "local-json";
};

export type RequestRecordListIdentity = { id: string; role: DemoRole };

export type RequestRecordDraft = {
  type: RequestRecordType;
  relatedAssetId?: string;
  relatedAsset?: string;
  resourceSpaceId?: string;
  blocker?: string;
  requiredEvidence?: string[];
  nextAction?: string;
  linkedIntakeBatchId?: string;
  linkedPendingWriteId?: string;
};

type RequestRecordAuditEvent = Omit<AuditEventRecord, "id" | "createdAt" | "actor"> & { actor?: string };
type RequestRouteError = {
  body: { error: string };
  status: 400 | 403;
};

const requestRecordTypes: RequestRecordType[] = ["Source access", "Rights issue", "Derivative request", "DAM review", "Upload intake"];
const requestRecordStatuses: RequestRecordStatus[] = ["Waiting on me", "Assigned", "Blocked", "Resolved"];
const maxRequestRecords = 300;
const requestRecordStorePath = () => path.join(writableRuntimeRoot(), "data", "runtime", "request-records.json");
const requestTruthBoundary = "portal-ticket-queue-only" as const;
let requestRecordWriteQueue: Promise<unknown> = Promise.resolve();

function newestFirst(records: RequestRecord[]) {
  return newestByTimestamp(records, (record) => record.updatedAt);
}

function safeRequestId(value: unknown) {
  return normalizePersistedSlugText(value, 120, { rejectUnsafePath: true });
}

function safeText(value: unknown, maxLength = 160) {
  return normalizePersistedDisplayText(value, maxLength);
}

function safeTextArray(value: unknown, maxItems = 12) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => safeText(item, 160)).filter(Boolean).slice(0, maxItems);
}

function safeRole(value: unknown): DemoRole {
  return safeEnumValue(value, ["Viewer", "Contributor", "Reviewer", "DAM Admin"] as const, "Viewer");
}

function roleFitForType(type: RequestRecordType): DemoRole[] {
  if (type === "Source access" || type === "Rights issue") return ["Viewer", "Contributor", "Reviewer", "DAM Admin"];
  return ["Contributor", "Reviewer", "DAM Admin"];
}

export function canCreateRequestRecord(role: DemoRole, type: RequestRecordType) {
  if (type === "Source access" || type === "Rights issue") return true;
  if (type === "Upload intake") return canUpload(role);
  return canContribute(role);
}

function defaultEvidence(type: RequestRecordType) {
  if (type === "Source access") return ["Intended channel", "Ministry owner approval", "Deadline"];
  if (type === "Rights issue") return ["Rights concern", "People/minors status", "Requested usage"];
  if (type === "Derivative request") return ["Usage scope", "Target size/channel", "Approved source record"];
  if (type === "Upload intake") return ["Uploader declaration", "Event context", "People visibility"];
  return ["Review reason", "Usage scope", "Reviewer note"];
}

function defaultAssignee(type: RequestRecordType) {
  if (type === "Source access") return "Media reviewer";
  if (type === "Rights issue") return "Rights reviewer";
  if (type === "Derivative request") return "Derivative queue";
  if (type === "Upload intake") return "Intake reviewer";
  return "Reviewer team";
}

function defaultNextAction(type: RequestRecordType) {
  if (type === "Source access") return "Add ministry use scope";
  if (type === "Rights issue") return "Resolve rights and people/minors evidence";
  if (type === "Derivative request") return "Create derivative request packet";
  if (type === "Upload intake") return "Review intake packet";
  return "Complete DAM review";
}

function defaultStatus(type: RequestRecordType): RequestRecordStatus {
  return type === "Rights issue" ? "Blocked" : type === "Source access" ? "Waiting on me" : "Assigned";
}

function normalizeRequestRecord(input: unknown): RequestRecord | null {
  const raw = (input || {}) as Partial<RequestRecord>;
  const id = safeRequestId(raw.id);
  if (!id) return null;
  const type = safeEnumValue(raw.type, requestRecordTypes, "DAM review");
  const updatedAt = safeIsoTimestamp(raw.updatedAt) || safeIsoTimestamp(raw.createdAt) || new Date(0).toISOString();
  const rawRoleFit = Array.isArray(raw.roleFit)
    ? raw.roleFit.map(safeRole).filter((role, index, roles) => roles.indexOf(role) === index)
    : [];
  return {
    id,
    type,
    relatedAssetId: raw.relatedAssetId === undefined ? undefined : normalizeAssetId(raw.relatedAssetId),
    relatedAsset: safeText(raw.relatedAsset, 180) || "Media record",
    resourceSpaceId: raw.resourceSpaceId === undefined ? undefined : safeRequestId(raw.resourceSpaceId),
    requestedBy: safeText(raw.requestedBy, 160) || "local-beta:unknown",
    requesterRole: safeRole(raw.requesterRole),
    status: safeEnumValue(raw.status, requestRecordStatuses, defaultStatus(type)),
    blocker: safeText(raw.blocker, 220) || "Evidence pending",
    assignedTo: safeText(raw.assignedTo, 120) || defaultAssignee(type),
    updatedAt,
    createdAt: safeIsoTimestamp(raw.createdAt) || updatedAt,
    requiredEvidence: safeTextArray(raw.requiredEvidence).length ? safeTextArray(raw.requiredEvidence) : defaultEvidence(type),
    timeline: safeTextArray(raw.timeline).length ? safeTextArray(raw.timeline, 16) : ["Request recorded", `${defaultAssignee(type)} assigned`],
    nextAction: safeText(raw.nextAction, 220) || defaultNextAction(type),
    roleFit: rawRoleFit.length ? rawRoleFit : roleFitForType(type),
    linkedIntakeBatchId: raw.linkedIntakeBatchId === undefined ? undefined : safeRequestId(raw.linkedIntakeBatchId),
    linkedPendingWriteId: raw.linkedPendingWriteId === undefined ? undefined : safeRequestId(raw.linkedPendingWriteId),
    storageMode: "local-json"
  };
}

async function readLocalRequestRecords() {
  return readLocalJsonStore({
    filePath: requestRecordStorePath,
    maxRecords: maxRequestRecords,
    normalize: normalizeRequestRecord,
    order: newestFirst
  });
}

async function writeLocalRequestRecords(records: RequestRecord[]) {
  await writeLocalJsonStore(records, {
    filePath: requestRecordStorePath,
    maxRecords: maxRequestRecords,
    normalize: normalizeRequestRecord,
    order: newestFirst
  });
}

export async function listRequestRecords() {
  return newestFirst(await readLocalRequestRecords()).slice(0, maxRequestRecords);
}

export type RequestRecordPayload = Omit<RequestRecord, "resourceSpaceId" | "linkedIntakeBatchId" | "linkedPendingWriteId" | "storageMode"> & {
  resourceSpaceId?: string;
  linkedIntakeBatchId?: string;
  linkedPendingWriteId?: string;
  storageMode?: "local-json";
};

export function requestRecordForRolePayload(role: DemoRole, record: RequestRecord): RequestRecordPayload {
  if (canReview(role)) return record;
  return {
    id: record.id,
    type: record.type,
    relatedAssetId: record.relatedAssetId,
    relatedAsset: record.relatedAsset,
    requestedBy: record.requesterRole,
    requesterRole: record.requesterRole,
    status: record.status,
    blocker: record.blocker,
    assignedTo: record.assignedTo,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
    requiredEvidence: record.requiredEvidence,
    timeline: record.timeline,
    nextAction: record.nextAction,
    roleFit: record.roleFit
  };
}

export function requestRecordsForRolePayload(role: DemoRole, records: RequestRecord[]) {
  return records
    .filter((record) => record.roleFit.includes(role))
    .map((record) => requestRecordForRolePayload(role, record));
}

export function requestRecordsForIdentityPayload(identity: RequestRecordListIdentity, records: RequestRecord[]) {
  if (canReview(identity.role)) return requestRecordsForRolePayload(identity.role, records);
  return records
    .filter((record) => record.requestedBy === identity.id)
    .map((record) => requestRecordForRolePayload(identity.role, record));
}

export function buildRequestRecordListResponse(records: RequestRecordPayload[]) {
  return {
    requests: records,
    count: records.length,
    storageMode: "local-json" as const,
    truthBoundary: requestTruthBoundary,
    approvalTruth: false as const,
    resourceSpaceWritten: false as const
  };
}

export function buildRequestRecordSaveResponse(role: DemoRole, record: RequestRecord) {
  return {
    ok: true,
    request: requestRecordForRolePayload(role, record),
    storageMode: record.storageMode,
    truthBoundary: requestTruthBoundary,
    approvalTruth: false as const,
    resourceSpaceWritten: false as const
  };
}

export async function readRequestRecordDraftInput(request: { json(): Promise<unknown> }) {
  const body = await readJsonObject(request);
  return sanitizeRequestRecordDraft((body as { request?: unknown }).request || body);
}

export function sanitizeRequestRecordDraft(input: unknown): RequestRecordDraft {
  const raw = (input || {}) as Partial<RequestRecordDraft>;
  const type = safeEnumValue(raw.type, requestRecordTypes, "DAM review");
  return {
    type,
    relatedAssetId: raw.relatedAssetId === undefined ? undefined : normalizeAssetId(raw.relatedAssetId),
    relatedAsset: safeText(raw.relatedAsset, 180) || undefined,
    resourceSpaceId: raw.resourceSpaceId === undefined ? undefined : safeRequestId(raw.resourceSpaceId),
    blocker: safeText(raw.blocker, 220) || undefined,
    requiredEvidence: safeTextArray(raw.requiredEvidence),
    nextAction: safeText(raw.nextAction, 220) || undefined,
    linkedIntakeBatchId: raw.linkedIntakeBatchId === undefined ? undefined : safeRequestId(raw.linkedIntakeBatchId),
    linkedPendingWriteId: raw.linkedPendingWriteId === undefined ? undefined : safeRequestId(raw.linkedPendingWriteId)
  };
}

export function requestCreateDeniedError(type: RequestRecordType): RequestRouteError {
  return { body: { error: `${type} requests are unavailable for this role.` }, status: 403 };
}

export function requestCreateValidationError(draft: RequestRecordDraft): RequestRouteError | null {
  if (!draft.relatedAsset && !draft.relatedAssetId && draft.type !== "Upload intake") {
    return { body: { error: "Request needs a related asset or media record label." }, status: 400 };
  }
  return null;
}

export async function saveRequestRecord(record: Omit<RequestRecord, "storageMode">) {
  const write = requestRecordWriteQueue.then(async () => {
    const records = await readLocalRequestRecords();
    const next: RequestRecord = { ...record, storageMode: "local-json" };
    await writeLocalRequestRecords([next, ...records.filter((item) => item.id !== next.id)]);
    return next;
  });
  requestRecordWriteQueue = write.catch(() => undefined);
  return write;
}

function buildRequestRecord(draft: RequestRecordDraft, actor: { id: string; role: DemoRole }): Omit<RequestRecord, "storageMode"> {
  const now = new Date().toISOString();
  const randomSuffix = globalThis.crypto?.randomUUID?.() || `${Math.random().toString(36).slice(2)}-${process.hrtime.bigint().toString(36)}`;
  const id = `req-${safeIsoTimestampIdPart(now)}-${safeRequestId(draft.type).slice(0, 24)}-${safeRequestId(randomSuffix).slice(0, 12)}`;
  return {
    id,
    type: draft.type,
    relatedAssetId: draft.relatedAssetId,
    relatedAsset: draft.relatedAsset || draft.relatedAssetId || (draft.type === "Upload intake" ? "Upload intake batch" : "Media record"),
    resourceSpaceId: draft.resourceSpaceId,
    requestedBy: actor.id,
    requesterRole: actor.role,
    status: defaultStatus(draft.type),
    blocker: draft.blocker || "Evidence pending",
    assignedTo: defaultAssignee(draft.type),
    updatedAt: now,
    createdAt: now,
    requiredEvidence: draft.requiredEvidence?.length ? draft.requiredEvidence : defaultEvidence(draft.type),
    timeline: ["Request recorded", `${defaultAssignee(draft.type)} assigned`],
    nextAction: draft.nextAction || defaultNextAction(draft.type),
    roleFit: roleFitForType(draft.type),
    linkedIntakeBatchId: draft.linkedIntakeBatchId,
    linkedPendingWriteId: draft.linkedPendingWriteId
  };
}

export async function createRequestRecord(draft: RequestRecordDraft, actor: { id: string; role: DemoRole }) {
  return saveRequestRecord(buildRequestRecord(draft, actor));
}

export async function createAuditedRequestRecord(draft: RequestRecordDraft, actor: { id: string; role: DemoRole }, auditRole = actor.role) {
  const saved = await createRequestRecord(draft, actor);
  try {
    appendRequiredAuditEvent(requestRecordSavedAuditEvent(saved, auditRole, actor.id));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Audit write failed.";
    throw new Error(`Request record saved but required audit failed; fail closed. requestId=${saved.id}. ${detail}`);
  }
  return saved;
}

export async function createAssetRequestRecord(input: {
  type: RequestRecordType;
  asset?: StockMediaAsset;
  actor: { id: string; role: DemoRole };
  blocker?: string;
  requiredEvidence?: string[];
  nextAction?: string;
  linkedPendingWriteId?: string;
}) {
  const asset = input.asset;
  return createRequestRecord({
    type: input.type,
    relatedAssetId: asset?.id,
    relatedAsset: asset ? displayTitle(asset) : undefined,
    resourceSpaceId: asset ? assetResourceRef(asset) : undefined,
    blocker: input.blocker,
    requiredEvidence: input.requiredEvidence,
    nextAction: input.nextAction,
    linkedPendingWriteId: input.linkedPendingWriteId
  }, input.actor);
}

export async function createAuditedAssetRequestRecord(input: {
  type: RequestRecordType;
  asset?: StockMediaAsset;
  actor: { id: string; role: DemoRole };
  blocker?: string;
  requiredEvidence?: string[];
  nextAction?: string;
  linkedPendingWriteId?: string;
}) {
  const asset = input.asset;
  return createAuditedRequestRecord({
    type: input.type,
    relatedAssetId: asset?.id,
    relatedAsset: asset ? displayTitle(asset) : undefined,
    resourceSpaceId: asset ? assetResourceRef(asset) : undefined,
    blocker: input.blocker,
    requiredEvidence: input.requiredEvidence,
    nextAction: input.nextAction,
    linkedPendingWriteId: input.linkedPendingWriteId
  }, input.actor);
}

export function requestRecordSavedAuditEvent(record: RequestRecord, role: DemoRole, actor: string): RequestRecordAuditEvent {
  return {
    type: "request_recorded",
    role,
    actor,
    assetId: record.relatedAssetId,
    resourceSpaceId: record.resourceSpaceId,
    status: "queued",
    summary: `Request ticket recorded: ${record.type}. Portal request queue is not approval truth.`,
    details: {
      requestId: record.id,
      requestType: record.type,
      storageMode: record.storageMode,
      truthBoundary: requestTruthBoundary,
      approvalTruth: false,
      resourceSpaceWritten: false,
      linkedIntakeBatchId: record.linkedIntakeBatchId || null,
      linkedPendingWriteId: record.linkedPendingWriteId || null
    }
  };
}

export function requestRecordDeniedAuditEvent(type: RequestRecordType, role: DemoRole, actor: string): RequestRecordAuditEvent {
  return {
    type: "request_recorded",
    role,
    actor,
    status: "denied",
    summary: `Request denied: ${type}.`,
    details: { reason: "role-cannot-create-request", requestType: type }
  };
}

export function requestRecordDiagnostics() {
  const records = readLocalJsonStoreSync({
    filePath: requestRecordStorePath,
    maxRecords: maxRequestRecords,
    normalize: normalizeRequestRecord,
    order: newestFirst
  });
  const open = records.filter((record) => record.status !== "Resolved");
  return {
    storageMode: "local-json" as const,
    truthBoundary: requestTruthBoundary,
    approvalTruth: false as const,
    durableStorageConfigured: false,
    count: records.length,
    openCount: open.length,
    blockedCount: open.filter((record) => record.status === "Blocked").length,
    latestAt: records[0]?.updatedAt || "",
    filePath: requestRecordStorePath()
  };
}
