import crypto from "node:crypto";
import path from "node:path";
import { writableRuntimeRoot } from "@/lib/env";
import { newestByTimestamp, safeEnumValue, safeFiniteNumber, safeIsoTimestamp, safeIsoTimestampIdPart } from "@/lib/persisted-record-safety";
import { canReview, normalizeRoleWithFallback } from "@/lib/permissions";
import { normalizeAssetId, normalizePersistedDisplayText, normalizePersistedSlugText, normalizeResourceSpaceRef } from "@/lib/request-validation";
import { appendRuntimeJsonLine, listRuntimeFiles, readRuntimeJsonLines } from "@/lib/runtime-file-store";
import type { DemoRole } from "@/lib/types";

export type AuditEventType =
  | "asset_viewed"
  | "sensitive_asset_viewed"
  | "admin_readiness_denied"
  | "admin_readiness_viewed"
  | "download_gate_checked"
  | "approved_download"
  | "denied_download"
  | "upload_denied"
  | "upload_submitted"
  | "review_denied"
  | "review_evidence_incomplete"
  | "review_pending_write_queued"
  | "collection_draft_denied"
  | "collection_draft_previewed"
  | "saved_search_denied"
  | "saved_search_saved"
  | "saved_search_listed"
  | "package_draft_denied"
  | "package_draft_saved"
  | "package_draft_listed"
  | "batch_action_denied"
  | "batch_action_previewed"
  | "admin_denied"
  | "beta_auth_login"
  | "beta_auth_logout"
  | "beta_feedback_submitted"
  | "beta_feedback_triaged"
  | "beta_feedback_incident_triggered"
  | "resourcespace_write_attempted"
  | "resourcespace_write_succeeded"
  | "resourcespace_write_failed"
  | "request_recorded"
  | "original_access_requested"
  | "original_access_granted"
  | "original_access_denied"
  | "original_access_revoked"
  | "original_access_expired"
  | "rendition_request_recorded"
  | "package_export_blocked"
  | "package_export_approved"
  | "package_share_decision"
  | "duplicate_candidate_reviewed"
  | "taxonomy_change_reviewed"
  | "search_signal_recorded";

export type AuditAccountabilityArea =
  | "asset-access"
  | "download"
  | "review"
  | "resourcespace-sync"
  | "original-access"
  | "rendition"
  | "package"
  | "duplicate"
  | "taxonomy"
  | "search"
  | "request-management"
  | "admin-readiness"
  | "intake"
  | "beta-feedback";

export type AuditStorageReadiness = {
  mode: "local-runtime-jsonl";
  durable: false;
  productionReady: false;
  accountabilityEvidence: true;
  truthBoundary: "portal-accountability-only";
  detail: string;
};

type AuditEventDraft = Omit<AuditEventRecord, "id" | "createdAt" | "actor"> & { actor?: string };

export type AuditEventRecord = {
  id: string;
  type: AuditEventType;
  createdAt: string;
  role: DemoRole;
  actor: string;
  assetId?: string;
  resourceSpaceId?: string;
  packageId?: string;
  status: "allowed" | "denied" | "blocked" | "queued" | "preview";
  summary: string;
  details?: Record<string, string | number | boolean | string[] | null>;
};

const auditEventStatuses: AuditEventRecord["status"][] = ["allowed", "denied", "blocked", "queued", "preview"];
const maxAuditEventsReturned = 1000;
const minAuditReadWindow = 100;
const auditEventTypes: AuditEventType[] = [
  "asset_viewed",
  "sensitive_asset_viewed",
  "admin_readiness_denied",
  "admin_readiness_viewed",
  "download_gate_checked",
  "approved_download",
  "denied_download",
  "upload_denied",
  "upload_submitted",
  "review_denied",
  "review_evidence_incomplete",
  "review_pending_write_queued",
  "collection_draft_denied",
  "collection_draft_previewed",
  "saved_search_denied",
  "saved_search_saved",
  "saved_search_listed",
  "package_draft_denied",
  "package_draft_saved",
  "package_draft_listed",
  "batch_action_denied",
  "batch_action_previewed",
  "admin_denied",
  "beta_auth_login",
  "beta_auth_logout",
  "beta_feedback_submitted",
  "beta_feedback_triaged",
  "beta_feedback_incident_triggered",
  "resourcespace_write_attempted",
  "resourcespace_write_succeeded",
  "resourcespace_write_failed",
  "request_recorded",
  "original_access_requested",
  "original_access_granted",
  "original_access_denied",
  "original_access_revoked",
  "original_access_expired",
  "rendition_request_recorded",
  "package_export_blocked",
  "package_export_approved",
  "package_share_decision",
  "duplicate_candidate_reviewed",
  "taxonomy_change_reviewed",
  "search_signal_recorded"
];

