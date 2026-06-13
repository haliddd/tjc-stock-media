import path from "node:path";
import { hasVercelBlobConfig, hasVercelKvConfig, repoRoot } from "@/lib/env";
import { readLocalJsonStore, readLocalJsonStoreSync, writeLocalJsonStore } from "@/lib/local-json-store";
import { newestByTimestamp, safeCompactText, safeEnumValue, safeFileNameText, safeIsoTimestamp } from "@/lib/persisted-record-safety";
import { isKnownRole, normalizeRoleFilter, normalizeRoleWithFallback } from "@/lib/permissions";
import { isSafeHttpUrl } from "@/lib/private-source-text";
import { normalizeFeedbackId, normalizePersistedDisplayText, normalizeSafeRoutePath, readFormData, readJsonObject } from "@/lib/request-validation";
import type { AuditEventRecord } from "@/lib/audit-log";
import type { BetaFeedbackRecord, BetaFeedbackSeverity, BetaFeedbackStatus, DemoRole } from "@/lib/types";

const feedbackIndexKey = "tjc-stock-media:beta-feedback:index";
const feedbackRecordPrefix = "tjc-stock-media:beta-feedback:record:";
const localFeedbackPath = () => path.join(repoRoot(), "data", "runtime", "beta-feedback.json");
const localFileFeedbackEnabled = () => process.env.VERCEL !== "1";
export const maxBetaFeedbackRecords = 500;

export const betaFeedbackSeverities: BetaFeedbackSeverity[] = ["low", "medium", "high", "critical"];
export const betaFeedbackStatuses: BetaFeedbackStatus[] = ["new", "triaged", "agent-ready", "fixed", "wont-fix"];
export const betaFeedbackSeverityFilters = [...betaFeedbackSeverities, "all"] as const;
export const betaFeedbackStatusFilters = [...betaFeedbackStatuses, "all"] as const;

type FeedbackPatch = Partial<Pick<BetaFeedbackRecord, "severity" | "status" | "notes">>;
type FeedbackGlobal = typeof globalThis & { __tjcStockMediaBetaFeedback?: BetaFeedbackRecord[] };
type BetaFeedbackPatchBody = {
  status?: unknown;
  severity?: unknown;
  notes?: unknown;
};
type BetaFeedbackAuditEvent = Omit<AuditEventRecord, "id" | "createdAt" | "actor"> & { actor?: string };
type BetaFeedbackRouteError = {
  body: {
    error: string;
    missing?: string[];
  };
  status: 400 | 403 | 503;
};
type BetaFeedbackAdminArea = "inbox" | "update" | "export";
export type BetaFeedbackExportFilters = {
  status?: BetaFeedbackStatus | "all";
  severity?: BetaFeedbackSeverity | "all";
  role?: DemoRole | "all";
  route?: string;
};
export type BetaFeedbackPatchInput = {
  patch: FeedbackPatch;
  invalidField?: "status" | "severity";
};
export type BetaFeedbackInput = {
  role?: unknown;
  route?: unknown;
  task?: unknown;
  severity?: unknown;
  expected?: unknown;
  actual?: unknown;
  reporterName?: unknown;
  browser?: unknown;
  device?: unknown;
  viewport?: unknown;
  screenshotLink?: unknown;
};
export type BetaFeedbackRequestInput = {
  fields: BetaFeedbackInput;
  file: File | null;
};
export type NormalizedBetaFeedbackSubmission = {
  rawRole: string;
  route: string;
  task: string;
  severity: string;
  expected: string;
  actual: string;
  reporterName?: string;
  browser?: string;
  device?: string;
  viewport?: string;
  screenshotUrl?: string;
};

function memoryFeedback() {
  const store = globalThis as FeedbackGlobal;
  store.__tjcStockMediaBetaFeedback ||= [];
  return store.__tjcStockMediaBetaFeedback;
}

function safeText(value: unknown, maxLength: number) {
  return safeCompactText(value, maxLength);
}

