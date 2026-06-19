import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contributorReceiptStatusLabels, normalizeStoredUpload, useStatusForUpload } from "@/components/dam/enterprise/RecentUploadsPage";
import { persistIntakeBatch } from "@/lib/intake-batch-store";
import { buildUploadIntakePublicResponse, buildUploadIntakeResponse, normalizeUploadIntake, uploadIntakeSubmittedAuditEvent, uploadIntakeValidationError } from "@/lib/upload-intake";
import { uploadReceiptCopy } from "@/lib/upload-receipt-copy";
import type { IntakeBatchRecord, IntakeBatchStorageMode, PersistIntakeBatchResult } from "@/lib/intake-batch-store";

const recentUploadsPage = readFileSync(new URL("../components/dam/enterprise/RecentUploadsPage.tsx", import.meta.url), "utf8");
const uploadPage = readFileSync(new URL("../components/UploadPage.tsx", import.meta.url), "utf8");

function form(entries: Array<[string, string | File]>) {
  const data = new FormData();
  entries.forEach(([key, value]) => data.append(key, value));
  return data;
}

function photo(name = "photo.jpg") {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/jpeg", lastModified: 1_718_496_000_000 });
}

function persistedBatchResult(intake: ReturnType<typeof normalizeUploadIntake>, batchId = "batch-123", storageMode: IntakeBatchStorageMode = "local-runtime"): PersistIntakeBatchResult {
  const now = new Date(0).toISOString();
  const record: IntakeBatchRecord = {
    id: batchId,
    createdAt: now,
    updatedAt: now,
    submittedAt: now,
    actor: "test-user",
    role: "Contributor",
    status: "needs-review",
    defaultAssetStatus: "Needs Review",
    defaultUsageScope: "Do Not Publish",
    source: {
      kind: intake.files.length ? "browser-upload" : "drive-link",
      sourceLink: intake.sourceLink ? "captured-redacted" : undefined,
      folderName: intake.sourceFolder || undefined,
      uploader: intake.source || "Test uploader"
    },
    detected: intake.detected,
    mediaInventory: intake.mediaInventory,
    suggestions: {
      tags: [],
      tjcTerms: [],
      collections: [],
      requestedUse: intake.requestedUse
    },
    riskFlags: intake.riskFlags,
    reviewerTasks: intake.reviewerTasks,
    adminTasks: intake.adminTasks,
    manifestPath: storageMode === "local-runtime" ? ".runtime/intake-batches/batch-123/manifest.json" : undefined,
    storageMode,
    resourceSpaceWritten: false
  };
  return { record, batchId, storageMode, manifestPath: record.manifestPath };
}

