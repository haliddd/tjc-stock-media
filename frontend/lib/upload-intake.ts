import { normalizeDateField, normalizeDisplayTextField, normalizePublicTextField, normalizeUrlField } from "@/lib/request-validation";
import { fileRequiresAdminIntake, routeUploadIntakeForReview, type IntakeRoutingReason } from "@/lib/intake-routing";
import { nonCanonicalUploadTags } from "@/lib/upload-tags";
import { uploadDefaultState } from "@/lib/workflow-policy";
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
  suggestedTags: string;
  intakeNotes: string;
  missingRequired: string[];
  invalidTags: string[];
  largeFiles: File[];
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
  status: 400 | 403;
};
type UploadIntakeAuditPacket = Pick<UploadIntakePacket, "eventName" | "files" | "sourceLink"> &
  Partial<Pick<UploadIntakePacket, "largeFiles" | "reviewWarnings" | "smartRoutingReasons">>;
type UploadIntakeAuditEvent = Omit<AuditEventRecord, "id" | "createdAt" | "actor"> & { actor?: string };
const MAX_UPLOAD_INTAKE_FILES = 80;

export function normalizeUploadIntake(form: FormData): UploadIntakePacket {
  const files = form
    .getAll("files")
    .filter((value): value is File => value instanceof File && Boolean(value.name) && value.size > 0)
    .slice(0, MAX_UPLOAD_INTAKE_FILES + 1);
  const sourceLink = normalizeUrlField(form.get("sourceLink"), "", 500);
  const title = normalizeDisplayTextField(form.get("title"), "", 160);
  const eventName = normalizeDisplayTextField(form.get("eventName"), "", 120);
  const eventDate = normalizeDateField(form.get("eventDate"));
  const ministry = normalizeDisplayTextField(form.get("ministry"), "", 120);
  const source = normalizeDisplayTextField(form.get("source"), "", 160);
  const sourceFolder = normalizeDisplayTextField(form.get("sourceFolder"), "", 240);
  const sourceAccount = normalizeDisplayTextField(form.get("sourceAccount"), source, 160);
  const importBatch = normalizeDisplayTextField(form.get("importBatch"), "", 160);
  const checksumManifest = normalizePublicTextField(form.get("checksumManifest"), "", 600);
  const originalFilenames = files.map((file) => file.name).filter(Boolean);
  const peopleVisible = normalizePublicTextField(form.get("peopleVisible"), "Unknown", 40);
  const minorsVisible = normalizePublicTextField(form.get("minorsVisible"), "Unknown", 40);
  const usageRights = normalizePublicTextField(form.get("usageRights"), "Unknown - needs review", 80);
  const approvalSuggestion = normalizePublicTextField(form.get("approvalSuggestion"), "Reviewer decides", 80);
  const consentRestrictions = normalizePublicTextField(form.get("notes"), "", 600);
  const doctrineSacramentSensitive = normalizePublicTextField(form.get("doctrineSacramentSensitive"), "", 80);
  const testimonyPastoralSensitive = normalizePublicTextField(form.get("testimonyPastoralSensitive"), "", 80);
  const hymnMusicPresent = normalizePublicTextField(form.get("hymnMusicPresent"), "", 80);
  const suggestedTags = normalizePublicTextField(form.get("tags"), "", 300);
  const intakeNotes = normalizePublicTextField(form.get("intakeNotes"), "", 600);
  const missingRequired = [
    !title && "title",
    !eventName && "event name",
    !eventDate && "event date",
    !ministry && "ministry/team",
    !source && "source/photographer",
    peopleVisible === "Unknown" && "people visible",
    minorsVisible === "Unknown" && "children/youth visible",
    /unknown|needs review/i.test(usageRights) && "usage rights",
    !consentRestrictions && "consent/restrictions",
    !doctrineSacramentSensitive && "doctrine/sacrament sensitivity",
    !testimonyPastoralSensitive && "testimony/pastoral sensitivity",
    !hymnMusicPresent && "hymn/music presence",
    !approvalSuggestion && "suggested approval direction",
    !suggestedTags && "suggested tags",
    !intakeNotes && "intake notes"
  ].filter((item): item is string => Boolean(item));
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
  const reviewWarnings = [
    !source && "Source/photographer missing",
    peopleVisible === "Unknown" && "People visibility unknown",
    minorsVisible === "Unknown" && "Children/youth visibility unknown",
    minorsVisible === "Yes" && "Children/youth visible",
    /unknown|needs review/i.test(usageRights) && "Usage rights unclear",
    /yes|unknown/i.test(doctrineSacramentSensitive) && "Doctrine/sacrament sensitivity needs reviewer routing",
    /yes|unknown/i.test(testimonyPastoralSensitive) && "Testimony/pastoral sensitivity needs restricted review",
    /yes|unknown/i.test(hymnMusicPresent) && "Hymn/music context needs future rights route",
    /church-wide|public/i.test(approvalSuggestion) && (!/permission confirmed|tjc-owned/i.test(usageRights) || peopleVisible === "Unknown" || minorsVisible !== "No") && "Public approval suggestion conflicts with rights/people fields",
    ...smartRoutingReasons.map((reason) => reason.label)
  ].filter((warning): warning is string => Boolean(warning));

  return {
    files,
    sourceLink,
    title,
    eventName,
    eventDate,
    ministry,
    source,
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
    suggestedTags,
    intakeNotes,
    missingRequired,
    invalidTags: nonCanonicalUploadTags(suggestedTags),
    largeFiles: files.filter(fileRequiresAdminIntake),
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
    reviewWarnings: intake.reviewWarnings || []
  };
}