const auditAccountabilityAreas: Record<AuditEventType, AuditAccountabilityArea> = {
  asset_viewed: "asset-access",
  sensitive_asset_viewed: "asset-access",
  admin_readiness_denied: "admin-readiness",
  admin_readiness_viewed: "admin-readiness",
  download_gate_checked: "download",
  approved_download: "download",
  denied_download: "download",
  upload_denied: "intake",
  upload_submitted: "intake",
  review_denied: "review",
  review_evidence_incomplete: "review",
  review_pending_write_queued: "review",
  collection_draft_denied: "package",
  collection_draft_previewed: "package",
  saved_search_denied: "search",
  saved_search_saved: "search",
  saved_search_listed: "search",
  package_draft_denied: "package",
  package_draft_saved: "package",
  package_draft_listed: "package",
  batch_action_denied: "intake",
  batch_action_previewed: "intake",
  admin_denied: "admin-readiness",
  beta_auth_login: "admin-readiness",
  beta_auth_logout: "admin-readiness",
  beta_feedback_submitted: "beta-feedback",
  beta_feedback_triaged: "beta-feedback",
  beta_feedback_incident_triggered: "beta-feedback",
  resourcespace_write_attempted: "resourcespace-sync",
  resourcespace_write_succeeded: "resourcespace-sync",
  resourcespace_write_failed: "resourcespace-sync",
  request_recorded: "request-management",
  original_access_requested: "original-access",
  original_access_granted: "original-access",
  original_access_denied: "original-access",
  original_access_revoked: "original-access",
  original_access_expired: "original-access",
  rendition_request_recorded: "rendition",
  package_export_blocked: "package",
  package_export_approved: "package",
  package_share_decision: "package",
  duplicate_candidate_reviewed: "duplicate",
  taxonomy_change_reviewed: "taxonomy",
  search_signal_recorded: "search"
};

const privateAuditDetailKeyPatterns = [
  "source",
  "master",
  "checksum",
  "sha",
  "signed",
  "url",
  "original",
  "filename",
  "import",
  "batch",
  "private",
  "evidence",
  "note",
  "path",
  "token",
  "secret",
  "credential"
];

const lowTrustAuditDetailKeyPatterns = [
  "resourcespace",
  "resource_space",
  "resource-space",
  "fieldmap",
  "field-map",
  "internal",
  "admin",
  "reviewer"
];

function auditDir() {
  return path.join(writableRuntimeRoot(), ".runtime", "audit-log");
}

function auditFile(createdAt = new Date()) {
  const month = createdAt.toISOString().slice(0, 7);
  return path.join(auditDir(), `${month}.jsonl`);
}

function safeId(value: unknown) {
  return normalizePersistedSlugText(value, 120);
}

function safeAssetId(value: unknown) {
  return normalizeAssetId(value);
}

function safeResourceSpaceId(value: unknown) {
  return normalizeResourceSpaceRef(value);
}

function safeStatus(value: unknown): AuditEventRecord["status"] {
  return safeEnumValue(value, auditEventStatuses, "preview");
}

function safeType(value: unknown): AuditEventType {
  return safeEnumValue(value, auditEventTypes, "admin_denied");
}

function safeDetails(value: unknown): AuditEventRecord["details"] {
  if (!value || Array.isArray(value) || typeof value !== "object") return undefined;
  const entries: Array<[string, string | number | boolean | string[] | null]> = [];
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 24)) {
    const safeKey = safeId(key).slice(0, 80);
    if (!safeKey) continue;
    if (Array.isArray(item)) {
      entries.push([safeKey, item.map((entry) => normalizePersistedDisplayText(entry, 120)).filter(Boolean).slice(0, 24)]);
    } else if (typeof item === "number") {
      entries.push([safeKey, safeFiniteNumber(item)]);
    } else if (typeof item === "boolean" || item === null) {
      entries.push([safeKey, item]);
    } else {
      entries.push([safeKey, normalizePersistedDisplayText(item, 240)]);
    }
  }
  return Object.fromEntries(entries);
}

function isPrivateAuditDetailKey(key: string) {
  const normalized = key.toLowerCase();
  return privateAuditDetailKeyPatterns.some((pattern) => normalized.includes(pattern));
}

