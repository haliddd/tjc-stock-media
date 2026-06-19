import { normalizeDateField, normalizeDisplayTextField, normalizePublicTextField, normalizeUrlField } from "@/lib/request-validation";
import { fileRequiresAdminIntake, routeUploadIntakeForReview, type IntakeRoutingReason } from "@/lib/intake-routing";
import { nonCanonicalUploadTags, parseUploadTags } from "@/lib/upload-tags";
import { uploadBetaBoundaries, uploadDefaultState } from "@/lib/workflow-policy";
import { persistIntakeBatch } from "@/lib/intake-batch-store";
import {
  buildDuplicateHints,
  buildMediaInventory,
  buildRiskFlags,
  parseIntakeSourceName,
  type DetectedBatchMetadata,
  type DuplicateHint,
  type MediaInventory
} from "@/lib/upload-intake-detection";
import type { PersistIntakeBatchResult } from "@/lib/intake-batch-store";
import type { AuditEventRecord } from "@/lib/audit-log";
import type { DemoRole } from "@/lib/types";

export type UploadIntakePacket = {
  files: File[];
  sourceLink: string;
  title: string;
  eventName: string;
  eventDate: string;
  ministry: string;
  source: string;
  location: string;
  collection: string;
  language: string;
  sourceFolder: string;
  sourceAccount: string;
  importBatch: string;
  checksumManifest: string;
  originalFilenames: string[];
  masterCustodyPathStatus: "planned";
  peopleVisible: string;
  minorsVisible: string;
  usageRights: string;
  approvalSuggestion: string;
  consentRestrictions: string;
  doctrineSacramentSensitive: string;
  testimonyPastoralSensitive: string;
  hymnMusicPresent: string;
  requestedUse: string[];
  suggestedTags: string;
  intakeNotes: string;
  contributorRequired: string[];
  missingRequired: string[];
  invalidTags: string[];
  largeFiles: File[];
  mediaInventory: MediaInventory;
  detected: DetectedBatchMetadata;
  duplicateHints: DuplicateHint[];
  riskFlags: string[];
  reviewerTasks: string[];
  adminTasks: string[];
  systemWarnings: string[];
  reviewWarnings: string[];
  smartRoutingReasons: IntakeRoutingReason[];
};

export type UploadIntakeValidationError = {
  body: {
    error: string;
    missingRequired?: string[];
    invalidTags?: string[];
    guidance?: string;
  };
  status: 400 | 403 | 503;
};

export type SubmitUploadIntakeResult = {
  body: ReturnType<typeof buildUploadIntakeResponse>;
  status: 200 | 503;
};

type UploadIntakeAuditPacket = Pick<UploadIntakePacket, "eventName" | "files" | "sourceLink"> &
  Partial<Pick<UploadIntakePacket, "largeFiles" | "reviewWarnings" | "smartRoutingReasons" | "mediaInventory" | "reviewerTasks" | "adminTasks">>;
type UploadIntakeAuditEvent = Omit<AuditEventRecord, "id" | "createdAt" | "actor"> & { actor?: string };
const MAX_UPLOAD_INTAKE_FILES = 80;

function firstFormValue(form: FormData, names: string[]) {
  for (const name of names) {
    const value = form.get(name);
    if (value !== null && value !== undefined && String(value).trim()) return value;
  }
  return "";
}

