import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { useStatusForUpload } from "@/components/dam/enterprise/RecentUploadsPage";
import { buildUploadIntakePublicResponse, buildUploadIntakeResponse, normalizeUploadIntake, uploadIntakeSubmittedAuditEvent, uploadIntakeValidationError } from "@/lib/upload-intake";

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
    const response = buildUploadIntakeResponse(intake);
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
    const response = buildUploadIntakeResponse(intake);
    expect(uploadIntakeValidationError(intake)).toBeNull();
    expect(intake.files).toHaveLength(0);
    expect(response.intakeState).toEqual({
      received: true,
      review: "Needs Review",
      usage: "Do Not Publish",
      publishable: false
    });
    expect(response.resourceSpaceWritten).toBe(false);
    expect(response.betaBoundaries.forbidden).toContain("Public approval, download enablement, or final approval writeback from upload");
  });

  it("keeps public upload response contributor-safe while internal response keeps admin truth", () => {
    const intake = normalizeUploadIntake(form([
      ["sourceLink", "https://drive.google.com/example"],
      ["batchName", "Sabbath Service"],
      ["eventDate", "2026-06-06"],
      ["ministry", "Internet Ministry"],
      ["source", "Media Team"]
    ]));
    const internal = buildUploadIntakeResponse(intake, {
      batchId: "batch-123",
      storageMode: "local-runtime",
      manifestPath: ".runtime/intake-batches/batch-123/manifest.json"
    });
    const publicResponse = buildUploadIntakePublicResponse(internal);
    const publicText = JSON.stringify(publicResponse);

    expect(internal).toMatchObject({
      resourceSpaceWritten: false,
      storageMode: "local-runtime",
      custodyMode: "local-private-beta-staging"
    });
    expect(internal.betaBoundaries.forbidden).toContain("Public approval, download enablement, or final approval writeback from upload");
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
  });

  it("keeps My Uploads stored receipt display scrubbed of source-system claims", () => {
    expect(recentUploadsPage).toContain("This browser shows your recent submissions.");
    expect(recentUploadsPage).toContain("const unsafeContributorCopy");
    expect(recentUploadsPage).toContain("contributorSafeText(upload.reviewerNote");
    expect(recentUploadsPage).toContain("contributorSafeText(selected.source");
    expect(recentUploadsPage).not.toContain("Source/uploader");
    expect(recentUploadsPage).not.toContain("Source link");
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
    expect(uploadPage).toContain("Photos sent");
    expect(uploadPage).toContain("Link sent for review");
    expect(uploadPage).toContain("Submitted for review. Waiting for review. Nothing is public.");
    expect(uploadPage).toContain("Submitted</li>");
    expect(uploadPage).toContain("Waiting for review</li>");
    expect(uploadPage).toContain("Do not use yet</li>");
    expect(uploadPage).toContain("View My Uploads");
    expect(uploadPage).toContain("Share more photos");
    expect(uploadPage).toContain("Share another link or photos");
    expect(uploadPage).toContain("receipt?.sourceLinkCaptured && !receipt.fileCount");
    expect(uploadPage).not.toMatch(/public download|download remains/i);
  });
});
