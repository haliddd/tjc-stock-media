import { afterEach, describe, expect, it, vi } from "vitest";
import { buildUploadIntakeResponse, normalizeUploadIntake, uploadIntakeValidationError } from "@/lib/upload-intake";
import { persistIntakeBatch } from "@/lib/intake-batch-store";

function form(entries: Array<[string, string | File]>) {
  const data = new FormData();
  entries.forEach(([key, value]) => data.append(key, value));
  return data;
}

function photo(name = "photo.jpg") {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/jpeg", lastModified: 1_718_496_000_000 });
}

describe("upload intake batch validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

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
    expect(response.betaBoundaries.forbidden).toContain("Public approval, download enablement, or ResourceSpace approval writeback from upload");
  });

  it("blocks hosted source-link intake until durable cloud storage exists", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const intake = normalizeUploadIntake(form([
      ["sourceLink", "https://drive.google.com/example"],
      ["batchName", "Sabbath Service"],
      ["eventDate", "2026-06-06"],
      ["ministry", "Internet Ministry"],
      ["source", "Media Team"]
    ]));
    const persisted = await persistIntakeBatch({
      actor: "test",
      role: "Contributor",
      defaultAssetStatus: "Needs Review",
      defaultUsageScope: "Do Not Publish",
      source: {
        kind: "drive-link",
        sourceLink: "captured-redacted",
        uploader: "Media Team"
      },
      detected: intake.detected,
      mediaInventory: intake.mediaInventory,
      suggestions: {
        tags: [],
        tjcTerms: [],
        collections: [],
        requestedUse: []
      },
      riskFlags: intake.riskFlags,
      reviewerTasks: intake.reviewerTasks,
      adminTasks: intake.adminTasks,
      files: intake.files,
      sourceLinkCaptured: true
    });
    const response = buildUploadIntakeResponse(intake, persisted);

    expect(response.ok).toBe(false);
    expect(response.storageMode).toBe("blocked-no-durable-store");
    expect(response.message).toContain("ResourceSpace cloud pending");
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
    expect(uploadIntakeValidationError(intake)).toBeNull();
    expect(intake.adminTasks).toContain("Large media/admin intake required");
    expect(response.resourceSpaceWritten).toBe(false);
    expect(response.defaultReviewState).toBe("Needs Review");
    expect(response.defaultUsageScope).toBe("Do Not Publish");
    expect(response.status).toBe("large-media-intake");
    expect(response.message).toContain("large-media/admin intake path");
    expect(response.reviewWarnings).toEqual(expect.arrayContaining([
      "Large media/admin intake required",
      "Video/audio and large files route to admin intake"
    ]));
  });
});