function isLowTrustAuditDetailKey(key: string) {
  const normalized = key.toLowerCase();
  return isPrivateAuditDetailKey(normalized) || lowTrustAuditDetailKeyPatterns.some((pattern) => normalized.includes(pattern));
}

function safeAuditSummaryForRole(role: DemoRole, summary: string) {
  if (canReview(role)) return summary;
  return summary
    .replace(/ResourceSpace/gi, "media library")
    .replace(/source[- ]of[- ]truth/gi, "record source")
    .replace(/source path/gi, "source access")
    .replace(/master\/original/gi, "source-file")
    .replace(/master file/gi, "source file")
    .replace(/checksum/gi, "file check");
}

export function auditAccountabilityArea(type: AuditEventType): AuditAccountabilityArea {
  return auditAccountabilityAreas[type];
}

export function auditStorageReadiness(): AuditStorageReadiness {
  return {
    mode: "local-runtime-jsonl",
    durable: false,
    productionReady: false,
    accountabilityEvidence: true,
    truthBoundary: "portal-accountability-only",
    detail: "Portal audit events are local runtime JSONL accountability evidence. They are not ResourceSpace truth and are not production-durable until identity-backed durable storage and restore proof are configured."
  };
}

export function createAuditEventId(createdAt = new Date()) {
  return `${safeIsoTimestampIdPart(createdAt)}-${crypto.randomUUID().slice(0, 8)}`;
}