function safeId(value: unknown) {
  return normalizeFeedbackId(value);
}

export function normalizeFeedbackSeverity(value: unknown, fallback: BetaFeedbackSeverity = "medium"): BetaFeedbackSeverity {
  return safeEnumValue(value, betaFeedbackSeverities, fallback);
}

export function normalizeFeedbackStatus(value: unknown, fallback: BetaFeedbackStatus = "new"): BetaFeedbackStatus {
  return safeEnumValue(value, betaFeedbackStatuses, fallback);
}

export function normalizeFeedbackSeverityFilter(value: unknown): BetaFeedbackSeverity | "all" {
  return safeEnumValue(value, betaFeedbackSeverityFilters, "all");
}

export function normalizeFeedbackStatusFilter(value: unknown): BetaFeedbackStatus | "all" {
  return safeEnumValue(value, betaFeedbackStatusFilters, "all");
}

function safeStorageMode(value: unknown): BetaFeedbackRecord["storageMode"] {
  return safeEnumValue(value, ["vercel-kv", "local-json"], "local-json");
}

function safeRoute(value: unknown) {
  return normalizeSafeRoutePath(value, "/");
}

function safeUrl(value: unknown) {
  const url = safeText(value, 500);
  return isSafeHttpUrl(url) ? url : "";
}

function feedbackKey(id: string) {
  return `${feedbackRecordPrefix}${id}`;
}

function newestFirst(records: BetaFeedbackRecord[]) {
  return newestByTimestamp(records, (record) => record.createdAt);
}

function newestFeedbackWindow(records: BetaFeedbackRecord[]) {
  return newestFirst(records).slice(0, maxBetaFeedbackRecords);
}

function normalizeStoredFeedback(input: unknown): BetaFeedbackRecord | null {
  const raw = (input || {}) as Partial<BetaFeedbackRecord>;
  const id = safeId(raw.id);
  if (!id) return null;
  const createdAt = safeIsoTimestamp(raw.createdAt) || safeIsoTimestamp(raw.updatedAt) || new Date(0).toISOString();
  return {
    id,
    createdAt,
    updatedAt: safeIsoTimestamp(raw.updatedAt) || createdAt,
    role: normalizeRoleWithFallback(raw.role),
    route: safeRoute(raw.route),
    task: normalizePersistedDisplayText(raw.task, 220) || "Free play",
    severity: normalizeFeedbackSeverity(raw.severity),
    expected: normalizePersistedDisplayText(raw.expected, 1200),
    actual: normalizePersistedDisplayText(raw.actual, 1200),
    status: normalizeFeedbackStatus(raw.status),
    notes: raw.notes === undefined ? undefined : normalizePersistedDisplayText(raw.notes, 1200),
    reporterName: raw.reporterName === undefined ? undefined : normalizePersistedDisplayText(raw.reporterName, 120),
    browser: raw.browser === undefined ? undefined : normalizePersistedDisplayText(raw.browser, 280),
    device: raw.device === undefined ? undefined : normalizePersistedDisplayText(raw.device, 180),
    viewport: raw.viewport === undefined ? undefined : normalizePersistedDisplayText(raw.viewport, 60),
    attachmentUrl: raw.attachmentUrl === undefined ? undefined : safeUrl(raw.attachmentUrl),
    storageMode: safeStorageMode(raw.storageMode),
    actor: raw.actor === undefined ? undefined : normalizePersistedDisplayText(raw.actor, 160)
  };
}

async function readLocalFeedback() {
  return readLocalJsonStore({
    filePath: localFeedbackPath,
    maxRecords: maxBetaFeedbackRecords,
    normalize: normalizeStoredFeedback,
    order: newestFirst,
    memoryStore: memoryFeedback,
    localFileEnabled: localFileFeedbackEnabled
  });
}