function formValues(form: FormData, names: string[]) {
  return names.flatMap((name) => form.getAll(name))
    .map((value) => normalizePublicTextField(value, "", 80))
    .filter(Boolean);
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function task(label: string, active: boolean) {
  return active ? label : "";
}

function detectedWithManualFallback(detected: DetectedBatchMetadata, input: { eventName: string; eventDate: string; ministry: string; source: string; location: string }) {
  const filled = {
    ...detected,
    eventName: input.eventName || detected.eventName,
    eventDate: input.eventDate || detected.eventDate,
    ministry: input.ministry || detected.ministry,
    location: input.location || detected.location,
    photographer: input.source || detected.photographer
  };
  const strong = Number(Boolean(filled.eventName)) + Number(Boolean(filled.eventDate)) + Number(Boolean(filled.photographer));
  return {
    ...filled,
    confidence: strong >= 3 ? filled.confidence === "low" ? "medium" : filled.confidence : filled.confidence,
    confirmationNeeded: [
      !filled.eventName && "event name",
      !filled.eventDate && "date",
      !filled.photographer && "source/uploader"
    ].filter((item): item is string => Boolean(item))
  };
}

export function normalizeUploadIntake(form: FormData): UploadIntakePacket {
  const files = form
    .getAll("files")
    .filter((value): value is File => value instanceof File && Boolean(value.name) && value.size > 0)
    .slice(0, MAX_UPLOAD_INTAKE_FILES + 1);
  const sourceLink = normalizeUrlField(form.get("sourceLink"), "", 500);
  const mediaInventory = buildMediaInventory(files);
  const rawFolderName = normalizeDisplayTextField(firstFormValue(form, ["folderName", "sourceName", "batchSourceName"]), mediaInventory.folderName || "", 180);
  const detectionSeed = rawFolderName || mediaInventory.folderName || normalizeDisplayTextField(firstFormValue(form, ["eventName", "batchName", "title"]), "", 180);
  const parsed = parseIntakeSourceName(detectionSeed);
  const title = normalizeDisplayTextField(firstFormValue(form, ["batchName", "title", "eventName"]), parsed.eventName || "", 160);
  const eventName = normalizeDisplayTextField(firstFormValue(form, ["eventName", "batchName", "title"]), parsed.eventName || title, 160);
  const eventDate = normalizeDateField(firstFormValue(form, ["eventDate", "captureDate"])) || parsed.eventDate || "";
  const ministry = normalizeDisplayTextField(form.get("ministry"), parsed.ministry || "", 120);
  const source = normalizeDisplayTextField(firstFormValue(form, ["source", "photographer", "uploader"]), parsed.photographer || "", 160);
  const location = normalizeDisplayTextField(form.get("location"), parsed.location || "", 160);
  const collection = normalizeDisplayTextField(form.get("collection"), "", 120);
  const language = normalizeDisplayTextField(form.get("language"), "", 80);
  const sourceFolder = normalizeDisplayTextField(form.get("sourceFolder"), rawFolderName || mediaInventory.folderName || "", 240);
  const sourceAccount = normalizeDisplayTextField(form.get("sourceAccount"), source, 160);
  const importBatch = normalizeDisplayTextField(form.get("importBatch"), "", 160);
  const checksumManifest = normalizePublicTextField(form.get("checksumManifest"), "", 600);
  const originalFilenames = files.map((file) => file.name).filter(Boolean);
  const peopleVisible = normalizePublicTextField(form.get("peopleVisible"), "Unknown", 40);
  const minorsVisible = normalizePublicTextField(form.get("minorsVisible"), "Unknown", 40);
  const usageRights = normalizePublicTextField(form.get("usageRights"), "Unknown - reviewer verifies", 80);
  const approvalSuggestion = normalizePublicTextField(form.get("approvalSuggestion"), "Reviewer decides", 80);
  const consentRestrictions = normalizePublicTextField(form.get("notes"), "", 600);
  const doctrineSacramentSensitive = normalizePublicTextField(form.get("doctrineSacramentSensitive"), "", 80);
  const testimonyPastoralSensitive = normalizePublicTextField(form.get("testimonyPastoralSensitive"), "", 80);
  const hymnMusicPresent = normalizePublicTextField(form.get("hymnMusicPresent"), "", 80);
  const requestedUse = unique(formValues(form, ["requestedUse", "requestedUsageScope"]));
  const suggestedTags = normalizePublicTextField(firstFormValue(form, ["tags", "suggestedTags"]), "", 300);
  const intakeNotes = normalizePublicTextField(firstFormValue(form, ["intakeNotes", "notes"]), "", 600);
  const detected = detectedWithManualFallback(parsed, { eventName, eventDate, ministry, source, location });
  const invalidTags = nonCanonicalUploadTags(suggestedTags);
  const duplicateHints = buildDuplicateHints(files);
  const riskFlags = buildRiskFlags({
    folderName: sourceFolder,
    filenames: originalFilenames,
    notes: intakeNotes,
    tags: suggestedTags,
    eventName,
    ministry
  });
  const smartRoutingReasons = routeUploadIntakeForReview({
    files,
    sourceFolder,
    sourceAccount,
    importBatch,
    checksumManifest,
    originalFilenames,
    suggestedTags,
    intakeNotes,
    eventName,
    ministry,
    peopleVisible,
    minorsVisible,
    usageRights,
    consentRestrictions,
    doctrineSacramentSensitive,
    testimonyPastoralSensitive,
    hymnMusicPresent
  });
  const largeFiles = files.filter(fileRequiresAdminIntake);
  const contributorRequired = [
    !files.length && !sourceLink && "files or source link",
    !eventName && "batch/event name",
    !eventDate && "event date",
    !ministry && "ministry/team",
    !source && "source/photographer"
  ].filter((item): item is string => Boolean(item));
  const reviewerTasks = unique([
    task("Rights reviewer verifies ownership/license before public use", /unknown|needs review|reviewer verifies/i.test(usageRights)),
    task("People visibility reviewer confirmation", peopleVisible === "Unknown"),
    task("Children/youth visibility reviewer confirmation", minorsVisible === "Unknown" || minorsVisible === "Yes"),
    task("Consent/release required before public/external approval if people/youth appear", peopleVisible !== "No" || minorsVisible !== "No"),
    task("Taxonomy reviewer maps or rejects noncanonical suggested tags", invalidTags.length > 0 || parseUploadTags(suggestedTags).length === 0),
    task("Duplicate candidates need reviewer/admin decision", duplicateHints.length > 0),
    ...riskFlags,
    ...smartRoutingReasons.map((reason) => reason.label)
  ]);
  const adminTasks = unique([
    task("Large media/admin intake required", largeFiles.length > 0),
    task("Checksum processing pending", files.length > 0),
    task("Duplicate group processing pending", duplicateHints.length > 0),
    task("Derivative generation after review", files.length > 0 || Boolean(sourceLink)),
    task("Media team handoff pending", true),
    task("Upload does not approve media for use", true)
  ]);
  const systemWarnings = unique([
    ...detected.confirmationNeeded.map((item) => `${item} needs confirmation`),
    task("Video/audio and large files route to admin intake", largeFiles.length > 0)
  ]);
  const reviewWarnings = unique([
    ...systemWarnings,
    ...reviewerTasks,
    ...adminTasks
  ]);

  return {
    files,
    sourceLink,
    title,
    eventName,
    eventDate,
    ministry,
    source,
    location,
    collection,
    language,
    sourceFolder,
    sourceAccount,
    importBatch,
    checksumManifest,
    originalFilenames,
    masterCustodyPathStatus: "planned",
    peopleVisible,
    minorsVisible,
    usageRights,
    approvalSuggestion,
    consentRestrictions,
    doctrineSacramentSensitive,
    testimonyPastoralSensitive,
    hymnMusicPresent,
    requestedUse,
    suggestedTags,
    intakeNotes,
    contributorRequired,
    missingRequired: contributorRequired,
    invalidTags,
    largeFiles,
    mediaInventory,
    detected,
    duplicateHints,
    riskFlags,
    reviewerTasks,
    adminTasks,
    systemWarnings,
    reviewWarnings,
    smartRoutingReasons
  };
}

export function uploadIntakeAuditDetails(intake: UploadIntakeAuditPacket) {
  return {
    eventName: intake.eventName,
    fileCount: intake.files.length,
    sourceLinkCaptured: Boolean(intake.sourceLink),
    largeFileCount: intake.largeFiles?.length || 0,
    routingReasonIds: intake.smartRoutingReasons?.map((reason) => reason.id) || [],
    reviewWarnings: intake.reviewWarnings || [],
    reviewerTaskCount: intake.reviewerTasks?.length || 0,
    adminTaskCount: intake.adminTasks?.length || 0,
    mediaFileCount: intake.mediaInventory?.fileCount || intake.files.length
  };
}

export function uploadIntakeValidationError(intake: UploadIntakePacket): UploadIntakeValidationError | null {
  if (intake.files.length > MAX_UPLOAD_INTAKE_FILES) {
    return {
      body: {
        error: "Upload intake supports one focused batch at a time.",
        guidance: `Submit ${MAX_UPLOAD_INTAKE_FILES} or fewer files, or route larger batches through the admin intake path.`
      },
      status: 400
    };
  }
  if (intake.contributorRequired.length) {
    const error = intake.contributorRequired.includes("files or source link")
      ? "Add photos, a folder, or source link before submitting intake batch."
      : "Intake batch needs basic batch identity before review.";
    return { body: { error, missingRequired: intake.contributorRequired }, status: 400 };
  }
  return null;
}

export function uploadIntakeRoleDeniedError(): UploadIntakeValidationError {
  return { body: { error: "This role can browse media but cannot upload." }, status: 403 };
}

export function uploadIntakeAuditStatus(intake: UploadIntakePacket) {
  return intake.largeFiles.length ? "blocked" as const : "queued" as const;
}

export function uploadIntakeAuditSummary(intake: UploadIntakePacket) {
  return intake.largeFiles.length
    ? "Large-media intake routed away from browser upload."
    : "Intake batch created for DAM review; no media-library approval write performed.";
}

export function uploadIntakeDeniedAuditEvent(role: DemoRole, actor: string): UploadIntakeAuditEvent {
  return {
    type: "upload_denied",
    role,
    actor,
    status: "denied",
    summary: "Upload intake denied for role.",
    details: { reason: "role-cannot-submit" }
  };
}

export function uploadIntakeSubmittedAuditEvent(intake: UploadIntakePacket, role: DemoRole, actor: string): UploadIntakeAuditEvent {
  return {
    type: "upload_submitted",
    role,
    actor,
    status: uploadIntakeAuditStatus(intake),
    summary: uploadIntakeAuditSummary(intake),
    details: uploadIntakeAuditDetails(intake)
  };
}

export function buildUploadIntakeResponse(intake: UploadIntakePacket, persisted?: PersistIntakeBatchResult) {
  const storageMode = persisted?.storageMode || "source-link-only";
  return {
    ok: storageMode !== "blocked-no-durable-store",
    batchId: persisted?.batchId,
    status: intake.largeFiles.length ? "large-media-intake" : "needs-review",
    intakeState: {
      received: true,
      review: uploadBetaBoundaries.defaultState.review,
      usage: uploadBetaBoundaries.defaultState.usage,
      publishable: false
    },
    defaultReviewState: "Needs Review",
    defaultUsageScope: "Do Not Publish",
    message: storageMode === "blocked-no-durable-store"
      ? persisted?.blockedReason || "Durable storage is required before browser file intake can continue."
      : intake.largeFiles.length
        ? uploadDefaultState.largeMediaMessage
        : "Batch submitted. Your review packet has been created. Nothing is public yet.",
    eventName: intake.eventName,
    fileCount: intake.files.length,
    sourceLinkCaptured: Boolean(intake.sourceLink),
    mediaInventory: intake.mediaInventory,
    detected: intake.detected,
    riskFlags: intake.riskFlags,
    reviewerTasks: intake.reviewerTasks,
    adminTasks: intake.adminTasks,
    systemWarnings: intake.systemWarnings,
    reviewWarnings: intake.reviewWarnings,
    betaBoundaries: uploadBetaBoundaries,
    storageMode,
    custodyMode: storageMode === "local-runtime" ? "local-private-beta-staging" : storageMode,
    resourceSpaceWritten: false
  };
}

function uploadIntakeSuggestedTags(value: string) {
  return value.split(/[|,]/).map((tag) => tag.trim()).filter(Boolean);
}

async function persistUploadIntakeBatch(intake: UploadIntakePacket, role: DemoRole, actor: string) {
  if (intake.largeFiles.length) return undefined;
  const sourceLinkCaptured = Boolean(intake.sourceLink);
  return persistIntakeBatch({
    actor,
    role,
    defaultAssetStatus: "Needs Review",
    defaultUsageScope: "Do Not Publish",
    source: {
      kind: intake.mediaInventory.folderName ? "folder-upload" : intake.files.length ? "browser-upload" : "drive-link",
      sourceLink: sourceLinkCaptured ? "captured-redacted" : undefined,
      folderName: intake.mediaInventory.folderName || intake.sourceFolder || undefined,
      uploader: intake.source
    },
    detected: {
      eventName: intake.detected.eventName,
      eventDate: intake.detected.eventDate,
      ministry: intake.detected.ministry,
      location: intake.detected.location,
      photographer: intake.detected.photographer,
      confidence: intake.detected.confidence
    },
    mediaInventory: intake.mediaInventory,
    suggestions: {
      tags: uploadIntakeSuggestedTags(intake.suggestedTags),
      tjcTerms: [],
      collections: intake.collection ? [intake.collection] : [],
      requestedUse: intake.requestedUse
    },
    riskFlags: intake.riskFlags,
    reviewerTasks: intake.reviewerTasks,
    adminTasks: intake.adminTasks,
    files: intake.files,
    sourceLinkCaptured
  });
}

export async function submitUploadIntakeBatch(intake: UploadIntakePacket, role: DemoRole, actor: string): Promise<SubmitUploadIntakeResult> {
  const persisted = await persistUploadIntakeBatch(intake, role, actor);
  const body = buildUploadIntakeResponse(intake, persisted);
  return {
    body,
    status: body.storageMode === "blocked-no-durable-store" ? 503 : 200
  };
}