export function sanitizeAuditDetailsForRole(role: DemoRole, details: AuditEventRecord["details"]): AuditEventRecord["details"] {
  const safe = safeDetails(details);
  if (!safe) return undefined;
  const entries = Object.entries(safe).filter(([key]) => canReview(role) ? !isPrivateAuditDetailKey(key) : !isLowTrustAuditDetailKey(key));
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export function auditEventForRolePayload(role: DemoRole, event: AuditEventRecord): AuditEventRecord {
  const safeRole = normalizeRoleWithFallback(role);
  return {
    ...event,
    resourceSpaceId: canReview(safeRole) ? event.resourceSpaceId : undefined,
    summary: safeAuditSummaryForRole(safeRole, event.summary),
    details: sanitizeAuditDetailsForRole(safeRole, event.details)
  };
}

export function listAuditEventsForRole(role: DemoRole, limit = 20): AuditEventRecord[] {
  return listAuditEvents(limit).map((event) => auditEventForRolePayload(role, event));
}

export function originalAccessAuditEvent(input: {
  type: Extract<AuditEventType, "original_access_requested" | "original_access_granted" | "original_access_denied" | "original_access_revoked" | "original_access_expired">;
  role: DemoRole;
  actor: string;
  assetId: string;
  resourceSpaceId?: string;
  status: AuditEventRecord["status"];
  requestState: string;
  reason: string;
  approver?: string | null;
  expiresAt?: string | null;
}): AuditEventDraft {
  return {
    type: input.type,
    role: input.role,
    actor: input.actor,
    assetId: input.assetId,
    resourceSpaceId: input.resourceSpaceId,
    status: input.status,
    summary: "Original/master access decision recorded; approved-copy delivery remains separate.",
    details: {
      requestState: input.requestState,
      reason: input.reason,
      approver: input.approver || null,
      expiresAt: input.expiresAt || null,
      liveGrantIssued: false
    }
  };
}

export function renditionRequestAuditEvent(input: {
  role: DemoRole;
  actor: string;
  assetId: string;
  resourceSpaceId?: string;
  status: AuditEventRecord["status"];
  renditionKind: string;
  routeBoundary: string;
  reason: string;
}): AuditEventDraft {
  return {
    type: "rendition_request_recorded",
    role: input.role,
    actor: input.actor,
    assetId: input.assetId,
    resourceSpaceId: input.resourceSpaceId,
    status: input.status,
    summary: "Rendition decision recorded; local derivative index is not production durable.",
    details: {
      renditionKind: input.renditionKind,
      routeBoundary: input.routeBoundary,
      reason: input.reason,
      productionDurable: false
    }
  };
}

export function packageDecisionAuditEvent(input: {
  type: Extract<AuditEventType, "package_export_blocked" | "package_export_approved" | "package_share_decision">;
  role: DemoRole;
  actor: string;
  packageId: string;
  status: AuditEventRecord["status"];
  totalRefs: number;
  portalReadyRefs: number;
  blockedRefs: number;
  missingRefs: number;
  reason: string;
  action: string;
}): AuditEventDraft {
  return {
    type: input.type,
    role: input.role,
    actor: input.actor,
    packageId: input.packageId,
    status: input.status,
    summary: "Package decision recorded; collection membership is not permission truth.",
    details: {
      action: input.action,
      totalRefs: input.totalRefs,
      portalReadyRefs: input.portalReadyRefs,
      blockedRefs: input.blockedRefs,
      missingRefs: input.missingRefs,
      reason: input.reason,
      originalMasterIncluded: false,
      approvedCopyGateRequired: true,
      durableShareStorage: false
    }
  };
}

function normalizeAuditEvent(input: unknown): AuditEventRecord | null {
  const raw = (input || {}) as Partial<AuditEventRecord>;
  const id = safeId(raw.id);
  if (!id) return null;
  const createdAt = safeIsoTimestamp(raw.createdAt) || new Date(0).toISOString();
  return {
    id,
    type: safeType(raw.type),
    createdAt,
    role: normalizeRoleWithFallback(raw.role),
    actor: normalizePersistedDisplayText(raw.actor, 160) || "local-beta:unknown",
    assetId: raw.assetId === undefined ? undefined : safeAssetId(raw.assetId),
    resourceSpaceId: raw.resourceSpaceId === undefined ? undefined : safeResourceSpaceId(raw.resourceSpaceId),
    packageId: raw.packageId === undefined ? undefined : safeId(raw.packageId),
    status: safeStatus(raw.status),
    summary: normalizePersistedDisplayText(raw.summary, 240) || "Audit event",
    details: safeDetails(raw.details)
  };
}

function auditEventDraft(event: AuditEventDraft, createdAt: Date, id = createAuditEventId(createdAt)): AuditEventRecord {
  return {
    id,
    createdAt: createdAt.toISOString(),
    actor: event.actor || event.role,
    ...event
  };
}

export function appendAuditEvent(event: AuditEventDraft) {
  const createdAt = new Date();
  const draft: AuditEventRecord = {
    ...auditEventDraft(event, createdAt)
  };
  const record = normalizeAuditEvent(draft) || draft;
  try {
    appendRuntimeJsonLine(auditFile(createdAt), record);
  } catch {
    // Audit logging must not break safe read/deny/write route behavior in local runtime.
  }
  return record;
}

export function appendRequiredAuditEvent(event: AuditEventDraft) {
  return appendRequiredAuditEventWithId(createAuditEventId(), event);
}

export function appendRequiredAuditEventWithId(id: string, event: AuditEventDraft) {
  const createdAt = new Date();
  const draft: AuditEventRecord = {
    ...auditEventDraft(event, createdAt, id)
  };
  const record = normalizeAuditEvent(draft);
  if (!record) throw new Error("Audit event normalization failed.");
  appendRuntimeJsonLine(auditFile(createdAt), record);
  return record;
}

export function listAuditEvents(limit = 20): AuditEventRecord[] {
  const safeLimit = Math.max(1, Math.min(maxAuditEventsReturned, Math.trunc(limit) || 20));
  const readWindow = Math.max(minAuditReadWindow, Math.min(maxAuditEventsReturned, safeLimit * 2));
  const events = listRuntimeFiles(auditDir(), ".jsonl")
    .sort()
    .reverse()
    .flatMap((filePath) => readRuntimeJsonLines(filePath, normalizeAuditEvent, { maxLinesFromEnd: readWindow }));
  return newestByTimestamp(events, (event) => event.createdAt)
    .slice(0, safeLimit);
}

export function auditLogDiagnostics() {
  const events = listAuditEvents(200);
  const storage = auditStorageReadiness();
  const latest = events[0];
  const denied = events.filter((event) => event.status === "denied" || event.status === "blocked").length;
  const queued = events.filter((event) => event.status === "queued").length;
  return {
    count: events.length,
    latestAt: latest?.createdAt,
    denied,
    queued,
    storage,
    coverage: Object.entries(auditAccountabilityAreas).map(([type, area]) => ({ type: type as AuditEventType, area })),
    recent: events.slice(0, 25).map((event) => ({
      id: event.id,
      type: event.type,
      area: auditAccountabilityArea(event.type),
      createdAt: event.createdAt,
      role: event.role,
      actor: event.actor,
      status: event.status,
      assetId: event.assetId,
      resourceSpaceId: event.resourceSpaceId,
      packageId: event.packageId,
      summary: event.summary
    }))
  };
}