async function writeLocalFeedback(records: BetaFeedbackRecord[]) {
  await writeLocalJsonStore(records, {
    filePath: localFeedbackPath,
    maxRecords: maxBetaFeedbackRecords,
    normalize: normalizeStoredFeedback,
    order: newestFirst,
    memoryStore: memoryFeedback,
    localFileEnabled: localFileFeedbackEnabled
  });
}

async function getKvClient() {
  if (!hasVercelKvConfig()) return null;
  const { kv } = await import("@vercel/kv");
  return kv;
}

async function readKvFeedback() {
  const kv = await getKvClient();
  if (!kv) return null;
  const ids = await kv.get<string[]>(feedbackIndexKey).catch(() => null);
  if (!ids?.length) return [];
  const records = await Promise.all(ids.map((id) => kv.get<BetaFeedbackRecord>(feedbackKey(id)).catch(() => null)));
  return newestFirst(records.map(normalizeStoredFeedback).filter(Boolean) as BetaFeedbackRecord[]);
}

async function writeKvFeedback(record: BetaFeedbackRecord) {
  const kv = await getKvClient();
  if (!kv) return false;
  const ids = await kv.get<string[]>(feedbackIndexKey).catch(() => null);
  const nextIds = [record.id, ...(ids || []).filter((id) => id !== record.id)].slice(0, maxBetaFeedbackRecords);
  await Promise.all([
    kv.set(feedbackKey(record.id), record),
    kv.set(feedbackIndexKey, nextIds)
  ]);
  return true;
}

export async function putBetaFeedbackAttachment(id: string, file: File | null) {
  if (!file || !file.size || !hasVercelBlobConfig()) return "";
  const { put } = await import("@vercel/blob");
  const safeName = safeFileNameText(file.name, 120) || "attachment";
  const blob = await put(`beta-feedback/${id}/${safeName}`, file, {
    access: "public",
    addRandomSuffix: true
  });
  return blob.url;
}

export async function readBetaFeedbackRequestInput(request: { headers: Headers; json(): Promise<unknown>; formData(): Promise<FormData> }): Promise<BetaFeedbackRequestInput> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return { fields: await readJsonObject<BetaFeedbackInput>(request), file: null };
  }
  const form = await readFormData(request);
  const fileValue = form.get("attachment");
  return {
    fields: Object.fromEntries(form.entries()) as BetaFeedbackInput,
    file: fileValue instanceof File && fileValue.size > 0 ? fileValue : null
  };
}

export function normalizeBetaFeedbackSubmission(fields: BetaFeedbackInput, userAgent?: string | null): NormalizedBetaFeedbackSubmission {
  return {
    rawRole: normalizeFeedbackText(fields.role, 80),
    route: normalizeFeedbackRoute(fields.route),
    task: normalizeFeedbackText(fields.task, 220) || "Free play",
    severity: normalizeFeedbackText(fields.severity, 20),
    expected: normalizeFeedbackText(fields.expected, 1200),
    actual: normalizeFeedbackText(fields.actual, 1200),
    reporterName: normalizeFeedbackText(fields.reporterName, 120) || undefined,
    browser: normalizeFeedbackText(fields.browser, 280) || userAgent || undefined,
    device: normalizeFeedbackText(fields.device, 180) || undefined,
    viewport: normalizeFeedbackText(fields.viewport, 60) || undefined,
    screenshotUrl: normalizeFeedbackUrl(fields.screenshotLink) || undefined
  };
}

export async function readBetaFeedbackPatchInput(request: { json(): Promise<unknown> }): Promise<BetaFeedbackPatchInput> {
  const body = await readJsonObject<BetaFeedbackPatchBody>(request);
  const status = normalizeFeedbackText(body.status, 40);
  const severity = normalizeFeedbackText(body.severity, 40);
  const normalizedStatus = status ? normalizeFeedbackStatus(status) : "";
  const normalizedSeverity = severity ? normalizeFeedbackSeverity(severity) : "";
  if (status && normalizedStatus !== status) return { patch: {}, invalidField: "status" };
  if (severity && normalizedSeverity !== severity) return { patch: {}, invalidField: "severity" };
  return {
    patch: {
      status: normalizedStatus ? normalizedStatus as BetaFeedbackStatus : undefined,
      severity: normalizedSeverity ? normalizedSeverity as BetaFeedbackSeverity : undefined,
      notes: body.notes === undefined ? undefined : normalizePersistedDisplayText(body.notes, 1200)
    }
  };
}

