import path from "node:path";
import { writableRuntimeRoot } from "@/lib/env";
import { readLocalJsonStore, readLocalJsonStoreSync, writeLocalJsonStore } from "@/lib/local-json-store";
import { newestByTimestamp, safeBoolean, safeEnumValue, safeIsoTimestamp, safeIsoTimestampIdPart, safeNonNegativeInt } from "@/lib/persisted-record-safety";
import { canReview, normalizeContributingRoleWithFallback } from "@/lib/permissions";
import { normalizePackageRef } from "@/lib/package-refs";
import { normalizePersistedDisplayText, normalizePersistedSlugText, readJsonObject } from "@/lib/request-validation";
import type { AuditEventRecord } from "@/lib/audit-log";
import type { PackageGovernancePacket } from "@/lib/package-governance";
import type { DamPackage, DemoRole } from "@/lib/types";

export type StoredPackageDraft = {
  id: string;
  title: string;
  status: DamPackage["status"];
  sections: DamPackage["sections"];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  role: DemoRole;
  governance: {
    chosenUse: string;
    canPreview: boolean;
    canShare: boolean;
    canPublish: boolean;
    canDownloadPackage: boolean;
    totalRefs: number;
    portalReadyRefs: number;
    blockedRefs: number;
    missingRefs: number;
    reason: string;
  };
  storageMode: "local-json";
};

const packageStorePath = () => path.join(writableRuntimeRoot(), "data", "runtime", "package-drafts.json");
export const maxPackageDrafts = 200;
const packageStatuses: DamPackage["status"][] = ["draft", "pending-review", "approved", "archived"];
type PackageDraftAuditEvent = Omit<AuditEventRecord, "id" | "createdAt" | "actor"> & { actor?: string };
type PackageDraftRouteError = {
  body: {
    error: string;
  };
  status: 403;
};

function newestFirst(records: StoredPackageDraft[]) {
  return newestByTimestamp(records, (record) => record.updatedAt);
}

function safeIdentifierText(value: unknown, maxLength: number) {
  return normalizePersistedSlugText(value, maxLength, { rejectUnsafePath: true });
}

export function sanitizePackageDraft(input: unknown): DamPackage {
  const raw = (input || {}) as Partial<DamPackage>;
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  const seenRefs = new Set<string>();
  return {
    id: safeIdentifierText(raw.id, 120) || "portal-local-draft",
    title: normalizePersistedDisplayText(raw.title, 160) || "ResourceSpace Toolkit Draft",
    description: normalizePersistedDisplayText(raw.description, 500) || undefined,
    status: safeEnumValue(raw.status, packageStatuses, "draft"),
    collectionId: raw.collectionId ? normalizePackageRef(raw.collectionId) || undefined : undefined,
    sections: sections.slice(0, 12).map((section, index) => ({
      id: safeIdentifierText(section?.id, 80) || `section-${index + 1}`,
      title: normalizePersistedDisplayText(section?.title, 120) || `Section ${index + 1}`,
      resourceSpaceAssetIds: Array.isArray(section?.resourceSpaceAssetIds)
        ? section.resourceSpaceAssetIds
            .map((ref) => normalizePackageRef(ref))
            .filter((ref) => {
              if (!ref || seenRefs.has(ref)) return false;
              seenRefs.add(ref);
              return true;
            })
            .slice(0, 80)
        : []
    })),
    updatedAt: new Date().toISOString()
  };
}

export async function readPackageDraftInput(request: { json(): Promise<unknown> }) {
  const body = await readJsonObject(request);
  return sanitizePackageDraft((body as { draft?: unknown }).draft || body);
}

function normalizeStoredPackageDraft(input: unknown): StoredPackageDraft | null {
  const raw = (input || {}) as Partial<StoredPackageDraft>;
  const draft = sanitizePackageDraft(raw);
  if (!draft.id) return null;
  const updatedAt = safeIsoTimestamp(raw.updatedAt) || safeIsoTimestamp(raw.createdAt) || new Date(0).toISOString();
  const governance = (raw.governance || {}) as Partial<StoredPackageDraft["governance"]>;
  return {
    id: draft.id,
    title: draft.title,
    status: draft.status,
    sections: draft.sections,
    createdAt: safeIsoTimestamp(raw.createdAt) || updatedAt,
    updatedAt,
    createdBy: normalizePersistedDisplayText(raw.createdBy, 120) || "local-beta:unknown",
    role: normalizeContributingRoleWithFallback(raw.role, "Contributor"),
    governance: {
      chosenUse: normalizePersistedDisplayText(governance.chosenUse, 40) || "public-web",
      canPreview: safeBoolean(governance.canPreview),
      canShare: safeBoolean(governance.canShare),
      canPublish: safeBoolean(governance.canPublish),
      canDownloadPackage: safeBoolean(governance.canDownloadPackage),
      totalRefs: safeNonNegativeInt(governance.totalRefs),
      portalReadyRefs: safeNonNegativeInt(governance.portalReadyRefs),
      blockedRefs: safeNonNegativeInt(governance.blockedRefs),
      missingRefs: safeNonNegativeInt(governance.missingRefs),
      reason: normalizePersistedDisplayText(governance.reason, 240)
    },
    storageMode: "local-json"
  };
}

async function readLocalPackages() {
  return readLocalJsonStore({
    filePath: packageStorePath,
    maxRecords: maxPackageDrafts,
    normalize: normalizeStoredPackageDraft,
    order: newestFirst
  });
}