export function uploadIntakeValidationError(intake: UploadIntakePacket): UploadIntakeValidationError | null {
  if (intake.missingRequired.length) {
    return { body: { error: "Intake is missing required review context.", missingRequired: intake.missingRequired }, status: 400 };
  }
  if (intake.invalidTags.length) {
    return {
      body: {
        error: "Suggested tags must use the current media-library taxonomy.",
        invalidTags: intake.invalidTags,
        guidance: "Add new wording to intake notes for reviewer consideration."
      },
      status: 400
    };
  }
  if (intake.files.length > MAX_UPLOAD_INTAKE_FILES) {
    return {
      body: {
        error: "Upload intake supports one focused batch at a time.",
        guidance: `Submit ${MAX_UPLOAD_INTAKE_FILES} or fewer files, or route larger batches through Shared Drive Incoming.`
      },
      status: 400
    };
  }
  if (!intake.files.length && !intake.sourceLink) {
    return { body: { error: "Add at least one file or existing media link before submitting intake." }, status: 400 };
  }
  return null;
}

export function uploadIntakeRoleDeniedError(): UploadIntakeValidationError {
  return { body: { error: "This role can search approved media but cannot upload." }, status: 403 };
}

export function uploadIntakeAuditStatus(intake: UploadIntakePacket) {
  return intake.largeFiles.length ? "blocked" as const : "preview" as const;
}

export function uploadIntakeAuditSummary(intake: UploadIntakePacket) {
  return intake.largeFiles.length
    ? "Large-media intake routed away from browser upload."
    : "Intake validated for DAM review; no media-library write performed.";
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

export function buildUploadIntakeResponse(intake: UploadIntakePacket) {
  if (intake.largeFiles.length) {
    return {
      status: "large-media-intake",
      message: uploadDefaultState.largeMediaMessage,
      defaultReviewState: uploadDefaultState.status,
      fileCount: intake.files.length,
      largeFileCount: intake.largeFiles.length,
      sourceLinkCaptured: Boolean(intake.sourceLink),
    };
  }
  return {
    status: "validated",
    defaultReviewState: uploadDefaultState.status,
    message: "Upload intake validated. New media remains Needs Review / Do Not Publish until a reviewer clears the record.",
    eventName: intake.eventName,
    fileCount: intake.files.length,
    sourceLinkCaptured: Boolean(intake.sourceLink),
    reviewWarnings: intake.reviewWarnings
  };
}