export function betaFeedbackDiagnostics() {
  const kvConfigured = hasVercelKvConfig();
  const blobConfigured = hasVercelBlobConfig();
  const records = readLocalJsonStoreSync({
    filePath: localFeedbackPath,
    maxRecords: maxBetaFeedbackRecords,
    normalize: normalizeStoredFeedback,
    order: newestFirst,
    memoryStore: memoryFeedback,
    localFileEnabled: localFileFeedbackEnabled
  });
  const storageModes = Array.from(new Set(records.map((record) => record.storageMode))).sort();
  const openRecords = records.filter((record) => !["fixed", "wont-fix"].includes(record.status));
  const criticalOpen = openRecords.filter((record) => record.severity === "critical");
  return {
    kvConfigured,
    blobConfigured,
    hostedRuntime: process.env.VERCEL === "1",
    durableStorageConfigured: kvConfigured,
    attachmentStorageConfigured: blobConfigured,
    count: records.length,
    openCount: openRecords.length,
    criticalOpenCount: criticalOpen.length,
    latestAt: records[0]?.createdAt || "",
    storageModes,
    primaryStorageMode: kvConfigured ? "vercel-kv" as const : "local-json" as const
  };
}

export function validateFeedbackPayload(payload: {
  role: DemoRole;
  route: string;
  severity: string;
  expected: string;
  actual: string;
}) {
  const errors = [
    !payload.role && "role",
    !payload.route && "route",
    normalizeFeedbackSeverity(payload.severity) !== payload.severity && "severity",
    !payload.expected && "expected",
    !payload.actual && "actual"
  ].filter((item): item is string => Boolean(item));
  return errors;
}

export function betaFeedbackDisabledError(): BetaFeedbackRouteError {
  return { body: { error: "Beta feedback capture is disabled." }, status: 503 };
}

export function betaFeedbackStorageUnavailableError(): BetaFeedbackRouteError | null {
  if (process.env.VERCEL !== "1" || hasVercelKvConfig()) return null;
  return {
    body: {
      error: "Beta feedback durable storage is not configured.",
      missing: ["KV_REST_API_URL", "KV_REST_API_TOKEN"]
    },
    status: 503
  };
}

function betaFeedbackAdminDeniedCopy(area: BetaFeedbackAdminArea) {
  return {
    inbox: {
      error: "Beta feedback inbox requires DAM Admin role.",
      summary: "Beta feedback inbox access denied for non-admin role."
    },
    update: {
      error: "Beta feedback updates require DAM Admin role.",
      summary: "Beta feedback update denied for non-admin role."
    },
    export: {
      error: "Beta feedback export requires DAM Admin role.",
      summary: "Beta feedback export denied for non-admin role."
    }
  }[area];
}

export function betaFeedbackAdminDeniedError(area: BetaFeedbackAdminArea): BetaFeedbackRouteError {
  return { body: { error: betaFeedbackAdminDeniedCopy(area).error }, status: 403 };
}

export function betaFeedbackAdminDeniedAuditEvent(area: BetaFeedbackAdminArea, role: DemoRole, actor: string): BetaFeedbackAuditEvent {
  return {
    type: "admin_denied",
    role,
    actor,
    status: "denied",
    summary: betaFeedbackAdminDeniedCopy(area).summary,
    details: { reason: "role-cannot-admin" }
  };
}