describe("upload intake batch validation", () => {
  it("allows minimal contributor packet with files and batch identity", () => {
    const intake = normalizeUploadIntake(form([
      ["files", photo()],
      ["eventName", "Youth Service"],
      ["eventDate", "2026-06-16"],
      ["ministry", "Youth / RE"],
      ["source", "John"]
    ]));
    expect(uploadIntakeValidationError(intake)).toBeNull();
    expect(intake.reviewerTasks).toEqual(expect.arrayContaining([
      "Rights reviewer verifies ownership/license before public use",
      "People visibility reviewer confirmation",
      "Children/youth visibility reviewer confirmation"
    ]));
  });

  it("accepts uploader alias when contributor UI hides source language", () => {
    const intake = normalizeUploadIntake(form([
      ["files", photo()],
      ["eventName", "Family Day"],
      ["eventDate", "2026-06-18"],
      ["ministry", "Family Ministry"],
      ["uploader", "Contributor upload"],
      ["peopleVisible", "Unknown"],
      ["minorsVisible", "Unknown"],
      ["usageRights", "Unknown - reviewer verifies"],
      ["approvalSuggestion", "Reviewer decides"]
    ]));
    const response = buildUploadIntakeResponse(intake, persistedBatchResult(intake));
    expect(uploadIntakeValidationError(intake)).toBeNull();
    expect(intake.source).toBe("Contributor upload");
    expect(response.defaultReviewState).toBe("Needs Review");
    expect(response.defaultUsageScope).toBe("Do Not Publish");
    expect(response.intakeState.publishable).toBe(false);
  });

  it("allows source-link-only batch with required identity", () => {
    const intake = normalizeUploadIntake(form([
      ["sourceLink", "https://drive.google.com/example"],
      ["batchName", "Sabbath Service"],
      ["eventDate", "2026-06-06"],
      ["ministry", "Internet Ministry"],
      ["source", "Media Team"]
    ]));
    const response = buildUploadIntakeResponse(intake, persistedBatchResult(intake, "source-link-123", "source-link-only"));
    expect(uploadIntakeValidationError(intake)).toBeNull();
    expect(intake.files).toHaveLength(0);
    expect(response.storageMode).toBe("source-link-only");
    expect(response.custodyMode).toBe("source-link-only");
    expect(response.fileCount).toBe(0);
    expect(response.intakeState).toEqual({
      received: true,
      review: "Needs Review",
      usage: "Do Not Publish",
      publishable: false
    });
    expect(response.resourceSpaceWritten).toBe(false);
    expect(response.betaBoundaries.forbidden).toContain("Reuse clearance, file access, or final media-team decision from upload");
  });

  it("keeps public upload response contributor-safe while internal response keeps admin truth", () => {
    const intake = normalizeUploadIntake(form([
      ["sourceLink", "https://drive.google.com/example"],
      ["batchName", "Sabbath Service"],
      ["eventDate", "2026-06-06"],
      ["ministry", "Internet Ministry"],
      ["source", "Media Team"]
    ]));
    const internal = buildUploadIntakeResponse(intake, persistedBatchResult(intake, "batch-123", "source-link-only"));
    const publicResponse = buildUploadIntakePublicResponse(internal);
    const publicText = JSON.stringify(publicResponse);

    expect(internal).toMatchObject({
      resourceSpaceWritten: false,
      storageMode: "source-link-only",
      custodyMode: "source-link-only",
      fileCount: 0
    });
    expect(internal.betaBoundaries.forbidden).toContain("Reuse clearance, file access, or final media-team decision from upload");
    expect(publicResponse).toMatchObject({
      ok: true,
      batchId: "batch-123",
      message: "Submitted for review. Waiting for review. Nothing is public.",
      submissionStatus: "Submitted",
      reviewStatus: "Waiting for review",
      publishStatus: "Do not use yet",
      intakeState: {
        received: true,
        review: "Waiting for review",
        usage: "Do not use yet",
        publishable: false
      }
    });
    expect(publicResponse).not.toHaveProperty("storageMode");
    expect(publicResponse).not.toHaveProperty("custodyMode");
    expect(publicResponse).not.toHaveProperty("resourceSpaceWritten");
    expect(publicResponse).not.toHaveProperty("betaBoundaries");
    expect(publicResponse).not.toHaveProperty("reviewerTasks");
    expect(publicResponse).not.toHaveProperty("adminTasks");
    expect(publicText).not.toMatch(/ResourceSpace|writeback|sync|download|durable|storageMode|custodyMode/i);
  });

  it("blocks source-link-only receipt when no persisted record exists", () => {
    const intake = normalizeUploadIntake(form([
      ["sourceLink", "https://drive.google.com/example"],
      ["batchName", "Sabbath Service"],
      ["eventDate", "2026-06-06"],
      ["ministry", "Internet Ministry"],
      ["source", "Media Team"]
    ]));
    const internal = buildUploadIntakeResponse(intake, {
      batchId: "failed-link-123",
      storageMode: "source-link-only",
      blockedReason: "Runtime store write failed."
    });
    const publicResponse = buildUploadIntakePublicResponse(internal);

    expect(internal.ok).toBe(false);
    expect(internal.batchId).toBeUndefined();
    expect(internal.intakeState.received).toBe(false);
    expect(publicResponse).toEqual({
      ok: false,
      status: "intake-unavailable",
      message: "Upload intake is unavailable. Ask the media team for help.",
      intakeState: {
        received: false,
        review: "Not submitted",
        usage: "Do not use yet",
        publishable: false
      }
    });
  });

  it("returns blocked storage when source-link persistence is denied", async () => {
    const previousVercelEnv = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "production";
    try {
      const intake = normalizeUploadIntake(form([
        ["sourceLink", "https://drive.google.com/example"],
        ["batchName", "Sabbath Service"],
        ["eventDate", "2026-06-06"],
        ["ministry", "Internet Ministry"],
        ["source", "Media Team"]
      ]));
      const persisted = await persistIntakeBatch({
        actor: "test-user",
        role: "Contributor",
        defaultAssetStatus: "Needs Review",
        defaultUsageScope: "Do Not Publish",
        source: {
          kind: "drive-link",
          sourceLink: "captured-redacted",
          uploader: intake.source
        },
        detected: intake.detected,
        mediaInventory: intake.mediaInventory,
        suggestions: {
          tags: [],
          tjcTerms: [],
          collections: [],
          requestedUse: intake.requestedUse
        },
        riskFlags: intake.riskFlags,
        reviewerTasks: intake.reviewerTasks,
        adminTasks: intake.adminTasks,
        files: [],
        sourceLinkCaptured: true
      });

      expect(persisted.record).toBeUndefined();
      expect(persisted.storageMode).toBe("blocked-no-durable-store");
      expect(persisted.blockedReason).toMatch(/Durable runtime store required/);
    } finally {
      if (previousVercelEnv === undefined) {
        delete process.env.VERCEL_ENV;
      } else {
        process.env.VERCEL_ENV = previousVercelEnv;
      }
    }
  });

  it("hides durable-storage failure detail from public upload response", () => {
    const intake = normalizeUploadIntake(form([
      ["files", photo()],
      ["eventName", "Youth Service"],
      ["eventDate", "2026-06-16"],
      ["ministry", "Youth / RE"],
      ["source", "John"]
    ]));
    const internal = buildUploadIntakeResponse(intake, {
      batchId: "blocked-123",
      storageMode: "blocked-no-durable-store",
      blockedReason: "Production browser file intake requires durable storage or admin/Drive intake."
    });
    const publicResponse = buildUploadIntakePublicResponse(internal);

    expect(internal.message).toMatch(/durable storage/i);
    expect(publicResponse).toEqual({
      ok: false,
      status: "intake-unavailable",
      message: "Upload intake is unavailable. Ask the media team for help.",
      intakeState: {
        received: false,
        review: "Not submitted",
        usage: "Do not use yet",
        publishable: false
      }
    });
    expect(JSON.stringify(publicResponse)).not.toMatch(/durable|storage|ResourceSpace|writeback|sync|download/i);
  });

  it("does not publish submitted receipt state without a batch id", () => {
    const intake = normalizeUploadIntake(form([
      ["sourceLink", "https://drive.google.com/example"],
      ["batchName", "Sabbath Service"],
      ["eventDate", "2026-06-06"],
      ["ministry", "Internet Ministry"],
      ["source", "Media Team"]
    ]));
    const publicResponse = buildUploadIntakePublicResponse(buildUploadIntakeResponse(intake));

    expect(publicResponse).toEqual({
      ok: false,
      status: "intake-unavailable",
      message: "Upload intake is unavailable. Ask the media team for help.",
      intakeState: {
        received: false,
        review: "Not submitted",
        usage: "Do not use yet",
        publishable: false
      }
    });
  });

  it("blocks no files/link and missing batch identity only", () => {
    const intake = normalizeUploadIntake(form([["role", "Contributor"]]));
    const error = uploadIntakeValidationError(intake);
    expect(error?.status).toBe(400);
    expect(error?.body.missingRequired).toEqual(expect.arrayContaining(["files or source link", "batch/event name", "event date", "ministry/team", "source/photographer"]));
  });

  it("turns noncanonical tags into taxonomy reviewer task, not contributor blocker", () => {
    const intake = normalizeUploadIntake(form([
      ["sourceLink", "https://drive.google.com/example"],
      ["eventName", "Tag Test"],
      ["eventDate", "2026-06-06"],
      ["ministry", "Internet Ministry"],
      ["source", "QA Reviewer"],
      ["tags", "qa-only"]
    ]));
    expect(intake.invalidTags).toEqual(["qa-only"]);
    expect(uploadIntakeValidationError(intake)).toBeNull();
    expect(intake.reviewerTasks).toContain("Taxonomy reviewer maps or rejects noncanonical suggested tags");
  });

  it("routes large video/audio to admin tasks and keeps ResourceSpace write false", () => {
    const video = new File([new Uint8Array([1])], "choir.mp4", { type: "video/mp4" });
    const intake = normalizeUploadIntake(form([
      ["files", video],
      ["eventName", "Choir Livestream"],
      ["eventDate", "2026-06-06"],
      ["ministry", "Music / Choir"],
      ["source", "Media Team"]
    ]));
    const response = buildUploadIntakeResponse(intake);
    const publicResponse = buildUploadIntakePublicResponse(response);
    expect(uploadIntakeValidationError(intake)).toBeNull();
    expect(intake.adminTasks).toContain("Large media/admin intake required");
    expect(response.ok).toBe(false);
    expect(response.resourceSpaceWritten).toBe(false);
    expect(response.defaultReviewState).toBe("Needs Review");
    expect(response.defaultUsageScope).toBe("Do Not Publish");
    expect(response.status).toBe("large-media-intake");
    expect(response.message).toBe("Large video or audio needs media team intake before review. Nothing is public.");
    expect(response.intakeState.received).toBe(false);
    expect(publicResponse).toMatchObject({
      ok: false,
      status: "large-media-intake",
      message: "Large video or audio needs media team intake before review. Nothing is public.",
      intakeState: {
        received: false,
        review: "Not submitted",
        usage: "Do not use yet",
        publishable: false
      }
    });
    expect(publicResponse).not.toHaveProperty("batchId");
    expect(publicResponse).not.toHaveProperty("submissionStatus");
    expect(publicResponse).not.toHaveProperty("reviewStatus");
    expect(JSON.stringify(publicResponse)).not.toMatch(/ResourceSpace|writeback|sync|download|durable|storageMode|custodyMode/i);
    expect(response.reviewWarnings).toEqual(expect.arrayContaining([
      "Large media/admin intake required",
      "Video/audio and large files route to admin intake"
    ]));
    expect(uploadIntakeSubmittedAuditEvent(intake, "Contributor", "test-user")).toMatchObject({
      type: "upload_blocked",
      status: "blocked",
      summary: "Large-media intake routed away from browser upload."
    });
  });

  it("marks unavailable persisted intake as blocked in the audit event", () => {
    const intake = normalizeUploadIntake(form([
      ["files", photo()],
      ["eventName", "Youth Service"],
      ["eventDate", "2026-06-16"],
      ["ministry", "Youth / RE"],
      ["source", "John"]
    ]));

    expect(uploadIntakeSubmittedAuditEvent(intake, "Contributor", "test-user", { ok: false })).toMatchObject({
      type: "upload_blocked",
      status: "blocked",
      summary: "Upload intake unavailable; no review packet was recorded."
    });
  });

  it("preserves exact Do not use yet receipt status in My Uploads", () => {
    expect(useStatusForUpload({ status: "Submitted", publishStatus: "Do not use yet" })).toBe("Do not use yet");
    expect(useStatusForUpload({ status: "Submitted", publishStatus: "Do not use" })).toBe("Do not use");
    expect(useStatusForUpload({ status: "Submitted" })).toBe("Do not use yet");
    expect(contributorReceiptStatusLabels()).toEqual(["Submitted", "Waiting for review", "Do not use yet"]);
  });

  it("keeps My Uploads stored receipt display scrubbed of source-system claims", () => {
    expect(recentUploadsPage).toContain("This browser shows your recent submissions.");
    expect(recentUploadsPage).toContain("No uploads from this browser yet.");
    expect(recentUploadsPage).toContain("const unsafeContributorCopy");
    expect(recentUploadsPage).toContain("normalizeStoredUpload");
    expect(recentUploadsPage).toContain("contributorSafeText(raw.batchName");
    expect(recentUploadsPage).toContain("Reviewer/admin examples");
    expect(recentUploadsPage).toContain("Not contributor personal records.");
    expect(recentUploadsPage).toContain('if (role === "Contributor") return [];');
    expect(recentUploadsPage).not.toContain("Source/uploader");
    expect(recentUploadsPage).not.toContain("Source link");
    expect(recentUploadsPage).not.toMatch(/durable account history/i);
  });

  it("scrubs unsafe stored My Uploads fields before rendering", () => {
    const upload = normalizeStoredUpload({
      id: "unsafe-local-receipt",
      batchName: "ResourceSpace writeback approved",
      eventName: "backend API public link",
      mediaType: "Photos",
      fileCount: 1,
      status: "Submitted",
      date: "synced today",
      eventDate: "public access ready",
      locationName: "Source Status",
      ministry: "downloadable archive",
      source: "source-system owner",
      peopleMinors: "approved minors",
      notes: "writeback complete",
      reviewStatus: "live public link",
      publishStatus: "Approved Public",
      reviewerNote: "download ready",
      roleFit: ["Contributor"]
    });

    expect(upload).toMatchObject({
      batchName: "Submitted media",
      eventName: "Submitted media",
      date: "Today",
      eventDate: "",
      locationName: undefined,
      ministry: "",
      source: undefined,
      peopleMinors: "Not sure",
      notes: "",
      reviewStatus: undefined,
      publishStatus: undefined,
      reviewerNote: undefined
    });
  });

  it("requires a batch id before classic upload renders a receipt", () => {
    expect(uploadPage).toContain("accepted = response.ok && body?.ok !== false && body?.batchId");
    expect(uploadPage).toContain("Upload intake was not recorded. Ask the media team for help.");
    expect(uploadPage).toContain("if (submittingRef.current) return;");
    expect(uploadPage).toContain("setIsSubmitting(true)");
    expect(uploadPage).toContain("disabled={submitDisabled}");
  });

  it("renders exact contributor receipt truth and recovery actions", () => {
    expect(uploadPage).toContain("Add photos");
    expect(uploadPage).toContain("Describe them");
    expect(uploadPage).toContain("Review and send");
    expect(uploadPage).toContain("Submitted for review. Waiting for review. Nothing is public.");
    expect(uploadPage).toContain("Submitted</li>");
    expect(uploadPage).toContain("Waiting for review</li>");
    expect(uploadPage).toContain("Do not use yet</li>");
    expect(uploadPage).toContain("View My Uploads");
    expect(uploadPage).toContain("uploadReceiptCopy(receipt)");
    expect(uploadPage).not.toMatch(/public download|download remains/i);
  });

  it("uses link-only receipt copy only for source-link intake without files", () => {
    expect(uploadReceiptCopy({ sourceLinkCaptured: true, fileCount: 0 })).toEqual({
      isLinkOnly: true,
      title: "Link sent for review",
      resetLabel: "Share another link or photos"
    });
    expect(uploadReceiptCopy({ sourceLinkCaptured: true, fileCount: 2 })).toMatchObject({
      isLinkOnly: false,
      title: "Photos sent",
      resetLabel: "Share more photos"
    });
    expect(uploadReceiptCopy({ sourceLinkCaptured: false, fileCount: 1 })).toMatchObject({
      isLinkOnly: false,
      title: "Photos sent",
      resetLabel: "Share more photos"
    });
  });
});