async function writeLocalPackages(records: StoredPackageDraft[]) {
  await writeLocalJsonStore(records, {
    filePath: packageStorePath,
    maxRecords: maxPackageDrafts,
    normalize: normalizeStoredPackageDraft,
    order: newestFirst
  });
}

export async function listStoredPackageDrafts() {
  return newestFirst(await readLocalPackages()).slice(0, maxPackageDrafts);
}

function creatorLabel(role: DemoRole) {
  return role === "DAM Admin" ? "DAM Admin" : role === "Reviewer" ? "Reviewer" : "Contributor";
}

export function packageDraftForRolePayload(role: DemoRole, record: StoredPackageDraft): StoredPackageDraft {
  if (canReview(role)) return record;
  return {
    ...record,
    createdBy: creatorLabel(record.role)
  };
}

export function packageDraftListDeniedError(): PackageDraftRouteError {
  return { body: { error: "Package draft list requires Reviewer or DAM Admin role." }, status: 403 };
}

export function packageDraftSaveDeniedError(): PackageDraftRouteError {
  return { body: { error: "Package draft save requires Contributor, Reviewer, or DAM Admin role." }, status: 403 };
}

export function buildPackageDraftListResponse(packages: StoredPackageDraft[]) {
  return { packages, count: packages.length, storageMode: "local-json" as const };
}

export function buildPackageDraftSaveResponse(
  role: DemoRole,
  record: StoredPackageDraft,
  governance: PackageGovernancePacket
) {
  return { ok: true, package: packageDraftForRolePayload(role, record), governance, storageMode: record.storageMode };
}

export function packageDraftListDeniedAuditEvent(role: DemoRole, actor: string): PackageDraftAuditEvent {
  return {
    type: "package_draft_denied",
    role,
    actor,
    status: "denied",
    summary: "Package draft list denied for non-review role.",
    details: { reason: "role-cannot-list-packages" }
  };
}

export function packageDraftSaveDeniedAuditEvent(role: DemoRole, actor: string): PackageDraftAuditEvent {
  return {
    type: "package_draft_denied",
    role,
    actor,
    status: "denied",
    summary: "Package draft save denied for Viewer role.",
    details: { reason: "role-cannot-save-package" }
  };
}

export function packageDraftListViewedAuditEvent(
  packages: StoredPackageDraft[],
  role: DemoRole,
  actor: string
): PackageDraftAuditEvent {
  return {
    type: "package_draft_listed",
    role,
    actor,
    status: "preview",
    summary: "Package draft list viewed.",
    details: { count: packages.length }
  };
}

export function packageDraftSavedAuditEvent(
  record: StoredPackageDraft,
  governance: PackageGovernancePacket,
  role: DemoRole,
  actor: string
): PackageDraftAuditEvent {
  return {
    type: "package_draft_saved",
    role,
    actor,
    packageId: record.id,
    status: governance.canPublish ? "queued" : "preview",
    summary: `Package draft saved: ${record.title}.`,
    details: {
      totalRefs: governance.totalRefs,
      portalReadyRefs: governance.portalReadyRefs,
      blockedRefs: governance.blockedRefs,
      storageMode: record.storageMode
    }
  };
}

export async function savePackageDraft(record: Omit<StoredPackageDraft, "storageMode">) {
  const records = await readLocalPackages();
  const next: StoredPackageDraft = { ...record, storageMode: "local-json" };
  await writeLocalPackages([next, ...records.filter((item) => item.id !== next.id)]);
  return next;
}

function storedGovernanceSnapshot(governance: PackageGovernancePacket): StoredPackageDraft["governance"] {
  return {
    chosenUse: governance.chosenUse,
    canPreview: governance.canPreview,
    canShare: governance.canShare,
    canPublish: governance.canPublish,
    canDownloadPackage: governance.canDownloadPackage,
    totalRefs: governance.totalRefs,
    portalReadyRefs: governance.portalReadyRefs,
    blockedRefs: governance.blockedRefs,
    missingRefs: governance.missingRefs,
    reason: governance.reason
  };
}

export async function savePackageDraftSubmission(draft: DamPackage, actor: { id: string; role: DemoRole }, governance: PackageGovernancePacket) {
  const now = new Date().toISOString();
  return savePackageDraft({
    id: draft.id === "portal-local-draft" ? `pkg-${safeIsoTimestampIdPart(now)}` : draft.id,
    title: draft.title,
    status: draft.status,
    sections: draft.sections,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
    role: actor.role,
    governance: storedGovernanceSnapshot(governance)
  });
}

export function packageStorageReadiness() {
  return {
    storageMode: "local-json" as const,
    durableShareStorage: false,
    productionReadySharing: false,
    permissionTruth: false,
    detail: "Package drafts use local JSON readiness records. They are not durable production package/share storage and do not grant permission."
  };
}

export function packageDraftDiagnostics() {
  const filePath = packageStorePath();
  const records = readLocalJsonStoreSync({
    filePath: packageStorePath,
    maxRecords: maxPackageDrafts,
    normalize: normalizeStoredPackageDraft,
    order: newestFirst
  });
  const openDrafts = records.filter((record) => record.status !== "archived");
  const blockedRefs = records.reduce((sum, record) => sum + (record.governance?.blockedRefs || 0), 0);
  return {
    storageMode: "local-json" as const,
    durableStorageConfigured: false,
    productionReadySharing: false,
    count: records.length,
    openCount: openDrafts.length,
    blockedRefs,
    latestAt: records[0]?.updatedAt || "",
    filePath
  };
}