export function betaFeedbackSubmissionValidationError(submission: NormalizedBetaFeedbackSubmission): BetaFeedbackRouteError | null {
  if (!isKnownRole(submission.rawRole)) {
    return { body: { error: "Feedback role is invalid.", missing: ["role"] }, status: 400 };
  }
  const role = normalizeRoleWithFallback(submission.rawRole);
  const missing = validateFeedbackPayload({ role, route: submission.route, severity: submission.severity, expected: submission.expected, actual: submission.actual });
  return missing.length ? { body: { error: "Feedback is missing required fields.", missing }, status: 400 } : null;
}

export function betaFeedbackPatchValidationError(input: BetaFeedbackPatchInput): BetaFeedbackRouteError | null {
  if (input.invalidField === "status") {
    return { body: { error: "Feedback status is invalid." }, status: 400 };
  }
  if (input.invalidField === "severity") {
    return { body: { error: "Feedback severity is invalid." }, status: 400 };
  }
  return null;
}

export async function createBetaFeedback(input: Omit<BetaFeedbackRecord, "id" | "createdAt" | "updatedAt" | "status" | "storageMode"> & { id?: string }) {
  const id = input.id || crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const kvAvailable = Boolean(await getKvClient());
  const record: BetaFeedbackRecord = {
    ...input,
    id,
    createdAt,
    updatedAt: createdAt,
    status: "new",
    storageMode: kvAvailable ? "vercel-kv" : "local-json"
  };
  const wroteKv = kvAvailable ? await writeKvFeedback(record).catch(() => false) : false;
  if (!wroteKv) {
    record.storageMode = "local-json";
    const records = await readLocalFeedback();
    await writeLocalFeedback([record, ...records.filter((item) => item.id !== record.id)]);
  }
  return record;
}

export async function createBetaFeedbackFromSubmission(submission: NormalizedBetaFeedbackSubmission, identity: { id: string; role: DemoRole }, file: File | null) {
  const id = crypto.randomUUID();
  const attachmentUrl = await putBetaFeedbackAttachment(id, file).catch(() => "");
  return createBetaFeedback({
    id,
    role: identity.role,
    route: submission.route,
    task: submission.task,
    severity: normalizeFeedbackSeverity(submission.severity),
    expected: submission.expected,
    actual: submission.actual,
    reporterName: submission.reporterName,
    browser: submission.browser,
    device: submission.device,
    viewport: submission.viewport,
    attachmentUrl: attachmentUrl || submission.screenshotUrl,
    actor: identity.id
  });
}

export async function listBetaFeedback() {
  const kvRecords = await readKvFeedback().catch(() => null);
  if (kvRecords) return kvRecords;
  return newestFeedbackWindow(await readLocalFeedback());
}

export function filterBetaFeedback(records: BetaFeedbackRecord[], filters: BetaFeedbackExportFilters) {
  const route = safeText(filters.route || "all", 240);
  return newestFirst(records).filter((record) => (
    (!filters.status || filters.status === "all" || record.status === filters.status)
    && (!filters.severity || filters.severity === "all" || record.severity === filters.severity)
    && (!filters.role || filters.role === "all" || record.role === filters.role)
    && (!route || route === "all" || record.route.startsWith(route))
  ));
}

export function readBetaFeedbackExportFilters(search: Pick<URLSearchParams, "get">): Required<BetaFeedbackExportFilters> {
  return {
    status: normalizeFeedbackStatusFilter(normalizeFeedbackText(search.get("status"), 40)),
    severity: normalizeFeedbackSeverityFilter(normalizeFeedbackText(search.get("severity"), 40)),
    role: normalizeRoleFilter(normalizeFeedbackText(search.get("feedbackRole"), 80)),
    route: normalizeFeedbackText(search.get("route"), 240) || "all"
  };
}

export function buildBetaFeedbackExport(records: BetaFeedbackRecord[], filters: BetaFeedbackExportFilters) {
  const exportedAt = new Date().toISOString();
  const filtered = filterBetaFeedback(records, filters);
  return {
    schema: "tjc-beta-feedback-export.v1",
    exportedAt,
    filters: {
      status: filters.status || "all",
      severity: filters.severity || "all",
      role: filters.role || "all",
      route: filters.route || "all"
    },
    counts: {
      totalRecords: records.length,
      exportedRecords: filtered.length,
      critical: filtered.filter((record) => record.severity === "critical").length,
      high: filtered.filter((record) => record.severity === "high").length,
      agentReady: filtered.filter((record) => record.status === "agent-ready").length,
      open: filtered.filter((record) => !["fixed", "wont-fix"].includes(record.status)).length
    },
    records: filtered
  };
}

export function buildBetaFeedbackInboxResponse(feedback: BetaFeedbackRecord[]) {
  return { feedback, count: feedback.length };
}

export function buildBetaFeedbackSubmitResponse(record: BetaFeedbackRecord) {
  return { ok: true, id: record.id, createdAt: record.createdAt };
}

export function buildBetaFeedbackPatchResponse(record: BetaFeedbackRecord) {
  return { ok: true, feedback: record };
}

export function betaFeedbackSubmittedAuditEvent(record: BetaFeedbackRecord, role: DemoRole, actor: string): BetaFeedbackAuditEvent {
  return {
    type: "beta_feedback_submitted",
    role,
    actor,
    status: "preview",
    summary: `Beta feedback submitted for ${record.route}.`,
    details: { feedbackId: record.id, task: record.task, severity: record.severity, storageMode: record.storageMode }
  };
}

export function betaFeedbackTriagedAuditEvent(record: BetaFeedbackRecord, role: DemoRole, actor: string): BetaFeedbackAuditEvent {
  return {
    type: "beta_feedback_triaged",
    role,
    actor,
    status: "preview",
    summary: `Beta feedback ${record.id} updated to ${record.status}.`,
    details: { feedbackId: record.id, severity: record.severity, status: record.status }
  };
}

export function betaFeedbackExportAuditEvent(packet: ReturnType<typeof buildBetaFeedbackExport>, role: DemoRole, actor: string): BetaFeedbackAuditEvent {
  return {
    type: "beta_feedback_triaged",
    role,
    actor,
    status: "preview",
    summary: "Beta feedback export packet generated.",
    details: {
      exportedRecords: packet.counts.exportedRecords,
      statusFilter: packet.filters.status,
      severityFilter: packet.filters.severity,
      roleFilter: packet.filters.role,
      routeFilter: packet.filters.route
    }
  };
}

export function betaFeedbackExportHeaders(packet: ReturnType<typeof buildBetaFeedbackExport>) {
  return {
    "Content-Disposition": `attachment; filename="tjc-beta-feedback-${packet.exportedAt.slice(0, 10)}.json"`
  };
}

export async function patchBetaFeedback(id: string, patch: FeedbackPatch) {
  const cleanId = safeId(id);
  if (!cleanId) return null;
  const records = await listBetaFeedback();
  const existing = records.find((record) => record.id === cleanId);
  if (!existing) return null;
  const next: BetaFeedbackRecord = {
    ...existing,
    severity: patch.severity ? normalizeFeedbackSeverity(patch.severity, existing.severity) : existing.severity,
    status: patch.status ? normalizeFeedbackStatus(patch.status, existing.status) : existing.status,
    notes: patch.notes === undefined ? existing.notes : normalizePersistedDisplayText(patch.notes, 1200),
    updatedAt: new Date().toISOString()
  };
  const wroteKv = await writeKvFeedback(next).catch(() => false);
  if (!wroteKv) {
    const localRecords = await readLocalFeedback();
    await writeLocalFeedback([{ ...next, storageMode: "local-json" }, ...localRecords.filter((record) => record.id !== cleanId)]);
  }
  return wroteKv ? next : { ...next, storageMode: "local-json" as const };
}

export function normalizeFeedbackText(value: unknown, maxLength = 1200) {
  return normalizePersistedDisplayText(value, maxLength);
}

export function normalizeFeedbackRoute(value: unknown) {
  return safeRoute(value);
}

export function normalizeFeedbackUrl(value: unknown) {
  return safeUrl(value);
}
